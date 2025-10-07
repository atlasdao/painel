const { PrismaClient } = require('../Atlas-API/node_modules/@prisma/client');

async function getTestUser() {
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: 'postgresql://atlas_user:atlas_pass123@localhost:5432/atlas_db'
            }
        }
    });

    try {
        console.log('🔍 Finding test user...');

        // Find a user (preferably admin)
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                isAccountValidated: true
            },
            take: 5
        });

        console.log('👥 Available users:');
        users.forEach(user => {
            console.log(`  - ${user.username} (${user.email}) - Role: ${user.role} - Validated: ${user.isAccountValidated}`);
        });

        if (users.length > 0) {
            const adminUser = users.find(u => u.role === 'ADMIN') || users[0];
            console.log(`\n✅ Selected user for testing: ${adminUser.username} (${adminUser.id})`);
            return adminUser;
        } else {
            console.log('❌ No users found');
            return null;
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

getTestUser();