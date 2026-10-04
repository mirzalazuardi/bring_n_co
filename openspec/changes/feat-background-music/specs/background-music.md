# Capability: Background Music

## Purpose

Gives the reunion portal a continuous, celebratory soundtrack ("Yura Bandung") that autoplays when the browser allows it, starts on the visitor's first interaction otherwise, and can always be silenced via a visible control.

---

## Requirements

### REQ-MUSIC-001: Site-wide looping track with autoplay attempt

Every page MUST include a single looping `<audio>` element pointing at `/audio/yura_bandung.mp3` with `preload="none"`. The component MUST attempt autoplay on mount and MUST start playback on the visitor's first pointer or keyboard interaction if the browser blocked the autoplay attempt.

#### Scenario: Autoplay permitted by browser

- **Given** a visitor opens any page of the portal
- **When** the browser's autoplay policy permits playback without a gesture
- **Then** the track starts playing automatically and loops continuously

#### Scenario: Autoplay blocked until first interaction

- **Given** a visitor opens any page in a browser that blocks autoplay without a gesture
- **When** they have not interacted with the page yet
- **Then** no audio plays and no error surfaces in the console
- **When** they click or press any key anywhere on the page
- **Then** the track starts playing and loops continuously

---

### REQ-MUSIC-002: Always-available mute control

A floating toggle button MUST be visible on every page, letting the visitor stop or resume the music at any time, with a visual indicator of the current state.

#### Scenario: Visitor mutes the music

- **Given** the background track is playing
- **When** the visitor activates the floating music toggle
- **Then** playback stops immediately and the button shows the muted state

#### Scenario: Visitor resumes the music

- **Given** the visitor has muted the track
- **When** they activate the toggle again
- **Then** playback resumes from where it stopped and the button shows the playing state

#### Scenario: Music continues across navigation

- **Given** the track is playing
- **When** the visitor navigates between pages via client-side navigation
- **Then** playback continues without restarting or dropping

---

### REQ-MUSIC-003: No hydration or layout regressions

The music component MUST render identical markup on server and first client render, and MUST NOT introduce console errors or shift page layout.

#### Scenario: Deterministic first render

- **Given** any page is server-rendered and then hydrated
- **When** React hydrates the page with the music component mounted
- **Then** no hydration mismatch is reported (initial state is identical on server and client; state changes only after mount)

---

## Out of scope

- Persisting mute preference across visits
- Playlists, volume sliders, or track selection
- External audio hosting
