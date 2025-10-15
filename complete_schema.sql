-- =====================================================
-- Atlas Panel - Complete Database Schema
-- Database: PostgreSQL
-- =====================================================

-- Drop existing tables and types if they exist
DROP TABLE IF EXISTS "CouponUsage" CASCADE;
DROP TABLE IF EXISTS "DiscountCoupon" CASCADE;
DROP TABLE IF EXISTS "LevelHistory" CASCADE;
DROP TABLE IF EXISTS "LevelConfig" CASCADE;
DROP TABLE IF EXISTS "UserLevel" CASCADE;
DROP TABLE IF EXISTS "CommerceApplication" CASCADE;
DROP TABLE IF EXISTS "PaymentLink" CASCADE;
DROP TABLE IF EXISTS "WithdrawalRequest" CASCADE;
DROP TABLE IF EXISTS "UserReputation" CASCADE;
DROP TABLE IF EXISTS "ApiKeyRequest" CASCADE;
DROP TABLE IF EXISTS "UserLimit" CASCADE;
DROP TABLE IF EXISTS "SystemSettings" CASCADE;
DROP TABLE IF EXISTS "RateLimit" CASCADE;
DROP TABLE IF EXISTS "AuditLog" CASCADE;
DROP TABLE IF EXISTS "WebhookEvent" CASCADE;
DROP TABLE IF EXISTS "Transaction" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

DROP TYPE IF EXISTS "WithdrawalStatus" CASCADE;
DROP TYPE IF EXISTS "WithdrawalMethod" CASCADE;
DROP TYPE IF EXISTS "WebhookEventStatus" CASCADE;
DROP TYPE IF EXISTS "PixKeyType" CASCADE;
DROP TYPE IF EXISTS "TransactionStatus" CASCADE;
DROP TYPE IF EXISTS "TransactionType" CASCADE;
DROP TYPE IF EXISTS "ApiKeyUsageType" CASCADE;
DROP TYPE IF EXISTS "ApiKeyRequestStatus" CASCADE;
DROP TYPE IF EXISTS "CommerceApplicationStatus" CASCADE;
DROP TYPE IF EXISTS "UserRole" CASCADE;

-- =====================================================
-- ENUM TYPES
-- =====================================================

CREATE TYPE "UserRole" AS ENUM (
  'USER',
  'ADMIN'
);

CREATE TYPE "CommerceApplicationStatus" AS ENUM (
  'PENDING',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'DEPOSIT_PENDING',
  'ACTIVE'
);

CREATE TYPE "ApiKeyRequestStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'REVOKED'
);

CREATE TYPE "ApiKeyUsageType" AS ENUM (
  'SINGLE_CPF',
  'MULTIPLE_CPF'
);

CREATE TYPE "TransactionType" AS ENUM (
  'DEPOSIT',
  'WITHDRAW',
  'TRANSFER',
  'REFUND'
);

CREATE TYPE "TransactionStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'EXPIRED'
);

CREATE TYPE "PixKeyType" AS ENUM (
  'CPF',
  'CNPJ',
  'EMAIL',
  'PHONE',
  'RANDOM_KEY'
);

CREATE TYPE "WebhookEventStatus" AS ENUM (
  'PENDING',
  'SUCCESS',
  'FAILED',
  'CANCELLED'
);

CREATE TYPE "WithdrawalMethod" AS ENUM (
  'PIX',
  'DEPIX'
);

CREATE TYPE "WithdrawalStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
);

-- =====================================================
-- TABLES
-- =====================================================

-- User Table
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "email" TEXT NOT NULL UNIQUE,
  "username" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "apiKey" TEXT UNIQUE,
  "role" "UserRole" NOT NULL DEFAULT 'USER',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "passwordResetCode" TEXT,
  "passwordResetExpires" TIMESTAMP(3),
  "passwordResetAttempts" INTEGER NOT NULL DEFAULT 0,
  "isAccountValidated" BOOLEAN NOT NULL DEFAULT false,
  "validationPaymentId" TEXT,
  "validatedAt" TIMESTAMP(3),
  "verifiedTaxNumber" TEXT,
  "commerceMode" BOOLEAN NOT NULL DEFAULT false,
  "commerceModeActivatedAt" TIMESTAMP(3),
  "paymentLinksEnabled" BOOLEAN NOT NULL DEFAULT false,
  "apiDailyLimit" DOUBLE PRECISION NOT NULL DEFAULT 10000,
  "apiMonthlyLimit" DOUBLE PRECISION NOT NULL DEFAULT 50000,
  "profilePicture" TEXT,
  "defaultWalletAddress" TEXT,
  "defaultWalletType" TEXT DEFAULT 'LIQUID',
  "pixKey" TEXT,
  "pixKeyType" "PixKeyType",
  "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
  "twoFactorSecret" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastLoginAt" TIMESTAMP(3),
  "botExternalId" TEXT,
  "externalUserId" TEXT UNIQUE
);

