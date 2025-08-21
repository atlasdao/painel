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

  console.log('Seed completed:');
  console.log('- Admin user created:', adminUser);
  console.log('- Test user created:', testUser);
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