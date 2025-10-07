#!/usr/bin/env node

/**
 * Test script for level-based QR code limits
 * This script tests the new level validation functionality
 */

const axios = require('axios');

const API_BASE = 'http://localhost:19997';

// Test configuration
const TEST_CONFIG = {
  // You'll need to replace this with a valid JWT token
  AUTH_TOKEN: 'your-jwt-token-here',
  USERID: 'test-user-id',
  // Test scenarios
  SCENARIOS: [
    { amount: 50, description: 'Small amount within limits' },
    { amount: 150, description: 'Amount exceeding level 0 limit (100)' },
    { amount: 250, description: 'Amount for level 1 user' },
    { amount: 1500, description: 'Large amount exceeding most levels' }
  ]
};

async function testLevelLimits() {
  console.log('🧪 Testing Level-Based QR Code Limits');
  console.log('=====================================\n');

  try {
    // Test 1: Get user level limits
    console.log('📊 Test 1: Getting user level limits...');
    const limitsResponse = await axios.get(`${API_BASE}/pix/level-limits`, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ User level limits:', JSON.stringify(limitsResponse.data, null, 2));
    console.log();

    // Test 2: Test QR code generation with different amounts
    for (const scenario of TEST_CONFIG.SCENARIOS) {
      console.log(`🎯 Test 2.${TEST_CONFIG.SCENARIOS.indexOf(scenario) + 1}: ${scenario.description}`);

      try {
        const qrResponse = await axios.post(`${API_BASE}/pix/qrcode`, {
          amount: scenario.amount,
          depixAddress: 'test@example.com',
          description: `Test QR - ${scenario.description}`
        }, {
          headers: {
            'Authorization': `Bearer ${TEST_CONFIG.AUTH_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });

        console.log(`✅ QR Code generated successfully for amount R$ ${scenario.amount}`);
        console.log(`   Transaction ID: ${qrResponse.data.transactionId}`);
      } catch (error) {
        if (error.response) {
          console.log(`❌ QR Code generation failed for amount R$ ${scenario.amount}`);
          console.log(`   Error: ${error.response.data.message || error.response.data.error?.message}`);
          console.log(`   Status: ${error.response.status}`);
        } else {
          console.log(`❌ Network error: ${error.message}`);
        }
      }
      console.log();
    }

    // Test 3: Check daily usage after tests
    console.log('📈 Test 3: Checking updated daily usage...');
    const updatedLimitsResponse = await axios.get(`${API_BASE}/pix/level-limits`, {
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Updated level limits:', JSON.stringify(updatedLimitsResponse.data, null, 2));

  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Network Error:', error.message);
    }
  }
}

async function checkServerStatus() {
  try {
    console.log('🔍 Checking server status...');
    const response = await axios.get(`${API_BASE}/pix/ping`);
    console.log('✅ Server is running and responsive');
    return true;
  } catch (error) {
    console.error('❌ Server is not responding. Make sure the backend is running on port 19997');
    console.error('   Start with: cd Atlas-API && PORT=19997 npm run start:dev');
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 Level-Based QR Code Limits Test Suite');
  console.log('========================================\n');

  // Check if auth token is configured
  if (TEST_CONFIG.AUTH_TOKEN === 'your-jwt-token-here') {
    console.log('⚠️  Please configure AUTH_TOKEN in this script with a valid JWT token');
    console.log('   You can get a token by logging into the application and copying it from the browser devtools');
    console.log();
  }

  const serverOk = await checkServerStatus();
  if (!serverOk) {
    process.exit(1);
  }

  console.log();
  await testLevelLimits();

  console.log('\n✨ Test suite completed!');
  console.log('\n📝 Manual Test Instructions:');
  console.log('1. Login to the application and copy your JWT token');
  console.log('2. Update AUTH_TOKEN in this script');
  console.log('3. Run this script again: node test-level-limits.js');
  console.log('4. Try generating QR codes in the UI with different amounts');
  console.log('5. Verify error messages are in Portuguese and user-friendly');
}

if (require.main === module) {
  main().catch(console.error);
}