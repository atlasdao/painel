-- =====================================================
-- Atlas DAO - Migration Script to V. Alpha 0.2
-- =====================================================
-- Date: 2025-10-07
-- Description: Migrates production database to V. Alpha 0.2 schema
-- Author: Atlas DAO Development Team
-- =====================================================

-- Start transaction for atomic execution
BEGIN;

-- =====================================================
-- STEP 1: CREATE NEW ENUMS
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommerceApplicationStatus') THEN
        CREATE TYPE "CommerceApplicationStatus" AS ENUM (
            'PENDING',
            'UNDER_REVIEW',
            'APPROVED',
            'REJECTED',
            'DEPOSIT_PENDING',
            'ACTIVE'
        );
        RAISE NOTICE 'Created enum CommerceApplicationStatus';
    END IF;
END $$;

-- =====================================================
-- STEP 2: ALTER EXISTING TABLES - Add new columns to User table
-- =====================================================

-- Add profile and verification fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verifiedTaxNumber" VARCHAR(255);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profilePicture" TEXT;

-- Add wallet and PIX fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "defaultWalletAddress" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "defaultWalletType" VARCHAR(50) DEFAULT 'LIQUID';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pixKey" VARCHAR(255);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pixKeyType" "PixKeyType";

-- Add two-factor authentication fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorSecret" TEXT;

-- Add external system integration fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "botExternalId" VARCHAR(255);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "externalUserId" VARCHAR(255);

-- Create indexes for User table new columns
CREATE INDEX IF NOT EXISTS "User_verifiedTaxNumber_idx" ON "User"("verifiedTaxNumber");
CREATE INDEX IF NOT EXISTS "User_botExternalId_idx" ON "User"("botExternalId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_externalUserId_key" ON "User"("externalUserId");

RAISE NOTICE 'Updated User table with new columns';

-- =====================================================
-- STEP 3: ALTER PaymentLink table
-- =====================================================

-- Make amount optional and add custom amount fields
ALTER TABLE "PaymentLink" ALTER COLUMN "amount" DROP NOT NULL;
ALTER TABLE "PaymentLink" ADD COLUMN IF NOT EXISTS "isCustomAmount" BOOLEAN DEFAULT false;
ALTER TABLE "PaymentLink" ADD COLUMN IF NOT EXISTS "minAmount" DOUBLE PRECISION;
ALTER TABLE "PaymentLink" ADD COLUMN IF NOT EXISTS "maxAmount" DOUBLE PRECISION;

RAISE NOTICE 'Updated PaymentLink table for custom amounts';

-- =====================================================
-- STEP 4: CREATE NEW TABLES
-- =====================================================

-- Create DiscountCoupon table
CREATE TABLE IF NOT EXISTS "DiscountCoupon" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "code" VARCHAR(50) NOT NULL UNIQUE,
    "description" TEXT,
    "discountPercentage" DOUBLE PRECISION NOT NULL,
    "maxUses" INTEGER,
    "maxUsesPerUser" INTEGER NOT NULL DEFAULT 1,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP NOT NULL DEFAULT NOW(),
    "validUntil" TIMESTAMP,
    "minAmount" DOUBLE PRECISION,
    "maxAmount" DOUBLE PRECISION,
    "allowedMethods" VARCHAR(20)[] DEFAULT ARRAY['PIX', 'DEPIX'],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "createdBy" VARCHAR(255)
);

-- Create indexes for DiscountCoupon
CREATE INDEX IF NOT EXISTS "DiscountCoupon_code_idx" ON "DiscountCoupon"("code");
CREATE INDEX IF NOT EXISTS "DiscountCoupon_isActive_idx" ON "DiscountCoupon"("isActive");
CREATE INDEX IF NOT EXISTS "DiscountCoupon_validUntil_idx" ON "DiscountCoupon"("validUntil");

RAISE NOTICE 'Created DiscountCoupon table';

-- Create CouponUsage table
CREATE TABLE IF NOT EXISTS "CouponUsage" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "couponId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "withdrawalRequestId" UUID,
    "discountApplied" DOUBLE PRECISION NOT NULL,
    "originalFee" DOUBLE PRECISION NOT NULL,
    "finalFee" DOUBLE PRECISION NOT NULL,
    "usedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "CouponUsage_couponId_fkey" FOREIGN KEY ("couponId")
        REFERENCES "DiscountCoupon"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CouponUsage_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CouponUsage_withdrawalRequestId_fkey" FOREIGN KEY ("withdrawalRequestId")
        REFERENCES "WithdrawalRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create indexes and unique constraint for CouponUsage
