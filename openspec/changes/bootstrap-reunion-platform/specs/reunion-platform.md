# Specification: High School Silver Year Reunion Platform

## 1. Overview
The High School Silver Year Reunion Platform is a unified, full-stack web application designed for alumni celebrating their 25th high school reunion across seven graduating classes (`IPA-1` to `IPA-3`, `IPS-1` to `IPS-4`). Built using Next.js (App Router, TypeScript) and hosted on Vercel's free Hobby plan, the system centralizes participant onboarding, custom jersey sizing collection, bank transfer payment proof submission, and nostalgic community photo sharing. The platform eliminates manual administrative tracking by organizing alumni submissions into a structured PostgreSQL database with file storage backed by Vercel Blob, all while adhering strictly to serverless free-tier constraints.

### Key Capabilities
- **Multi-Provider Authentication:** Email & password (bcrypt) credentials sign-up/login, Google OAuth, and LinkedIn OAuth with JWT session tokens.
- **Reunion Registration Form:** Profile submission capturing jersey size (`S`, `M`, `L`, `XL`), class group, contact phone, and bank transfer proof receipt upload (image/PDF).
- **Payment Verification Lifecycle:** Registration tracking with an administrative status (`PENDING`, `APPROVED`, `REJECTED`).
- **Community Photo Gallery:** Authenticated image uploads feeding a public, responsive slideshow with an automatic 4-second advance timer and progress indicator.
- **Real-Time Event Countdown:** Live client-side timer on the homepage calculating days, hours, minutes, and seconds until the reunion celebration, transitioning dynamically to an event-started message.
- **Vercel Hobby Guardrails:** Enforced client and server payload limits (≤ 4.5 MB), transformation-safe image rendering (safeguarding the 5,000 transformations/month cap), and optimized serverless route execution.

---

## 2. Architecture

### High-Level System Diagram
```
+-----------------------------------------------------------------------------------+
|                                 CLIENT BROWSER                                    |
|                                                                                   |
|  [ Homepage / ]        [ Login /login ]     [ Registration /registration ]        |
|  - Hero Banner         - Credentials Form   - Jersey Size (S-XL)                  |
|  - EventCountdown      - Google OAuth btn   - Class Group (IPA 1-3, IPS 1-4)      |
|                        - LinkedIn OAuth btn - Phone Input & Bank Proof Upload     |
|                                                                                   |
|  [ Gallery /gallery ]                       [ Upload /upload ]                    |
|  - GallerySlideshow (Auto ~4s, x/n)         - General Photo UploadForm            |
+-----------------------------------------------------------------------------------+
                                         │
                         HTTPS (App Router & Server Actions)
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                           VERCEL HOBBY RUNTIME (SERVERLESS)                       |
|                                                                                   |
|  Route Handlers:                                                                  |
|  ├── /api/auth/[...nextauth]   --> NextAuth / Auth.js (JWT Session Provider)      |
|  ├── /api/registration        --> User Profile & Proof Upload (GET / POST)       |
|  └── /api/upload              --> Public Gallery Image Ingestion (POST)          |
|                                                                                   |
|  Middleware:                                                                      |
|  └── Enforces authenticated session on /registration, /profile, /upload           |
+------------------------------------+----------------------------------------------+
                                     │
                 ┌───────────────────┴───────────────────┐
                 │ Prisma ORM (TCP / Connection Pool)   │ @vercel/blob SDK
                 ▼                                       ▼
+----------------------------------+   +--------------------------------------------+
|        POSTGRESQL DATABASE       |   |             VERCEL BLOB STORAGE            |
| (Neon / Supabase / Vercel PG)    |   |                                            |
|                                  |   | - /proofs/[userId]-[timestamp].[ext]       |
| - User (auth & profile)          |   |   (Bank transfer receipts, image or PDF)   |
| - Account & Session (OAuth/JWT)  |   |                                            |
| - Registration (sizing, proof)   |   | - /gallery/[imageId]-[timestamp].[ext]     |
| - Image (gallery metadata)       |   |   (Public event memories, image/*)         |
+----------------------------------+   +--------------------------------------------+
```

