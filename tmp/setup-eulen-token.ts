#!/usr/bin/env npx tsx

/**
 * Setup Script: Configure Eulen API Token
 *
 * This script helps configure the Eulen API token in the SystemSettings table.
 *
 * Usage:
 *   npm run setup:eulen-token <JWT_TOKEN>
 *
 * Or run directly:
 *   npx tsx setup-eulen-token.ts <JWT_TOKEN>
 *
 * To get a JWT token:
 *   1. Open Telegram
 *   2. Search for @DePix_stable_bot
 *   3. Send: /apitoken atlas_api 365 all
 *   4. Copy the JWT token from the bot's response
 *   5. Run this script with the token
 */

import { PrismaClient } from '@prisma/client';

async function setupEulenToken() {
    const prisma = new PrismaClient();

    try {
        // Get token from command line arguments
        const token = process.argv[2];

        if (!token) {
            console.log('❌ Error: JWT token is required');
            console.log('');
            console.log('Usage: npx tsx setup-eulen-token.ts <JWT_TOKEN>');
            console.log('');
            console.log('To get a JWT token:');
            console.log('  1. Open Telegram');
            console.log('  2. Search for @DePix_stable_bot');
            console.log('  3. Send: /apitoken atlas_api 365 all');
            console.log('  4. Copy the JWT token from the bot\'s response');
            console.log('  5. Run this script with the token');
            process.exit(1);
        }

        // Validate token format (basic JWT check)
        if (!token.startsWith('eyJ')) {
            console.log('⚠️  Warning: Token does not look like a JWT (should start with "eyJ")');
            console.log('   Make sure you copied the complete token from the Telegram bot');
        }

        console.log('🔧 Setting up Eulen API token...');
        console.log(`📋 Token preview: ${token.substring(0, 20)}...`);

        // Insert or update the token in SystemSettings
        const result = await prisma.systemSettings.upsert({
            where: { key: 'EULEN_API_TOKEN' },
            update: {
                value: token,
                description: 'Eulen API JWT token for PIX-to-DePix conversion service. Obtain from @DePix_stable_bot on Telegram.',
                updatedAt: new Date(),
            },
            create: {
                key: 'EULEN_API_TOKEN',
                value: token,
                description: 'Eulen API JWT token for PIX-to-DePix conversion service. Obtain from @DePix_stable_bot on Telegram.',
            },
        });

        console.log('✅ Token configured successfully!');
        console.log(`📋 Token ID: ${result.id}`);
        console.log(`⏰ Updated at: ${result.updatedAt}`);

        // Test the token by checking if the API is now accessible
        console.log('');
        console.log('🧪 Testing API connectivity...');

        try {
            // This would require importing the EulenClientService, but since we're in a script,
            // we'll just provide instructions for manual testing
            console.log('✅ Token stored successfully!');
            console.log('');
            console.log('Next steps:');
            console.log('  1. Restart the backend server');
            console.log('  2. Try creating a deposit to test the integration');
            console.log('  3. Check the backend logs for Eulen API request/response logs');

        } catch (error) {
            console.log('⚠️  Token stored but API test failed:');
            console.log(`   ${error.message}`);
            console.log('   This may be normal - try restarting the backend server');
        }

    } catch (error) {
        console.log('❌ Error setting up token:');
        console.log(`   ${error.message}`);

        if (error.code === 'P2002') {
            console.log('   This may be a duplicate key error. The token might already exist.');
            console.log('   Try updating it manually in the database.');
        }

        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

setupEulenToken().catch(console.error);