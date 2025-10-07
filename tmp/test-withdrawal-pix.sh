#!/bin/bash

echo "Testing withdrawal PIX key functionality..."

# Create test users
echo -e "\n1. Creating test users..."

# User 1: with saved PIX key
USER1_RESPONSE=$(curl -s -X POST http://localhost:19997/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "userwithpix@test.com",
    "username": "userwithpix",
    "password": "Test123!@#"
  }')
TOKEN1=$(echo $USER1_RESPONSE | grep -o '"accessToken":"[^"]*' | grep -o '[^"]*$')

# User 2: without saved PIX key
USER2_RESPONSE=$(curl -s -X POST http://localhost:19997/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usernopix@test.com",
    "username": "usernopix",
    "password": "Test123!@#"
  }')
TOKEN2=$(echo $USER2_RESPONSE | grep -o '"accessToken":"[^"]*' | grep -o '[^"]*$')

echo "Users created successfully"

# Save PIX key for User 1
echo -e "\n2. Saving PIX key for User 1..."
curl -s -X PATCH http://localhost:19997/api/v1/profile/wallet \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN1" \
  -d '{
    "pixKey": "user1@example.com"
  }' | python3 -m json.tool

# Test 1: User with saved PIX key
echo -e "\n3. Testing withdrawal for user WITH saved PIX key..."
echo "   Getting user profile to check saved PIX..."
PROFILE1=$(curl -s -X GET http://localhost:19997/api/v1/profile \
  -H "Authorization: Bearer $TOKEN1")
echo "   User 1 PIX key: $(echo $PROFILE1 | grep -o '"pixKey":"[^"]*' | grep -o '[^"]*$')"
echo "   User 1 PIX type: $(echo $PROFILE1 | grep -o '"pixKeyType":"[^"]*' | grep -o '[^"]*$')"

# Test 2: User without saved PIX key - save during withdrawal
echo -e "\n4. Testing withdrawal for user WITHOUT saved PIX key..."
echo "   Creating withdrawal with savePixKey=true..."

WITHDRAWAL_RESPONSE=$(curl -s -X POST http://localhost:19997/api/v1/withdrawals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN2" \
  -d '{
    "amount": 150,
    "method": "PIX",
    "pixKey": "12345678901",
    "pixKeyType": "CPF",
    "savePixKey": true
  }')

echo "   Withdrawal response:"
echo $WITHDRAWAL_RESPONSE | python3 -m json.tool

# Check if PIX key was saved
echo -e "\n5. Verifying PIX key was saved to User 2 profile..."
PROFILE2=$(curl -s -X GET http://localhost:19997/api/v1/profile \
  -H "Authorization: Bearer $TOKEN2")
echo "   User 2 PIX key: $(echo $PROFILE2 | grep -o '"pixKey":"[^"]*' | grep -o '[^"]*$')"
echo "   User 2 PIX type: $(echo $PROFILE2 | grep -o '"pixKeyType":"[^"]*' | grep -o '[^"]*$')"

# Test 3: User 1 using different PIX key (not saving)
echo -e "\n6. Testing User 1 with different PIX key (not saving)..."
WITHDRAWAL2_RESPONSE=$(curl -s -X POST http://localhost:19997/api/v1/withdrawals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN1" \
  -d '{
    "amount": 200,
    "method": "PIX",
    "pixKey": "differentkey@test.com",
    "pixKeyType": "EMAIL",
    "savePixKey": false
  }')

echo "   Withdrawal created with different key:"
echo $WITHDRAWAL2_RESPONSE | python3 -m json.tool

# Verify original PIX key is still saved
echo -e "\n7. Verifying User 1 still has original PIX key..."
PROFILE1_AFTER=$(curl -s -X GET http://localhost:19997/api/v1/profile \
  -H "Authorization: Bearer $TOKEN1")
echo "   User 1 PIX key (should be unchanged): $(echo $PROFILE1_AFTER | grep -o '"pixKey":"[^"]*' | grep -o '[^"]*$')"

# Get withdrawal history
echo -e "\n8. Getting withdrawal history..."
echo "   User 1 withdrawals:"
curl -s -X GET http://localhost:19997/api/v1/withdrawals \
  -H "Authorization: Bearer $TOKEN1" | python3 -m json.tool | grep -E '"method"|"pixKey"|"amount"' | head -10

echo "   User 2 withdrawals:"
curl -s -X GET http://localhost:19997/api/v1/withdrawals \
  -H "Authorization: Bearer $TOKEN2" | python3 -m json.tool | grep -E '"method"|"pixKey"|"amount"' | head -10

echo -e "\n✅ Testing completed!"