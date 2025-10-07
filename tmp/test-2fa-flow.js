const axios = require('axios');

const API_URL = 'http://localhost:19997/api/v1';

async function test2FAFlow() {
  try {
    console.log('\n=== Testing 2FA Flow ===\n');

    // Step 1: Try to login with a test account
    // You may need to adjust the credentials here
    const emailOrUsername = 'admin'; // or use an email like 'admin@example.com'
    const password = 'admin123'; // adjust to your test password

    console.log('Step 1: Initial login');
    console.log('Logging in with:', emailOrUsername);

    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      emailOrUsername,
      password
    });

    console.log('\nLogin response:', JSON.stringify(loginResponse.data, null, 2));

    if (loginResponse.data.requiresTwoFactor) {
      console.log('\n2FA is required!');
      console.log('Session token:', loginResponse.data.sessionToken);
      console.log('User email from response:', loginResponse.data.user?.email);

      // Step 2: Simulate 2FA verification
      const twoFactorCode = '123456'; // You'll need to get the actual code from your authenticator app
      const userEmail = loginResponse.data.user?.email || emailOrUsername;

      console.log('\nStep 2: 2FA verification');
      console.log('Using email for 2FA:', userEmail);
      console.log('Using code:', twoFactorCode);

      try {
        const verify2FAResponse = await axios.post(`${API_URL}/auth/verify-2fa`, {
          email: userEmail,
          twoFactorToken: twoFactorCode
        });

        console.log('\n2FA verification successful!');
        console.log('Response:', JSON.stringify(verify2FAResponse.data, null, 2));
      } catch (error) {
        console.error('\n2FA verification failed!');
        console.error('Error:', error.response?.data || error.message);
        console.error('Status:', error.response?.status);
        console.error('Full error response:', JSON.stringify(error.response?.data, null, 2));
      }
    } else {
      console.log('\n2FA not required, login successful!');
      console.log('Access token:', loginResponse.data.accessToken);
    }
  } catch (error) {
    console.error('\nLogin failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received');
      console.error('Request:', error.request);
    } else {
      console.error('Error:', error.message);
    }
  }
}

test2FAFlow();