-- Migration to rename CommerceApplication fields to match new form questions
-- This will preserve existing data while updating field names to be semantically correct

BEGIN;

-- Add new columns for the split businessObjective field
ALTER TABLE "CommerceApplication"
ADD COLUMN "refundProcess" TEXT,
ADD COLUMN "businessProof" TEXT,
ADD COLUMN "contactInfo" TEXT;

-- Parse and migrate data from businessObjective to new fields
-- For existing records, try to extract the information from the concatenated string
UPDATE "CommerceApplication"
SET
  "refundProcess" = CASE
    WHEN "businessObjective" LIKE '%Processo de reembolso:%' THEN
      TRIM(SUBSTRING("businessObjective" FROM 'Processo de reembolso: (.+?)(\n|$)'))
    ELSE NULL
  END,
  "businessProof" = CASE
    WHEN "businessObjective" LIKE '%Comprovação:%' THEN
      TRIM(SUBSTRING("businessObjective" FROM 'Comprovação: (.+?)(\n|$)'))
    ELSE NULL
  END,
  "contactInfo" = CASE
    WHEN "businessObjective" LIKE '%Contato:%' THEN
      TRIM(SUBSTRING("businessObjective" FROM 'Contato: (.+?)(\n|$)'))
    ELSE NULL
  END;

-- Rename columns to match the actual form questions
ALTER TABLE "CommerceApplication"
RENAME COLUMN "businessType" TO "productOrService";

ALTER TABLE "CommerceApplication"
RENAME COLUMN "productDescription" TO "averagePrices";

ALTER TABLE "CommerceApplication"
RENAME COLUMN "monthlyVolume" TO "monthlyPixSales";

ALTER TABLE "CommerceApplication"
RENAME COLUMN "targetAudience" TO "marketTime";

ALTER TABLE "CommerceApplication"
RENAME COLUMN "hasPhysicalStore" TO "references";

ALTER TABLE "CommerceApplication"
RENAME COLUMN "socialMedia" TO "refundRate";

-- Keep businessObjective for now as nullable (for backwards compatibility)
-- We can drop it later once we confirm everything works
ALTER TABLE "CommerceApplication"
ALTER COLUMN "businessObjective" DROP NOT NULL;

COMMIT;
