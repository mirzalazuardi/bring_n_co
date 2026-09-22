# Fix Vercel Build Failure: Dangling Tracked Symlink `ai-agent_docs`

## Why

After the eslint peer-conflict fix (`063a40c`), installs succeeded but `next build` failed on Vercel with:

```
Error: ENOENT: no such file or directory, stat '/vercel/path0/ai-agent_docs'
```

**Root cause (reproduced exactly):** git tracked a **symlink** `ai-agent_docs -> /Users/hermawan/src/ai-agent_docs` — an absolute path that only exists on the developer's Mac. Vercel's clone restores the symlink with a dangling target; Next.js 16 (Turbopack) `stat()`s project-root entries and aborts on the broken link. Local builds never failed because the target exists locally, hiding the bug from every local verification gate.

**Reproduction:** clean clone of `063a40c` with the symlink repointed to a nonexistent target → `npm run build` fails with the identical `ENOENT stat` error; same clone without the symlink builds green.

## What Changes

- Untrack `ai-agent_docs` (gitlink→symlink entry removed; local link untouched via `git rm --cached`).
- Add `ai-agent_docs` to `.gitignore` so the local convenience link never returns to the repo.

## Impact

- **Complexity:** LOW — two-line repo hygiene fix; no application code.
- **Touches:** `.gitignore`, tracked deletion of `ai-agent_docs`.
- **Spec:** case (a) repair — no spec governs tracked symlink policy; noted here instead.
- **Risk:** minimal — the symlink was a local-dev convenience only; nothing references it in code.

## Post-mortem

The bug survived every local gate because verification ran on the one machine where the symlink resolved. Fresh-clone builds (`npm ci && npm run build` in a temp clone) catch this class of bug — worth automating before relying on Vercel as the only fresh environment.

## Out of scope

- CI workflow running fresh-clone builds (follow-up suggestion).