### Subsystem Interactivity
1. **Authentication:** NextAuth wraps the application. Credentials and OAuth callbacks issue signed, encrypted JWT cookies. Server components read sessions via `getServerSession()`, while client components consume `useSession()`.
2. **Registration:** Authenticated users submit multipart form data to `/api/registration`. The route handler validates fields via Zod, uploads the receipt file to Vercel Blob, and upserts a `Registration` record in PostgreSQL linked by `userId`.
3. **Gallery Uploads:** Authenticated users upload memories through `/api/upload`. The handler streams valid images (≤ 4.5 MB) to Vercel Blob with public read permissions and saves image records (`url`, `title`, `userId`) in the database.
4. **Gallery Slideshow:** The `/gallery` page fetches active gallery photos via a React Server Component directly from PostgreSQL and passes the serialized array to the `GallerySlideshow` client component for client-side interval-driven carousel rendering.
5. **Event Countdown:** The homepage renders `EventCountdown` as a lightweight client component using `useEffect` and `setInterval` to calculate remaining time from the configured `EVENT_DATE` environment variable.

---

## 3. Data Model

The data layer uses Prisma ORM connected to PostgreSQL. The schema accommodates NextAuth models alongside domain models (`Registration` and `Image`).

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum JerseySize {
  S
  M
  L
  XL
}

enum ClassGroup {
  IPA_1 @map("IPA-1")
  IPA_2 @map("IPA-2")
  IPA_3 @map("IPA-3")
  IPS_1 @map("IPS-1")
  IPS_2 @map("IPS-2")
  IPS_3 @map("IPS-3")
  IPS_4 @map("IPS-4")
}

enum VerificationStatus {
  PENDING
  APPROVED
  REJECTED
}

