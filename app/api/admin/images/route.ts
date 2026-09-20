import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin/api-guard';
import { MAX_BATCH_DELETE, deleteGalleryImages } from '@/lib/admin/gallery-delete';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/images — gallery listing for the management grid.
 */
export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const images = await prisma.image.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: { id: true, url: true, title: true, createdAt: true },
  });

  return NextResponse.json({ success: true, data: images });
}

// Gallery ids come in two flavors: cuid (alumni uploads via Prisma default)
// and uuid (admin direct uploads). Accept both.
const imageIdSchema = z.string().cuid().or(z.string().uuid());

const deleteSchema = z.object({
  ids: z.array(imageIdSchema).min(1).max(MAX_BATCH_DELETE),
});

/**
 * DELETE /api/admin/images — batch delete selected photos
 * (Blob files + gallery rows + pipeline assets).
 */
export async function DELETE(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validasi gagal — periksa daftar id foto (maks 50 per permintaan).',
        details: parsed.error.issues.map((i) => i.message),
      },
      { status: 400 },
    );
  }

  const report = await deleteGalleryImages(parsed.data.ids);
  return NextResponse.json({ success: true, data: report });
}
