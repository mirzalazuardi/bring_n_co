import { z } from 'zod';

/**
 * Shared contract for the doorprize wheel feature: prize/participant payloads.
 * See openspec/changes/feat-doorprize-wheel/specs/doorprize.md.
 */

export const PRIZE_NAME_MAX_LENGTH = 120;

export const prizeNameSchema = z
  .string()
  .trim()
  .min(1, 'Nama hadiah wajib diisi')
  .max(PRIZE_NAME_MAX_LENGTH, `Nama hadiah maksimal ${PRIZE_NAME_MAX_LENGTH} karakter`);

export const wheelUserIdSchema = z.object({
  userId: z.string().min(1, 'userId wajib diisi'),
});

export const wheelSpinSchema = z.object({
  prizeId: z.string().min(1, 'Pilih hadiah terlebih dahulu'),
});
