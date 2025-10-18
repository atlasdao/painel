const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTestUsers() {
  try {
    console.log('👥 Creating 50 test users directly in database...');

    const users = [];

    for (let i = 1; i <= 50; i++) {
      const username = `testuser${i.toString().padStart(3, '0')}`;
      const email = `testuser${i.toString().padStart(3, '0')}@example.com`;
      const hashedPassword = await bcrypt.hash('Password123!', 10);

      users.push({
        username,
        email,
        password: hashedPassword,
        role: 'USER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Use createMany for bulk insert, with skipDuplicates to avoid conflicts
    const result = await prisma.user.createMany({
      data: users,
      skipDuplicates: true,
    });

    console.log(`✅ Created ${result.count} new users in database`);

    // Get total user count
    const totalUsers = await prisma.user.count();
    console.log(`📊 Total users in database: ${totalUsers}`);

    console.log('\n🔗 You can now test pagination at:');
    console.log('   - Users: http://localhost:11337/admin/users');
    console.log('   - Transactions: http://localhost:11337/admin/transactions');

  } catch (error) {
    console.error('💥 Error creating users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();