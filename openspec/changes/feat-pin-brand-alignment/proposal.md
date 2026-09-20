# Pin Brand Alignment (Space Grotesk + Color-Blocked 25 + Mint-Forward Surfaces)

## Why

The commemorative pin is the reunion's brand source of truth, but the site's heading font (Playfair Display) is an editorial serif that doesn't match the pin's technical/rounded voice, the hero year mark is plain text, and surfaces read neutral-gray rather than the pin's signature mint. Alumni should recognize the event brand instantly.

## What Changes

- Headings render in Space Grotesk (geometric sans matching the pin's chunky rounded letterforms) instead of Playfair Display; body text stays Inter; every page inherits via the existing `--font-display` token.
- The hero shows a pin-style color-blocked "25" badge — mint field, silver ring, magenta/yellow/orange/blue/purple blocks echoing the physical pin — in place of the plain "25" text marker.
- Light-mode surfaces shift mint-forward: hero and class-strip sections pick up soft mint washes while dark mode keeps deep neutrals; text contrast is preserved.

## Impact

- **Complexity:** MID — 3-4 files, standard patterns, reuses the font-pipeline and hero-composition patterns from feat-elevated-homepage.
- **Touches:** `app/layout.tsx` (font swap), `components/PinMark25.tsx` (new, pure CSS server component), `app/page.tsx` (badge + section washes), `DESIGN.md` (docs).
- **Spec:** adds `openspec/changes/feat-pin-brand-alignment/specs/brand-identity.md`
- **Risk:** low — presentational only; the `--font-display` variable name is kept so no downstream token churn.
- **Dependencies:** none (builds on merged feat-elevated-homepage).
- **Rollback:** standard git revert.

## Out of scope

- Sponsorship PDF contents (unreadable at 8.2 MB; brand source is the pin image — upload extracted pages if more branding exists).
- Recreating the exact pin glyph with SVG paths — CSS blocks achieve the brand read without path-drawing complexity (Ponytail rung 1).
- Navbar logo lockup rework, other pages' layouts, watermark restyle (already subtle mint).
- New dependencies — Space Grotesk loads via the already-used `next/font/google` mechanism (rung 5).
