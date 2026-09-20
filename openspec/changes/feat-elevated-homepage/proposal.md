# Elevated Homepage Presentation (Parallax Depth + Display Typography)

## Why

The homepage is every alumnus's first touchpoint, but it reads as a flat template: one sans-serif, no depth, no sense of occasion. A 25-year reunion should feel commemorative and crafted the moment the page loads.

## What Changes

- Visitor sees hero backdrop layers (oversized "25" watermark, soft pin-color orbs, grain) drifting at different speeds while scrolling and subtly following the pointer, while headline and countdown stay fixed for readability.
- Visitor sees feature cards, the class strip, and the closing CTA rise into view the first time they scroll to them — once, without re-animating.
- Headings render in a commemorative display serif (Playfair Display); body text stays Inter. Other pages inherit the typography automatically.
- All existing actions work exactly as before: register CTA (status-aware), gallery link, login routing, theme toggle.

## Impact

- **Complexity:** MID — cross-file presentation work; no DB, API, auth, or architecture changes.
- **Touches:** `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `tailwind.config.ts`, plus new `components/useParallax.ts`, `components/useScrollReveal.ts`, `components/ParallaxHero.tsx`.
- **Spec:** adds `openspec/changes/feat-elevated-homepage/specs/homepage-presentation.md`
- **Risk:** low — purely presentational; server data flow (`getServerSession`, `prisma`) and `revalidate = 60` untouched.
- **Dependencies:** none.
- **Rollback:** standard git revert (no schema or API changes).

## Out of scope

- framer-motion or any animation library — zero-dependency hooks per user decision (Ponytail rung 5: Web APIs + `next/font` already installed).
- Editorial full redesign / dark cinematic hero — user chose "elevated current style".
- Marquee strip, sticky scroll sections — trimmed (rung 1: parallax + reveal already deliver the wow factor).
- Navbar floating-glass rework, scroll-progress bar — deferred (user chose "homepage + tokens" scope).
- Layout changes on other pages — they inherit tokens only.
