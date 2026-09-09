// ============================================================
// Media Server Actions (T5)
// All media operations happen here — never from the client
// ============================================================

"use server";

import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import { getOrCreatePartnerProfile } from "@/lib/products/actions";
import { getBucketForMimeType, generateStoragePath, createSignedUrl as createSignedUrlFromStorage } from "./storage";

// ============================================================
// Types
// ============================================================

export type MediaAssetRow = {
  id: string;
  product_id: string;
  partner_id: string;
  media_type: "image" | "video";
  storage_path: string;
  file_name: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  checksum_sha256: string | null;
  display_order: number;
  is_primary: boolean;
  caption: string | null;
  created_at: string;
  signed_url?: string;
};

// ============================================================
// Authorization helper
// ============================================================

async function authorizeProductAccess(productId: string) {
  const profile = await requireAuth();
  const supabase = await createServerClient();

  if (profile.role === "admin") {
    return { profile, supabase, product: { id: productId, status: "submitted", partner_id: null } };
  }

  const { data: product } = await supabase
    .from("products")
    .select("id, status, partner_id")
    .eq("id", productId)
    .single<{ id: string; status: string; partner_id: string }>();

  if (!product) {
    throw new Error("Product not found");
  }

  const partnerProfile = await getOrCreatePartnerProfile(supabase, profile.id);

  if (!partnerProfile || product.partner_id !== partnerProfile.id) {
    throw new Error("Not authorized");
  }

  return { profile, supabase, product };
}

// ============================================================
// Upload — two-step direct-to-Storage flow
//
// Step 1: Client calls requestUploadUrl → server returns a
//   signed PUT URL and storage path.
// Step 2: Client PUTs the file directly to Storage (bytes
//   never go through Next.js, no body limit).
// Step 3: Client calls registerMedia → server inserts the
//   DB record (the only Server Action payload — just metadata).
// ============================================================

export async function requestUploadUrl(
  productId: string,
  fileMeta: { fileName: string; fileSize: number; mimeType: string }
): Promise<
  | { ok: true; uploadUrl: string; storagePath: string; bucket: string; partnerId: string }
  | { ok: false; error: string }
> {
  try {
    const { profile, supabase, product } = await authorizeProductAccess(productId);

    if (profile.role !== "admin" && product.status !== "draft") {
      return { ok: false, error: "Only draft products can be edited" };
    }

    // Validate MIME type and size server-side (defense in depth)
    const { validateMediaFile } = await import("./storage");
    const fakeFile = {
      name: fileMeta.fileName,
      size: fileMeta.fileSize,
      type: fileMeta.mimeType,
    } as File;
    const validation = validateMediaFile(fakeFile);
    if (!validation.ok) {
      return { ok: false, error: validation.error || "Invalid file" };
    }

    // Resolve partner_id
    let partnerId: string | undefined;
    if (profile.role === "admin") {
      const { data: productRow } = await supabase
        .from("products")
        .select("partner_id")
        .eq("id", productId)
        .single<{ partner_id: string }>();
      if (!productRow) return { ok: false, error: "Product not found" };
      partnerId = productRow.partner_id;
    } else {
      const pp = await getOrCreatePartnerProfile(supabase, profile.id);
      if (!pp) return { ok: false, error: "Partner profile not found" };
      partnerId = pp.id;
    }

    if (!partnerId) {
      return { ok: false, error: "Unable to resolve partner account" };
    }

    const bucket = getBucketForMimeType(fileMeta.mimeType);
    const storagePath = generateStoragePath({
      partnerId,
      productId,
      fileName: fileMeta.fileName,
    });

    // Generate a signed upload URL (client PUTs directly to Storage)
    const { data: signedData, error: signedError } =
      await supabase.storage.from(bucket).createSignedUploadUrl(storagePath, { upsert: false });

    if (signedError || !signedData) {
      return { ok: false, error: signedError?.message || "Failed to generate upload URL" };
    }

    return {
      ok: true,
      uploadUrl: signedData.signedUrl,
      storagePath,
      bucket,
      partnerId,
    };
  } catch (err) {
    console.error("[requestUploadUrl] unexpected error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Failed to prepare upload" };
  }
}

