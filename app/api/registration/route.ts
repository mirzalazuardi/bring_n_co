import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { put } from '@vercel/blob';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import {
  registrationFormSchema,
  validateProofFile,
  toPrismaClassGroup,
  fromPrismaClassGroup,
  type CLASS_GROUPS,
  type JERSEY_SIZES,
} from '@/lib/validations/registration';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as { id?: string }).id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = (session.user as { id: string }).id;
    const registration = await prisma.registration.findUnique({
      where: { userId },
    });

    if (!registration) {
      return NextResponse.json({
        success: true,
        registered: false,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      registered: true,
      data: {
        id: registration.id,
        jerseySize: registration.jerseySize,
        classGroup: fromPrismaClassGroup(registration.classGroup),
        phone: registration.phone,
        bankTransferProofUrl: registration.bankTransferProofUrl,
        status: registration.status,
        notes: registration.notes,
        createdAt: registration.createdAt,
        updatedAt: registration.updatedAt,
      },
    });
  } catch (error) {
    console.error('GET /api/registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const formData = await request.formData();

    const jerseySize = formData.get('jerseySize') as string;
    const classGroup = formData.get('classGroup') as string;
    const phone = formData.get('phone') as string;
    const proofFile = formData.get('proof') as File | null;

    // Validate textual fields
    const parsedFields = registrationFormSchema.safeParse({
      jerseySize,
      classGroup,
      phone,
    });

    if (!parsedFields.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: parsedFields.error.issues.map((i) => i.message),
        },
        { status: 400 }
      );
    }

    const existingReg = await prisma.registration.findUnique({
      where: { userId },
    });

    let proofUrl = existingReg?.bankTransferProofUrl;

    if (proofFile && proofFile.size > 0) {
      const fileValidation = validateProofFile(proofFile);
      if (!fileValidation.valid) {
        return NextResponse.json(
          { success: false, error: fileValidation.error },
          { status: 400 }
        );
      }

      // Generate unique path
      const ext = proofFile.name.split('.').pop() || 'png';
      const filename = `proofs/${userId}-${Date.now()}.${ext}`;

      if (env.BLOB_READ_WRITE_TOKEN) {
        const blob = await put(filename, proofFile, {
          access: 'public',
          token: env.BLOB_READ_WRITE_TOKEN,
        });
        proofUrl = blob.url;
      } else {
        // Fallback for environments without live Blob token (e.g. local offline dev)
        proofUrl = `https://mock.blob.vercel-storage.com/${filename}`;
      }
    } else if (!proofUrl) {
      return NextResponse.json(
        { success: false, error: 'Bank transfer proof file is required' },
        { status: 400 }
      );
    }

    const prismaClassGroup = toPrismaClassGroup(
      parsedFields.data.classGroup as (typeof CLASS_GROUPS)[number]
    );

    const registration = await prisma.registration.upsert({
      where: { userId },
      create: {
        userId,
        jerseySize: parsedFields.data.jerseySize as (typeof JERSEY_SIZES)[number],
        classGroup: prismaClassGroup,
        phone: parsedFields.data.phone,
        bankTransferProofUrl: proofUrl,
      },
      update: {
        jerseySize: parsedFields.data.jerseySize as (typeof JERSEY_SIZES)[number],
        classGroup: prismaClassGroup,
        phone: parsedFields.data.phone,
        bankTransferProofUrl: proofUrl,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Registration saved successfully',
      data: {
        id: registration.id,
        jerseySize: registration.jerseySize,
        classGroup: fromPrismaClassGroup(registration.classGroup),
        phone: registration.phone,
        bankTransferProofUrl: registration.bankTransferProofUrl,
        status: registration.status,
      },
    });
  } catch (error) {
    console.error('POST /api/registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
