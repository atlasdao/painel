#!/usr/bin/env node

// Test script to simulate payment link creation requests
// This helps debug the issue without needing the full server

const testPayloads = [
  // Test case 1: Valid fixed amount
  {
    name: "Valid Fixed Amount",
    payload: {
      amount: 100.50,
      isCustomAmount: false,
      description: "Test payment",
      walletAddress: "VJL7NxqTjLLFSCqNcPjBvzUgXxMfVuXP7RG"
    }
  },
  // Test case 2: Valid custom amount with min/max
  {
    name: "Valid Custom Amount",
    payload: {
      isCustomAmount: true,
      minAmount: 10.00,
      maxAmount: 1000.00,
      description: "Custom payment",
      walletAddress: "VJL7NxqTjLLFSCqNcPjBvzUgXxMfVuXP7RG"
    }
  },
  // Test case 3: Invalid - NaN amount (what was likely causing the bug)
  {
    name: "Invalid - NaN Amount",
    payload: {
      amount: NaN,
      isCustomAmount: false,
      description: "Test payment",
      walletAddress: "VJL7NxqTjLLFSCqNcPjBvzUgXxMfVuXP7RG"
    }
  },
  // Test case 4: Invalid - Empty string converted to NaN
  {
    name: "Invalid - Empty String Amount",
    payload: {
      amount: parseFloat(""), // This results in NaN
      isCustomAmount: false,
      description: "Test payment",
      walletAddress: "VJL7NxqTjLLFSCqNcPjBvzUgXxMfVuXP7RG"
    }
  },
  // Test case 5: Invalid - Missing wallet address
  {
    name: "Invalid - Missing Wallet",
    payload: {
      amount: 100.50,
      isCustomAmount: false,
      description: "Test payment",
      walletAddress: ""
    }
  }
];

console.log("🧪 Payment Link Creation Test Cases");
console.log("===================================");

testPayloads.forEach((test, index) => {
  console.log(`\n${index + 1}. ${test.name}`);
  console.log("Payload:", JSON.stringify(test.payload, null, 2));

  // Simulate the validation that should happen
  const { amount, isCustomAmount, minAmount, maxAmount, walletAddress } = test.payload;

  let hasError = false;
  let errorMessage = "";

  // Check for NaN values
  if (amount !== undefined && isNaN(amount)) {
    hasError = true;
    errorMessage = "Amount is NaN";
  }

  if (minAmount !== undefined && isNaN(minAmount)) {
    hasError = true;
    errorMessage = "MinAmount is NaN";
  }

  if (maxAmount !== undefined && isNaN(maxAmount)) {
    hasError = true;
    errorMessage = "MaxAmount is NaN";
  }

  // Check for missing required fields
  if (!isCustomAmount && (!amount || amount <= 0)) {
    hasError = true;
    errorMessage = "Fixed amount required but missing or invalid";
  }

  if (!walletAddress || walletAddress.trim().length === 0) {
    hasError = true;
    errorMessage = "Wallet address required but missing";
  }

  if (hasError) {
    console.log("❌ VALIDATION FAILED:", errorMessage);
  } else {
    console.log("✅ VALIDATION PASSED");
  }
});

console.log("\n🔍 Key Findings:");
console.log("- NaN values cause silent validation failures");
console.log("- Frontend parseFloat('') returns NaN");
console.log("- Backend needs explicit NaN checks");
console.log("- Proper data sanitization needed in frontend");

console.log("\n🛠️ Implemented Fixes:");
console.log("1. Frontend: sanitizeNumber() function to handle empty strings");
console.log("2. Backend: isNaN() checks in validation logic");
console.log("3. Enhanced error messages in Portuguese");
console.log("4. Proper null/undefined handling");