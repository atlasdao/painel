import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function resetUserPassword() {
  try {
    const email = 'omegacryptox@protonmail.com';
    const newPassword = 'Crypt9835Braiin';

    console.log(`🔧 Resetting password for ${email}...`);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
      }
    });

    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`✓ User found: ${user.username} (${user.email})`);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password and clear any password reset fields
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        passwordResetCode: null,
        passwordResetExpires: null,
        passwordResetAttempts: 0,
      },
    });

    console.log('✅ Password reset successfully!');
    console.log('📧 Email:', user.email);
    console.log('👤 Username:', user.username);
    console.log('🔐 New Password: Crypt9835Braiin');

  } catch (error) {
    console.error('❌ Error resetting password:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
resetUserPassword();
