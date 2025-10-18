const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function checkAndCreateAdmin() {
  try {
    console.log('🔍 Checking for existing admin users...');

    // Check for existing admin users
    const adminUsers = await prisma.user.findMany({
      where: {
        role: 'ADMIN'
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true
      }
    });

    if (adminUsers.length > 0) {
      console.log('✅ Found existing admin users:');
      adminUsers.forEach(user => {
        console.log(`   - ${user.username} (${user.email}) - ${user.isActive ? 'Active' : 'Inactive'}`);
      });

      console.log('\n📝 To access admin panel, you can use any of these credentials:');
      console.log('   Email/Username: [one of the above]');
      console.log('   Password: [your existing password]');

    } else {
      console.log('❌ No admin users found. Creating default admin user...');

      const hashedPassword = await bcrypt.hash('admin123', 10);

      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@atlas.com.br',
          username: 'admin',
          password: hashedPassword,
          role: 'ADMIN',
          isActive: true,
          isAccountValidated: true
        }
      });

      console.log('✅ Admin user created successfully!');
      console.log('\n🔑 Admin Credentials:');
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Username: ${adminUser.username}`);
      console.log('   Password: admin123');
      console.log('\n⚠️  Please change the password after first login!');
    }

    console.log('\n🌐 Login at: http://localhost:11337/login');
    console.log('📊 API endpoints available at: http://localhost:19997/api/v1/admin/system/incidents');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCreateAdmin();