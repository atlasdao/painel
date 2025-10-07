#!/usr/bin/env node

// Test script to verify the validation payment endpoint
console.log('Testing validation payment endpoint...');

const axios = require('axios');

// Test data
const testPayload = {
  depixAddress: 'lq1qqw4x6h2eeg9dz8gvyz7kppq0s5rjf8h4f3dvv8x7uuq3h6k5u3jhsj2rn7t8e5c7c8k3r2q9p6s5d8f7e6t4y3u2i1o0'
};

// Test authentication (you'll need to get a real token)
const authToken = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token

async function testValidationEndpoint() {
  try {
    console.log('Testing POST /api/v1/account-validation/create-payment');
    console.log('Payload:', testPayload);

    const response = await axios.post(
      'http://localhost:19997/api/v1/account-validation/create-payment',
      testPayload,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Validation endpoint response:', response.data);
    console.log('Status:', response.status);

  } catch (error) {
    console.log('❌ Validation endpoint error:');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data);
    console.log('Message:', error.message);
  }
}

async function testPIXEndpoint() {
  try {
    console.log('\nTesting POST /api/v1/pix/qrcode (for comparison)');

    const pixPayload = {
      amount: 1.00,
      depixAddress: testPayload.depixAddress,
      description: 'Test deposit',
    };

    console.log('Payload:', pixPayload);

    const response = await axios.post(
      'http://localhost:19997/api/v1/pix/qrcode',
      pixPayload,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ PIX endpoint response:', response.data);
    console.log('Status:', response.status);

  } catch (error) {
    console.log('❌ PIX endpoint error:');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data);
    console.log('Message:', error.message);
  }
}

// Run tests
async function runTests() {
  if (authToken === 'YOUR_JWT_TOKEN_HERE') {
    console.log('⚠️  Please update authToken with a real JWT token to test authenticated endpoints');
    console.log('You can get a token by logging in through the frontend and checking the browser dev tools');
    return;
  }

  await testValidationEndpoint();
  await testPIXEndpoint();
}

console.log('=== Validation Endpoint Test ===');
runTests();