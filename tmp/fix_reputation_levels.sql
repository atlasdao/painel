-- Fix reputation_levels_config table structure
-- This script adapts the existing table to match Atlas Painel requirements

-- First, let's add the missing columns if they don't exist
ALTER TABLE reputation_levels_config
  ADD COLUMN IF NOT EXISTS name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS min_volume DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_volume DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update the name column based on levels
UPDATE reputation_levels_config SET
  name = CASE
    WHEN level = 0 THEN 'Iniciante'
    WHEN level = 1 THEN 'Bronze I'
    WHEN level = 2 THEN 'Bronze II'
    WHEN level = 3 THEN 'Prata I'
    WHEN level = 4 THEN 'Prata II'
    WHEN level = 5 THEN 'Ouro I'
    WHEN level = 6 THEN 'Ouro II'
    WHEN level = 7 THEN 'Diamante I'
    WHEN level = 8 THEN 'Diamante II'
    WHEN level = 9 THEN 'Elite'
    WHEN level = 10 THEN 'Lendário'
    ELSE 'Unknown'
  END
WHERE name IS NULL;

-- Update min_volume and max_volume based on levels
UPDATE reputation_levels_config SET
  min_volume = CASE
    WHEN level = 0 THEN 0
    WHEN level = 1 THEN 1000
    WHEN level = 2 THEN 5000
    WHEN level = 3 THEN 10000
    WHEN level = 4 THEN 25000
    WHEN level = 5 THEN 50000
    WHEN level = 6 THEN 100000
    WHEN level = 7 THEN 250000
    WHEN level = 8 THEN 500000
    WHEN level = 9 THEN 1000000
    WHEN level = 10 THEN 5000000
    ELSE min_volume
  END,
  max_volume = CASE
    WHEN level = 0 THEN 999.99
    WHEN level = 1 THEN 4999.99
    WHEN level = 2 THEN 9999.99
    WHEN level = 3 THEN 24999.99
    WHEN level = 4 THEN 49999.99
    WHEN level = 5 THEN 99999.99
    WHEN level = 6 THEN 249999.99
    WHEN level = 7 THEN 499999.99
    WHEN level = 8 THEN 999999.99
    WHEN level = 9 THEN 4999999.99
    WHEN level = 10 THEN NULL
    ELSE max_volume
  END
WHERE min_volume = 0 OR min_volume IS NULL;

-- Insert missing levels if they don't exist
INSERT INTO reputation_levels_config (level, name, min_volume, max_volume, daily_limit_brl, max_per_transaction_brl)
SELECT * FROM (VALUES
  (0, 'Iniciante', 0, 999.99, 1000.00, 500.00),
  (1, 'Bronze I', 1000, 4999.99, 2000.00, 1000.00),
  (2, 'Bronze II', 5000, 9999.99, 3000.00, 1500.00),
  (3, 'Prata I', 10000, 24999.99, 5000.00, 2500.00),
  (4, 'Prata II', 25000, 49999.99, 7500.00, 3500.00),
  (5, 'Ouro I', 50000, 99999.99, 10000.00, 5000.00),
  (6, 'Ouro II', 100000, 249999.99, 15000.00, 7500.00),
  (7, 'Diamante I', 250000, 499999.99, 20000.00, 10000.00),
  (8, 'Diamante II', 500000, 999999.99, 30000.00, 15000.00),
  (9, 'Elite', 1000000, 4999999.99, 50000.00, 25000.00),
  (10, 'Lendário', 5000000, NULL, 100000.00, 50000.00)
) AS v(level, name, min_volume, max_volume, daily_limit_brl, max_per_transaction_brl)
WHERE NOT EXISTS (
  SELECT 1 FROM reputation_levels_config WHERE reputation_levels_config.level = v.level
);

-- Make name column NOT NULL after populating it
ALTER TABLE reputation_levels_config ALTER COLUMN name SET NOT NULL;