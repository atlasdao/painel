-- CreateEnum
CREATE TYPE "public"."ApiKeyUsageType" AS ENUM ('SINGLE_CPF', 'MULTIPLE_CPF');

-- AlterTable
ALTER TABLE "public"."ApiKeyRequest" ADD COLUMN     "usageType" "public"."ApiKeyUsageType" NOT NULL DEFAULT 'SINGLE_CPF';

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "apiDailyLimit" DOUBLE PRECISION NOT NULL DEFAULT 6000,
ADD COLUMN     "apiMonthlyLimit" DOUBLE PRECISION NOT NULL DEFAULT 180000,
ADD COLUMN     "isAccountValidated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "validatedAt" TIMESTAMP(3),
ADD COLUMN     "validationPaymentId" TEXT;

-- CreateTable
CREATE TABLE "public"."PaymentLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "description" TEXT,
    "currentQrCode" TEXT,
    "qrCodeGeneratedAt" TIMESTAMP(3),
    "lastPaymentId" TEXT,
    "totalPayments" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLink_shortCode_key" ON "public"."PaymentLink"("shortCode");

-- CreateIndex
CREATE INDEX "PaymentLink_shortCode_idx" ON "public"."PaymentLink"("shortCode");

-- CreateIndex
CREATE INDEX "PaymentLink_userId_idx" ON "public"."PaymentLink"("userId");

-- CreateIndex
CREATE INDEX "PaymentLink_isActive_idx" ON "public"."PaymentLink"("isActive");

-- AddForeignKey
ALTER TABLE "public"."PaymentLink" ADD CONSTRAINT "PaymentLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
