import { requireAdmin } from '@/lib/admin/api-guard';
import { deleteUserAndData } from '@/lib/admin/user-delete';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * DELETE /api/admin/users/:id — permanently remove an alumnus account and
 * all associated data (registration, gallery photos + pipeline variants,
 * transfer proof, auth accounts, sessions).
 *
 * Same guard chain as the other admin routes: middleware Basic Auth plus
 * requireAdmin re-verification here. 404 never confirms existence beyond
 * what the committee already sees in the table.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;

  if (!id || typeof id !== 'string') {
    return Response.json({ success: false, error: 'Invalid user id' }, { status: 400 });
  }

  const outcome = await deleteUserAndData(id);

  if (!outcome.ok) {
    // Unknown user is a client-recoverable miss, not a server fault.
    const status = outcome.error.startsWith('Pengguna tidak ditemukan') ? 404 : 500;
    return Response.json({ success: false, error: outcome.error }, { status });
  }

  return Response.json({ success: true, blobErrors: outcome.blobErrors });
}