-- Transaction Table
CREATE TABLE "Transaction" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "userId" TEXT NOT NULL,
  "type" "TransactionType" NOT NULL,
  "status" "TransactionStatus" NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "pixKey" TEXT,
  "pixKeyType" "PixKeyType",
  "externalId" TEXT UNIQUE,
  "description" TEXT,
  "metadata" TEXT,
  "errorMessage" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- WebhookEvent Table
CREATE TABLE "WebhookEvent" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "transactionId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'POST',
  "headers" TEXT,
  "payload" TEXT NOT NULL,
  "status" "WebhookEventStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "lastAttemptAt" TIMESTAMP(3),
  "responseCode" INTEGER,
  "responseBody" TEXT,
  "nextRetryAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookEvent_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- AuditLog Table
CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "userId" TEXT,
  "transactionId" TEXT,
  "action" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "resourceId" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "requestBody" TEXT,
  "responseBody" TEXT,
  "statusCode" INTEGER,
  "duration" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AuditLog_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RateLimit Table
CREATE TABLE "RateLimit" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "key" TEXT NOT NULL UNIQUE,
  "type" TEXT NOT NULL,
  "requests" INTEGER NOT NULL DEFAULT 0,
  "window" TEXT NOT NULL,
  "resetAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- UserLimit Table
CREATE TABLE "UserLimit" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "userId" TEXT NOT NULL UNIQUE,
  "dailyDepositLimit" DOUBLE PRECISION NOT NULL DEFAULT 500.00,
  "dailyWithdrawLimit" DOUBLE PRECISION NOT NULL DEFAULT 500.00,
  "dailyTransferLimit" DOUBLE PRECISION NOT NULL DEFAULT 500.00,
  "maxDepositPerTx" DOUBLE PRECISION NOT NULL DEFAULT 5000.00,
  "maxWithdrawPerTx" DOUBLE PRECISION NOT NULL DEFAULT 5000.00,
  "maxTransferPerTx" DOUBLE PRECISION NOT NULL DEFAULT 5000.00,
  "monthlyDepositLimit" DOUBLE PRECISION NOT NULL DEFAULT 50000.00,
  "monthlyWithdrawLimit" DOUBLE PRECISION NOT NULL DEFAULT 50000.00,
  "monthlyTransferLimit" DOUBLE PRECISION NOT NULL DEFAULT 50000.00,
  "isFirstDay" BOOLEAN NOT NULL DEFAULT true,
  "isKycVerified" BOOLEAN NOT NULL DEFAULT false,
  "isHighRiskUser" BOOLEAN NOT NULL DEFAULT false,
  "lastLimitUpdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedByAdminId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserLimit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ApiKeyRequest Table
CREATE TABLE "ApiKeyRequest" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "userId" TEXT NOT NULL,
  "usageReason" TEXT NOT NULL,
  "serviceUrl" TEXT NOT NULL,
  "estimatedVolume" TEXT NOT NULL,
  "usageType" "ApiKeyUsageType" NOT NULL DEFAULT 'SINGLE_CPF',
  "status" "ApiKeyRequestStatus" NOT NULL DEFAULT 'PENDING',
  "approvedBy" TEXT,
  "approvalNotes" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "generatedApiKey" TEXT UNIQUE,
  "apiKeyExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiKeyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- PaymentLink Table
CREATE TABLE "PaymentLink" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "userId" TEXT NOT NULL,
  "shortCode" TEXT NOT NULL UNIQUE,
  "amount" DOUBLE PRECISION,
  "isCustomAmount" BOOLEAN NOT NULL DEFAULT false,
  "minAmount" DOUBLE PRECISION,
  "maxAmount" DOUBLE PRECISION,
  "walletAddress" TEXT NOT NULL,
  "description" TEXT,
  "currentQrCode" TEXT,
  "qrCodeGeneratedAt" TIMESTAMP(3),
  "lastPaymentId" TEXT,
  "totalPayments" INTEGER NOT NULL DEFAULT 0,
  "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- UserReputation Table
