const { PrismaClient } = require('../Atlas-API/node_modules/@prisma/client');

async function checkValidationTransactions() {
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: 'postgresql://atlas_user:atlas_pass123@localhost:5432/atlas_db'
            }
        }
    });

    try {
        console.log('🔍 Checking validation transactions...');

        // Find all transactions for the admin user
        const transactions = await prisma.transaction.findMany({
            where: {
                userId: 'cm2ej9yzd0002vq6s2sp7ypem' // Admin user ID from our test
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 10
        });

        console.log(`📋 Found ${transactions.length} transactions for admin user:`);

        transactions.forEach((tx, index) => {
            const metadata = tx.metadata ? JSON.parse(tx.metadata) : {};
            console.log(`  ${index + 1}. ${tx.id}`);
            console.log(`     - Type: ${tx.type}`);
            console.log(`     - Status: ${tx.status}`);
            console.log(`     - Amount: ${tx.amount}`);
            console.log(`     - Created: ${tx.createdAt}`);
            console.log(`     - External ID: ${tx.externalId}`);
            console.log(`     - Is Validation: ${metadata.isValidation || false}`);
            console.log(`     - QR Code (preview): ${metadata.qrCode ? metadata.qrCode.substring(0, 50) + '...' : 'None'}`);
            console.log('');
        });

        // Check for specific validation transactions
        const validationTxs = await prisma.transaction.findMany({
            where: {
                userId: 'cm2ej9yzd0002vq6s2sp7ypem',
                metadata: {
                    contains: '"isValidation":true'
                }
            }
        });

        console.log(`🎯 Found ${validationTxs.length} validation transactions:`);
        validationTxs.forEach((tx) => {
            const metadata = JSON.parse(tx.metadata || '{}');
            console.log(`  - ${tx.id}: Status ${tx.status}, QR: ${metadata.qrCode ? 'YES' : 'NO'}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkValidationTransactions();