-- AlterTable
-- Add missing columns to User table
ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "verifiedTaxNumber" TEXT;
ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "botExternalId" TEXT;
ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "externalUserId" TEXT;
ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "profilePicture" TEXT;
ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "defaultWalletAddress" TEXT;
ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "defaultWalletType" TEXT DEFAULT 'LIQUID';
ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "twoFactorSecret" TEXT;
ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "pixKey" TEXT;

-- Create PixKeyType enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "PixKeyType" AS ENUM ('CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM_KEY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "pixKeyType" "PixKeyType";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_verifiedTaxNumber_idx" ON "public"."User"("verifiedTaxNumber");
CREATE INDEX IF NOT EXISTS "User_botExternalId_idx" ON "public"."User"("botExternalId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_externalUserId_key" ON "public"."User"("externalUserId");
