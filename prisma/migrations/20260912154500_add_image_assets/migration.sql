-- CreateEnum
CREATE TYPE "ImageStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImageErrorCategory" AS ENUM ('INVALID_FILE', 'UNSUPPORTED_FORMAT', 'FILE_TOO_LARGE', 'DOWNLOAD_FAILED', 'PROCESSING_FAILED', 'STORAGE_FAILED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "image_assets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalKey" TEXT NOT NULL,
    "originalUrl" TEXT,
    "originalMime" TEXT,
    "originalSize" BIGINT,
    "status" "ImageStatus" NOT NULL DEFAULT 'QUEUED',
    "width" INTEGER,
    "height" INTEGER,
    "variants" JSONB,
    "errorMessage" TEXT,
    "errorCategory" "ImageErrorCategory",
    "jobRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "image_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "image_assets_originalKey_key" ON "image_assets"("originalKey");

-- CreateIndex
CREATE INDEX "image_assets_status_idx" ON "image_assets"("status");

-- CreateIndex
CREATE INDEX "image_assets_userId_idx" ON "image_assets"("userId");

-- AddForeignKey
ALTER TABLE "image_assets" ADD CONSTRAINT "image_assets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
