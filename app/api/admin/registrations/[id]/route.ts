import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/api-guard';
import { adminRegistrationUpdateSchema } from '@/lib/admin/registrations';
import { toAdminRow } from '@/lib/admin/rows';
import { toPrismaClassGroup, toPrismaJerseySize } from '@/lib/validations/registration';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/registrations/:id — edit a registration row: verification
 * status + notes, and/or data corrections (jersey size, class group, phone).
 * Validation and state-machine guards mirror the registration API's style:
 * invalid payloads → 400, unknown id → 404, no existence leaks.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = adminRegistrationUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        success: false,
        error: 'Validation failed',
        details: parsed.error.issues.map((i) => i.message),
      },
      { status: 400 },
    );
  }

  const existing = await prisma.registration.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ success: false, error: 'Registration not found' }, { status: 404 });
  }

  const { status, notes, jerseySize, classGroup, phone } = parsed.data;

  // Guard: rejecting requires a reason so the alum gets actionable feedback
  if (status === 'REJECTED' && !(notes ?? '').trim()) {
    return Response.json(
      { success: false, error: 'Catatan wajib diisi saat menolak pendaftaran' },
      { status: 400 },
    );
  }

  // Partial update: only provided fields change — status-only PATCHes from
  // the existing verify buttons keep working unchanged.
  const updated = await prisma.registration.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes: notes?.trim() || null }),
      ...(jerseySize !== undefined && { jerseySize: toPrismaJerseySize(jerseySize) }),
      ...(classGroup !== undefined && { classGroup: toPrismaClassGroup(classGroup) }),
      ...(phone !== undefined && { phone }),
    },
    include: { user: { select: { name: true, email: true } } },
  });

  return Response.json({ success: true, data: toAdminRow(updated) });
}
