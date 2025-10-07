const { PrismaClient } = require('@prisma/client');

async function checkDatabase() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://master@localhost:5432/atlas_db'
      }
    }
  });

  try {
    console.log('Checking SystemSettings table...');

    // Check if table exists and fetch all settings
    const allSettings = await prisma.systemSettings.findMany();
    console.log('All system settings:');
    allSettings.forEach(setting => {
      console.log(`  ${setting.key}: ${setting.value} (${setting.description || 'No description'})`);
    });

    // Check specifically for EULEN_API_TOKEN
    const eulenToken = await prisma.systemSettings.findUnique({
      where: { key: 'EULEN_API_TOKEN' }
    });

    if (eulenToken) {
      console.log('\n✅ EULEN_API_TOKEN found in database');
      console.log(`Token length: ${eulenToken.value.length}`);
      console.log(`Token preview: ${eulenToken.value.substring(0, 20)}...`);
    } else {
      console.log('\n❌ EULEN_API_TOKEN NOT found in database');
      console.log('This is likely the cause of the "jwt malformed" errors');
    }

  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();