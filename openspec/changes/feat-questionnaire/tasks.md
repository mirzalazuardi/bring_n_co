# Tasks: Questionnaire (Kuesioner) dengan QR Entry & Statistik

**Complexity tier: MID** (per proposal.md)

---

## Tasks

- [x] [MID] Schema Prisma + migration additive
  - File: `prisma/schema.prisma`, `prisma/migrations/<ts>_questionnaire/migration.sql`
  - Change: enum `QuestionnaireQuestionType`, model `Questionnaire`/`QuestionnaireQuestion`/`QuestionnaireAnswer`, relasi ke `User`
  - Verify: `npx prisma migrate deploy` + `npx prisma generate`

- [x] [MID] Validasi & helper murni
  - File: `lib/validations/questionnaire.ts`, `lib/questionnaire/access.ts`, `lib/questionnaire/stats.ts`, `lib/questionnaire/url.ts`
  - Change: schema pertanyaan admin (`CHOICE` 2–10 opsi custom bisa pakai default 1–5, `SCALE` {min,max}, `TEXT`), schema submit, checker jawaban per tipe, agregasi statistik, gate akses, builder URL QR
  - Verify: unit test

- [x] [MID] Dependensi `qrcode`
  - Change: `npm install qrcode` + `@types/qrcode`
  - Verify: route QR produce SVG string

- [x] [MID] API admin `/api/admin/questionnaires/*`
  - Files: `route.ts` (GET/POST), `[id]/route.ts` (GET/PATCH/DELETE), `[id]/questions/route.ts` (PUT), `[id]/stats/route.ts` (GET), `[id]/qr/route.ts` (GET SVG)
  - Change: guard `requireAdmin`, validasi Zod, guardhapus data jawaban ikut cascade
  - Verify: `npm run build`

- [x] [MID] API publik `POST /api/questionnaires/[id]/submit`
  - File: `app/api/questionnaires/[id]/submit/route.ts`
  - Change: session check, gate `requireVerified`, validasi jawaban per tipe, upsert transaksional (koreksi jawaban lama didukung)
  - Verify: manual + unit test checker

- [x] [MID] Halaman publik
  - Files: `app/kuesioner/page.tsx`, `app/kuesioner/[id]/page.tsx`, `app/kuesioner/[id]/hasil/page.tsx`, `components/QuestionnaireForm.tsx`
  - Change: daftar kuesioner aktif, form isi (radio CHOICE, range SCALE, textarea TEXT), halaman hasil publik mematuhi `resultsPublished`
  - Verify: manual smoke

- [x] [MID] Konsol admin `/admin/kuesioner`
  - Files: `app/admin/kuesioner/page.tsx`, `app/admin/kuesioner/[id]/page.tsx`, `components/AdminQuestionnaireList.tsx`, `components/AdminQuestionnaireEditor.tsx`, `components/AdminQuestionnaireStats.tsx`, tombol di `app/admin/page.tsx`
  - Change: list + create + toggle 3 switch + QR, editor pertanyaan, laporan statistik
  - Verify: manual smoke pada `/admin/kuesioner`

- [x] [MID] Menu Navbar
  - File: `components/Navbar.tsx`
  - Change: tautan desktop + mobile `Kuesioner` (selalu tampil; gating di halaman)
  - Verify: visual saat build dev

- [x] [MID] Test Vitest
  - File: `__tests__/questionnaire.test.ts`
  - Change: schema validasi, checker jawaban, gate akses, agregasi statistik, URL QR
  - Verify: `npm test`

## Verification

- [x] `npm test` (137/137, termasuk 24 test baru), `npm run lint` (0 errors, 10 pre-existing warnings), `npm run build` (green), `npx prisma migrate deploy` (20261024000000_questionnaire applied — tabel di Neon verified)
