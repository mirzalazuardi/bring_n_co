import { z } from 'zod';

/**
 * Shared contract for the admin registrations console: the serialized row
 * shape used by the server page, the client table, and the API routes, plus
 * the validation schema for verification updates.
 */

export type AdminVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AdminRegistrationRow {
  id: string;
  /** Owner user id — enables the per-row delete-user action in the console. */
  userId: string;
  userName: string;
  userEmail: string;
  classGroup: string;
  jerseySize: string;
  phone: string;
  status: AdminVerificationStatus;
  notes: string | null;
  proofUrl: string;
  createdAt: string;
}

export const verificationUpdateSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  notes: z.string().trim().max(500).optional().nullable(),
});
