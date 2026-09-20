import { env } from '@/lib/env';

/**
 * Admin console gate — HTTP Basic Auth backed by ADMIN_USERNAME/ADMIN_PASSWORD.
 * Shared by the middleware (Edge runtime) and admin API routes so the credential
 * check cannot drift between the UI and its data endpoints.
 *
 * Edge-safe by design: no Node `crypto`/`Buffer` — base64 decoding uses
 * `atob` + `TextDecoder`, and comparison is a pure-JS constant-time string
 * compare (fixed iteration count over the longer input).
 */
export function isAdminConfigured(): boolean {
  return Boolean(env.ADMIN_USERNAME && env.ADMIN_PASSWORD);
}

export function verifyAdminCredentials(headerValue: string | null): boolean {
  if (!headerValue || !isAdminConfigured()) return false;

  const [scheme, encoded] = headerValue.split(' ');
  if (scheme !== 'Basic' || !encoded) return false;

  const decoded = decodeBasic(encoded);
  if (decoded === null) return false;

  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex < 0) return false;

  return (
    timingSafeEqualStr(decoded.slice(0, separatorIndex), env.ADMIN_USERNAME as string) &&
    timingSafeEqualStr(decoded.slice(separatorIndex + 1), env.ADMIN_PASSWORD as string)
  );
}

function decodeBasic(encoded: string): string | null {
  try {
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/** Constant-time string comparison without Node crypto (Edge safe). */
function timingSafeEqualStr(a: string, b: string): boolean {
  const lenA = a.length;
  const lenB = b.length;
  const maxLen = Math.max(lenA, lenB, 1);
  // Length mismatch is folded into the accumulator so unequal lengths fail
  // without an early return (and out-of-range charCodeAt is coerced to 0).
  let diff = lenA ^ lenB;
  for (let i = 0; i < maxLen; i++) {
    diff |= (a.charCodeAt(i) | 0) ^ (b.charCodeAt(i) | 0);
  }
  return diff === 0;
}