CREATE TABLE "UserReputation" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "userId" TEXT NOT NULL UNIQUE,
  "totalApprovedVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalApprovedCount" INTEGER NOT NULL DEFAULT 0,
  "totalRejectedCount" INTEGER NOT NULL DEFAULT 0,
  "reputationScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currentDailyLimit" DOUBLE PRECISION NOT NULL DEFAULT 6000,
  "nextLimitThreshold" DOUBLE PRECISION NOT NULL DEFAULT 50000,
  "limitTier" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserReputation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- WithdrawalRequest Table
CREATE TABLE "WithdrawalRequest" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "userId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "method" "WithdrawalMethod" NOT NULL,
  "pixKey" TEXT,
  "pixKeyType" "PixKeyType",
  "liquidAddress" TEXT,
  "fee" DOUBLE PRECISION NOT NULL,
  "netAmount" DOUBLE PRECISION NOT NULL,
  "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
  "statusReason" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "processedAt" TIMESTAMP(3),
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedBy" TEXT,
  "rejectedAt" TIMESTAMP(3),
  "adminNotes" TEXT,
  "coldwalletTxId" TEXT,
  "cpfCnpj" TEXT,
  "fullName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WithdrawalRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- SystemSettings Table
CREATE TABLE "SystemSettings" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "key" TEXT NOT NULL UNIQUE,
  "value" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- DiscountCoupon Table
CREATE TABLE "DiscountCoupon" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "code" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "discountPercentage" DOUBLE PRECISION NOT NULL,
  "maxUses" INTEGER,
  "maxUsesPerUser" INTEGER NOT NULL DEFAULT 1,
  "currentUses" INTEGER NOT NULL DEFAULT 0,
  "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil" TIMESTAMP(3),
  "minAmount" DOUBLE PRECISION,
  "maxAmount" DOUBLE PRECISION,
  "allowedMethods" TEXT[] NOT NULL DEFAULT ARRAY['PIX', 'DEPIX']::TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT
);

-- CouponUsage Table
CREATE TABLE "CouponUsage" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "couponId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "withdrawalRequestId" TEXT,
  "discountApplied" DOUBLE PRECISION NOT NULL,
  "originalFee" DOUBLE PRECISION NOT NULL,
  "finalFee" DOUBLE PRECISION NOT NULL,
  "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CouponUsage_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "DiscountCoupon"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CouponUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CouponUsage_withdrawalRequestId_fkey" FOREIGN KEY ("withdrawalRequestId") REFERENCES "WithdrawalRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CouponUsage_couponId_userId_withdrawalRequestId_key" UNIQUE ("couponId", "userId", "withdrawalRequestId")
);

-- CommerceApplication Table
CREATE TABLE "CommerceApplication" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "userId" TEXT NOT NULL UNIQUE,
  "businessName" TEXT NOT NULL,
  "businessType" TEXT NOT NULL,
  "monthlyVolume" TEXT NOT NULL,
  "productDescription" TEXT NOT NULL,
  "targetAudience" TEXT NOT NULL,
  "hasPhysicalStore" TEXT NOT NULL,
  "socialMedia" TEXT NOT NULL,
  "businessObjective" TEXT NOT NULL,
  "status" "CommerceApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "depositAmount" DOUBLE PRECISION DEFAULT 100000,
  "depositPaid" BOOLEAN NOT NULL DEFAULT false,
  "depositPaidAt" TIMESTAMP(3),
  "depositRefunded" BOOLEAN NOT NULL DEFAULT false,
  "depositRefundedAt" TIMESTAMP(3),
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewNotes" TEXT,
  "rejectionReason" TEXT,
  "transactionCount" INTEGER NOT NULL DEFAULT 0,
  "commerceActivatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommerceApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- UserLevel Table
