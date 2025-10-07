// Test script to verify PIX key fields are returned from /auth/profile endpoint
const axios = require('axios');

async function testAuthProfile() {
  try {
    console.log('Testing /auth/profile endpoint for PIX key fields...\n');

    // First, let's login to get a token
    const loginResponse = await axios.post('http://localhost:19997/auth/login', {
      email: 'admin@atlas.com', // Update with a valid test email/password
      password: 'admin123'
    });

    const token = loginResponse.data.access_token;
    console.log('✅ Login successful, token obtained\n');

    // Now test the /auth/profile endpoint
    const profileResponse = await axios.get('http://localhost:19997/auth/profile', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const profile = profileResponse.data;

    console.log('Profile response fields:');
    console.log('------------------------');
    Object.keys(profile).forEach(key => {
      if (key === 'pixKey' || key === 'pixKeyType') {
        console.log(`✅ ${key}: ${profile[key] || '(empty but field exists)'}`);
      } else {
        console.log(`  ${key}: ${typeof profile[key]}`);
      }
    });

    // Check if PIX fields exist
    console.log('\n------------------------');
    if ('pixKey' in profile) {
      console.log('✅ SUCCESS: pixKey field is present in response');
    } else {
      console.log('❌ FAILURE: pixKey field is missing from response');
    }

    if ('pixKeyType' in profile) {
      console.log('✅ SUCCESS: pixKeyType field is present in response');
    } else {
      console.log('❌ FAILURE: pixKeyType field is missing from response');
    }

  } catch (error) {
    console.error('Error testing endpoint:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testAuthProfile();