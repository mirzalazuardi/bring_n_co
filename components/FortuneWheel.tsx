'use client';

import { useEffect, useState } from 'react';

/**
 * Fortune wheel visualization whose segments are participant names
 * (REQ-DW-003). Purely presentational: the server decides the winner; the
 * parent sets `winnerIndex` (index into `segments`) and this wheel spins to
 * land the pointer on it — the result is never chosen here.
 */

const SEGMENT_COLORS = [
  '#0d9488', '#f59e0b', '#6366f1', '#ec4899', '#22c55e', '#f97316',
  '#3b82f6', '#a855f7', '#ef4444', '#14b8a6', '#eab308', '#8b5cf6',
];

const SPIN_MS = 4200;

export interface FortuneWheelProps {
  /** Participant names, one per segment, in wheel order. */
  segments: string[];
  /** Segment index the pointer must land on, or null while idle. */
  winnerIndex: number | null;
  /** Called once the spin animation finishes. */
  onLanded?: () => void;
  sizePx?: number;
}

function mod360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function FortuneWheel({ segments, winnerIndex, onLanded, sizePx = 320 }: FortuneWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const count = segments.length;
  const seg = count > 0 ? 360 / count : 360;

  useEffect(() => {
    if (winnerIndex === null || count === 0) return;
    const target = Math.max(0, Math.min(winnerIndex, count - 1));
    // conic-gradient from 0deg = pointer at top, proceeding clockwise.
    // Land segment target's center on the pointer: R ≡ -center (mod 360).
    const center = (target + 0.5) * seg;
    const jitter = (Math.random() - 0.5) * Math.max(seg - 8, 0);
    const base = mod360(-mod360(center + jitter));
    const delta = mod360(base - mod360(rotation)) + 360 * 5;
    setRotation((prev) => prev + delta);
    setSpinning(true);

    const timer = setTimeout(() => {
      setSpinning(false);
      onLanded?.();
    }, SPIN_MS);
    return () => clearTimeout(timer);
    // rotation must stay current for the next spin; onLanded/id stay stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winnerIndex]);

  const stops: string[] = [];
  for (let i = 0; i < count; i++) {
    const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
    stops.push(`${color} ${i * seg}deg ${(i + 1) * seg}deg`);
  }
  const gradient = `conic-gradient(${stops.join(', ')})`;
  const showLabels = count > 0 && count <= 32 && seg >= 15;

  return (
    <div className="relative shrink-0" style={{ width: sizePx, height: sizePx }}>
      {/* Pointer */}
      <div
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 -top-2 z-20 w-0 h-0"
        style={{
          borderLeft: '12px solid transparent',
          borderRight: '12px solid transparent',
          borderTop: '22px solid #0f766e',
        }}
      />
      <div
        className="w-full h-full rounded-full border-8 border-teal-700 shadow-xl overflow-hidden"
        style={{
          background: count > 0 ? gradient : 'repeating-conic-gradient(#e5e7eb 0 15deg, #f3f4f6 15deg 30deg)',
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.84, 0.1, 1)` : 'none',
        }}
      >
        {count > 0 && segments.map((name, i) => (
          <div
            key={`${i}-${name}`}
            className="absolute inset-0 flex justify-center"
            style={{ transform: `rotate(${(i + 0.5) * seg}deg)` }}
          >
            <span
              className="mt-[7%] text-[10px] font-bold text-white"
              style={{ visibility: showLabels ? 'visible' : 'hidden' }}
            >
              {(name ?? '—').slice(0, 14)}
            </span>
          </div>
        ))}
      </div>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-16 h-16 rounded-full bg-white dark:bg-gray-100 border-4 border-teal-700 shadow flex items-center justify-center">
        <span className="text-[10px] font-bold text-teal-700 text-center leading-tight">DOOR<br />PRIZE</span>
      </div>
    </div>
  );
}