model User {
  id            String         @id @default(cuid())
  name          String?
  email         String         @unique
  emailVerified DateTime?
  passwordHash  String?
  image         String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  accounts      Account[]
  sessions      Session[]
  registration  Registration?
  galleryImages Image[]

  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

model Registration {
  id                   String             @id @default(cuid())
  userId               String             @unique
  jerseySize           JerseySize
  classGroup           ClassGroup
  phone                String
  bankTransferProofUrl String             @db.Text
  status               VerificationStatus @default(PENDING)
  notes                String?
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([classGroup])
  @@index([status])
  @@map("registrations")
}

model Image {
  id          String   @id @default(cuid())
  url         String   @db.Text
  title       String?
  description String?
  userId      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([createdAt])
  @@map("images")
}
```

---

## 4. API Design

### Route 1: NextAuth Authentication Handler
- **Method & Path:** `GET|POST /api/auth/[...nextauth]`
- **Purpose:** Handles OAuth redirects, token exchanges (Google, LinkedIn), and credentials verification.
- **Auth Requirement:** Public.
- **Request/Response:** Managed internally by NextAuth. Uses JWT session strategy storing user `id`, `email`, and `name` in an HTTP-only secure cookie.

---

### Route 2: Reunion Registration (Create / Update)
- **Method & Path:** `POST /api/registration`
- **Purpose:** Creates or updates the authenticated user's reunion registration and uploads the bank transfer proof.
- **Auth Requirement:** Protected (valid session required).
- **Request Format:** `multipart/form-data`
  - `jerseySize`: String (`S` | `M` | `L` | `XL`) — **Required**
  - `classGroup`: String (`IPA-1` | `IPA-2` | `IPA-3` | `IPS-1` | `IPS-2` | `IPS-3` | `IPS-4`) — **Required**
  - `phone`: String (e.g., `+6281234567890`) — **Required**
  - `proof`: Binary File (image/jpeg, image/png, image/webp, application/pdf; max 4 MB) — **Required** on create, optional on update if already submitted.
- **File Handling:**
  1. Validate file presence, MIME type, and size (≤ 4 MB).
  2. Call `put(filename, buffer, { access: 'public', token: env.BLOB_READ_WRITE_TOKEN })`.
  3. Obtain public URL and persist to PostgreSQL via Prisma `upsert`.
- **Responses:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "data": {
        "id": "clx...",
        "jerseySize": "L",
        "classGroup": "IPA-1",
        "phone": "+628123456789",
        "bankTransferProofUrl": "https://...public.blob.vercel-storage.com/proofs/...",
        "status": "PENDING"
      }
    }
    ```
  - `400 Bad Request`:
    ```json
    {
      "success": false,
      "error": "Validation failed",
      "details": ["File size exceeds 4MB limit", "Invalid class group"]
    }
    ```
  - `401 Unauthorized`:
    ```json
    { "success": false, "error": "Authentication required" }
    ```
  - `413 Payload Too Large`:
    ```json
    { "success": false, "error": "Request body exceeds Vercel 4.5MB limit" }
    ```

---

### Route 3: Current User Registration Status
- **Method & Path:** `GET /api/registration`
- **Purpose:** Fetches the logged-in user's registration details and proof status for profile review.
- **Auth Requirement:** Protected (valid session required).
- **Responses:**
  - `200 OK` (registered):
    ```json
    {
      "success": true,
      "registered": true,
      "data": {
        "jerseySize": "M",
        "classGroup": "IPS-2",
        "phone": "+628198765432",
        "bankTransferProofUrl": "https://...public.blob.vercel-storage.com/proofs/...",
        "status": "APPROVED",
        "createdAt": "2026-09-12T08:00:00.000Z"
      }
    }
    ```
  - `200 OK` (not yet registered):
    ```json
    { "success": true, "registered": false, "data": null }
    ```
  - `401 Unauthorized`:
    ```json
    { "success": false, "error": "Authentication required" }
    ```

---

### Route 4: General Gallery Image Upload
- **Method & Path:** `POST /api/upload`
- **Purpose:** Uploads an alumni memory photo to Vercel Blob and records metadata in database.
- **Auth Requirement:** Protected (valid session required).
- **Request Format:** `multipart/form-data`
  - `file`: Binary Image (image/jpeg, image/png, image/webp; max 4 MB) — **Required**
  - `title`: String (max 100 characters) — **Optional**
  - `description`: String (max 300 characters) — **Optional**
- **File Handling:**
  1. Validate content type is an image and file size ≤ 4 MB.
  2. Generate unique slug: `gallery/${session.user.id}-${Date.now()}.${ext}`.
  3. Call `@vercel/blob` `put()` to upload.
  4. Create `Image` record in database.
- **Responses:**
  - `201 Created`:
    ```json
    {
      "success": true,
      "data": {
        "id": "clx...",
        "url": "https://...public.blob.vercel-storage.com/gallery/...",
        "title": "High School Cafeteria 2001",
        "createdAt": "2026-09-12T08:30:00.000Z"
      }
    }
    ```
  - `400 Bad Request` / `401 Unauthorized` / `413 Payload Too Large`.

---

## 5. Frontend Pages & Components

### Page Architecture
| Route | Page Purpose | Component Nature | Key Components |
|---|---|---|---|
| `/` | Event landing page & countdown | Mixed (Server layout + Client countdown) | Hero Section, `EventCountdown`, Registration CTA banner |
| `/login` | User authentication & registration | Client Component | `AuthCard`, `CredentialsForm`, `OAuthButtons` |
| `/registration` | Reunion registration & proof submission | Mixed (Server data prefetch + Client Form) | `RegistrationForm`, `StatusBadge`, File Dropzone |
| `/gallery` | Community memories slideshow | Mixed (Server data fetch + Client Slideshow) | `GallerySlideshow`, Empty State, Upload CTA |
| `/upload` | Memory photo upload | Client Component | `UploadForm`, Image Preview dropzone |

---

### Key Components Specification

#### 1. `EventCountdown` (`components/EventCountdown.tsx`)
- **Nature:** Client Component (`"use client"`).
- **Props:** `targetDate?: string` (defaults to `process.env.NEXT_PUBLIC_EVENT_DATE`).
- **State:** `{ days: number, hours: number, minutes: number, seconds: number, isPassed: boolean }`.
- **Behavior:**
  - Runs a 1,000 ms `setInterval` inside `useEffect`.
  - Calculates remaining difference using UTC millisecond comparison.
  - Cleans up interval on component unmount to prevent memory leaks.
  - When `difference <= 0`, sets `isPassed = true` and renders: `"The Silver Reunion has officially started! Welcome home alumni!"`.

#### 2. `RegistrationForm` (`components/RegistrationForm.tsx`)
- **Nature:** Client Component (`"use client"`).
- **Props:** `initialData?: Registration | null`.
- **Form Controls:**
  - **Jersey Size:** Radio group or `<select>` with options `S`, `M`, `L`, `XL`. Includes sizing measurement tooltip.
  - **Class Group:** `<select>` with 7 options (`IPA-1`, `IPA-2`, `IPA-3`, `IPS-1`, `IPS-2`, `IPS-3`, `IPS-4`).
  - **Phone:** Text input with regex validation (`/^\+?[0-9\s-]{10,20}$/`).
  - **Bank Transfer Proof:** File input supporting drag-and-drop. Validates size on `onChange` (< 4 MB). Generates thumbnail preview for images or PDF icon.
- **Feedback:** Shows inline validation errors, upload progress bar, and success notification upon completion.

#### 3. `GallerySlideshow` (`components/GallerySlideshow.tsx`)
- **Nature:** Client Component (`"use client"`).
- **Props:** `images: Array<{ id: string; url: string; title: string | null; user: { name: string | null } }>`.
- **Behavior:**
  - Automatically advances index every 4,000 ms (`autoPlay = true`).
  - Pauses timer on pointer hover or focus.
  - Controls: Next (`>`), Previous (`<`), and Play/Pause buttons.
  - Indicator: Displays badge reading `"Slide {currentIndex + 1} of {images.length}"`.
  - Image rendering: Standard `<img>` or `next/image` with `unoptimized` flag to guarantee zero Vercel image transformation billing.

#### 4. `UploadForm` (`components/UploadForm.tsx`)
- **Nature:** Client Component (`"use client"`).
- **Behavior:** Accepts image files, displays instant local preview via `URL.createObjectURL()`, captures optional title and description, and submits via FormData to `/api/upload`.

---

## 6. Security & Validation

### 1. Password Hashing & Credentials
- Passwords MUST be hashed using `bcryptjs` with a cost factor (salt rounds) of 12 before database persistence.
- Raw passwords MUST NEVER be logged, returned in API payloads, or stored in session cookies.

### 2. Input Validation Rules (Zod Schemas)
- **Email:** Standard RFC 5322 format via `z.string().email().toLowerCase().trim()`.
- **Phone:** `z.string().min(10).max(20).regex(/^\+?[0-9\s-]{10,20}$/, "Invalid phone format")`.
- **Jersey Size:** `z.enum(["S", "M", "L", "XL"])`.
- **Class Group:** `z.enum(["IPA-1", "IPA-2", "IPA-3", "IPS-1", "IPS-2", "IPS-3", "IPS-4"])`.
- **File Validation:**
  - **Bank Proof:** MIME types `["image/jpeg", "image/png", "image/webp", "application/pdf"]`, max file size `4,194,304 bytes` (4.0 MB).
  - **Gallery Images:** MIME types `["image/jpeg", "image/png", "image/webp"]`, max file size `4,194,304 bytes` (4.0 MB).

### 3. Route & Middleware Protection
- Next.js Edge Middleware (`middleware.ts`) protects `/registration`, `/profile`, `/upload`, and `/api/upload`. Unauthenticated requests redirect to `/login?callbackUrl=...`.
- Route handlers MUST re-verify session identity server-side using `getServerSession(authOptions)` prior to executing mutations.

### 4. Abuse Prevention & Rate Limiting
- Client-side submit debouncing prevents duplicate file uploads.
- Route handlers enforce IP-based in-memory / header throttle recommendations (`Upstash Redis` free tier recommended for high-volume signup protection).

---

## 7. Deployment & Configuration

### Step-by-Step Setup Guide

#### 1. Repository & Package Installation
```bash
# Initialize Next.js with TypeScript and Tailwind
npx create-next-app@latest bring_n_co --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"

# Install core runtime dependencies
npm install @prisma/client next-auth @vercel/blob bcryptjs zod lucide-react clsx tailwind-merge

# Install dev dependencies
npm install -D prisma @types/bcryptjs vitest @testing-library/react
```

#### 2. Database Initialization
```bash
# Initialize Prisma
npx prisma init

# Push schema to PostgreSQL provider (Neon / Supabase)
npx prisma db push
```

#### 3. OAuth Provider Setup
- **Google Cloud Console:** Create OAuth 2.0 Web Application.
  - Authorized JavaScript origins: `http://localhost:3000`, `https://your-reunion.vercel.app`
  - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`, `https://your-reunion.vercel.app/api/auth/callback/google`
- **LinkedIn Developer Portal:** Create app and enable "Sign In with LinkedIn using OpenID Connect".
  - Authorized redirect URIs: `https://your-reunion.vercel.app/api/auth/callback/linkedin`

#### 4. Environment Variables Configuration
In Vercel Dashboard under **Project Settings > Environment Variables**:
| Variable Name | Purpose | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@ep-xyz.neon.tech/reunion?sslmode=require` |
| `NEXTAUTH_URL` | Canonical app URL | `https://your-reunion.vercel.app` |
| `NEXTAUTH_SECRET` | NextAuth encryption secret | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `123456...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `GOCSPX-...` |
| `LINKEDIN_CLIENT_ID` | LinkedIn OAuth Client ID | `77...` |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth Client Secret | `secret_...` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob store token | Created via Vercel Storage tab |
| `EVENT_DATE` | ISO string for countdown target | `2026-12-31T18:00:00+07:00` |

---

## 8. Vercel Hobby Compliance

| Hobby Plan Limit | Quota | Specification Enforcement |
|---|---|---|
| **Serverless Request Body** | 4.5 MB maximum | Enforced client-side (file input blocks > 4.0 MB) and server-side in route handlers. Returns `413` early if exceeded. |
| **Serverless Function Duration**| 10 seconds (default) / up to 5 min | Operations (Prisma upsert + single Blob upload) complete in < 1,200 ms under standard network latency. |
| **Edge / Function Invocations** | 1,000,000 / month | Homepage and gallery data fetching leverage incremental static revalidation (`revalidate = 60`) to minimize invocation churn. |
| **Bandwidth** | 100 GB / month | Image files are delivered directly from Vercel Blob CDN (`public.blob.vercel-storage.com`), bypassing serverless bandwidth limits. |
| **Image Optimization** | 5,000 transformations / month | Slideshow and preview images render with `<img src={...} />` or Next.js `<Image unoptimized />`, completely bypassing Vercel Image Optimization quotas. |

---

## 9. Future Extensions (Post-MVP)

1. **Admin Review Dashboard (`/admin`):**
   - Protected route for committee heads to filter registrations by class group and view uploaded bank transfer receipts in a lightbox.
   - Quick-action buttons to toggle verification status between `APPROVED` and `REJECTED` with an optional note.
2. **Committee CSV Export:**
   - Dedicated endpoint (`/api/admin/export`) outputting formatted `.csv` containing: Alumni Name, Email, Phone, Class Group, Jersey Size, Payment Status, and Receipt URL for jersey manufacturing and treasurer auditing.
3. **Class-Specific Gallery Filtering:**
   - Filter pills on `/gallery` allowing users to view nostalgia photos sorted by graduating class (`IPA-1` through `IPS-4`).
4. **Automated Status Notifications:**
   - Transactional email integration (e.g., Resend free tier) notifying users upon registration confirmation and when their payment proof is approved.
5. **Interactive Reunion Program & Venue Maps:**
   - Dedicated itinerary tab with GPS coordinates, event schedule timeline, and committee contact directories.
