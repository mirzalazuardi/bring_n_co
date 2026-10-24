import { requireAdmin } from '@/lib/admin/api-guard';
import { buildAdminReport } from '@/lib/questionnaire/report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/questionnaires/:id/stats — aggregate report per question:
 * CHOICE counts/percent, SCALE average + distribution, TEXT answer list
 * (with respondent names — admin console only; the public page omits names).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;
  const report = await buildAdminReport(id);
  if (!report) {
    return Response.json({ success: false, error: 'Kuesioner tidak ditemukan' }, { status: 404 });
  }

  return Response.json({ success: true, data: report });
}
