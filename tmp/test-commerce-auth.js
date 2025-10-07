// Test script to verify commerce authentication and profile data
const axios = require('axios');

async function testCommerceAuth() {
  try {
    // First, login as admin
    console.log('🔐 Logging in as admin@atlas.com...');
    const loginResponse = await axios.post('http://localhost:19997/api/v1/auth/login', {
      emailOrUsername: 'admin@atlas.com',
      password: 'admin123'
    });

    const { accessToken } = loginResponse.data;
    console.log('✅ Login successful, token received');

    // Now get the profile
    console.log('\n📋 Fetching user profile...');
    const profileResponse = await axios.get('http://localhost:19997/api/v1/auth/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const profile = profileResponse.data;
    console.log('\n👤 Profile Data:');
    console.log('  - ID:', profile.id);
    console.log('  - Email:', profile.email);
    console.log('  - Role:', profile.role);
    console.log('  - isAccountValidated:', profile.isAccountValidated);
    console.log('  - commerceMode:', profile.commerceMode);
    console.log('  - paymentLinksEnabled:', profile.paymentLinksEnabled);

    // Check expected values
    console.log('\n🔍 Validation Check:');
    if (profile.isAccountValidated === true) {
      console.log('  ✅ Account is validated (as expected for admin)');
    } else {
      console.log('  ❌ Account is NOT validated (unexpected for admin!)');
    }

    if (profile.commerceMode === false) {
      console.log('  ✅ Commerce mode is disabled (as expected)');
    } else {
      console.log('  ❌ Commerce mode is enabled (unexpected!)');
    }

    console.log('\n🎯 Expected UI State:');
    if (profile.isAccountValidated && !profile.commerceMode) {
      console.log('  → Should show: "Ativação do Modo Comércio" with application form button');
    } else if (!profile.isAccountValidated) {
      console.log('  → Should show: "Validação de Conta Necessária" with validation prompt');
    } else if (profile.isAccountValidated && profile.commerceMode) {
      console.log('  → Should show: Full commerce interface with payment links');
    }

    return profile;

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testCommerceAuth().then(() => {
  console.log('\n✨ Test completed successfully');
}).catch((error) => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});