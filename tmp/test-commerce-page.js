// Test script to debug commerce page issue
const axios = require('axios');

async function testCommercePage() {
  console.log('Testing Commerce Page State...\n');

  // Login to get token
  const loginResponse = await axios.post('http://localhost:19997/api/v1/auth/login', {
    emailOrUsername: 'admin@atlas.com',
    password: 'admin123'
  });

  const token = loginResponse.data.accessToken;
  console.log('✓ Login successful');

  // Get profile data
  const profileResponse = await axios.get('http://localhost:19997/api/v1/profile', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const profile = profileResponse.data;
  console.log('\n📊 Profile Data:');
  console.log('- isAccountValidated:', profile.isAccountValidated);
  console.log('- commerceMode:', profile.commerceMode);
  console.log('- commerceModeActivatedAt:', profile.commerceModeActivatedAt);
  console.log('- paymentLinksEnabled:', profile.paymentLinksEnabled);

  // Determine expected UI state
  console.log('\n🎯 Expected UI State:');
  if (!profile.isAccountValidated) {
    console.log('❌ Should show: "Validação de Conta Necessária"');
    console.log('   Message: "Você precisa validar sua conta antes de ativar o Modo Comércio"');
    console.log('   Button: "Validar Conta" -> /settings?tab=profile');
  } else if (!profile.commerceMode) {
    console.log('✅ Should show: "Ativação do Modo Comércio"');
    console.log('   Message: "Complete os requisitos abaixo para ativar o Modo Comércio"');
    console.log('   Button: "Responder Formulário de Aplicação"');
  } else {
    console.log('🚀 Should show: Full Commerce Interface');
    console.log('   - Payment Links Manager');
    console.log('   - QR Code Generator');
    console.log('   - Statistics');
  }

  // Check component logic
  console.log('\n🔍 Checking Component Logic:');
  const hasFullCommerceAccess = profile.commerceMode && profile.isAccountValidated;
  console.log('- hasFullCommerceAccess =', hasFullCommerceAccess);
  console.log('- Should render CommerceLockScreen:', !hasFullCommerceAccess);

  // Check what CommerceLockScreen will show
  console.log('\n📱 CommerceLockScreen Display:');
  console.log('- Props passed:');
  console.log('  - isAccountValidated:', profile.isAccountValidated);
  console.log('  - commerceMode:', profile.commerceMode);

  if (!profile.isAccountValidated) {
    console.log('- Title: "Validação de Conta Necessária"');
  } else {
    console.log('- Title: "Ativação do Modo Comércio"');
  }
}

testCommercePage().catch(console.error);