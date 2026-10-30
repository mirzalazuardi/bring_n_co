# Doorprize Fortune Wheel (Undian Hadiah)

## Why

The reunion event includes a live doorprize draw. The committee needs a visible, auditable way to spin and award prizes to alumni during the event: a fortune wheel whose segments are **participants** (not prizes — the committee picks the prize before each spin). After a participant wins, they leave the wheel so nobody wins twice. Today the portal has registration, gallery, and questionnaire, but no draw tooling — the committee would have to improvise with paper slips.

## What Changes (observable behavior)

- Two new entities in Prisma, additive:
  - `WheelPrize` — name managed in admin (create/delete). Prizes stay listed after being won (the same prize may be swept repeatedly; duplicate identical prizes are fine).
  - `WheelParticipant` — admin adds **manually** from a pick list of users that have a registration with status `APPROVED`; unique per user. Deleted (removed from the wheel) the moment they win.
  - `WheelDraw` — immutable history: winner (user), prize, drawn-at. Created in one transaction with the participant removal.
- Admin console page `/admin/doorprize`:
  - Manage participants (add from verified-only picker, remove by hand).
  - Manage prizes (add name, delete when unused).
  - Select a prize, spin the wheel → server picks a uniformly random remaining participant, records the draw, removes the participant; wheel lands on the winner.
  - Winner history list + reset action to clear participants & history (for committee pre-event testing) while prizes stay.
- Public display page `/display/doorprize` (no login) for the projector: shows the remaining participants as wheel segments and announces the newest winner, kept in sync by polling every ~3 s from a public read-only API.

## Dual-POV Analysis

### Business POV

- **User impact:** committee gets a turnkey on-stage draw tool; alumni see a fair, transparent draw (server-side randomness, public display). If broken at the event night, the doorprize session has **no workaround** on stage.
- **Business impact:** standalone feature; core flows (registration, gallery, questionnaire) untouched. Deadline: must be usable before the reunion event; no external dependency.
- **Priority:** nice-to-have for the portal's daily use, must-have for the evening program. Treated as must-have because its value is concentrated in one unrepeatable night.
- **Rollback cost:** low — additive tables with no existing data, standard revert + migration drop.

> **Issue severity: MEDIUM**
> Reason: new standalone event feature; if it fails, the doorprize session is badly degraded on-stage with no in-event workaround, but the platform's core flows are untouched.

### Technical POV

- **Complexity tier:** MID — schema migration + guarded admin API + admin UI + one public read-only polling page; no unfamiliar integrations.
- **Blast radius (impact analysis):** 0 existing callers modified; 3 subsystems touched (Prisma schema, admin API/admin console, one new public display page). `app/admin/page.tsx` gains a link only, mirroring the questionnaire precedent.
- **Risk:** what could fail silently — a stale display screen after network hiccups (mitigated by polling + re-fetch on visibility) — and double-spin races (mitigated by a single transaction that picks, records, and deletes). Rollback: revert + drop new tables.
- **Debt:** neutral — additive models, no changes to existing tables, no new dependency beyond none.

### Tension

Business wants the big-screen wheel to animate in perfect sync with the operator's spin; technically that would need realtime (SSE/WebSocket). Resolution: the draw **result** is the business truth and is synced by 3-second polling; the display animation is a cosmetic approximation that lands on the actual winner. Accepted by both POVs.

### Ponytail (business level)

Kept only what clears the ladder:
- Trim: real-time display sync (polling suffices), multiple concurrent wheels (one wheel), weighted/probability config (uniform), auto-advancing prize queue (admin picks manually), undo-last-draw (reset covers the test-data case), CSV export of winners, lottery-fee/ticket logic.
- Existing product solves none of this (no draw feature exists), and a simpler version (admin page + polling display) satisfies the on-stage need.

## Impact

- **Touches:** `prisma/schema.prisma` + migration, `lib/validations/doorprize.ts`, `lib/admin/doorprize.ts`, `app/api/admin/wheel/*`, `app/api/display/doorprize/route.ts`, `app/admin/doorprize/page.tsx`, `components/AdminDoorprize*.tsx`, `app/display/doorprize/page.tsx`, `components/DoorprizeDisplay.tsx`, `app/admin/page.tsx` (link), `__tests__/doorprize.test.ts`.
- **Dependencies:** none new — wheel rendered with CSS transform rotation on conic-gradient segments; rendering and random pick are standard library/platform.
- **Spec:** `openspec/changes/feat-doorprize-wheel/specs/doorprize.md` (capability `doorprize`).
- **Risk:** transactional spin is the only multi-write path; everything else is CRUD.

## Out of scope

- Multiple wheels / separate sessions per prize batch
- Undo of a single draw (committee uses Reset if a test spin must be voided)
- Editing a participant or prize name in place (delete + re-add)
- Realtime (SSE/WebSocket) display sync; QR or self-service entry for alumni
- Sound/celebration effects beyond simple UI feedback
