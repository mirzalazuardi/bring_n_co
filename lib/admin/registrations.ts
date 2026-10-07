import { z } from 'zod';
import { CLASS_GROUPS, JERSEY_SIZES } from '@/lib/validations/registration';

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

/**
 * Admin-side data edit for a registration row: committee may correct the
 * alumni's class, jersey size, or phone (e.g. typos at the booth). All fields
 * optional and partial — only provided fields change; omit everything to
 * update verification status only.
 */
export const registrationEditSchema = z.object({
  jerseySize: z.enum(JERSEY_SIZES).optional(),
  classGroup: z.enum(CLASS_GROUPS).optional(),
  phone: z
    .string()
    .trim()
    .min(10, 'Nomor HP minimal 10 digit')
    .max(20, 'Nomor HP maksimal 20 digit')
    .regex(/^\+?[0-9\s-]{10,20}$/, 'Format nomor HP tidak valid')
    .optional(),
});

/**
 * Combined PATCH payload: verification update (status/notes) and/or data
 * corrections (jersey/class/phone). Both halves are optional, but the body
 * must carry at least one field — an empty PATCH is a client bug.
 */
export const adminRegistrationUpdateSchema = z
  .object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    notes: z.string().trim().max(500).optional().nullable(),
    jerseySize: registrationEditSchema.shape.jerseySize,
    classGroup: registrationEditSchema.shape.classGroup,
    phone: registrationEditSchema.shape.phone,
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: 'Payload must contain at least one updatable field' },
  );
