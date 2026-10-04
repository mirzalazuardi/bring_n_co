# Tasks: Jersey Size Guide Link + Extended Sizes (2XL–5XL)

**Complexity tier: MID** (per proposal.md)

> Each task below is atomic: one concern, one verify, one commit. Commit style follows repo convention (`feat(scope): …` / `fix(scope): …` per `git log`). Tasks are dependency-ordered — do not skip ahead.

---

## Tasks

- [ ] [MID] Add size-guide link above the "Ukuran Jersey" field
  - File: `components/RegistrationForm.tsx`
  - Change: inside the "Ukuran Jersey" field block, directly above the tiles grid, render a link
    ```tsx
    <a
      href="https://res.cloudinary.com/dhcmpwmu1/image/upload/v1791129511/images/805a2e3c-030b-4b47-957f-7d5e47f22f2b/original.jpg"
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-teal-600 dark:text-teal-400 underline hover:text-teal-700 dark:hover:text-teal-300"
    >
      Lihat Panduan Ukuran
    </a>
    ```
    following the "Lihat Dokumen" link styling already in this file; label text stays "Ukuran Jersey" with its required marker
  - Context: field label block starts at the `<label>` containing "Ukuran Jersey"; anchor to the committee's Cloudinary guidelines image exactly as provided, no re-hosting
  - Verify: `npm run lint && npm run build`
  - Expected (REQ-SIZE-001): link renders between the label and the size tiles, opens the guidelines image in a new tab; form behavior otherwise unchanged
  - Commit: `feat(registration): link size guide above jersey size field`

- [ ] [MID] Extend JERSEY_SIZES to S–5XL and drop chest captions in the form
  - Files: `lib/validations/registration.ts`, `components/RegistrationForm.tsx`
  - Change: `JERSEY_SIZES` becomes `['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL']`; update the Zod errorMap message to "…(S, M, L, XL, 2XL, 3XL, 4XL, 5XL)"; in `RegistrationForm.tsx` remove the whole `text-[11px]` `<span>` with the `{size === 'S' && 'Dada 96cm'}…` captions and change the tiles grid from `grid-cols-4` to `grid-cols-4 sm:grid-cols-8` so eight tiles lay out responsively
  - Context: `JERSEY_SIZES` is the single source of truth — form tiles, `ExistingRegistration.jerseySize` type, and the API's `registrationFormSchema` validation all derive from it; with no caption span, remove the now-unneeded `flex-col` tile layout wrapper
  - Verify: `npx vitest run __tests__/registration-validation.test.ts`
  - Expected (REQ-SIZE-002, REQ-SIZE-003): schema accepts `2XL`–`5XL` and still rejects `XXL`/other values; form renders eight caption-free tiles; existing "reject XXL" test stays green without modification
  - Commit: `feat(registration): extend jersey sizes to 5XL and drop chest captions`

- [ ] [MID] Extend Prisma JerseySize enum with 2XL–5XL
  - Files: `prisma/schema.prisma`, `prisma/migrations/<timestamp>_jersey_size_extended/migration.sql` (new)
  - Change: `enum JerseySize` becomes `S, M, L, XL, Two_XL, Three_XL, Four_XL, Five_XL` with `@map` members for the new values (`Two_XL @map("2XL")` etc. — Postgres enum labels starting with a digit are fine, Prisma identifiers are not); generate a SQL migration that only `ALTER TYPE "JerseySize" ADD VALUE '2XL';` (…through `'5XL'`)
  - Context: DB enum at `prisma/schema.prisma` `enum JerseySize`; template for hand-written SQL migrations is `prisma/migrations/0_init/migration.sql`; `ALTER TYPE … ADD VALUE` runs in a single statement per value (Postgres restriction) so list each on its own line; run `npx prisma migrate dev` (or apply manually against the dev DB) and `npx prisma generate` so the client types refresh
  - Verify: `npx vitest run __tests__/schema.test.ts`
  - Expected (REQ-SIZE-002): `JerseySize.Two_XL === '2XL'` … `JerseySize.Five_XL === '5XL'`; extend `schema.test.ts` with assertions for the four new members; existing S/M/L/XL assertions unchanged
  - Commit: `feat(registration): extend JerseySize enum with 2XL-5XL`

- [ ] [MID] Wire persistence end-to-end for an extended size
  - File: `__tests__/registration-validation.test.ts`
  - Change: add a test case proving a `2XL` (and `5XL`) payload passes `registrationFormSchema.safeParse`, mirroring the existing valid/invalid cases; no production-code change expected — this is the integration check that the constant, schema, and (via Prisma enum mapping) persistence layer agree
  - Context: `registrationFormSchema` validates `jerseySize` before any DB write in `app/api/registration/route.ts`; the route then persists `parsedFields.data.jerseySize`, which type-checks only if the Zod enum and Prisma enum agree
  - Verify: `npx vitest run __tests__/registration-validation.test.ts`
  - Expected (REQ-SIZE-002): new cases pass; `npx tsc --noEmit` shows no type error where the route casts `jerseySize` into the Prisma field
  - Commit: `test(registration): cover extended jersey sizes end-to-end`

## Verification

- [ ] [MID] Full suite: `npm run lint && npm run build && npm test`
  - Expected: all existing tests green (incl. `XXL` rejection, admin export/table rendering raw size strings); build compiles with refreshed Prisma client types
- [ ] [MID] Manual smoke: register (or edit registration) with each new size — form shows the "Lihat Panduan Ukuran" link opening the Cloudinary image, eight tiles with no chest captions, and the selected 2XL–5XL value persists after `router.refresh()`; admin table/export show the new size string
