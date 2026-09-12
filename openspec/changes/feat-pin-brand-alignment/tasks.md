# Tasks: Pin Brand Alignment (Space Grotesk + Color-Blocked 25 + Mint-Forward Surfaces)

**Complexity tier: MID** (per proposal.md)

> **Execution amendment:** vitest is node-only (no DOM) per approved amendment in feat-elevated-homepage; PinMark25 is a pure server component verified via lint + build + HTML smoke.

---

## Tasks

- [x] [MID] Swap display font to Space Grotesk
  - File: `app/layout.tsx`
  - Change: replace `Playfair_Display` import and instantiation with `Space_Grotesk({ subsets: ['latin'], variable: '--font-display', display: 'swap' })`; keep the `--font-display` variable name and `display.variable` on `<html>` unchanged
  - Context: token pipeline from feat-elevated-homepage T1; `tailwind.config.ts` `fontFamily.display` already resolves `var(--font-display)` — no config change needed
  - Verify: `npm run lint && npm run build`
  - Expected: headings render in Space Grotesk on all pages; build green; no variable-name churn

- [x] [MID] Build `PinMark25` color-blocked badge
  - File: `components/PinMark25.tsx` (new)
  - Change: add
    ```tsx
    export function PinMark25({ className = '' }: { className?: string })
    ```
    pure CSS server component (no hooks, no `'use client'`): rounded-square with silver ring, mint field, and absolutely-positioned pin-color blocks (magenta top-left, yellow top-right, orange mid-left, blue center, purple bottom-right) sized with % so it scales; an oversized "25" sits in the mint field via `.font-display`
  - Context: block colors from `tailwind.config.ts` palette (magenta-500, yellow-400, orange-400, blue-500, purple-500, teal-300 field, silver-300 ring); mirrors the pin mockup layout
  - Verify: `npm run lint && npm run build`
  - Expected: renders as a scalable square badge; colors match pin; no client JS

- [ ] [MID] Compose hero with badge + mint-forward surfaces
  - File: `app/page.tsx`
  - Change: replace the plain "25 / Tahun Persahabatan" marker block with `<PinMark25 className="h-24 w-24 sm:h-28 sm:w-28" />` beside the "Tahun Persahabatan" caption; add mint washes to section surfaces (hero `bg-teal-50`, class strip `bg-teal-50/50`, features keep `bg-stone-50`, footer CTA `bg-teal-50/40`; dark equivalents keep existing dark neutrals)
  - Context: hero marker block at the top of the hero grid in `app/page.tsx`; ParallaxHero backdrop layers and all CTAs stay as-is
  - Verify: `npm run lint && npm run build`
  - Expected: hero opens with the pin badge; light mode reads mint-forward; dark mode unchanged; CTAs untouched

- [ ] [MID] Update design docs
  - File: `DESIGN.md`
  - Change: add a "Brand Alignment (Pin)" section — Space Grotesk as heading voice, the pin palette usage map (mint field, silver, five accent blocks), and the PinMark25 component reference
  - Context: DESIGN.md is the in-repo design system doc; palette table already lists the pin colors
  - Verify: none (docs)
  - Expected: future contributors can derive brand-correct pages from the doc

## Verification

- [ ] [LOW] Full suite: `npm run lint && npm run build && npm test`
- [ ] [LOW] Manual smoke: prod-server HTML contains Space Grotesk variable on `<html>` and PinMark25 markup; visual check that badge echoes the pin (user compares against the physical pin/mockup)
