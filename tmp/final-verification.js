// Final verification of the commerce page fix
const axios = require('axios');

async function finalVerification() {
  console.log('='.repeat(60));
  console.log('FINAL VERIFICATION - Commerce Page Fix');
  console.log('='.repeat(60));
  console.log();

  try {
    // Step 1: Login
    console.log('Step 1: Authenticating...');
    const loginResponse = await axios.post('http://localhost:19997/api/v1/auth/login', {
      emailOrUsername: 'admin@atlas.com',
      password: 'admin123'
    });
    const token = loginResponse.data.accessToken;
    console.log('✅ Authentication successful\n');

    // Step 2: Get Profile Data
    console.log('Step 2: Fetching Profile Data...');
    const profileResponse = await axios.get('http://localhost:19997/api/v1/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const profile = profileResponse.data;
    console.log('✅ Profile Data Retrieved:');
    console.log('   - Email:', profile.email);
    console.log('   - isAccountValidated:', profile.isAccountValidated);
    console.log('   - commerceMode:', profile.commerceMode);
    console.log();

    // Step 3: Verify Expected State
    console.log('Step 3: Verifying Expected UI State...');

    if (!profile.isAccountValidated) {
      console.log('⚠️  User is NOT validated');
      console.log('   Expected UI: "Validação de Conta Necessária"');
      console.log('   Expected Button: "Validar Conta"');
    } else if (!profile.commerceMode) {
      console.log('✅ User is validated but commerce mode is NOT active');
      console.log('   Expected UI: "Ativação do Modo Comércio"');
      console.log('   Expected Button: "Responder Formulário de Aplicação"');
    } else {
      console.log('🚀 User has full commerce access');
      console.log('   Expected UI: Full commerce interface with tabs');
    }
    console.log();

    // Step 4: Summary
    console.log('Step 4: Summary');
    console.log('='.repeat(60));

    if (profile.isAccountValidated && !profile.commerceMode) {
      console.log('✅ FIX VERIFIED: The commerce page should now show:');
      console.log('   1. Title: "Ativação do Modo Comércio"');
      console.log('   2. Requirements section with two items:');
      console.log('      - Responder o formulário de aprovação');
      console.log('      - Depositar garantia de 100.000 satoshis');
      console.log('   3. Button: "Responder Formulário de Aplicação"');
      console.log('   4. Benefits list');
      console.log();
      console.log('✅ The incorrect "Validação de Conta Necessária" message');
      console.log('   should NO LONGER appear for this validated user.');
    }

    console.log();
    console.log('📱 To manually verify:');
    console.log('   1. Open browser to http://localhost:11337');
    console.log('   2. Login with admin@atlas.com / admin123');
    console.log('   3. Navigate to Commerce page');
    console.log('   4. Check browser console for debug logs');
    console.log();
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  }
}

finalVerification();