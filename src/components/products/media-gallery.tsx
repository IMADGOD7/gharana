"use client";

import { useState, useRef, useEffect } from "react";
import { Alert } from "@/components/ui/alert";
import { uploadMedia, deleteMedia, setPrimaryMedia } from "@/lib/media/actions";

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
// Actions — imported as functions
// ============================================================

import type { MediaAssetRow } from "@/lib/media/actions";

// ============================================================
// Component
// ============================================================

export function MediaGallery({ productId, initialMedia, isDraft }: MediaGalleryProps) {
  const [media, setMedia] = useState<MediaItem[]>(initialMedia);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset success state after a few seconds
  useEffect(() => {
    if (uploadSuccess) {
      const timer = setTimeout(() => setUploadSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [uploadSuccess]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(false);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadMedia(productId, formData);

      if (!result.ok) {
        setUploadError(result.error);
      } else if (result.ok && result.data) {
        setMedia((prev) => [...prev, result.data]);
        setUploadSuccess(true);
      }
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleDelete(mediaId: string) {
    if (!confirm("Are you sure you want to delete this file?")) return;

    setDeletingId(mediaId);
    const result = await deleteMedia(productId, mediaId);
    if (result.ok) {
      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
    }
    setDeletingId(null);
  }

  async function handleSetPrimary(mediaId: string) {
    const result = await setPrimaryMedia(productId, mediaId);
    if (result.ok) {
      setMedia((prev) =>
        prev.map((m) => ({
          ...m,
          is_primary: m.id === mediaId,
        }))
      );
    }
  }

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
              className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {uploading ? "Uploading..." : "Upload file"}
            </label>
          </div>
        )}
      </div>

      {/* Status messages */}
      {uploadError && (
        <Alert variant="error" className="mt-4">
          {uploadError}
        </Alert>
      )}
      {uploadSuccess && (
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
                  muted
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
              {isDraft && (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/50 px-2 py-1.5">
                  {!item.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(item.id)}
                      className="text-xs text-white hover:underline"
                      type="button"
                    >
                      Set primary
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="text-xs text-red-300 hover:text-red-100 disabled:opacity-50"
                    type="button"
                  >
                    {deletingId === item.id ? "Deleting..." : "Delete"}
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
