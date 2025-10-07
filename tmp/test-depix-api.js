#!/usr/bin/env node

// Test script to diagnose DePix API issues
const axios = require('axios');

async function testDepixAPI() {
  const API_URL = 'https://depix.eulen.app/api';
  const TOKEN = process.env.DEPIX_TOKEN || '';

  console.log('🔍 Testing DePix API Connection...\n');
  console.log('API URL:', API_URL);
  console.log('Token provided:', TOKEN ? 'YES' : 'NO');

  if (!TOKEN) {
    console.error('❌ No token provided. Set DEPIX_TOKEN environment variable');
    return;
  }

  const client = axios.create({
    baseURL: API_URL,
    timeout: 60000,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
      'X-Async': 'auto',
      'X-Nonce': Date.now().toString()
    }
  });

  // Test data for deposit creation
  const testData = {
    amountInCents: 100, // R$ 1,00
    // No depixAddress - let API use default
    // No endUserTaxNumber - testing without it first
  };

  console.log('\n📤 Request data:', JSON.stringify(testData, null, 2));

  try {
    console.log('\n🚀 Sending request to /deposit...');
    const response = await client.post('/deposit', testData);

    console.log('\n✅ SUCCESS!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));

    if (response.data?.response?.id) {
      console.log('\n🎯 Transaction ID:', response.data.response.id);
      console.log('QR Code:', response.data.response.qrCopyPaste ? 'Generated' : 'Missing');
      console.log('QR Image:', response.data.response.qrImageUrl ? 'Generated' : 'Missing');
    }
  } catch (error) {
    console.error('\n❌ ERROR!');

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));

      if (error.response.data?.errorMessage) {
        console.error('\n📝 Error message:', error.response.data.errorMessage);
      }
    } else if (error.request) {
      console.error('No response received from API');
      console.error('Request was made but no response');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
    } else {
      console.error('Error setting up request:', error.message);
    }
  }

  // Test with tax number
  console.log('\n\n=== TEST 2: With CPF ===');
  const testDataWithCPF = {
    amountInCents: 100,
    endUserTaxNumber: '12345678901' // Test CPF
  };

  console.log('📤 Request data:', JSON.stringify(testDataWithCPF, null, 2));

  try {
    console.log('\n🚀 Sending request to /deposit...');
    const response = await client.post('/deposit', testDataWithCPF);

    console.log('\n✅ SUCCESS WITH CPF!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('\n❌ ERROR WITH CPF!');

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Check if token is in database
async function checkTokenInDB() {
  console.log('\n\n=== CHECKING TOKEN IN DATABASE ===');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const setting = await prisma.systemSettings.findUnique({
      where: { key: 'EULEN_API_TOKEN' }
    });

    if (setting) {
      console.log('✅ Token found in database');
      console.log('Token value:', setting.value ? `${setting.value.substring(0, 10)}...` : 'EMPTY');
      return setting.value;
    } else {
      console.log('❌ No token found in database');
      return null;
    }
  } catch (error) {
    console.error('Error checking database:', error.message);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
(async () => {
  // First check database
  const dbToken = await checkTokenInDB();

  if (dbToken) {
    process.env.DEPIX_TOKEN = dbToken;
  } else {
    console.log('\n⚠️  No token in database. Please set DEPIX_TOKEN environment variable');
    return;
  }

  // Run the test
  await testDepixAPI();
})();