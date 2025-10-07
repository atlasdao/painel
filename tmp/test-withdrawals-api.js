#!/usr/bin/env node

const axios = require('axios');

const API_URL = 'http://localhost:19997';

// Test credentials - adjust these to match your test admin user
const TEST_ADMIN = {
  emailOrUsername: 'admin@atlas.com', // Change to your admin email
  password: 'admin123' // Change to your admin password
};

async function testWithdrawalsAPI() {
  try {
    console.log('🚀 Starting API test...\n');

    // Step 1: Login
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await axios.post(`${API_URL}/api/v1/auth/login`, TEST_ADMIN);

    const { accessToken, user } = loginResponse.data;
    console.log(`✅ Logged in successfully as ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Token: ${accessToken.substring(0, 20)}...`);

    // Step 2: Test withdrawals endpoint
    console.log('\n2️⃣ Fetching pending withdrawals...');
    try {
      const withdrawalsResponse = await axios.get(
        `${API_URL}/api/v1/withdrawals/admin/pending`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      console.log(`✅ Successfully fetched withdrawals`);
      console.log(`   Found ${withdrawalsResponse.data.length} pending withdrawals`);

      if (withdrawalsResponse.data.length > 0) {
        console.log('\n   Sample withdrawal:');
        const sample = withdrawalsResponse.data[0];
        console.log(`   - ID: ${sample.id}`);
        console.log(`   - Amount: ${sample.amount}`);
        console.log(`   - User: ${sample.user?.username || sample.user?.email}`);
        console.log(`   - Status: ${sample.status}`);
      }
    } catch (error) {
      console.error(`❌ Failed to fetch withdrawals`);
      console.error(`   Status: ${error.response?.status}`);
      console.error(`   Message: ${error.response?.data?.message}`);
      console.error(`   Full error:`, error.response?.data);
    }

    // Step 3: Test all withdrawals endpoint
    console.log('\n3️⃣ Testing all withdrawals endpoint...');
    try {
      const allWithdrawalsResponse = await axios.get(
        `${API_URL}/api/v1/withdrawals/admin/all`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      console.log(`✅ Successfully fetched all withdrawals`);
      console.log(`   Total withdrawals: ${allWithdrawalsResponse.data.length}`);
    } catch (error) {
      console.error(`❌ Failed to fetch all withdrawals`);
      console.error(`   Status: ${error.response?.status}`);
      console.error(`   Message: ${error.response?.data?.message}`);
    }

    // Step 4: Test stats endpoint
    console.log('\n4️⃣ Testing withdrawal stats...');
    try {
      const statsResponse = await axios.get(
        `${API_URL}/api/v1/withdrawals/admin/stats`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      console.log(`✅ Successfully fetched stats`);
      console.log(`   Stats:`, statsResponse.data);
    } catch (error) {
      console.error(`❌ Failed to fetch stats`);
      console.error(`   Status: ${error.response?.status}`);
      console.error(`   Message: ${error.response?.data?.message}`);
    }

    console.log('\n✅ All tests completed!');

  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data?.message || error.response.statusText}`);
      console.error(`   Data:`, error.response.data);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    process.exit(1);
  }
}

// Run the test
testWithdrawalsAPI();