"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Alert } from "@/components/ui/alert";
import {
  requestUploadUrl,
  registerMedia,
  deleteMedia,
  setPrimaryMedia,
  getMediaDownloadUrl,
  getMediaSignedUrl,
} from "@/lib/media/actions";
import type { MediaAssetRow, UploadProgress } from "@/lib/media/actions";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

// ============================================================
// Types
// ============================================================

export interface MediaItem extends MediaAssetRow {
  signed_url?: string;
  _error?: boolean;
}

interface MediaGalleryProps {
  productId: string;
  initialMedia: MediaItem[];
  isDraft: boolean;
}

// ============================================================
// Component
// ============================================================

export function MediaGallery({ productId, initialMedia, isDraft }: MediaGalleryProps) {
  const [media, setMedia] = useState<MediaItem[]>(initialMedia);

  // Sync media when server re-renders (e.g. after a page refresh with fresh signed URLs)
  useEffect(() => {
    setMedia(initialMedia);
  }, [initialMedia]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    stage: "validating",
    progress: 10,
    message: "Validating file...",
  });
  const [lastFailedFile, setLastFailedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset success state after a few seconds
  useEffect(() => {
    if (uploadSuccess) {
      const timer = setTimeout(() => setUploadSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [uploadSuccess]);

  // Animate progress through upload stages
  const animateProgress = useCallback(() => {
    setUploadProgress({ stage: "uploading", progress: 25, message: "Uploading file..." });

    const uploadInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev.progress < 70) {
          return { ...prev, progress: prev.progress + 5 };
        }
        clearInterval(uploadInterval);
        return prev;
      });
    }, 200);

    return () => clearInterval(uploadInterval);
  }, []);

  // After a successful upload, the server returns the DB row without a signed URL.
  // Resolve one client-side so the new item renders in the gallery immediately.
  async function resolveSignedUrl(item: MediaAssetRow): Promise<MediaItem> {
    try {
      const signedUrl = await getMediaSignedUrl(item.storage_path, item.media_type);
      return { ...item, signed_url: signedUrl };
    } catch (err) {
      console.error(`[MediaGallery] Failed to get signed URL for ${item.storage_path}:`, err);
      return { ...item, signed_url: undefined, _error: true };
    }
  }

  async function uploadFileToStorage(file: File, uploadUrl: string): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`Storage upload failed: ${response.status} ${response.statusText}`);
    }
  }

  async function doUpload(file: File) {
    setUploadError(null);
    setUploadSuccess(false);
    setLastFailedFile(null);

    // Step 0: Validate client-side first
    const maxPhotoSize = 10 * 1024 * 1024;
    const maxVideoSize = 100 * 1024 * 1024;
    const allowedPhotoTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const allowedVideoTypes = ["video/mp4", "video/webm", "video/quicktime"];

    const isPhoto = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isPhoto && !isVideo) {
      setUploadError(`Unsupported file type: ${file.type}`);
      return;
    }

    if (isPhoto && !allowedPhotoTypes.includes(file.type)) {
      setUploadError(`Unsupported image type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF`);
      return;
    }

    if (isVideo && !allowedVideoTypes.includes(file.type)) {
      setUploadError(`Unsupported video type: ${file.type}. Allowed: MP4, WebM, MOV`);
      return;
    }

    if (isPhoto && file.size > maxPhotoSize) {
      setUploadError("Image too large. Maximum size is 10 MB.");
      return;
    }

    if (isVideo && file.size > maxVideoSize) {
      setUploadError("Video too large. Maximum size is 100 MB.");
      return;
    }

    setUploading(true);

    // Step 1: Get signed upload URL from server
    setUploadProgress({ stage: "uploading", progress: 10, message: "Preparing upload..." });

    const requestResult = await requestUploadUrl(productId, {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });

    if (!requestResult.ok) {
      setUploadProgress({ stage: "error", progress: 0, message: requestResult.error });
      setUploadError(requestResult.error);
      setLastFailedFile(file);
      setUploading(false);
      return;
    }

    const { uploadUrl, storagePath, bucket, partnerId } = requestResult;

    // Step 2: Upload file directly to Storage
    setUploadProgress({ stage: "uploading", progress: 30, message: "Uploading file..." });

    try {
      await uploadFileToStorage(file, uploadUrl);
    } catch (err) {
      setUploadProgress({
        stage: "error",
        progress: 0,
        message: err instanceof Error ? err.message : "Upload failed",
      });
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setLastFailedFile(file);
      setUploading(false);
      return;
    }

    // Step 3: Register metadata in DB
    setUploadProgress({ stage: "saving", progress: 80, message: "Saving media info..." });

    const registerResult = await registerMedia(productId, {
      storagePath,
      bucket,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      partnerId,
    });

    if (!registerResult.ok) {
      setUploadProgress({ stage: "error", progress: 0, message: registerResult.error });
      setUploadError(registerResult.error);
      setLastFailedFile(file);
    } else {
      const resolved = registerResult.data.signed_url
        ? registerResult.data
        : await resolveSignedUrl(registerResult.data);
      setMedia((prev) => [...prev, resolved]);
      setUploadProgress({ stage: "done", progress: 100, message: "Upload complete!" });
      setUploadSuccess(true);
      setUploadError(null);
      setLastFailedFile(null);
    }

    setUploading(false);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    await doUpload(file);
  }

  async function handleRetry() {
    if (!lastFailedFile) return;

    setUploadError(null);
    setUploadSuccess(false);
    setUploading(true);

    const cleanup = animateProgress();

    try {
      await doUpload(lastFailedFile);
    } finally {
      cleanup();
    }
  }

  async function handleDelete(mediaId: string) {
    const item = media.find((m) => m.id === mediaId);
    if (!item) return;

    const confirmed = confirm(`Delete "${item.file_name}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(mediaId);
    const result = await deleteMedia(productId, mediaId);
    if (result.ok) {
      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
      toast.success("File deleted");
    } else {
      toast.error(result.error);
    }
    setDeletingId(null);
  }

  async function handleSetPrimary(mediaId: string) {
    setSettingPrimaryId(mediaId);
    const result = await setPrimaryMedia(productId, mediaId);
    if (result.ok) {
      setMedia((prev) =>
        prev.map((m) => ({
          ...m,
          is_primary: m.id === mediaId,
        }))
      );
      toast.success("Set as primary photo");
    } else {
      toast.error(result.error);
    }
    setSettingPrimaryId(null);
  }

  async function handleDownload(mediaId: string, fileName: string) {
    const result = await getMediaDownloadUrl(productId, mediaId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    try {
      // Fetch the file as a blob to force a download rather than opening a preview tab.
      const response = await fetch(result.url);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open the signed URL if blob download fails
      window.open(result.url, "_blank", "noopener,noreferrer");
    }
  }

  const progressColor = uploadProgress.stage === "error" ? "bg-red-500" : "bg-blue-600";
  const progressText =
    uploadProgress.stage === "error"
      ? uploadProgress.message || "Upload failed"
      : uploadProgress.stage === "done"
        ? "Upload complete!"
        : uploadProgress.message;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Media</h2>
        {isDraft && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/mp4,video/webm,video/quicktime"
              onChange={handleFileSelect}
              className="hidden"
              id="media-upload"
            />
            <label
              htmlFor="media-upload"
              className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 ${
                uploading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600"
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
                  Uploading...
                </>
              ) : (
                "Upload file"
              )}
            </label>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {uploading && (
        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full transition-all duration-300 ${progressColor}`}
              style={{ width: `${uploadProgress.progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">{progressText}</p>
        </div>
      )}

      {/* Status messages */}
      {uploadError && !uploading && (
        <Alert variant="error" className="mt-4">
          <div className="flex items-center justify-between">
            <span>{uploadError}</span>
            <button
              onClick={handleRetry}
              disabled={uploading}
              className="ml-3 inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
              type="button"
            >
              <RotateCcw className="h-3 w-3" />
              Retry
            </button>
          </div>
        </Alert>
      )}
      {uploadSuccess && !uploading && uploadProgress.stage === "done" && (
        <Alert variant="success" className="mt-4">
          File uploaded successfully.
        </Alert>
      )}

      {/* Gallery */}
      {media.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          No media uploaded yet. {isDraft ? "Upload photos or videos of your product." : ""}
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {media.map((item) => (
            <div
              key={item.id}
              className={`relative rounded-lg border-2 overflow-hidden ${
                item.is_primary ? "border-blue-500" : "border-gray-200"
              }`}
            >
              {/* Media preview */}
              {item.media_type === "image" && item.signed_url ? (
                <img
                  src={item.signed_url}
                  alt={item.file_name}
                  className="aspect-square w-full object-cover"
                />
              ) : item.media_type === "video" && item.signed_url ? (
                <video
                  src={item.signed_url}
                  className="aspect-square w-full object-cover"
                  controls
                  playsInline
                  preload="metadata"
                />
              ) : (
                <div className="aspect-square flex items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <span className="text-xs text-gray-400 block">No preview</span>
                    {item._error && (
                      <span className="text-xs text-red-400 block mt-1">(preview error — check console)</span>
                    )}
                  </div>
                </div>
              )}

              {/* Primary badge */}
              {item.is_primary && (
                <span className="absolute top-2 left-2 rounded bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                  Primary
                </span>
              )}

              {/* Actions */}
              {isDraft ? (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/50 px-2 py-1.5">
                  {!item.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(item.id)}
                      disabled={settingPrimaryId === item.id}
                      className="text-xs text-white hover:underline disabled:opacity-50"
                      type="button"
                    >
                      {settingPrimaryId === item.id ? "Setting..." : "Set primary"}
                    </button>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(item.id, item.file_name)}
                      className="text-xs text-white hover:underline"
                      type="button"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="inline-flex items-center gap-1 text-xs text-red-300 hover:text-red-100 disabled:opacity-50"
                      type="button"
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                      {deletingId === item.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/50 px-2 py-1.5">
                  <button
                    onClick={() => handleDownload(item.id, item.file_name)}
                    className="text-xs text-white hover:underline"
                    type="button"
                  >
                    Download
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