CREATE INDEX IF NOT EXISTS "CouponUsage_couponId_idx" ON "CouponUsage"("couponId");
CREATE INDEX IF NOT EXISTS "CouponUsage_userId_idx" ON "CouponUsage"("userId");
CREATE INDEX IF NOT EXISTS "CouponUsage_usedAt_idx" ON "CouponUsage"("usedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "CouponUsage_unique_idx"
    ON "CouponUsage"("couponId", "userId", "withdrawalRequestId");

RAISE NOTICE 'Created CouponUsage table';

-- Create CommerceApplication table
CREATE TABLE IF NOT EXISTS "CommerceApplication" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL UNIQUE,
    "businessName" VARCHAR(255) NOT NULL,
    "businessType" VARCHAR(100) NOT NULL,
    "monthlyVolume" VARCHAR(100) NOT NULL,
    "productDescription" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "hasPhysicalStore" VARCHAR(10) NOT NULL,
    "socialMedia" TEXT NOT NULL,
    "businessObjective" TEXT NOT NULL,
    "status" "CommerceApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "depositAmount" DOUBLE PRECISION DEFAULT 100000,
    "depositPaid" BOOLEAN NOT NULL DEFAULT false,
    "depositPaidAt" TIMESTAMP,
    "depositRefunded" BOOLEAN NOT NULL DEFAULT false,
    "depositRefundedAt" TIMESTAMP,
    "reviewedBy" VARCHAR(255),
    "reviewedAt" TIMESTAMP,
    "reviewNotes" TEXT,
    "rejectionReason" TEXT,
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "commerceActivatedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "CommerceApplication_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for CommerceApplication
CREATE INDEX IF NOT EXISTS "CommerceApplication_status_idx" ON "CommerceApplication"("status");
CREATE INDEX IF NOT EXISTS "CommerceApplication_createdAt_idx" ON "CommerceApplication"("createdAt");

RAISE NOTICE 'Created CommerceApplication table';

-- Create UserLevel table
CREATE TABLE IF NOT EXISTS "UserLevel" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL UNIQUE,
    "level" INTEGER NOT NULL DEFAULT 0,
    "dailyLimitBrl" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "dailyUsedBrl" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalVolumeBrl" DECIMAL(12,2) DEFAULT 0,
    "completedTransactions" INTEGER NOT NULL DEFAULT 0,
    "lastLimitReset" TIMESTAMP NOT NULL DEFAULT NOW(),
    "lastLevelUpgrade" TIMESTAMP,
    "syncedFromBot" BOOLEAN NOT NULL DEFAULT false,
    "botExternalId" VARCHAR(255),
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "UserLevel_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for UserLevel
CREATE INDEX IF NOT EXISTS "UserLevel_userId_idx" ON "UserLevel"("userId");
CREATE INDEX IF NOT EXISTS "UserLevel_level_idx" ON "UserLevel"("level");
CREATE INDEX IF NOT EXISTS "UserLevel_botExternalId_idx" ON "UserLevel"("botExternalId");
CREATE INDEX IF NOT EXISTS "UserLevel_lastLimitReset_idx" ON "UserLevel"("lastLimitReset");
CREATE INDEX IF NOT EXISTS "UserLevel_dailyLimitBrl_idx" ON "UserLevel"("dailyLimitBrl");

RAISE NOTICE 'Created UserLevel table';

-- Create LevelConfig table
CREATE TABLE IF NOT EXISTS "LevelConfig" (
    "level" INTEGER PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL,
    "dailyLimitBrl" DECIMAL(10,2) NOT NULL,
    "maxPerTransactionBrl" DECIMAL(10,2),
    "minTransactionsForUpgrade" INTEGER NOT NULL,
    "minVolumeForUpgrade" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index for LevelConfig
CREATE INDEX IF NOT EXISTS "LevelConfig_level_idx" ON "LevelConfig"("level");

RAISE NOTICE 'Created LevelConfig table';

-- Create LevelHistory table
CREATE TABLE IF NOT EXISTS "LevelHistory" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "oldLevel" INTEGER NOT NULL,
    "newLevel" INTEGER NOT NULL,
    "oldLimit" DECIMAL(10,2) NOT NULL,
    "newLimit" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "LevelHistory_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for LevelHistory
CREATE INDEX IF NOT EXISTS "LevelHistory_userId_idx" ON "LevelHistory"("userId");
CREATE INDEX IF NOT EXISTS "LevelHistory_createdAt_idx" ON "LevelHistory"("createdAt");
CREATE INDEX IF NOT EXISTS "LevelHistory_newLevel_idx" ON "LevelHistory"("newLevel");

RAISE NOTICE 'Created LevelHistory table';

-- =====================================================
-- STEP 5: CREATE TRIGGERS FOR updatedAt columns
-- =====================================================

-- Add triggers for new tables
CREATE TRIGGER update_discountcoupon_updated_at BEFORE UPDATE ON "DiscountCoupon"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commerceapplication_updated_at BEFORE UPDATE ON "CommerceApplication"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_userlevel_updated_at BEFORE UPDATE ON "UserLevel"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_levelconfig_updated_at BEFORE UPDATE ON "LevelConfig"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

RAISE NOTICE 'Created triggers for new tables';

-- =====================================================
-- STEP 6: INSERT DEFAULT LEVEL CONFIGURATIONS
-- =====================================================

-- Insert default level configurations if they don't exist
INSERT INTO "LevelConfig" ("level", "name", "dailyLimitBrl", "maxPerTransactionBrl", "minTransactionsForUpgrade", "minVolumeForUpgrade", "description")
VALUES
    (0, 'Iniciante', 500.00, 500.00, 0, 0, 'Nível inicial - Limite diário de R$ 500'),
    (1, 'Bronze', 6000.00, 5000.00, 10, 5000, 'Limite diário de R$ 6.000'),
    (2, 'Prata', 10000.00, 10000.00, 50, 50000, 'Limite diário de R$ 10.000'),
    (3, 'Ouro', 20000.00, 20000.00, 100, 150000, 'Limite diário de R$ 20.000'),
    (4, 'Platina', 50000.00, 35000.00, 200, 500000, 'Limite diário de R$ 50.000'),
    (5, 'Diamante', 100000.00, 35000.00, 500, 1000000, 'Limite diário de R$ 100.000')
ON CONFLICT ("level") DO NOTHING;

RAISE NOTICE 'Inserted default level configurations';

-- =====================================================
-- STEP 7: DATA MIGRATION
-- =====================================================

-- Create UserLevel records for existing users if they don't have one
INSERT INTO "UserLevel" ("userId", "level", "dailyLimitBrl")
SELECT u."id", 1, 6000.00
FROM "User" u
LEFT JOIN "UserLevel" ul ON u."id" = ul."userId"
WHERE ul."id" IS NULL;

RAISE NOTICE 'Created UserLevel records for existing users';

-- =====================================================
-- STEP 8: ADD TABLE COMMENTS
-- =====================================================

COMMENT ON TABLE "DiscountCoupon" IS 'Discount coupons for withdrawal fee reductions';
COMMENT ON TABLE "CouponUsage" IS 'Track coupon usage by users';
COMMENT ON TABLE "CommerceApplication" IS 'Commerce mode applications and approval workflow';
COMMENT ON TABLE "UserLevel" IS 'User level and limit management system';
COMMENT ON TABLE "LevelConfig" IS 'Configuration for each user level';
COMMENT ON TABLE "LevelHistory" IS 'History of user level changes';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Commit the transaction
COMMIT;

-- Display migration summary
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Migration to V. Alpha 0.2 completed successfully!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Summary of changes:';
    RAISE NOTICE '- Added new columns to User table (2FA, profile, external IDs)';
    RAISE NOTICE '- Updated PaymentLink table for custom amounts';
    RAISE NOTICE '- Created 6 new tables (DiscountCoupon, CouponUsage, CommerceApplication, UserLevel, LevelConfig, LevelHistory)';
    RAISE NOTICE '- Added 1 new enum (CommerceApplicationStatus)';
    RAISE NOTICE '- Created indexes and triggers for all new tables';
    RAISE NOTICE '- Inserted default level configurations';
    RAISE NOTICE '- Migrated existing users to level system';
    RAISE NOTICE '=====================================================';
END $$;