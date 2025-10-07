-- =====================================================
-- Atlas DAO - Pre-Migration Check Script
-- =====================================================
-- Date: 2025-10-07
-- Description: Verifies database state before migration to V. Alpha 0.2
-- Author: Atlas DAO Development Team
-- =====================================================

-- =====================================================
-- PRE-MIGRATION CHECKS - RUN THIS BEFORE MIGRATION!
-- =====================================================

DO $$
DECLARE
    v_user_count INTEGER;
    v_transaction_count INTEGER;
    v_withdrawal_count INTEGER;
    v_has_uuid_extension BOOLEAN;
    v_has_update_trigger BOOLEAN;
    v_errors TEXT := '';
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Starting Pre-Migration Checks for V. Alpha 0.2';
    RAISE NOTICE '=====================================================';

    -- Check 1: UUID extension
    SELECT EXISTS(
        SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp'
    ) INTO v_has_uuid_extension;

    IF NOT v_has_uuid_extension THEN
        v_errors := v_errors || '- ERROR: uuid-ossp extension not found!' || E'\n';
    ELSE
        RAISE NOTICE '✓ UUID extension is installed';
    END IF;

    -- Check 2: Update trigger function
    SELECT EXISTS(
        SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
    ) INTO v_has_update_trigger;

    IF NOT v_has_update_trigger THEN
        v_errors := v_errors || '- ERROR: update_updated_at_column trigger function not found!' || E'\n';
    ELSE
        RAISE NOTICE '✓ Update trigger function exists';
    END IF;

    -- Check 3: Count existing data
    SELECT COUNT(*) FROM "User" INTO v_user_count;
    SELECT COUNT(*) FROM "Transaction" INTO v_transaction_count;
    SELECT COUNT(*) FROM "WithdrawalRequest" INTO v_withdrawal_count;

    RAISE NOTICE '✓ Found % users in database', v_user_count;
    RAISE NOTICE '✓ Found % transactions in database', v_transaction_count;
    RAISE NOTICE '✓ Found % withdrawal requests in database', v_withdrawal_count;

    -- Check 4: Verify required existing tables
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'User') THEN
        v_errors := v_errors || '- ERROR: User table not found!' || E'\n';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Transaction') THEN
        v_errors := v_errors || '- ERROR: Transaction table not found!' || E'\n';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'WithdrawalRequest') THEN
        v_errors := v_errors || '- ERROR: WithdrawalRequest table not found!' || E'\n';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PaymentLink') THEN
        v_errors := v_errors || '- ERROR: PaymentLink table not found!' || E'\n';
    END IF;

    -- Check 5: Verify required enums exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
        v_errors := v_errors || '- ERROR: UserRole enum not found!' || E'\n';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransactionType') THEN
        v_errors := v_errors || '- ERROR: TransactionType enum not found!' || E'\n';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PixKeyType') THEN
        v_errors := v_errors || '- ERROR: PixKeyType enum not found!' || E'\n';
    END IF;

    -- Check 6: Check for potential conflicts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'DiscountCoupon') THEN
        v_errors := v_errors || '- WARNING: DiscountCoupon table already exists!' || E'\n';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'UserLevel') THEN
        v_errors := v_errors || '- WARNING: UserLevel table already exists!' || E'\n';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'CommerceApplication') THEN
        v_errors := v_errors || '- WARNING: CommerceApplication table already exists!' || E'\n';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommerceApplicationStatus') THEN
        v_errors := v_errors || '- WARNING: CommerceApplicationStatus enum already exists!' || E'\n';
    END IF;

    -- Check 7: Check for columns that will be added
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'User' AND column_name = 'twoFactorEnabled') THEN
        v_errors := v_errors || '- WARNING: User.twoFactorEnabled column already exists!' || E'\n';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'User' AND column_name = 'profilePicture') THEN
        v_errors := v_errors || '- WARNING: User.profilePicture column already exists!' || E'\n';
    END IF;

    -- Display results
    RAISE NOTICE '=====================================================';

    IF v_errors = '' THEN
        RAISE NOTICE 'PRE-MIGRATION CHECK PASSED!';
        RAISE NOTICE 'Database is ready for migration to V. Alpha 0.2';
        RAISE NOTICE '';
        RAISE NOTICE 'Next steps:';
        RAISE NOTICE '1. Create a database backup';
        RAISE NOTICE '2. Run migration script: 01_migrate_to_v0.2.sql';
        RAISE NOTICE '3. Verify migration success';
    ELSE
        RAISE NOTICE 'PRE-MIGRATION CHECK FOUND ISSUES:';
        RAISE NOTICE '%', v_errors;
        RAISE NOTICE '';
        RAISE NOTICE 'Please resolve these issues before running migration!';
        RAISE EXCEPTION 'Pre-migration check failed';
    END IF;

    RAISE NOTICE '=====================================================';
END $$;

-- =====================================================
-- BACKUP VERIFICATION
-- =====================================================

-- Show current database size
SELECT
    pg_database.datname AS database_name,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
WHERE datname = current_database();

-- Show table row counts
SELECT
    schemaname,
    tablename,
    n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- Show current timestamp for backup reference
SELECT
    NOW() AS backup_timestamp,
    current_database() AS database_name,
    current_user AS connected_user;

-- =====================================================
-- END OF PRE-MIGRATION CHECK
-- =====================================================