# Fix Vercel Deployment Failure: ESLint Peer Dependency Conflict

## Why

Vercel deployments fail during `npm install` with `ERESOLVE`. Root cause (confirmed by reproducing locally and inspecting the npm registry):

- `package.json` declares `devDependencies.eslint: "^8.57.0"` while `eslint-config-next@16.3.5` (the version resolved from `^16.3.5`) declares peer dependency `eslint: ">=9.0.0"`.
- npm's strict peer resolution rejects the tree: the installed `eslint@8.57.1` conflicts with the required `>=9.0.0` peer.
- No `package-lock.json` exists, so Vercel resolves dependencies fresh on every build with no escape hatch — the failure is deterministic, not intermittent.

## What Changes

- Bump `devDependencies.eslint` from `^8.57.0` to `^9.39.5` (latest maintenance line, satisfies `>=9.0.0`; v10 is `latest` but v9 is the conservative choice with the widest ecosystem compatibility, e.g. `typescript-eslint@^8.46.0` already supports `^8.57.0 || ^9.0.0 || ^10.0.0`).
- Migrate `.eslintrc.json` (legacy format, unsupported by ESLint 9 by default) to `eslint.config.mjs` (flat config) using `eslint-config-next`'s built-in flat-config export (verified: `module.exports` is a flat-config **array**; no `@eslint/eslintrc` FlatCompat shim needed).
- Preserve existing rule overrides (`no-explicit-any: warn`, `no-unused-vars: warn` with `argsIgnorePattern: "^_"`).
- Generate `package-lock.json` and commit it so Vercel installs are reproducible.

## Impact

- **Complexity:** MID — toolchain-only change; no application code touched.
- **Touches:** `package.json`, `.eslintrc.json` (deleted), `eslint.config.mjs` (new), `package-lock.json` (new).
- **Spec:** no capability spec governs build/deps today; this change is a repair, not a behavior change. Per Phase 2 of the debug methodology this is case (b): spec gap — deployment contract ("deployed on Vercel free Hobby plan" per AGENTS.md) exists but no spec pins dependency resolution. Spec authoring deferred; not blocking.
- **Risk:** low — ESLint only affects the `npm run lint` script; Next.js production builds do not run ESLint in Next 16.
- **Rollback:** revert the three files.

## Out of scope

- Upgrading to ESLint 10 (possible follow-up; `typescript-eslint` peer range already allows it).
- Adding linting to CI as a required check.
