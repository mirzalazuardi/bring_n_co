import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { putStorageFile, isStorageConfigured } from '@/lib/storage/cloudinary';
import { isUploadOpen, UPLOAD_CLOSED_MESSAGE } from '@/lib/upload-window';

const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // 4.0 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as { id?: string }).id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = (session.user as { id: string }).id;

    // Community upload window: closed until the configured offset after the
    // event date. The admin console has its own route and is unaffected.
    if (!isUploadOpen()) {
      return NextResponse.json(
        { success: false, error: UPLOAD_CLOSED_MESSAGE },
        { status: 403 }
      );
    }

    const formData = await request.formData();

    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string | null)?.trim() || null;
    const description = (formData.get('description') as string | null)?.trim() || null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { success: false, error: 'Please select an image file to upload' },
        { status: 400 }
      );
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Image size exceeds the 4 MB limit' },
        { status: 400 }
      );
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file format. Only JPEG, PNG, WebP, and GIF images are allowed.',
        },
        { status: 400 }
      );
    }

    if (title && title.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Title must not exceed 100 characters' },
        { status: 400 }
      );
    }

    if (description && description.length > 300) {
      return NextResponse.json(
        { success: false, error: 'Description must not exceed 300 characters' },
        { status: 400 }
      );
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const publicId = `gallery/${userId}-${Date.now()}`;

    let imageUrl = '';
    if (isStorageConfigured()) {
      const stored = await putStorageFile(publicId, file, { contentType: file.type });
      imageUrl = stored.url;
    } else {
      // Fallback for environments without live storage credentials (offline dev)
      imageUrl = `https://mock.res.cloudinary.com/image/upload/${publicId}.${ext}`;
    }

    const image = await prisma.image.create({
      data: {
        url: imageUrl,
        title,
        description,
        userId,
      },
      select: {
        id: true,
        url: true,
        title: true,
        description: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Image uploaded successfully to gallery',
        data: image,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
