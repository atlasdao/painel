-- AlterTable
ALTER TABLE "public"."PaymentLink" ADD COLUMN     "isCustomAmount" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxAmount" DOUBLE PRECISION,
ADD COLUMN     "minAmount" DOUBLE PRECISION,
ALTER COLUMN "amount" DROP NOT NULL;
