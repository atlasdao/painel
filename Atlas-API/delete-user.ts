import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteUser() {
  try {
    const email = 'Leodanielli@hotmail.com';

    console.log(`\nSearching for user: ${email}...`);

    // Find the user first
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        transactions: true,
        paymentLinks: true,
        apiKeyRequests: true,
        withdrawalRequests: true,
        commerceApplication: true,
        donations: true,
        userLevel: true,
        limits: true,
        reputation: true,
        incidents: true,
        incidentUpdates: true,
        auditLogs: true,
        couponUsages: true,
        levelHistory: true,
      }
    });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return;
    }

    console.log(`\n✅ User found:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Created: ${user.createdAt}`);
    console.log(`\n📊 Related data:`);
    console.log(`   Transactions: ${user.transactions.length}`);
    console.log(`   Payment Links: ${user.paymentLinks.length}`);
    console.log(`   API Key Requests: ${user.apiKeyRequests.length}`);
    console.log(`   Withdrawal Requests: ${user.withdrawalRequests.length}`);
    console.log(`   Commerce Application: ${user.commerceApplication ? 'Yes' : 'No'}`);
    console.log(`   Donations: ${user.donations.length}`);
    console.log(`   Audit Logs: ${user.auditLogs.length}`);

    console.log(`\n⚠️  Deleting user and all related data...`);

    // Delete related data manually in correct order
    console.log('   Deleting webhook events...');
    const webhookEvents = await prisma.webhookEvent.deleteMany({
      where: {
        transaction: {
          userId: user.id
        }
      }
    });
    console.log(`   ✓ Deleted ${webhookEvents.count} webhook events`);

    console.log('   Deleting audit logs...');
    const auditLogs = await prisma.auditLog.deleteMany({
      where: { userId: user.id }
    });
    console.log(`   ✓ Deleted ${auditLogs.count} audit logs`);

    console.log('   Deleting transactions...');
    const transactions = await prisma.transaction.deleteMany({
      where: { userId: user.id }
    });
    console.log(`   ✓ Deleted ${transactions.count} transactions`);

    console.log('   Deleting payment links...');
    const paymentLinks = await prisma.paymentLink.deleteMany({
      where: { userId: user.id }
    });
    console.log(`   ✓ Deleted ${paymentLinks.count} payment links`);

    console.log('   Deleting API key usage logs...');
    const apiKeyUsageLogs = await prisma.apiKeyUsageLog.deleteMany({
      where: {
        apiKeyRequest: {
          userId: user.id
        }
      }
    });
    console.log(`   ✓ Deleted ${apiKeyUsageLogs.count} API key usage logs`);

    console.log('   Deleting API key requests...');
    const apiKeyRequests = await prisma.apiKeyRequest.deleteMany({
      where: { userId: user.id }
    });
    console.log(`   ✓ Deleted ${apiKeyRequests.count} API key requests`);

    console.log('   Deleting coupon usages...');
    const couponUsages = await prisma.couponUsage.deleteMany({
      where: { userId: user.id }
    });
    console.log(`   ✓ Deleted ${couponUsages.count} coupon usages`);

    console.log('   Deleting withdrawal requests...');
    const withdrawalRequests = await prisma.withdrawalRequest.deleteMany({
      where: { userId: user.id }
    });
    console.log(`   ✓ Deleted ${withdrawalRequests.count} withdrawal requests`);

    console.log('   Deleting donations...');
    const donations = await prisma.donation.deleteMany({
      where: { userId: user.id }
    });
    console.log(`   ✓ Deleted ${donations.count} donations`);

    console.log('   Deleting level history...');
    const levelHistory = await prisma.levelHistory.deleteMany({
      where: { userId: user.id }
    });
    console.log(`   ✓ Deleted ${levelHistory.count} level history records`);

    console.log('   Deleting incident updates...');
    const incidentUpdates = await prisma.incidentUpdate.deleteMany({
      where: { createdBy: user.id }
    });
    console.log(`   ✓ Deleted ${incidentUpdates.count} incident updates`);

    console.log('   Deleting incidents...');
    const incidents = await prisma.incident.deleteMany({
      where: { createdBy: user.id }
    });
    console.log(`   ✓ Deleted ${incidents.count} incidents`);

    console.log('   Deleting commerce application...');
    if (user.commerceApplication) {
      await prisma.commerceApplication.delete({
        where: { userId: user.id }
      });
      console.log(`   ✓ Deleted commerce application`);
    }

    console.log('   Deleting user level...');
    if (user.userLevel) {
      await prisma.userLevel.delete({
        where: { userId: user.id }
      });
      console.log(`   ✓ Deleted user level`);
    }

    console.log('   Deleting user limits...');
    if (user.limits) {
      await prisma.userLimit.delete({
        where: { userId: user.id }
      });
      console.log(`   ✓ Deleted user limits`);
    }

    console.log('   Deleting user reputation...');
    if (user.reputation) {
      await prisma.userReputation.delete({
        where: { userId: user.id }
      });
      console.log(`   ✓ Deleted user reputation`);
    }

    console.log('   Deleting user account...');
    await prisma.user.delete({
      where: { id: user.id }
    });
    console.log(`   ✓ Deleted user account`);

    console.log(`\n✅ User ${email} and all related data have been successfully deleted!`);

  } catch (error) {
    console.error('❌ Error deleting user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteUser();
