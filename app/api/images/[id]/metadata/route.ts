import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { imageIdParamsSchema } from '@/lib/images/schemas';

export const runtime = 'nodejs';

const metadataSchema = z.object({
  title: z.string().trim().max(100).optional(),
  description: z.string().trim().max(300).optional(),
});

/** Attach/adjust optional gallery metadata before processing completes. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;
  const parsedParams = imageIdParamsSchema.safeParse({ id });
  if (!parsedParams.success) {
    return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
  const parsedBody = metadataSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { success: false, error: 'Title max 100 chars, description max 300 chars' },
      { status: 400 },
    );
  }

  const asset = await prisma.imageAsset.findUnique({
    where: { id: parsedParams.data.id },
    select: { id: true, userId: true },
  });
  if (!asset || asset.userId !== userId) {
    return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });
  }

  await prisma.imageAsset.update({
    where: { id: asset.id },
    data: parsedBody.data,
  });

  return NextResponse.json({ success: true });
}
