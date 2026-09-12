# Tasks: Optimized Image Pipeline (Direct Upload + Durable Processing)

**Complexity tier: HIGH** (multi-subsystem: client-direct Blob upload, Prisma migration, Trigger.dev durable task, Sharp pipeline, new API surface, frontend rewrite)

Spec source: user-provided production spec (pasted 2026-09-12); filed in `proposal.md`.

---

## Tasks

- [x] [HIGH] Install dependencies and add env schemas
  - Depends on: none
  - Context anchors:
    * Read `lib/env.ts` (existing Zod env validation) and `package.json`
    * Gravity search result: `@trigger.dev/sdk@latest` + `sharp` install; env vars `TRIGGER_SECRET_KEY`, `TRIGGER_PROJECT_REF` (spec) — reconcile with SDK naming at install time
  - Files: `package.json`, `lib/env.ts`, `.env.example` (new)
  - Implementation:
    * `npm install @trigger.dev/sdk@latest sharp` and dev dep `trigger.dev` CLI if required by init; do NOT run the interactive `trigger.dev init` (account deferred)
    * Extend env schema: `MAX_IMAGE_SIZE_MB` (default 10), `IMAGE_PROCESSING_MAX_WIDTH` (default 1440), `TRIGGER_SECRET_KEY` (optional until connected), `TRIGGER_PROJECT_REF` (optional)
    * `.env.example` with all documented variables and comments
  - Pattern reference: existing `envSchema` shape in `lib/env.ts`
  - Verify: `npm run lint && npm test`
  - Expected: env tests still pass; new vars parse with defaults; no secrets committed
  - DONE criteria: scenarios in REQ-IMGPIPE-006 (config) hold

- [x] [HIGH] Prisma `ImageAsset` model + migration
  - Depends on: T1
  - Context anchors:
    * Read `prisma/schema.prisma` (existing models, enum style, `@@map` snake_case convention)
    * Spec block "Database model" — improvements: `userId` ownership, `errorCategory` enum, `jobRunId` dedup, unique `originalKey`
  - Files: `prisma/schema.prisma`, new migration via CLI
  - Implementation:
    * Add `ImageStatus` enum (QUEUED/PROCESSING/COMPLETED/FAILED), `ImageErrorCategory` enum (INVALID_FILE, UNSUPPORTED_FORMAT, FILE_TOO_LARGE, DOWNLOAD_FAILED, PROCESSING_FAILED, STORAGE_FAILED, UNKNOWN)
    * Add `ImageAsset` per spec + `userId` FK → User, `errorCategory ImageErrorCategory?`, `jobRunId String?`, `@@unique([originalKey])`, `@@index([status])`, `@@index([userId])`, `@@map("image_assets")`
    * `variants Json?` holds the per-variant structure from the spec
    * Run `npx prisma migrate dev --name add_image_assets` (requires reachable DATABASE_URL)
  - Edge cases: migration failure against mock DB — fall back to `prisma validate` + `generate` and note the manual migrate step in README
  - Pattern reference: existing `Image` model `@@map` style
  - Verify: `npx prisma validate && npm test` (schema test picks up new model)
  - Expected: schema valid; client regenerated; migration file committed
  - DONE criteria: REQ-IMGPIPE-002 scenarios

- [x] [HIGH] Zod schemas + storage-key module + Sharp processing module
  - Depends on: T1
  - Context anchors:
    * Read `__tests__/registration-validation.test.ts` (Zod test style)
    * Spec: storage layout `images/{imageId}/original|thumbnail.webp|medium.webp|large.webp`; variant rules (max widths 320/768/1440, WebP q82, `.rotate()`, never enlarge, strip metadata, effort setting)
  - Files: `lib/images/schemas.ts` (new), `lib/images/keys.ts` (new), `lib/images/process.ts` (new), `__tests__/image-pipeline.test.ts` (new)
  - Implementation:
    * Schemas: `uploadTokenBodySchema` (filename, size, mime), `imageStatusResponseSchema`, `reprocessBodySchema`
    * Keys: `originalKey(imageId)`, `variantKey(imageId, variant)` — deterministic, no user filename anywhere
    * Process: `detectImageFormat(buffer)` via `sharp(buffer).metadata()` (magic-byte truth, format allowlist jpeg/png/webp/gif/avif/tiff; svg rejected), `buildVariants(buffer)` returning per-variant `{ buffer, width, height }` with `.rotate()`, `withoutEnlargement`, quality 82, effort sensible (`effort: 4` where supported), metadata stripped; `variantMaxWidths` map
    * Download helper `downloadWithLimit(url, maxBytes)` streaming size guard (SSRF: fetch only stored Blob URL — never user-supplied URLs)
  - Edge cases: corrupt buffer → metadata throws → classified `INVALID_FILE`/`UNSUPPORTED_FORMAT`; declared-vs-detected MIME mismatch → reject
  - Pattern reference: Vitest node-env style from `__tests__/countdown.test.ts`; pure functions unit-testable without DOM/Blob mocks
  - Verify: `npm test -- image-pipeline`
  - Expected: unit tests pass for format detection (incl. mismatch + corrupt), never-enlarge, key determinism, download size guard
  - DONE criteria: REQ-IMGPIPE-003, REQ-IMGPIPE-004 scenarios

