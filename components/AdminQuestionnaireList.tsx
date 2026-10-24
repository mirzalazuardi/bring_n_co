'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  Plus,
  Trash2,
  QrCode,
  BarChart2,
  Loader2,
  ToggleLeft,
} from 'lucide-react';
import { CopyButton } from '@/components/CopyButton';

interface QuestionnaireRow {
  id: string;
  title: string;
  description: string | null;
  isOpen: boolean;
  requireVerified: boolean;
  resultsPublished: boolean;
  questionCount: number;
  respondents: number;
  createdAt: string;
}

export function AdminQuestionnaireList({ initialRows }: { initialRows: QuestionnaireRow[] }) {
  const [rows, setRows] = useState<QuestionnaireRow[]>(initialRows);
  const [newTitle, setNewTitle] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrOpenId, setQrOpenId] = useState<string | null>(null);

  const updateRow = (id: string, patch: Partial<QuestionnaireRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const load = async () => {
    const res = await fetch('/api/admin/questionnaires');
    if (res.ok) {
      const data = await res.json();
      setRows(data.data);
    }
  };

  const createQuestionnaire = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const res = await fetch('/api/admin/questionnaires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details?.[0] || data.error || 'Gagal membuat kuesioner');
      }
      setNewTitle('');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (row: QuestionnaireRow, key: 'isOpen' | 'requireVerified' | 'resultsPublished') => {
    setBusyId(row.id + key);
    setError(null);
    updateRow(row.id, { [key]: !row[key] });
    try {
      const res = await fetch(`/api/admin/questionnaires/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: !row[key] }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal mengubah pengaturan');
      }
    } catch (err: unknown) {
      updateRow(row.id, { [key]: row[key] }); // rollback optimistic toggle
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (row: QuestionnaireRow) => {
    if (!window.confirm(`Hapus kuesioner "${row.title}" beserta semua jawabannya?`)) return;
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/admin/questionnaires/${row.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menghapus kuesioner');
      }
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Create */}
      <form onSubmit={createQuestionnaire} className="flex gap-2">
        <input
          type="text"
          required
          minLength={3}
          maxLength={200}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Judul kuesioner baru, mis. Survei Menu Makan"
          className="flex-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button
          type="submit"
          disabled={creating}
          className="btn-primary inline-flex items-center gap-2 text-sm px-4 py-2.5 disabled:opacity-50 whitespace-nowrap"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Buat
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-8 text-center">
          Belum ada kuesioner. Buat satu di atas, lalu tambahkan pertanyaannya.
        </p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                {['Kuesioner', 'Aktif', 'Wajib Verified', 'Hasil Public', 'Responden', 'Aksi'].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-3">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{row.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {row.questionCount} pertanyaan · dibuat {new Date(row.createdAt).toLocaleDateString('id-ID')}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <ToggleSwitch
                      on={row.isOpen}
                      busy={busyId === row.id + 'isOpen'}
                      onChange={() => toggle(row, 'isOpen')}
                      labels={{ on: 'Buka', off: 'Tutup' }}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <ToggleSwitch
                      on={row.requireVerified}
                      busy={busyId === row.id + 'requireVerified'}
                      onChange={() => toggle(row, 'requireVerified')}
                      labels={{ on: 'Wajib', off: 'Bebas' }}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <ToggleSwitch
                      on={row.resultsPublished}
                      busy={busyId === row.id + 'resultsPublished'}
                      onChange={() => toggle(row, 'resultsPublished')}
                      labels={{ on: 'Publik', off: 'Privat' }}
                    />
                  </td>
                  <td className="px-3 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-center">
                    {row.respondents}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => setQrOpenId(row.id)}
                        title="Tampilkan QR"
                        className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      {row.resultsPublished && (
                        <a
                          href={`/kuesioner/${row.id}/hasil`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Halaman hasil publik"
                          className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                        >
                          <BarChart2 className="w-4 h-4" />
                        </a>
                      )}
                      <Link
                        href={`/admin/kuesioner/${row.id}`}
                        className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline px-1.5 whitespace-nowrap"
                      >
                        <ClipboardList className="w-4 h-4 inline-block mr-1 -mt-0.5" />
                        Kelola
                      </Link>
                      <button
                        onClick={() => remove(row)}
                        disabled={busyId === row.id}
                        title="Hapus kuesioner"
                        className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* QR dialog */}
      {qrOpenId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setQrOpenId(null)}
          role="presentation"
        >
          <div
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">
              QR untuk {rows.find((r) => r.id === qrOpenId)?.title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Scan untuk membuka halaman pengisian kuesioner
            </p>
            {/* Basic Auth-protected image — browser prompts once, then caches. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/admin/questionnaires/${qrOpenId}/qr`}
              alt="QR kuesioner"
              className="w-64 h-64 mx-auto"
            />
            {qrOpenId && (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                <span className="font-mono break-all">/kuesioner/{qrOpenId}</span>
                <CopyButton text={`${typeof window !== 'undefined' ? window.location.origin : ''}/kuesioner/${qrOpenId}`} />
              </div>
            )}
            <button
              onClick={() => setQrOpenId(null)}
              className="btn-secondary mt-5 text-sm px-4 py-2"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleSwitch({
  on,
  onChange,
  busy,
  labels,
}: {
  on: boolean;
  onChange: () => void;
  busy?: boolean;
  labels: { on: string; off: string };
}) {
  return (
    <button
      onClick={() => onChange()}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors disabled:opacity-50 ${
        on
          ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800'
          : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600'
      }`}
      title={on ? `Klik untuk menonaktifkan` : `Klik untuk mengaktifkan`}
    >
      <ToggleLeft className={`w-3.5 h-3.5 ${on ? 'rotate-180' : ''}`} />
      {on ? labels.on : labels.off}
    </button>
  );
}
