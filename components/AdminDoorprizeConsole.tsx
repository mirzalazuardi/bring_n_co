'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { FortuneWheel } from '@/components/FortuneWheel';
import { ListPlus, Plus, RotateCcw, Trash2, Trophy, UserPlus, X, Loader2 } from 'lucide-react';
import type { DrawView, ParticipantView, PrizeView } from '@/lib/admin/doorprize';

export interface AdminDoorprizeConsoleProps {
  initialParticipants: ParticipantView[];
  initialPrizes: PrizeView[];
  initialDraws: DrawView[];
  initialCandidates: { id: string; name: string }[];
}

interface SpinData {
  winner: { userId: string; userName: string | null };
  prize: { id: string; name: string };
}

interface ApiResult {
  success?: boolean;
  error?: string;
  /** Spin payload or a bulk participant count, depending on the endpoint. */
  data?: Partial<SpinData> & { added?: number; removed?: number };
}

interface PendingSpin {
  winner: { userId: string; userName: string | null };
  prize: { id: string; name: string };
}

export function AdminDoorprizeConsole({
  initialParticipants,
  initialPrizes,
  initialDraws,
  initialCandidates,
}: AdminDoorprizeConsoleProps) {
  const [participants, setParticipants] = useState(initialParticipants);
  const [prizes, setPrizes] = useState(initialPrizes);
  const [draws, setDraws] = useState(initialDraws);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [candidateId, setCandidateId] = useState('');
  const [prizeName, setPrizeName] = useState('');
  const [selectedPrizeId, setSelectedPrizeId] = useState(initialPrizes[0]?.id ?? '');
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const spinning = winnerIndex !== null;
  // Persisted spin result so the wheel can announce the winner when it lands.
  const pending = useRef<PendingSpin | null>(null);
  // The wheel segments are shuffled; the side panel stays alphabetical.
  const alphabeticalParticipants = useMemo(
    () =>
      [...participants].sort((a, b) =>
        (a.name ?? a.userId).localeCompare(b.name ?? b.userId, 'id', { sensitivity: 'base' }),
      ),
    [participants],
  );

  const refreshState = useCallback(async () => {
    const res = await fetch('/api/admin/wheel/state');
    const json = await res.json();
    if (res.ok && json.success) {
      setParticipants(json.data.participants);
      setPrizes(json.data.prizes);
      setDraws(json.data.draws);
    }
  }, []);

  const refreshCandidates = useCallback(async () => {
    const res = await fetch('/api/admin/wheel/participants');
    const json = await res.json();
    if (res.ok && json.success) setCandidates(json.data);
  }, []);

  function clearError() {
    setError(null);
  }

  /** Shared mutation wrapper: 400/401-error surfaces, success refreshes. */
  async function run(action: () => Promise<Response>, after?: (json: ApiResult) => void) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await action();
      let json: ApiResult = {};
      try {
        json = await res.json();
      } catch {
        // fall through — non-JSON error handled below
      }
      if (!res.ok || json.success === false) {
        setError(json.error ?? 'Terjadi kesalahan');
        return false;
      }
      clearError();
      after?.(json);
      return true;
    } finally {
      setBusy(false);
    }
  }

  const addParticipant = () =>
    void run(
      () => fetch('/api/admin/wheel/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: candidateId }),
      }),
      () => {
        setCandidateId('');
        void refreshState();
        void refreshCandidates();
      },
    );

  const removeParticipant = (id: string) =>
    void run(
      () => fetch(`/api/admin/wheel/participants/${id}`, { method: 'DELETE' }),
      () => {
        void refreshState();
        void refreshCandidates();
      },
    );

  /** Fill the wheel with every verified registrant not yet on it. */
  const addAllParticipants = () => {
    if (candidates.length === 0) return;
    if (!window.confirm(`Tambahkan semua ${candidates.length} alumni terverifikasi ke wheel?`)) return;
    void run(
      () => fetch('/api/admin/wheel/participants/all', { method: 'POST' }),
      (json) => {
        const added = json.data?.added ?? 0;
        setNotice(
          added > 0
            ? `${added} peserta ditambahkan ke wheel.`
            : 'Semua alumni terverifikasi sudah ada di wheel.',
        );
        setCandidateId('');
        void refreshState();
        void refreshCandidates();
      },
    );
  };

  /** Clear every participant; prizes and winner history stay. */
  const removeAllParticipants = () => {
    if (participants.length === 0) return;
    if (!window.confirm('Hapus semua peserta dari wheel? Riwayat pemenang & hadiah tetap tersimpan.')) return;
    void run(
      () => fetch('/api/admin/wheel/participants', { method: 'DELETE' }),
      (json) => {
        setNotice(`${json.data?.removed ?? 0} peserta dihapus dari wheel.`);
        void refreshState();
        void refreshCandidates();
      },
    );
  };

  const addPrize = () =>
    void run(
      () => fetch('/api/admin/wheel/prizes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: prizeName }),
      }),
      (json) => {
        setPrizeName('');
        const created = (json.data as { id?: string } | undefined)?.id;
        void refreshState().then(() => {
          if (!selectedPrizeId && created) setSelectedPrizeId(created);
        });
      },
    );

  const deletePrize = (id: string) =>
    void run(
      () => fetch(`/api/admin/wheel/prizes/${id}`, { method: 'DELETE' }),
      () => {
        if (selectedPrizeId === id) setSelectedPrizeId('');
        void refreshState();
      },
    );

  const resetWheel = () => {
    if (!window.confirm('Hapus semua pemenang & peserta (data uji coba dikosongkan)? Hadiah tetap tersimpan.')) return;
    void run(
      () => fetch('/api/admin/wheel/reset', { method: 'POST' }),
      () => {
        setAnnouncement(null);
        void refreshState();
        void refreshCandidates();
      },
    );
  };

  async function handleSpin() {
    if (!selectedPrizeId) {
      setError('Pilih hadiah terlebih dahulu');
      return;
    }
    if (participants.length === 0) {
      setError('Wheel kosong — tambahkan peserta terlebih dahulu');
      return;
    }
    setError(null);
    setAnnouncement(null);
    setWinnerIndex(null);
    setBusy(true);
    try {
      const res = await fetch('/api/admin/wheel/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prizeId: selectedPrizeId }),
      });
      const json: ApiResult = await res.json();
      const winner = json.data?.winner;
      const prize = json.data?.prize;
      if (!res.ok || !json.success || !winner || !prize) {
        setError(json.error ?? 'Gagal mengundi');
        return;
      }
      pending.current = { winner, prize };
      const idx = participants.findIndex((p) => p.userId === winner.userId);
      setWinnerIndex(idx >= 0 ? idx : 0);
    } finally {
      setBusy(false);
    }
  }

  const onLanded = useCallback(() => {
    const result = pending.current;
    if (result) {
      setAnnouncement(`${result.winner.userName ?? result.winner.userId} memenangkan ${result.prize.name}!`);
      pending.current = null;
    }
    setWinnerIndex(null);
    void refreshState();
    void refreshCandidates();
  }, [refreshState, refreshCandidates]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      {/* Wheel + draw */}
      <section className="bg-gradient-to-br from-amber-50 via-white to-teal-50 dark:from-gray-800 dark:via-gray-800 dark:to-teal-950/40 border border-amber-200/70 dark:border-gray-700 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">Wheel Undian</h2>
          <span className="badge-teal">{participants.length} peserta</span>
        </div>
        <div className="flex justify-center py-2">
          <div className="w-full">
            <FortuneWheel
              segments={participants.map((p) => p.name ?? p.userId)}
              winnerIndex={winnerIndex}
              onLanded={onLanded}
              maxSizePx={1000}
            />
          </div>
        </div>

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Hadiah untuk undian berikutnya
          <select
            value={selectedPrizeId}
            onChange={(e) => setSelectedPrizeId(e.target.value)}
            disabled={prizes.length === 0}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
          >
            <option value="">— pilih hadiah —</option>
            {prizes.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={handleSpin}
          disabled={busy || spinning || participants.length === 0}
          className="btn-primary w-full inline-flex items-center justify-center gap-2 text-sm px-4 py-3 disabled:opacity-50"
        >
          {spinning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
          {spinning ? 'Mengundi…' : 'Undi Sekarang'}
        </button>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {announcement && (
          <div className="text-center text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 rounded-lg px-3 py-3 text-sm font-bold">
            🎉 {announcement}
          </div>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={resetWheel}
            disabled={busy || spinning}
            className="text-xs text-red-600 dark:text-red-400 hover:underline inline-flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Reset wheel (hapus pemenang & peserta)
          </button>
        </div>
      </section>

      {/* Management — single stacked column so the narrow side panel never
          squeezes the add controls out of their card */}
      <section className="flex flex-col gap-6">
        {/* Participants */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm space-y-3">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">
            Peserta Wheel <span className="text-gray-400 font-normal">({participants.length})</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            <select
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
              className="min-w-0 flex-1 basis-40 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            >
              <option value="">— pilih alumni terverifikasi —</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={addParticipant}
              disabled={busy || spinning || !candidateId}
              className="btn-secondary inline-flex shrink-0 items-center justify-center gap-1 text-sm px-3 py-2 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" /> Tambah
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addAllParticipants}
              disabled={busy || spinning || candidates.length === 0}
              className="btn-secondary inline-flex flex-1 items-center justify-center gap-1 text-sm px-3 py-2 disabled:opacity-50"
              title="Tambahkan semua alumni terverifikasi yang belum ada di wheel"
            >
              <ListPlus className="w-4 h-4" /> Tambah semua ({candidates.length})
            </button>
            <button
              type="button"
              onClick={removeAllParticipants}
              disabled={busy || spinning || participants.length === 0}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              <Trash2 className="w-4 h-4" /> Hapus semua
            </button>
          </div>
          {notice && (
            <p className="text-xs text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 rounded-lg px-3 py-2">
              {notice}
            </p>
          )}
          <ul className="space-y-2 max-h-72 overflow-y-auto">
            {alphabeticalParticipants.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2"
              >
                <span className="min-w-0 truncate text-gray-900 dark:text-gray-100">{p.name ?? p.userId}</span>
                <button
                  type="button"
                  onClick={() => removeParticipant(p.id)}
                  disabled={busy || spinning}
                  className="shrink-0 text-gray-400 hover:text-red-600 disabled:opacity-40"
                  title="Hapus peserta ini"
                  aria-label={`Hapus peserta ${p.name ?? p.userId}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
            {participants.length === 0 && (
              <li className="text-sm text-gray-500 dark:text-gray-400">Belum ada peserta.</li>
            )}
          </ul>
        </div>

        {/* Prizes */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm space-y-3">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">
            Hadiah <span className="text-gray-400 font-normal">({prizes.length})</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            <input
              value={prizeName}
              onChange={(e) => setPrizeName(e.target.value)}
              maxLength={120}
              placeholder="Nama hadiah baru"
              className="min-w-0 flex-1 basis-40 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={addPrize}
              disabled={busy || spinning || prizeName.trim().length === 0}
              className="btn-secondary inline-flex shrink-0 items-center justify-center gap-1 text-sm px-3 py-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Tambah
            </button>
          </div>
          <ul className="space-y-2 max-h-72 overflow-y-auto">
            {prizes.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2"
              >
                <span className="min-w-0 truncate text-gray-900 dark:text-gray-100">
                  {p.name}
                  {p.drawn && <span className="ml-2 text-[10px] text-gray-400">(sudah pernah diundi)</span>}
                </span>
                <button
                  type="button"
                  onClick={() => deletePrize(p.id)}
                  disabled={busy || spinning}
                  className={`shrink-0 ${
                    p.drawn
                      ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                      : 'text-gray-400 hover:text-red-600'
                  }`}
                  title={p.drawn ? 'Sudah dipakai dalam undian — tidak dapat dihapus' : 'Hapus hadiah'}
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
            {prizes.length === 0 && (
              <li className="text-sm text-gray-500 dark:text-gray-400">Belum ada hadiah.</li>
            )}
          </ul>
        </div>

        {/* History */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm space-y-3">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">
            Riwayat Pemenang <span className="text-gray-400 font-normal">({draws.length})</span>
          </h2>
          <ol className="space-y-2 max-h-64 overflow-y-auto">
            {draws.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2"
              >
                <span className="text-gray-900 dark:text-gray-100 truncate">
                  <strong>{d.userName ?? d.userId}</strong> — {d.prizeName}
                </span>
                <time className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                  {new Date(d.drawnAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </time>
              </li>
            ))}
            {draws.length === 0 && (
              <li className="text-sm text-gray-500 dark:text-gray-400">Belum ada undian.</li>
            )}
          </ol>
        </div>
      </section>
    </div>
  );
}
