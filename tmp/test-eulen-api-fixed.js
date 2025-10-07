const axios = require('axios');

// Generate UUID v4 without external dependency
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function testEulenAPI() {
    console.log('🔍 Testing Eulen API connectivity with proper UUIDs...');

    const baseURL = 'https://depix.eulen.app/api';
    console.log(`📍 Base URL: ${baseURL}`);

    try {
        // Test 1: Basic connectivity (ping endpoint) with proper UUID nonce
        console.log('\n🏓 Testing ping endpoint...');
        const pingNonce = uuidv4();
        console.log(`🎲 Generated nonce: ${pingNonce}`);

        const pingResponse = await axios.get(`${baseURL}/ping`, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'X-Async': 'auto',
                'X-Nonce': pingNonce
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
        // Test 2: Deposit endpoint with dummy data and proper UUID (should fail with auth error)
        console.log('\n💰 Testing deposit endpoint (without auth)...');
        const depositNonce = uuidv4();
        console.log(`🎲 Generated nonce: ${depositNonce}`);

        const depositResponse = await axios.post(`${baseURL}/deposit`, {
            amountInCents: 1000,
            depixAddress: 'VJLTest123456789'
        }, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'X-Async': 'auto',
                'X-Nonce': depositNonce
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

    // Test 3: Check what happens with the current NestJS nonce generation algorithm
    console.log('\n🔧 Testing NestJS nonce generation algorithm...');
    function generateNonce() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    const nestjsNonce = generateNonce();
    console.log(`🎲 NestJS-style nonce: ${nestjsNonce}`);
    console.log(`✅ Looks like a valid UUID: ${/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(nestjsNonce)}`);

    try {
        console.log('\n💰 Testing deposit with NestJS-style nonce...');
        const depositResponse = await axios.post(`${baseURL}/deposit`, {
            amountInCents: 1000,
            depixAddress: 'VJLTest123456789'
        }, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'X-Async': 'auto',
                'X-Nonce': nestjsNonce
            }
        });

        console.log('✅ Deposit with NestJS nonce successful!');
        console.log(`📦 Response: ${JSON.stringify(depositResponse.data, null, 2)}`);

    } catch (error) {
        console.log('❌ Deposit with NestJS nonce failed');
        console.log(`📊 Status: ${error.response?.status || 'No response'}`);

        if (error.response?.data) {
            console.log(`📦 Error Response: ${JSON.stringify(error.response.data, null, 2)}`);
        }
    }
}

testEulenAPI().catch(console.error);