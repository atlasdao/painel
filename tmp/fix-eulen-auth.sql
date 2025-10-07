-- Fix for Eulen API Authentication Issue
-- This script adds the required Eulen API token to the SystemSettings table
--
-- IMPORTANT: Replace 'YOUR_JWT_TOKEN_HERE' with the actual JWT token obtained from:
-- Telegram Bot: @DePix_stable_bot
-- Command: /apitoken atlas_api 365 all
--
-- The token should be a JWT that looks like: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

-- Insert Eulen API token into SystemSettings
INSERT INTO "SystemSettings" (id, key, value, description, "createdAt", "updatedAt")
VALUES (
    gen_random_uuid(),
    'EULEN_API_TOKEN',
    'YOUR_JWT_TOKEN_HERE',
    'Eulen API JWT token for PIX-to-DePix conversion service. Obtain from @DePix_stable_bot on Telegram.',
    NOW(),
    NOW()
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    "updatedAt" = NOW();

-- Verify the token was inserted
SELECT key,
       CASE
           WHEN key LIKE '%TOKEN%' THEN CONCAT(LEFT(value, 20), '...[truncated]')
           ELSE value
       END as value,
       description,
       "createdAt"
FROM "SystemSettings"
WHERE key = 'EULEN_API_TOKEN';