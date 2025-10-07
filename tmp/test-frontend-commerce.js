// Test script to check frontend commerce page
const axios = require('axios');

async function testFrontendCommerce() {
  console.log('Testing Frontend Commerce Page Rendering...\n');

  try {
    // First get a valid token
    const loginResponse = await axios.post('http://localhost:19997/api/v1/auth/login', {
      emailOrUsername: 'admin@atlas.com',
      password: 'admin123'
    });
    const token = loginResponse.data.accessToken;
    console.log('✓ Got authentication token\n');

    // Try to fetch the commerce page
    const commerceResponse = await axios.get('http://localhost:11337/commerce', {
      headers: {
        'Cookie': `token=${token}`,
        'User-Agent': 'Mozilla/5.0'
      },
      validateStatus: () => true
    });

    if (commerceResponse.status === 200) {
      console.log('✓ Commerce page loaded successfully');

      // Check for key strings in the HTML
      const html = commerceResponse.data;

      console.log('\n🔍 Checking page content:');

      if (html.includes('Validação de Conta Necessária')) {
        console.log('❌ ISSUE FOUND: Page shows "Validação de Conta Necessária"');
        console.log('   This is incorrect for a validated user!');
      }

      if (html.includes('Ativação do Modo Comércio')) {
        console.log('✅ CORRECT: Page shows "Ativação do Modo Comércio"');
        console.log('   This is correct for a validated user without commerce mode!');
      }

      if (html.includes('Responder Formulário de Aplicação')) {
        console.log('✅ CORRECT: Application form button is present');
      }

      if (html.includes('Validar Conta')) {
        console.log('❌ ISSUE: "Validar Conta" button is present (should not be for validated user)');
      }

      // Check for the R$ 1,00 validation message
      if (html.includes('pagamento único de R$ 1,00')) {
        console.log('❌ ISSUE: R$ 1,00 validation message is present');
      }

    } else if (commerceResponse.status === 307 || commerceResponse.status === 302) {
      console.log('⚠️  Page redirected (possibly to login)');
      console.log('   Status:', commerceResponse.status);
      console.log('   Location:', commerceResponse.headers.location);
    } else {
      console.log('❌ Failed to load commerce page');
      console.log('   Status:', commerceResponse.status);
    }

  } catch (error) {
    console.error('Error testing frontend:', error.message);
  }
}

testFrontendCommerce();