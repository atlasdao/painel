const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:19997/api/v1';

// Test credentials - use existing test user
const TEST_USER = {
  email: 'test@atlasdao.info',
  password: 'AtlasDAO2025!'
};

async function testAvatarUpload() {
  let authToken = null;

  try {
    console.log('🔄 Step 1: Attempting to login...');

    // First, try to login to get a valid token
    try {
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
        emailOrUsername: TEST_USER.email,
        password: TEST_USER.password
      });

      authToken = loginResponse.data.accessToken || loginResponse.data.access_token;
      console.log('✅ Login successful, token length:', authToken?.length);
    } catch (loginError) {
      console.error('❌ Login failed:', loginError.response?.data || loginError.message);
      return;
    }

    if (!authToken) {
      console.error('❌ No auth token obtained');
      return;
    }

    console.log('🔄 Step 2: Testing profile endpoint access...');

    // Test basic profile access
    try {
      const profileResponse = await axios.get(`${API_BASE}/profile`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Profile access successful');
      console.log('👤 Current profile picture:', profileResponse.data.profilePicture ? 'EXISTS' : 'NULL');
    } catch (profileError) {
      console.error('❌ Profile access failed:', profileError.response?.data || profileError.message);
      return;
    }

    console.log('🔄 Step 3: Testing avatar upload...');

    // Create a minimal test image in base64 format (1x1 pixel PNG)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

    // Test avatar upload
    const uploadPayload = {
      avatarData: testImageBase64,
      mimeType: 'image/png'
    };

    console.log('📤 Uploading avatar with payload size:', JSON.stringify(uploadPayload).length, 'bytes');

    try {
      const uploadResponse = await axios.post(`${API_BASE}/profile/avatar`, uploadPayload, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });

      console.log('✅ Avatar upload successful!');
      console.log('📸 Response:', uploadResponse.data);

      // Verify the upload by getting profile again
      const verifyResponse = await axios.get(`${API_BASE}/profile`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      console.log('🔍 Verification - Profile picture after upload:', verifyResponse.data.profilePicture ? 'EXISTS' : 'NULL');
      if (verifyResponse.data.profilePicture) {
        console.log('📏 Profile picture size:', verifyResponse.data.profilePicture.length, 'characters');
      }

    } catch (uploadError) {
      console.error('❌ Avatar upload failed!');
      console.error('Error status:', uploadError.response?.status);
      console.error('Error message:', uploadError.response?.data || uploadError.message);
      console.error('Request config:', {
        url: uploadError.config?.url,
        method: uploadError.config?.method,
        headers: uploadError.config?.headers,
        payloadSize: uploadError.config?.data?.length
      });

      // If it's a timeout, that might indicate a processing issue
      if (uploadError.code === 'ECONNABORTED') {
        console.error('🕐 Request timed out - server may be processing too slowly');
      }

      // If it's a 413, it's a payload too large error
      if (uploadError.response?.status === 413) {
        console.error('📦 Payload too large error - server request size limits exceeded');
      }

      // If it's a 500, it's likely a server processing error
      if (uploadError.response?.status === 500) {
        console.error('🔥 Server error - likely issue with image processing');
      }
    }

  } catch (error) {
    console.error('❌ Test failed with unexpected error:', error.message);
  }
}

// Run the test
console.log('🚀 Starting Avatar Upload Test...');
testAvatarUpload().then(() => {
  console.log('✅ Test completed');
}).catch(error => {
  console.error('❌ Test failed:', error.message);
});