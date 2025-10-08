-- AlterTable: Update LevelConfig schema to match new structure

-- Add new columns
ALTER TABLE "public"."LevelConfig" ADD COLUMN IF NOT EXISTS "dailyLimitBrl" DECIMAL(10,2);
ALTER TABLE "public"."LevelConfig" ADD COLUMN IF NOT EXISTS "maxPerTransactionBrl" DECIMAL(10,2);
ALTER TABLE "public"."LevelConfig" ADD COLUMN IF NOT EXISTS "minTransactionsForUpgrade" INTEGER;
ALTER TABLE "public"."LevelConfig" ADD COLUMN IF NOT EXISTS "minVolumeForUpgrade" DECIMAL(12,2);
ALTER TABLE "public"."LevelConfig" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- Migrate data from old columns to new columns
UPDATE "public"."LevelConfig" SET
  "dailyLimitBrl" = "dailyLimit",
  "minVolumeForUpgrade" = "minVolume",
  "maxPerTransactionBrl" = "dailyLimit" * 0.5,  -- Set max per transaction to 50% of daily limit
  "minTransactionsForUpgrade" = CASE
    WHEN level = 1 THEN 10
    WHEN level = 2 THEN 50
    WHEN level = 3 THEN 100
    WHEN level = 4 THEN 200
    ELSE 500
  END,
  "description" = name || ' - ' || COALESCE(benefits, '')
WHERE "dailyLimitBrl" IS NULL;

-- Drop old primary key constraint
ALTER TABLE "public"."LevelConfig" DROP CONSTRAINT IF EXISTS "LevelConfig_pkey";

-- Make level the primary key
ALTER TABLE "public"."LevelConfig" ADD PRIMARY KEY ("level");

-- Drop old columns
ALTER TABLE "public"."LevelConfig" DROP COLUMN IF EXISTS "id";
ALTER TABLE "public"."LevelConfig" DROP COLUMN IF EXISTS "minVolume";
ALTER TABLE "public"."LevelConfig" DROP COLUMN IF EXISTS "dailyLimit";
ALTER TABLE "public"."LevelConfig" DROP COLUMN IF EXISTS "monthlyLimit";
ALTER TABLE "public"."LevelConfig" DROP COLUMN IF EXISTS "benefits";

-- Make required columns NOT NULL
ALTER TABLE "public"."LevelConfig" ALTER COLUMN "dailyLimitBrl" SET NOT NULL;
ALTER TABLE "public"."LevelConfig" ALTER COLUMN "minTransactionsForUpgrade" SET NOT NULL;
ALTER TABLE "public"."LevelConfig" ALTER COLUMN "minVolumeForUpgrade" SET NOT NULL;
ALTER TABLE "public"."LevelConfig" ALTER COLUMN "description" SET NOT NULL;

-- Recreate index
CREATE INDEX IF NOT EXISTS "LevelConfig_level_idx" ON "public"."LevelConfig"("level");
