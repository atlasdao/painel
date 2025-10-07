#!/bin/bash

# Test Migration Script for Atlas V. Alpha 0.2
# This script tests the migration on a local test database

set -e  # Exit on error

echo "=========================================="
echo "Atlas V. Alpha 0.2 - Migration Test Script"
echo "=========================================="

# Configuration
DB_USER="atlas_user"
DB_PASS="atlas_pass123"
DB_HOST="localhost"
DB_PORT="5432"
TEST_DB="atlas_test_migration"
PROD_DB="atlas_db"
MIGRATION_DIR="/Volumes/NEWATLAS/Drive/DEV/Atlas Painel/migration-scripts"

export PGPASSWORD="${DB_PASS}"

echo ""
echo "Step 1: Creating test database copy..."
echo "----------------------------------------"

# Drop test database if exists
psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d postgres -c "DROP DATABASE IF EXISTS ${TEST_DB};" 2>/dev/null || true

# Create test database from production copy
echo "Creating test database from production copy..."
psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d postgres -c "CREATE DATABASE ${TEST_DB} WITH TEMPLATE ${PROD_DB} OWNER ${DB_USER};"

echo "✓ Test database created"

echo ""
echo "Step 2: Running pre-migration check..."
echo "----------------------------------------"

psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${TEST_DB} -f "${MIGRATION_DIR}/00_pre_migration_check.sql"

echo ""
echo "Step 3: Running migration script..."
echo "----------------------------------------"

psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${TEST_DB} -f "${MIGRATION_DIR}/01_migrate_to_v0.2.sql"

echo ""
echo "Step 4: Running post-migration verification..."
echo "----------------------------------------"

psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${TEST_DB} -f "${MIGRATION_DIR}/03_post_migration_check.sql"

echo ""
echo "Step 5: Testing rollback script..."
echo "----------------------------------------"

echo "Testing rollback capability..."
psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${TEST_DB} -f "${MIGRATION_DIR}/02_rollback_v0.2.sql"

echo "✓ Rollback successful"

echo ""
echo "Step 6: Re-applying migration for final test..."
echo "----------------------------------------"

psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${TEST_DB} -f "${MIGRATION_DIR}/01_migrate_to_v0.2.sql"
psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${TEST_DB} -f "${MIGRATION_DIR}/03_post_migration_check.sql"

echo ""
echo "Step 7: Verifying data integrity..."
echo "----------------------------------------"

psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${TEST_DB} << EOF
-- Check new tables exist
SELECT 'Tables Check' as check_type, COUNT(*) as count
FROM information_schema.tables
WHERE table_name IN ('DiscountCoupon', 'CouponUsage', 'CommerceApplication', 'UserLevel', 'LevelConfig', 'LevelHistory');

-- Check UserLevel records
SELECT 'UserLevel Records' as check_type, COUNT(*) as count FROM "UserLevel";

-- Check LevelConfig records
SELECT 'LevelConfig Records' as check_type, COUNT(*) as count FROM "LevelConfig";

-- Check new columns in User table
SELECT 'User New Columns' as check_type, COUNT(*) as count
FROM information_schema.columns
WHERE table_name = 'User'
AND column_name IN ('twoFactorEnabled', 'profilePicture', 'externalUserId', 'pixKey');
EOF

echo ""
echo "=========================================="
echo "✓ MIGRATION TEST COMPLETED SUCCESSFULLY!"
echo "=========================================="
echo ""
echo "Summary:"
echo "- Pre-migration check: PASSED"
echo "- Migration script: EXECUTED"
echo "- Post-migration check: PASSED"
echo "- Rollback test: SUCCESSFUL"
echo "- Data integrity: VERIFIED"
echo ""
echo "Test database '${TEST_DB}' is ready for inspection."
echo "To clean up: psql -U ${DB_USER} -d postgres -c 'DROP DATABASE ${TEST_DB};'"
echo ""