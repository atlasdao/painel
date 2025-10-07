import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  // Use environment variables for admin credentials
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@atlas.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminHashedPassword = await bcrypt.hash(adminPassword, 10);

  // Check if admin user exists by email first
  let adminUser = await prisma.user.findFirst({
    where: { 
      OR: [
        { email: adminEmail },
        { username: 'admin' }
      ]
    }
  });

  if (adminUser) {
    // Update existing admin
    adminUser = await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        email: adminEmail,
        username: 'admin',
        password: adminHashedPassword,
        role: 'ADMIN',
      },
    });
  } else {
    // Create new admin
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        username: 'admin',
        password: adminHashedPassword,
        role: 'ADMIN',
      },
    });
  }

  // Create a test user
  const testUserPassword = await bcrypt.hash('user123', 10);
  const testUser = await prisma.user.upsert({
    where: { email: 'user@atlas.com' },
    update: {},
    create: {
      email: 'user@atlas.com',
      username: 'testuser',
      password: testUserPassword,
      role: 'USER',
    },
  });

  // Seed level configuration data (from bot system)
  const levelConfigs = [
    { level: 0, name: 'Não verificado', dailyLimitBrl: 0, maxPerTransactionBrl: null, minTransactionsForUpgrade: 0, minVolumeForUpgrade: 0, description: 'Usuário não verificado' },
    { level: 1, name: 'Iniciante', dailyLimitBrl: 50, maxPerTransactionBrl: null, minTransactionsForUpgrade: 5, minVolumeForUpgrade: 100, description: 'Nível inicial após verificação' },
    { level: 2, name: 'Bronze I', dailyLimitBrl: 100, maxPerTransactionBrl: null, minTransactionsForUpgrade: 10, minVolumeForUpgrade: 300, description: 'Usuário Bronze nível 1' },
    { level: 3, name: 'Bronze II', dailyLimitBrl: 200, maxPerTransactionBrl: null, minTransactionsForUpgrade: 20, minVolumeForUpgrade: 800, description: 'Usuário Bronze nível 2' },
    { level: 4, name: 'Prata I', dailyLimitBrl: 350, maxPerTransactionBrl: null, minTransactionsForUpgrade: 35, minVolumeForUpgrade: 1500, description: 'Usuário Prata nível 1' },
    { level: 5, name: 'Prata II', dailyLimitBrl: 500, maxPerTransactionBrl: null, minTransactionsForUpgrade: 50, minVolumeForUpgrade: 2500, description: 'Usuário Prata nível 2' },
    { level: 6, name: 'Ouro I', dailyLimitBrl: 750, maxPerTransactionBrl: null, minTransactionsForUpgrade: 75, minVolumeForUpgrade: 4000, description: 'Usuário Ouro nível 1' },
    { level: 7, name: 'Ouro II', dailyLimitBrl: 1000, maxPerTransactionBrl: null, minTransactionsForUpgrade: 100, minVolumeForUpgrade: 6000, description: 'Usuário Ouro nível 2' },
    { level: 8, name: 'Platina I', dailyLimitBrl: 1500, maxPerTransactionBrl: null, minTransactionsForUpgrade: 150, minVolumeForUpgrade: 10000, description: 'Usuário Platina nível 1' },
    { level: 9, name: 'Platina II', dailyLimitBrl: 2000, maxPerTransactionBrl: null, minTransactionsForUpgrade: 200, minVolumeForUpgrade: 15000, description: 'Usuário Platina nível 2' },
    { level: 10, name: 'Diamante', dailyLimitBrl: 5000, maxPerTransactionBrl: 1000, minTransactionsForUpgrade: 300, minVolumeForUpgrade: 25000, description: 'Nível máximo Diamante' },
  ];

  console.log('Seeding level configurations...');
  for (const config of levelConfigs) {
    await prisma.levelConfig.upsert({
      where: { level: config.level },
      update: {
        name: config.name,
        dailyLimitBrl: config.dailyLimitBrl,
        maxPerTransactionBrl: config.maxPerTransactionBrl,
        minTransactionsForUpgrade: config.minTransactionsForUpgrade,
        minVolumeForUpgrade: config.minVolumeForUpgrade,
        description: config.description,
      },
      create: {
        level: config.level,
        name: config.name,
        dailyLimitBrl: config.dailyLimitBrl,
        maxPerTransactionBrl: config.maxPerTransactionBrl,
        minTransactionsForUpgrade: config.minTransactionsForUpgrade,
        minVolumeForUpgrade: config.minVolumeForUpgrade,
        description: config.description,
      },
    });
  }

  // Create initial user levels for existing users
  console.log('Creating initial user levels...');

  // Admin starts at level 10 (full access)
  await prisma.userLevel.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      level: 10,
      dailyLimitBrl: 5000,
      botExternalId: adminUser.verifiedTaxNumber,
    },
  });

  // Test user starts at level 0
  await prisma.userLevel.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      level: 0,
      dailyLimitBrl: 0,
      botExternalId: testUser.verifiedTaxNumber,
    },
  });

  console.log('Seed completed:');
  console.log('- Admin user created:', adminUser);
  console.log('- Test user created:', testUser);
  console.log('- Level configurations seeded: 11 levels (0-10)');
  console.log('- User levels initialized');
  console.log('\nCredentials:');
  console.log(`Admin - Email: ${adminEmail}, Password: ${adminPassword}`);
  console.log('User - Email: user@atlas.com, Password: user123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });