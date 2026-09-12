'use client';

import React from 'react';
import { useParallax } from '@/components/useParallax';

/**
 * Depth layers for the homepage hero. Renders an absolutely-positioned,
 * pointer-events-none backdrop (oversized year watermark, pin-color orbs,
 * grain) whose layers drift at different rates with scroll and pointer
 * movement, plus a static foreground slot for page content.
 *
 * Transforms are translate3d-only (no layout shift) and collapse to a static
 * composition when `useParallax` reports inactive (reduced motion, small
 * viewport, or before hydration).
 */
export function ParallaxHero({ children }: { children: React.ReactNode }) {
  const { ref, progress, pointer, active } = useParallax();

  const motion = active ? 1 : 0;
  const px = pointer.x;
  const py = pointer.y;

  // Each layer gets a scroll drift (px per unit progress) and a pointer
  // strength (px at full deflection). Higher strength = visually nearer.
  const layers = [
    {
      key: 'watermark',
      drift: 48,
      pointerStrength: 10,
      className:
        'absolute -right-8 -top-20 sm:-right-16 sm:top-0 select-none font-display italic font-black leading-none text-teal-900/[0.05] dark:text-teal-100/[0.04] text-[18rem] sm:text-[26rem]',
      content: '25',
    },
    {
      key: 'orb-teal',
      drift: 110,
      pointerStrength: 34,
      className:
        'absolute -left-24 top-10 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-teal-300/30 dark:bg-teal-500/10 blur-3xl',
      content: null,
    },
    {
      key: 'orb-magenta',
      drift: 85,
      pointerStrength: 26,
      className:
        'absolute right-1/4 top-1/3 h-64 w-64 rounded-full bg-magenta-300/25 dark:bg-magenta-500/10 blur-3xl',
      content: null,
    },
    {
      key: 'orb-orange',
      drift: 140,
      pointerStrength: 44,
      className:
        'absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-orange-300/30 dark:bg-orange-500/10 blur-3xl',
      content: null,
    },
  ];

  return (
    <>
      {/* Backdrop depth layers — decorative only */}
      <div ref={ref} aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
        {layers.map((layer) => (
          <div
            key={layer.key}
            className={layer.className}
            style={{
              transform: `translate3d(${(px * layer.pointerStrength * motion).toFixed(2)}px, ${(
                progress * layer.drift * motion +
                py * layer.pointerStrength * 0.6 * motion
              ).toFixed(2)}px, 0)`,
              willChange: active ? 'transform' : undefined,
            }}
          >
            {layer.content}
          </div>
        ))}

        {/* Grain texture — static by design; motion would read as noise flicker */}
        <div className="grain-overlay absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" />
      </div>

      {/* Foreground — intentionally static for readability */}
      <div className="relative">{children}</div>
    </>
  );
}
