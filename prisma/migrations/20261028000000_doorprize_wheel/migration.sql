-- CreateTable
CREATE TABLE "wheel_prizes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wheel_prizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wheel_participants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wheel_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wheel_draws" (
    "id" TEXT NOT NULL,
    "prizeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "drawnAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wheel_draws_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wheel_participants_userId_key" ON "wheel_participants"("userId");

-- CreateIndex
CREATE INDEX "wheel_draws_prizeId_idx" ON "wheel_draws"("prizeId");

-- CreateIndex
CREATE INDEX "wheel_draws_userId_idx" ON "wheel_draws"("userId");

-- CreateIndex
CREATE INDEX "wheel_draws_drawnAt_idx" ON "wheel_draws"("drawnAt");

-- AddForeignKey
ALTER TABLE "wheel_participants" ADD CONSTRAINT "wheel_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wheel_draws" ADD CONSTRAINT "wheel_draws_prizeId_fkey" FOREIGN KEY ("prizeId") REFERENCES "wheel_prizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wheel_draws" ADD CONSTRAINT "wheel_draws_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
