-- AlterTable: Update UserLevel schema to match Prisma model

-- Add new columns
ALTER TABLE "public"."UserLevel" ADD COLUMN IF NOT EXISTS "level" INTEGER;
ALTER TABLE "public"."UserLevel" ADD COLUMN IF NOT EXISTS "dailyLimitBrl" DECIMAL(10,2);
ALTER TABLE "public"."UserLevel" ADD COLUMN IF NOT EXISTS "dailyUsedBrl" DECIMAL(10,2) DEFAULT 0;
ALTER TABLE "public"."UserLevel" ADD COLUMN IF NOT EXISTS "totalVolumeBrl" DECIMAL(12,2);
ALTER TABLE "public"."UserLevel" ADD COLUMN IF NOT EXISTS "completedTransactions" INTEGER DEFAULT 0;
ALTER TABLE "public"."UserLevel" ADD COLUMN IF NOT EXISTS "lastLimitReset" TIMESTAMP(3);
ALTER TABLE "public"."UserLevel" ADD COLUMN IF NOT EXISTS "lastLevelUpgrade" TIMESTAMP(3);
ALTER TABLE "public"."UserLevel" ADD COLUMN IF NOT EXISTS "syncedFromBot" BOOLEAN DEFAULT false;
ALTER TABLE "public"."UserLevel" ADD COLUMN IF NOT EXISTS "botExternalId" TEXT;

-- Migrate data from old columns to new columns
UPDATE "public"."UserLevel" SET
  "level" = COALESCE("currentLevel", 1),
  "totalVolumeBrl" = COALESCE("totalVolume", 0),
  "lastLevelUpgrade" = "lastLevelUpdate",
  "lastLimitReset" = COALESCE("lastLevelUpdate", NOW())
WHERE "level" IS NULL;

-- Make required columns NOT NULL
ALTER TABLE "public"."UserLevel" ALTER COLUMN "level" SET DEFAULT 0;
ALTER TABLE "public"."UserLevel" ALTER COLUMN "level" SET NOT NULL;
ALTER TABLE "public"."UserLevel" ALTER COLUMN "dailyLimitBrl" SET DEFAULT 0;
ALTER TABLE "public"."UserLevel" ALTER COLUMN "dailyLimitBrl" SET NOT NULL;
ALTER TABLE "public"."UserLevel" ALTER COLUMN "dailyUsedBrl" SET NOT NULL;
ALTER TABLE "public"."UserLevel" ALTER COLUMN "totalVolumeBrl" SET DEFAULT 0;
ALTER TABLE "public"."UserLevel" ALTER COLUMN "totalVolumeBrl" SET NOT NULL;
ALTER TABLE "public"."UserLevel" ALTER COLUMN "completedTransactions" SET NOT NULL;
ALTER TABLE "public"."UserLevel" ALTER COLUMN "lastLimitReset" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "public"."UserLevel" ALTER COLUMN "lastLimitReset" SET NOT NULL;

-- Drop old columns
ALTER TABLE "public"."UserLevel" DROP COLUMN IF EXISTS "currentLevel";
ALTER TABLE "public"."UserLevel" DROP COLUMN IF EXISTS "totalVolume";
ALTER TABLE "public"."UserLevel" DROP COLUMN IF EXISTS "volumeToNextLevel";
ALTER TABLE "public"."UserLevel" DROP COLUMN IF EXISTS "lastLevelUpdate";

-- Recreate indexes
DROP INDEX IF EXISTS "UserLevel_currentLevel_idx";
CREATE INDEX IF NOT EXISTS "UserLevel_level_idx" ON "public"."UserLevel"("level");
CREATE INDEX IF NOT EXISTS "UserLevel_botExternalId_idx" ON "public"."UserLevel"("botExternalId");
CREATE INDEX IF NOT EXISTS "UserLevel_lastLimitReset_idx" ON "public"."UserLevel"("lastLimitReset");
CREATE INDEX IF NOT EXISTS "UserLevel_dailyLimitBrl_idx" ON "public"."UserLevel"("dailyLimitBrl");
