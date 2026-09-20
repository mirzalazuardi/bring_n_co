'use client';

import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle, ImagePlus, Loader2, X } from 'lucide-react';

type Outcome =
  | { filename: string; ok: true; url: string }
  | { filename: string; ok: false; error: string };

interface BatchResponse {
  success: boolean;
  error?: string;
  data?: {
    total: number;
    succeeded: number;
    failed: number;
    results: Outcome[];
  };
}

/**
 * Admin bulk uploader: picks many images, sends them in one POST, and lists
 * the per-file outcome. Files publish to the gallery as-is — no optimization
 * step, so results are instant and final.
 */
export function AdminGalleryUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<Outcome[] | null>(null);

  const pick = (selected: FileList | null) => {
    if (!selected) return;
    setError(null);
    setOutcomes(null);
    setFiles((prev) => [...prev, ...Array.from(selected)].slice(0, 20));
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeAt = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    setOutcomes(null);
    try {
      const formData = new FormData();
      for (const f of files) formData.append('files', f);
      const res = await fetch('/api/admin/images/upload', { method: 'POST', body: formData });
      const body = (await res.json()) as BatchResponse;
      if (!res.ok || !body.success || !body.data) {
        setError(body.error ?? 'Gagal mengunggah berkas.');
        return;
      }
      setOutcomes(body.data.results);
      setFiles([]);
    } catch {
      setError('Gagal menghubungi server. Coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div
        onClick={() => !busy && inputRef.current?.click()}
        className={`border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-teal-400 dark:hover:border-teal-500 bg-gray-50 dark:bg-gray-700 rounded-xl p-8 text-center transition-colors ${busy ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/tiff"
          onChange={(e) => pick(e.target.files)}
          className="hidden"
        />
        <ImagePlus className="w-10 h-10 text-gray-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Pilih beberapa foto sekaligus
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          JPEG, PNG, WebP, GIF, AVIF, TIFF · maks 20 berkas · diunggah apa adanya
        </p>
      </div>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
            >
              <span className="truncate text-gray-700 dark:text-gray-300">{f.name}</span>
              <span className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} KB</span>
                {!busy && (
                  <button
                    onClick={() => removeAt(i)}
                    className="p-1 rounded text-gray-400 hover:text-red-500"
                    aria-label={`Hapus ${f.name}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={submit}
        disabled={files.length === 0 || busy}
        className="w-full btn-primary flex items-center justify-center gap-2 text-sm disabled:opacity-50"
      >
        {busy ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Mengunggah {files.length} berkas…
          </>
        ) : (
          <>
            <ImagePlus className="w-4 h-4" />
            Terbitkan {files.length > 0 ? `${files.length} ` : ''}foto ke Galeri
          </>
        )}
      </button>

      {outcomes && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Berhasil {outcomes.filter((o) => o.ok).length} / {outcomes.length}
          </p>
          <ul className="space-y-1.5">
            {outcomes.map((o, i) => (
              <li
                key={`${o.filename}-${i}`}
                className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
                  o.ok
                    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
                    : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30'
                }`}
              >
                {o.ok ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span className="truncate font-medium">{o.filename}</span>
                <span className="truncate text-xs opacity-80">
                  {o.ok ? 'terbit di galeri' : o.error}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
