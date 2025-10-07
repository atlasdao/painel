-- CreateTable
CREATE TABLE "public"."DiscountCoupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountPercentage" DOUBLE PRECISION NOT NULL,
    "maxUses" INTEGER,
    "maxUsesPerUser" INTEGER NOT NULL DEFAULT 1,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "minAmount" DOUBLE PRECISION,
    "maxAmount" DOUBLE PRECISION,
    "allowedMethods" TEXT[] DEFAULT ARRAY['PIX', 'DEPIX']::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "DiscountCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CouponUsage" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "withdrawalRequestId" TEXT,
    "discountApplied" DOUBLE PRECISION NOT NULL,
    "originalFee" DOUBLE PRECISION NOT NULL,
    "finalFee" DOUBLE PRECISION NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCoupon_code_key" ON "public"."DiscountCoupon"("code");

-- CreateIndex
CREATE INDEX "DiscountCoupon_code_idx" ON "public"."DiscountCoupon"("code");

-- CreateIndex
CREATE INDEX "DiscountCoupon_isActive_idx" ON "public"."DiscountCoupon"("isActive");

-- CreateIndex
CREATE INDEX "DiscountCoupon_validUntil_idx" ON "public"."DiscountCoupon"("validUntil");

-- CreateIndex
CREATE INDEX "CouponUsage_couponId_idx" ON "public"."CouponUsage"("couponId");

-- CreateIndex
CREATE INDEX "CouponUsage_userId_idx" ON "public"."CouponUsage"("userId");

-- CreateIndex
CREATE INDEX "CouponUsage_usedAt_idx" ON "public"."CouponUsage"("usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CouponUsage_couponId_userId_withdrawalRequestId_key" ON "public"."CouponUsage"("couponId", "userId", "withdrawalRequestId");

-- AddForeignKey
ALTER TABLE "public"."CouponUsage" ADD CONSTRAINT "CouponUsage_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "public"."DiscountCoupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CouponUsage" ADD CONSTRAINT "CouponUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CouponUsage" ADD CONSTRAINT "CouponUsage_withdrawalRequestId_fkey" FOREIGN KEY ("withdrawalRequestId") REFERENCES "public"."WithdrawalRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
