# Tasks: Fix ESLint Peer Dependency Conflict (Vercel deploy failure)

**Complexity tier: MID** (cross-file toolchain change: dependency bump + config migration + lockfile; verification against build pipeline)

## Tasks

- [x] [LOW] Write failing check reproducing the bug
  - Depends on: none
  - Context anchors:
    * `npm install` currently exits with `ERESOLVE` (reproduced locally 2026-09-22, matches Vercel build log 22:51:54)
    * `eslint-config-next@16.3.5` peer: `eslint ">=9.0.0"` (verified via `npm view`)
  - Files: none (verification is the reproduction command itself)
  - Implementation:
    * Record baseline: `npm install` must fail with `ERESOLVE` citing `eslint-config-next` → `eslint >=9.0.0` before any fix
  - Verify: `npm install` exits non-zero pre-fix
  - Expected: ERESOLVE error naming the eslint peer conflict
  - DONE criteria: failure reproduced for the right reason (peer conflict, not network/registry)

- [x] [MID] Bump eslint to ^9.39.5 and generate lockfile
  - Depends on: T1
  - Context anchors:
    * `package.json` devDependencies: `eslint: "^8.57.0"` → `"^9.39.5"`
    * `npm view eslint@9 dist-tags` → maintenance line 9.39.5; `typescript-eslint@8.x` peer accepts `^9.0.0`
  - Files: `package.json`, `package-lock.json` (new)
  - Implementation:
    * Edit devDependency, run `npm install` to regenerate a clean tree and lockfile
  - Edge cases: lockfile must not contain `eslint@8.x` transitively from the root project
  - Pattern reference: existing caret ranges in package.json
  - Verify: `npm install` exits 0; `npm ls eslint` shows single 9.x resolution
  - Expected: clean install, deterministic resolution committed
  - DONE criteria: Vercel's `npm install` step can no longer fail on peer resolution

- [x] [MID] Migrate .eslintrc.json → eslint.config.mjs flat config
  - Depends on: T2
  - Context anchors:
    * Verified statically: `eslint-config-next@16.3.5` `dist/index.js` ends `module.exports = config` where config is an array of flat-config objects; same for `dist/typescript.js` (extends `typescript-eslint` recommended) and `dist/core-web-vitals.js` — no FlatCompat needed
    * Current `.eslintrc.json` rules to preserve: `@typescript-eslint/no-explicit-any: "warn"`, `@typescript-eslint/no-unused-vars: ["warn", { "argsIgnorePattern": "^_" }]`
    * `eslint-config-next/typescript` already sets `no-unused-vars: warn`; our override only needs to add `argsIgnorePattern`
  - Files: `.eslintrc.json` (delete), `eslint.config.mjs` (new)
  - Implementation:
    * Import `next` and `next/typescript` configs, spread them, append a config object with the preserved rule overrides
    * Legacy `env: { browser, es2021, node }` is subsumed by `eslint-config-next`'s `globals` (browser+node) in its flat config
  - Edge cases: flat config ignores `node_modules`/`.git` by default; next config ignores `.next/**`, `out/**`, `build/**`, `next-env.d.ts`
  - Pattern reference: ESM `.mjs` matches Next.js convention
  - Verify: `npx eslint .` runs without config-format errors
  - Expected: lint executes against flat config, same rule behavior
  - DONE criteria: no legacy config files remain; no FlatCompat dependency added

- [x] [MID] Fix any lint regressions surfaced by ESLint 9 / newer plugins
  - Depends on: T3
  - Context anchors:
    * `npm run lint` = `eslint app/ components/ lib/ && tsc --noEmit`
    * `eslint-config-next@16.3.5` bundles newer `eslint-plugin-react-hooks@^7` and `typescript-eslint@^8.46` than eslint 8 era
  - Files: `eslint.config.mjs` (rule tweaks only if needed), possibly source files for genuine violations
  - Implementation:
    * Run `npm run lint`; fix real violations; only downgrade a rule with a written justification in the config
  - Edge cases: no blanket `eslint-disable` files; no rule removals without justification comment
  - Pattern reference: existing warn-level policy (lint should never block build on style)
  - Verify: `npm run lint` exits 0
  - Expected: TypeScript + ESLint clean
  - DONE criteria: lint green without symptom-masking disables

- [x] [LOW] Full verification — no regressions
  - Depends on: T4
  - Files: none
  - Implementation:
    * `npm install && npm run lint && npm test && npm run build`
  - Verify: all four exit 0; build produces pages
  - Expected: suite green, build green
  - DONE criteria: matches repo verification standard (`lint && build && test`)

## Verification

- [x] [LOW] Confirm `npm install` on a clean tree (no node_modules) succeeds — mirrors Vercel's fresh-clone build
  - Evidence: `npm ci` clean install passed 2026-09-22; lint (0 errors / 9 warnings), 106 tests (17 files), and `next build` all green
