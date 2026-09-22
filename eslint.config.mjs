import nextConfig from "eslint-config-next";
import nextTypescript from "eslint-config-next/typescript";

/**
 * Flat config (ESLint 9). Replaces the legacy .eslintrc.json removed when
 * bumping eslint ^8.57.0 → ^9.39.5 to satisfy eslint-config-next@16's
 * `eslint >=9.0.0` peer requirement (Vercel deploy ERESOLVE, 2026-09-22).
 *
 * Both imports are CJS `module.exports` = flat-config arrays (verified against
 * eslint-config-next@16.3.5 dist), so Node's ESM interop exposes them as
 * default imports.
 */
const eslintConfig = [
  ...nextConfig,
  ...nextTypescript,
  {
    rules: {
      // Preserved from .eslintrc.json
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      // Justified downgrade: ThemeProvider (localStorage/matchMedia init),
      // EventCountdown (hydration gate), and useScrollReveal (reduced-motion
      // fast path) intentionally call setState once in a mount effect to
      // initialize from browser-only state — the standard Next.js pattern
      // react-hooks v7 flags but that React documents as acceptable here.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default eslintConfig;
