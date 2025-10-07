const axios = require('axios');

async function testLogin() {
  console.log('Testing login with admin credentials...\n');

  try {
    const response = await axios.post('http://localhost:19997/api/v1/auth/login', {
      emailOrUsername: 'admin@atlas.com',
      password: 'admin123'
    });

    console.log('✅ Login successful!');
    console.log('Response structure:');
    console.log('- accessToken:', response.data.accessToken ? '✓ Present' : '✗ Missing');
    console.log('- access_token:', response.data.access_token ? '✓ Present' : '✗ Missing');
    console.log('- refreshToken:', response.data.refreshToken ? '✓ Present' : '✗ Missing');
    console.log('- refresh_token:', response.data.refresh_token ? '✓ Present' : '✗ Missing');
    console.log('- user:', response.data.user ? '✓ Present' : '✗ Missing');
    console.log('\nUser details:');
    console.log('- Email:', response.data.user.email);
    console.log('- Username:', response.data.user.username);
    console.log('- Role:', response.data.user.role);

    return true;
  } catch (error) {
    console.log('❌ Login failed!');
    if (error.response) {
      console.log('Error status:', error.response.status);
      console.log('Error message:', error.response.data.message);
    } else {
      console.log('Network error:', error.message);
    }
    return false;
  }
}

testLogin();