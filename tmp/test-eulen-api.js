const axios = require('axios');

async function testEulenAPI() {
    console.log('🔍 Testing Eulen API connectivity...');

    const baseURL = 'https://depix.eulen.app/api';
    console.log(`📍 Base URL: ${baseURL}`);

    try {
        // Test 1: Basic connectivity (ping endpoint)
        console.log('\n🏓 Testing ping endpoint...');
        const pingResponse = await axios.get(`${baseURL}/ping`, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'X-Async': 'auto',
                'X-Nonce': 'test-nonce-12345'
            }
        });

        console.log('✅ Ping successful!');
        console.log(`📊 Status: ${pingResponse.status}`);
        console.log(`📦 Response: ${JSON.stringify(pingResponse.data, null, 2)}`);

    } catch (error) {
        console.log('❌ Ping failed!');
        console.log(`📊 Status: ${error.response?.status || 'No response'}`);
        console.log(`🔍 Error: ${error.message}`);

        if (error.response?.data) {
            console.log(`📦 Error Response: ${JSON.stringify(error.response.data, null, 2)}`);
        }

        if (error.code) {
            console.log(`🔧 Error Code: ${error.code}`);
        }
    }

    try {
        // Test 2: Deposit endpoint with dummy data (should fail with auth error)
        console.log('\n💰 Testing deposit endpoint (without auth)...');
        const depositResponse = await axios.post(`${baseURL}/deposit`, {
            amountInCents: 1000,
            depixAddress: 'VJLTest123456789'
        }, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'X-Async': 'auto',
                'X-Nonce': 'test-nonce-67890'
            }
        });

        console.log('✅ Deposit request successful! (unexpected)');
        console.log(`📊 Status: ${depositResponse.status}`);
        console.log(`📦 Response: ${JSON.stringify(depositResponse.data, null, 2)}`);

    } catch (error) {
        console.log('❌ Deposit request failed (expected without auth)');
        console.log(`📊 Status: ${error.response?.status || 'No response'}`);
        console.log(`🔍 Error: ${error.message}`);

        if (error.response?.status === 401) {
            console.log('🔑 401 Unauthorized - API requires authentication token');
        } else if (error.response?.status === 403) {
            console.log('🚫 403 Forbidden - API access denied');
        } else if (error.response?.status >= 500) {
            console.log('🛠️ Server error - API may be down or experiencing issues');
        }

        if (error.response?.data) {
            console.log(`📦 Error Response: ${JSON.stringify(error.response.data, null, 2)}`);
        }
    }
}

testEulenAPI().catch(console.error);