# Site Background Music (autoplay + mute toggle)

## Why

The reunion portal is a nostalgic, celebratory space for alumni. The committee wants "Yura Bandung" playing in the background so the site feels like the event itself — while every visitor must retain an obvious way to silence it (browser autoplay policies require a gesture anyway, and forcing sound on people is hostile).

## What Changes

- A looping background track (`yura_bandung_ori.mp3`, served from `/audio/yura_bandung_ori.mp3`) plays across the whole site, mounted once in the root layout so it continues uninterrupted during client-side navigation.
- Autoplay is attempted on load; when the browser blocks it (no user gesture yet), playback starts muted (always permitted) and the visitor's first pointer/keyboard interaction unmutes it.
- A floating mute/unmute button (bottom-right) lets visitors turn the music off or back on at any time, with a subtle animated indicator while playing.
- **Amendment (2026-10-05):** track swapped to `yura_bandung_ori.mp3` (original `yura_bandung.mp3` asset removed) and autoplay hardened with the muted-start fallback above.

## Impact

- **Complexity:** MID — new client component with browser autoplay-policy edge cases, cross-file integration into the root layout, plus a 6.1 MB static asset.
- **Touches:** `components/BackgroundMusic.tsx` (new), `app/layout.tsx`, `public/audio/yura_bandung_ori.mp3` (asset).
- **Spec:** adds `openspec/changes/feat-background-music/specs/background-music.md`
- **Risk:** low — isolated client component; no data, auth, or API surface. Autoplay attempts that fail silently fall back to gesture-start.
- **Dependencies:** none — uses the native `HTMLAudioElement` and already-installed `lucide-react` icons.
- **Rollback:** standard git revert; removing the component unmounts everything.

## Out of scope (Ponytail trims)

- Persisting the mute preference in localStorage across visits — first-visit default (playing attempt) is acceptable; persistence adds hydration-care surface for marginal value (rung 1).
- Playlist / multiple tracks / volume slider — one looping track is the request (rung 1).
- Streaming the audio from Cloudinary instead of bundling it — static file serving is the framework's job; no new provider (rung 2/3).
- Any new npm dependency — Web APIs cover everything (rung 5).
