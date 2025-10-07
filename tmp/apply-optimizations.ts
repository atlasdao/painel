import { PrismaClient } from '../Atlas-API/node_modules/@prisma/client/index.js';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function applyOptimizations() {
  console.log('=== APPLYING DATABASE OPTIMIZATIONS ===\n');

  try {
    // Read the SQL optimization script
    const sqlScript = fs.readFileSync(
      path.join('/Volumes/NEWATLAS/Drive/DEV/Atlas Painel/tmp/optimize-indexes.sql'),
      'utf-8'
    );

    // Split by major sections and execute important ones
    const optimizations = [
      {
        name: 'Composite index for transaction queries',
        sql: `CREATE INDEX IF NOT EXISTS idx_transaction_userid_status_createdat
              ON "Transaction"("userId", "status", "createdAt" DESC)`
      },
      {
        name: 'Composite index for transaction by type',
        sql: `CREATE INDEX IF NOT EXISTS idx_transaction_userid_type_createdat
              ON "Transaction"("userId", "type", "createdAt" DESC)`
      },
      {
        name: 'Composite index for audit logs',
        sql: `CREATE INDEX IF NOT EXISTS idx_auditlog_userid_action_createdat
              ON "AuditLog"("userId", "action", "createdAt" DESC)`
      },
      {
        name: 'Index for withdrawal requests',
        sql: `CREATE INDEX IF NOT EXISTS idx_withdrawalrequest_userid_status
              ON "WithdrawalRequest"("userId", "status", "scheduledFor")`
      },
      {
        name: 'Index for API key requests',
        sql: `CREATE INDEX IF NOT EXISTS idx_apikeyrequest_userid_status
              ON "ApiKeyRequest"("userId", "status", "createdAt" DESC)`
      },
      {
        name: 'User login optimization index',
        sql: `CREATE INDEX IF NOT EXISTS idx_user_email_password
              ON "User"("email", "isActive")`
      },
      {
        name: 'API key authentication index',
        sql: `CREATE INDEX IF NOT EXISTS idx_user_apikey_active
              ON "User"("apiKey", "isActive") WHERE "apiKey" IS NOT NULL`
      },
      {
        name: 'Active payment links index',
        sql: `CREATE INDEX IF NOT EXISTS idx_paymentlink_active_userid
              ON "PaymentLink"("userId", "isActive") WHERE "isActive" = true`
      },
      {
        name: 'Pending webhook events index',
        sql: `CREATE INDEX IF NOT EXISTS idx_webhookevent_status_nextretry
              ON "WebhookEvent"("status", "nextRetryAt")
              WHERE "status" = 'PENDING' AND "nextRetryAt" IS NOT NULL`
      },
      {
        name: 'Partial index for pending transactions',
        sql: `CREATE INDEX IF NOT EXISTS idx_transaction_pending
              ON "Transaction"("createdAt" DESC)
              WHERE "status" = 'PENDING'`
      },
      {
        name: 'Partial index for completed transactions',
        sql: `CREATE INDEX IF NOT EXISTS idx_transaction_completed
              ON "Transaction"("userId", "createdAt" DESC)
              WHERE "status" = 'COMPLETED'`
      },
      {
        name: 'Commerce mode users index',
        sql: `CREATE INDEX IF NOT EXISTS idx_user_commerce_active
              ON "User"("commerceMode", "isActive")
              WHERE "commerceMode" = true AND "isActive" = true`
      },
      {
        name: 'Validated users index',
        sql: `CREATE INDEX IF NOT EXISTS idx_user_validated
              ON "User"("isAccountValidated", "createdAt")
              WHERE "isAccountValidated" = true`
      },
      {
        name: 'Case-insensitive email search',
        sql: `CREATE INDEX IF NOT EXISTS idx_user_email_lower
              ON "User"(LOWER("email"))`
      },
      {
        name: 'Case-insensitive username search',
        sql: `CREATE INDEX IF NOT EXISTS idx_user_username_lower
              ON "User"(LOWER("username"))`
      }
    ];

    console.log('Applying database optimizations...\n');

    let successCount = 0;
    let failCount = 0;

    for (const optimization of optimizations) {
      try {
        await prisma.$executeRawUnsafe(optimization.sql);
        console.log(`✓ ${optimization.name}`);
        successCount++;
      } catch (error: any) {
        console.error(`✗ ${optimization.name}: ${error.message}`);
        failCount++;
      }
    }

    console.log('\n--- Optimization Summary ---');
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${failCount}`);

    // Update table statistics
    console.log('\nUpdating table statistics...');
    const tables = [
      'User', 'Transaction', 'AuditLog', 'WebhookEvent',
      'PaymentLink', 'WithdrawalRequest', 'ApiKeyRequest',
      'UserLimit', 'UserReputation', 'UserLevel'
    ];

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`ANALYZE "${table}"`);
        console.log(`✓ Updated statistics for ${table}`);
      } catch (error: any) {
        console.error(`✗ Failed to update statistics for ${table}: ${error.message}`);
      }
    }

    // Test query performance after optimizations
    console.log('\n=== PERFORMANCE TEST AFTER OPTIMIZATION ===\n');

    const tests = [
      {
        name: 'User lookup by email',
        query: async () => {
          const start = Date.now();
          await prisma.user.findFirst({
            where: { email: 'admin@atlas.com' }
          });
          return Date.now() - start;
        }
      },
      {
        name: 'User transactions with status filter',
        query: async () => {
          const start = Date.now();
          await prisma.transaction.findMany({
            where: {
              userId: (await prisma.user.findFirst())?.id || '',
              status: 'COMPLETED'
            },
            orderBy: { createdAt: 'desc' },
            take: 10
          });
          return Date.now() - start;
        }
      },
      {
        name: 'Recent audit logs',
        query: async () => {
          const start = Date.now();
          await prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100
          });
          return Date.now() - start;
        }
      },
      {
        name: 'User with all relations',
        query: async () => {
          const start = Date.now();
          await prisma.user.findFirst({
            include: {
              transactions: { take: 5 },
              userLevel: true,
              limits: true,
              reputation: true
            }
          });
          return Date.now() - start;
        }
      }
    ];

    console.log('Query Performance Results:');
    console.log('-------------------------');
    for (const test of tests) {
      const time = await test.query();
      console.log(`${test.name}: ${time}ms`);
    }

    // Check index usage
    console.log('\n=== INDEX USAGE STATISTICS ===\n');

    const indexStats = await prisma.$queryRaw<{
      tablename: string;
      indexname: string;
      idx_scan: bigint;
      idx_tup_read: bigint;
    }[]>`
      SELECT
        tablename,
        indexname,
        idx_scan,
        idx_tup_read
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
        AND idx_scan > 0
      ORDER BY idx_scan DESC
      LIMIT 20
    `;

    console.log('Most Used Indexes:');
    console.log('------------------');
    indexStats.forEach(idx => {
      console.log(`${idx.tablename}.${idx.indexname}: ${idx.idx_scan} scans, ${idx.idx_tup_read} tuples read`);
    });

    // Database size information
    console.log('\n=== DATABASE SIZE INFORMATION ===\n');

    const dbSize = await prisma.$queryRaw<{
      table_name: string;
      total_size: string;
      table_size: string;
      indexes_size: string;
    }[]>`
      SELECT
        relname AS table_name,
        pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
        pg_size_pretty(pg_relation_size(relid)) AS table_size,
        pg_size_pretty(pg_indexes_size(relid)) AS indexes_size
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(relid) DESC
    `;

    console.log('Table Sizes:');
    console.log('------------');
    dbSize.forEach(table => {
      console.log(`${table.table_name}:`);
      console.log(`  Total: ${table.total_size}`);
      console.log(`  Table: ${table.table_size}`);
      console.log(`  Indexes: ${table.indexes_size}`);
    });

  } catch (error) {
    console.error('Error applying optimizations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

applyOptimizations();