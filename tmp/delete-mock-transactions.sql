-- Delete mock validation transactions to allow real DePix API calls
-- These transactions have mock external IDs that don't meet the 32-character requirement

-- First, let's see what we're going to delete
SELECT id, "externalId", status, description, "createdAt"
FROM "Transaction"
WHERE "externalId" LIKE 'mock-%'
   OR description LIKE '%validation%'
   OR description LIKE '%validação%';

-- Delete the mock transactions
DELETE FROM "Transaction"
WHERE "externalId" LIKE 'mock-%'
   OR (description LIKE '%validation%' AND "externalId" LIKE 'mock-%')
   OR (description LIKE '%validação%' AND "externalId" LIKE 'mock-%');