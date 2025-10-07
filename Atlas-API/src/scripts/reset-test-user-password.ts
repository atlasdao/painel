import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function resetTestUserPassword() {
  try {
    console.log('🔧 Resetting password for test2fa@example.com...');

    // New password
    const newPassword = 'password123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    const updatedUser = await prisma.user.update({
      where: { email: 'test2fa@example.com' },
      data: {
        password: hashedPassword,
        twoFactorSecret: null, // Also reset 2FA to make login easier
        twoFactorEnabled: false,
      },
      select: {
        id: true,
        email: true,
        username: true,
        pixKey: true,
        pixKeyType: true,
      }
    });

    console.log('✅ Password reset successfully!');
    console.log('📧 Email:', updatedUser.email);
    console.log('👤 Username:', updatedUser.username);
    console.log('🔐 New Password: password123');
    console.log('🔑 CPF:', updatedUser.pixKey);
    console.log('📝 2FA has been disabled for easier testing');

  } catch (error) {
    console.error('❌ Error resetting password:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
resetTestUserPassword();