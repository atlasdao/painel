#!/bin/bash

# Test PIX key update

echo "Testing PIX key update..."

# First login to get token
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:19997/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername": "admin", "password": "admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | grep -o '[^"]*$')

if [ -z "$TOKEN" ]; then
  echo "Failed to get token. Login response:"
  echo $LOGIN_RESPONSE
  exit 1
fi

echo "Got token: ${TOKEN:0:20}..."

# Now update wallet with PIX key
echo -e "\n2. Updating wallet with PIX key (CPF)..."
WALLET_RESPONSE=$(curl -s -X PATCH http://localhost:19997/api/v1/profile/wallet \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "pixKey": "12345678901",
    "defaultWalletAddress": "lq1qqtest",
    "defaultWalletType": "LIQUID"
  }')

echo "Wallet update response:"
echo $WALLET_RESPONSE | python3 -m json.tool

# Get profile to verify
echo -e "\n3. Getting profile to verify PIX key was saved..."
PROFILE_RESPONSE=$(curl -s -X GET http://localhost:19997/api/v1/profile \
  -H "Authorization: Bearer $TOKEN")

echo "Profile response (checking pixKey field):"
echo $PROFILE_RESPONSE | python3 -m json.tool | grep -A2 -B2 "pixKey"