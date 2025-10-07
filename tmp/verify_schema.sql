-- Schema Verification Script for Atlas Bridge Database
-- This script verifies all required schema updates for bidirectional sync

-- ========================================
-- 1. Check users table has external_id column
-- ========================================
\echo '1. Checking users table for external_id column...'
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name = 'external_id';

-- Check index on external_id
\echo 'Checking index on users.external_id...'
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users'
  AND indexname = 'idx_users_external_id';

-- ========================================
-- 2. Check sync_log table
-- ========================================
\echo '\n2. Checking sync_log table structure...'
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'sync_log'
ORDER BY ordinal_position;

-- Check sync_log indexes
\echo 'Checking sync_log indexes...'
SELECT indexname
FROM pg_indexes
WHERE tablename = 'sync_log'
ORDER BY indexname;

-- ========================================
-- 3. Verify reputation_levels_config
-- ========================================
\echo '\n3. Checking reputation_levels_config table...'
SELECT
  level,
  name,
  min_volume,
  max_volume,
  daily_limit_brl,
  max_per_transaction_brl
FROM reputation_levels_config
ORDER BY level;

-- ========================================
-- 4. Check bot_sync_metadata table
-- ========================================
\echo '\n4. Checking bot_sync_metadata table structure...'
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'bot_sync_metadata'
ORDER BY ordinal_position;

-- Check bot_sync_metadata indexes
\echo 'Checking bot_sync_metadata indexes...'
SELECT indexname
FROM pg_indexes
WHERE tablename = 'bot_sync_metadata'
ORDER BY indexname;

-- ========================================
-- 5. Check triggers
-- ========================================
\echo '\n5. Checking triggers...'
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'bot_sync_metadata';

-- ========================================
-- 6. Summary statistics
-- ========================================
\echo '\n6. Database Summary:'
SELECT
  'Tables Created' as metric,
  COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('sync_log', 'bot_sync_metadata', 'reputation_levels_config')
UNION ALL
SELECT
  'Indexes Created',
  COUNT(*)
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('users', 'sync_log', 'bot_sync_metadata')
  AND indexname LIKE 'idx_%'
UNION ALL
SELECT
  'Reputation Levels',
  COUNT(*)
FROM reputation_levels_config
UNION ALL
SELECT
  'Triggers Active',
  COUNT(*)
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'bot_sync_metadata';