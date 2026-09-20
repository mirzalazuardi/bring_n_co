'use client';

import React, { useMemo, useState } from 'react';
import {
  Check,
  Clock,
  Download,
  ExternalLink,
  Loader2,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { AdminRegistrationRow, AdminVerificationStatus } from '@/lib/admin/registrations';

interface AdminRegistrationsTableProps {
  initialRows: AdminRegistrationRow[];
}

type Filter = 'ALL' | AdminVerificationStatus;

const STATUS_BADGE: Record<AdminVerificationStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const STATUS_LABEL: Record<AdminVerificationStatus, string> = {
  PENDING: 'Menunggu',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
};

/**
 * Inline proof preview used inside the hover popover. Images render directly;
 * anything the browser cannot display (e.g. PDF) falls back to an open link.
 */
function ProofPreview({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <p className="text-xs text-gray-500 dark:text-gray-400 px-2 py-6 text-center">
        Pratinjau tidak tersedia — buka berkas untuk melihat.
      </p>
    );
  }
  return (
    <img
      src={url}
      alt="Pratinjau bukti transfer"
      onError={() => setFailed(true)}
      className="w-64 max-h-60 object-contain rounded-lg bg-gray-50 dark:bg-gray-900"
      loading="lazy"
    />
  );
}

/**
 * Registrations table for the committee: filter by status, inspect the bank
 * transfer proof, and approve/reject with optional notes. Optimistic-free —
 * each PATCH refetches that row so the UI always mirrors the server.
 */
