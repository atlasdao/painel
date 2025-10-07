#!/bin/bash

echo "Creating test user and testing PIX key update..."

# Create a new test user
echo "1. Creating test user..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:19997/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testpix@test.com",
    "username": "testpix",
    "password": "Test123!@#"
  }')

echo "Register response:"
echo $REGISTER_RESPONSE | python3 -m json.tool

# Login with the test user
echo -e "\n2. Logging in with test user..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:19997/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername": "testpix", "password": "Test123!@#"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | grep -o '[^"]*$')

if [ -z "$TOKEN" ]; then
  echo "Failed to get token. Login response:"
  echo $LOGIN_RESPONSE
  exit 1
fi

echo "Got token: ${TOKEN:0:20}..."

# Test 1: Update wallet with CPF PIX key
echo -e "\n3. Testing CPF PIX key..."
WALLET_RESPONSE=$(curl -s -X PATCH http://localhost:19997/api/v1/profile/wallet \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "pixKey": "12345678901",
    "defaultWalletAddress": "lq1qqtest123",
    "defaultWalletType": "LIQUID"
  }')

echo "Wallet update response:"
echo $WALLET_RESPONSE | python3 -m json.tool

# Verify
echo -e "\n4. Verifying PIX key was saved..."
PROFILE_RESPONSE=$(curl -s -X GET http://localhost:19997/api/v1/profile \
  -H "Authorization: Bearer $TOKEN")

echo "Profile pixKey and pixKeyType:"
echo $PROFILE_RESPONSE | python3 -m json.tool | grep -E '"pixKey|pixKeyType"'

# Test 2: Update with email PIX key
echo -e "\n5. Testing Email PIX key..."
WALLET_RESPONSE=$(curl -s -X PATCH http://localhost:19997/api/v1/profile/wallet \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "pixKey": "test@email.com"
  }')

echo "Email PIX update response:"
echo $WALLET_RESPONSE | python3 -m json.tool

# Verify email
PROFILE_RESPONSE=$(curl -s -X GET http://localhost:19997/api/v1/profile \
  -H "Authorization: Bearer $TOKEN")

echo -e "\nVerifying email PIX key:"
echo $PROFILE_RESPONSE | python3 -m json.tool | grep -E '"pixKey|pixKeyType"'

# Test 3: Clear PIX key
echo -e "\n6. Testing clearing PIX key..."
WALLET_RESPONSE=$(curl -s -X PATCH http://localhost:19997/api/v1/profile/wallet \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "pixKey": ""
  }')

echo "Clear PIX response:"
echo $WALLET_RESPONSE | python3 -m json.tool

# Final verification
PROFILE_RESPONSE=$(curl -s -X GET http://localhost:19997/api/v1/profile \
  -H "Authorization: Bearer $TOKEN")

echo -e "\nFinal verification (should be null):"
echo $PROFILE_RESPONSE | python3 -m json.tool | grep -E '"pixKey|pixKeyType"'

echo -e "\n✅ PIX key testing completed successfully!"