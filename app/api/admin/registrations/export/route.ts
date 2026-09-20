import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/api-guard';
import { toAdminRows } from '@/lib/admin/rows';
import { buildRegistrationsWorkbook } from '@/lib/admin/export';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/registrations/export — committee spreadsheet (.xlsx) with a
 * per-status/per-class summary sheet. Re-verified against Basic Auth.
 */
export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const registrations = await prisma.registration.findMany({
    orderBy: [{ classGroup: 'asc' }, { createdAt: 'asc' }],
    include: { user: { select: { name: true, email: true } } },
  });

  const buffer = await buildRegistrationsWorkbook(toAdminRows(registrations));

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="pendaftar-reuni-${stamp}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