- [ ] [HIGH] Blob direct-upload token route + client helper
  - Depends on: T2, T3
  - Context anchors:
    * Spec "Upload flow" preferred flow (token → client upload → onUploadCompleted → DB record → trigger job)
    * `@vercel/blob` client-uploads API: `handleUpload` server-side; client `upload()` from `@vercel/blob/client`
  - Files: `app/api/images/upload/route.ts` (new), `lib/images/blob-client.ts` (new)
  - Implementation:
    * `POST /api/images/upload` = `handleUpload` with `onBeforeGenerateToken`: require session (auth boundary), Zod-validate pathname/mimeType/size against env limits + MIME allowlist, return safe `images/` token (no unrestricted permissions)
    * `onUploadCompleted`: create `ImageAsset` row (QUEUED) with `originalKey`/`originalUrl`/`originalMime`/`originalSize`, dedup on `originalKey` (idempotent callback retries), then fire-and-forget-safe trigger via `tasks.trigger()` awaited inside the handler (Blob callbacks need 2xx; guard with try/catch and leave record QUEUED for reprocess on trigger failure)
    * Response shapes structured JSON; no internal error leakage
  - Edge cases: callback replay → upsert semantics; token abuse → per-session rate-limit placeholder hook
  - Pattern reference: session extraction style from `app/api/upload/route.ts`
  - Verify: `npm run lint && npm test`
  - Expected: route compiles; unit test covers handler classification logic where extractable (validation fn)
  - DONE criteria: REQ-IMGPIPE-001, REQ-IMGPIPE-005 scenarios

- [x] [HIGH] Durable optimization job (Trigger.dev task)
  - Depends on: T3, T4
  - Context anchors:
    * Gravity result: `task({ id, run })` from `@trigger.dev/sdk/v3`; trigger via `tasks.trigger()`
    * Spec "Background job": atomic QUEUED→PROCESSING claim, max 3 attempts, exponential backoff, no retry on permanent validation errors
  - Files: `jobs/optimize-image.ts` (new), `lib/images/claim.ts` (new)
  - Implementation:
    * `claimForProcessing(imageId)`: `updateMany({ where: { id, status: QUEUED }, data: { status: PROCESSING } })` — atomic claim returning count; count 0 → skip (idempotent against duplicate runs)
    * Task `optimize-image`: payload `{ imageId }`; fetch row, verify exists; claim; download via `downloadWithLimit(stored originalUrl)`; detect format; build variants; `put()` each to deterministic keys (overwrite safe); update row COMPLETED with `variants`, `width`, `height`, `processedAt`, cleared error fields
    * Failure path: classify error → permanent categories (`INVALID_FILE`, `UNSUPPORTED_FORMAT`, `FILE_TOO_LARGE`) → mark FAILED + `errorCategory` + user-safe `errorMessage` and `throw` SkipRetry / non-retryable per SDK support; transient (download/storage/prisma) → rethrow for SDK retry (3 attempts, exponential backoff options)
    * `reprocess` support: explicit-force path resets FAILED→QUEUED (route owns permission checks)
    * Header comment: BullMQ swap notes (pure `lib/images/process.ts` + `claim.ts` carry over)
  - Pattern reference: this file is thin glue; all logic lives in `lib/images/*`
  - Verify: `npm run lint && npm test`
  - Expected: claim/classification logic unit-tested with mocked prisma
  - DONE criteria: REQ-IMGPIPE-003, REQ-IMGPIPE-005, REQ-IMGPIPE-007 scenarios

- [x] [HIGH] Status + reprocess API routes
  - Depends on: T2, T4
  - Context anchors:
    * Spec "API routes": 202 on queue, 404 unknown id, 409 reprocess-not-allowed, structured JSON, auth boundary, abuse protection placeholder
  - Files: `app/api/images/[id]/route.ts` (new), `app/api/images/[id]/reprocess/route.ts` (new)
  - Implementation:
    * GET status: session required; load by id; 404 if missing **or owned by another user** (authorization via ownership, no existence leak); return normalized `{ id, status, errorMessage?, variants? }` — omit originalUrl (private-ish)
    * POST reprocess: ownership as above; allowed only from FAILED (409 otherwise); reset to QUEUED (clear error fields, `processedAt`), trigger task, 202; rate-limit placeholder hook documented
  - Edge cases: body validation with Zod (empty ok), malformed uuid → 404 path
  - Pattern reference: error envelope `{ success: false, error }` style used in existing routes
  - Verify: `npm run lint && npm test`
  - Expected: route handler unit tests for state-machine decisions with mocked prisma/session
  - DONE criteria: REQ-IMGPIPE-005 scenarios

