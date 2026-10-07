# Admin Inline Registration Edit

## Why

The admin console can only approve/reject a registration — committee members cannot correct alumni data (wrong class, jersey size, or phone typo at the booth). Data fixes currently require direct database access.

## What Changes

- `PATCH /api/admin/registrations/:id` accepts optional `jerseySize`, `classGroup`, and `phone` in addition to `status`/`notes`; only provided fields change (partial update), and the body must contain at least one field.
- The admin registrations table gains a per-row inline editor (pencil button): jersey/class become selects and phone becomes an input with a Simpan/Batal pair; one PATCH saves all three fields atomically.
- `verificationUpdateSchema` is superseded by `adminRegistrationUpdateSchema` (combined payload); phone validation reuses the registration form's shape.

## Impact

- **Complexity:** MID — cross-file (schema → API route → client table → tests), no DB migration.
- **Touches:** `lib/admin/registrations.ts`, `app/api/admin/registrations/[id]/route.ts`, `components/AdminRegistrationsTable.tsx`, `__tests__/admin.test.ts`.
- **Risk:** low — existing status-only PATCH flows (verify buttons) keep working unchanged; admin Basic Auth guard chain untouched.
- **Rollback:** standard git revert.
