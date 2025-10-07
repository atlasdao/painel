-- =====================================================
-- Atlas DAO - Rollback Script from V. Alpha 0.2
-- =====================================================
-- Date: 2025-10-07
-- Description: Rollback migration from V. Alpha 0.2 to previous version
-- Author: Atlas DAO Development Team
-- WARNING: This will remove all data from new tables!
-- =====================================================

-- Start transaction for atomic execution
BEGIN;

-- =====================================================
-- STEP 1: DROP TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_discountcoupon_updated_at ON "DiscountCoupon";
DROP TRIGGER IF EXISTS update_commerceapplication_updated_at ON "CommerceApplication";
DROP TRIGGER IF EXISTS update_userlevel_updated_at ON "UserLevel";
DROP TRIGGER IF EXISTS update_levelconfig_updated_at ON "LevelConfig";

RAISE NOTICE 'Dropped triggers from new tables';

-- =====================================================
-- STEP 2: DROP NEW TABLES (CASCADE will drop foreign keys)
-- =====================================================

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS "LevelHistory" CASCADE;
DROP TABLE IF EXISTS "LevelConfig" CASCADE;
DROP TABLE IF EXISTS "UserLevel" CASCADE;
DROP TABLE IF EXISTS "CommerceApplication" CASCADE;
DROP TABLE IF EXISTS "CouponUsage" CASCADE;
DROP TABLE IF EXISTS "DiscountCoupon" CASCADE;

RAISE NOTICE 'Dropped all new tables';

-- =====================================================
-- STEP 3: REMOVE NEW COLUMNS FROM EXISTING TABLES
-- =====================================================

-- Remove columns from User table
ALTER TABLE "User" DROP COLUMN IF EXISTS "verifiedTaxNumber";
ALTER TABLE "User" DROP COLUMN IF EXISTS "profilePicture";
ALTER TABLE "User" DROP COLUMN IF EXISTS "defaultWalletAddress";
ALTER TABLE "User" DROP COLUMN IF EXISTS "defaultWalletType";
ALTER TABLE "User" DROP COLUMN IF EXISTS "pixKey";
ALTER TABLE "User" DROP COLUMN IF EXISTS "pixKeyType";
ALTER TABLE "User" DROP COLUMN IF EXISTS "twoFactorEnabled";
ALTER TABLE "User" DROP COLUMN IF EXISTS "twoFactorSecret";
ALTER TABLE "User" DROP COLUMN IF EXISTS "botExternalId";
ALTER TABLE "User" DROP COLUMN IF EXISTS "externalUserId";

RAISE NOTICE 'Removed new columns from User table';

-- Revert PaymentLink table changes
ALTER TABLE "PaymentLink" DROP COLUMN IF EXISTS "isCustomAmount";
ALTER TABLE "PaymentLink" DROP COLUMN IF EXISTS "minAmount";
ALTER TABLE "PaymentLink" DROP COLUMN IF EXISTS "maxAmount";
-- Restore NOT NULL constraint on amount
ALTER TABLE "PaymentLink" ALTER COLUMN "amount" SET NOT NULL;

RAISE NOTICE 'Reverted PaymentLink table changes';

-- =====================================================
-- STEP 4: DROP NEW INDEXES
-- =====================================================

-- These indexes are automatically dropped when columns are dropped
-- but explicitly dropping them for clarity
DROP INDEX IF EXISTS "User_verifiedTaxNumber_idx";
DROP INDEX IF EXISTS "User_botExternalId_idx";
DROP INDEX IF EXISTS "User_externalUserId_key";

RAISE NOTICE 'Dropped new indexes';

-- =====================================================
-- STEP 5: DROP NEW ENUMS
-- =====================================================

DROP TYPE IF EXISTS "CommerceApplicationStatus" CASCADE;

RAISE NOTICE 'Dropped new enum types';

-- =====================================================
-- ROLLBACK COMPLETE
-- =====================================================

-- Commit the transaction
COMMIT;

-- Display rollback summary
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Rollback from V. Alpha 0.2 completed successfully!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Summary of rollback:';
    RAISE NOTICE '- Dropped 6 new tables';
    RAISE NOTICE '- Removed new columns from User table';
    RAISE NOTICE '- Reverted PaymentLink table changes';
    RAISE NOTICE '- Dropped new enum types';
    RAISE NOTICE '- Removed associated triggers and indexes';
    RAISE NOTICE '';
    RAISE NOTICE 'WARNING: All data in the new tables has been lost!';
    RAISE NOTICE '=====================================================';
END $$;