# Tasks: Elevated Homepage Presentation (Parallax Depth + Display Typography)

**Complexity tier: MID** (per proposal.md — 2-4 files per task, standard patterns, short dependency chain)

> **Execution amendment (approved):** vitest is configured node-only (no DOM) and jsdom was declined, so T2-T4 verify via `npm run lint && npm run build` + manual smoke instead of unit tests.

---

## Tasks

- [x] [MID] Add display-serif typography token
  - File: `app/layout.tsx`, `tailwind.config.ts`
  - Change: add `const display = Playfair_Display({ subsets: ['latin'], variable: '--font-display' })` beside the existing `Inter` import; append `display.variable` to `<html>` className; add `fontFamily: { display: ['var(--font-display)', 'serif'] }` under `theme.extend` in tailwind config
  - Context: `Inter` is already loaded via `next/font/google` at `app/layout.tsx:6` — reuse the same mechanism (Ponytail rung 2); headings get a `.font-display` token, body text unchanged
  - Verify: `npm run lint && npm run build`
  - Expected: build passes; `.font-display` utility renders Playfair on any element; no layout shift beyond font swap

- [x] [MID] Create `useParallax` hook
  - File: `components/useParallax.ts` (new)
  - Change: add
    ```ts
    export function useParallax(): {
      ref: React.RefObject<HTMLElement>;
      progress: number;   // 0..1 hero visibility
      pointer: { x: number; y: number }; // -0.5..0.5
      active: boolean;    // false under reduced motion or < sm viewport
    }
    ```
    single rAF-throttled listener pair (`scroll` + `pointermove`) writing refs (no re-render per frame; batched state update at most once per frame), `matchMedia('(prefers-reduced-motion: reduce)')` + viewport guard, cleanup on unmount
  - Context: zero-dependency decision from proposal; Web APIs only; SSR-safe (guards `window`)
  - Verify: `npm test -- useParallax`
  - Expected: unit tests pass — returns `active: false` under reduced motion; listeners removed on unmount

- [x] [MID] Create `useScrollReveal` hook
  - File: `components/useScrollReveal.ts` (new)
  - Change: add
    ```ts
    export function useScrollReveal(): {
      ref: React.RefObject<HTMLElement>;
      revealed: boolean;
    }
    ```
    IntersectionObserver (threshold 0.15, rootMargin `0px 0px -10% 0px`), flips once and disconnects after first intersection; returns `revealed: true` immediately under reduced motion; SSR-safe
  - Context: same zero-dependency approach as `useParallax`
  - Verify: `npm test -- useScrollReveal`
  - Expected: unit tests pass — flips once, never un-flips; immediate `true` under reduced motion

- [x] [MID] Build `ParallaxHero` component
  - File: `components/ParallaxHero.tsx` (new)
  - Change: add
    ```tsx
    export function ParallaxHero({ children }: { children: React.ReactNode })
    ```
    renders backdrop layers — oversized "25" watermark, 2-3 blurred pin-color orbs (teal/magenta/orange), grain overlay — each with its own `speed`; transforms via translate3d only (no layout shift); `children` render as static foreground; reduced-motion renders layers statically
  - Context: consumes `useParallax` from previous task; composition stays in `app/page.tsx` (SRP — this component owns depth layers only)
  - Verify: `npm test -- ParallaxHero`
  - Expected: render test passes — layers present; static render (no crash) under reduced motion

- [ ] [MID] Compose homepage with new hero + reveals
  - File: `app/page.tsx`
  - Change: wrap hero content in `<ParallaxHero>` (session/registration-derived CTA passed as children); add `font-display` to hero h1, section headings, footer CTA heading; wrap class strip, feature cards, footer CTA in a reveal wrapper backed by `useScrollReveal`; hero content and all copy/CTAs otherwise unchanged
  - Context: current sections at `app/page.tsx:22-120` (hero), `:122-139` (class strip), `:141-216` (features), `:218-238` (footer CTA); page remains a Server Component
  - Verify: `npm run lint && npm run build`
  - Expected: above-the-fold content renders identically at first paint; below-fold sections reveal once on scroll; light and dark themes both legible

- [ ] [MID] Token & utility polish
  - File: `app/globals.css`, `tailwind.config.ts`
  - Change: add `.reveal` utility classes (opacity/translate transition, 500ms ease-out); add grain-texture utility; extend `theme.extend.transitionTimingFunction` with a slow easing; extend the existing `prefers-reduced-motion` guard at `app/globals.css:76-83` to neutralize reveal/parallax classes
  - Context: existing reduced-motion global guard must be extended, not duplicated
  - Verify: `npm run lint && npm run build`
  - Expected: reduced-motion users see a static page; tokens reusable by other pages later

## Verification

- [ ] [LOW] Full suite: `npm run lint && npm run build && npm test`
- [ ] [LOW] Manual smoke: homepage in `npm run dev` — hero layers shift on scroll + pointer; sections reveal once; toggle dark mode; register CTA routes correctly for anonymous/logged-in/registered users; check 375px, 768px, 1024px widths; `prefers-reduced-motion` shows static page
