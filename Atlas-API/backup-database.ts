import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';

const prisma = new PrismaClient();

async function createBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = '/home/cmo/backups';
    const backupFile = `${backupDir}/backup_${timestamp}_complete.json`;

    console.log('Starting database backup...');

    // Get all data from all tables
    console.log('Fetching users...');
    const users = await prisma.user.findMany({
      include: {
        apiKeyRequests: true,
        auditLogs: true,
        commerceApplication: true,
        couponUsages: true,
        donations: true,
        levelHistory: true,
        paymentLinks: true,
        transactions: true,
        userLevel: true,
        limits: true,
        reputation: true,
        withdrawalRequests: true,
        incidents: true,
        incidentUpdates: true,
      }
    });

    console.log('Fetching transactions...');
    const transactions = await prisma.transaction.findMany({
      include: {
        auditLogs: true,
        webhookEvents: true,
      }
    });

    console.log('Fetching payment links...');
    const paymentLinks = await prisma.paymentLink.findMany();

    console.log('Fetching webhooks...');
    const webhookEvents = await prisma.webhookEvent.findMany();

    console.log('Fetching API key requests...');
    const apiKeyRequests = await prisma.apiKeyRequest.findMany({
      include: {
        usageLogs: true,
      }
    });

    console.log('Fetching system settings...');
    const systemSettings = await prisma.systemSettings.findMany();

    console.log('Fetching withdrawal requests...');
    const withdrawalRequests = await prisma.withdrawalRequest.findMany({
      include: {
        couponUsages: true,
      }
    });

    console.log('Fetching commerce applications...');
    const commerceApplications = await prisma.commerceApplication.findMany();

    console.log('Fetching donations...');
    const donations = await prisma.donation.findMany();

    console.log('Fetching user levels...');
    const userLevels = await prisma.userLevel.findMany();

    console.log('Fetching level configs...');
    const levelConfigs = await prisma.levelConfig.findMany();

    console.log('Fetching discount coupons...');
    const discountCoupons = await prisma.discountCoupon.findMany({
      include: {
        usages: true,
      }
    });

    console.log('Fetching incidents...');
    const incidents = await prisma.incident.findMany({
      include: {
        updates: true,
      }
    });

    console.log('Fetching blocked email domains...');
    const blockedEmailDomains = await prisma.blockedEmailDomain.findMany();

    console.log('Fetching rate limits...');
    const rateLimits = await prisma.rateLimit.findMany();

    console.log('Fetching audit logs...');
    const auditLogs = await prisma.auditLog.findMany();

    const backup = {
      timestamp: new Date().toISOString(),
      database: 'atlas_db',
      data: {
        users,
        transactions,
        paymentLinks,
        webhookEvents,
        apiKeyRequests,
        systemSettings,
        withdrawalRequests,
        commerceApplications,
        donations,
        userLevels,
        levelConfigs,
        discountCoupons,
        incidents,
        blockedEmailDomains,
        rateLimits,
        auditLogs,
      },
      stats: {
        users: users.length,
        transactions: transactions.length,
        paymentLinks: paymentLinks.length,
        webhookEvents: webhookEvents.length,
        apiKeyRequests: apiKeyRequests.length,
        systemSettings: systemSettings.length,
        withdrawalRequests: withdrawalRequests.length,
        commerceApplications: commerceApplications.length,
        donations: donations.length,
        userLevels: userLevels.length,
        levelConfigs: levelConfigs.length,
        discountCoupons: discountCoupons.length,
        incidents: incidents.length,
        blockedEmailDomains: blockedEmailDomains.length,
        rateLimits: rateLimits.length,
        auditLogs: auditLogs.length,
      }
    };

    writeFileSync(backupFile, JSON.stringify(backup, null, 2));

    console.log('\n✅ Backup completed successfully!');
    console.log(`📁 Backup file: ${backupFile}`);
    console.log('\n📊 Backup Statistics:');
    console.log(JSON.stringify(backup.stats, null, 2));

    return backupFile;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createBackup();
