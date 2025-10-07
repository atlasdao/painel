import { PrismaClient } from '../Atlas-API/node_modules/@prisma/client/index.js';

const prisma = new PrismaClient();

async function fixDataIntegrity() {
  console.log('=== FIXING DATA INTEGRITY ISSUES ===\n');

  try {
    // 1. Create missing UserLimit records for all users
    console.log('1. CREATING MISSING USER LIMITS:');
    console.log('--------------------------------');

    const usersWithoutLimits = await prisma.user.findMany({
      where: {
        limits: null
      },
      select: {
        id: true,
        username: true,
        email: true
      }
    });

    console.log(`Found ${usersWithoutLimits.length} users without limits`);

    for (const user of usersWithoutLimits) {
      try {
        await prisma.userLimit.create({
          data: {
            userId: user.id,
            dailyDepositLimit: 500.00,
            dailyWithdrawLimit: 500.00,
            dailyTransferLimit: 500.00,
            maxDepositPerTx: 5000.00,
            maxWithdrawPerTx: 5000.00,
            maxTransferPerTx: 5000.00,
            monthlyDepositLimit: 50000.00,
            monthlyWithdrawLimit: 50000.00,
            monthlyTransferLimit: 50000.00,
            isFirstDay: false,
            isKycVerified: false,
            isHighRiskUser: false
          }
        });
        console.log(`✓ Created limits for user: ${user.username} (${user.email})`);
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`⚠ Limits already exist for user: ${user.username}`);
        } else {
          console.error(`✗ Error creating limits for ${user.username}:`, error.message);
        }
      }
    }

    // 2. Create missing UserReputation records
    console.log('\n2. CREATING MISSING USER REPUTATION:');
    console.log('------------------------------------');

    const usersWithoutReputation = await prisma.user.findMany({
      where: {
        reputation: null
      },
      select: {
        id: true,
        username: true,
        email: true
      }
    });

    console.log(`Found ${usersWithoutReputation.length} users without reputation`);

    for (const user of usersWithoutReputation) {
      try {
        await prisma.userReputation.create({
          data: {
            userId: user.id,
            totalApprovedVolume: 0,
            totalApprovedCount: 0,
            totalRejectedCount: 0,
            reputationScore: 0,
            currentDailyLimit: 6000,
            nextLimitThreshold: 50000,
            limitTier: 1
          }
        });
        console.log(`✓ Created reputation for user: ${user.username} (${user.email})`);
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`⚠ Reputation already exists for user: ${user.username}`);
        } else {
          console.error(`✗ Error creating reputation for ${user.username}:`, error.message);
        }
      }
    }

    // 3. Create missing UserLevel records for users without them
    console.log('\n3. CREATING MISSING USER LEVELS:');
    console.log('--------------------------------');

    const usersWithoutLevel = await prisma.user.findMany({
      where: {
        userLevel: null
      },
      select: {
        id: true,
        username: true,
        email: true,
        botExternalId: true
      }
    });

    console.log(`Found ${usersWithoutLevel.length} users without level`);

    for (const user of usersWithoutLevel) {
      try {
        await prisma.userLevel.create({
          data: {
            userId: user.id,
            level: 0,
            dailyLimitBrl: 0,
            dailyUsedBrl: 0,
            totalVolumeBrl: 0,
            completedTransactions: 0,
            syncedFromBot: false,
            botExternalId: user.botExternalId
          }
        });
        console.log(`✓ Created level for user: ${user.username} (${user.email})`);
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`⚠ Level already exists for user: ${user.username}`);
        } else {
          console.error(`✗ Error creating level for ${user.username}:`, error.message);
        }
      }
    }

    // 4. Clean up expired transactions
    console.log('\n4. CLEANING UP EXPIRED TRANSACTIONS:');
    console.log('------------------------------------');

    const expiredTransactions = await prisma.transaction.updateMany({
      where: {
        status: 'EXPIRED'
      },
      data: {
        status: 'CANCELLED',
        errorMessage: 'Transaction expired and was automatically cancelled'
      }
    });

    console.log(`✓ Cleaned up ${expiredTransactions.count} expired transactions`);

    // 5. Clean up old pending transactions (>30 days)
    console.log('\n5. CLEANING OLD PENDING TRANSACTIONS:');
    console.log('-------------------------------------');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldPendingTx = await prisma.transaction.updateMany({
      where: {
        status: 'PENDING',
        createdAt: {
          lt: thirtyDaysAgo
        }
      },
      data: {
        status: 'EXPIRED',
        errorMessage: 'Transaction expired after 30 days'
      }
    });

    console.log(`✓ Marked ${oldPendingTx.count} old pending transactions as expired`);

    // 6. Remove test user data (optional - requires confirmation)
    console.log('\n6. TEST DATA CLEANUP:');
    console.log('--------------------');

    const testUsers = await prisma.user.findMany({
      where: {
        OR: [
          { username: 'testuser' },
          { username: 'pixtest' }
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        _count: {
          select: {
            transactions: true,
            auditLogs: true
          }
        }
      }
    });

    console.log('Test users found:');
    for (const user of testUsers) {
      console.log(`- ${user.username} (${user.email})`);
      console.log(`  Transactions: ${user._count.transactions}`);
      console.log(`  Audit Logs: ${user._count.auditLogs}`);
    }
    console.log('\n⚠ Test users NOT deleted - manual review recommended');

    // 7. Validate all constraints
    console.log('\n7. VALIDATION SUMMARY:');
    console.log('---------------------');

    const finalStats = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        limits: true,
        reputation: true,
        userLevel: true
      }
    });

    let allGood = true;
    for (const user of finalStats) {
      const hasLimits = !!user.limits;
      const hasReputation = !!user.reputation;
      const hasLevel = !!user.userLevel;

      if (!hasLimits || !hasReputation || !hasLevel) {
        allGood = false;
        console.log(`✗ User ${user.username} missing:`, {
          limits: !hasLimits,
          reputation: !hasReputation,
          level: !hasLevel
        });
      }
    }

    if (allGood) {
      console.log('✓ All users have required relations!');
    }

    // 8. Database statistics after cleanup
    console.log('\n8. FINAL DATABASE STATISTICS:');
    console.log('-----------------------------');

    const stats = {
      users: await prisma.user.count(),
      transactions: await prisma.transaction.count(),
      completedTx: await prisma.transaction.count({ where: { status: 'COMPLETED' } }),
      pendingTx: await prisma.transaction.count({ where: { status: 'PENDING' } }),
      auditLogs: await prisma.auditLog.count(),
      userLimits: await prisma.userLimit.count(),
      userReputation: await prisma.userReputation.count(),
      userLevels: await prisma.userLevel.count()
    };

    Object.entries(stats).forEach(([key, value]) => {
      console.log(`- ${key}: ${value}`);
    });

  } catch (error) {
    console.error('Error fixing data integrity:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixDataIntegrity();