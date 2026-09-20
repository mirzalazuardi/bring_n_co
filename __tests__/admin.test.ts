import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env before importing modules that read it
vi.mock('@/lib/env', () => ({
  env: {
    ADMIN_USERNAME: 'panitia',
    ADMIN_PASSWORD: 'supersecret123',
  },
}));

import { verifyAdminCredentials, isAdminConfigured } from '../lib/admin/auth';
import { verificationUpdateSchema } from '../lib/admin/registrations';
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

describe('verification update schema', () => {
  it('accepts valid statuses and optional notes', () => {
    expect(verificationUpdateSchema.safeParse({ status: 'APPROVED' }).success).toBe(true);
    expect(verificationUpdateSchema.safeParse({ status: 'REJECTED', notes: 'Bukti tidak jelas' }).success).toBe(true);
    expect(verificationUpdateSchema.safeParse({ status: 'PENDING', notes: null }).success).toBe(true);
  });

  it('rejects unknown statuses and oversized notes', () => {
    expect(verificationUpdateSchema.safeParse({ status: 'MAYBE' }).success).toBe(false);
    expect(verificationUpdateSchema.safeParse({ status: 'APPROVED', notes: 'x'.repeat(501) }).success).toBe(false);
    expect(verificationUpdateSchema.safeParse({}).success).toBe(false);
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
