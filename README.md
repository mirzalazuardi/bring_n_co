# Silver Reunion Portal

A production-ready high school silver year (25th) reunion web application built with Next.js (App Router), TypeScript, Prisma ORM, NextAuth/Auth.js, and Vercel Blob, architected to run strictly within Vercel's free Hobby plan.

## Features
- **Multi-Provider Authentication:** Email/password (bcrypt), Google OAuth, and LinkedIn OAuth with JWT sessions.
- **Reunion Registration Form:** Alumni profile registration collecting jersey size (`S`, `M`, `L`, `XL`), class group (`IPA-1..3`, `IPS-1..4`), phone number, and bank transfer proof upload to Vercel Blob.
- **Community Photo Gallery:** Authenticated image uploads (`/upload`) and an auto-advancing slideshow (`/gallery`) with a real-time counter indicator.
- **Optimized Image Pipeline:** Client-direct Blob uploads (bypassing the 4.5 MB function limit), durable off-function processing into WebP variants (320/768/1440w, q82, EXIF-corrected), status lifecycle (`queued → processing → completed/failed`), and owner retry — see "Image Pipeline" below.
- **Live Event Countdown:** Homepage real-time countdown ticking down to the reunion date and displaying an event-started message upon arrival.
- **Vercel Hobby Optimized:** Stays strictly within free-tier limits (≤ 4.5 MB request bodies, transform-safe image delivery, ≤ 5,000 monthly optimizations).

## Getting Started

### 1. Prerequisites
- Node.js 18.17+
- PostgreSQL database (e.g., Neon, Supabase, or Vercel Postgres)
- Vercel account with Vercel Blob store

### 2. Installation
```bash
# Clone the repository
git clone <repo-url>
cd bring_n_co

# Install dependencies
npm install
```

### 3. Environment Variables
Create `.env.local` at repository root:
```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/silver_reunion?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-generate-32-byte-secret"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
LINKEDIN_CLIENT_ID="your-linkedin-client-id"
LINKEDIN_CLIENT_SECRET="your-linkedin-client-secret"

# Vercel Blob
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_token_here"

# Reunion Event Target Date (ISO 8601)
EVENT_DATE="2026-12-31T18:00:00+07:00"
```

### 4. Database Setup
```bash
npx prisma migrate deploy
```

### 5. Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## Running Tests
```bash
npm run test
```

## Image Pipeline

`/upload` → `components/ImageUploader.tsx`:

1. Client pre-validates size/type, uploads **directly to Vercel Blob** via `handleUpload` (`POST /api/images/upload` mints a narrowly-scoped token — requires `BLOB_READ_WRITE_TOKEN` server-side; there is intentionally no mock fallback).
2. Blob's `onUploadCompleted` creates the `ImageAsset` row (`queued`) and triggers the durable job.
3. The Trigger.dev task (`jobs/optimize-image.ts` → `lib/images/run-optimize.ts`) downloads with a byte cap, validates magic bytes (SVG/mismatch/corrupt rejected), and writes `thumbnail/medium/large` WebP q82 variants to `images/{imageId}/…` (EXIF-baked, never enlarged, metadata-stripped).
4. The asset flips `completed` and the photo appears in the community gallery (idempotent link via `images.imageAssetId`). Failures carry a user-safe category; owners can retry from the UI (`POST /api/images/:id/reprocess`, allowed only from `failed`).

### Connecting Trigger.dev (required for processing)

Until connected, uploads stay `queued` (the UI and `reprocess` recover them later).

```bash
npx trigger.dev@latest init
# → writes TRIGGER_SECRET_KEY / TRIGGER_PROJECT_REF into .env
npx trigger.dev@latest deploy --target prod   # registers the optimize-image task
```

Set the same two variables in Vercel's project environment. Local task testing: `npx trigger.dev@latest dev`.

### Pipeline environment variables (see `.env.example`)

| Variable | Purpose |
|---|---|
| `MAX_IMAGE_SIZE_MB` | Upload cap, both client gate and worker cap (default 10) |
| `IMAGE_PROCESSING_MAX_WIDTH` | `large` variant cap (default 1440) |
| `TRIGGER_SECRET_KEY` / `TRIGGER_PROJECT_REF` | Trigger.dev auth/project — optional until connected |
| `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN` | Existing prerequisites |

## Deployment to Vercel (Hobby)
1. Push your repository to GitHub or GitLab.
2. Import the project into the [Vercel Dashboard](https://vercel.com).
3. Add all environment variables from `.env.example` to Vercel Settings > Environment Variables.
4. Attach a Vercel Blob store under Storage (this populates `BLOB_READ_WRITE_TOKEN`).
5. Deploy; run `npx prisma migrate deploy` against the production database once.
6. Connect Trigger.dev (section above) and deploy the task.

### Hobby constraints honored by this pipeline
- No permanent worker process; processing runs in Trigger.dev's runtime, not Vercel functions.
- Client-direct uploads sidestep the 4.5 MB serverless body limit.
- The worker enforces a hard download cap; nothing buffers unbounded bodies.
- Variants are pre-generated WebP — no on-demand transforms against the Hobby image quota.

## Limitations & Upgrade Path

- **Trigger.dev free tier** covers reunion-scale volume; sustained heavy use → paid Trigger.dev or self-host.
- **Self-hosted BullMQ swap:** all processing logic lives in `lib/images/*` with injected prisma/Blob deps — a BullMQ worker calls `runOptimizeImage(imageId, jobId, { prisma, blobPut: put })`; delete `jobs/optimize-image.ts` and the trigger calls in the two API routes.
- **Legacy gallery rows** (`images` without `imageAssetId`) are untouched; a backfill migration is a future change.
- **SVG uploads are rejected** (no sanitizer in the loop).
- **Rate limiting** on upload/reprocess is a documented placeholder — wire an in-memory or Upstash limiter per user before public launch.
