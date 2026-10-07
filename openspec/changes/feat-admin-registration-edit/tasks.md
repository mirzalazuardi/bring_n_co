# Tasks: Admin Inline Registration Edit

**Complexity tier: MID** (per proposal.md)

---

## Tasks

- [x] [MID] Add validation schemas for data edits
  - File: `lib/admin/registrations.ts`
  - Change: `registrationEditSchema` (optional jersey/class/phone reusing `JERSEY_SIZES`/`CLASS_GROUPS` and the registration phone shape) and `adminRegistrationUpdateSchema` (combined status/notes + data edit, refined to require ≥1 field)
  - Verify: `npx vitest run __tests__/admin.test.ts`

- [x] [MID] Extend PATCH `/api/admin/registrations/:id` to apply data edits
  - File: `app/api/admin/registrations/[id]/route.ts`
  - Change: parse with `adminRegistrationUpdateSchema`; spread only provided fields into the Prisma update, converting via `toPrismaJerseySize`/`toPrismaClassGroup`; keep the reject-requires-notes guard
  - Verify: status-only PATCHes (existing verify buttons) unchanged; `npm run build`

- [x] [MID] Inline row editor in `AdminRegistrationsTable`
  - File: `components/AdminRegistrationsTable.tsx`
  - Change: pencil action per row; jersey/class selects + phone input with Simpan/Batal; single PATCH with all three fields; client-side phone validation mirroring the API
  - Verify: manual smoke on `/admin`

- [x] [MID] Schema unit tests
  - File: `__tests__/admin.test.ts`
  - Change: cover partial/full edits, invalid enums, phone shapes, empty-PATCH rejection, and legacy status-only payloads
  - Verify: `npm test` — 113/113 green

## Verification

- [x] [MID] `npm test` (113/113), `npm run lint` (0 errors, 9 pre-existing warnings), `npm run build` (green)
