'use client';

import { useEffect, useRef, useState } from 'react';
import { Gift } from 'lucide-react';

/**
 * Fortune wheel visualization whose segments are participant names
 * (REQ-DW-003). Purely presentational: the server decides the winner; the
 * parent sets `winnerIndex` (index into `segments`) and this wheel spins to
 * land the pointer on it — the result is never chosen here.
 *
 * Labels are rendered radially (reading outward on the right half, inward on
 * the left half) so names stay legible even with a dozen segments. The wheel
 * fills its parent up to `maxSizePx`, so callers only need to constrain the
 * wrapper width. The fixed pointer sits at 3 o'clock (right side) so it never
 * covers the labels along the top arc.
 */

/** Reunion palette shades, each dark enough for white label text. */
const SEGMENT_COLORS = [
  '#2f6d52', '#c0508f', '#2f6fb5', '#b45309',
  '#7a4aa0', '#0f766e', '#be185d', '#1d4ed8',
  '#c2410c', '#6d28d9', '#15803d', '#9f1239',
];

const SPIN_MS = 4200;
const MAX_LABELED_SEGMENTS = 20;
const BULB_COUNT = 18;
/** Pointer angle: 0deg = top, clockwise. 90deg = 3 o'clock (right side). */
const POINTER_ANGLE = 90;

export interface FortuneWheelProps {
  /** Participant names, one per segment, in wheel order. */
  segments: string[];
  /** Segment index the pointer must land on, or null while idle. */
  winnerIndex: number | null;
  /** Called once the spin animation finishes. */
  onLanded?: () => void;
  /** Upper bound for the wheel width in px; it grows with its parent. */
  maxSizePx?: number;
}

function mod360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function buildGradient(count: number, seg: number): string {
  const stops: string[] = [];
  for (let i = 0; i < count; i++) {
    const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
    stops.push(`${color} ${i * seg}deg ${(i + 1) * seg}deg`);
  }
  return `conic-gradient(${stops.join(', ')})`;
}

export function FortuneWheel({ segments, winnerIndex, onLanded, maxSizePx }: FortuneWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [boxSize, setBoxSize] = useState(420);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const count = segments.length;
  const seg = count > 0 ? 360 / count : 360;

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => {
      if (el.clientWidth > 0) setBoxSize(el.clientWidth);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (winnerIndex === null || count === 0) return;
    const target = Math.max(0, Math.min(winnerIndex, count - 1));
    // conic-gradient starts at 0deg (top) and runs clockwise. A segment center
    // at `center` appears at `center + rotation`; the pointer sits at
    // POINTER_ANGLE, so rotation ≡ POINTER_ANGLE - center (mod 360).
    const center = (target + 0.5) * seg;
    const jitter = (Math.random() - 0.5) * Math.max(seg - 8, 0);
    const base = mod360(POINTER_ANGLE - mod360(center + jitter));
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

  const rim = Math.max(9, Math.round(boxSize * 0.04));
  const disc = Math.max(1, boxSize - rim * 2);
  const gradient = count > 0
    ? buildGradient(count, seg)
    : 'repeating-conic-gradient(#e7e5e4 0 15deg, #f5f5f4 15deg 30deg)';

  const labelFont = Math.max(
    11,
    Math.round(Math.min(disc * 0.036, 26) * (count > 12 ? 0.86 : 1)),
  );
  const labelThickness = Math.round(labelFont * 1.45);
  // Labels live in the band between the center hub and the rim, never crossing
  // the hub (which would paint text over the opposite segment).
  const labelInner = disc * 0.14;
  const labelOuter = disc * 0.45;
  const labelLength = Math.round(labelOuter - labelInner);
  const labelCenter = (labelInner + labelOuter) / 2;
  const showLabels = count > 0 && count <= MAX_LABELED_SEGMENTS;

  const hub = Math.max(54, Math.round(disc * 0.19));
  const hubFont = Math.max(8, Math.round(Math.min(hub * 0.115, 12)));
  const bulb = Math.max(3, Math.min(8, Math.round(boxSize * 0.013)));
  const bulbRadius = boxSize / 2 - rim / 2;
  const pointerWidth = Math.max(18, Math.round(boxSize * 0.06));
  const pointerHeight = Math.round(pointerWidth * 1.45);

  return (
    <div
      ref={boxRef}
      role="img"
      aria-label={count > 0 ? `Wheel undian dengan ${count} peserta` : 'Wheel undian kosong'}
      className="relative aspect-square w-full shrink-0 select-none"
      style={{ maxWidth: maxSizePx ? `${maxSizePx}px` : undefined }}
    >
      {/* Soft glow so the wheel lifts off the card */}
      <div aria-hidden className="absolute -inset-3 rounded-full bg-teal-400/15 blur-2xl" />

      {/* Rounded gold rim + rotating disc */}
      <div
        className="absolute inset-0 rounded-full shadow-[0_25px_60px_-22px_rgba(15,118,110,0.75)]"
        style={{
          padding: rim,
          background: 'linear-gradient(140deg, #fde68a 0%, #f59e0b 38%, #b45309 76%, #fbbf24 100%)',
        }}
      >
        <div
          className="relative h-full w-full overflow-hidden rounded-full"
          style={{
            background: gradient,
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.84, 0.1, 1)` : 'none',
            boxShadow: 'inset 0 0 0 3px rgba(255, 255, 255, 0.55)',
          }}
        >
          {showLabels && segments.map((name, i) => {
            const theta = (i + 0.5) * seg;
            // Left half is flipped so no label ends up upside down.
            const flip = theta > 180;
            return (
              <div
                key={`${i}-${name}`}
                className="absolute inset-0"
                style={{ transform: `rotate(${theta}deg)` }}
              >
                <span
                  className="absolute left-1/2 top-1/2 flex items-center justify-center overflow-hidden font-bold text-white"
                  style={{
                    width: labelLength,
                    height: labelThickness,
                    transform: `translate(-50%, -50%) translateY(-${labelCenter}px) rotate(${flip ? 90 : -90}deg)`,
                    fontSize: labelFont,
                    lineHeight: 1.1,
                    padding: '0 6px',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.4)',
                  }}
                  title={name}
                >
                  <span className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-center">
                    {(name ?? '—').trim() || '—'}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rim bulbs */}
      {Array.from({ length: BULB_COUNT }).map((_, i) => (
        <span
          key={`bulb-${i}`}
          aria-hidden
          className="absolute left-1/2 top-1/2 rounded-full bg-amber-50 shadow-[0_0_7px_rgba(253,230,138,0.95)]"
          style={{
            width: bulb,
            height: bulb,
            transform: `translate(-50%, -50%) rotate(${(360 / BULB_COUNT) * i}deg) translateY(-${bulbRadius}px)`,
          }}
        />
      ))}

      {/* Pointer — right side (3 o'clock), pointing into the wheel */}
      <div
        aria-hidden
        className="absolute right-0 top-1/2 z-20"
        style={{
          width: pointerWidth,
          height: pointerHeight,
          transform: 'translate(18%, -50%)',
          clipPath: 'polygon(0% 50%, 100% 0%, 100% 100%)',
          background: 'linear-gradient(200deg, #fef3c7 0%, #f59e0b 55%, #b45309 100%)',
          filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))',
        }}
      />

      {/* Center hub */}
      <div
        className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-4 border-white/85 bg-gradient-to-br from-teal-700 to-teal-900 shadow-[0_8px_18px_rgba(0,0,0,0.32)]"
        style={{ width: hub, height: hub }}
        aria-hidden
      >
        <Gift className="text-amber-300" style={{ width: hub * 0.3, height: hub * 0.3 }} />
        <span
          className="font-display font-bold tracking-wider text-white"
          style={{ fontSize: hubFont, marginTop: 2 }}
        >
          DOORPRIZE
        </span>
      </div>
    </div>
  );
}
