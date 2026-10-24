# Capability: Questionnaire (Kuesioner)

## Purpose

Kuesioner untuk alumni yang diisi via QR menuju halaman web, dengan pertanyaan multiple choice / skala range / teks bebas, kontrol akses yang bisa di-toggle dari admin, dan laporan statistik yang bisa dipublikasikan.

---

## Requirements

### REQ-QR-001: Tipe pertanyaan dan opsi yang bisa dikustomisasi

The system MUST store per question: type (`CHOICE`, `SCALE`, `TEXT`), label, required flag, and options — for `CHOICE` a list of custom option values (default 1–5, 2–10 items, values editable), for `SCALE` a min/max pair (default 1–5) rendered as a range UI, and for `TEXT` no extra options.

#### Scenario: Multiple choice dengan opsi custom

- **Given** admin menambah pertanyaan `CHOICE`
- **When** mereka mengubah opsi menjadi mis. `["Hadir", "Tidak hadir"]` dengan jumlah 2
- **Then** form publik merender radio untuk tepat opsi itu, dan hanya nilai di daftar opsi yang diterima saat submit

#### Scenario: Skala default 1–5

- **Given** pertanyaan `SCALE` tanpa min/max kustom
- **When** alumni isi form
- **Then** slider menampilkan rentang 1–5 dan hanya nilai di rentang itu yang diterima

---

### REQ-QR-002: Entry via QR dengan gate yang bisa di-toggle

Each questionnaire MUST have an admin-visible QR code pointing to `/kuesioner/[id]`. Access MUST be limited to logged-in users; when `requireVerified` is on, users additionally MUST have a registration with status `APPROVED` (toggle off → any logged-in user). Unauthenticated users MUST be redirected to `/login` with a callback URL.

#### Scenario: Alumni terverifikasi scan QR

- **Given** kuesioner dengan `requireVerified` aktif
- **When** user login dengan pendaftaran `APPROVED` membuka URL QR
- **Then** form kuesioner tampil dan bisa dikirim

#### Scenario: Belum login

- **Given** user belum login membuka URL QR
- **When** halaman diakses
- **Then** redirect ke `/login?callbackUrl=/kuesioner/<id>`; setelah login kembali ke form

#### Scenario: Pendaftaran belum diverifikasi

- **Given** `requireVerified` aktif dan user login tapi pendaftarannya `PENDING`
- **Then** form tidak tampil; halaman menampilkan pesan bahwa jawaban bisa diisi setelah pendaftaran diverifikasi

---

### REQ-QR-003: Submit dan koreksi jawaban

The submit API MUST validate the questionnaire is open, gate the user per REQ-QR-002, and validate each answer against its question type. A user MUST be able to resubmit; the latest submission replaces their stored answers per question.

#### Scenario: Jawaban valid tersimpan

- **Given** kuesioner `isOpen`
- **When** user mengirim jawaban valid untuk semua pertanyaan wajib
- **Then** jawaban tersimpan dan submit ulang memperbarui nilai yang sama tanpa duplikat

#### Scenario: Payload tidak valid ditolak

- **When** jawaban menggunakan opsi di luar daftar, angka di luar rentang skala, teks >2000 karakter, atau pertanyaan wajib kosong
- **Then** API merespons 400 dengan pesan validasi, tanpa menyimpan

#### Scenario: Kuesioner ditutup

- **Given** `isOpen` dinonaktifkan admin
- **When** submit dikirim
- **Then** API merespons 403 dan halaman menampilkan status kuesioner ditutup

---

### REQ-QR-004: Laporan statistik admin dan publikasi hasil

The admin console MUST show per-question aggregate stats: counts per `CHOICE` option, `SCALE` average plus per-value distribution, and the list of `TEXT` answers. Publishing MUST be controlled by `resultsPublished`: when on, `/kuesioner/[id]/hasil` shows the aggregate report without respondent names; when off, the results page shows a "belum dipublikasikan" notice.

#### Scenario: Statistik pilihan

- **Given** pertanyaan `CHOICE` dengan jawaban 10 pengisi
- **When** admin membuka laporan
- **Then** tiap opsi menampilkan jumlah dan persentase

#### Scenario: Hasil dipublikasikan

- **Given** `resultsPublished` aktif
- **When** siapa pun membuka `/kuesioner/<id>/hasil`
- **Then** rekap agregat tampil tanpa nama pengisi

#### Scenario: Hasil belum dipublikasikan

- **Given** `resultsPublished` nonaktif
- **When** halaman hasil diakses
- **Then** halaman menampilkan pesan bahwa hasil belum dipublikasikan

---

## Out of scope

- Edit judul/deskripsi kuesioner yang sudah dibuat (buang baru, buat lagi)
- Ekspor jawaban ke Excel
- Anonymous fill tanpa login
- Beberapa kuesioner bertingkat / dependency antar pertanyaan
