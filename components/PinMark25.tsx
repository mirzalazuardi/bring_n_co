import React from 'react';

interface PinMark25Props {
  className?: string;
}

/**
 * Pin-style color-blocked "25" badge — a CSS/SVG interpretation of the
 * commemorative reunion pin (mint field, silver ring, magenta/yellow/
 * orange/blue/purple blocks).
 *
 * Pure server component: no hooks, no client JS. The numeral is SVG text
 * on a 0-100 viewBox, so the whole badge scales with any `className` size
 * (e.g. h-24 w-24) while staying crisp.
 */
export function PinMark25({ className = '' }: PinMark25Props) {
  return (
    <div
      role="img"
      aria-label="Pin Reuni 25 Tahun SMA Negeri 14 Bandung"
      className={`relative aspect-square ${className}`.trim()}
    >
      {/* Silver ring */}
      <div className="absolute inset-0 rounded-[24%] bg-gradient-to-br from-silver-100 via-silver-300 to-silver-400 dark:from-silver-500 dark:via-silver-600 dark:to-silver-700 shadow-sm" />

      {/* Mint field with clipped color blocks */}
      <div className="absolute inset-[5.5%] overflow-hidden rounded-[20%] bg-teal-300 dark:bg-teal-400">
        {/* Magenta — top-left */}
        <div className="absolute left-0 top-0 h-[26%] w-[34%] rounded-br-[45%] bg-magenta-500" />
        {/* Yellow — top-right */}
        <div className="absolute right-0 top-[9%] h-[24%] w-[30%] rounded-bl-[45%] bg-yellow-400" />
        {/* Orange — mid-left */}
        <div className="absolute left-0 top-[36%] h-[24%] w-[26%] rounded-r-[45%] bg-orange-400" />
        {/* Purple — bottom-right */}
        <div className="absolute bottom-0 right-0 h-[27%] w-[36%] rounded-tl-[45%] bg-purple-500" />
        {/* Blue — right-of-center chip, peeking beside the numeral like the pin's counter */}
        <div className="absolute left-[58%] top-[44%] h-[19%] w-[30%] -rotate-6 rounded-[35%] bg-blue-500" />

        {/* Numeral — SVG text so it scales with the badge, set in the display face */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <text
            x="47"
            y="53"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="52"
            fontWeight="700"
            letterSpacing="-2"
            fill="currentColor"
            className="text-teal-900/85"
            style={{ fontFamily: 'var(--font-display), sans-serif' }}
          >
            25
          </text>
        </svg>
      </div>
    </div>
  );
}
