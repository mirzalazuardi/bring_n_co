# Silver Reunion (25th High School Reunion Portal)

A modern full-stack web portal for a high school silver year (25th) reunion, deployed on Vercel's free Hobby plan.

## Big Picture
- **Problem:** Coordinate alumni reunion registration, collect sizing and payment transfer proofs, and share memories.
- **Users:** High school alumni across 7 graduating classes (IPA-1 to IPA-3, IPS-1 to IPS-4).
- **Critical User Flows:**
  1. Multi-provider auth (Credentials + bcrypt, Google OAuth, LinkedIn OAuth) with JWT session.
  2. Reunion registration with jersey size (S/M/L/XL), class, phone, and bank transfer proof upload to Vercel Blob.
  3. Community gallery uploads, auto-advancing slideshow (~4s), and live event countdown timer.
- **Pillars:** Next.js App Router (TypeScript), Prisma ORM + PostgreSQL, NextAuth/Auth.js, Vercel Blob.

## Configuration
- Environment variables required:
  - `DATABASE_URL`: PostgreSQL connection string (Neon / Supabase / Vercel Postgres).
  - `NEXTAUTH_URL`, `NEXTAUTH_SECRET`: Auth.js JWT session config.
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth provider credentials.
  - `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`: LinkedIn OAuth provider credentials.
  - `BLOB_READ_WRITE_TOKEN`: Vercel Blob access token.
  - `EVENT_DATE`: ISO 8601 string for countdown target (e.g. `2026-12-31T18:00:00+07:00`).

## Style Guide
Clarity first: write predictable, readable TypeScript with explicit types and zero premature abstraction.
- **SRP:** Each component, route handler, or service function has a single, well-defined responsibility.
- **OCP:** Extend behavior through props, compositions, and configuration rather than editing tested core code.
- **LSP:** Keep polymorphic abstractions and types interchangeable and contract-compliant.
- **ISP:** Favor small, targeted TypeScript interfaces over bulky monolithic types.
- **DIP:** Inject database clients and external services via dependency boundaries / service modules.
- **Pragmatic Stack Notes:** Use Next.js Server Components for data fetching and Client Components for interactivity.
- **Naming:** PascalCase for React components/types, camelCase for variables/functions, kebab-case for files/routes.
- **Validation & Testing:** Validate all API/form payloads with Zod; test core utilities and routes with Vitest.

## For AI Agents
- **OpenSpec Artifacts:** Detailed specifications and proposals live in `openspec/`.
  - Project spec: `openspec/project.md`
  - Active change: `openspec/changes/bootstrap-reunion-platform/`
  - Workflow rules: `openspec/AGENTS.md`
- **CodeGraph:** Code graph index initialized in `.codegraph/` (use for structural symbol & dependency queries).
- **Knowledge Vault:** None configured (all architecture specs live inside `openspec/`).
- **Path-scoped CLAUDE.md:** Subdirectories may include contextual guidance as the codebase scales.
