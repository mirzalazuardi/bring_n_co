import { resetWheel } from '@/lib/admin/doorprize';
import { requireAdmin } from '@/lib/admin/api-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/wheel/reset — pre-event testing reset (REQ-DW-004): clears
 * all draws and removes every participant from the wheel in one transaction;
 * prize definitions survive. The admin UI asks for confirmation first.
 */
export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const result = await resetWheel();
  if (!result.ok) {
    return Response.json({ success: false, error: result.error }, { status: 500 });
  }
  return Response.json({ success: true });
}
