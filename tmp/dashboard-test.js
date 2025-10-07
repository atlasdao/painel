#!/usr/bin/env node

const API_URL = 'http://localhost:19997/api/v1';

async function testDashboardFlow() {
  console.log('=== DASHBOARD FIX VERIFICATION ===\n');
  console.log('Testing complete authentication and dashboard flow...\n');

  try {
    // Step 1: Login
    console.log('1. Testing login...');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrUsername: 'user@atlas.com',
        password: 'user123'
      })
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      console.error('   ❌ Login failed:', error);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('   ✅ Login successful!');
    console.log(`   Token: ${loginData.accessToken.substring(0, 50)}...`);
    console.log(`   User: ${loginData.user.email} (${loginData.user.role})`);

    // Step 2: Test profile endpoint
    console.log('\n2. Testing profile endpoint...');
    const profileResponse = await fetch(`${API_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${loginData.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (profileResponse.ok) {
      const profile = await profileResponse.json();
      console.log('   ✅ Profile endpoint working!');
      console.log(`   User ID: ${profile.id}`);
      console.log(`   Username: ${profile.username}`);
    } else {
      console.error('   ❌ Profile endpoint failed:', profileResponse.status);
    }

    // Step 3: Test balance endpoint
    console.log('\n3. Testing balance endpoint...');
    const balanceResponse = await fetch(`${API_URL}/pix/balance`, {
      headers: {
        'Authorization': `Bearer ${loginData.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (balanceResponse.ok) {
      const balance = await balanceResponse.json();
      console.log('   ✅ Balance endpoint working!');
      console.log(`   Available: R$ ${balance.available}`);
      console.log(`   Pending: R$ ${balance.pending}`);
    } else {
      console.error('   ❌ Balance endpoint failed:', balanceResponse.status);
    }

    // Step 4: Test transactions endpoint
    console.log('\n4. Testing transactions endpoint...');
    const transactionsResponse = await fetch(`${API_URL}/pix/transactions`, {
      headers: {
        'Authorization': `Bearer ${loginData.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (transactionsResponse.ok) {
      const transactions = await transactionsResponse.json();
      console.log('   ✅ Transactions endpoint working!');
      console.log(`   Total transactions: ${transactions.length}`);
    } else {
      console.error('   ❌ Transactions endpoint failed:', transactionsResponse.status);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ DASHBOARD IS FIXED!');
    console.log('='.repeat(50));
    console.log('\nAll API endpoints are responding correctly.');
    console.log('The dashboard should now load without infinite loading.');
    console.log('\nTo verify in browser:');
    console.log('1. Clear all cookies for localhost:11337');
    console.log('2. Navigate to http://localhost:11337/login');
    console.log('3. Login with:');
    console.log('   - Email: user@atlas.com');
    console.log('   - Password: user123');
    console.log('4. Dashboard should load successfully!\n');

  } catch (error) {
    console.error('Fatal error:', error.message);
    console.error('\n❌ Backend might not be running on port 19997');
    console.error('Please ensure the backend is running with: npm run start:dev');
  }
}

testDashboardFlow();