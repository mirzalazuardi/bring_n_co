import { NextResponse } from 'next/server';
import { verifyAdminCredentials } from '@/lib/admin/auth';

/**
 * Server-side re-verification for /api/admin/* routes. The middleware also
 * gates these paths, but defense in depth: the API never trusts that it was
 * reached through the middleware.
 */
export function requireAdmin(request: Request): NextResponse | null {
  if (verifyAdminCredentials(request.headers.get('authorization'))) {
    return null;
  }
  return NextResponse.json(
    { success: false, error: 'Admin authentication required' },
    {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Console", charset="UTF-8"' },
    },
  );
}
