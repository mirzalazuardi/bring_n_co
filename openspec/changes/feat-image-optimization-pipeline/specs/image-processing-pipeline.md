# Capability: Image Processing Pipeline

## Purpose

Lets alumni share photos that load fast everywhere: client-direct uploads to object storage, durable off-function optimization into uniform WebP variants, and a transparent status lifecycle the uploader can display.

---

## Requirements

### REQ-IMGPIPE-001: Validated direct upload

The system MUST issue short-lived client-upload tokens only to authenticated users, validating filename, MIME type, and size against configured limits, and MUST NOT grant unrestricted Blob write access to clients.

#### Scenario: Anonymous request rejected

- **Given** an unauthenticated visitor
- **When** they request an upload token
- **Then** the server responds 401 without issuing a token

#### Scenario: Oversized upload rejected before token

- **Given** an authenticated user declaring a 15 MB JPEG with `MAX_IMAGE_SIZE_MB=10`
- **When** they request an upload token
- **Then** the server responds 400 with error category FILE_TOO_LARGE and no token is issued

#### Scenario: Successful direct upload

- **Given** an authenticated user with a valid 2 MB JPEG
- **When** the client uploads directly to Blob via the token
- **Then** an `ImageAsset` row exists with status `queued` and the deterministic key `images/{imageId}/original`

---

### REQ-IMGPIPE-002: Asset record integrity

The system MUST store ownership, status, error taxonomy, deterministic unique storage keys, and per-variant metadata for every uploaded image.

#### Scenario: Record created on upload completion

- **Given** a completed client upload with `originalKey = images/{id}/original`
- **When** the completion callback runs
- **Then** `ImageAsset` exists with `userId` set, `status = queued`, and `originalMime`/`originalSize` recorded

#### Scenario: Duplicate callback is idempotent

- **Given** the Blob completion callback fires twice for the same key
- **When** the second callback executes
- **Then** no duplicate row is created and the original row is unchanged

---

### REQ-IMGPIPE-003: Format and content validation

The worker MUST detect the actual image format from bytes (never trust client MIME), reject corrupt data, reject SVG, and reject declared-vs-detected MIME mismatch; the download MUST enforce a maximum response size.

#### Scenario: Mismatched content rejected

- **Given** a file declared as `image/jpeg` whose bytes decode as PNG
- **When** the worker reads metadata
- **Then** the job fails permanently with category UNSUPPORTED_FORMAT (no retry)

#### Scenario: Corrupt image rejected

- **Given** a truncated or corrupt image body
- **When** the worker reads metadata
- **Then** the job fails permanently with category INVALID_FILE

---

### REQ-IMGPIPE-004: Variant generation

The system MUST produce WebP variants at maximum widths 320/768/1440 with preserved aspect ratio, EXIF `.rotate()` applied, quality 82, metadata stripped, and MUST NOT enlarge smaller sources or emit variants wider than the source.

#### Scenario: Small image not enlarged

- **Given** a 200×100 source
- **When** variants are generated
- **Then** only variants with max width ≤ 200 are emitted, each exactly 200×100

#### Scenario: EXIF orientation corrected

- **Given** a 4000×3000 JPEG flagged as rotated 90°
- **When** variants are generated
- **Then** every variant is landscape 3000×4000-derived (portrait pixels), i.e. orientation baked in

#### Scenario: WebP output

- **Given** any accepted source
- **When** variants are generated
- **Then** every variant is `image/webp`, quality 82, with width/height/size/key recorded

---

### REQ-IMGPIPE-005: Status lifecycle and state machine

The system MUST expose status transitions `queued → processing → completed | failed` atomically (single claim of QUEUED→PROCESSING), return 404 for unknown/foreign images, 409 for disallowed reprocessing, and 202 when queuing work.

#### Scenario: Status poll

- **Given** an owned image mid-processing
- **When** its owner polls the status endpoint
- **Then** the response contains normalized status `processing` and no internal storage URLs

#### Scenario: Foreign or unknown id

- **Given** a signed-in user requesting another user's image id (or a nonexistent id)
- **When** they poll or reprocess
- **Then** the response is 404 with no existence information leaked

#### Scenario: Reprocess only from failed

- **Given** an image with status `completed`
- **When** the owner requests reprocess
- **Then** the response is 409 and state is unchanged

#### Scenario: Reprocess from failed

- **Given** an image with status `failed`
- **When** the owner requests reprocess
- **Then** status resets to `queued` with error fields cleared and the endpoint returns 202

---

### REQ-IMGPIPE-006: Configuration

The system MUST derive limits from validated env vars: `MAX_IMAGE_SIZE_MB` (default 10), `IMAGE_PROCESSING_MAX_WIDTH` (default 1440), `TRIGGER_SECRET_KEY`, `TRIGGER_PROJECT_REF` (optional until connected), plus existing `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`.

#### Scenario: Defaults without extra config

- **Given** a fresh environment with only `DATABASE_URL` set
- **When** env is parsed
- **Then** size limit resolves to 10 MB and max width to 1440 with no throw

---

### REQ-IMGPIPE-007: Durable execution with bounded retries

The system MUST run optimization in a durable background runtime (Trigger.dev), claim each image exactly once per run, retry transient failures with exponential backoff up to 3 attempts, never retry permanent validation failures, and remain idempotent under duplicate execution.

#### Scenario: Transient failure retries

- **Given** Blob temporarily unavailable during variant upload
- **When** the task throws
- **Then** the runtime retries with backoff, max 3 attempts total

#### Scenario: Permanent failure does not retry

- **Given** a corrupt source image
- **When** validation fails
- **Then** the record is marked `failed` with category INVALID_FILE and no further attempts run

#### Scenario: Duplicate run is idempotent

- **Given** the same imageId delivered twice
- **When** both runs execute
- **Then** the second run observes a non-QUEUED status and performs no processing, and deterministic variant keys mean no orphaned duplicates

---

### REQ-IMGPIPE-008: Uploader experience

The uploader MUST pre-validate client-side, upload directly to Blob with progress, poll status with exponential backoff stopping at terminal states, display the final optimized image, allow owner retry on failure, and cancel cleanly on unmount.

#### Scenario: Happy path

- **Given** an authenticated user with a valid 2 MB JPEG
- **When** they select and upload the file
- **Then** progress shows during direct upload, status advances queued→processing→completed, and the medium WebP preview renders

#### Scenario: Unmount cancels polling

- **Given** an upload in progress
- **When** the user navigates away
- **Then** all polling timers and in-flight requests abort without errors

---

### REQ-IMGPIPE-009: Documentation

The system MUST ship setup, deployment, testing, and limitation docs covering Trigger.dev connection, Vercel Hobby constraints, env vars, and the BullMQ upgrade path.

#### Scenario: Docs completeness

- **Given** a new developer cloning the repo
- **When** they follow README from zero
- **Then** they can run migrations, connect Trigger.dev, deploy to Vercel Hobby, and know the documented limitations and upgrade path

---

## Out of scope

- Backfilling legacy gallery `Image` rows
- SVG processing/sanitization (rejected instead)
- Video or non-image assets
- Multi-region replication or CDN pinning strategies
