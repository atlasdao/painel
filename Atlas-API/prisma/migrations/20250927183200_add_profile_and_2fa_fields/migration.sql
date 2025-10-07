-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "defaultWalletAddress" TEXT,
ADD COLUMN     "defaultWalletType" TEXT DEFAULT 'LIQUID',
ADD COLUMN     "profilePicture" TEXT,
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorSecret" TEXT;
