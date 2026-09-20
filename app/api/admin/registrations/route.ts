import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/api-guard';
import { toAdminRows } from '@/lib/admin/rows';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/registrations — serialized registration list for the
 * admin console table. Re-verified against Basic Auth server-side.
 */
export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const registrations = await prisma.registration.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true, email: true } } },
  });

  return Response.json({ success: true, data: toAdminRows(registrations) });
}
