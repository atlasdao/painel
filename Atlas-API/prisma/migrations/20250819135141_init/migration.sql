-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAW', 'TRANSFER', 'REFUND');

-- CreateEnum
CREATE TYPE "public"."TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."PixKeyType" AS ENUM ('CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM_KEY');

-- CreateEnum
CREATE TYPE "public"."WebhookEventStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "apiKey" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "passwordResetCode" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "passwordResetAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "status" "public"."TransactionStatus" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "pixKey" TEXT,
    "pixKeyType" "public"."PixKeyType",
    "externalId" TEXT,
    "description" TEXT,
    "metadata" TEXT,
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WebhookEvent" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'POST',
    "headers" TEXT,
    "payload" TEXT NOT NULL,
    "status" "public"."WebhookEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastAttemptAt" TIMESTAMP(3),
    "responseCode" INTEGER,
    "responseBody" TEXT,
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RateLimit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "requests" INTEGER NOT NULL DEFAULT 0,
    "window" TEXT NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserLimit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_apiKey_key" ON "public"."User"("apiKey");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "public"."User"("username");

-- CreateIndex
CREATE INDEX "User_apiKey_idx" ON "public"."User"("apiKey");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role");

-- CreateIndex
CREATE INDEX "User_passwordResetCode_idx" ON "public"."User"("passwordResetCode");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_externalId_key" ON "public"."Transaction"("externalId");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "public"."Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "public"."Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "public"."Transaction"("type");

-- CreateIndex
CREATE INDEX "Transaction_externalId_idx" ON "public"."Transaction"("externalId");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "public"."Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_transactionId_idx" ON "public"."WebhookEvent"("transactionId");

-- CreateIndex
CREATE INDEX "WebhookEvent_status_idx" ON "public"."WebhookEvent"("status");

-- CreateIndex
CREATE INDEX "WebhookEvent_nextRetryAt_idx" ON "public"."WebhookEvent"("nextRetryAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "public"."AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_transactionId_idx" ON "public"."AuditLog"("transactionId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "public"."AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_key_key" ON "public"."RateLimit"("key");

-- CreateIndex
CREATE INDEX "RateLimit_key_idx" ON "public"."RateLimit"("key");

-- CreateIndex
CREATE INDEX "RateLimit_resetAt_idx" ON "public"."RateLimit"("resetAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserLimit_userId_key" ON "public"."UserLimit"("userId");

-- CreateIndex
CREATE INDEX "UserLimit_userId_idx" ON "public"."UserLimit"("userId");

-- CreateIndex
CREATE INDEX "UserLimit_isFirstDay_idx" ON "public"."UserLimit"("isFirstDay");

-- CreateIndex
CREATE INDEX "UserLimit_isKycVerified_idx" ON "public"."UserLimit"("isKycVerified");

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WebhookEvent" ADD CONSTRAINT "WebhookEvent_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserLimit" ADD CONSTRAINT "UserLimit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
