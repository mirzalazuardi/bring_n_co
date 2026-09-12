# Project: Silver Reunion Portal

A full-stack reunion management and community platform built for high school alumni, hosted on Vercel Hobby.

## Tech Stack & Versions
- **Framework:** Next.js 14+ (App Router, React Server Components, TypeScript 5+)
- **Runtime & Hosting:** Node.js 18+ on Vercel (Hobby Free Plan)
- **Database & ORM:** PostgreSQL (Neon / Supabase / Vercel Postgres) with Prisma ORM 5+
- **Authentication:** NextAuth.js (Auth.js v5 beta or v4) with JWT session strategy
- **File Storage:** `@vercel/blob` for bank transfer proofs and gallery photos
- **Validation:** Zod 3+ for type-safe environment variables, API payloads, and form schemas
- **Styling:** Tailwind CSS 3+ with Lucide React icons
- **Testing:** Vitest + React Testing Library

## Directory Structure
```
├── app/
│   ├── (auth)/login/          # Login & registration page
│   ├── (protected)/
│   │   ├── registration/      # Reunion registration form & proof upload
│   │   └── upload/            # Gallery photo upload form
│   ├── api/
│   │   ├── auth/[...nextauth] # NextAuth route handlers
│   │   ├── registration/      # Registration GET/POST API
│   │   └── upload/            # Gallery photo upload API
│   ├── gallery/               # Public gallery slideshow page
│   ├── layout.tsx             # Root layout with nav and session provider
│   └── page.tsx               # Homepage with reunion banner & countdown
├── components/                # Reusable UI components (Countdown, Slideshow, Forms)
├── lib/                       # Prisma client, auth options, blob client, utils
├── prisma/                    # schema.prisma & migrations
└── openspec/                  # Project specifications and change tracking
```

## Testing & Quality Conventions
- Unit and route handler tests via Vitest in `__tests__/`.
- Validate all incoming API request bodies using Zod schemas before processing.
- Run `npm run lint` and `npm run build` as mandatory verification gates.

## Git & PR Conventions
- Branch naming: `feat/[change-id]`, `fix/[issue-id]`, `chore/[task-id]`.
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.
- Pull requests must include verification evidence and pass type-checks.

## Constraints & "What NOT to do"
- **DO NOT exceed 4.5 MB request body limit** on serverless functions (enforce client-side & server-side checks).
- **DO NOT exceed 5,000 monthly image transformations** on Vercel Hobby (use unoptimized images or static sizing).
- **DO NOT store passwords in plaintext** (always hash with bcrypt, salt rounds >= 10).
- **DO NOT expose Vercel Blob write tokens** or database credentials to client bundles.
- **DO NOT write business logic in UI client components**; isolate in server actions or route handlers.

## Knowledge Vault
- **Vault:** None (documentation maintained in repository markdown).
- **Structural Graph:** CodeGraph initialized in `.codegraph/` for code symbol indexing.

## Open Questions & Backlog
- Admin dashboard for reviewing bank transfer proofs and toggling registration status.
- Export registration data (jersey sizes, payment status) to CSV/Excel for event committee.
