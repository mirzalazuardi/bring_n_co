'use client';

import { useEffect, useRef, useState } from 'react';

export interface ParallaxState {
  /** 0..1 — how far the tracked element has scrolled out of view (0 = top of page). */
  progress: number;
  /** Pointer offset from viewport center, normalized to -0.5..0.5. Zero on touch devices. */
  pointer: { x: number; y: number };
  /** False when the user prefers reduced motion or the viewport is below `sm` (640px). */
  active: boolean;
}

interface UseParallaxReturn extends ParallaxState {
  ref: React.RefObject<HTMLDivElement>;
}

const SM_BREAKPOINT = 640;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const FINE_POINTER_QUERY = '(pointer: fine)';

/**
 * Zero-dependency parallax driver. Attaches passive `scroll` + `pointermove`
 * listeners that mark pending flags and drain them in a single
 * requestAnimationFrame — at most one React state update per frame, so
 * scrolling never causes more than one render per frame.
 *
 * Motion is disabled for `prefers-reduced-motion: reduce` users and for
 * viewports narrower than `sm`; pointer tracking additionally requires a
 * fine pointer (mouse/trackpad).
 */
export function useParallax(): UseParallaxReturn {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const [finePointer, setFinePointer] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const motionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const pointerQuery = window.matchMedia(FINE_POINTER_QUERY);

    let rafId = 0;
    let scrollPending = false;
    let pointerEvent: PointerEvent | null = null;

    const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

    const drain = () => {
      rafId = 0;
      if (scrollPending) {
        scrollPending = false;
        const rect = node.getBoundingClientRect();
        setProgress(clamp01(-rect.top / Math.max(rect.height, 1)));
      }
      if (pointerEvent) {
        const event = pointerEvent;
        pointerEvent = null;
        setPointer({
          x: event.clientX / window.innerWidth - 0.5,
          y: event.clientY / window.innerHeight - 0.5,
        });
      }
    };

    const schedule = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(drain);
    };

    const onScroll = () => {
      scrollPending = true;
      schedule();
    };

    const onPointerMove = (event: PointerEvent) => {
      pointerEvent = event;
      schedule();
    };

    const evaluate = () => {
      const motionOK = !motionQuery.matches;
      const viewportOK = window.innerWidth >= SM_BREAKPOINT;
      setActive(motionOK && viewportOK);
      setFinePointer(pointerQuery.matches);
    };

    evaluate();
    // Prime progress before first paint of the effect.
    const rect = node.getBoundingClientRect();
    setProgress(clamp01(-rect.top / Math.max(rect.height, 1)));

    motionQuery.addEventListener('change', evaluate);
    pointerQuery.addEventListener('change', evaluate);
    window.addEventListener('resize', evaluate);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    return () => {
      motionQuery.removeEventListener('change', evaluate);
      pointerQuery.removeEventListener('change', evaluate);
      window.removeEventListener('resize', evaluate);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointerMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return {
    ref,
    progress,
    pointer: active && finePointer ? pointer : { x: 0, y: 0 },
    active,
  };
}
