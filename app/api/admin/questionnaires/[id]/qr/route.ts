import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/api-guard';
import { buildQuestionnaireFillUrl, renderQuestionnaireQrSvg, resolveBaseUrl } from '@/lib/questionnaire/url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/questionnaires/:id/qr — SVG QR code pointing at
 * /kuesioner/:id. Rendered server-side with the local `qrcode` package; the
 * base URL is NEXTAUTH_URL or derived from request headers.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;
  const questionnaire = await prisma.questionnaire.findUnique({ where: { id }, select: { id: true } });
  if (!questionnaire) {
    return Response.json({ success: false, error: 'Kuesioner tidak ditemukan' }, { status: 404 });
  }

  const fillUrl = buildQuestionnaireFillUrl(resolveBaseUrl(request), questionnaire.id);
  const svg = await renderQuestionnaireQrSvg(fillUrl);

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
