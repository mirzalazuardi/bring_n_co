# Capability: Background Music

## Purpose

Gives the reunion portal a continuous, celebratory soundtrack ("Yura Bandung") that autoplays when the browser allows it, starts on the visitor's first interaction otherwise, and can always be silenced via a visible control.

---

## Requirements

### REQ-MUSIC-001: Site-wide looping track with autoplay attempt

Every page MUST include a single looping `<audio>` element pointing at `/audio/yura_bandung_ori.mp3` with `preload="none"`. The component MUST attempt audible autoplay on mount; if the browser blocks it, it MUST fall back to muted playback (permitted on most browsers — some builds reject even muted autoplay, in which case playback starts on the first interaction) and MUST unmute on the visitor's first pointer or keyboard interaction. Page gestures MUST NOT restart the music after the visitor paused it via the toggle.

#### Scenario: Autoplay permitted by browser

- **Given** a visitor opens any page of the portal
- **When** the browser's autoplay policy permits playback without a gesture
- **Then** the track starts playing automatically (audible) and loops continuously

#### Scenario: Autoplay blocked — muted start, unmuted on first interaction

- **Given** a visitor opens any page in a browser that blocks audible autoplay without a gesture
- **When** they have not interacted with the page yet
- **Then** the track is playing muted (no audible sound, no console errors) and the toggle shows the muted state
- **When** they click or press any key anywhere on the page (other than the toggle button)
- **Then** the track unmutes instantly and continues looping audibly

#### Scenario: Explicit mute is respected

- **Given** the visitor paused or muted the track via the floating toggle
- **When** they interact with the page afterwards
- **Then** the music stays off until they reactivate the toggle

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