- [x] [HIGH] `image-uploader` React component + replace gallery upload form
  - Depends on: T4, T6
  - Context anchors:
    * Read `components/UploadForm.tsx` + `app/(protected)/upload/page.tsx` (current UX, title/description fields preserved)
    * Spec "Frontend": client validation, progress, poll with exponential backoff, stop on completed/failed, retry, cancel/unmount safety
  - Files: `components/ImageUploader.tsx` (new), `components/UploadForm.tsx` (replace), `app/(protected)/upload/page.tsx` (adjust copy only if needed)
  - Implementation:
    * Client pre-validation (size vs `MAX_IMAGE_SIZE_MB` minus overhead, MIME allowlist) before token request
    * `upload()` from `@vercel/blob/client` with `handleUpload` endpoint `/api/images/upload`; on completion poll `GET /api/images/:id` with exponential backoff (1s→2s→4s→…cap 8s), AbortController on unmount, stop on COMPLETED/FAILED
    * Status pill (`queued/processing/completed/failed` per spec casing), retry button → reprocess route, final optimized preview via `variants.medium.url`, keep title/description on the gallery `Image` record created at COMPLETED (server-side, in task completion step)
    * 4.5 MB guard note: Blob client upload bypasses function body limit; keep UI hint aligned with server limit
  - Edge cases: duplicate submit disabled; network error mid-poll → capped retries then friendly failure
  - Pattern reference: form/progress styling from existing `UploadForm.tsx`; button classes `.btn-primary/.btn-secondary`
  - Verify: `npm run lint && npm run build`
  - Expected: `/upload` renders new uploader; build green; no SSR issues
  - DONE criteria: REQ-IMGPIPE-008 scenarios

- [x] [HIGH] Tests: pipeline, job, routes + integration strategy doc
  - Depends on: T3, T5, T6
  - Context anchors:
    * Spec "Testing" list; Vitest node env (no DOM); existing mock style (no network/DB in unit tests)
  - Files: `__tests__/image-pipeline.test.ts` (extend), `__tests__/image-job.test.ts` (new), `__tests__/image-routes.test.ts` (new), `docs/testing-integration.md` (new)
  - Implementation:
    * Cover: invalid MIME, oversize, corrupt image, format mismatch, never-enlarge, EXIF rotate (fixture with orientation flag), WebP variant generation (real sharp in node env), retry/backoff classification, duplicate-run idempotency, FAILED transition, ownership 404, 409 reprocess
    * Mock `@vercel/blob` (put/handleUpload), `@trigger.dev/sdk/v3` (tasks.trigger), prisma
    * Integration doc: staging runbook (real Blob+Trigger.dev), Playwright happy path outline (token→upload→poll→completed), CI note
  - Edge cases: GIF-as-static (first frame), AVIF decode where libvips supports
  - Pattern reference: existing `__tests__` structure and vi.mock style
  - Verify: `npm test`
  - Expected: full suite green including new specs
  - DONE criteria: REQ-IMGPIPE-007, REQ-IMGPIPE-009 scenarios

- [ ] [HIGH] README + deployment docs + limitations
  - Depends on: T1-T8
  - Context anchors:
    * Read existing `README.md` (extend, don't replace)
    * Spec deliverables 12-14; Trigger.dev setup (account, `npx trigger.dev@latest init`, `TRIGGER_SECRET_KEY`, `TRIGGER_PROJECT_REF`); Vercel Hobby constraints honored by design
  - Files: `README.md` (extend), `.env.example` (finalize)
  - Implementation:
    * Sections: pipeline overview, setup (local + Trigger.dev connect steps), Vercel Hobby deployment notes (function limits, why durable jobs), limitations + upgrade path (BullMQ self-host swap point, Gallery `Image` backfill idea)
  - Verify: manual review; `npm run lint`
  - Expected: a new dev can go from clone to working pipeline following the README
  - DONE criteria: REQ-IMGPIPE-009 scenario (docs)

## Verification

- [ ] [LOW] Full suite: `npm run lint && npm run build && npm test`
- [ ] [LOW] Manual smoke: `/upload` with a JPEG — upload completes, record goes QUEUED, (post-Trigger-connect) transitions to COMPLETED with WebP variants; UI shows status pill and final medium WebP; reprocess from FAILED works after simulating failure
