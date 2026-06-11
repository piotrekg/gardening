import { useEffect, useRef, useState } from 'react';
import { getApiErrorMessage } from '../api/client';
import { uploadPhoto } from '../api/photos';
import type { Photo } from '../types';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB per API contract
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface PhotoUploadProps {
  gardenId: string;
  plantId: string;
  onUploaded: (photo: Photo) => void;
}

export function PhotoUpload({ gardenId, plantId, onUploaded }: PhotoUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const selectFile = (f: File) => {
    setError(null);
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError('Only JPG, PNG or WebP images are allowed.');
      return;
    }
    if (f.size > MAX_SIZE_BYTES) {
      setError('Image is too large — the maximum size is 10 MB.');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const photo = await uploadPhoto(gardenId, plantId, file);
      onUploaded(photo);
      reset();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Upload failed. Please try again.'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {!file ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const dropped = e.dataTransfer.files[0];
            if (dropped) selectFile(dropped);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
          }}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
            dragging
              ? 'border-primary bg-primary-light/50'
              : 'border-gray-200 bg-white hover:border-accent hover:bg-primary-light/20'
          }`}
        >
          <span className="text-3xl" aria-hidden="true">
            📷
          </span>
          <p className="text-sm font-medium text-gray-700">
            Drag a photo here, or click to choose
          </p>
          <p className="text-xs text-gray-400">JPG, PNG or WebP · max 10 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) selectFile(f);
            }}
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          {previewUrl && (
            <img src={previewUrl} alt="Upload preview" className="max-h-64 w-full object-contain bg-gray-50" />
          )}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <p className="truncate text-xs text-gray-500">
              {file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB
            </p>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={reset} className="btn-secondary !px-3 !py-1.5 text-xs">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleUpload()}
                disabled={uploading}
                className="btn-primary !px-3 !py-1.5 text-xs"
              >
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
