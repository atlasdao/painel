-- CreateEnum
CREATE TYPE "CommerceApplicationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DEPOSIT_PENDING', 'ACTIVE');

-- CreateTable
CREATE TABLE "CommerceApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "monthlyVolume" TEXT NOT NULL,
    "productDescription" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "hasPhysicalStore" TEXT NOT NULL,
    "socialMedia" TEXT NOT NULL,
    "businessObjective" TEXT NOT NULL,
    "status" "CommerceApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "depositAmount" DOUBLE PRECISION DEFAULT 100000,
    "depositPaid" BOOLEAN NOT NULL DEFAULT false,
    "depositPaidAt" TIMESTAMP(3),
    "depositRefunded" BOOLEAN NOT NULL DEFAULT false,
    "depositRefundedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "rejectionReason" TEXT,
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "commerceActivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommerceApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommerceApplication_userId_key" ON "CommerceApplication"("userId");

-- CreateIndex
CREATE INDEX "CommerceApplication_status_idx" ON "CommerceApplication"("status");

-- CreateIndex
CREATE INDEX "CommerceApplication_createdAt_idx" ON "CommerceApplication"("createdAt");

-- AddForeignKey
ALTER TABLE "CommerceApplication" ADD CONSTRAINT "CommerceApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;