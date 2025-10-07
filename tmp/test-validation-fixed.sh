#!/bin/bash

echo "=== Testing Validation Payment Creation After Fix ==="
echo ""

# Test 1: Check validation requirements (should work without auth)
echo "1. Testing validation requirements endpoint..."
curl -s http://localhost:19997/api/v1/account-validation/requirements | jq '.' || echo "Failed to get requirements"

echo ""
echo "2. Testing validation payment creation without depixAddress (should now work with auth)..."

# This will fail without auth, but the important thing is it should not fail due to missing depixAddress
curl -X POST http://localhost:19997/api/v1/account-validation/create-payment \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\nHTTP Status: %{http_code}\n" 2>/dev/null

echo ""
echo "3. Testing with empty payload..."
curl -X POST http://localhost:19997/api/v1/account-validation/create-payment \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\nHTTP Status: %{http_code}\n" 2>/dev/null

echo ""
echo "✅ The fix is working if you see 401 Unauthorized (authentication required)"
echo "❌ The fix is NOT working if you see 400 Bad Request (validation error)"
echo ""
echo "Expected: 401 status because we're not authenticated"
echo "Previous bug: Would return 400 due to missing required field"
