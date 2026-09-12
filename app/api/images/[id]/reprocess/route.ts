import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { imageIdParamsSchema } from '@/lib/images/schemas';
import { resetForReprocess } from '@/lib/images/claim';

export const runtime = 'nodejs';

/**
 * Reprocess a FAILED image. Rate limiting: add a per-user limiter here
 * before exposing at scale (placeholder per spec/tasks.md).
 */
export async function POST(
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
    return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });
  }

  const asset = await prisma.imageAsset.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, userId: true },
  });
  if (!asset || asset.userId !== userId) {
    return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });
  }

  const reset = await resetForReprocess(asset.id);
  if (!reset) {
    // Not FAILED (queued/processing/completed) → state machine says no
    return NextResponse.json(
      { success: false, error: 'Reprocessing is only available for failed images' },
      { status: 409 },
    );
  }

  const { tasks } = await import('@trigger.dev/sdk');
  await tasks.trigger('optimize-image', { imageId: asset.id });

  return NextResponse.json(
    { success: true, data: { id: asset.id, status: 'queued' } },
    { status: 202 },
  );
}
