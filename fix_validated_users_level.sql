-- Fix validated users stuck at level 0
-- This script upgrades validated users to level 1 (Bronze) with proper limits
-- Date: 2025-10-08
-- Affects: 6 users who validated their accounts but remained at level 0

BEGIN;

-- First, let's verify the affected users before making changes
SELECT
    u.id,
    u.username,
    u.email,
    u."isAccountValidated",
    u."validatedAt",
    ul.level,
    ul."dailyLimitBrl"
FROM "User" u
JOIN "UserLevel" ul ON u.id = ul."userId"
WHERE u."isAccountValidated" = true
  AND ul.level = 0;

-- Update UserLevel records for validated users stuck at level 0
UPDATE "UserLevel"
SET
    level = 1,
    "dailyLimitBrl" = 300.00,
    "lastLevelUpgrade" = NOW(),
    "updatedAt" = NOW()
WHERE "userId" IN (
    SELECT u.id
    FROM "User" u
    JOIN "UserLevel" ul ON u.id = ul."userId"
    WHERE u."isAccountValidated" = true
      AND ul.level = 0
);

-- Create LevelHistory records for audit trail
INSERT INTO "LevelHistory" (
    id,
    "userId",
    "previousLevel",
    "newLevel",
    "volumeAtChange",
    reason,
    "createdAt"
)
SELECT
    gen_random_uuid()::text,
    u.id,
    0,
    1,
    COALESCE(ul."totalVolumeBrl", 0),
    'Account validation - retroactive upgrade to Bronze tier (bug fix)',
    NOW()
FROM "User" u
JOIN "UserLevel" ul ON u.id = ul."userId"
WHERE u."isAccountValidated" = true
  AND ul.level = 1  -- They're now level 1 after the update
  AND NOT EXISTS (
      SELECT 1
      FROM "LevelHistory" lh
      WHERE lh."userId" = u.id
        AND lh."newLevel" = 1
  );

-- Verify the changes
SELECT
    u.id,
    u.username,
    u.email,
    u."isAccountValidated",
    ul.level,
    ul."dailyLimitBrl",
    ul."lastLevelUpgrade"
FROM "User" u
JOIN "UserLevel" ul ON u.id = ul."userId"
WHERE u."isAccountValidated" = true
  AND ul.level = 1
ORDER BY ul."lastLevelUpgrade" DESC;

-- Check LevelHistory was created
SELECT
    lh."userId",
    u.username,
    lh."previousLevel",
    lh."newLevel",
    lh."volumeAtChange",
    lh.reason,
    lh."createdAt"
FROM "LevelHistory" lh
JOIN "User" u ON lh."userId" = u.id
WHERE lh."newLevel" = 1
  AND lh.reason LIKE '%bug fix%'
ORDER BY lh."createdAt" DESC;

COMMIT;
