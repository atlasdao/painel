const { PrismaClient } = require('../Atlas-API/node_modules/@prisma/client');

async function checkEulenToken() {
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: 'postgresql://atlas_user:atlas_pass123@localhost:5432/atlas_db'
            }
        }
    });

    try {
        console.log('🔍 Checking for EULEN_API_TOKEN in SystemSettings...');

        const tokenSetting = await prisma.systemSettings.findUnique({
            where: { key: 'EULEN_API_TOKEN' }
        });

        if (tokenSetting) {
            console.log('✅ EULEN_API_TOKEN found in database');
            console.log(`Token length: ${tokenSetting.value.length}`);
            console.log(`Token preview: ${tokenSetting.value.substring(0, 50)}...`);
        } else {
            console.log('❌ EULEN_API_TOKEN NOT found in database');
            console.log('Need to insert token from .env file');
        }

        // Check all system settings
        console.log('\n📋 All SystemSettings:');
        const allSettings = await prisma.systemSettings.findMany();
        console.log(allSettings.map(s => ({ key: s.key, valueLength: s.value?.length || 0 })));

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkEulenToken();