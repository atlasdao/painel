const { PrismaClient } = require('../Atlas-API/node_modules/@prisma/client');

async function clearValidationTransactions() {
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: 'postgresql://atlas_user:atlas_pass123@localhost:5432/atlas_db'
            }
        }
    });

    try {
        console.log('🧹 Clearing existing validation transactions...');

        // Delete all transactions that might be validation-related
        const deletedCount = await prisma.transaction.deleteMany({
            where: {
                OR: [
                    {
                        metadata: {
                            contains: '"isValidation":true'
                        }
                    },
                    {
                        id: '352f9390-0017-4d43-b89f-685719f94d4e'
                    },
                    {
                        type: 'DEPOSIT',
                        amount: 3
                    }
                ]
            }
        });

        console.log(`✅ Deleted ${deletedCount.count} validation transactions`);

        // Also check for any transactions with the specific transaction ID
        const specificTx = await prisma.transaction.findUnique({
            where: {
                id: '352f9390-0017-4d43-b89f-685719f94d4e'
            }
        });

        if (specificTx) {
            console.log('⚠️ Found specific transaction:', specificTx);
            await prisma.transaction.delete({
                where: {
                    id: '352f9390-0017-4d43-b89f-685719f94d4e'
                }
            });
            console.log('✅ Deleted specific transaction');
        } else {
            console.log('ℹ️ No specific transaction found');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

clearValidationTransactions();