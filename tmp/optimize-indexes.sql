-- ===========================================
-- DATABASE OPTIMIZATION SQL SCRIPT
-- Atlas Painel Performance Improvements
-- ===========================================

-- 1. COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- -----------------------------------------------

-- Transaction queries by user and status (common in dashboard)
CREATE INDEX IF NOT EXISTS idx_transaction_userid_status_createdat
ON "Transaction"("userId", "status", "createdAt" DESC);

-- Transaction queries by user and type
CREATE INDEX IF NOT EXISTS idx_transaction_userid_type_createdat
ON "Transaction"("userId", "type", "createdAt" DESC);

-- Audit logs by user and action (for activity tracking)
CREATE INDEX IF NOT EXISTS idx_auditlog_userid_action_createdat
ON "AuditLog"("userId", "action", "createdAt" DESC);

-- Withdrawal requests by user and status
CREATE INDEX IF NOT EXISTS idx_withdrawalrequest_userid_status
ON "WithdrawalRequest"("userId", "status", "scheduledFor");

-- API key requests by user and status
CREATE INDEX IF NOT EXISTS idx_apikeyrequest_userid_status
ON "ApiKeyRequest"("userId", "status", "createdAt" DESC);

-- 2. PERFORMANCE INDEXES FOR FREQUENT LOOKUPS
-- --------------------------------------------

-- User login optimization (email + password check)
CREATE INDEX IF NOT EXISTS idx_user_email_password
ON "User"("email", "isActive");

-- User authentication by API key
CREATE INDEX IF NOT EXISTS idx_user_apikey_active
ON "User"("apiKey", "isActive") WHERE "apiKey" IS NOT NULL;

-- Active payment links lookup
CREATE INDEX IF NOT EXISTS idx_paymentlink_active_userid
ON "PaymentLink"("userId", "isActive") WHERE "isActive" = true;

-- Pending webhook events for retry
CREATE INDEX IF NOT EXISTS idx_webhookevent_status_nextretry
ON "WebhookEvent"("status", "nextRetryAt")
WHERE "status" = 'PENDING' AND "nextRetryAt" IS NOT NULL;

-- 3. PARTIAL INDEXES FOR SPECIFIC CONDITIONS
-- ------------------------------------------

-- Pending transactions (for monitoring)
CREATE INDEX IF NOT EXISTS idx_transaction_pending
ON "Transaction"("createdAt" DESC)
WHERE "status" = 'PENDING';

-- Completed transactions (for statistics)
CREATE INDEX IF NOT EXISTS idx_transaction_completed
ON "Transaction"("userId", "createdAt" DESC)
WHERE "status" = 'COMPLETED';

-- Active users with commerce mode
CREATE INDEX IF NOT EXISTS idx_user_commerce_active
ON "User"("commerceMode", "isActive")
WHERE "commerceMode" = true AND "isActive" = true;

-- Validated users
CREATE INDEX IF NOT EXISTS idx_user_validated
ON "User"("isAccountValidated", "createdAt")
WHERE "isAccountValidated" = true;

-- 4. FOREIGN KEY OPTIMIZATION
-- ---------------------------

-- Ensure all foreign keys have indexes (most already exist)
-- These improve JOIN performance

-- 5. TEXT SEARCH OPTIMIZATION
-- ---------------------------

-- User search by email or username (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_user_email_lower
ON "User"(LOWER("email"));

CREATE INDEX IF NOT EXISTS idx_user_username_lower
ON "User"(LOWER("username"));

-- 6. CLEANUP OLD/UNUSED INDEXES
-- -----------------------------

-- List indexes for review (run separately to check)
-- SELECT schemaname, tablename, indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;

-- 7. UPDATE STATISTICS FOR QUERY PLANNER
-- --------------------------------------

ANALYZE "User";
ANALYZE "Transaction";
ANALYZE "AuditLog";
ANALYZE "WebhookEvent";
ANALYZE "PaymentLink";
ANALYZE "WithdrawalRequest";
ANALYZE "ApiKeyRequest";
ANALYZE "UserLimit";
ANALYZE "UserReputation";
ANALYZE "UserLevel";
ANALYZE "LevelConfig";
ANALYZE "LevelHistory";
ANALYZE "SystemSettings";
ANALYZE "DiscountCoupon";
ANALYZE "CouponUsage";
ANALYZE "CommerceApplication";
ANALYZE "RateLimit";

-- 8. PERFORMANCE MONITORING VIEWS
-- -------------------------------

-- Create a view for transaction statistics
CREATE OR REPLACE VIEW transaction_stats AS
SELECT
    u.id as user_id,
    u.username,
    COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) as completed_count,
    COUNT(CASE WHEN t.status = 'PENDING' THEN 1 END) as pending_count,
    COUNT(CASE WHEN t.status = 'FAILED' THEN 1 END) as failed_count,
    SUM(CASE WHEN t.status = 'COMPLETED' THEN t.amount ELSE 0 END) as total_completed_amount,
    MAX(t."createdAt") as last_transaction_date
FROM "User" u
LEFT JOIN "Transaction" t ON u.id = t."userId"
GROUP BY u.id, u.username;

-- Create a view for user activity summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
    u.id,
    u.username,
    u.email,
    u."isAccountValidated",
    u."commerceMode",
    u."lastLoginAt",
    ul."dailyDepositLimit",
    ul."isKycVerified",
    ur."reputationScore",
    ulv.level,
    COUNT(DISTINCT t.id) as transaction_count,
    COUNT(DISTINCT al.id) as audit_log_count
FROM "User" u
LEFT JOIN "UserLimit" ul ON u.id = ul."userId"
LEFT JOIN "UserReputation" ur ON u.id = ur."userId"
LEFT JOIN "UserLevel" ulv ON u.id = ulv."userId"
LEFT JOIN "Transaction" t ON u.id = t."userId"
LEFT JOIN "AuditLog" al ON u.id = al."userId"
GROUP BY u.id, u.username, u.email, u."isAccountValidated",
         u."commerceMode", u."lastLoginAt", ul."dailyDepositLimit",
         ul."isKycVerified", ur."reputationScore", ulv.level;

-- 9. MAINTENANCE COMMANDS
-- ----------------------

-- Vacuum to reclaim space (run during maintenance window)
-- VACUUM (VERBOSE, ANALYZE) "Transaction";
-- VACUUM (VERBOSE, ANALYZE) "AuditLog";

-- Reindex for optimal performance (run during maintenance)
-- REINDEX TABLE "Transaction";
-- REINDEX TABLE "User";

-- 10. MONITORING QUERIES
-- ---------------------

-- Check index usage
-- SELECT
--     schemaname,
--     tablename,
--     indexname,
--     idx_scan as index_scans,
--     idx_tup_read as tuples_read,
--     idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- Check slow queries (requires pg_stat_statements extension)
-- SELECT
--     query,
--     calls,
--     total_time,
--     mean_time,
--     min_time,
--     max_time
-- FROM pg_stat_statements
-- WHERE mean_time > 100
-- ORDER BY mean_time DESC
-- LIMIT 20;

COMMENT ON SCHEMA public IS 'Atlas Painel - Optimized Database Schema';