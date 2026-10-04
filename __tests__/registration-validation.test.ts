import { describe, it, expect } from 'vitest';
import {
  registrationFormSchema,
  toPrismaClassGroup,
  fromPrismaClassGroup,
  toPrismaJerseySize,
  fromPrismaJerseySize,
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

  it('should accept extended jersey sizes end-to-end (2XL, 5XL)', () => {
    for (const size of ['2XL', '5XL'] as const) {
      const valid = {
        jerseySize: size,
        classGroup: 'IPA-1',
        phone: '+6281234567890',
      };
      const result = registrationFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    }
  });

  it('should expose the full extended size set', () => {
    expect([...JERSEY_SIZES]).toEqual(['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL']);
  });

  it('should convert extended jersey sizes to and from Prisma enum members', () => {
    expect(toPrismaJerseySize('2XL')).toBe('Two_XL');
    expect(toPrismaJerseySize('5XL')).toBe('Five_XL');
    expect(toPrismaJerseySize('L')).toBe('L');
    expect(fromPrismaJerseySize('Two_XL')).toBe('2XL');
    expect(fromPrismaJerseySize('Five_XL')).toBe('5XL');
    expect(fromPrismaJerseySize('XL')).toBe('XL');
  });

  it('should correctly convert class group string to and from Prisma enum', () => {
    expect(toPrismaClassGroup('IPA-1')).toBe('IPA_1');
    expect(fromPrismaClassGroup('IPA_1')).toBe('IPA-1');
    expect(toPrismaClassGroup('IPS-4')).toBe('IPS_4');
    expect(fromPrismaClassGroup('IPS_4')).toBe('IPS-4');
  });
});
