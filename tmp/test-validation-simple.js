const http = require('http');

// Test credentials (admin user)
const testCredentials = {
    emailOrUsername: 'admin',
    password: 'admin123'
};

const testDepixAddress = 'invalid_depix_address_test';

function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => {
                responseBody += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseBody);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (error) {
                    resolve({ status: res.statusCode, data: responseBody });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function test() {
    console.log('Testing validation payment...');

    try {
        // Step 1: Login
        console.log('1. Logging in...');
        const loginOptions = {
            hostname: 'localhost',
            port: 19997,
            path: '/api/v1/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };

        const loginResponse = await makeRequest(loginOptions, testCredentials);
        console.log('Login status:', loginResponse.status);

        if (loginResponse.status !== 200) {
            console.log('Login failed:', loginResponse.data);
            return;
        }

        const accessToken = loginResponse.data.accessToken;
        console.log('✅ Login successful');

        // Step 2: Test validation payment
        console.log('2. Creating validation payment...');
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

        console.log('Validation payment status:', validationResponse.status);
        console.log('Response:', JSON.stringify(validationResponse.data, null, 2));

        if (validationResponse.status === 200 && validationResponse.data.qrCode) {
            const qrCode = validationResponse.data.qrCode;
            console.log('QR Code length:', qrCode.length);
            console.log('QR Code preview:', qrCode.substring(0, 50) + '...');

            if (qrCode.includes('00020101021226') && qrCode.includes('BR.GOV.BCB.PIX')) {
                console.log('✅ REAL PIX QR CODE - SUCCESS!');
            } else {
                console.log('⚠️ Mock or invalid QR code');
            }
        }

    } catch (error) {
        console.error('Test error:', error.message);
    }
}

test();