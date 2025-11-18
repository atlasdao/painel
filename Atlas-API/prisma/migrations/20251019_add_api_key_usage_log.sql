-- CreateTable
CREATE TABLE "ApiKeyUsageLog" (
    "id" TEXT NOT NULL,
    "apiKeyRequestId" TEXT,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "statusCode" INTEGER NOT NULL DEFAULT 200,
    "responseTime" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKeyUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApiKeyUsageLog_apiKeyRequestId_idx" ON "ApiKeyUsageLog"("apiKeyRequestId");

-- CreateIndex
CREATE INDEX "ApiKeyUsageLog_createdAt_idx" ON "ApiKeyUsageLog"("createdAt");

-- CreateIndex
CREATE INDEX "ApiKeyUsageLog_statusCode_idx" ON "ApiKeyUsageLog"("statusCode");

-- AddForeignKey
ALTER TABLE "ApiKeyUsageLog" ADD CONSTRAINT "ApiKeyUsageLog_apiKeyRequestId_fkey" FOREIGN KEY ("apiKeyRequestId") REFERENCES "ApiKeyRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;