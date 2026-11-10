# Capability: Doorprize (Fortune Wheel Draw)

## Business Context

The reunion's evening program includes a doorprize draw run live by the committee. The wheel segments are **participants**; the prize to award is chosen by the admin **before** each spin. A participant who wins leaves the wheel, so nobody can win twice. A projector-facing public display lets all alumni follow the draw in real time. Draw correctness (fair selection, one win per person, permanent history) matters because a broken draw destroys on-stage credibility and cannot be re-run.

Operational note: the committee tests the wheel before the event, so a Reset action that clears test draws and participants (keeping prize definitions) is required for a clean live run.

---

## Requirements

### REQ-DW-001: Participant management restricted to verified registrants

The admin console MUST let the admin add participants manually, add all verified registrants in one action, remove a single participant, and remove all participants. The add endpoints MUST only accept users with a registration of status `APPROVED`. Each user MUST appear at most once in the wheel (unique constraint). The admin MUST be able to remove a participant without a draw. Removing all participants MUST keep prize definitions and winner history intact (unlike Reset). The wheel MUST stay legible for a full class list of ~145 names: segment labels scale with the segment count and the layout gives the wheel enough room.

#### Scenario: Eligible participant added

- **Given** a user whose registration status is `APPROVED`
- **When** admin adds them as a participant
- **Then** they appear as a wheel segment and remain eligible for future spins

#### Scenario: Unverified user rejected

- **Given** a user with no registration or with status `PENDING`/`REJECTED`
- **When** admin attempts to add them
- **Then** the request is rejected with a validation error and the wheel is unchanged

#### Scenario: Duplicate participant rejected

- **Given** a user already in the wheel
- **When** admin adds them again
- **Then** the request fails with a conflict response

#### Scenario: Add all verified registrants

- **Given** 145 verified alumni, 10 of whom are already on the wheel
- **When** admin uses "Tambah semua"
- **Then** the remaining 135 are added in one call and the wheel shows 145 names
- **Given** every verified alumni is already on the wheel
- **Then** the action reports 0 added and changes nothing

#### Scenario: Remove one / remove all

- **Given** a wheel with several participants
- **When** admin removes one participant
- **Then** only that segment disappears
- **When** admin confirms "Hapus semua"
- **Then** the wheel is empty while prizes and winner history remain

#### Scenario: 145 names stay readable

- **Given** a wheel holding 145 participants
- **When** the admin console or projector display renders it
- **Then** every name is drawn inside its own slice (labels shrink to the slice arc), not hidden or overlapping, and the layout sizes the wheel as large as the viewport allows

**If broken:** the pool contains ineligible alumni or double entries → selection is unfair; only a subset of alumni can take part. Impact when failing: **MEDIUM**.

---

### REQ-DW-002: Prize management before each spin

The admin console MUST allow creating prizes by name and deleting prizes that have no recorded draws. Prizes MUST remain listed after being won so identical prizes can be awarded in sequence; the admin MUST choose the prize for the next spin before spinning.

#### Scenario: Prize created and selectable

- **Given** admin creates prize "Tumbler Silver"
- **When** they open the spin panel
- **Then** "Tumbler Silver" is available for selection

#### Scenario: Drawn prize protected

- **Given** a prize with at least one recorded draw
- **When** admin deletes it
- **Then** the request is rejected with a conflict response so the history FK stays intact

**If broken:** prize names referenced in history point to deleted records → history becomes unusable for audit. Impact when failing: **LOW**.

---

### REQ-DW-003: Spin selects a random remaining participant and removes them

The spin API MUST uniformly randomly select one of the remaining wheel participants, record an immutable draw (winner user + selected prize + timestamp), and remove the participant from the wheel — all in one transaction. A spin against an empty wheel MUST fail with a 400 error. Past winners MUST NOT be eligible for further spins. The admin wheel UI MUST visualize segments for the current remaining participants and land on the selected winner.

#### Scenario: Correct draw

- **Given** a wheel with 5 participants and a selected prize
- **When** admin spins
- **Then** exactly one remaining participant wins, a draw record is created, the winner is removed from the wheel, and the wheel UI lands on them

#### Scenario: Winner cannot win again

- **Given** a participant that already won earlier in the session
- **When** a subsequent spin happens
- **Then** that participant is not selectable and is not on the wheel

#### Scenario: Empty wheel

- **Given** no participants remain
- **When** admin spins
- **Then** the API responds 400 with a "wheel set is empty" error and no draw is recorded

#### Scenario: Transaction is all-or-nothing

- **Given** a draw attempt
- **When** either the draw insertion or still-valid participant removal fails
- **Then** neither record is changed, keeping the wheel consistent

**If broken:** a participant wins twice, history misrecords prize/winner, or the wheel gets stuck — the on-stage draw is interrupted with no workaround. Impact when failing: **CRITICAL** for this capability (though overall product severity stays MEDIUM, registration and questionnaire flows are unaffected).

---

### REQ-DW-004: Winner history and reset for pre-event testing

The admin console MUST list all draws (winner, prize, time, newest first). A Reset action MUST clear all draws and remove all participants from the wheel in one confirmed operation, while keeping prize definitions intact, and requires admin confirmation.

#### Scenario: History visible

- **Given** several completed draws
- **When** admin opens the winner list
- **Then** all draws show winner name, prize name, and time in chronological descending order

#### Scenario: Reset clears state but keeps prizes

- **Given** test data present from a rehearsal
- **When** admin confirms Reset
- **Then** draws and participants are cleared, and prizes must be re-usable in the live round
- **Given** admin cancels the confirmation
- **Then** data is kept

**If broken:** committee cannot void rehearsal data → the live event starts with a polluted history or the wheel can't be refilled. Impact when failing: **MEDIUM**.

---

### REQ-DW-005: Public projector display

A public page `/display/doorprize` (no authentication, no interactive controls) MUST show the remaining participants and announce the newest winner with a landed wheel. It MUST stay in sync by polling a public read-only API on a short interval (~3 s) and refetch when the tab becomes visible again. The API MUST expose the same data without admin-privileged mutations.

#### Scenario: Display follows the draw

- **Given** the projector shows `/display/doorprize` with 5 participants
- **When** the admin spins and a winner is recorded
- **Then** within a polling interval the display shows the landed wheel on the actual winner and enlarges the announcement

#### Scenario: No privileged leverage

- **Given** an unauthenticated party discovers the display API
- **When** they call GET `/api/display/doorprize`
- **Then** they read only non-sensitive wheel state; no mutation endpoint exists at that path

**If broken:** audience misses the draw result or reads a stale list. Impact when failing: **MEDIUM**.

---

## Out of scope

- Multiple concurrent wheels or sessions; one wheel is enough for the event
- Editing participant/prize names in place (delete + re-add instead)
- Undo of an individual draw → covered by REQ-DW-004 Reset
- Realtime push (SSE/WebSocket) for display sync → polling approximates it
- Self-service participant entry (QR etc.), probability weighting, audio/celebration effects, CSV export
