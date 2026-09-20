import ExcelJS from 'exceljs';
import type { AdminVerificationStatus } from '@/lib/admin/registrations';

/**
 * Registration → .xlsx export for the admin console.
 * Column order is the committee's working order: identity, class, jersey,
 * payment state, follow-up notes. Dates are rendered in Asia/Jakarta since
 * the reunion is Indonesia-based.
 */

export interface ExportRow {
  id: string;
  userName: string;
  userEmail: string;
  classGroup: string;
  jerseySize: string;
  phone: string;
  status: AdminVerificationStatus;
  notes: string | null;
  proofUrl: string;
  /** ISO timestamp (matches AdminRegistrationRow serialization) */
  createdAt: string;
}

const HEADERS = [
  'Nama',
  'Email',
  'Kelas',
  'Ukuran Jersey',
  'No. HP',
  'Status Verifikasi',
  'Catatan',
  'Bukti Transfer',
  'Terdaftar',
] as const;

const STATUS_LABEL: Record<AdminVerificationStatus, string> = {
  PENDING: 'Menunggu Verifikasi',
  APPROVED: 'Terverifikasi',
  REJECTED: 'Ditolak',
};

function formatJakarta(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(date);
}

export async function buildRegistrationsWorkbook(rows: ExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Silver Reunion Admin';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Pendaftar');
  sheet.columns = HEADERS.map((header, index) => ({
    header,
    key: [
      'userName',
      'userEmail',
      'classGroup',
      'jerseySize',
      'phone',
      'status',
      'notes',
      'proofUrl',
      'createdAt',
    ][index],
    width: [24, 28, 10, 14, 16, 20, 32, 44, 20][index],
  }));

  for (const row of rows) {
    sheet.addRow({
      userName: row.userName,
      userEmail: row.userEmail,
      classGroup: row.classGroup,
      jerseySize: row.jerseySize,
      phone: row.phone,
      status: STATUS_LABEL[row.status],
      notes: row.notes ?? '',
      proofUrl: row.proofUrl,
      createdAt: formatJakarta(new Date(row.createdAt)),
    });
  }

  // Header styling + freeze pane under the header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: HEADERS.length } };

  // Summary sheet: per-status and per-class counts
  const summary = workbook.addWorksheet('Ringkasan');
  summary.columns = [
    { header: 'Kategori', key: 'label', width: 26 },
    { header: 'Jumlah', key: 'count', width: 10 },
  ];
  summary.getRow(1).font = { bold: true };

  summary.addRow({ label: 'Total Pendaftar', count: rows.length });
  for (const status of ['PENDING', 'APPROVED', 'REJECTED'] as const) {
    summary.addRow({
      label: STATUS_LABEL[status],
      count: rows.filter((r) => r.status === status).length,
    });
  }
  const classes = [...new Set(rows.map((r) => r.classGroup))].sort();
  for (const cls of classes) {
    summary.addRow({
      label: `Kelas ${cls}`,
      count: rows.filter((r) => r.classGroup === cls).length,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
