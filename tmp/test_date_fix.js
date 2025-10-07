// Test script to verify the date matching logic fix
console.log('🧪 Testing Date Matching Logic Fix');

// Simulate the transaction data structure
const sampleTransaction = {
  id: 'bd86e420-bbb0-4a42-a10e-7e73f0c38775',
  amount: 124298,
  status: 'COMPLETED',
  processedAt: '2025-10-03T13:28:34.643Z', // Today at 13:28
  createdAt: '2025-10-03T13:28:34.643Z'
};

// Simulate the period calculation (last 7 days)
const now = new Date();
const startDate = new Date(now);
startDate.setDate(startDate.getDate() - 6);
startDate.setHours(0, 0, 0, 0); // Start of day 6 days ago

const endDate = new Date(now);
endDate.setHours(23, 59, 59, 999); // End of today

console.log('📅 Period Setup:');
console.log('startDate:', startDate.toISOString());
console.log('endDate:', endDate.toISOString());
console.log('startTime:', startDate.getTime());
console.log('endTime:', endDate.getTime());

// Test transaction parsing
const transactionDate = new Date(sampleTransaction.processedAt);
const transactionTime = transactionDate.getTime();

console.log('💰 Transaction Details:');
console.log('transactionDate:', transactionDate.toISOString());
console.log('transactionTime:', transactionTime);
console.log('Local time:', transactionDate.toLocaleString('pt-BR'));

// Test the core matching logic
const isInRange = transactionTime >= startDate.getTime() && transactionTime <= endDate.getTime();

console.log('🔍 Date Matching Test:');
console.log('isInRange:', isInRange);
console.log('timeDiff from start:', transactionTime - startDate.getTime(), 'ms');
console.log('timeDiff to end:', endDate.getTime() - transactionTime, 'ms');

// Test period generation logic (similar to what's in the actual code)
console.log('\n📊 Period Generation Test:');
const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
console.log('daysDiff:', daysDiff);

// Create one period for today
const periodStart = new Date(now);
periodStart.setHours(0, 0, 0, 0);

const periodEnd = new Date(now);
periodEnd.setHours(23, 59, 59, 999);

console.log('Today period:');
console.log('periodStart:', periodStart.toISOString());
console.log('periodEnd:', periodEnd.toISOString());

const isInTodayPeriod = transactionTime >= periodStart.getTime() && transactionTime <= periodEnd.getTime();
console.log('isInTodayPeriod:', isInTodayPeriod);

// Expected result
if (isInRange && isInTodayPeriod) {
  console.log('✅ SUCCESS: Transaction should be matched and chart should show revenue!');
} else {
  console.log('❌ FAILED: Transaction not matching - need to investigate further');
  console.log('Debug info:');
  console.log('- Transaction is from today?', transactionDate.toDateString() === now.toDateString());
  console.log('- Transaction hour:', transactionDate.getHours());
}