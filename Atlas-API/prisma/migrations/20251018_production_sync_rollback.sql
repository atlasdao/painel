-- =====================================================
-- Atlas Panel - Production Sync Rollback
-- Rollback script for production sync migration
-- Date: 2025-10-18
-- =====================================================

-- WARNING: This will destroy data. Use only in emergencies.
-- Make sure to backup your database before running this!

-- STEP 1: DROP NEW TABLES (reverse dependency order)
-- =====================================================

DROP TABLE IF EXISTS "IncidentUpdate" CASCADE;
DROP TABLE IF EXISTS "Incident" CASCADE;
DROP TABLE IF EXISTS "BlockedEmailDomain" CASCADE;

-- STEP 2: REMOVE NEW FIELDS FROM EXISTING TABLES
-- =====================================================

ALTER TABLE "CommerceApplication"
DROP COLUMN IF EXISTS "productOrService",
DROP COLUMN IF EXISTS "averagePrices",
DROP COLUMN IF EXISTS "monthlyPixSales",
DROP COLUMN IF EXISTS "marketTime",
DROP COLUMN IF EXISTS "references",
DROP COLUMN IF EXISTS "refundRate",
DROP COLUMN IF EXISTS "refundProcess",
DROP COLUMN IF EXISTS "businessProof",
DROP COLUMN IF EXISTS "contactInfo";

-- STEP 3: DROP NEW ENUM TYPES
-- =====================================================

DROP TYPE IF EXISTS "IncidentSeverity" CASCADE;
DROP TYPE IF EXISTS "IncidentStatus" CASCADE;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 'Production sync rollback completed!' AS status;