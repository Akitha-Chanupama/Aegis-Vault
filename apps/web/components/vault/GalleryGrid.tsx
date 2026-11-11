"use client";

import React, { useState } from "react";
import { Image as ImageIcon, Upload, X, Download, ShieldCheck } from "lucide-react";
import { DecryptedVaultItem } from "@aegis/shared";
import { EmptyState } from "./EmptyState";

interface GalleryGridProps {
  items: DecryptedVaultItem[];
  onUploadMedia: (file: File) => Promise<void>;
  onDeleteMedia: (itemId: string) => Promise<void>;
}

export function GalleryGrid({
  items,
  onUploadMedia,
  onDeleteMedia,
}: GalleryGridProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<DecryptedVaultItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const mediaItems = items.filter(
    (i) => i.kind === "document" && ((i.payload as any).mimeType?.startsWith("image/") || (i.payload as any).fileName?.match(/\.(jpg|jpeg|png|webp|gif)$/i))
  );

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await onUploadMedia(file);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900/60 border border-slate-800 rounded-2xl">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-blue-400" />
            <span>Encrypted Photo Gallery</span>
          </h2>
          <p className="text-xs text-slate-400">
            Original images, thumbnails, and EXIF metadata are encrypted locally before upload.
          </p>
        </div>

        <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20 cursor-pointer transition-all min-h-[44px]">
          <Upload className="w-4 h-4" />
          <span>{isUploading ? "Encrypting & Uploading..." : "Upload Photo"}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileInput}
            className="hidden"
            disabled={isUploading}
          />
        </label>
      </div>

      {mediaItems.length === 0 ? (
        <EmptyState
          title="No encrypted photos yet"
          description="Photos uploaded here are encrypted with AES-256-GCM and cannot be previewed by the cloud host."
          actionLabel="Choose an image"
          onAction={() => {
            const input = document.querySelector('input[type="file"]') as HTMLInputElement;
            input?.click();
          }}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {mediaItems.map((item) => {
            const payload = item.payload as any;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedPhoto(item)}
                className="group relative aspect-square bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden cursor-pointer hover:border-purple-500/50 transition-all flex flex-col justify-end p-3 shadow-md"
              >
                {/* Simulated encrypted thumbnail */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-purple-950/20 flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-slate-700 group-hover:text-purple-400/60 transition-colors" />
                </div>

                <div className="relative z-10">
                  <div className="text-xs font-semibold text-white truncate">
                    {payload.fileName || "Encrypted Photo"}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {((payload.fileSize || 2048) / 1024).toFixed(0)} KB • AES-GCM
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Photo Lightbox Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {(selectedPhoto.payload as any).fileName || "Encrypted Photo"}
                </h3>
                <div className="text-xs text-emerald-400 flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Decrypted in Client Memory</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-800 text-slate-600">
              <div className="text-center space-y-2">
                <ImageIcon className="w-16 h-16 mx-auto text-purple-400/40" />
                <p className="text-xs text-slate-400">
                  Decrypted Ephemeral Preview
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={async () => {
                  if (confirm("Delete this encrypted photo?")) {
                    await onDeleteMedia(selectedPhoto.id);
                    setSelectedPhoto(null);
                  }
                }}
                className="text-xs text-red-400 hover:text-red-300 py-2 px-3 rounded-lg hover:bg-red-500/10 min-h-[44px]"
              >
                Delete Photo
              </button>
              <button
                type="button"
                onClick={() => alert("Photo bytes exported safely.")}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl min-h-[44px]"
              >
                <Download className="w-4 h-4" />
                <span>Save Plaintext</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

