ALTER TABLE "WithdrawalRequest"
  ADD COLUMN IF NOT EXISTS "eulenNextPollAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "eulenPollAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "eulenRateLimitedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "WithdrawalRequest_eulenNextPollAt_idx"
  ON "WithdrawalRequest"("eulenNextPollAt");
