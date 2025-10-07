-- =====================================================
-- Atlas DAO - Post-Migration Verification Script
-- =====================================================
-- Date: 2025-10-07
-- Description: Verifies successful migration to V. Alpha 0.2
-- Author: Atlas DAO Development Team
-- =====================================================

DO $$
DECLARE
    v_errors TEXT := '';
    v_warnings TEXT := '';
    v_table_count INTEGER;
    v_column_count INTEGER;
    v_enum_exists BOOLEAN;
    v_user_level_count INTEGER;
    v_level_config_count INTEGER;
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Starting Post-Migration Verification for V. Alpha 0.2';
    RAISE NOTICE '=====================================================';

    -- =====================================================
    -- CHECK NEW TABLES
    -- =====================================================

    -- Check DiscountCoupon table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'DiscountCoupon') THEN
        RAISE NOTICE '✓ DiscountCoupon table created successfully';
    ELSE
        v_errors := v_errors || '- ERROR: DiscountCoupon table not found!' || E'\n';
    END IF;

    -- Check CouponUsage table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'CouponUsage') THEN
        RAISE NOTICE '✓ CouponUsage table created successfully';
    ELSE
        v_errors := v_errors || '- ERROR: CouponUsage table not found!' || E'\n';
    END IF;

    -- Check CommerceApplication table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'CommerceApplication') THEN
        RAISE NOTICE '✓ CommerceApplication table created successfully';
    ELSE
        v_errors := v_errors || '- ERROR: CommerceApplication table not found!' || E'\n';
    END IF;

    -- Check UserLevel table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'UserLevel') THEN
        RAISE NOTICE '✓ UserLevel table created successfully';
    ELSE
        v_errors := v_errors || '- ERROR: UserLevel table not found!' || E'\n';
    END IF;

    -- Check LevelConfig table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'LevelConfig') THEN
        RAISE NOTICE '✓ LevelConfig table created successfully';
    ELSE
        v_errors := v_errors || '- ERROR: LevelConfig table not found!' || E'\n';
    END IF;

    -- Check LevelHistory table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'LevelHistory') THEN
        RAISE NOTICE '✓ LevelHistory table created successfully';
    ELSE
        v_errors := v_errors || '- ERROR: LevelHistory table not found!' || E'\n';
    END IF;

    -- =====================================================
    -- CHECK NEW ENUM
    -- =====================================================

    SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommerceApplicationStatus')
    INTO v_enum_exists;

    IF v_enum_exists THEN
        RAISE NOTICE '✓ CommerceApplicationStatus enum created successfully';
    ELSE
        v_errors := v_errors || '- ERROR: CommerceApplicationStatus enum not found!' || E'\n';
    END IF;

    -- =====================================================
    -- CHECK NEW COLUMNS IN USER TABLE
    -- =====================================================

    -- Check critical new columns
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'User' AND column_name = 'twoFactorEnabled') THEN
        RAISE NOTICE '✓ User.twoFactorEnabled column added';
    ELSE
        v_errors := v_errors || '- ERROR: User.twoFactorEnabled column not found!' || E'\n';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'User' AND column_name = 'profilePicture') THEN
        RAISE NOTICE '✓ User.profilePicture column added';
    ELSE
        v_errors := v_errors || '- ERROR: User.profilePicture column not found!' || E'\n';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'User' AND column_name = 'externalUserId') THEN
        RAISE NOTICE '✓ User.externalUserId column added';
    ELSE
        v_errors := v_errors || '- ERROR: User.externalUserId column not found!' || E'\n';
    END IF;

    -- =====================================================
    -- CHECK PAYMENTLINK TABLE MODIFICATIONS
    -- =====================================================

    -- Check if amount column is nullable
    SELECT is_nullable INTO v_column_count
    FROM information_schema.columns
    WHERE table_name = 'PaymentLink' AND column_name = 'amount';

    IF v_column_count = 'YES' THEN
        RAISE NOTICE '✓ PaymentLink.amount column is now nullable';
    ELSE
        v_warnings := v_warnings || '- WARNING: PaymentLink.amount column is still NOT NULL' || E'\n';
    END IF;

    -- Check new columns in PaymentLink
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'PaymentLink' AND column_name = 'isCustomAmount') THEN
        RAISE NOTICE '✓ PaymentLink.isCustomAmount column added';
    ELSE
        v_errors := v_errors || '- ERROR: PaymentLink.isCustomAmount column not found!' || E'\n';
    END IF;

    -- =====================================================
    -- CHECK DATA MIGRATION
    -- =====================================================

    -- Check if LevelConfig has data
    SELECT COUNT(*) INTO v_level_config_count FROM "LevelConfig";
    IF v_level_config_count > 0 THEN
        RAISE NOTICE '✓ LevelConfig has % levels configured', v_level_config_count;
    ELSE
        v_warnings := v_warnings || '- WARNING: LevelConfig table is empty!' || E'\n';
    END IF;

    -- Check if UserLevel records were created
    SELECT COUNT(*) INTO v_user_level_count FROM "UserLevel";
    SELECT COUNT(*) INTO v_table_count FROM "User";

    IF v_user_level_count = v_table_count THEN
        RAISE NOTICE '✓ All % users have UserLevel records', v_user_level_count;
    ELSE
        v_warnings := v_warnings ||
            format('- WARNING: UserLevel count (%s) does not match User count (%s)',
                   v_user_level_count, v_table_count) || E'\n';
    END IF;

    -- =====================================================
    -- CHECK INDEXES
    -- =====================================================

    -- Check critical indexes
    IF EXISTS (SELECT 1 FROM pg_indexes
               WHERE tablename = 'User' AND indexname = 'User_externalUserId_key') THEN
        RAISE NOTICE '✓ User.externalUserId unique index created';
    ELSE
        v_warnings := v_warnings || '- WARNING: User.externalUserId unique index not found' || E'\n';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes
               WHERE tablename = 'DiscountCoupon' AND indexname = 'DiscountCoupon_code_idx') THEN
        RAISE NOTICE '✓ DiscountCoupon.code index created';
    ELSE
        v_warnings := v_warnings || '- WARNING: DiscountCoupon.code index not found' || E'\n';
    END IF;

    -- =====================================================
    -- CHECK FOREIGN KEY CONSTRAINTS
    -- =====================================================

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'CouponUsage_couponId_fkey'
    ) THEN
        RAISE NOTICE '✓ CouponUsage foreign keys created';
    ELSE
        v_errors := v_errors || '- ERROR: CouponUsage foreign keys not found!' || E'\n';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'UserLevel_userId_fkey'
    ) THEN
        RAISE NOTICE '✓ UserLevel foreign key created';
    ELSE
        v_errors := v_errors || '- ERROR: UserLevel foreign key not found!' || E'\n';
    END IF;

    -- =====================================================
    -- DISPLAY RESULTS
    -- =====================================================

    RAISE NOTICE '';
    RAISE NOTICE '=====================================================';

    IF v_errors = '' AND v_warnings = '' THEN
        RAISE NOTICE 'POST-MIGRATION CHECK PASSED SUCCESSFULLY!';
        RAISE NOTICE '';
        RAISE NOTICE 'Migration to V. Alpha 0.2 completed without issues.';
        RAISE NOTICE 'All new tables, columns, and constraints are in place.';
    ELSIF v_errors != '' THEN
        RAISE NOTICE 'POST-MIGRATION CHECK FOUND ERRORS:';
        RAISE NOTICE '%', v_errors;
        IF v_warnings != '' THEN
            RAISE NOTICE '';
            RAISE NOTICE 'WARNINGS:';
            RAISE NOTICE '%', v_warnings;
        END IF;
        RAISE NOTICE '';
        RAISE NOTICE 'Migration may have failed! Review errors above.';
        RAISE EXCEPTION 'Post-migration check failed with errors';
    ELSE
        RAISE NOTICE 'POST-MIGRATION CHECK PASSED WITH WARNINGS:';
        RAISE NOTICE '%', v_warnings;
        RAISE NOTICE '';
        RAISE NOTICE 'Migration completed but review warnings above.';
    END IF;

    RAISE NOTICE '=====================================================';
END $$;

-- =====================================================
-- MIGRATION STATISTICS
-- =====================================================

RAISE NOTICE '';
RAISE NOTICE 'Migration Statistics:';
RAISE NOTICE '-----------------------------------------------------';

-- Show new table counts
SELECT
    'New Tables Created' AS metric,
    COUNT(*) AS count
FROM information_schema.tables
WHERE table_name IN (
    'DiscountCoupon', 'CouponUsage', 'CommerceApplication',
    'UserLevel', 'LevelConfig', 'LevelHistory'
)
AND table_schema = 'public';

-- Show User table column count
SELECT
    'User Table Columns' AS metric,
    COUNT(*) AS count
FROM information_schema.columns
WHERE table_name = 'User'
AND table_schema = 'public';

-- Show total index count
SELECT
    'Total Indexes' AS metric,
    COUNT(*) AS count
FROM pg_indexes
WHERE schemaname = 'public';

-- Show total foreign key count
SELECT
    'Foreign Key Constraints' AS metric,
    COUNT(*) AS count
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
AND table_schema = 'public';

-- =====================================================
-- END OF POST-MIGRATION CHECK
-- =====================================================