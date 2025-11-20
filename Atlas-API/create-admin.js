const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'admin@atlas.com' },
          { role: 'ADMIN' }
        ]
      }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists:');
      console.log(`📧 Email: ${existingAdmin.email}`);
      console.log(`🔑 Password: admin123`);
      console.log(`👤 Username: ${existingAdmin.username}`);
      console.log(`🎯 Role: ${existingAdmin.role}`);
      return;
    }

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@atlas.com',
        username: 'admin',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        isAccountValidated: true,
        validatedAt: new Date(),
        commerceMode: true,
        commerceModeActivatedAt: new Date(),
        paymentLinksEnabled: true,
        apiDailyLimit: 100000,
        apiMonthlyLimit: 1000000,
      }
    });

    // Create user limits
    await prisma.userLimit.create({
      data: {
        userId: adminUser.id,
        dailyDepositLimit: 100000,
        dailyWithdrawLimit: 100000,
        dailyTransferLimit: 100000,
        maxDepositPerTx: 50000,
        maxWithdrawPerTx: 50000,
        maxTransferPerTx: 50000,
        monthlyDepositLimit: 1000000,
        monthlyWithdrawLimit: 1000000,
        monthlyTransferLimit: 1000000,
        isFirstDay: false,
        isKycVerified: true,
        isHighRiskUser: false,
      }
    });

    // Create user level
    await prisma.userLevel.create({
      data: {
        userId: adminUser.id,
        level: 10,
        dailyLimitBrl: 100000,
        dailyUsedBrl: 0,
        totalVolumeBrl: 0,
        completedTransactions: 0,
        syncedFromBot: false,
      }
    });

    // Create user reputation
    await prisma.userReputation.create({
      data: {
        userId: adminUser.id,
        totalApprovedVolume: 0,
        totalApprovedCount: 0,
        totalRejectedCount: 0,
        reputationScore: 100,
        currentDailyLimit: 100000,
        nextLimitThreshold: 1000000,
        limitTier: 10,
      }
    });

    console.log('🎉 Admin user created successfully!');
    console.log('');
    console.log('📋 LOGIN CREDENTIALS:');
    console.log('📧 Email: admin@atlas.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Username: admin');
    console.log('🎯 Role: ADMIN');
    console.log('');
    console.log('✅ Account Features:');
    console.log('• Fully validated account');
    console.log('• Commerce mode enabled');
    console.log('• Payment links enabled');
    console.log('• High API limits');
    console.log('• KYC verified');
    console.log('• Level 10 user');
    console.log('');
    console.log('🌐 Login URL: http://localhost:11337/login');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();