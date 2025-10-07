const { PrismaClient } = require('../Atlas-API/node_modules/@prisma/client');
const fs = require('fs');
const path = require('path');

async function fixEulenToken() {
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: 'postgresql://atlas_user:atlas_pass123@localhost:5432/atlas_db'
            }
        }
    });

    try {
        console.log('🔍 Reading EULEN_API_KEY from .env file...');

        // Read the .env file
        const envPath = path.join(__dirname, '../Atlas-API/.env');
        const envContent = fs.readFileSync(envPath, 'utf8');

        // Extract EULEN_API_KEY
        const eulenKeyMatch = envContent.match(/EULEN_API_KEY=(.+)/);
        if (!eulenKeyMatch) {
            throw new Error('EULEN_API_KEY not found in .env file');
        }

        const realToken = eulenKeyMatch[1].trim();
        console.log(`✅ Found EULEN_API_KEY in .env (length: ${realToken.length})`);
        console.log(`Token preview: ${realToken.substring(0, 50)}...`);

        // Check current token in database
        const currentSetting = await prisma.systemSettings.findUnique({
            where: { key: 'EULEN_API_TOKEN' }
        });

        if (currentSetting) {
            console.log(`📊 Current DB token: "${currentSetting.value}" (length: ${currentSetting.value.length})`);

            if (currentSetting.value === realToken) {
                console.log('✅ Database already has the correct token');
            } else {
                console.log('🔧 Updating database with correct token...');
                await prisma.systemSettings.update({
                    where: { key: 'EULEN_API_TOKEN' },
                    data: { value: realToken }
                });
                console.log('✅ Database updated successfully!');
            }
        } else {
            console.log('🔧 Creating new EULEN_API_TOKEN setting in database...');
            await prisma.systemSettings.create({
                data: {
                    key: 'EULEN_API_TOKEN',
                    value: realToken,
                    description: 'Eulen API JWT token for payment processing'
                }
            });
            console.log('✅ Database setting created successfully!');
        }

        // Verify the update
        const updatedSetting = await prisma.systemSettings.findUnique({
            where: { key: 'EULEN_API_TOKEN' }
        });

        console.log(`🔍 Verification - Final DB token length: ${updatedSetting.value.length}`);
        console.log(`🔍 Expected token length: ${realToken.length}`);
        console.log(`🎯 Match: ${updatedSetting.value === realToken ? 'YES' : 'NO'}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

fixEulenToken();
