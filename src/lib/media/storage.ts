// ============================================================
// Media Storage Helpers (T5)
// Path generation, bucket selection, signed URL helpers
// ============================================================

import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * Determine the storage bucket based on MIME type.
 */
export function getBucketForMimeType(mimeType: string): "product-photos" | "product-videos" {
  if (mimeType.startsWith("video/")) return "product-videos";
  return "product-photos";
}

/**
 * Generate the storage path: {partnerId}/{productId}/{uuid}_{filename}
 *
 * Uses partner_id + product_id prefix for RLS ownership verification
 * at the Storage layer. The UUID ensures uniqueness even if two partners
 * upload files with the same name.
 */
export function generateStoragePath({
  partnerId,
  productId,
  fileName,
}: {
  partnerId: string;
  productId: string;
  fileName: string;
}): string {
  const uuid = crypto.randomUUID();
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${partnerId}/${productId}/${uuid}_${sanitized}`;
}

/**
 * Compute SHA-256 hash of a File/Blob.
 */
export async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Get a signed URL for a file in Storage by bucket + path.
 */
export async function createSignedUrl(bucket: string, storagePath: string, expiresIn = 3600): Promise<string> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data) {
    throw new Error(error?.message || "Failed to create signed URL");
  }
  return data.signedUrl;
}

/**
 * Format bytes to human-readable size.
 */
export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validate file before upload.
 */
export function validateMediaFile(file: File): { ok: boolean; error?: string } {
  const maxPhotoSize = 10 * 1024 * 1024; // 10 MB
  const maxVideoSize = 100 * 1024 * 1024; // 100 MB
  const allowedPhotoTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const allowedVideoTypes = ["video/mp4", "video/webm", "video/quicktime"];

  const isPhoto = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");

  if (!isPhoto && !isVideo) {
    return { ok: false, error: `Unsupported file type: ${file.type}` };
  }

  if (isPhoto) {
    if (!allowedPhotoTypes.includes(file.type)) {
      return { ok: false, error: `Unsupported image type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF` };
    }
    if (file.size > maxPhotoSize) {
      return { ok: false, error: `Image too large. Maximum size is 10 MB.` };
    }
  }

  if (isVideo) {
    if (!allowedVideoTypes.includes(file.type)) {
      return { ok: false, error: `Unsupported video type: ${file.type}. Allowed: MP4, WebM, MOV` };
    }
    if (file.size > maxVideoSize) {
      return { ok: false, error: `Video too large. Maximum size is 100 MB.` };
    }
  }

  return { ok: true };
}
