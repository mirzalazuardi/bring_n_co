import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { putStorageFile, isStorageConfigured } from '@/lib/storage/cloudinary';
import {
  registrationFormSchema,
  validateProofFile,
  toPrismaClassGroup,
  fromPrismaClassGroup,
  toPrismaJerseySize,
  fromPrismaJerseySize,
  type CLASS_GROUPS,
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
        jerseySize: fromPrismaJerseySize(registration.jerseySize),
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

    const name = formData.get('name') as string | null;
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

      // Generate unique id (Cloudinary appends the detected format extension)
      const ext = proofFile.name.split('.').pop() || 'png';
      const publicId = `proofs/${userId}-${Date.now()}`;

      if (isStorageConfigured()) {
        const stored = await putStorageFile(publicId, proofFile, {
          contentType: proofFile.type,
        });
        proofUrl = stored.url;
      } else {
        // Fallback for environments without live storage credentials (e.g. local offline dev)
        proofUrl = `https://mock.res.cloudinary.com/image/upload/${publicId}.${ext}`;
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

    const [registration] = await Promise.all([
      prisma.registration.upsert({
        where: { userId },
        create: {
          userId,
          jerseySize: toPrismaJerseySize(parsedFields.data.jerseySize),
          classGroup: prismaClassGroup,
          phone: parsedFields.data.phone,
          bankTransferProofUrl: proofUrl,
        },
        update: {
          jerseySize: toPrismaJerseySize(parsedFields.data.jerseySize),
          classGroup: prismaClassGroup,
          phone: parsedFields.data.phone,
          bankTransferProofUrl: proofUrl,
        },
      }),
      name ? prisma.user.update({ where: { id: userId }, data: { name } }) : Promise.resolve(null),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Registration saved successfully',
      data: {
        id: registration.id,
        jerseySize: fromPrismaJerseySize(registration.jerseySize),
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
