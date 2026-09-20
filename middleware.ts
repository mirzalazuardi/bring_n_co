import { NextRequestWithAuth, withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { isAdminConfigured, verifyAdminCredentials } from '@/lib/admin/auth';

function isAdminPath(pathname: string): boolean {
  return pathname === '/admin'
    || pathname.startsWith('/admin/')
    || pathname === '/api/admin'
    || pathname.startsWith('/api/admin/');
}

/**
 * Route protection:
 * - /registration, /profile, /upload → NextAuth session (existing behavior)
 * - /admin (+ /api/admin/*) → HTTP Basic Auth from ADMIN_USERNAME/ADMIN_PASSWORD
 *
 * The `authorized` callback lets admin paths fall through to the Basic Auth
 * gate in `adminGate` instead of NextAuth's session redirect. Admin API
 * routes additionally re-verify the header server-side (defense in depth).
 */
export default withAuth(
  function adminGate(request: NextRequestWithAuth) {
    if (!isAdminPath(request.nextUrl.pathname)) {
      return NextResponse.next();
    }

    if (!isAdminConfigured()) {
      return new NextResponse('Admin console is not configured', { status: 503 });
    }
    if (!verifyAdminCredentials(request.headers.get('authorization'))) {
      return new NextResponse('Admin authentication required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Admin Console", charset="UTF-8"' },
      });
    }
    return NextResponse.next();
  },
  {
    pages: {
      signIn: '/login',
    },
    callbacks: {
      authorized({ req, token }) {
        // Admin paths bypass the session check — adminGate enforces Basic Auth
        if (isAdminPath(req.nextUrl.pathname)) return true;
        // Original withAuth behavior for session-protected paths
        return Boolean(token);
      },
    },
  },
);

export const config = {
  matcher: [
    '/registration/:path*',
    '/profile/:path*',
    '/upload/:path*',
    '/admin/:path*',
    '/admin',
    '/api/admin/:path*',
  ],
};
