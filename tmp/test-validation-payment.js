const http = require('http');

// Mock user data for testing
const testUserId = 'cm2ej9yzd0002vq6s2sp7ypem'; // This should be an existing user ID
const testDepixAddress = 'VJL123validation456789test';

console.log('🧪 Testing Validation Payment Endpoint');
console.log('=================================');

// Test data for the validation payment
const requestData = JSON.stringify({
    depixAddress: testDepixAddress
});

const options = {
    hostname: 'localhost',
    port: 19997,
    path: '/api/v1/account-validation/create-payment',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData),
        // Add a test authorization token if needed
        // 'Authorization': 'Bearer your-test-token-here'
    },
    rejectUnauthorized: false // For localhost testing
};

const req = http.request(options, (res) => {
    console.log(`📊 Status Code: ${res.statusCode}`);
    console.log(`📋 Response Headers:`, res.headers);

    let responseBody = '';
    res.on('data', (chunk) => {
        responseBody += chunk;
    });

    res.on('end', () => {
        console.log('\n📦 Response Body:');
        try {
            const parsed = JSON.parse(responseBody);
            console.log(JSON.stringify(parsed, null, 2));

            if (res.statusCode === 200 || res.statusCode === 201) {
                console.log('\n✅ SUCCESS: Validation payment endpoint responded correctly');
                if (parsed.qrCode) {
                    console.log(`🎯 QR Code Type: ${typeof parsed.qrCode}`);
                    console.log(`🎯 QR Code Length: ${parsed.qrCode.length}`);
                    console.log(`🎯 QR Code Preview: ${parsed.qrCode.substring(0, 50)}...`);

                    // Check if it's a real DePix QR code or mock
                    if (parsed.qrCode.includes('00020101021226') && parsed.qrCode.includes('BR.GOV.BCB.PIX')) {
                        console.log('✅ REAL PIX QR CODE DETECTED');
                    } else {
                        console.log('⚠️ MOCK QR CODE DETECTED');
                    }
                }
            } else {
                console.log('❌ FAILED: Unexpected status code');
            }
        } catch (error) {
            console.log('❌ Failed to parse response as JSON:');
            console.log(responseBody);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request Error:', error.message);
    console.error('Make sure the backend server is running on port 19997');
});

console.log(`📤 Making request to: http://localhost:19997${options.path}`);
console.log(`📤 Request data:`, requestData);

req.write(requestData);
req.end();