-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "commerceMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "commerceModeActivatedAt" TIMESTAMP(3),
ADD COLUMN     "paymentLinksEnabled" BOOLEAN NOT NULL DEFAULT false;
