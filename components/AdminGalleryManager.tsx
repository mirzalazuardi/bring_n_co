'use client';

import React, { useEffect, useState } from 'react';
import { Images, Loader2, RefreshCw, Trash2, X } from 'lucide-react';

interface GalleryPhoto {
  id: string;
  url: string;
  title: string | null;
  createdAt: string;
}

/**
 * Admin gallery management grid: shows all published photos, lets the
 * committee select multiple (or all), and batch-deletes with a confirm
 * dialog. The list refreshes after every delete so the grid always
 * reflects reality.
 */
export function AdminGalleryManager() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/images');
      const body = (await res.json()) as { success: boolean; data?: GalleryPhoto[]; error?: string };
      if (!res.ok || !body.success || !body.data) {
        setError(body.error ?? 'Gagal memuat galeri.');
        return;
      }
      setPhotos(body.data);
      setSelected(new Set());
    } catch {
      setError('Gagal menghubungi server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = photos.length > 0 && selected.size === photos.length;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(photos.map((p) => p.id)));
  };

  const executeDelete = async () => {
    setConfirming(false);
    setDeleting(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/images', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selected] }),
      });
      const body = (await res.json()) as {
        success: boolean;
        error?: string;
        data?: { deleted: number; failed: number; blobErrors: string[] };
      };
      if (!res.ok || !body.success || !body.data) {
        setError(body.error ?? 'Gagal menghapus foto.');
        return;
      }
      const parts = [`${body.data.deleted} foto terhapus`];
      if (body.data.failed > 0) parts.push(`${body.data.failed} gagal`);
      if (body.data.blobErrors.length > 0) parts.push('sebagian berkas storage gagal dihapus (tercatat di log)');
      setNotice(parts.join(' · '));
      await load();
    } catch {
      setError('Gagal menghubungi server.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAll}
            disabled={photos.length === 0 || deleting}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            {allSelected ? 'Batalkan semua' : 'Pilih semua'}
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {selected.size > 0 ? `${selected.size} dipilih` : `${photos.length} foto`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            disabled={deleting}
            className="p-2 rounded-lg text-gray-500 hover:text-teal-600 disabled:opacity-50"
            title="Muat ulang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setConfirming(true)}
            disabled={selected.size === 0 || deleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Hapus {selected.size > 0 ? `(${selected.size})` : ''}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          {error}
        </div>
      )}
      {notice && (
        <div className="p-3 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
          {notice}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-500 dark:text-gray-400 flex flex-col items-center gap-2">
          <Images className="w-8 h-8" />
          Belum ada foto di galeri.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((photo) => {
            const isSelected = selected.has(photo.id);
            return (
              <button
                key={photo.id}
                onClick={() => toggle(photo.id)}
                disabled={deleting}
                className={`relative group rounded-xl overflow-hidden border-2 transition-all focus:outline-none ${
                  isSelected
                    ? 'border-red-500 ring-2 ring-red-300'
                    : 'border-transparent hover:border-teal-400'
                }`}
              >
                {/* Dynamic Blob URL — plain img is intentional (not Next-managed) */}
                <img
                  src={photo.url}
                  alt={photo.title ?? 'Foto galeri'}
                  className="w-full h-32 object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center">
                    <X className="w-4 h-4" />
                  </div>
                )}
                {photo.title && (
                  <p className="absolute bottom-1 left-2 right-2 text-left text-[11px] text-white truncate opacity-0 group-hover:opacity-100">
                    {photo.title}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Confirm dialog */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Hapus foto?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selected.size} foto akan dihapus permanen dari galeri dan storage. Tindakan ini
              tidak dapat dibatalkan.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirming(false)}
                className="px-4 py-2 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              >
                Batal
              </button>
              <button
                onClick={() => void executeDelete()}
                className="px-4 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700"
              >
                Ya, hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
