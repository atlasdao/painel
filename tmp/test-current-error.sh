#!/bin/bash

# Test Current Error Handling
# This script tests what error message users get before the token is configured

echo "🧪 Testing current error messages..."
echo "=================================="

# First check if backend is running
if ! curl -s http://localhost:19997/health > /dev/null; then
    echo "❌ Backend is not running on port 19997"
    echo "   Start it with: cd Atlas-API && PORT=19997 npm run start:dev"
    exit 1
fi

echo "✅ Backend is running"

# Try to login first
echo ""
echo "📋 Step 1: Authenticating with admin user..."

LOGIN_RESPONSE=$(curl -s -X POST http://localhost:19997/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername": "admin@admin.com", "password": "password"}')

if [[ $LOGIN_RESPONSE == *"accessToken"* ]]; then
    echo "✅ Authentication successful"
    TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    echo "🔑 Token: ${TOKEN:0:20}..."
else
    echo "❌ Authentication failed"
    echo "   Response: $LOGIN_RESPONSE"
    echo "   Make sure admin user exists and password is correct"
    exit 1
fi

# Try to create a deposit (this should show our improved error message)
echo ""
echo "📋 Step 2: Testing deposit creation (should show improved error message)..."

DEPOSIT_RESPONSE=$(curl -s -X POST http://localhost:19997/api/v1/pix/generate-qr \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "amount": 10.00,
    "depixAddress": "VJLTest123456789abcdefghijklmnop",
    "description": "Test deposit for error handling"
  }')

echo "📦 Deposit Response:"
echo "$DEPOSIT_RESPONSE" | jq . 2>/dev/null || echo "$DEPOSIT_RESPONSE"

# Check if our improved error message is present
if [[ $DEPOSIT_RESPONSE == *"Entre em contato com o suporte"* ]]; then
    echo ""
    echo "✅ SUCCESS: Improved error message is working!"
    echo "   Users will now see a clear message in Portuguese"
elif [[ $DEPOSIT_RESPONSE == *"service unavailable"* ]]; then
    echo ""
    echo "⚠️  Generic error message still showing"
    echo "   The improved error handling may not be active yet"
else
    echo ""
    echo "🤔 Unexpected response"
    echo "   This might indicate a different issue"
fi

echo ""
echo "🔧 Next steps:"
echo "   1. Obtain Eulen API token from @DePix_stable_bot on Telegram"
echo "   2. Run: /apitoken atlas_api 365 all"
echo "   3. Copy the JWT token"
echo "   4. Use the setup script: npx tsx setup-eulen-token.ts <TOKEN>"
echo "   5. Restart the backend server"
echo "   6. Test deposit creation again"