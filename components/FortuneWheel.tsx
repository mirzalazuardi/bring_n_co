'use client';

import { useEffect, useRef, useState } from 'react';
import { Gift } from 'lucide-react';

/**
 * Fortune wheel visualization whose segments are participant names
 * (REQ-DW-003). Purely presentational: the server decides the winner; the
 * parent sets `winnerIndex` (index into `segments`) and this wheel spins to
 * land the pointer on it — the result is never chosen here.
 *
 * After landing, the wheel zooms in on the winning slice and holds it for a
 * moment before fading back, so the winner's name is still on the wheel when
 * it is announced. `onLanded` therefore fires only after that zoom, which is
 * what lets the parent remove the winner from the wheel afterwards.
 *
 * Labels are rendered radially (reading outward on the right half, inward on
 * the left half). Their band and font scale with the segment count, so a full
 * class list (145 names) still fits: each slice is only a few degrees wide, so
 * labels move outward and shrink to the slice arc instead of overlapping. The
 * wheel fills its parent up to `maxSizePx`, so callers only need to constrain
 * the wrapper width. The fixed pointer sits at 3 o'clock (right side) so it
 * never covers the labels along the top arc.
 */

interface WheelTone {
  /** Slice fill. */
  fill: string;
  /** Text colour that stays legible on `fill`. */
  text: string;
}

/**
 * Reunion palette: deep blue (#083D69) and off-white (#E8ECEF/#FFFFFF) carry
 * the design; teal, green, yellow, purple and orange are the festive accents.
 * The palette mixes very light and very dark fills, so each tone carries its
 * own label colour — white only on the deep blue and purple slices, deep navy
 * on everything lighter. Fills are ordered so light and dark slices alternate
 * (including the wrap from the last slice back to the first).
 */
const SEGMENT_TONES: WheelTone[] = [
  { fill: '#083D69', text: '#FFFFFF' }, // deep blue
  { fill: '#E8ECEF', text: '#083D69' }, // off-white
  { fill: '#00A99D', text: '#05243C' }, // teal
  { fill: '#FFFFFF', text: '#083D69' }, // white
  { fill: '#7C2583', text: '#FFFFFF' }, // purple
  { fill: '#FFCC00', text: '#083D69' }, // yellow
  { fill: '#43B549', text: '#05243C' }, // green
  { fill: '#FF6600', text: '#05243C' }, // orange
];

/** Each spin runs for a random duration in this range (ms). */
const SPIN_MIN_MS = 10_000;
const SPIN_MAX_MS = 18_000;
/** Preferred label height in px; narrower slices scale down from here. */
const LABEL_TARGET_FONT = 13;
const BULB_COUNT = 18;
/** Pointer angle: 0deg = top, clockwise. 90deg = 3 o'clock (right side). */
const POINTER_ANGLE = 90;
/** Post-landing zoom: grow the winning slice, hold it, then ease back. */
const ZOOM_SCALE = 1.3;
const ZOOM_IN_MS = 750;
const ZOOM_HOLD_MS = 1500;
const ZOOM_OUT_MS = 450;

export interface FortuneWheelProps {
  /** Participant names, one per segment, in wheel order. */
  segments: string[];
  /** Segment index the pointer must land on, or null while idle. */
  winnerIndex: number | null;
  /** Called once the spin animation and the winner zoom finish. */
  onLanded?: () => void;
  /** Upper bound for the wheel width in px; it grows with its parent. */
  maxSizePx?: number;
}

function mod360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function toneFor(index: number): WheelTone {
  const tone = SEGMENT_TONES[index % SEGMENT_TONES.length];
  return tone ?? SEGMENT_TONES[0];
}

/** Keeps the name readable on both dark and light fills. */
function labelShadow(textColor: string): string {
  return textColor === '#FFFFFF'
    ? '0 1px 2px rgba(0, 0, 0, 0.5)'
    : '0 1px 0 rgba(255, 255, 255, 0.65)';
}

function buildGradient(count: number, seg: number): string {
  const stops: string[] = [];
  for (let i = 0; i < count; i++) {
    const color = toneFor(i).fill;
    stops.push(`${color} ${i * seg}deg ${(i + 1) * seg}deg`);
  }
  return `conic-gradient(${stops.join(', ')})`;
}

export function FortuneWheel({ segments, winnerIndex, onLanded, maxSizePx }: FortuneWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [spinMs, setSpinMs] = useState(SPIN_MIN_MS);
  const [zoom, setZoom] = useState(false);
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
    // Random 10–18s suspense window; extra turns for longer spins keep the
    // wheel from crawling just because the draw takes longer.
    const duration = SPIN_MIN_MS + Math.random() * (SPIN_MAX_MS - SPIN_MIN_MS);
    const turns = Math.max(4, Math.round(duration / 2500));
    const delta = mod360(base - mod360(rotation)) + 360 * turns;
    setSpinMs(duration);
    setRotation((prev) => prev + delta);
    setSpinning(true);

    const timers: ReturnType<typeof setTimeout>[] = [];
    const after = (ms: number, fn: () => void) => {
      timers.push(setTimeout(fn, ms));
    };

    // Spin → land on the winner → zoom in on that slice → hold → zoom back out
    // → only then tell the parent. The parent removes the winner from the wheel
    // on `onLanded`, so the name is still on screen (and enlarged) until the
    // zoom has played out.
    after(duration, () => {
      setSpinning(false);
      setZoom(true);
      after(ZOOM_IN_MS + ZOOM_HOLD_MS, () => {
        setZoom(false);
        after(ZOOM_OUT_MS, () => onLanded?.());
      });
    });

    return () => timers.forEach(clearTimeout);
    // rotation must stay current for the next spin; onLanded/id stay stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winnerIndex]);

  const rim = Math.max(9, Math.round(boxSize * 0.04));
  const disc = Math.max(1, boxSize - rim * 2);
  const radius = disc / 2;
  const gradient = count > 0
    ? buildGradient(count, seg)
    : 'repeating-conic-gradient(#e8ecef 0 15deg, #ffffff 15deg 30deg)';

  const hub = Math.max(48, Math.min(Math.round(disc * 0.19), Math.round(radius * 0.44)));
  const hubRadius = hub / 2;
  const hubFont = Math.max(8, Math.round(Math.min(hub * 0.115, 12)));

  // Radial labels: a name's height is limited by the arc width of its slice,
  // which shrinks as the segment count grows. With many segments the band
  // therefore starts further out (where the arc is widest) and the font is
  // capped by that arc, keeping every name inside its own slice. Labels never
  // cross the hub, which would paint text over the opposite segment.
  const countForGeometry = Math.max(count, 1);
  const arcWidth = (r: number) => (2 * Math.PI * r) / countForGeometry;
  const idealInner = (countForGeometry * LABEL_TARGET_FONT) / (2 * Math.PI * 0.82);
  const labelInner = Math.min(
    Math.max(hubRadius + 12, radius * 0.26, idealInner),
    radius * 0.66,
  );
  const labelOuter = radius * 0.97;
  const labelArc = arcWidth(labelInner);
  const labelFont = Math.max(4, Math.min(labelArc * 0.78, LABEL_TARGET_FONT + 5, disc * 0.05));
  const labelThickness = Math.max(4, Math.min(labelFont * 1.4, labelArc - 1));
  const labelLength = Math.max(24, Math.round(labelOuter - labelInner));
  const labelCenter = (labelInner + labelOuter) / 2;
  const labelPadding = Math.max(2, Math.round(labelFont * 0.35));
  const showLabels = count > 0;
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
      style={{
        maxWidth: maxSizePx ? `${maxSizePx}px` : undefined,
        // Zoom anchored on the pointer (3 o'clock): the winning slice stays
        // under the pointer and grows while the rest of the wheel spreads left.
        transform: `scale(${zoom ? ZOOM_SCALE : 1})`,
        transformOrigin: '100% 50%',
        transition: `transform ${zoom ? ZOOM_IN_MS : ZOOM_OUT_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        zIndex: zoom ? 30 : undefined,
        willChange: 'transform',
      }}
    >
      {/* Soft teal glow so the wheel lifts off the card, brighter on the zoom */}
      <div
        aria-hidden
        className="absolute -inset-3 rounded-full blur-2xl transition-opacity duration-500"
        style={{
          background: 'radial-gradient(circle, rgba(0, 169, 157, 0.4), transparent 70%)',
          opacity: zoom ? 1 : 0.55,
        }}
      />

      {/* Rounded deep-blue rim + rotating disc */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          padding: rim,
          background: 'linear-gradient(140deg, #0b5c93 0%, #083d69 40%, #042743 78%, #0a4f80 100%)',
          boxShadow: '0 25px 60px -22px rgba(8, 61, 105, 0.85)',
        }}
      >
        <div
          className="relative h-full w-full overflow-hidden rounded-full"
          style={{
            background: gradient,
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? `transform ${spinMs}ms cubic-bezier(0.12, 0.84, 0.1, 1)` : 'none',
            boxShadow: 'inset 0 0 0 3px rgba(232, 236, 239, 0.8)',
          }}
        >
          {showLabels && segments.map((name, i) => {
            const theta = (i + 0.5) * seg;
            // Flip against the *screen* angle (segment angle + wheel rotation),
            // not the wheel frame: the pointer sits at 3 o'clock, so the landed
            // segment must read horizontally even after a 180deg-ish spin.
            const flip = mod360(theta + rotation) > 180;
            const tone = toneFor(i);
            return (
              <div
                key={`${i}-${name}`}
                className="absolute inset-0"
                style={{ transform: `rotate(${theta}deg)` }}
              >
                <span
                  className="absolute left-1/2 top-1/2 flex items-center justify-center overflow-hidden font-bold"
                  style={{
                    width: labelLength,
                    height: labelThickness,
                    transform: `translate(-50%, -50%) translateY(-${labelCenter}px) rotate(${flip ? 90 : -90}deg)`,
                    fontSize: labelFont,
                    lineHeight: 1.1,
                    padding: `0 ${labelPadding}px`,
                    color: tone.text,
                    textShadow: labelShadow(tone.text),
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

      {/* Rim bulbs — off-white against the deep-blue rim */}
      {Array.from({ length: BULB_COUNT }).map((_, i) => (
        <span
          key={`bulb-${i}`}
          aria-hidden
          className="absolute left-1/2 top-1/2 rounded-full bg-[#E8ECEF] shadow-[0_0_7px_rgba(232,236,239,0.95)]"
          style={{
            width: bulb,
            height: bulb,
            transform: `translate(-50%, -50%) rotate(${(360 / BULB_COUNT) * i}deg) translateY(-${bulbRadius}px)`,
          }}
        />
      ))}

      {/* Pointer — right side (3 o'clock), off-white with a deep-blue halo so it
          stays visible over both the white and the deep-blue slices */}
      <div
        aria-hidden
        className="absolute right-0 top-1/2 z-20"
        style={{
          width: pointerWidth,
          height: pointerHeight,
          transform: 'translate(18%, -50%)',
          clipPath: 'polygon(0% 50%, 100% 0%, 100% 100%)',
          background: 'linear-gradient(200deg, #ffffff 0%, #e8ecef 55%, #c6d2da 100%)',
          filter:
            'drop-shadow(0 0 2px rgba(8, 61, 105, 0.95)) drop-shadow(0 4px 6px rgba(0, 0, 0, 0.32))',
        }}
      />

      {/* Center hub — deep blue with the festive yellow accent */}
      <div
        className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-4 border-[#E8ECEF] bg-gradient-to-br from-[#0b5c93] to-[#042743] shadow-[0_8px_18px_rgba(4,39,67,0.45)]"
        style={{ width: hub, height: hub }}
        aria-hidden
      >
        <Gift className="text-[#FFCC00]" style={{ width: hub * 0.3, height: hub * 0.3 }} />
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
