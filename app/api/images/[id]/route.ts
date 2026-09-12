import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { imageIdParamsSchema, imageStatusResponseSchema, API_STATUSES } from '@/lib/images/schemas';
import type { ImageStatus, ImageErrorCategory } from '@prisma/client';

export const runtime = 'nodejs';

const STATUS_MAP: Record<ImageStatus, (typeof API_STATUSES)[number]> = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;
  const parsed = imageIdParamsSchema.safeParse({ id });
  if (!parsed.success) {
    // Malformed id → indistinguishable from unknown (no existence leak)
    return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });
  }

  const asset = await prisma.imageAsset.findUnique({
    where: { id: parsed.data.id },
    select: {
      id: true,
      userId: true,
      status: true,
      errorCategory: true,
      errorMessage: true,
      variants: true,
    },
  });

  // Authorization: foreign and nonexistent ids look identical (404)
  if (!asset || asset.userId !== userId) {
    return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });
  }

  const payload = imageStatusResponseSchema.parse({
    id: asset.id,
    status: STATUS_MAP[asset.status],
    errorCategory: (asset.errorCategory as ImageErrorCategory | null) ?? null,
    errorMessage: asset.errorMessage ?? null,
    variants: asset.variants ?? null,
  });

  return NextResponse.json({ success: true, data: payload });
}
