import { PrismaClient } from '../Atlas-API/node_modules/@prisma/client/index.js';

const prisma = new PrismaClient();

async function analyzeDatabase() {
  console.log('=== DATABASE PERFORMANCE ANALYSIS ===\n');

  try {
    // 1. Check table sizes and row counts
    console.log('1. TABLE STATISTICS:');
    console.log('-------------------');

    const tables = [
      'User', 'Transaction', 'AuditLog', 'WebhookEvent',
      'PaymentLink', 'WithdrawalRequest', 'ApiKeyRequest',
      'UserLimit', 'UserReputation', 'CouponUsage',
      'CommerceApplication', 'UserLevel', 'LevelHistory'
    ];

    for (const table of tables) {
      try {
        const count = await (prisma as any)[table.charAt(0).toLowerCase() + table.slice(1)].count();
        console.log(`- ${table}: ${count} records`);
      } catch (e) {
        console.log(`- ${table}: Error counting`);
      }
    }

    // 2. Check for orphaned records
    console.log('\n2. DATA INTEGRITY CHECKS:');
    console.log('-------------------------');

    // Check transactions without users
    const orphanedTransactions = await prisma.transaction.count({
      where: {
        user: {
          is: null
        }
      }
    });
    console.log(`- Orphaned Transactions: ${orphanedTransactions}`);

    // Check audit logs without users
    const orphanedAuditLogs = await prisma.auditLog.count({
      where: {
        userId: {
          not: null
        },
        user: {
          is: null
        }
      }
    });
    console.log(`- Orphaned AuditLogs: ${orphanedAuditLogs}`);

    // 3. Check for old/stale data
    console.log('\n3. OLD DATA ANALYSIS:');
    console.log('---------------------');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldPendingTransactions = await prisma.transaction.count({
      where: {
        status: 'PENDING',
        createdAt: {
          lt: thirtyDaysAgo
        }
      }
    });
    console.log(`- Pending Transactions (>30 days): ${oldPendingTransactions}`);

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

    const totalUsers = await prisma.user.count();
    const usersWithLimits = await prisma.userLimit.count();
    const usersWithReputation = await prisma.userReputation.count();
    const usersWithLevel = await prisma.userLevel.count();

    console.log(`- Total Users: ${totalUsers}`);
    console.log(`- Users with Limits: ${usersWithLimits}`);
    console.log(`- Users with Reputation: ${usersWithReputation}`);
    console.log(`- Users with Level: ${usersWithLevel}`);
    console.log(`- Missing Limits: ${totalUsers - usersWithLimits}`);
    console.log(`- Missing Reputation: ${totalUsers - usersWithReputation}`);
    console.log(`- Missing Level: ${totalUsers - usersWithLevel}`);

    // 5. Check for duplicate or problematic data
    console.log('\n5. DUPLICATE DATA CHECK:');
    console.log('------------------------');

    // Check for users with multiple limit records (should be unique)
    const duplicateLimits = await prisma.$queryRaw`
      SELECT "userId", COUNT(*) as count
      FROM "UserLimit"
      GROUP BY "userId"
      HAVING COUNT(*) > 1
    `;
    console.log(`- Duplicate UserLimit records: ${(duplicateLimits as any[]).length}`);

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

    // Active users
    const activeUsers = await prisma.user.count({
      where: {
        lastLoginAt: {
          gte: thirtyDaysAgo
        }
      }
    });
    console.log(`- Active Users (last 30 days): ${activeUsers}`);

    // Check for test/development data
    console.log('\n7. TEST/DEVELOPMENT DATA:');
    console.log('-------------------------');

    const testUsers = await prisma.user.count({
      where: {
        OR: [
          { email: { contains: 'test' } },
          { email: { contains: 'demo' } },
          { username: { contains: 'test' } }
        ]
      }
    });
    console.log(`- Potential test users: ${testUsers}`);

    // 8. Index usage analysis (check for slow queries)
    console.log('\n8. QUERY PERFORMANCE INDICATORS:');
    console.log('--------------------------------');

    // Test a complex query to check performance
    const start = Date.now();
    await prisma.transaction.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      include: {
        user: true
      },
      take: 100
    });
    const queryTime = Date.now() - start;
    console.log(`- Complex query time (100 transactions with users): ${queryTime}ms`);

    // Check for N+1 pattern potential
    const usersWithTransactions = await prisma.user.findMany({
      take: 10,
      include: {
        transactions: {
          take: 5
        }
      }
    });
    console.log(`- Users with transactions loaded: ${usersWithTransactions.length}`);

  } catch (error) {
    console.error('Error analyzing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeDatabase();