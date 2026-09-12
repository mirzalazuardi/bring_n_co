# Integration Testing Strategy — Image Pipeline

## Layered test pyramid

| Layer | Tool | Scope | Status |
|---|---|---|---|
| Unit — Sharp core | Vitest (real sharp) | format detection, variants, EXIF, never-enlarge, download cap | `__tests__/image-pipeline.test.ts` |
| Unit — job state machine | Vitest (mocked prisma) | atomic claim, retry-reclaim, reprocess reset, error classification | `__tests__/image-job.test.ts` |
| Unit — API decisions | Vitest (mocked session/prisma/trigger) | auth, 404 equivalence, 409/202 state machine | `__tests__/image-routes.test.ts` |
| Integration — E2E flow | Vitest (mocked Blob + Trigger.dev + real Postgres/Sharp) | upload-gate → queue → task → gallery link | `__tests__/image-flow.test.ts` |
| E2E — browser | Playwright | real upload through UI to completed state | staging runbook below |

## Staging runbook (real services)

1. Provision: Neon branch + Vercel Blob store + Trigger.dev project.
2. `npx trigger.dev@latest init` (writes TRIGGER_SECRET_KEY / TRIGGER_PROJECT_REF).
3. `npx trigger.dev@latest deploy --target prod` (registers `optimize-image`).
4. Deploy to Vercel preview; sign in with a test account.
5. Happy path: upload a 2000×1200 JPEG → observe queued → processing → completed;
   verify `images/{id}/thumbnail.webp|medium.webp|large.webp` in Blob and the
   gallery row serving `medium`.
6. Failure path: upload a corrupted `.jpg` (truncated) → FAILED with
   INVALID_FILE, no retry runs in Trigger.dev dashboard; UI shows retry;
   reprocess with a valid file → COMPLETED.
7. Idempotency: re-deliver the Blob completion callback (via Trigger.dev replay
   or curl with the same payload) → still one gallery row, one asset row.

## Playwright outline (when wired)

- Seed session via NextAuth credentials test user (or storageState).
- Navigate `/upload`, `setInputFiles` a generated fixture JPEG.
- Assert progress bar appears; mock-free run waits for completed pill (≤30s).
- Assert `<img src*="medium.webp">` rendered in the uploader preview.
- Negative: 15 MB fixture → client-side error before any network call.

## CI recommendation

- PR gate: `npm run lint && npm test` (unit + mocked integration, no network).
- Nightly/staging job: the runbook above, optionally Playwright against preview URL.
