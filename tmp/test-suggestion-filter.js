// Test script to verify the suggestion filtering logic
console.log('Testing Payment Link Suggestion Filtering Logic\n');

// Mock payment data scenarios
const scenarios = [
  {
    name: 'No limit (undefined maxAmount)',
    paymentData: { maxAmount: undefined },
    expectedSuggestions: [50, 100, 200, 500]
  },
  {
    name: 'No limit (null maxAmount)',
    paymentData: { maxAmount: null },
    expectedSuggestions: [50, 100, 200, 500]
  },
  {
    name: 'maxAmount: 200 (issue scenario)',
    paymentData: { maxAmount: 200 },
    expectedSuggestions: [50, 100, 200]
  },
  {
    name: 'maxAmount: 150',
    paymentData: { maxAmount: 150 },
    expectedSuggestions: [50, 100]
  },
  {
    name: 'maxAmount: 75',
    paymentData: { maxAmount: 75 },
    expectedSuggestions: [50]
  },
  {
    name: 'maxAmount: 30',
    paymentData: { maxAmount: 30 },
    expectedSuggestions: []
  },
  {
    name: 'maxAmount: 1000',
    paymentData: { maxAmount: 1000 },
    expectedSuggestions: [50, 100, 200, 500]
  }
];

// Test the filter logic used in the actual component
function testFilterLogic(paymentData) {
  return [50, 100, 200, 500]
    .filter(amount => !paymentData.maxAmount || amount <= paymentData.maxAmount);
}

// Run tests
scenarios.forEach(scenario => {
  const result = testFilterLogic(scenario.paymentData);
  const passed = JSON.stringify(result) === JSON.stringify(scenario.expectedSuggestions);

  console.log(`${passed ? '✅' : '❌'} ${scenario.name}`);
  console.log(`   Expected: [${scenario.expectedSuggestions.join(', ')}]`);
  console.log(`   Got:      [${result.join(', ')}]`);

  if (!passed) {
    console.log('   ❗ TEST FAILED');
  }
  console.log('');
});

console.log('Test Summary:');
console.log('- Original issue: Payment link with maxAmount: 200 shows 500 suggestion');
console.log('- Fix: Filter suggestions to only show values <= maxAmount');
console.log('- Result: Only [50, 100, 200] suggestions will show for maxAmount: 200');