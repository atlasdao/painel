const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find users with potential issues:
  // 1. isAccountValidated=true AND commerceMode=true BUT paymentLinksEnabled=false
  // 2. isAccountValidated=true AND commerceMode=true BUT commerceModeActivatedAt=null
  
  const problematicUsers = await prisma.user.findMany({
    where: {
      isAccountValidated: true,
      commerceMode: true,
      OR: [
        { paymentLinksEnabled: false },
        { commerceModeActivatedAt: null }
      ]
    },
    select: {
      id: true,
      username: true,
      email: true,
      isAccountValidated: true,
      commerceMode: true,
      paymentLinksEnabled: true,
      commerceModeActivatedAt: true,
      validatedAt: true,
    }
  });

  console.log(`Found ${problematicUsers.length} users with potential issues:\n`);
  
  if (problematicUsers.length > 0) {
    problematicUsers.forEach(u => {
      console.log(`- ${u.username} (${u.email})`);
      console.log(`  paymentLinksEnabled: ${u.paymentLinksEnabled}`);
      console.log(`  commerceModeActivatedAt: ${u.commerceModeActivatedAt}`);
      console.log('');
    });
  }

  // Also check: users who are validated but don't have commerceMode enabled
  const validatedWithoutCommerce = await prisma.user.findMany({
    where: {
      isAccountValidated: true,
      commerceMode: false
    },
    select: {
      id: true,
      username: true,
      email: true,
      validatedAt: true,
    }
  });

  console.log(`\nUsers validated but commerceMode=false: ${validatedWithoutCommerce.length}`);
  if (validatedWithoutCommerce.length > 0 && validatedWithoutCommerce.length <= 10) {
    validatedWithoutCommerce.forEach(u => {
      console.log(`- ${u.username} (validated: ${u.validatedAt})`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
