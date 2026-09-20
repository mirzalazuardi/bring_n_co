import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/api-guard';
import { isStorageConfigured } from '@/lib/storage/cloudinary';
import {
  MAX_BATCH_FILES,
  processGalleryBatch,
  type InputFile,
} from '@/lib/admin/gallery-upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Direct uploads can take a while for big batches — stay under platform caps
export const maxDuration = 60;

/**
 * POST /api/admin/images/upload — multipart form with one or more `files`.
 * Each file is stored to Cloudinary as-is and published to the gallery immediately
 * (no optimization pipeline, no Trigger.dev). Per-file outcomes are returned
 * so one bad file never fails the whole batch.
 */
export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  if (!isStorageConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Image storage is not configured (CLOUDINARY_* env vars missing).' },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid multipart form data' },
      { status: 400 },
    );
  }

  const entries = formData.getAll('files').filter((v): v is File => v instanceof File);
  if (entries.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Tidak ada berkas yang dikirim (field "files").' },
      { status: 400 },
    );
  }
  if (entries.length > MAX_BATCH_FILES) {
    return NextResponse.json(
      { success: false, error: `Maksimal ${MAX_BATCH_FILES} berkas per unggahan.` },
      { status: 400 },
    );
  }

  const files: InputFile[] = [];
  for (const entry of entries) {
    files.push({
      filename: entry.name || 'unknown',
      mimeType: entry.type || 'application/octet-stream',
      bytes: Buffer.from(await entry.arrayBuffer()),
    });
  }

  try {
    const outcomes = await processGalleryBatch(files);
    const succeeded = outcomes.filter((o) => o.ok).length;
    return NextResponse.json(
      {
        success: true,
        data: {
          total: outcomes.length,
          succeeded,
          failed: outcomes.length - succeeded,
          results: outcomes,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload gagal diproses.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
