# Silver Reunion Portal

A production-ready high school silver year (25th) reunion web application built with Next.js (App Router), TypeScript, Prisma ORM, NextAuth/Auth.js, and Vercel Blob, architected to run strictly within Vercel's free Hobby plan.

## Features
- **Multi-Provider Authentication:** Email/password (bcrypt), Google OAuth, and LinkedIn OAuth with JWT sessions.
- **Reunion Registration Form:** Alumni profile registration collecting jersey size (`S`, `M`, `L`, `XL`), class group (`IPA-1..3`, `IPS-1..4`), phone number, and bank transfer proof upload to Vercel Blob.
- **Community Photo Gallery:** Authenticated image uploads (`/upload`) and an auto-advancing slideshow (`/gallery`) with a real-time counter indicator.
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
npx prisma db push
# or run migrations:
# npx prisma migrate dev --name init
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

## Deployment to Vercel
1. Push your repository to GitHub or GitLab.
2. Import the project into the [Vercel Dashboard](https://vercel.com).
3. Add all environment variables from `.env.local` to Vercel Settings > Environment Variables.
4. Attach a Vercel Blob store under Storage.
5. Deploy.
