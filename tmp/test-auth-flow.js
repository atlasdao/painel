#!/usr/bin/env node

const API_URL = 'http://localhost:19997/api';

async function testAuthFlow() {
  console.log('=== Testing Atlas Auth Flow ===\n');

  try {
    // Test 1: Login
    console.log('1. Testing login endpoint...');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrUsername: 'daniel@asylumapp.com',
        password: '123456'
      })
    });

    console.log(`   Status: ${loginResponse.status}`);

    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      console.error(`   Error: ${error}`);
      return;
    }

    const loginData = await loginResponse.json();
    console.log(`   Success! Token received: ${loginData.accessToken ? 'YES' : 'NO'}`);
    console.log(`   User: ${loginData.user?.email} (${loginData.user?.role})`);

    if (!loginData.accessToken) {
      console.error('   No access token received!');
      return;
    }

    // Test 2: Get profile with token
    console.log('\n2. Testing profile endpoint with token...');
    const profileResponse = await fetch(`${API_URL}/auth/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${loginData.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${profileResponse.status}`);

    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      console.log('   Profile data received:');
      console.log(`   - ID: ${profileData.id}`);
      console.log(`   - Email: ${profileData.email}`);
      console.log(`   - Username: ${profileData.username}`);
      console.log(`   - Role: ${profileData.role}`);
      console.log(`   - Active: ${profileData.isActive}`);
    } else {
      const error = await profileResponse.text();
      console.error(`   Error: ${error}`);
    }

    // Test 3: Check admin endpoints
    console.log('\n3. Testing admin dashboard endpoint...');
    const dashboardResponse = await fetch(`${API_URL}/admin/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${loginData.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${dashboardResponse.status}`);

    if (dashboardResponse.ok) {
      const dashboardData = await dashboardResponse.json();
      console.log('   Dashboard stats received:');
      console.log(`   - Total Users: ${dashboardData.totalUsers}`);
      console.log(`   - Total Transactions: ${dashboardData.totalTransactions}`);
    } else {
      console.log('   User is not admin or endpoint failed');
    }

  } catch (error) {
    console.error('Fatal error:', error.message);
  }
}

testAuthFlow();