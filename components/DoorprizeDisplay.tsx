'use client';

import { useCallback, useEffect, useState } from 'react';
import { FortuneWheel } from '@/components/FortuneWheel';
import { Trophy, Users } from 'lucide-react';

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
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-teal-950 via-teal-900 to-stone-950 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            'radial-gradient(circle at 18% 12%, rgba(245,158,11,0.20), transparent 55%), radial-gradient(circle at 85% 85%, rgba(200,90,154,0.20), transparent 55%)',
        }}
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1700px] flex-col items-center justify-center gap-8 px-5 py-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)] lg:gap-12 lg:px-10">
        {/* Wheel — grows with the viewport, capped so the side panel always fits */}
        <section className="order-2 flex w-full justify-center lg:order-1">
          <div className="w-full max-w-[min(88vw,72vh,900px)]">
            <FortuneWheel segments={state.participants} winnerIndex={null} />
          </div>
        </section>

        <aside className="order-1 w-full space-y-5 text-center lg:order-2 lg:text-left">
          <header>
            <p className="text-[0.7rem] uppercase tracking-[0.4em] text-amber-300">
              Doorprize
            </p>
            <h1 className="font-display mt-1 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Reuni Silver
            </h1>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-teal-400/40 bg-teal-400/10 px-3 py-1 text-sm text-teal-100">
              <Users className="h-4 w-4 text-teal-300" />
              <strong className="font-semibold text-white">{state.participants.length}</strong>
              peserta di wheel
            </p>
          </header>

          {state.latest ? (
            <section
              className={`rounded-3xl border px-6 py-6 shadow-xl transition ${
                flash
                  ? 'animate-pulse border-amber-300 bg-amber-400/20'
                  : 'border-teal-600/60 bg-white/5'
              }`}
            >
              <p className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.3em] text-amber-300 lg:justify-start">
                <Trophy className="h-4 w-4" /> Pemenang terakhir
              </p>
              <p className="mt-2 text-4xl font-extrabold leading-tight sm:text-5xl">
                {state.latest.userName ?? 'Pemenang'}
              </p>
              <p className="mt-1 text-lg text-teal-200">
                mendapatkan <span className="font-semibold text-white">{state.latest.prizeName}</span>
              </p>
            </section>
          ) : (
            <p className="rounded-3xl border border-dashed border-teal-600/60 bg-white/5 px-6 py-6 text-lg text-teal-200/80">
              Menunggu undian pertama…
            </p>
          )}

          {state.history.length > 1 && (
            <section>
              <h2 className="text-center text-[0.7rem] uppercase tracking-[0.3em] text-teal-300 lg:text-left">
                Riwayat
              </h2>
              <ul className="mt-2 flex max-h-40 flex-wrap justify-center gap-2 overflow-hidden lg:justify-start">
                {state.history.map((h, i) => (
                  <li
                    key={`${h.drawnAt}-${i}`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-teal-50"
                  >
                    {h.userName} — {h.prizeName}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
