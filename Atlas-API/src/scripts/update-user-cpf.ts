import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateUserCPF() {
  try {
    console.log('🔧 Starting CPF update for user...');

    // Find the first user without a CPF, or get the first user
    console.log(`📧 Looking for a user to update...`);

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { pixKeyType: null },
          { pixKeyType: { not: 'CPF' } },
          { pixKey: null }
        ]
      }
    });

    // If no user without CPF, get the first user
    if (!user) {
      user = await prisma.user.findFirst();
    }

    if (!user) {
      console.error('❌ User not found!');
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.username} (ID: ${user.id})`);
    console.log(`📝 Current pixKey: ${user.pixKey || 'Not set'}`);
    console.log(`📝 Current pixKeyType: ${user.pixKeyType || 'Not set'}`);

    // Update the user with the CPF
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        pixKey: '01907979590',
        pixKeyType: 'CPF'
      }
    });

    console.log('✅ User updated successfully!');
    console.log(`📝 New pixKey: ${updatedUser.pixKey}`);
    console.log(`📝 New pixKeyType: ${updatedUser.pixKeyType}`);

    // Verify the update
    const verifiedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        email: true,
        username: true,
        pixKey: true,
        pixKeyType: true
      }
    });

    console.log('\n📊 Final user data:');
    console.log(verifiedUser);

  } catch (error) {
    console.error('❌ Error updating user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateUserCPF();