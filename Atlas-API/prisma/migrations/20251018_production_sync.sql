-- =====================================================
-- Atlas Panel - Production Sync Migration
-- Adds new features: Email domain blocking and Incident management
-- Date: 2025-10-18
-- =====================================================

-- STEP 1: CREATE NEW ENUM TYPES
-- =====================================================

CREATE TYPE "IncidentStatus" AS ENUM (
  'INVESTIGATING',
  'IDENTIFIED',
  'MONITORING',
  'RESOLVED'
);

CREATE TYPE "IncidentSeverity" AS ENUM (
  'MINOR',
  'MAJOR',
  'CRITICAL'
);

-- =====================================================
-- STEP 2: CREATE NEW TABLES
-- =====================================================

CREATE TABLE "BlockedEmailDomain" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "domain" TEXT NOT NULL UNIQUE,
  "source" TEXT NOT NULL DEFAULT 'disposable-email-domains',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastVerified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Incident" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "IncidentStatus" NOT NULL DEFAULT 'INVESTIGATING',
  "severity" "IncidentSeverity" NOT NULL DEFAULT 'MINOR',
  "affectedServices" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "affectedFrom" TIMESTAMP(3),
  "affectedTo" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Incident_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "IncidentUpdate" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "incidentId" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IncidentUpdate_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "IncidentUpdate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- =====================================================
-- STEP 3: UPDATE EXISTING TABLES
-- =====================================================

-- Add missing fields to CommerceApplication table
ALTER TABLE "CommerceApplication"
ADD COLUMN IF NOT EXISTS "productOrService" TEXT,
ADD COLUMN IF NOT EXISTS "averagePrices" TEXT,
ADD COLUMN IF NOT EXISTS "monthlyPixSales" TEXT,
ADD COLUMN IF NOT EXISTS "marketTime" TEXT,
ADD COLUMN IF NOT EXISTS "references" TEXT,
ADD COLUMN IF NOT EXISTS "refundRate" TEXT,
ADD COLUMN IF NOT EXISTS "refundProcess" TEXT,
ADD COLUMN IF NOT EXISTS "businessProof" TEXT,
ADD COLUMN IF NOT EXISTS "contactInfo" TEXT;

-- Update existing records with default values
UPDATE "CommerceApplication"
SET
  "productOrService" = COALESCE("productOrService", "businessObjective", 'Não especificado'),
  "averagePrices" = COALESCE("averagePrices", 'Não especificado'),
  "monthlyPixSales" = COALESCE("monthlyPixSales", 'Não especificado'),
  "marketTime" = COALESCE("marketTime", 'Não especificado'),
  "references" = COALESCE("references", 'Não especificado'),
  "refundRate" = COALESCE("refundRate", 'Não especificado')
WHERE "productOrService" IS NULL
   OR "averagePrices" IS NULL
   OR "monthlyPixSales" IS NULL
   OR "marketTime" IS NULL
   OR "references" IS NULL
   OR "refundRate" IS NULL;

-- Make required fields NOT NULL
ALTER TABLE "CommerceApplication"
ALTER COLUMN "productOrService" SET NOT NULL,
ALTER COLUMN "averagePrices" SET NOT NULL,
ALTER COLUMN "monthlyPixSales" SET NOT NULL,
ALTER COLUMN "marketTime" SET NOT NULL,
ALTER COLUMN "references" SET NOT NULL,
ALTER COLUMN "refundRate" SET NOT NULL;

-- =====================================================
-- STEP 4: CREATE INDEXES
-- =====================================================

CREATE INDEX "BlockedEmailDomain_domain_idx" ON "BlockedEmailDomain"("domain");
CREATE INDEX "BlockedEmailDomain_isActive_idx" ON "BlockedEmailDomain"("isActive");
CREATE INDEX "BlockedEmailDomain_lastVerified_idx" ON "BlockedEmailDomain"("lastVerified");

CREATE INDEX "Incident_status_idx" ON "Incident"("status");
CREATE INDEX "Incident_severity_idx" ON "Incident"("severity");
CREATE INDEX "Incident_createdAt_idx" ON "Incident"("createdAt");

CREATE INDEX "IncidentUpdate_incidentId_idx" ON "IncidentUpdate"("incidentId");
CREATE INDEX "IncidentUpdate_createdAt_idx" ON "IncidentUpdate"("createdAt");

-- =====================================================
-- STEP 5: CREATE TRIGGERS
-- =====================================================

CREATE TRIGGER update_blocked_email_domain_updated_at
  BEFORE UPDATE ON "BlockedEmailDomain"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incident_updated_at
  BEFORE UPDATE ON "Incident"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 'Production sync migration completed successfully!' AS status;