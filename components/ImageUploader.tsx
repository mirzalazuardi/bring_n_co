'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  RotateCcw,
  UploadCloud,
} from 'lucide-react';

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/tiff',
];

type Phase = 'idle' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed';

interface VariantMeta {
  url: string;
  width: number;
  height: number;
}

interface StatusPayload {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  errorCategory?: string | null;
  errorMessage?: string | null;
  variants?: Record<string, VariantMeta> | null;
}

interface ImageUploaderProps {
  maxSizeMb: number;
}

/**
 * Optimized gallery uploader: client-side pre-validation, direct-to-Blob
 * upload with progress, metadata attach, status polling with exponential
 * backoff (stops at terminal states), retry on failure, and clean unmount.
 */
export function ImageUploader({ maxSizeMb }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [imageId, setImageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    return () => {
      // Unmount: stop polling, abort in-flight status requests
      cancelledRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const pickFile = (selected: File) => {
    setError(null);
    if (selected.size === 0) {
      setError('File kosong atau tidak valid.');
      return;
    }
    if (selected.size > maxSizeMb * 1024 * 1024) {
      setError(`Ukuran gambar melebihi ${maxSizeMb} MB.`);
      return;
    }
    if (!ACCEPTED_TYPES.includes(selected.type.toLowerCase())) {
      setError('Format tidak didukung. Gunakan JPEG, PNG, WebP, GIF, AVIF, atau TIFF.');
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setResultUrl(null);
    setPhase('idle');
  };

  const pollStatus = useCallback(
    async (id: string, attempt: number) => {
      if (cancelledRef.current) return;
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`/api/images/${id}`, { signal: controller.signal });
        if (res.status === 404) throw new Error('Image not found');
        if (!res.ok) throw new Error('status fetch failed');
        const body = (await res.json()) as { success: boolean; data: StatusPayload };
        const data = body.data;

        if (data.status === 'completed') {
          setPhase('completed');
          setResultUrl(data.variants?.medium?.url ?? null);
          return;
        }
        if (data.status === 'failed') {
          setPhase('failed');
          setError(data.errorMessage ?? 'Pemrosesan gambar gagal.');
          return;
        }

        setPhase(data.status); // queued | processing
        // Exponential backoff: 1s, 2s, 4s, 8s… capped at 8s
        const delay = Math.min(1000 * 2 ** attempt, 8000);
        timerRef.current = setTimeout(() => pollStatus(id, attempt + 1), delay);
      } catch (err) {
        if (cancelledRef.current || controller.signal.aborted) return;
        // Network hiccup: retry a few times before giving up
        if (attempt < 5) {
          const delay = Math.min(1000 * 2 ** attempt, 8000);
          timerRef.current = setTimeout(() => pollStatus(id, attempt + 1), delay);
          return;
        }
        setPhase('failed');
        setError(
          err instanceof Error && err.message === 'Image not found'
            ? 'Gambar tidak ditemukan.'
            : 'Gagal memeriksa status pemrosesan.',
        );
      }
    },
    [],
  );

  const handleUpload = async () => {
    if (!file) return;
    setError(null);
    setPhase('uploading');
    setProgress(0);
    setResultUrl(null);

    const id = crypto.randomUUID();
    try {
      await upload(`images/${id}/original`, file, {
        access: 'public',
        handleUploadUrl: '/api/images/upload',
        contentType: file.type,
        onUploadProgress: (p) => setProgress(Math.round(p.percentage)),
      });
      setImageId(id);

      // Attach optional metadata (best-effort — never blocks the pipeline)
      if (title.trim() || description.trim()) {
        void fetch(`/api/images/${id}/metadata`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim() || undefined, description: description.trim() || undefined }),
        }).catch(() => undefined);
      }

      setPhase('queued');
      void pollStatus(id, 0);
    } catch (err) {
      setPhase('failed');
      setError(
        err instanceof Error
          ? `Gagal mengunggah: ${err.message}`
          : 'Terjadi kesalahan saat mengunggah.',
      );
    }
  };

  const handleRetry = async () => {
    if (!imageId) return;
    setError(null);
    setPhase('queued');
    try {
      const res = await fetch(`/api/images/${imageId}/reprocess`, { method: 'POST' });
      if (res.status === 409) {
        setError('Pemrosesan ulang hanya tersedia untuk gambar yang gagal.');
        setPhase('failed');
        return;
      }
      if (!res.ok) throw new Error();
      void pollStatus(imageId, 0);
    } catch {
      setPhase('failed');
      setError('Gagal memulai pemrosesan ulang.');
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setPhase('idle');
    setProgress(0);
    setImageId(null);
    setResultUrl(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const busy = phase === 'uploading' || phase === 'queued' || phase === 'processing';

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Drop zone */}
      <div
        onClick={() => !busy && fileInputRef.current?.click()}
        className={`border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-teal-300 dark:hover:border-teal-600 bg-gray-50 dark:bg-gray-700 rounded-xl p-6 text-center transition-colors ${busy ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) pickFile(selected);
          }}
          className="hidden"
        />
        {preview ? (
          <div className="space-y-3">
            {/* Local object-URL preview (not Next-managed) */}
            <img
              src={preview}
              alt="Pratinjau yang dipilih"
              className="w-full max-w-sm mx-auto h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">Klik untuk mengganti foto</p>
          </div>
        ) : (
          <div>
            <UploadCloud className="w-10 h-10 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Pilih foto kenangan alumni
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              JPEG, PNG, WebP, GIF, AVIF, TIFF (Maks {maxSizeMb} MB)
            </p>
          </div>
        )}
      </div>

      {/* Progress bar during direct upload */}
      {phase === 'uploading' && (
        <div>
          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full bg-teal-500 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
            Mengunggah… {progress}%
          </p>
        </div>
      )}

      {/* Status pill */}
      {busy && phase !== 'uploading' && (
        <div className="flex items-center justify-center gap-2 text-sm text-stone-600 dark:text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          {phase === 'queued' ? 'Dalam antrean pemrosesan…' : 'Mengoptimalkan gambar…'}
        </div>
      )}

      {phase === 'completed' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>Kenangan berhasil dioptimalkan dan dipublikasikan ke galeri!</span>
          </div>
          {resultUrl && (
            /* Dynamic Blob URL (not Next-managed) */
            <img
              src={resultUrl}
              alt="Hasil optimasi"
              className="w-full max-w-sm mx-auto rounded-xl border border-gray-200 dark:border-gray-600"
            />
          )}
        </div>
      )}

      {phase === 'failed' && imageId && (
        <div className="flex justify-center">
          <button onClick={handleRetry} className="btn-secondary flex items-center gap-2 text-sm">
            <RotateCcw className="w-4 h-4" />
            Coba Proses Ulang
          </button>
        </div>
      )}

      {/* Metadata — enabled until upload starts */}
      <div className={busy ? 'opacity-60 pointer-events-none space-y-4' : 'space-y-4'}>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Judul Foto <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">(Opsional)</span>
          </label>
          <input
            type="text"
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="contoh: Hari Wisuda 2001, Trip Akhir Sekolah"
            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Cerita / Deskripsi <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">(Opsional)</span>
          </label>
          <textarea
            rows={3}
            maxLength={300}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Siapa yang ada di foto ini? Di mana foto ini diambil?"
            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleUpload}
          disabled={!file || busy}
          className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm disabled:opacity-50"
        >
          {phase === 'uploading' ? (
            'Mengunggah…'
          ) : (
            <>
              <UploadCloud className="w-4 h-4" />
              Unggah ke Galeri Reuni
            </>
          )}
        </button>
        {(file || resultUrl) && !busy && (
          <button onClick={reset} className="btn-secondary text-sm">
            {resultUrl ? <><Clock className="w-4 h-4" /> Upload Lain</> : 'Batal'}
          </button>
        )}
      </div>
    </div>
  );
}