export async function registerMedia(
  productId: string,
  meta: {
    storagePath: string;
    bucket: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    partnerId: string;
  }
): Promise<{ ok: true; data: MediaAssetRow } | { ok: false; error: string }> {
  try {
    const { profile, supabase, product } = await authorizeProductAccess(productId);

    // Non-admin users can only upload to drafts
    if (profile.role !== "admin" && product.status !== "draft") {
      return { ok: false, error: "Only draft products can be edited" };
    }

    const mediaType = meta.mimeType.startsWith("video/") ? "video" : "image";

    // Verify the file actually landed in Storage before creating the DB record
    const { data: fileList, error: listError } = await supabase.storage
      .from(meta.bucket)
      .list(meta.storagePath.replace(/[^/]+$/, ""), {
        search: meta.storagePath.split("/").pop(),
      });

    if (listError || !fileList || fileList.length === 0) {
      return { ok: false, error: "Upload verification failed — file not found in storage" };
    }

    const { data, error } = await supabase
      .from("product_media")
      .insert({
        product_id: productId,
        partner_id: meta.partnerId,
        media_type: mediaType,
        storage_path: meta.storagePath,
        file_name: meta.fileName,
        file_size_bytes: meta.fileSize,
        mime_type: meta.mimeType,
        display_order: 0,
        is_primary: false,
      })
      .select("*")
      .single<MediaAssetRow>();

    if (error) {
      return { ok: false, error: `Failed to save media record: ${error.message}` };
    }

    revalidatePath(`/dashboard/products/${productId}`);
    return { ok: true, data };
  } catch (err) {
    console.error("[registerMedia] unexpected error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Failed to register media" };
  }
}

// ============================================================
// Types for client-side upload tracking
// ============================================================

export type UploadProgress = {
  stage: "validating" | "uploading" | "saving" | "done" | "error";
  progress: number; // 0-100
  message?: string;
};

// ============================================================
// Queries
// ============================================================

export async function getProductMedia(productId: string): Promise<MediaAssetRow[]> {
  const { supabase } = await authorizeProductAccess(productId);

  const { data } = await supabase
    .from("product_media")
    .select("*")
    .eq("product_id", productId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (data ?? []) as MediaAssetRow[];
}

export async function getMediaSignedUrl(storagePath: string, mediaType: "image" | "video"): Promise<string> {
  const bucket = mediaType === "video" ? "product-videos" : "product-photos";
  return createSignedUrlFromStorage(bucket, storagePath);
}

// ============================================================
// Download — authorized media download link
// ============================================================

export async function getMediaDownloadUrl(
  productId: string,
  mediaId: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const { supabase } = await authorizeProductAccess(productId);

    // Fetch the media record
    const { data: media } = await supabase
      .from("product_media")
      .select("storage_path, media_type, file_name")
      .eq("id", mediaId)
      .eq("product_id", productId)
      .single<{ storage_path: string; media_type: string; file_name: string }>();

    if (!media) {
      return { ok: false, error: "Media not found" };
    }

    const bucket = media.media_type === "video" ? "product-videos" : "product-photos";

    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(media.storage_path, 60);

    if (signedError || !signedData) {
      console.error(`[media] Failed to create download URL for ${media.storage_path}:`, signedError);
      return { ok: false, error: `Unable to generate download link: ${signedError?.message || "Unknown error"}` };
    }

    return { ok: true, url: signedData.signedUrl };
  } catch (err) {
    console.error(`[media] getMediaDownloadUrl error for ${mediaId}:`, err);
    return { ok: false, error: "Failed to generate download link" };
  }
}

// ============================================================
// Mutations
// ============================================================

export async function deleteMedia(
  productId: string,
  mediaId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { profile, supabase, product } = await authorizeProductAccess(productId);

  if (profile.role !== "admin" && product.status !== "draft") {
    return { ok: false, error: "Only draft products can be edited" };
  }

  // Get media record
  const { data: media } = await supabase
    .from("product_media")
    .select("storage_path, media_type")
    .eq("id", mediaId)
    .eq("product_id", productId)
    .single<{ storage_path: string; media_type: "image" | "video" }>();

  if (!media) {
    return { ok: false, error: "Media not found" };
  }

  // Delete from Storage
  const bucket = media.media_type === "video" ? "product-videos" : "product-photos";
  const { error: storageError } = await supabase.storage
    .from(bucket)
    .remove([media.storage_path]);

  if (storageError) {
    return { ok: false, error: `Failed to delete file: ${storageError.message}` };
  }

  // Delete DB record
  const { error } = await supabase
    .from("product_media")
    .delete()
    .eq("id", mediaId);

  if (error) {
    return { ok: false, error: `Failed to delete record: ${error.message}` };
  }

  revalidatePath(`/dashboard/products/${productId}`);
  return { ok: true };
}

export async function setPrimaryMedia(
  productId: string,
  mediaId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { profile, supabase, product } = await authorizeProductAccess(productId);

  if (profile.role !== "admin" && product.status !== "draft") {
    return { ok: false, error: "Only draft products can be edited" };
  }

  // Unset all others
  await supabase
    .from("product_media")
    .update({ is_primary: false })
    .eq("product_id", productId);

  const { error } = await supabase
    .from("product_media")
    .update({ is_primary: true })
    .eq("id", mediaId)
    .eq("product_id", productId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/dashboard/products/${productId}`);
  return { ok: true };
}
