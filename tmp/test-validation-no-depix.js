const http = require('http');

// Test credentials (admin user)
const testCredentials = {
    emailOrUsername: 'admin',
    password: 'admin123'
};

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

async function testValidationWithoutDepix() {
    console.log('🧪 TESTING VALIDATION WITHOUT DEPIX ADDRESS');
    console.log('=============================================');

    try {
        // Step 1: Login
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
        if (loginResponse.status !== 200) {
            console.log('❌ Login failed:', loginResponse.data);
            return;
        }

        const accessToken = loginResponse.data.accessToken;
        console.log('✅ Login successful');

        // Step 2: Test validation without depixAddress (should use system default)
        console.log('\n📝 Step 2: Testing validation WITHOUT depixAddress...');
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

        // Send empty payload - depixAddress is optional
        const validationResponse = await makeRequest(validationOptions, {});

        console.log(`📊 Status: ${validationResponse.status}`);
        console.log('\n📦 Response:');
        console.log(JSON.stringify(validationResponse.data, null, 2));

        if (validationResponse.status === 200 || validationResponse.status === 201) {
            console.log('\n✅ SUCCESS: Validation payment created');

            if (validationResponse.data.qrCode) {
                const qrCode = validationResponse.data.qrCode;
                console.log(`🎯 QR Code Length: ${qrCode.length}`);
                console.log(`🎯 QR Code Preview: ${qrCode.substring(0, 100)}...`);

                // Check QR code type
                if (qrCode.includes('mock-development-qr-code')) {
                    console.log('⚠️  MOCK QR CODE DETECTED - Mock service being used');
                } else if (qrCode.includes('qrcode.fitbank.com.br')) {
                    console.log('✅ REAL DEPIX QR CODE DETECTED');
                } else if (qrCode.includes('BR.GOV.BCB.PIX')) {
                    console.log('✅ VALID PIX QR CODE FORMAT');
                } else {
                    console.log('❓ UNKNOWN QR CODE FORMAT');
                }
            }
        } else {
            console.log('❌ FAILED: Validation payment failed');
        }

    } catch (error) {
        console.error('❌ Test Error:', error.message);
    }
}

testValidationWithoutDepix();