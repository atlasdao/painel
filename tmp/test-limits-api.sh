#!/bin/bash

# Test script for user limits API with DePix integration

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API URL
API_URL="http://localhost:19997"

# Function to print colored output
print_color() {
    color=$1
    message=$2
    echo -e "${color}${message}${NC}"
}

# Test user credentials (you may need to adjust these)
TEST_USER_EMAIL="user@example.com"
TEST_USER_PASSWORD="password123"

# Step 1: Login to get JWT token
print_color "$YELLOW" "\n=== Step 1: Login to get JWT token ==="
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_USER_EMAIL}\",\"password\":\"${TEST_USER_PASSWORD}\"}")

# Check if login was successful
if echo "$LOGIN_RESPONSE" | grep -q "accessToken"; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken')
    USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.id')
    print_color "$GREEN" "✓ Login successful"
    print_color "$GREEN" "  User ID: $USER_ID"

    # Extract user info
    HAS_CPF=$(echo "$LOGIN_RESPONSE" | jq -r '.user.pixKey // "null"')
    PIX_KEY_TYPE=$(echo "$LOGIN_RESPONSE" | jq -r '.user.pixKeyType // "null"')

    if [ "$PIX_KEY_TYPE" = "CPF" ] && [ "$HAS_CPF" != "null" ]; then
        print_color "$GREEN" "  User has CPF configured: ${HAS_CPF:0:3}***"
    else
        print_color "$YELLOW" "  User does not have CPF configured for DePix"
    fi
else
    print_color "$RED" "✗ Login failed. Please check credentials."
    print_color "$RED" "Response: $LOGIN_RESPONSE"
    exit 1
fi

# Step 2: Fetch user limits
print_color "$YELLOW" "\n=== Step 2: Fetching User Limits ==="
LIMITS_RESPONSE=$(curl -s -X GET "${API_URL}/api/profile/limits" \
  -H "Authorization: Bearer ${TOKEN}")

# Check if request was successful
if echo "$LIMITS_RESPONSE" | jq -e '.limits' > /dev/null 2>&1; then
    print_color "$GREEN" "✓ Limits fetched successfully"

    # Display platform limits
    print_color "$YELLOW" "\n📊 Platform Limits:"
    echo "$LIMITS_RESPONSE" | jq '.limits.daily'

    # Check for personal DePix limits
    if echo "$LIMITS_RESPONSE" | jq -e '.limits.dailyPersonal' > /dev/null 2>&1; then
        print_color "$YELLOW" "\n🔐 Personal DePix Limits:"
        echo "$LIMITS_RESPONSE" | jq '.limits.dailyPersonal'
    else
        print_color "$YELLOW" "\n⚠️ No personal DePix limits available"
    fi

    # Display status
    STATUS=$(echo "$LIMITS_RESPONSE" | jq -r '.status')
    print_color "$YELLOW" "\n📊 Overall Status: $STATUS"

else
    print_color "$RED" "✗ Failed to fetch limits"
    print_color "$RED" "Response: $LIMITS_RESPONSE"
fi

print_color "$GREEN" "\n=== Test Complete ==="
