-- AlterTable
ALTER TABLE "images" ADD COLUMN "imageAssetId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "images_imageAssetId_key" ON "images"("imageAssetId");
