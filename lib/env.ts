import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  // Cloudinary storage — all three required together for uploads/deletions
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  EVENT_DATE: z.string().default('2026-12-31T18:00:00+07:00'),
  NEXT_PUBLIC_EVENT_DATE: z.string().default('2026-12-31T18:00:00+07:00'),
  // Community uploads open N hours after EVENT_DATE (countdown target). Unset = always open.
  UPLOAD_OPEN_HOURS_AFTER_EVENT: z.coerce.number().int().min(0).optional(),
  // Image pipeline limits (see openspec/changes/feat-image-optimization-pipeline)
  MAX_IMAGE_SIZE_MB: z.coerce.number().int().positive().default(10),
  IMAGE_PROCESSING_MAX_WIDTH: z.coerce.number().int().positive().default(1440),
  // Trigger.dev durable job runtime — optional until the project is connected
  TRIGGER_SECRET_KEY: z.string().optional(),
  TRIGGER_PROJECT_REF: z.string().optional(),
  // Admin console (HTTP Basic Auth on /admin) — both required when either is set
  ADMIN_USERNAME: z.string().min(1).optional(),
  ADMIN_PASSWORD: z.string().min(8, 'ADMIN_PASSWORD must be at least 8 characters').optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://mock:mock@localhost:5432/mock',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'dev_secret_only_for_local_testing_min_32_bytes_long',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID,
  LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  MAX_IMAGE_SIZE_MB: process.env.MAX_IMAGE_SIZE_MB,
  IMAGE_PROCESSING_MAX_WIDTH: process.env.IMAGE_PROCESSING_MAX_WIDTH,
  TRIGGER_SECRET_KEY: process.env.TRIGGER_SECRET_KEY,
  TRIGGER_PROJECT_REF: process.env.TRIGGER_PROJECT_REF,
  ADMIN_USERNAME: process.env.ADMIN_USERNAME,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  EVENT_DATE: process.env.EVENT_DATE || process.env.NEXT_PUBLIC_EVENT_DATE || '2026-12-31T18:00:00+07:00',
  NEXT_PUBLIC_EVENT_DATE: process.env.NEXT_PUBLIC_EVENT_DATE || process.env.EVENT_DATE || '2026-12-31T18:00:00+07:00',
  UPLOAD_OPEN_HOURS_AFTER_EVENT:
    process.env.UPLOAD_OPEN_HOURS_AFTER_EVENT ??
    process.env.NEXT_PUBLIC_UPLOAD_OPEN_HOURS_AFTER_EVENT,
  NODE_ENV: process.env.NODE_ENV,
});
