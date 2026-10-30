'use client';

import { useCallback, useEffect, useState } from 'react';
import { FortuneWheel } from '@/components/FortuneWheel';
import { Trophy } from 'lucide-react';

/**
 * Projector page for the doorprize draw (REQ-DW-005). Read-only, no
 * authentication, no interactive controls; kept in sync with the admin
 * draw by polling the public API every ~3 s and refetching when the tab
 * becomes visible again.
 */

interface DisplayState {
  participants: string[];
  latest: { userName: string | null; prizeName: string; drawnAt: string } | null;
  history: { userName: string | null; prizeName: string; drawnAt: string }[];
}

export function DoorprizeDisplay({ initialState }: { initialState: DisplayState }) {
  const [state, setState] = useState(initialState);
  const [flash, setFlash] = useState(false); // brief "mengundi…" shimmer between polls
  const [lastSeenDrawId, setLastSeenDrawId] = useState<string | null>(
    initialState.latest?.drawnAt ?? null,
  );

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/display/doorprize');
      const json = await res.json();
      if (res.ok && json.success) {
        const next = json.data as DisplayState;
        const latestAt = next.latest?.drawnAt ?? null;
        setState(next);
        if (latestAt && latestAt !== lastSeenDrawId) {
          setLastSeenDrawId(latestAt);
          setFlash(true);
          setTimeout(() => setFlash(false), 4000);
        }
      }
    } catch {
      // Transient network error — the next tick will retry silently.
    }
    // lastSeenDrawId stays in the closure so repeated polls diff correctly
  }, [lastSeenDrawId]);

  useEffect(() => {
    const interval = setInterval(poll, 3000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void poll();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [poll]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-teal-900 via-teal-950 to-gray-950 text-white flex flex-col items-center px-4 py-8 gap-6 overflow-hidden">
      <header className="text-center">
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
          Doorprize Reuni Silver
        </h1>
        <p className="text-teal-300 mt-1 text-sm sm:text-base">
          Peserta di wheel: <strong>{state.participants.length}</strong>
        </p>
      </header>

      <FortuneWheel segments={state.participants} winnerIndex={null} sizePx={Math.min(460, (typeof window !== 'undefined' ? Math.min(window.innerWidth - 64, 460) : 380))} />

      {state.latest ? (
        <section
          className={`text-center rounded-3xl border px-8 py-6 max-w-2xl transition ${
            flash
              ? 'animate-pulse bg-teal-500/30 border-teal-300'
              : 'bg-white/5 border-teal-700'
          }`}
        >
          <p className="text-teal-300 text-sm uppercase tracking-widest flex items-center justify-center gap-2">
            <Trophy className="w-4 h-4" /> Pemenang terakhir
          </p>
          <p className="text-4xl sm:text-5xl font-extrabold mt-2">
            {state.latest.userName ?? 'Pemenang'}
          </p>
          <p className="text-xl text-teal-200 mt-1">mendapatkan {state.latest.prizeName}</p>
        </section>
      ) : (
        <p className="text-teal-300/70 text-lg">Menunggu undian pertama…</p>
      )}

      {state.history.length > 1 && (
        <section className="w-full max-w-2xl">
          <h2 className="text-center text-teal-300 text-xs uppercase tracking-widest mb-2">
            Riwayat
          </h2>
          <ul className="flex flex-wrap justify-center gap-2 max-h-28 overflow-hidden">
            {state.history.map((h, i) => (
              <li
                key={`${h.drawnAt}-${i}`}
                className="text-xs bg-white/5 border border-white/10 rounded-full px-3 py-1"
              >
                {h.userName} — {h.prizeName}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
