import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      setError(t('photoUpload.typeError'));
      return;
    }
    if (f.size > MAX_SIZE_BYTES) {
      setError(t('photoUpload.sizeError'));
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
      setError(getApiErrorMessage(err, t('photoUpload.uploadFailed')));
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
          <p className="text-sm font-medium text-gray-700">{t('photoUpload.dropHint')}</p>
          <p className="text-xs text-gray-400">{t('photoUpload.formats')}</p>
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
            <img
              src={previewUrl}
              alt={t('photoUpload.previewAlt')}
              className="max-h-64 w-full object-contain bg-gray-50"
            />
          )}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <p className="truncate text-xs text-gray-500">
              {file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB
            </p>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={reset} className="btn-secondary !px-3 !py-1.5 text-xs">
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void handleUpload()}
                disabled={uploading}
                className="btn-primary !px-3 !py-1.5 text-xs"
              >
                {uploading ? t('photoUpload.uploading') : t('photoUpload.upload')}
              </button>
            </div>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
