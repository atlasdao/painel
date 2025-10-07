const axios = require('axios');

async function createTestUser() {
    console.log('🔧 Creating test user for debugging...');

    try {
        // Try to register a new user
        const registerResponse = await axios.post('http://localhost:19997/api/v1/auth/register', {
            email: 'test@test.com',
            username: 'testuser',
            password: 'password123',
        });

        console.log('✅ Test user created successfully!');
        console.log(`📧 Email: test@test.com`);
        console.log(`👤 Username: testuser`);
        console.log(`🔑 Password: password123`);

        // Now try to login
        const loginResponse = await axios.post('http://localhost:19997/api/v1/auth/login', {
            emailOrUsername: 'test@test.com',
            password: 'password123',
        });

        if (loginResponse.data.accessToken) {
            console.log('✅ Login successful!');
            console.log(`🔑 Token: ${loginResponse.data.accessToken.substring(0, 20)}...`);
            return loginResponse.data.accessToken;
        }

    } catch (error) {
        if (error.response?.status === 409) {
            console.log('ℹ️  User already exists, trying to login...');

            // Try to login with existing user
            try {
                const loginResponse = await axios.post('http://localhost:19997/api/v1/auth/login', {
                    emailOrUsername: 'test@test.com',
                    password: 'password123',
                });

                if (loginResponse.data.accessToken) {
                    console.log('✅ Login successful with existing user!');
                    console.log(`🔑 Token: ${loginResponse.data.accessToken.substring(0, 20)}...`);
                    return loginResponse.data.accessToken;
                }
            } catch (loginError) {
                console.log('❌ Login failed with existing user');
                console.log(`   Error: ${loginError.response?.data?.message || loginError.message}`);
            }
        } else {
            console.log('❌ Registration failed:');
            console.log(`   Status: ${error.response?.status || 'No response'}`);
            console.log(`   Error: ${error.response?.data?.message || error.message}`);
        }
    }

    return null;
}

async function testDepositWithToken(token) {
    if (!token) {
        console.log('⚠️  No token available, skipping deposit test');
        return;
    }

    console.log('');
    console.log('🧪 Testing deposit creation...');

    try {
        const depositResponse = await axios.post('http://localhost:19997/api/v1/pix/generate-qr', {
            amount: 10.00,
            depixAddress: 'VJLTest123456789abcdefghijklmnop',
            description: 'Test deposit for error handling'
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        console.log('✅ Deposit creation successful!');
        console.log(`📋 Transaction ID: ${depositResponse.data.transactionId}`);

    } catch (error) {
        console.log('❌ Deposit creation failed (expected):');
        console.log(`   Status: ${error.response?.status || 'No response'}`);
        console.log(`   Error: ${error.response?.data?.message || error.message}`);

        // Check if our improved error message is present
        const errorMessage = error.response?.data?.message || '';
        if (errorMessage.includes('Entre em contato com o suporte')) {
            console.log('✅ SUCCESS: Improved error message is working!');
            console.log('   Users will now see a clear message in Portuguese');
        } else if (errorMessage.includes('service unavailable')) {
            console.log('⚠️  Generic error message still showing');
        } else {
            console.log('🤔 Different error than expected');
        }

        console.log('');
        console.log('📦 Full Error Response:');
        console.log(JSON.stringify(error.response?.data || error.message, null, 2));
    }
}

async function main() {
    const token = await createTestUser();
    await testDepositWithToken(token);
}

main().catch(console.error);