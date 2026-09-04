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
  media_type: "image" | "video";
  storage_path: string;
  file_name: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  display_order: number;
  is_primary: boolean;
  created_at: string;
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
// Upload — server-side direct upload via Server Action
// ============================================================

export async function uploadMedia(
  productId: string,
  formData: FormData
): Promise<{ ok: true; data: MediaAssetRow } | { ok: false; error: string }> {
  const { profile, supabase, product } = await authorizeProductAccess(productId);

  if (profile.role !== "admin" && product.status !== "draft") {
    return { ok: false, error: "Only draft products can be edited" };
  }

  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file provided" };
  }

  // Validate file
  const { validateMediaFile } = await import("./storage");
  const validation = validateMediaFile(file);
  if (!validation.ok) {
    return { ok: false, error: validation.error || "Invalid file" };
  }

  // Get partner_id for path
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

  const bucket = getBucketForMimeType(file.type);
  const mediaType = file.type.startsWith("video/") ? "video" : "image";
  const storagePath = generateStoragePath({
    partnerId,
    productId,
    fileName: file.name,
  });

  // Upload to Storage (server-side, authenticated as user — RLS will allow)
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return { ok: false, error: `Upload failed: ${uploadError.message}` };
  }

  // Insert media metadata
  const { data, error } = await supabase
    .from("product_media")
    .insert({
      product_id: productId,
      media_type: mediaType,
      storage_path: storagePath,
      file_name: file.name,
      file_size_bytes: file.size,
      mime_type: file.type,
      display_order: 0,
      is_primary: false,
    })
    .select("*")
    .single<MediaAssetRow>();

  if (error) {
    // Try to clean up the uploaded file if metadata insert fails
    await supabase.storage.from(bucket).remove([storagePath]);
    return { ok: false, error: `Failed to save media record: ${error.message}` };
  }

  revalidatePath(`/dashboard/products/${productId}`);
  return { ok: true, data };
}

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