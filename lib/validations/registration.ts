import { z } from 'zod';

export const JERSEY_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'] as const;
export const CLASS_GROUPS = [
  'IPA-1',
  'IPA-2',
  'IPA-3',
  'IPS-1',
  'IPS-2',
  'IPS-3',
  'IPS-4',
] as const;

export const ALLOWED_PROOF_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4.0 MB

export const registrationFormSchema = z.object({
  jerseySize: z.enum(JERSEY_SIZES, {      errorMap: () => ({
        message: 'Please select a valid jersey size (S, M, L, XL, 2XL, 3XL, 4XL, 5XL)',
      }),
  }),
  classGroup: z.enum(CLASS_GROUPS, {
    errorMap: () => ({ message: 'Please select a valid class group' }),
  }),
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must not exceed 20 digits')
    .regex(/^\+?[0-9\s-]{10,20}$/, 'Invalid phone number format'),
});

export type RegistrationFormData = z.infer<typeof registrationFormSchema>;

export function validateProofFile(file: File | null): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'Bank transfer proof file is required' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'File size exceeds the 4 MB limit' };
  }

  const allowed = (ALLOWED_PROOF_MIME_TYPES as readonly string[]).includes(file.type);
  if (!allowed) {
    return {
      valid: false,
      error: 'Invalid file format. Only JPEG, PNG, WebP, and PDF are accepted.',
    };
  }

  return { valid: true };
}

// Convert class string "IPA-1" to Prisma Enum "IPA_1"
export function toPrismaClassGroup(cg: (typeof CLASS_GROUPS)[number]) {
  return cg.replace('-', '_') as 'IPA_1' | 'IPA_2' | 'IPA_3' | 'IPS_1' | 'IPS_2' | 'IPS_3' | 'IPS_4';
}

// Convert Prisma Enum "IPA_1" back to display "IPA-1"
export function fromPrismaClassGroup(cg: string): (typeof CLASS_GROUPS)[number] {
  return cg.replace('_', '-') as (typeof CLASS_GROUPS)[number];
}
