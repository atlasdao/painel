import { PrismaClient } from '../Atlas-API/node_modules/@prisma/client/index.js';

const prisma = new PrismaClient();

async function analyzeDatabase() {
  console.log('=== DATABASE PERFORMANCE ANALYSIS ===\n');

  try {
    // 1. Check table sizes and row counts
    console.log('1. TABLE STATISTICS:');
    console.log('-------------------');

    const tables = [
      { name: 'User', field: 'user' },
      { name: 'Transaction', field: 'transaction' },
      { name: 'AuditLog', field: 'auditLog' },
      { name: 'WebhookEvent', field: 'webhookEvent' },
      { name: 'PaymentLink', field: 'paymentLink' },
      { name: 'WithdrawalRequest', field: 'withdrawalRequest' },
      { name: 'ApiKeyRequest', field: 'apiKeyRequest' },
      { name: 'UserLimit', field: 'userLimit' },
      { name: 'UserReputation', field: 'userReputation' },
      { name: 'CouponUsage', field: 'couponUsage' },
      { name: 'CommerceApplication', field: 'commerceApplication' },
      { name: 'UserLevel', field: 'userLevel' },
      { name: 'LevelHistory', field: 'levelHistory' },
      { name: 'LevelConfig', field: 'levelConfig' },
      { name: 'DiscountCoupon', field: 'discountCoupon' },
      { name: 'SystemSettings', field: 'systemSettings' },
      { name: 'RateLimit', field: 'rateLimit' }
    ];

    const tableCounts: any = {};
    for (const table of tables) {
      try {
        const count = await (prisma as any)[table.field].count();
        tableCounts[table.name] = count;
        console.log(`- ${table.name}: ${count} records`);
      } catch (e) {
        console.log(`- ${table.name}: Error counting`);
      }
    }

    // 2. Check for orphaned records using raw SQL
    console.log('\n2. DATA INTEGRITY CHECKS:');
    console.log('-------------------------');

    // Check for orphaned transactions (transactions with non-existent userId)
    try {
      const orphanedTx = await prisma.$queryRaw<{count: bigint}[]>`
        SELECT COUNT(*) as count
        FROM "Transaction" t
        LEFT JOIN "User" u ON t."userId" = u.id
        WHERE t."userId" IS NOT NULL AND u.id IS NULL
      `;
      console.log(`- Orphaned Transactions: ${orphanedTx[0]?.count || 0}`);
    } catch (e) {
      console.log('- Orphaned Transactions: Error checking');
    }

    // Check for orphaned audit logs
    try {
      const orphanedAudits = await prisma.$queryRaw<{count: bigint}[]>`
        SELECT COUNT(*) as count
        FROM "AuditLog" a
        LEFT JOIN "User" u ON a."userId" = u.id
        WHERE a."userId" IS NOT NULL AND u.id IS NULL
      `;
      console.log(`- Orphaned AuditLogs: ${orphanedAudits[0]?.count || 0}`);
    } catch (e) {
      console.log('- Orphaned AuditLogs: Error checking');
    }

    // Check for orphaned webhook events
    try {
      const orphanedWebhooks = await prisma.$queryRaw<{count: bigint}[]>`
        SELECT COUNT(*) as count
        FROM "WebhookEvent" w
        LEFT JOIN "Transaction" t ON w."transactionId" = t.id
        WHERE w."transactionId" IS NOT NULL AND t.id IS NULL
      `;
      console.log(`- Orphaned WebhookEvents: ${orphanedWebhooks[0]?.count || 0}`);
    } catch (e) {
      console.log('- Orphaned WebhookEvents: Error checking');
    }

    // 3. Check for old/stale data
    console.log('\n3. OLD DATA ANALYSIS:');
    console.log('---------------------');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const oldPendingTransactions = await prisma.transaction.count({
      where: {
        status: 'PENDING',
        createdAt: {
          lt: thirtyDaysAgo
        }
      }
    });
    console.log(`- Pending Transactions (>30 days): ${oldPendingTransactions}`);

    const expiredTransactions = await prisma.transaction.count({
      where: {
        status: 'EXPIRED'
      }
    });
    console.log(`- Expired Transactions: ${expiredTransactions}`);

    const oldAuditLogs = await prisma.auditLog.count({
      where: {
        createdAt: {
          lt: thirtyDaysAgo
        }
      }
    });
    console.log(`- Audit Logs (>30 days): ${oldAuditLogs}`);

    // 4. Check users with missing relations
    console.log('\n4. USER DATA INTEGRITY:');
    console.log('-----------------------');

    const totalUsers = tableCounts.User || 0;
    const usersWithLimits = tableCounts.UserLimit || 0;
    const usersWithReputation = tableCounts.UserReputation || 0;
    const usersWithLevel = tableCounts.UserLevel || 0;

    console.log(`- Total Users: ${totalUsers}`);
    console.log(`- Users with Limits: ${usersWithLimits}`);
    console.log(`- Users with Reputation: ${usersWithReputation}`);
    console.log(`- Users with Level: ${usersWithLevel}`);
    console.log(`- Missing Limits: ${totalUsers - usersWithLimits}`);
    console.log(`- Missing Reputation: ${totalUsers - usersWithReputation}`);
    console.log(`- Missing Level: ${totalUsers - usersWithLevel}`);

    // 5. Check for duplicate or problematic data
    console.log('\n5. DUPLICATE & PROBLEMATIC DATA:');
    console.log('--------------------------------');

    // Check for duplicate user limits
    try {
      const duplicateLimits = await prisma.$queryRaw<{userId: string, count: bigint}[]>`
        SELECT "userId", COUNT(*) as count
        FROM "UserLimit"
        GROUP BY "userId"
        HAVING COUNT(*) > 1
      `;
      console.log(`- Duplicate UserLimit records: ${duplicateLimits.length}`);
      if (duplicateLimits.length > 0) {
        duplicateLimits.forEach(d => console.log(`  - User ${d.userId}: ${d.count} records`));
      }
    } catch (e) {
      console.log('- Duplicate UserLimit records: Error checking');
    }

    // 6. Performance metrics
    console.log('\n6. PERFORMANCE METRICS:');
    console.log('-----------------------');

    // Recent transaction volume
    const recentTransactions = await prisma.transaction.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    });
    console.log(`- Transactions (last 30 days): ${recentTransactions}`);

    // Completed transactions
    const completedTransactions = await prisma.transaction.count({
      where: {
        status: 'COMPLETED'
      }
    });
    console.log(`- Completed Transactions: ${completedTransactions}`);

    // Failed transactions
    const failedTransactions = await prisma.transaction.count({
      where: {
        status: 'FAILED'
      }
    });
    console.log(`- Failed Transactions: ${failedTransactions}`);

    // Active users
    const activeUsers = await prisma.user.count({
      where: {
        lastLoginAt: {
          gte: thirtyDaysAgo
        }
      }
    });
    console.log(`- Active Users (last 30 days): ${activeUsers}`);

    // Users with API keys
    const usersWithApiKeys = await prisma.user.count({
      where: {
        apiKey: {
          not: null
        }
      }
    });
    console.log(`- Users with API Keys: ${usersWithApiKeys}`);

    // 7. Check for test/development data
    console.log('\n7. TEST/DEVELOPMENT DATA:');
    console.log('-------------------------');

    const testUsers = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: 'test' } },
          { email: { contains: 'demo' } },
          { email: { contains: 'example' } },
          { username: { contains: 'test' } },
          { username: { contains: 'demo' } }
        ]
      },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true
      }
    });
    console.log(`- Potential test users: ${testUsers.length}`);
    testUsers.forEach(u => console.log(`  - ${u.username} (${u.email})`));

    // 8. Index usage analysis
    console.log('\n8. QUERY PERFORMANCE TEST:');
    console.log('--------------------------');

    // Test various query patterns
    const queries = [
      {
        name: 'Simple user lookup by email',
        query: async () => prisma.user.findFirst({ where: { email: 'admin@atlas.com' } })
      },
      {
        name: 'Transactions with user join',
        query: async () => prisma.transaction.findMany({
          where: { status: 'COMPLETED' },
          include: { user: true },
          take: 10
        })
      },
      {
        name: 'Recent audit logs',
        query: async () => prisma.auditLog.findMany({
          where: { createdAt: { gte: sevenDaysAgo } },
          orderBy: { createdAt: 'desc' },
          take: 100
        })
      },
      {
        name: 'User with all relations',
        query: async () => prisma.user.findFirst({
          include: {
            transactions: { take: 5 },
            userLevel: true,
            limits: true,
            reputation: true
          }
        })
      }
    ];

    for (const { name, query } of queries) {
      const start = Date.now();
      await query();
      const time = Date.now() - start;
      console.log(`- ${name}: ${time}ms`);
    }

    // 9. Check indexes and constraints
    console.log('\n9. DATABASE INDEXES:');
    console.log('--------------------');

    try {
      const indexes = await prisma.$queryRaw<{
        tablename: string;
        indexname: string;
        indexdef: string;
      }[]>`
        SELECT
          tablename,
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname;
      `;

      let currentTable = '';
      indexes.forEach(idx => {
        if (currentTable !== idx.tablename) {
          currentTable = idx.tablename;
          console.log(`\nTable: ${currentTable}`);
        }
        console.log(`  - ${idx.indexname}`);
      });
    } catch (e) {
      console.log('Error fetching indexes');
    }

    // 10. Connection pool stats
    console.log('\n10. CONNECTION POOL METRICS:');
    console.log('----------------------------');
    const poolMetrics = await prisma.$metrics.json();
    console.log('Pool Metrics:', JSON.stringify(poolMetrics, null, 2));

  } catch (error) {
    console.error('Error analyzing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeDatabase();