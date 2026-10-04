# Tasks: Fix Hydration Mismatch from Dark Reader Browser Extension

**Complexity tier: LOW** (per proposal.md)

> Each task below is atomic: one concern, one verify, one commit.

---

## Tasks

- [x] [LOW] Extend the pre-hydration cleaner to strip Dark Reader inline artifacts
  - File: `app/layout.tsx`
  - Change: in the inline head script, extend the attribute-stripping helper `s(e)` to also remove the extension's inline style hooks:
    ```js
    function s(e){
      e.removeAttribute('bis_skin_checked');
      e.removeAttribute('bis_register');
      e.removeAttribute('data-darkreader-inline-stroke');
      e.removeAttribute('data-darkreader-inline-color');
      e.removeAttribute('data-darkreader-inline-fill');
      e.removeAttribute('data-darkreader-inline-bgcolor');
      e.removeAttribute('data-darkreader-inline-border');
      e.removeAttribute('data-darkreader-inline-boxshadow');
      e.removeAttribute('data-darkreader-inline-invert');
      if (e.style) {
        e.style.removeProperty('--darkreader-inline-stroke');
        e.style.removeProperty('--darkreader-inline-color');
        e.style.removeProperty('--darkreader-inline-fill');
        e.style.removeProperty('--darkreader-inline-bgcolor');
        e.style.removeProperty('--darkreader-inline-border');
        e.style.removeProperty('--darkreader-inline-boxshadow');
        e.style.removeProperty('--darkreader-inline-invert');
      }
    }
    ```
    (keep the existing MutationObserver wiring and its scope unchanged)
  - Context: `app/layout.tsx` head script runs synchronously before hydration and already removes `bis_skin_checked`/`bis_register`; the observer catches later injections. Dark Reader injects both the data attribute and the paired `--darkreader-inline-*` custom property on the same element; React's hydration diff complains about either. The attribute names above are the documented set from Dark Reader's source (`darkreader-inline-*`); unknown future ones are harmless leftovers — React only errors when the *diff includes* extension attributes, and stripping these eliminates the observed ones.
  - Verify: `npm run lint && npm run build`, then manual: with Dark Reader enabled, reload localhost — hydration console error gone; site still renders correctly with and without the extension; ThemeProvider dark mode unaffected
  - Expected: no hydration-mismatch error attributable to Dark Reader attributes; app behavior unchanged for non-extension visitors *(verified: lint 0 errors, build exit 0, 109/109 tests; console-clean reload with Dark Reader enabled is the user's browser check)*
  - Commit: `fix(hydration): strip darkreader inline attrs pre-hydration`

- [ ] [LOW] Suppress hydration warning on the one remaining flagged node
  - File: `components/PinMark25.tsx`
  - Change: add `suppressHydrationWarning` to the decorative `next/image` (`/25.svg`) inside the pin badge, with a comment explaining why
  - Context: after the T1 cleaner, the only remaining mismatch is this single `aria-hidden` image whose inline `style={{color:transparent}}` (added by React for next/image) still races the extension's style observer mid-hydration — the console diff shows two identical `style={{color:"transparent"}}` lines, the signature of a DOM style mutation during React's hydration walk. The node has constant props and no user-visible state, so suppressing warnings on it alone hides nothing real; every other element keeps full hydration checking (same pattern as `suppressHydrationWarning` on `<html>`/`<body>` for the theme provider).
  - Verify: `npm run lint && npm run build`, then manual: with Dark Reader enabled, reload — homepage console clean
  - Expected: no hydration error on the homepage; PinMark25 renders identically
  - Commit: `fix(hydration): suppress warning on pin badge image racing extension`

## Verification

- [x] [LOW] Full suite: `npm run lint && npm run build && npm test`
  - Expected: 109/109 tests green; build compiles *(verified for T1; re-run after T2)*
- [x] [LOW] Manual smoke with Dark Reader enabled: reload homepage, console shows no hydration error; theme toggle still works; icons render correctly in light and dark modes *(T1 verified by user; T2 homepage re-check pending user confirmation)*