CREATE TABLE "UserLevel" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "userId" TEXT NOT NULL UNIQUE,
  "level" INTEGER NOT NULL DEFAULT 0,
  "dailyLimitBrl" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "dailyUsedBrl" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "totalVolumeBrl" DECIMAL(12, 2) DEFAULT 0,
  "completedTransactions" INTEGER NOT NULL DEFAULT 0,
  "lastLimitReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastLevelUpgrade" TIMESTAMP(3),
  "syncedFromBot" BOOLEAN NOT NULL DEFAULT false,
  "botExternalId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserLevel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- LevelConfig Table
CREATE TABLE "LevelConfig" (
  "level" INTEGER PRIMARY KEY,
  "name" TEXT NOT NULL,
  "dailyLimitBrl" DECIMAL(10, 2) NOT NULL,
  "maxPerTransactionBrl" DECIMAL(10, 2),
  "minTransactionsForUpgrade" INTEGER NOT NULL,
  "minVolumeForUpgrade" DECIMAL(12, 2) NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- LevelHistory Table
CREATE TABLE "LevelHistory" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "userId" TEXT NOT NULL,
  "oldLevel" INTEGER NOT NULL,
  "newLevel" INTEGER NOT NULL,
  "oldLimit" DECIMAL(10, 2) NOT NULL,
  "newLimit" DECIMAL(10, 2) NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LevelHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- =====================================================
-- INDEXES
-- =====================================================

-- User indexes
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_username_idx" ON "User"("username");
CREATE INDEX "User_apiKey_idx" ON "User"("apiKey");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_passwordResetCode_idx" ON "User"("passwordResetCode");
CREATE INDEX "User_verifiedTaxNumber_idx" ON "User"("verifiedTaxNumber");
CREATE INDEX "User_botExternalId_idx" ON "User"("botExternalId");

-- Transaction indexes
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");
CREATE INDEX "Transaction_externalId_idx" ON "Transaction"("externalId");
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- WebhookEvent indexes
CREATE INDEX "WebhookEvent_transactionId_idx" ON "WebhookEvent"("transactionId");
CREATE INDEX "WebhookEvent_status_idx" ON "WebhookEvent"("status");
CREATE INDEX "WebhookEvent_nextRetryAt_idx" ON "WebhookEvent"("nextRetryAt");

-- AuditLog indexes
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_transactionId_idx" ON "AuditLog"("transactionId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- RateLimit indexes
CREATE INDEX "RateLimit_key_idx" ON "RateLimit"("key");
CREATE INDEX "RateLimit_resetAt_idx" ON "RateLimit"("resetAt");

-- UserLimit indexes
CREATE INDEX "UserLimit_userId_idx" ON "UserLimit"("userId");
CREATE INDEX "UserLimit_isFirstDay_idx" ON "UserLimit"("isFirstDay");
CREATE INDEX "UserLimit_isKycVerified_idx" ON "UserLimit"("isKycVerified");

-- ApiKeyRequest indexes
CREATE INDEX "ApiKeyRequest_userId_idx" ON "ApiKeyRequest"("userId");
CREATE INDEX "ApiKeyRequest_status_idx" ON "ApiKeyRequest"("status");
CREATE INDEX "ApiKeyRequest_createdAt_idx" ON "ApiKeyRequest"("createdAt");

-- PaymentLink indexes
CREATE INDEX "PaymentLink_shortCode_idx" ON "PaymentLink"("shortCode");
CREATE INDEX "PaymentLink_userId_idx" ON "PaymentLink"("userId");
CREATE INDEX "PaymentLink_isActive_idx" ON "PaymentLink"("isActive");

-- UserReputation indexes
CREATE INDEX "UserReputation_userId_idx" ON "UserReputation"("userId");
CREATE INDEX "UserReputation_reputationScore_idx" ON "UserReputation"("reputationScore");

-- WithdrawalRequest indexes
CREATE INDEX "WithdrawalRequest_userId_idx" ON "WithdrawalRequest"("userId");
CREATE INDEX "WithdrawalRequest_status_idx" ON "WithdrawalRequest"("status");
CREATE INDEX "WithdrawalRequest_scheduledFor_idx" ON "WithdrawalRequest"("scheduledFor");
CREATE INDEX "WithdrawalRequest_method_idx" ON "WithdrawalRequest"("method");

-- SystemSettings indexes
CREATE INDEX "SystemSettings_key_idx" ON "SystemSettings"("key");

-- DiscountCoupon indexes
CREATE INDEX "DiscountCoupon_code_idx" ON "DiscountCoupon"("code");
CREATE INDEX "DiscountCoupon_isActive_idx" ON "DiscountCoupon"("isActive");
CREATE INDEX "DiscountCoupon_validUntil_idx" ON "DiscountCoupon"("validUntil");

-- CouponUsage indexes
CREATE INDEX "CouponUsage_couponId_idx" ON "CouponUsage"("couponId");
CREATE INDEX "CouponUsage_userId_idx" ON "CouponUsage"("userId");
CREATE INDEX "CouponUsage_usedAt_idx" ON "CouponUsage"("usedAt");

-- CommerceApplication indexes
CREATE INDEX "CommerceApplication_status_idx" ON "CommerceApplication"("status");
CREATE INDEX "CommerceApplication_createdAt_idx" ON "CommerceApplication"("createdAt");

-- UserLevel indexes
CREATE INDEX "UserLevel_userId_idx" ON "UserLevel"("userId");
CREATE INDEX "UserLevel_level_idx" ON "UserLevel"("level");
CREATE INDEX "UserLevel_botExternalId_idx" ON "UserLevel"("botExternalId");
CREATE INDEX "UserLevel_lastLimitReset_idx" ON "UserLevel"("lastLimitReset");
CREATE INDEX "UserLevel_dailyLimitBrl_idx" ON "UserLevel"("dailyLimitBrl");

-- LevelConfig indexes
CREATE INDEX "LevelConfig_level_idx" ON "LevelConfig"("level");

-- LevelHistory indexes
CREATE INDEX "LevelHistory_userId_idx" ON "LevelHistory"("userId");
CREATE INDEX "LevelHistory_createdAt_idx" ON "LevelHistory"("createdAt");
CREATE INDEX "LevelHistory_newLevel_idx" ON "LevelHistory"("newLevel");

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables with updatedAt
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transaction_updated_at BEFORE UPDATE ON "Transaction" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_webhook_event_updated_at BEFORE UPDATE ON "WebhookEvent" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rate_limit_updated_at BEFORE UPDATE ON "RateLimit" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_limit_updated_at BEFORE UPDATE ON "UserLimit" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_key_request_updated_at BEFORE UPDATE ON "ApiKeyRequest" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_link_updated_at BEFORE UPDATE ON "PaymentLink" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_reputation_updated_at BEFORE UPDATE ON "UserReputation" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_withdrawal_request_updated_at BEFORE UPDATE ON "WithdrawalRequest" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON "SystemSettings" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_discount_coupon_updated_at BEFORE UPDATE ON "DiscountCoupon" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commerce_application_updated_at BEFORE UPDATE ON "CommerceApplication" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_level_updated_at BEFORE UPDATE ON "UserLevel" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_level_config_updated_at BEFORE UPDATE ON "LevelConfig" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE "User" IS 'Stores user account information including authentication, profile, and settings';
COMMENT ON TABLE "Transaction" IS 'Records all financial transactions including deposits, withdrawals, and transfers';
COMMENT ON TABLE "WebhookEvent" IS 'Manages webhook notifications for transaction events';
COMMENT ON TABLE "AuditLog" IS 'Tracks all system actions for security and compliance auditing';
COMMENT ON TABLE "RateLimit" IS 'Enforces API rate limiting per key';
COMMENT ON TABLE "UserLimit" IS 'Defines transaction limits for each user';
COMMENT ON TABLE "ApiKeyRequest" IS 'Manages API key access requests and approvals';
COMMENT ON TABLE "PaymentLink" IS 'Stores reusable payment links for commerce users';
COMMENT ON TABLE "UserReputation" IS 'Tracks user reputation metrics for limit adjustments';
COMMENT ON TABLE "WithdrawalRequest" IS 'Manages withdrawal requests requiring approval';
COMMENT ON TABLE "SystemSettings" IS 'Stores system-wide configuration settings';
COMMENT ON TABLE "DiscountCoupon" IS 'Manages promotional discount coupons';
COMMENT ON TABLE "CouponUsage" IS 'Tracks coupon usage per user';
COMMENT ON TABLE "CommerceApplication" IS 'Stores commerce mode applications and approvals';
COMMENT ON TABLE "UserLevel" IS 'Tracks user level progression and daily limits';
COMMENT ON TABLE "LevelConfig" IS 'Defines configuration for each user level';
COMMENT ON TABLE "LevelHistory" IS 'Records history of user level changes';
