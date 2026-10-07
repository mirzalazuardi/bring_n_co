import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env before importing modules that read it
vi.mock('@/lib/env', () => ({
  env: {
    ADMIN_USERNAME: 'panitia',
    ADMIN_PASSWORD: 'supersecret123',
  },
}));

import { verifyAdminCredentials, isAdminConfigured } from '../lib/admin/auth';
import {
  registrationEditSchema,
  adminRegistrationUpdateSchema,
} from '../lib/admin/registrations';
import { buildRegistrationsWorkbook, type ExportRow } from '../lib/admin/export';

function basicHeader(user: string, pass: string): string {
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
}

describe('admin Basic Auth', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('accepts correct credentials', () => {
    expect(verifyAdminCredentials(basicHeader('panitia', 'supersecret123'))).toBe(true);
  });

  it('rejects wrong password, wrong user, and malformed headers', () => {
    expect(verifyAdminCredentials(basicHeader('panitia', 'wrongpass99'))).toBe(false);
    expect(verifyAdminCredentials(basicHeader('intruder', 'supersecret123'))).toBe(false);
    expect(verifyAdminCredentials(null)).toBe(false);
    expect(verifyAdminCredentials('Bearer abc.def.ghi')).toBe(false);
    expect(verifyAdminCredentials('Basic not-base64!!!')).toBe(false);
    expect(verifyAdminCredentials(`Basic ${Buffer.from('no-separator').toString('base64')}`)).toBe(false);
  });

  it('rejects when admin env is not configured', async () => {
    vi.doMock('@/lib/env', () => ({ env: { ADMIN_USERNAME: undefined, ADMIN_PASSWORD: undefined } }));
    const { verifyAdminCredentials: freshVerify, isAdminConfigured: freshConfigured } =
      await import('../lib/admin/auth');
    expect(freshConfigured()).toBe(false);
    expect(freshVerify(basicHeader('panitia', 'supersecret123'))).toBe(false);
  });

  it('isAdminConfigured reflects env presence', () => {
    expect(isAdminConfigured()).toBe(true);
  });
});

describe('verification update payload (status/notes half)', () => {
  it('accepts valid statuses and optional notes', () => {
    expect(adminRegistrationUpdateSchema.safeParse({ status: 'APPROVED' }).success).toBe(true);
    expect(adminRegistrationUpdateSchema.safeParse({ status: 'REJECTED', notes: 'Bukti tidak jelas' }).success).toBe(true);
    expect(adminRegistrationUpdateSchema.safeParse({ status: 'PENDING', notes: null }).success).toBe(true);
  });

  it('rejects unknown statuses and oversized notes', () => {
    expect(adminRegistrationUpdateSchema.safeParse({ status: 'MAYBE' }).success).toBe(false);
    expect(adminRegistrationUpdateSchema.safeParse({ status: 'APPROVED', notes: 'x'.repeat(501) }).success).toBe(false);
  });
});

describe('registration edit schema (admin data correction)', () => {
  it('accepts partial and full data edits', () => {
    expect(registrationEditSchema.safeParse({}).success).toBe(true);
    expect(registrationEditSchema.safeParse({ phone: '+62 812-3456-7890' }).success).toBe(true);
    expect(
      registrationEditSchema.safeParse({ jerseySize: '5XL', classGroup: 'IPS-4', phone: '081234567890' }).success,
    ).toBe(true);
  });

  it('rejects invalid enum values and bad phone shapes', () => {
    expect(registrationEditSchema.safeParse({ jerseySize: 'XXL' }).success).toBe(false);
    expect(registrationEditSchema.safeParse({ classGroup: 'IPA-9' }).success).toBe(false);
    expect(registrationEditSchema.safeParse({ phone: '123' }).success).toBe(false);
    expect(registrationEditSchema.safeParse({ phone: '08123abcd' }).success).toBe(false);
    expect(registrationEditSchema.safeParse({ phone: 'x'.repeat(21) }).success).toBe(false);
  });
});

describe('admin combined update schema', () => {
  it('accepts status-only (legacy verify flow), data-only, and combined payloads', () => {
    expect(adminRegistrationUpdateSchema.safeParse({ status: 'APPROVED' }).success).toBe(true);
    expect(adminRegistrationUpdateSchema.safeParse({ phone: '081200000001' }).success).toBe(true);
    expect(
      adminRegistrationUpdateSchema.safeParse({
        status: 'REJECTED',
        notes: 'Bukti tidak jelas',
        jerseySize: '2XL',
        classGroup: 'IPA-2',
        phone: '+62 812 3456 7890',
      }).success,
    ).toBe(true);
  });

  it('rejects payloads mixing invalid halves or empty bodies', () => {
    expect(adminRegistrationUpdateSchema.safeParse({ jerseySize: 'XXL', phone: '081200000001' }).success).toBe(false);
    expect(adminRegistrationUpdateSchema.safeParse({ status: 'MAYBE', phone: '081200000001' }).success).toBe(false);
    expect(adminRegistrationUpdateSchema.safeParse({ phone: '1' }).success).toBe(false);
    expect(adminRegistrationUpdateSchema.safeParse({}).success).toBe(false);
  });
});

describe('xlsx export', () => {
  const rows: ExportRow[] = [
    {
      id: 'r1',
      userName: 'Andi Saputra',
      userEmail: 'andi@example.com',
      classGroup: 'IPA-1' as ExportRow['classGroup'],
      jerseySize: 'L' as ExportRow['jerseySize'],
      phone: '081200000001',
      status: 'APPROVED' as ExportRow['status'],
      notes: null,
      proofUrl: 'https://blob.example/proof1.png',
      createdAt: '2026-09-01T10:00:00.000Z',
    },
    {
      id: 'r2',
      userName: 'Bunga Lestari',
      userEmail: 'bunga@example.com',
      classGroup: 'IPS-2' as ExportRow['classGroup'],
      jerseySize: 'M' as ExportRow['jerseySize'],
      phone: '081200000002',
      status: 'PENDING' as ExportRow['status'],
      notes: 'Transfer terakhir 12 Sep',
      proofUrl: 'https://blob.example/proof2.png',
      createdAt: '2026-09-02T10:00:00.000Z',
    },
  ];

  it('builds a valid xlsx workbook with data + summary sheets', async () => {
    const buffer = await buildRegistrationsWorkbook(rows);
    expect(buffer.byteLength).toBeGreaterThan(1000);
    // xlsx = zip → magic bytes PK
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });

  it('handles an empty registration list without crashing', async () => {
    const buffer = await buildRegistrationsWorkbook([]);
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });
});
