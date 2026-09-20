import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { putStorageFile } from '@/lib/storage/cloudinary';
import { ACCEPTED_MIME_TYPES } from '@/lib/images/process';

/**
 * Admin gallery upload — direct publish, no optimization, no Trigger.dev.
 * Files are stored to Cloudinary as-is and immediately inserted into the gallery
 * `Image` table, so what the admin uploads is exactly what alumni see.
 *
 * No ImageAsset rows are created — nothing is queued, nothing will ever be
 * picked up by a worker. The gallery owner is a deterministic per-store
 * system user with a random bcrypt-hashed password (cannot be logged into).
 */

const SYSTEM_USER_EMAIL_PREFIX = 'system.gallery@';

export type UploadOutcome =
  | { filename: string; ok: true; imageId: string; url: string }
  | { filename: string; ok: false; error: string };

export interface InputFile {
  filename: string;
  mimeType: string;
  bytes: Buffer;
}

/** Max files per request — guards against absurd batches. */
export const MAX_BATCH_FILES = 20;

export async function getOrCreateSystemUser(): Promise<{ id: string }> {
  const email = `${SYSTEM_USER_EMAIL_PREFIX}${new URL(env.NEXTAUTH_URL ?? 'http://localhost:3000').host}`;

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return existing;

  // Racy fast path above; the upsert below is the atomic fallback — concurrent
  // first-uploads converge on one row (update: {} never mutates the winner).
  // Random 32-byte secret, bcrypt-hashed — nobody can ever log in as this user.
  const passwordHash = await bcrypt.hash(randomUUID() + randomUUID(), 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: 'Panitia (Sistem)', passwordHash },
    select: { id: true },
  });
  return user;
}

export async function processGalleryFile(
  file: InputFile,
  systemUserId: string,
): Promise<UploadOutcome> {
  const imageId = randomUUID();

  try {
    if (file.bytes.byteLength === 0) {
      return { filename: file.filename, ok: false, error: 'Berkas kosong.' };
    }
    if (file.bytes.byteLength > env.MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      return {
        filename: file.filename,
        ok: false,
        error: `Melebihi batas ${env.MAX_IMAGE_SIZE_MB} MB.`,
      };
    }
    if (!ACCEPTED_MIME_TYPES.includes(file.mimeType.toLowerCase())) {
      return {
        filename: file.filename,
        ok: false,
        error: 'Format tidak didukung (gunakan JPEG, PNG, WebP, GIF, AVIF, atau TIFF).',
      };
    }

    // Deterministic storage layout, original bytes untouched (no re-encode).
    // Cloudinary appends the detected format extension to the public_id.
    const stored = await putStorageFile(`images/${imageId}/original`, file.bytes, {
      contentType: file.mimeType,
    });

    // Publish straight to the community gallery
    const image = await prisma.image.create({
      data: {
        id: imageId,
        url: stored.url,
        userId: systemUserId,
      },
      select: { id: true, url: true },
    });

    return { filename: file.filename, ok: true, imageId: image.id, url: image.url };
  } catch (error) {
    console.error(`admin gallery upload failed for ${file.filename}:`, error);
    return { filename: file.filename, ok: false, error: 'Gagal menyimpan berkas. Coba lagi.' };
  }
}

export async function processGalleryBatch(files: InputFile[]): Promise<UploadOutcome[]> {
  if (files.length > MAX_BATCH_FILES) {
    throw new Error(`Maksimal ${MAX_BATCH_FILES} berkas per unggahan.`);
  }
  const systemUser = await getOrCreateSystemUser();
  const outcomes: UploadOutcome[] = [];
  for (const file of files) {
    outcomes.push(await processGalleryFile(file, systemUser.id));
  }
  return outcomes;
}
