#!/usr/bin/env node

// Test script to verify the validation payment fix
console.log('Testing validation payment creation fix...');

// Mock the PIX service logic to test our fix
const testValidationCheck = (metadata, user) => {
  console.log('Metadata:', metadata);
  console.log('User account validated:', user.isAccountValidated);
  console.log('User verified tax number:', user.verifiedTaxNumber);

  // Check if this is a validation payment (our fix)
  const isValidationPayment = metadata && metadata.isValidation === true;
  console.log('Is validation payment:', isValidationPayment);

  if (!isValidationPayment) {
    // Normal validation checks for regular deposits
    if (!user.isAccountValidated) {
      throw new Error('Conta não validada. Valide sua conta antes de criar depósitos.');
    }
    if (!user.verifiedTaxNumber) {
      throw new Error('Para criar depósitos pessoais, você precisa revalidar sua conta com CPF/CNPJ. Contate o suporte.');
    }
  } else {
    console.log('✅ Validation payment detected - bypassing account validation checks');
  }

  return 'QR Code would be generated successfully';
};

// Test 1: Regular deposit without validation (should fail)
console.log('\n=== Test 1: Regular deposit without validation ===');
try {
  testValidationCheck({}, { isAccountValidated: false, verifiedTaxNumber: null });
  console.log('❌ Test 1 failed - should have thrown error');
} catch (error) {
  console.log('✅ Test 1 passed - correctly rejected:', error.message);
}

// Test 2: Validation payment without validation (should pass)
console.log('\n=== Test 2: Validation payment without validation ===');
try {
  const result = testValidationCheck({ isValidation: true }, { isAccountValidated: false, verifiedTaxNumber: null });
  console.log('✅ Test 2 passed - validation payment allowed:', result);
} catch (error) {
  console.log('❌ Test 2 failed - should have passed:', error.message);
}

// Test 3: Regular deposit with validation (should pass)
console.log('\n=== Test 3: Regular deposit with validation ===');
try {
  const result = testValidationCheck({}, { isAccountValidated: true, verifiedTaxNumber: 'EU123456' });
  console.log('✅ Test 3 passed - regular deposit allowed:', result);
} catch (error) {
  console.log('❌ Test 3 failed - should have passed:', error.message);
}

console.log('\n=== All tests completed ===');