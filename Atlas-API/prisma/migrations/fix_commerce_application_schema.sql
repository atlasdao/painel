-- Fix CommerceApplication schema to match Prisma schema
-- This migration aligns the database schema with the Prisma schema

BEGIN;

-- Drop existing columns that are not in Prisma schema
ALTER TABLE "CommerceApplication" DROP COLUMN IF EXISTS "cnpj";
ALTER TABLE "CommerceApplication" DROP COLUMN IF EXISTS "website";
ALTER TABLE "CommerceApplication" DROP COLUMN IF EXISTS "approvedAt";
ALTER TABLE "CommerceApplication" DROP COLUMN IF EXISTS "rejectedAt";

-- Rename columns to match Prisma schema
ALTER TABLE "CommerceApplication" RENAME COLUMN "estimatedMonthlyVolume" TO "monthlyVolume";
ALTER TABLE "CommerceApplication" RENAME COLUMN "businessDescription" TO "productDescription";

-- Add missing columns from Prisma schema
ALTER TABLE "CommerceApplication" ADD COLUMN IF NOT EXISTS "targetAudience" TEXT NOT NULL DEFAULT 'General public';
ALTER TABLE "CommerceApplication" ADD COLUMN IF NOT EXISTS "hasPhysicalStore" TEXT NOT NULL DEFAULT 'No';
ALTER TABLE "CommerceApplication" ADD COLUMN IF NOT EXISTS "socialMedia" TEXT NOT NULL DEFAULT 'N/A';
ALTER TABLE "CommerceApplication" ADD COLUMN IF NOT EXISTS "businessObjective" TEXT NOT NULL DEFAULT 'Sales';
ALTER TABLE "CommerceApplication" ADD COLUMN IF NOT EXISTS "depositAmount" DOUBLE PRECISION DEFAULT 100000;
ALTER TABLE "CommerceApplication" ADD COLUMN IF NOT EXISTS "depositPaid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CommerceApplication" ADD COLUMN IF NOT EXISTS "depositPaidAt" TIMESTAMP(3);
ALTER TABLE "CommerceApplication" ADD COLUMN IF NOT EXISTS "depositRefunded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CommerceApplication" ADD COLUMN IF NOT EXISTS "depositRefundedAt" TIMESTAMP(3);
ALTER TABLE "CommerceApplication" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "CommerceApplication" ADD COLUMN IF NOT EXISTS "transactionCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CommerceApplication" ADD COLUMN IF NOT EXISTS "commerceActivatedAt" TIMESTAMP(3);

-- Ensure the userId unique index exists
CREATE UNIQUE INDEX IF NOT EXISTS "CommerceApplication_userId_key" ON "CommerceApplication"("userId");

-- Remove reviewedBy foreign key if exists and recreate properly
ALTER TABLE "CommerceApplication" DROP CONSTRAINT IF EXISTS "CommerceApplication_reviewedBy_fkey";
ALTER TABLE "CommerceApplication" ADD CONSTRAINT "CommerceApplication_reviewedBy_fkey"
    FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Ensure userId foreign key is correct
ALTER TABLE "CommerceApplication" DROP CONSTRAINT IF EXISTS "CommerceApplication_userId_fkey";
ALTER TABLE "CommerceApplication" ADD CONSTRAINT "CommerceApplication_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
