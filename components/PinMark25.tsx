import React from 'react';
import Image from 'next/image';

interface PinMark25Props {
  className?: string;
}

/**
 * Pin-style commemorative "25" badge.
 *
 * Renders the traced pin artwork (`public/25.svg`) through next/image so
 * the optimizer rasterizes the 280KB vector to small per-size bitmaps
 * (cached per deploy) instead of shipping the full SVG in the HTML.
 * The artwork sits inset inside a silver gradient shell that recreates
 * the pin's metallic rim.
 * Pure server component: no hooks, no client JS.
 */
export function PinMark25({ className = '' }: PinMark25Props) {
  return (
    <div
      role="img"
      aria-label="Pin Reuni 25 Tahun SMA Negeri 14 Bandung"
      className={`relative aspect-square overflow-hidden rounded-[24%] bg-gradient-to-br from-silver-100 via-silver-300 to-silver-400 dark:from-silver-500 dark:via-silver-600 dark:to-silver-700 shadow-sm ${className}`.trim()}
    >
      <Image
        src="/25.svg"
        alt=""
        aria-hidden="true"
        width={434}
        height={438}
        sizes="(min-width: 640px) 112px, 96px"
        className="absolute inset-[7%] h-[86%] w-[86%] rounded-[20%]"
      />
    </div>
  );
}
