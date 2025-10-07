const http = require('http');

// Test credentials (admin user)
const testCredentials = {
    emailOrUsername: 'admin',
    password: 'admin123' // Default admin password
};

const testDepixAddress = 'lq1qqfa6l5qyqypc34uw8lrg89c4e87wh4vz7lnvlcj6uhrxhj3uql6xdtnzjv8dphgdp9u57t0arl0npdl7x7p2xvccz8uq08q6xf';

async function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => {
                responseBody += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseBody);
                    resolve({ status: res.statusCode, headers: res.headers, data: parsed });
                } catch (error) {
                    resolve({ status: res.statusCode, headers: res.headers, data: responseBody });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testValidationPayment() {
    console.log('🧪 COMPREHENSIVE VALIDATION PAYMENT TEST');
    console.log('=====================================');

    try {
        // Step 1: Login to get authentication token
        console.log('\n📝 Step 1: Logging in...');
        const loginOptions = {
            hostname: 'localhost',
            port: 19997,
            path: '/api/v1/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const loginResponse = await makeRequest(loginOptions, testCredentials);
        console.log(`📊 Login Status: ${loginResponse.status}`);

        if (loginResponse.status !== 200) {
            console.log('❌ Login failed:', loginResponse.data);
            return;
        }

        const accessToken = loginResponse.data.accessToken;
        console.log('✅ Login successful, got access token');

        // Step 2: Test validation payment endpoint
        console.log('\n📝 Step 2: Testing validation payment endpoint...');
        const validationOptions = {
            hostname: 'localhost',
            port: 19997,
            path: '/api/v1/account-validation/create-payment',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        };

        const validationResponse = await makeRequest(validationOptions, {
            depixAddress: testDepixAddress
        });

        console.log(`📊 Validation Payment Status: ${validationResponse.status}`);
        console.log('\n📦 Response Body:');
        console.log(JSON.stringify(validationResponse.data, null, 2));

        if (validationResponse.status === 200 || validationResponse.status === 201) {
            console.log('\n✅ SUCCESS: Validation payment endpoint responded correctly');

            if (validationResponse.data.qrCode) {
                const qrCode = validationResponse.data.qrCode;
                console.log(`🎯 QR Code Type: ${typeof qrCode}`);
                console.log(`🎯 QR Code Length: ${qrCode.length}`);
                console.log(`🎯 QR Code Preview: ${qrCode.substring(0, 50)}...`);

                // Check if it's a real DePix QR code or mock
                if (qrCode.includes('00020101021226') && qrCode.includes('BR.GOV.BCB.PIX')) {
                    console.log('✅ REAL PIX QR CODE DETECTED');
                    console.log('✅ NO MOCK FALLBACK USED');
                } else if (qrCode.includes('mock') || qrCode.includes('dev-') || qrCode.includes('test')) {
                    console.log('⚠️ MOCK QR CODE DETECTED - This indicates fallback is still active');
                } else {
                    console.log('❓ UNKNOWN QR CODE FORMAT');
                }

                if (validationResponse.data.transactionId) {
                    console.log(`🔑 Transaction ID: ${validationResponse.data.transactionId}`);
                }

                if (validationResponse.data.amount) {
                    console.log(`💰 Amount: R$ ${validationResponse.data.amount}`);
                }
            } else {
                console.log('❌ NO QR CODE IN RESPONSE');
            }
        } else {
            console.log('❌ FAILED: Validation payment endpoint failed');
            console.log('Error details:', validationResponse.data);
        }

    } catch (error) {
        console.error('❌ Test Error:', error.message);
    }
}

testValidationPayment();
