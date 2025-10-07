-- Atlas Bridge Database Schema Update for Bidirectional Sync
-- Date: 2025-10-06
-- Purpose: Enable bidirectional sync between Atlas Bridge and Atlas Painel

-- ========================================
-- 1. Add external_id to users table
-- ========================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS external_id TEXT;
CREATE INDEX IF NOT EXISTS idx_users_external_id ON users(external_id);

-- ========================================
-- 2. Create sync_log table for tracking synchronization
-- ========================================
CREATE TABLE IF NOT EXISTS sync_log (
  id SERIAL PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id TEXT NOT NULL,
  sync_direction VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_log_created_at ON sync_log(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_log_entity_id ON sync_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON sync_log(status);

-- ========================================
-- 3. Verify and populate reputation_levels_config table
-- ========================================
-- First check if the table exists
CREATE TABLE IF NOT EXISTS reputation_levels_config (
  level INTEGER PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  min_volume DECIMAL(15,2) NOT NULL,
  max_volume DECIMAL(15,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert or update all 11 reputation levels (0-10)
INSERT INTO reputation_levels_config (level, name, min_volume, max_volume) VALUES
(0, 'Iniciante', 0, 999.99),
(1, 'Bronze I', 1000, 4999.99),
(2, 'Bronze II', 5000, 9999.99),
(3, 'Prata I', 10000, 24999.99),
(4, 'Prata II', 25000, 49999.99),
(5, 'Ouro I', 50000, 99999.99),
(6, 'Ouro II', 100000, 249999.99),
(7, 'Diamante I', 250000, 499999.99),
(8, 'Diamante II', 500000, 999999.99),
(9, 'Elite', 1000000, 4999999.99),
(10, 'Lendário', 5000000, NULL)
ON CONFLICT (level) DO UPDATE SET
  name = EXCLUDED.name,
  min_volume = EXCLUDED.min_volume,
  max_volume = EXCLUDED.max_volume,
  updated_at = CURRENT_TIMESTAMP;

-- ========================================
-- 4. Create bot_sync_metadata table
-- ========================================
CREATE TABLE IF NOT EXISTS bot_sync_metadata (
  id SERIAL PRIMARY KEY,
  telegram_user_id BIGINT UNIQUE NOT NULL,
  external_user_id TEXT,
  last_sync_at TIMESTAMP,
  sync_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bot_sync_telegram_id ON bot_sync_metadata(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_bot_sync_external_id ON bot_sync_metadata(external_user_id);

-- ========================================
-- 5. Create trigger function and apply triggers
-- ========================================
-- Create or replace trigger function for updating sync timestamp
CREATE OR REPLACE FUNCTION update_sync_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to bot_sync_metadata
DROP TRIGGER IF EXISTS update_bot_sync_metadata_timestamp ON bot_sync_metadata;
CREATE TRIGGER update_bot_sync_metadata_timestamp
  BEFORE UPDATE ON bot_sync_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_timestamp();

-- ========================================
-- 6. Additional indexes for performance
-- ========================================
-- Add composite index for sync_log queries
CREATE INDEX IF NOT EXISTS idx_sync_log_entity_status ON sync_log(entity_id, status, created_at DESC);

-- Add index for users table if needed
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at) WHERE created_at IS NOT NULL;

-- ========================================
-- 7. Verification queries
-- ========================================
-- These can be run separately to verify the schema updates

-- Check if external_id was added to users table
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'users' AND column_name = 'external_id';

-- Check sync_log table structure
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'sync_log'
-- ORDER BY ordinal_position;

-- Verify reputation levels
-- SELECT level, name, min_volume, max_volume
-- FROM reputation_levels_config
-- ORDER BY level;

-- Check bot_sync_metadata table
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'bot_sync_metadata'
-- ORDER BY ordinal_position;

-- List all indexes
-- SELECT schemaname, tablename, indexname
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- AND tablename IN ('users', 'sync_log', 'bot_sync_metadata', 'reputation_levels_config')
-- ORDER BY tablename, indexname;