import { describe, it, expect } from 'vitest';
import { JerseySize, ClassGroup, VerificationStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

describe('Prisma Schema and Client', () => {
  it('should export correct enum constants', () => {
    expect(JerseySize.S).toBe('S');
    expect(JerseySize.M).toBe('M');
    expect(JerseySize.L).toBe('L');
    expect(JerseySize.XL).toBe('XL');
    // Extended sizes: TS client exposes Prisma member names; @map stores 2XL-5XL in the DB.
    expect(JerseySize.Two_XL).toBe('Two_XL');
    expect(JerseySize.Three_XL).toBe('Three_XL');
    expect(JerseySize.Four_XL).toBe('Four_XL');
    expect(JerseySize.Five_XL).toBe('Five_XL');

    expect(ClassGroup.IPA_1).toBe('IPA_1');
    expect(ClassGroup.IPS_4).toBe('IPS_4');

    expect(VerificationStatus.PENDING).toBe('PENDING');
    expect(VerificationStatus.APPROVED).toBe('APPROVED');
    expect(VerificationStatus.REJECTED).toBe('REJECTED');
  });

  it('should instantiate prisma client', () => {
    expect(prisma).toBeDefined();
    expect(typeof prisma.user.findMany).toBe('function');
    expect(typeof prisma.registration.findUnique).toBe('function');
    expect(typeof prisma.image.create).toBe('function');
  });
});
