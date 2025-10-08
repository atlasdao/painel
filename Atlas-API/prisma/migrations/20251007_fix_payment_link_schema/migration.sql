-- AlterTable: Fix PaymentLink schema to match Prisma model

-- Rename allowCustomAmount to isCustomAmount
ALTER TABLE "public"."PaymentLink" RENAME COLUMN "allowCustomAmount" TO "isCustomAmount";

-- Make amount nullable
ALTER TABLE "public"."PaymentLink" ALTER COLUMN "amount" DROP NOT NULL;
