# Tasks: Doorprize Fortune Wheel

**Complexity tier: MID** (per proposal.md)

---

## Tasks

- [x] [MID] Prisma schema + additive migration
  - File: `prisma/schema.prisma`, `prisma/migrations/<ts>_doorprize_wheel/migration.sql`
  - Change: models `WheelPrize` (name + unique), `WheelParticipant` (unique `userId` FK, cascade), `WheelDraw` (FK prize, FK user, `drawnAt`); relations to `User`
  - Verify: `npx prisma generate` + `npx prisma migrate deploy`
  - Biz impact: database layer missing → whole feature dead on arrival

- [x] [MID] Validation schemas + wheel service (pure logic)
  - Files: `lib/validations/doorprize.ts`, `lib/admin/doorprize.ts`
  - Change: Zod schemas (create prize, add participant for verified user) + service: list verified-eligible users, uniform random pick among remaining, transactional `draw(prizeId)` (insert `WheelDraw` + delete `WheelParticipant`), reset (clear draws + participants)
  - Verify: Vitest unit tests (pick excludes past winners, empty wheel error, reset clears)
  - Biz impact: draw logic wrong / non-random / double-win possible → draw fairness destroyed, on-stage credibility loss

- [x] [MID] Admin API `/api/admin/wheel/*`
  - Files: `state/route.ts` (GET snapshot incl. history), `prizes/route.ts` (POST), `prizes/[id]/route.ts` (DELETE, 409 when drawn), `participants/route.ts` (GET eligible, POST), `participants/[id]/route.ts` (DELETE), `spin/route.ts` (POST prizeId), `reset/route.ts` (POST)
  - Change: `requireAdmin` guard, Zod validation, unique-participant conflict → 409, empty wheel → 400
  - Verify: route handler tests / `npm run build`
  - Biz impact: unguarded API lets anyone rig the draw or wipe participants

- [x] [MID] Admin console `/admin/doorprize`
  - Files: `app/admin/doorprize/page.tsx`, `components/AdminDoorprizeManager.tsx`, `components/FortuneWheel.tsx`
  - Change: verified-only participant picker, prize manager, prize select + spin button, CSS conic-gradient wheel whose segments are current participants and lands on winner, winner history, reset button with confirm
  - Verify: manual smoke on `/admin/doorprize`
  - Biz impact: operator cannot run the event-night draw

- [x] [LOW] Admin console link
  - File: `app/admin/page.tsx`
  - Change: card/button `Doorprize` mirroring questionnaire precedent
  - Verify: visual check
  - Biz impact: feature hidden → committee can't find it

- [x] [MID] Public display page `/display/doorprize` + public read API
  - Files: `app/api/display/doorprize/route.ts`, `app/display/doorprize/page.tsx`, `components/DoorprizeDisplay.tsx`
  - Change: public GET returns remaining participants + recent draws; read-only client page (no auth, no controls) renders live wheel and announces newest winner; polls every ~3 s, refetch on visibility
  - Verify: manual smoke + build
  - Biz impact: projector page broken → alumni can't follow the draw, transparency goal lost

- [x] [MID] Vitest coverage
  - File: `__tests__/doorprize.test.ts`
  - Change: Zod schemas, verified-eligibility filtering, pick/dispatch logic, conflict & empty cases
  - Verify: `npm test`
  - Biz impact: regressions ship to the unrepeatable event night undetected

## Verification

- [x] `npm test` — 145/145 green (19 files, incl. 8 new doorprize tests)
- [x] `npm run lint` — 0 errors, 11 pre-existing/accepted warnings (10 baseline + 1 `react-hooks/set-state-in-effect` in FortuneWheel, same pattern as EventCountdown/ThemeProvider)
- [x] `npm run build` — green; routes `/admin/doorprize`, `/display/doorprize`, `/api/display/doorprize` emitted
- [x] `npx prisma migrate deploy` — `20261028000000_doorprize_wheel` applied (Neon, `migrate status` up to date)
- [x] Manual smoke (`next start`, 2026-10-30): spin 401 unauthenticated ✓ · create prize 201 ✓ · add unverified participant 400 ✓ · duplicate participant 409 ✓ · spin → winner recorded & removed from wheel ✓ · empty-wheel spin 400 ✓ · delete drawn prize 409 (after fix) ✓ · public display API shows latest winner ✓ · reset clears draws+participants ✓ · DB left clean

## Notes

- Fix during smoke: `deletePrize` returned 500 instead of 409 for drawn prizes — Prisma surfaces the FK violation as `PrismaClientUnknownRequestError` (no `code`) against Neon. Fixed with an application-level draw count check before delete (FK Restrict remains the last line of defense).
