import { describe, it, expect } from 'vitest';
import {
  registrationFormSchema,
  toPrismaClassGroup,
  fromPrismaClassGroup,
  JERSEY_SIZES,
  CLASS_GROUPS,
} from '../lib/validations/registration';

describe('Registration Form Validation', () => {
  it('should accept valid jersey sizes and class groups', () => {
    const valid = {
      jerseySize: 'L',
      classGroup: 'IPA-1',
      phone: '+6281234567890',
    };
    const result = registrationFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject invalid jersey sizes', () => {
    const invalid = {
      jerseySize: 'XXL',
      classGroup: 'IPA-1',
      phone: '+6281234567890',
    };
    const result = registrationFormSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should correctly convert class group string to and from Prisma enum', () => {
    expect(toPrismaClassGroup('IPA-1')).toBe('IPA_1');
    expect(fromPrismaClassGroup('IPA_1')).toBe('IPA-1');
    expect(toPrismaClassGroup('IPS-4')).toBe('IPS_4');
    expect(fromPrismaClassGroup('IPS_4')).toBe('IPS-4');
  });
});