export function AdminRegistrationsTable({ initialRows }: AdminRegistrationsTableProps) {
  const [rows, setRows] = useState(initialRows);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notesFor, setNotesFor] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [deleting, setDeleting] = useState<AdminRegistrationRow | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== 'ALL' && r.status !== filter) return false;
      if (!q) return true;
      return (
        r.userName.toLowerCase().includes(q)
        || r.userEmail.toLowerCase().includes(q)
        || r.classGroup.toLowerCase().includes(q)
        || r.phone.includes(q)
      );
    });
  }, [rows, filter, query]);

  const patchRow = async (row: AdminRegistrationRow, status: AdminVerificationStatus, notes?: string) => {
    setBusyId(row.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/registrations/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes: notes?.trim() ? notes.trim() : undefined }),
      });
      const body = (await res.json()) as
        | { success: true; data: AdminRegistrationRow }
        | { success: false; error: string };

      if (!res.ok || !body.success) {
        setError('error' in body ? body.error : 'Gagal memperbarui status.');
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === row.id ? body.data : r)));
      setNotesFor(null);
      setNotesDraft('');
    } catch {
      setError('Gagal menghubungi server. Coba lagi.');
    } finally {
      setBusyId(null);
    }
  };

  const handleAction = (row: AdminRegistrationRow, status: AdminVerificationStatus) => {
    if (status === 'REJECTED') {
      // Rejecting requires a note — open the inline notes editor instead
      setNotesFor(row.id);
      setNotesDraft(row.notes ?? '');
      return;
    }
    void patchRow(row, status, status === 'APPROVED' ? undefined : undefined);
  };

  const submitReject = (row: AdminRegistrationRow) => {
    if (!notesDraft.trim()) {
      setError('Catatan wajib diisi saat menolak pendaftaran.');
      return;
    }
    void patchRow(row, 'REJECTED', notesDraft);
  };

  /** Permanently delete the user account + registration + photos. */
  const deleteUser = async (row: AdminRegistrationRow) => {
    setBusyId(row.userId);
    setError(null);
    setDeleting(null);
    try {
      const res = await fetch(`/api/admin/users/${row.userId}`, { method: 'DELETE' });
      const body = (await res.json()) as {
        success: boolean;
        error?: string;
        blobErrors?: string[];
      };
      if (!res.ok || !body.success) {
        setError(body.error ?? 'Gagal menghapus pengguna.');
        return;
      }
      if (body.blobErrors && body.blobErrors.length > 0) {
        setError(`Pengguna terhapus, namun ${body.blobErrors.length} berkas storage gagal dihapus.`);
      }
      setRows((prev) => prev.filter((r) => r.userId !== row.userId));
    } catch {
      setError('Gagal menghubungi server. Coba lagi.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama, email, kelas, atau no. HP…"
            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div className="flex gap-1.5">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {f === 'ALL' ? 'Semua' : STATUS_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="m-4 p-3 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          {error}
        </div>
      )}

      {/* Table — horizontal scroll only on small screens; visible overflow on
          desktop so the proof hover popover is never clipped */}
      <div className="overflow-x-auto sm:overflow-x-visible">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50 text-left">
            <tr className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <th className="px-4 py-3 font-semibold">Alumni</th>
              <th className="px-4 py-3 font-semibold">Kelas</th>
              <th className="px-4 py-3 font-semibold">Jersey</th>
              <th className="px-4 py-3 font-semibold">No. HP</th>
              <th className="px-4 py-3 font-semibold">Bukti</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                  Tidak ada pendaftar yang cocok.
                </td>
              </tr>
            )}
            {filtered.map((row) => (
              <tr key={row.id} className="align-top">
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{row.userName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{row.userEmail}</p>
                  {row.notes && (
                    <p className="mt-1 text-xs italic text-gray-500 dark:text-gray-400">
                      Catatan: {row.notes}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.classGroup}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.jerseySize}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.phone}</td>
                <td className="px-4 py-3">
                  <div className="relative group inline-block">
                    {/* Hover popover — rendered above the link */}
                    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30">
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-1.5">
                        <ProofPreview url={row.proofUrl} />
                        <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 mt-1">
                          Klik untuk buka ukuran penuh
                        </p>
                      </div>
                    </div>
                    <a
                      href={row.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:underline"
                    >
                      Lihat <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[row.status]}`}>
                    {row.status === 'PENDING' && <Clock className="w-3 h-3" />}
                    {row.status === 'APPROVED' && <Check className="w-3 h-3" />}
                    {row.status === 'REJECTED' && <X className="w-3 h-3" />}
                    {STATUS_LABEL[row.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {notesFor === row.id ? (
                    <div className="space-y-2 min-w-56">
                      <textarea
                        rows={2}
                        maxLength={500}
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        placeholder="Alasan penolakan (wajib)…"
                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => { setNotesFor(null); setNotesDraft(''); }}
                          className="px-2.5 py-1 rounded-lg text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                        >
                          Batal
                        </button>
                        <button
                          onClick={() => submitReject(row)}
                          disabled={busyId === row.id}
                          className="px-2.5 py-1 rounded-lg text-xs bg-red-600 text-white disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {busyId === row.id && <Loader2 className="w-3 h-3 animate-spin" />}
                          Tolak
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => handleAction(row, 'APPROVED')}
                        disabled={busyId === row.id || row.status === 'APPROVED'}
                        title="Setujui verifikasi"
                        className="p-2 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 disabled:opacity-40 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors"
                      >
                        {busyId === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleAction(row, 'REJECTED')}
                        disabled={busyId === row.id || row.status === 'REJECTED'}
                        title="Tolak (isi catatan)"
                        className="p-2 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 disabled:opacity-40 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleAction(row, 'PENDING')}
                        disabled={busyId === row.id || row.status === 'PENDING'}
                        title="Kembalikan ke menunggu"
                        className="p-2 rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(row)}
                        disabled={busyId === row.id}
                        title="Hapus pengguna permanen"
                        className="p-2 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 disabled:opacity-40 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <Download className="w-3 h-3" />
          Rekap lengkap tersedia via tombol &quot;Export Excel&quot; di atas.
        </div>
      )}

      {/* Delete-user confirm dialog — the destructive action gets an explicit,
          typed confirmation naming the victim before anything is removed. */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Hapus pengguna?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-gray-100">{deleting.userName}</span>{' '}
              ({deleting.userEmail}) akan dihapus permanen bersama pendaftaran, bukti transfer,
              dan seluruh foto galerinya. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleting(null)}
                disabled={busyId === deleting.userId}
                className="px-4 py-2 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              >
                Batal
              </button>
              <button
                onClick={() => void deleteUser(deleting)}
                disabled={busyId === deleting.userId}
                className="px-4 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {busyId === deleting.userId && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Ya, hapus permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
