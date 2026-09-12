# Proposal: High School Silver Year Reunion Platform

## Why
- Alumni from 7 graduating classes (`IPA-1..3`, `IPS-1..4`) need a centralized, mobile-responsive portal to sign up, order custom reunion jerseys, and submit bank transfer proofs for event admission.
- The organizing committee needs structured digital records of payments and jersey sizes rather than fragmented manual messages and lost receipts.
- A shared nostalgic space is needed prior to the event, featuring alumni-contributed photo memories and a live countdown to build excitement.
- The solution must operate with $0 infrastructure overhead, running reliably within Vercel's free Hobby plan quotas.

## What Changes
- Implement multi-provider authentication supporting Credentials (email/password with bcrypt) alongside Google and LinkedIn OAuth via NextAuth/Auth.js with JWT sessions.
- Build a dedicated reunion registration system collecting jersey sizes (`S`, `M`, `L`, `XL`), class group selection, phone number, and bank transfer proof uploaded directly to Vercel Blob.
- Create an authenticated gallery upload pipeline (`/upload`) feeding a public auto-advancing slideshow (`/gallery`) with counter indicators, respecting Vercel image transformation limits.
- Deliver an interactive homepage (`/`) with a real-time event countdown timer component ticking down to the reunion date.
- Establish schema models (`User`, `Account`, `Session`, `Registration`, `Image`) in PostgreSQL managed through Prisma ORM.

## Impact
- **Alumni Experience:** Frictionless onboarding with one-click OAuth or email login, straightforward registration form, instant upload confirmation, and photo gallery preview.
- **Event Operations:** Automated collection and linking of jersey sizes and payment receipts per user, eliminating manual spreadsheet collation errors.
- **Infrastructure & Cost:** 100% compliant with Vercel Hobby tier limits (≤ 4.5 MB payloads, ≤ 5,000 image optimizations, serverless execution limits), incurring zero hosting charges.
