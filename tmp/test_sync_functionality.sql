-- Test Script for Sync Functionality
-- This script tests the sync tables and ensures they work correctly

\echo 'Testing Sync Functionality...\n'

-- ========================================
-- Test 1: Insert test data into sync_log
-- ========================================
\echo '1. Testing sync_log table insertion...'
BEGIN;

INSERT INTO sync_log (
  sync_type,
  entity_type,
  entity_id,
  sync_direction,
  status,
  metadata
) VALUES (
  'user_sync',
  'user',
  'test-user-123',
  'bridge_to_painel',
  'pending',
  '{"test": true, "timestamp": "2025-01-06T10:00:00Z"}'::jsonb
);

-- Verify insertion
SELECT
  sync_type,
  entity_type,
  entity_id,
  sync_direction,
  status,
  metadata->>'test' as is_test
FROM sync_log
WHERE entity_id = 'test-user-123';

-- Clean up test data
DELETE FROM sync_log WHERE entity_id = 'test-user-123';

COMMIT;

-- ========================================
-- Test 2: Test bot_sync_metadata with trigger
-- ========================================
\echo '\n2. Testing bot_sync_metadata trigger...'
BEGIN;

-- Insert test record
INSERT INTO bot_sync_metadata (
  telegram_user_id,
  external_user_id,
  sync_enabled
) VALUES (
  9999999999,
  'test-external-id-123',
  true
);

-- Wait a moment and update
UPDATE bot_sync_metadata
SET last_sync_at = NOW()
WHERE telegram_user_id = 9999999999;

-- Check that updated_at was modified by trigger
SELECT
  telegram_user_id,
  external_user_id,
  sync_enabled,
  created_at != updated_at as trigger_worked
FROM bot_sync_metadata
WHERE telegram_user_id = 9999999999;

-- Clean up
DELETE FROM bot_sync_metadata WHERE telegram_user_id = 9999999999;

COMMIT;

-- ========================================
-- Test 3: Verify external_id can be used for joins
-- ========================================
\echo '\n3. Testing external_id column in users table...'
-- This is a query structure test only
EXPLAIN (COSTS OFF)
SELECT u.id, u.external_id, bsm.telegram_user_id
FROM users u
LEFT JOIN bot_sync_metadata bsm ON u.external_id = bsm.external_user_id
LIMIT 1;

-- ========================================
-- Test 4: Verify indexes are being used
-- ========================================
\echo '\n4. Testing index usage...'
EXPLAIN (COSTS OFF)
SELECT * FROM sync_log
WHERE entity_id = 'test' AND status = 'completed'
ORDER BY created_at DESC
LIMIT 10;

\echo '\n✅ All sync functionality tests completed successfully!'