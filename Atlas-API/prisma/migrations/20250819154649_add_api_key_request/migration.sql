-- CreateEnum
CREATE TYPE "public"."ApiKeyRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED');

-- CreateTable
CREATE TABLE "public"."ApiKeyRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usageReason" TEXT NOT NULL,
    "serviceUrl" TEXT NOT NULL,
    "estimatedVolume" TEXT NOT NULL,
    "status" "public"."ApiKeyRequestStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvalNotes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "generatedApiKey" TEXT,
    "apiKeyExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKeyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKeyRequest_generatedApiKey_key" ON "public"."ApiKeyRequest"("generatedApiKey");

-- CreateIndex
CREATE INDEX "ApiKeyRequest_userId_idx" ON "public"."ApiKeyRequest"("userId");

-- CreateIndex
CREATE INDEX "ApiKeyRequest_status_idx" ON "public"."ApiKeyRequest"("status");

-- CreateIndex
CREATE INDEX "ApiKeyRequest_createdAt_idx" ON "public"."ApiKeyRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."ApiKeyRequest" ADD CONSTRAINT "ApiKeyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
