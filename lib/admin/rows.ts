import type { Registration, User } from '@prisma/client';
import type { AdminRegistrationRow } from '@/lib/admin/registrations';
import { fromPrismaClassGroup, fromPrismaJerseySize } from '@/lib/validations/registration';

/**
 * Single serialization point shared by the list route and the export route,
 * so table and spreadsheet can never disagree.
 */
export function toAdminRow(
  registration: Registration & { user: Pick<User, 'name' | 'email'> },
): AdminRegistrationRow {
  return toAdminRows([registration])[0];
}

export function toAdminRows(
  registrations: (Registration & { user: Pick<User, 'name' | 'email'> })[],
): AdminRegistrationRow[] {
  return registrations.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user.name ?? '(tanpa nama)',
    userEmail: r.user.email,
    classGroup: fromPrismaClassGroup(r.classGroup),
    jerseySize: fromPrismaJerseySize(r.jerseySize),
    phone: r.phone,
    status: r.status,
    notes: r.notes,
    proofUrl: r.bankTransferProofUrl,
    createdAt: r.createdAt.toISOString(),
  }));
}
