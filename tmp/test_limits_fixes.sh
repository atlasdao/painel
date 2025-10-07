#!/bin/bash

echo "Testing Limits System Fixes"
echo "=========================="
echo ""

# Test the backend API endpoint
echo "1. Testing Backend API - Getting limits for test2fa user..."
echo ""

# First, let's login as test2fa
echo "Logging in as test2fa@example.com..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:19997/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test2fa@example.com", "password": "Test123!@#"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | sed 's/"accessToken":"//')

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to login. Response:"
  echo $LOGIN_RESPONSE
  exit 1
fi

echo "✅ Successfully logged in"
echo ""

# Now test the limits endpoint
echo "2. Fetching user limits..."
LIMITS_RESPONSE=$(curl -s -X GET http://localhost:19997/api/v1/profile/limits \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo $LIMITS_RESPONSE | jq '.' || echo $LIMITS_RESPONSE
echo ""

# Check for issues
echo "3. Checking for fixed issues..."
echo ""

# Check 1: No spending moderation messages
if echo "$LIMITS_RESPONSE" | grep -q "Considere moderar"; then
  echo "❌ FAILED: Still contains spending moderation message"
else
  echo "✅ PASSED: No spending moderation messages found"
fi

if echo "$LIMITS_RESPONSE" | grep -q "Seus limites estão saudáveis"; then
  echo "❌ FAILED: Still contains 'healthy limits' message"
else
  echo "✅ PASSED: No 'healthy limits' message found"
fi

# Check 2: Transaction limit value
TRANSACTION_LIMIT=$(echo $LIMITS_RESPONSE | jq '.limits.singleTransaction.limit' 2>/dev/null)
if [ "$TRANSACTION_LIMIT" == "5000" ]; then
  echo "✅ PASSED: Transaction limit is correctly set to 5000"
elif [ "$TRANSACTION_LIMIT" == "10000" ]; then
  echo "❌ FAILED: Transaction limit still shows 10000"
else
  echo "⚠️  Transaction limit value: $TRANSACTION_LIMIT"
fi

# Check 3: Display type for single transaction
DISPLAY_TYPE=$(echo $LIMITS_RESPONSE | jq -r '.limits.singleTransaction.displayType' 2>/dev/null)
if [ "$DISPLAY_TYPE" == "static" ]; then
  echo "✅ PASSED: Single transaction has static display type"
else
  echo "❌ FAILED: Single transaction display type is not 'static'"
fi

# Check 4: DePix integration
DAILY_PERSONAL=$(echo $LIMITS_RESPONSE | jq '.limits.dailyPersonal' 2>/dev/null)
if [ "$DAILY_PERSONAL" != "null" ] && [ -n "$DAILY_PERSONAL" ]; then
  echo "✅ PASSED: DePix personal limits are present"
  echo "  Daily Personal Limit: $(echo $LIMITS_RESPONSE | jq '.limits.dailyPersonal.limit' 2>/dev/null)"
else
  echo "⚠️  WARNING: DePix personal limits not found (user may not have CPF configured)"
fi

# Check 5: Status message
STATUS_MSG=$(echo $LIMITS_RESPONSE | jq -r '.status.message' 2>/dev/null)
STATUS_REC=$(echo $LIMITS_RESPONSE | jq -r '.status.recommendation' 2>/dev/null)
echo ""
echo "Status message: $STATUS_MSG"
echo "Recommendation: $STATUS_REC"

if [ "$STATUS_REC" == "null" ] || [ -z "$STATUS_REC" ]; then
  echo "✅ PASSED: No spending recommendations present"
else
  echo "❌ FAILED: Still has spending recommendations"
fi

echo ""
echo "=========================="
echo "Test Summary Complete"
echo ""

# Check if user has CPF configured
echo "4. Checking user's CPF configuration..."
USER_RESPONSE=$(curl -s -X GET http://localhost:19997/api/v1/profile \
  -H "Authorization: Bearer $TOKEN")

PIX_KEY=$(echo $USER_RESPONSE | jq -r '.pixKey' 2>/dev/null)
PIX_KEY_TYPE=$(echo $USER_RESPONSE | jq -r '.pixKeyType' 2>/dev/null)

echo "User's pixKey: $PIX_KEY"
echo "User's pixKeyType: $PIX_KEY_TYPE"

if [ "$PIX_KEY" == "01907979590" ] && [ "$PIX_KEY_TYPE" == "CPF" ]; then
  echo "✅ User has CPF configured correctly"
else
  echo "⚠️  User may need CPF to be added to database for DePix integration"
fi