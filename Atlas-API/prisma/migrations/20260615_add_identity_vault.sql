DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PayerIdentityStatus') THEN
    CREATE TYPE "PayerIdentityStatus" AS ENUM ('UNKNOWN', 'VERIFIED', 'TRUSTED', 'FLAGGED', 'BLOCKED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PayerRiskTier') THEN
    CREATE TYPE "PayerRiskTier" AS ENUM ('UNKNOWN', 'LOW', 'MEDIUM', 'HIGH');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PayerMatchStatus') THEN
    CREATE TYPE "PayerMatchStatus" AS ENUM ('UNKNOWN', 'MATCHED', 'MISMATCH', 'UNVERIFIABLE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IdentityVaultEventType') THEN
    CREATE TYPE "IdentityVaultEventType" AS ENUM ('IDENTITY_CREATED', 'CONTACT_UPSERTED', 'PAYMENT_MATCHED', 'PAYMENT_MISMATCH', 'CONTACT_SEARCHED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PayerIdentity" (
  "id" TEXT NOT NULL,
  "euid" TEXT,
  "euidHash" TEXT,
  "taxNumberHash" TEXT,
  "taxNumberMasked" TEXT,
  "canonicalName" TEXT,
  "searchName" TEXT,
  "riskTier" "PayerRiskTier" NOT NULL DEFAULT 'UNKNOWN',
  "status" "PayerIdentityStatus" NOT NULL DEFAULT 'UNKNOWN',
  "medCount" INTEGER NOT NULL DEFAULT 0,
  "lastSuccessfulPaymentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayerIdentity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PayerIdentity_euid_key" ON "PayerIdentity"("euid");
CREATE UNIQUE INDEX IF NOT EXISTS "PayerIdentity_euidHash_key" ON "PayerIdentity"("euidHash");
CREATE UNIQUE INDEX IF NOT EXISTS "PayerIdentity_taxNumberHash_key" ON "PayerIdentity"("taxNumberHash");
CREATE INDEX IF NOT EXISTS "PayerIdentity_taxNumberMasked_idx" ON "PayerIdentity"("taxNumberMasked");
CREATE INDEX IF NOT EXISTS "PayerIdentity_status_lastSuccessfulPaymentAt_idx" ON "PayerIdentity"("status", "lastSuccessfulPaymentAt");
CREATE INDEX IF NOT EXISTS "PayerIdentity_searchName_idx" ON "PayerIdentity"("searchName");

CREATE TABLE IF NOT EXISTS "MerchantContact" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "searchName" TEXT NOT NULL,
  "taxNumberMasked" TEXT,
  "taxNumberSearchTokens" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" "PayerIdentityStatus" NOT NULL DEFAULT 'VERIFIED',
  "paymentCount" INTEGER NOT NULL DEFAULT 0,
  "lastTransactionId" TEXT,
  "lastSuccessfulPaymentAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MerchantContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MerchantContact_merchantId_identityId_key" ON "MerchantContact"("merchantId", "identityId");
CREATE INDEX IF NOT EXISTS "MerchantContact_merchantId_status_searchName_idx" ON "MerchantContact"("merchantId", "status", "searchName");
CREATE INDEX IF NOT EXISTS "MerchantContact_merchantId_lastSuccessfulPaymentAt_idx" ON "MerchantContact"("merchantId", "lastSuccessfulPaymentAt");
CREATE INDEX IF NOT EXISTS "MerchantContact_merchantId_deletedAt_idx" ON "MerchantContact"("merchantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "MerchantContact_taxNumberSearchTokens_idx" ON "MerchantContact" USING GIN ("taxNumberSearchTokens");

CREATE TABLE IF NOT EXISTS "IdentityVaultEvent" (
  "id" TEXT NOT NULL,
  "identityId" TEXT,
  "merchantId" TEXT,
  "contactId" TEXT,
  "transactionId" TEXT,
  "type" "IdentityVaultEventType" NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdentityVaultEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IdentityVaultEvent_identityId_createdAt_idx" ON "IdentityVaultEvent"("identityId", "createdAt");
CREATE INDEX IF NOT EXISTS "IdentityVaultEvent_merchantId_createdAt_idx" ON "IdentityVaultEvent"("merchantId", "createdAt");
CREATE INDEX IF NOT EXISTS "IdentityVaultEvent_transactionId_idx" ON "IdentityVaultEvent"("transactionId");
CREATE INDEX IF NOT EXISTS "IdentityVaultEvent_type_createdAt_idx" ON "IdentityVaultEvent"("type", "createdAt");

ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "expectedPayerIdentityId" TEXT,
  ADD COLUMN IF NOT EXISTS "actualPayerIdentityId" TEXT,
  ADD COLUMN IF NOT EXISTS "merchantContactId" TEXT,
  ADD COLUMN IF NOT EXISTS "payerMatchStatus" "PayerMatchStatus",
  ADD COLUMN IF NOT EXISTS "payerTaxNumberHash" TEXT,
  ADD COLUMN IF NOT EXISTS "payerTaxNumberMasked" TEXT,
  ADD COLUMN IF NOT EXISTS "payerEuidHash" TEXT;

ALTER TABLE "PaymentLinkSession"
  ADD COLUMN IF NOT EXISTS "payerFullName" TEXT,
  ADD COLUMN IF NOT EXISTS "payerIdentityId" TEXT,
  ADD COLUMN IF NOT EXISTS "merchantContactId" TEXT,
  ADD COLUMN IF NOT EXISTS "expectedPayerTaxNumberHash" TEXT,
  ADD COLUMN IF NOT EXISTS "expectedPayerTaxNumberMasked" TEXT,
  ADD COLUMN IF NOT EXISTS "expectedPayerEuidHash" TEXT,
  ADD COLUMN IF NOT EXISTS "payerMatchStatus" "PayerMatchStatus";

CREATE INDEX IF NOT EXISTS "Transaction_userId_merchantContactId_idx" ON "Transaction"("userId", "merchantContactId");
CREATE INDEX IF NOT EXISTS "Transaction_userId_actualPayerIdentityId_createdAt_idx" ON "Transaction"("userId", "actualPayerIdentityId", "createdAt");
CREATE INDEX IF NOT EXISTS "Transaction_payerMatchStatus_status_createdAt_idx" ON "Transaction"("payerMatchStatus", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentLinkSession_merchantContactId_idx" ON "PaymentLinkSession"("merchantContactId");
CREATE INDEX IF NOT EXISTS "PaymentLinkSession_payerIdentityId_idx" ON "PaymentLinkSession"("payerIdentityId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MerchantContact_merchantId_fkey') THEN
    ALTER TABLE "MerchantContact" ADD CONSTRAINT "MerchantContact_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MerchantContact_identityId_fkey') THEN
    ALTER TABLE "MerchantContact" ADD CONSTRAINT "MerchantContact_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "PayerIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Transaction_expectedPayerIdentityId_fkey') THEN
    ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_expectedPayerIdentityId_fkey" FOREIGN KEY ("expectedPayerIdentityId") REFERENCES "PayerIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Transaction_actualPayerIdentityId_fkey') THEN
    ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_actualPayerIdentityId_fkey" FOREIGN KEY ("actualPayerIdentityId") REFERENCES "PayerIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Transaction_merchantContactId_fkey') THEN
    ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_merchantContactId_fkey" FOREIGN KEY ("merchantContactId") REFERENCES "MerchantContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IdentityVaultEvent_identityId_fkey') THEN
    ALTER TABLE "IdentityVaultEvent" ADD CONSTRAINT "IdentityVaultEvent_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "PayerIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IdentityVaultEvent_merchantId_fkey') THEN
    ALTER TABLE "IdentityVaultEvent" ADD CONSTRAINT "IdentityVaultEvent_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IdentityVaultEvent_contactId_fkey') THEN
    ALTER TABLE "IdentityVaultEvent" ADD CONSTRAINT "IdentityVaultEvent_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "MerchantContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IdentityVaultEvent_transactionId_fkey') THEN
    ALTER TABLE "IdentityVaultEvent" ADD CONSTRAINT "IdentityVaultEvent_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
