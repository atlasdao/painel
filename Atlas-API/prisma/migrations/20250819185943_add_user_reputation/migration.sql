-- CreateTable
CREATE TABLE "public"."UserReputation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalApprovedVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalApprovedCount" INTEGER NOT NULL DEFAULT 0,
    "totalRejectedCount" INTEGER NOT NULL DEFAULT 0,
    "reputationScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentDailyLimit" DOUBLE PRECISION NOT NULL DEFAULT 6000,
    "nextLimitThreshold" DOUBLE PRECISION NOT NULL DEFAULT 50000,
    "limitTier" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserReputation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserReputation_userId_key" ON "public"."UserReputation"("userId");

-- CreateIndex
CREATE INDEX "UserReputation_userId_idx" ON "public"."UserReputation"("userId");

-- CreateIndex
CREATE INDEX "UserReputation_reputationScore_idx" ON "public"."UserReputation"("reputationScore");

-- AddForeignKey
ALTER TABLE "public"."UserReputation" ADD CONSTRAINT "UserReputation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
