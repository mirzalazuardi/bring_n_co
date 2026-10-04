# Jersey Size Guide Link + Extended Sizes (2XL–5XL)

## Why

Alumni larger than XL currently cannot register a jersey that fits — the form stops at XL. The chest-size captions under each tile ("Dada 96cm" …) are being retired by the committee, so alumni have no reference at all for picking a size. The committee published an official size-guidelines image that must be reachable exactly where alumni choose their size.

## What Changes

- The registration form shows a "Lihat Panduan Ukuran" link directly above the "Ukuran Jersey" field, opening the committee's size-guidelines image (Cloudinary) in a new tab.
- Jersey size options extend from S–XL to **S, M, L, XL, 2XL, 3XL, 4XL, 5XL** — consistently across the form UI, the Zod registration schema, and the Prisma `JerseySize` enum (append-only migration).
- The chest-size captions under each size tile ("Dada xxcm") are removed; the tile grid reflows responsively for eight options.

## Impact

- **Complexity:** MID — cross-file integration (validation constant → database enum/migration → form UI); each individual task is trivial but they must land in lockstep or API validation and persistence drift apart.
- **Touches:** `lib/validations/registration.ts`, `prisma/schema.prisma`, `prisma/migrations/<timestamp>_jersey_size_extended/migration.sql` (new), `components/RegistrationForm.tsx`.
- **Spec:** adds `openspec/changes/feat-jersey-size-guide-and-extended/specs/registration-jersey-sizing.md`
- **Risk:** low — the enum change is append-only (no existing row affected); all size consumers (form, types, API validation, DB) derive from the same `JERSEY_SIZES` constant except the DB enum, which must be migrated in the same change.
- **Dependencies:** none.
- **Rollback:** standard git revert; migration is additive (no data rewrite).

## Out of scope (Ponytail trims)

- Chest measurements as structured per-size metadata (e.g. a `SIZE_DETAILS` map) — the committee's image becomes the single source of truth; a code-side metadata map would duplicate it (rung 1).
- In-page lightbox/modal preview of the size chart — a plain new-tab link keeps zero client JS (rung 1).
- Downloading/re-hosting the size chart locally — direct reuse of the existing Cloudinary asset URL (rung 2).
- Lightbox library or any new dependency — none needed (rung 5).
- Updating archived `bootstrap-reunion-platform` spec artifacts — historical change docs stay immutable; this change's spec supersedes the size list going forward.
