const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// API Key generation utility (from api-key.util.ts)
function generateApiKey() {
  const prefix = 'atlas_';
  const keyLength = 32;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < keyLength; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return prefix + result;
}

async function generateAdminApiKey() {
  try {
    console.log('🔍 Looking for admin user...');

    // Find admin user by username
    const adminUser = await prisma.user.findFirst({
      where: {
        username: 'admin'
      }
    });

    if (!adminUser) {
      console.error('❌ Admin user not found');
      return;
    }

    console.log(`✅ Found admin user: ${adminUser.username} (${adminUser.email})`);
    console.log(`📋 User ID: ${adminUser.id}`);

    // Check if user already has an API key
    if (adminUser.apiKey) {
      console.log('⚠️  Admin user already has an API key');

      // Check existing API key requests
      const existingRequests = await prisma.apiKeyRequest.findMany({
        where: {
          userId: adminUser.id,
          status: 'APPROVED'
        }
      });

      if (existingRequests.length > 0) {
        console.log('📋 Existing API Key Request found:');
        console.log(`   API Key: ${existingRequests[0].generatedApiKey}`);
        return;
      }
    }

    // Generate a new API key
    console.log('🔑 Generating new API key...');
    const apiKey = generateApiKey();
    console.log(`📋 Generated API Key: ${apiKey}`);

    // Hash the API key before storing it in the database
    const hashedApiKey = await bcrypt.hash(apiKey, 10);

    // Update user with the hashed API key
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { apiKey: hashedApiKey }
    });

    // Create an API key request record for tracking (store the plain key for reference)
    const apiKeyRequest = await prisma.apiKeyRequest.create({
      data: {
        userId: adminUser.id,
        usageReason: 'Generated for admin testing',
        serviceUrl: 'Internal Admin Use',
        estimatedVolume: 'N/A',
        usageType: 'SINGLE_CPF',
        status: 'APPROVED',
        generatedApiKey: apiKey, // Store plain key for admin reference
        approvedAt: new Date(),
        approvedBy: 'System',
      },
    });

    console.log('✅ API key generated successfully!');
    console.log(`📋 API Key: ${apiKey}`);
    console.log(`📋 Request ID: ${apiKeyRequest.id}`);
    console.log('🎉 You can now see this API key in the /settings page!');

  } catch (error) {
    console.error('❌ Error generating API key:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateAdminApiKey();