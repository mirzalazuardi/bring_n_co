import { z } from 'zod';
import { TITLE_MAX_LENGTH } from '@/lib/validations/questionnaire';

/**
 * Shared contract for the admin questionnaires console: the settings PATCH
 * payload used by the list/manage pages (see feat-questionnaire).
 */
export const questionnaireSettingsSchema = z
  .object({
    title: z.string().trim().min(3, 'Judul minimal 3 karakter').max(TITLE_MAX_LENGTH, `Judul maksimal ${TITLE_MAX_LENGTH} karakter`).optional(),
    description: z.string().trim().max(500, 'Deskripsi maksimal 500 karakter').optional().nullable(),
    /** Menerima jawaban baru. */
    isOpen: z.boolean().optional(),
    /** Hanya alumni dengan pendaftaran APPROVED yang bisa mengisi. */
    requireVerified: z.boolean().optional(),
    /** Publikasikan rekap hasil di halaman publik. */
    resultsPublished: z.boolean().optional(),
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: 'Payload must contain at least one updatable field' },
  );
