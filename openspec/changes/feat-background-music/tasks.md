# Tasks: Site Background Music (autoplay + mute toggle)

**Complexity tier: MID** (per proposal.md)

> Each task below is atomic: one concern, one verify, one commit.

---

## Tasks

- [x] [MID] Add the track asset to public storage
  - File: `public/audio/yura_bandung.mp3` (new, 6.1 MB, 192 kbps)
  - Change: move the committee-provided `yura_bandung.mp3` from the project root into `public/audio/` so it is served at `/audio/yura_bandung.mp3` as a static asset
  - Context: `.vercelignore` does not exclude `public/`; middleware matcher only touches `/registration|/profile|/upload|/admin|/api/admin` — static audio is unaffected
  - Verify: `curl -sI http://localhost:3000/audio/yura_bandung.mp3 | head -3` against the production server
  - Expected: HTTP 200, `Content-Type: audio/mpeg`, `Content-Length: 6357126` (± 6.1 MB) *(verified: 200 OK, audio/mpeg, Content-Length 6364844)*
  - Commit: `feat(music): add yura bandung background track asset`

- [x] [MID] Build the BackgroundMusic component and mount it site-wide
  - Files: `components/BackgroundMusic.tsx` (new), `app/layout.tsx`
  - Change: client component rendering a hidden looping `<audio src="/audio/yura_bandung.mp3" preload="none" loop />`; on mount attempt `audio.play().catch(() => setNeedsGesture(true))`; when blocked, a one-shot `pointerdown`/`keydown` listener (added in that state, removed on unmount/once playing) starts playback; render a fixed bottom-right toggle with `Volume2`/`VolumeX` icons and a subtle pulsing ring while playing; mount `<BackgroundMusic />` once inside `<body>` in the root layout so playback survives client-side navigation
  - Context: browsers block unmuted autoplay without a user gesture — the gesture fallback is required for `play()` to succeed at all; keep all state changes inside `useEffect`/handlers so the first server and client render match exactly (the site already suppresses hydration on `<html>`/`<body>` for the theme provider, but this component must not need it); style with the existing tailwind palette (stone/teal) and follow `Navbar.tsx` button conventions
  - Verify: `npm run lint && npm run build`
  - Expected: component compiles; no hydration warnings attributable to it; build green *(verified; an initial unused-state lint warning was fixed by deriving the icon purely from playback events)*
  - Commit: `feat(music): autoplay looping track with mute toggle`

- [x] [MID] Verify audio serving and playback behavior end-to-end
  - *(Execution note: vitest is node-only (`vitest.config.mjs`) with no jsdom/happy-dom installed, so the RTL test was replaced by the production-server smoke the task anticipated: fresh `npm run build` + `next start` on a spare port, then HTML-level assertions — audio route 200/audio-mpeg, homepage markup contains `src="/audio/yura_bandung.mp3"`, `preload="none"`, `loop`, and the mute-toggle `aria-label`. Gesture-start and actual audible playback need a real browser; see manual smoke.)*
  - Files: `__tests__/background-music.test.tsx` (new), production-server smoke
  - Change: add a React Testing Library test rendering `BackgroundMusic` with a mocked `HTMLMediaElement.play` — asserts (1) it calls `play()` on mount, (2) falls back to a gesture-start when play rejects, (3) toggling pauses/resumes via the button; then smoke the built app: `npm run build && npm run start` in background, curl `/audio/yura_bandung.mp3` headers, curl `/` and grep for the audio element src
  - Context: vitest is node-only in this repo per the feat-elevated-homepage amendment, but `@testing-library/react@16` + jsdom-style mocks are already devDependencies — confirm a DOM environment is available, and if vitest runs node-only, verify the gesture fallback via the prod-server smoke instead (check the page HTML contains the component markup)
  - Verify: `npx vitest run __tests__/background-music.test.tsx && npm run build && npm run start` + curl checks
  - Expected: tests green (or smoke-equivalent if node-only), `/audio/yura_bandung.mp3` returns 200 audio/mpeg, homepage HTML includes the audio element and toggle
  - Commit: `test(music): cover autoplay fallback and mute toggle`

- [x] [LOW] Amendment (2026-10-05): swap track to `yura_bandung_ori.mp3` and harden autoplay
  - Files: `components/BackgroundMusic.tsx`, `public/audio/yura_bandung_ori.mp3` (new asset, 5.8 MB), `public/audio/yura_bandung.mp3` (removed), `specs/background-music.md`, `proposal.md`
  - Change: repoint `TRACK_SRC` to `/audio/yura_bandung_ori.mp3`; when the audible autoplay attempt rejects, fall back to muted playback so the track is live from page load (on browsers that permit it), then unmute on the visitor's first pointer/keyboard interaction; stale autoplay rejections must not mute gesture-started playback; gesture events targeting the toggle button are ignored (the button keeps its own pause/resume meaning) and page gestures never restart music the visitor explicitly paused via the toggle
  - Verify: `npm run lint && npx vitest run && npm run build && npm run start` + curl checks + real-browser check (headful Chrome via puppeteer-core, installed with `--no-save` and removed after)
  - Expected: lint 0 errors, tests green, `/audio/yura_bandung_ori.mp3` returns 200 audio/mpeg, homepage HTML contains the new `<audio>` src, old asset 404s *(all verified)*; real-browser: on load Chrome (build 140, fresh profile, localhost) rejects both unmuted and muted `play()` with NotAllowedError — load-time sound is browser-blocked, and the muted-start path degrades cleanly to gesture-start; after the first click anywhere the music is audible (media clock advances 1:1), the toggle pauses/resumes, and the user confirmed sound; decision (2026-10-05): keep gesture-start behavior, no welcome overlay
  - Commit: `feat(music): swap track to yura_bandung_ori and muted-start autoplay fallback`

## Verification

- [x] [MID] Full suite: `npm run lint && npm run build && npm test`
  - Expected: all tests green; build compiles with the new component; audio asset included in build output *(verified: 109/109 tests across 17 files, build green, lint 0 errors / 9 pre-existing warnings in unrelated files)*
- [x] [MID] Manual smoke: with sound on, open the site and confirm music starts after first click (if autoplay is blocked), keeps playing while navigating between pages, the bottom-right toggle silences and restores it, and no console errors appear *(server-side portion verified via HTML smoke; audible playback + toggle interaction pending user check in the browser)*
