# Questionnaire (Kuesioner) dengan QR Entry & Statistik

## Why

Panitia perlu survei kuesioner (quiz) untuk alumni — misalnya preferensi acara, konfirmasi kehadiran, atau masukan menu makan — yang mudah diisi dari HP lewat scan QR, sekaligus laporan rekap jawaban di konsol admin. Saat ini portal hanya punya pendaftaran + galeri, tidak ada fitur survei.

## What Changes

- Model Prisma baru: `Questionnaire` (judul/deskripsi + toggle `isOpen`, `requireVerified`, `resultsPublished`), `QuestionnaireQuestion` (tipe `CHOICE`, `SCALE`, `TEXT`), `QuestionnaireAnswer` (satu jawaban per user per pertanyaan, bisa dikoreksi dengan submit ulang).
- Tipe pertanyaan:
  - `CHOICE` — multiple choice; opsi default 1–5, jumlah dan nilai opsi bisa dikustomisasi admin (2–10 opsi).
  - `SCALE` — UI slider/range (default 1–5, min/max bisa diatur).
  - `TEXT` — teks bebas.
- Halaman publik `/kuesioner` (daftar kuesioner aktif) dan `/kuesioner/[id]` (form isi, termasuk koreksi jawaban lama).
- QR per kuesioner (SVG server-side via paket `qrcode`) yang mengarah ke `/kuesioner/[id]`, ditampilkan di konsol admin.
- Gate akses bisa di-toggle admin: `requireVerified` aktif → hanya user login dengan pendaftaran status `APPROVED`; nonaktif → semua user yang login. Belum login → redirect ke `/login` dengan callbackUrl.
- API submit publik `POST /api/questionnaires/[id]/submit` dengan validasi Zod per tipe pertanyaan; hanya kuesioner `isOpen` yang menerima jawaban.
- Konsol admin `/admin/kuesioner`: buat/hapus kuesioner, toggle `isOpen`/`requireVerified`/`resultsPublished`, builder pertanyaan, QR, dan laporan statistik (distribusi per opsi, rata-rata skala, daftar jawaban teks). `resultsPublished` aktif → halaman `/kuesioner/[id]/hasil` menampilkan rekap agregat publik (tanpa nama pengisi); nonaktif → halaman menampilkan status "belum dipublikasikan".

## Impact

- **Complexity:** MID — schema migration (additive), API baru (admin + publik), 3 halaman publik, 2 halaman admin, komponen form/builder.
- **Touches:** `prisma/schema.prisma` + migration, `lib/validations/questionnaire.ts`, `lib/questionnaire/*`, `app/api/admin/questionnaires/*`, `app/api/questionnaires/*`, `app/kuesioner/*`, `app/admin/kuesioner/*`, `components/*` baru, `components/Navbar.tsx`, `app/admin/page.tsx`.
- **Dependencies:** `qrcode` (+ `@types/qrcode` dev) untuk generate QR SVG server-side — dipilih karena tanpa layanan eksternal, tanpa API key, murni library lokal di Node.
- **Risk:** rendah — model baru tidak menyentuh tabel existing; Navbar & admin console hanya mendapat tautan tambahan.
- **Rollback:** standard git revert + migration drop (tabel baru, tidak ada data existing).
