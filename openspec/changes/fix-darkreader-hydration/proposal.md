# Fix: Hydration Mismatch from Dark Reader Browser Extension

## Why

Visitors using the Dark Reader extension (or similar dark-mode/style-injecting extensions) trigger a React hydration-mismatch console error on every page: the extension adds `data-darkreader-inline-*` attributes and `--darkreader-inline-*` inline style properties to SVGs/images before React hydrates, so the client DOM no longer matches the server HTML. The portal already carries a pre-hydration DOM cleaner (`StripBrowserExtensions` + the inline head script in `app/layout.tsx`) that neutralizes Bing's `bis_skin_checked` artifacts; Dark Reader belongs to the same class of problem.

## What Changes

- The existing pre-hydration head script in `app/layout.tsx` additionally removes `data-darkreader-inline-*` attributes and `--darkreader-inline-*` inline style custom properties (both in the initial synchronous pass and in its MutationObserver pass), so React hydrates against a DOM that matches the server render.
- No component markup changes; the app's own dark mode (ThemeProvider) is unaffected — the extension's global stylesheet still applies for users who keep it enabled.

## Impact

- **Complexity:** LOW — single-file edit of an existing inline script; no new state, deps, or interfaces.
- **Touches:** `app/layout.tsx` (inline script only).
- **Spec:** none added — behavior is "no console hydration error for extension users," verified manually; this proposal documents the fix per the fix-* precedent (fix-dangling-symlink-vercel).
- **Risk:** low — the cleaner only removes attributes/properties that exist (no-op for visitors without the extension); removal is self-terminating in the observer (second pass finds nothing to remove). Cosmetic fallback for Dark Reader users: extension-inlined icon colors revert to `currentColor`, which the site's own dark mode already themes correctly.
- **Dependencies:** none.
- **Rollback:** standard git revert.

## Out of scope

- `suppressHydrationWarning` on every icon element — masks real hydration bugs across the whole tree.
- Supporting arbitrary extensions' mutations beyond the established pattern (Bing `bis_*`, Dark Reader `--darkreader-inline-*`).
- Asking users to disable Dark Reader — kept as the alternative, not a requirement.
