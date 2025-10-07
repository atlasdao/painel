#!/usr/bin/env npx tsx

/**
 * Test Script: Verify Deposit Creation Works
 *
 * This script tests the end-to-end deposit creation flow to verify
 * the Eulen API integration is working properly.
 *
 * Usage:
 *   cd Atlas-API && npx tsx ../tmp/test-deposit-creation.ts
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:19997/api/v1';
const TEST_USER_EMAIL = 'admin@admin.com';
const TEST_USER_PASSWORD = 'password';

async function testDepositCreation() {
    console.log('🧪 Testing Deposit Creation End-to-End');
    console.log('=====================================');

    try {
        // Step 1: Login to get auth token
        console.log('📋 Step 1: Authenticating...');
        const loginResponse = await axios.post(`${API_BASE_URL}/../auth/login`, {
            email: TEST_USER_EMAIL,
            password: TEST_USER_PASSWORD,
        });

        const authToken = loginResponse.data.accessToken;
        console.log(`✅ Authentication successful`);
        console.log(`🔑 Token: ${authToken.substring(0, 20)}...`);

        // Step 2: Test deposit creation
        console.log('');
        console.log('📋 Step 2: Creating test deposit...');

        const depositData = {
            amount: 10.00, // R$ 10.00
            depixAddress: 'VJLTest123456789abcdefghijklmnop', // Test DePix address
            description: 'Test deposit for Eulen API integration',
        };

        const depositResponse = await axios.post(
            `${API_BASE_URL}/pix/generate-qr`,
            depositData,
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log('✅ Deposit creation successful!');
        console.log(`📋 Transaction ID: ${depositResponse.data.transactionId}`);
        console.log(`💰 Amount: R$ ${depositData.amount}`);
        console.log(`🏦 DePix Address: ${depositData.depixAddress}`);
        console.log(`📱 QR Code: ${depositResponse.data.qrCode ? 'Generated' : 'Missing'}`);

        // Step 3: Check transaction status
        console.log('');
        console.log('📋 Step 3: Checking transaction status...');

        const statusResponse = await axios.get(
            `${API_BASE_URL}/pix/status/${depositResponse.data.transactionId}`,
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                },
            }
        );

        console.log('✅ Status check successful!');
        console.log(`📊 Status: ${statusResponse.data.status}`);
        console.log(`💬 Message: ${statusResponse.data.message}`);

        console.log('');
        console.log('🎉 ALL TESTS PASSED!');
        console.log('   The Eulen API integration is working correctly.');

    } catch (error) {
        console.log('❌ Test failed:');
        console.log(`   Status: ${error.response?.status || 'No response'}`);
        console.log(`   Error: ${error.response?.data?.message || error.message}`);

        if (error.response?.status === 401) {
            console.log('');
            console.log('🔍 This appears to be an authentication issue:');
            console.log('   - Check if the backend server is running');
            console.log('   - Verify the test user credentials are correct');
            console.log('   - Make sure the user account is validated');
        } else if (error.response?.status === 503 || error.response?.status === 500) {
            console.log('');
            console.log('🔍 This appears to be a service issue:');
            console.log('   - Check if the Eulen API token is configured');
            console.log('   - Verify the backend logs for detailed error messages');
            console.log('   - Make sure the Eulen API is accessible');
        }

        if (error.response?.data) {
            console.log('');
            console.log('📦 Error Response:');
            console.log(JSON.stringify(error.response.data, null, 2));
        }

        process.exit(1);
    }
}

// Check if backend is running first
async function checkBackendHealth() {
    try {
        console.log('🏥 Checking backend health...');
        await axios.get(`${API_BASE_URL}/../health`);
        console.log('✅ Backend is running');
        return true;
    } catch (error) {
        console.log('❌ Backend is not responding');
        console.log('   Make sure the backend server is running on port 19997');
        console.log('   Command: cd Atlas-API && PORT=19997 npm run start:dev');
        return false;
    }
}

async function main() {
    const isBackendHealthy = await checkBackendHealth();
    if (!isBackendHealthy) {
        process.exit(1);
    }

    await testDepositCreation();
}

main().catch(console.error);