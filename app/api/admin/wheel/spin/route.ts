import { spinWheel } from '@/lib/admin/doorprize';
import { wheelSpinSchema } from '@/lib/validations/doorprize';
import { requireAdmin } from '@/lib/admin/api-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/wheel/spin — body { prizeId }. Server-side uniform pick among
 * remaining participants, transactional draw record + participant removal
 * (REQ-DW-003). The client never picks the winner.
 */
export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = wheelSpinSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: 'Validation failed', details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  const result = await spinWheel(parsed.data.prizeId);
  if (!result.ok) {
    return Response.json({ success: false, error: result.error }, { status: result.status });
  }
  return Response.json({ success: true, data: result });
}
