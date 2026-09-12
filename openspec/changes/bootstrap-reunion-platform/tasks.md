# Tasks: High School Silver Year Reunion Platform

**Complexity Assessment: HIGH**  
Multi-subsystem greenfield full-stack implementation involving OAuth/Credentials authentication with JWT sessions, Prisma ORM database models, binary file uploads to Vercel Blob with strict payload constraints, client-side media slideshow with SSR data fetching, and live countdown timer logic.

---

- [ ] **1. Scaffolding & Dependencies**
  - [ ] 1.1 Initialize Next.js 14+ App Router project with TypeScript, ESLint, and Tailwind CSS.
  - [ ] 1.2 Install runtime dependencies: `next-auth`, `@prisma/client`, `@vercel/blob`, `bcryptjs`, `zod`, `lucide-react`.
  - [ ] 1.3 Install dev dependencies: `prisma`, `@types/bcryptjs`, `vitest`, `@testing-library/react`.
  - [ ] 1.4 Configure environment validation helper with Zod in `lib/env.ts`.

- [ ] **2. Database & Prisma Modeling**
  - [ ] 2.1 Define PostgreSQL schema in `prisma/schema.prisma` (`User`, `Account`, `Session`, `VerificationToken`, `Registration`, `Image`).
  - [ ] 2.2 Configure enums: `JerseySize` (`S`, `M`, `L`, `XL`), `ClassGroup` (`IPA-1`..`IPA-3`, `IPS-1`..`IPS-4`), `VerificationStatus` (`PENDING`, `APPROVED`, `REJECTED`).
  - [ ] 2.3 Establish singleton Prisma Client in `lib/prisma.ts`.
  - [ ] 2.4 Execute initial migration (`npx prisma migrate dev --name init`).

- [ ] **3. Authentication System (NextAuth/Auth.js)**
  - [ ] 3.1 Configure `lib/auth.ts` with NextAuth options using JWT session strategy and PrismaAdapter.
  - [ ] 3.2 Implement `CredentialsProvider` with `bcryptjs` password comparison.
  - [ ] 3.3 Implement `GoogleProvider` and `LinkedInProvider`.
  - [ ] 3.4 Wire API route handler at `app/api/auth/[...nextauth]/route.ts`.
  - [ ] 3.5 Implement user registration/signup API handler at `app/api/auth/register/route.ts` with email uniqueness and password hashing.
  - [ ] 3.6 Create login & signup view at `app/(auth)/login/page.tsx` with credentials form and OAuth action buttons.
  - [ ] 3.7 Add route protection middleware in `middleware.ts` for `/registration`, `/profile`, and `/upload`.

- [ ] **4. Reunion Registration & Payment Proof Pipeline**
  - [ ] 4.1 Define registration Zod schema (`jerseySize`, `classGroup`, `phone`, file size/mime check).
  - [ ] 4.2 Implement `POST /api/registration` route handler parsing `FormData`, uploading payment proof to Vercel Blob (`put()`), and upserting `Registration` in DB.
  - [ ] 4.3 Implement `GET /api/registration` route handler returning current user's registration and proof URL.
  - [ ] 4.4 Build `RegistrationForm` client component in `app/(protected)/registration/page.tsx` with size selector, class selector, phone input, file dropzone, and progress indicator.
  - [ ] 4.5 Add visual badge for verification status (`PENDING`, `APPROVED`, `REJECTED`) on user registration page.

- [ ] **5. General Gallery Upload & Slideshow**
  - [ ] 5.1 Implement `POST /api/upload` route handler accepting image file (`image/*`, ≤ 4.5 MB), uploading to Vercel Blob, and creating `Image` record linked to user.
  - [ ] 5.2 Build `UploadForm` client component at `app/(protected)/upload/page.tsx` with image preview and submission handling.
  - [ ] 5.3 Implement gallery server page at `app/gallery/page.tsx` querying published images from database.
  - [ ] 5.4 Build `GallerySlideshow` client component with 4-second auto-advance, manual next/prev controls, pause on hover, and `x / n` counter indicator.
  - [ ] 5.5 Configure image display with `unoptimized` flag or standardized dimensions to guarantee staying within Vercel's 5,000 transform/month hobby limit.

- [ ] **6. Navigation, Layout & Event Countdown**
  - [ ] 6.1 Build root navigation header with dynamic session state (Sign In, Profile/Registration CTA, Gallery, Upload, Sign Out).
  - [ ] 6.2 Build `EventCountdown` client component displaying Days, Hours, Minutes, Seconds with `setInterval` cleanup and post-event state ("Event has started!").
  - [ ] 6.3 Assemble homepage at `app/page.tsx` with hero section, reunion details, countdown timer, and quick CTAs.

- [ ] **7. Security Guardrails & Verification**
  - [ ] 7.1 Enforce client-side file size guards (< 4 MB) preventing 413 Payload Too Large errors on Vercel.
  - [ ] 7.2 Implement server-side MIME type whitelist verification (images + PDF for payment proofs; JPEG/PNG/WebP for gallery).
  - [ ] 7.3 Write unit and route handler integration tests with Vitest.
  - [ ] 7.4 Verify `npm run lint` and `npm run build` succeed with zero errors.
