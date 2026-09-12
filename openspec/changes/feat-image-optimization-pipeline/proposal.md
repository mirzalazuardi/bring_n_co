# Optimized Image Pipeline (Direct Upload + Durable Processing)

## Why

Gallery uploads currently store the raw original (up to 4 MB) and serve it unprocessed — slow loads, huge transfer on mobile, no standardized sizes. Alumni upload photos from phones on event day; the gallery slideshow and future pages need fast, uniform WebP derivatives. Server-side processing inside Vercel Hobby functions is not viable (CPU/time limits), so processing must run durably off-function.

## What Changes

- Visitors uploading gallery photos get a client-direct-to-Blob upload (progress bar, no 4.5 MB function-body ceiling), and the gallery record is created only after a verified upload.
- The uploaded image is processed by a durable background job: EXIF-corrected, magic-byte-validated, and rendered into `thumbnail` (≤320w), `medium` (≤768w), `large` (≤1440w) WebP q82 variants without enlarging small sources.
- Upload status is visible (`queued → processing → completed/failed`) via a status endpoint the uploader polls with backoff; failed processing can be retried by the owner.
- The `/upload` page's legacy form is replaced by the optimized uploader (user decision); existing title/description metadata is preserved.
- Schema gains `ImageAsset` (ownership, status machine, error taxonomy, variant JSON, dedup keys) alongside the legacy `Image` model.

## Impact

- **Complexity:** HIGH — multi-subsystem (Blob client uploads, Prisma migration, durable task runtime, Sharp pipeline, 3 new routes, frontend rewrite, test matrix).
- **Touches:** `prisma/schema.prisma` (+migration), `lib/env.ts`, `lib/images/*` (new), `jobs/optimize-image.ts` (new), `app/api/images/**` (new), `components/ImageUploader.tsx` (new), `components/UploadForm.tsx` (replaced), `__tests__/*` (new), `README.md`, `.env.example` (new), `docs/testing-integration.md` (new).
- **Spec:** adds `openspec/changes/feat-image-optimization-pipeline/specs/image-processing-pipeline.md`
- **Risk:** medium — new external dependency (Trigger.dev) with account deferred by user decision; until connected, records stay QUEUED and reprocess path is the recovery story (documented).
- **Dependencies:** none shipping-blocking; Trigger.dev account connection is a post-merge ops step.
- **Rollback:** revert restores legacy UploadForm and old upload route; ImageAsset table is additive and harmless.

## Out of scope

- Migrating existing gallery `Image` rows into optimized assets (backfill — future change).
- Bank-transfer-proof registration uploads (keep as-is: small PDFs/images, single put).
- SVG sanitization pipeline (rejected at validation instead).
- Self-hosted BullMQ worker (swap point documented, not built).
- Playwright E2E in CI (strategy documented; not wired).
