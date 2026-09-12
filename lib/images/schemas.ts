import { z } from 'zod';

/** Public API status casing (lowercase), per the pipeline response contract. */
export const API_STATUSES = ['queued', 'processing', 'completed', 'failed'] as const;
export type ApiStatus = (typeof API_STATUSES)[number];

export const VARIANT_NAMES = ['thumbnail', 'medium', 'large'] as const;
export type VariantName = (typeof VARIANT_NAMES)[number];

export const variantMetaSchema = z.object({
  key: z.string().min(1),
  url: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  size: z.number().int().nonnegative(),
  mime: z.literal('image/webp'),
});
export type VariantMeta = z.infer<typeof variantMetaSchema>;

export const variantsMapSchema = z.record(z.enum(VARIANT_NAMES), variantMetaSchema);
export type VariantsMap = z.infer<typeof variantsMapSchema>;

/** User-safe error categories persisted on the asset and exposed to clients. */
export const ERROR_CATEGORIES = [
  'INVALID_FILE',
  'UNSUPPORTED_FORMAT',
  'FILE_TOO_LARGE',
  'DOWNLOAD_FAILED',
  'PROCESSING_FAILED',
  'STORAGE_FAILED',
  'UNKNOWN',
] as const;
export type ErrorCategory = (typeof ERROR_CATEGORIES)[number];

/** Categories that must never be retried — the input is bad and will keep being bad. */
export const PERMANENT_ERROR_CATEGORIES: readonly ErrorCategory[] = [
  'INVALID_FILE',
  'UNSUPPORTED_FORMAT',
  'FILE_TOO_LARGE',
];

/**
 * Client-provided metadata for the direct upload. MimeType and size are
 * advisory only (enforced again from bytes in the worker); they gate the
 * token and give early, cheap feedback.
 */
export const uploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  size: z.number().int().positive(),
  mimeType: z.string().min(1).max(100),
});
export type UploadRequest = z.infer<typeof uploadRequestSchema>;

export const imageIdParamsSchema = z.object({
  id: z.string().uuid(),
});
export type ImageIdParams = z.infer<typeof imageIdParamsSchema>;

/** Normalized public status payload — never exposes storage internals beyond variant URLs. */
export const imageStatusResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(API_STATUSES),
  errorCategory: z.enum(ERROR_CATEGORIES).nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  variants: variantsMapSchema.nullish(),
});
export type ImageStatusResponse = z.infer<typeof imageStatusResponseSchema>;

export const reprocessResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(API_STATUSES),
});
