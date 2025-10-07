#!/bin/bash

echo "🔄 QR Code Generation Test Suite"
echo "================================="
echo ""

# Test credentials
EMAIL="admin"
PASSWORD="admin123"

# Step 1: Login
echo "📝 Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:19997/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"emailOrUsername\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Login failed. Response:"
    echo $LOGIN_RESPONSE
    exit 1
fi

echo "✅ Login successful"
echo ""

# Step 2: Test validation WITHOUT depixAddress (should use system default)
echo "📝 Step 2: Testing validation WITHOUT depixAddress..."
echo "Request payload: {}"
echo ""

VALIDATION_RESPONSE=$(curl -s -X POST http://localhost:19997/api/v1/account-validation/create-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}')

echo "Response:"
echo $VALIDATION_RESPONSE | python3 -m json.tool 2>/dev/null || echo $VALIDATION_RESPONSE
echo ""

# Check for QR code in response
if echo $VALIDATION_RESPONSE | grep -q '"qrCode"'; then
    QR_CODE=$(echo $VALIDATION_RESPONSE | grep -o '"qrCode":"[^"]*' | cut -d'"' -f4)
    echo "🎯 QR Code found!"
    echo "📊 QR Code length: ${#QR_CODE}"
    echo "📊 QR Code preview: ${QR_CODE:0:100}..."

    # Check QR code type
    if [[ $QR_CODE == *"mock-development-qr-code"* ]]; then
        echo "⚠️  MOCK QR CODE DETECTED"
    elif [[ $QR_CODE == *"qrcode.fitbank.com.br"* ]]; then
        echo "✅ REAL DEPIX QR CODE URL DETECTED"
    elif [[ $QR_CODE == *"00020101021226"* ]]; then
        echo "✅ REAL PIX QR CODE FORMAT DETECTED"
    else
        echo "❓ UNKNOWN QR CODE FORMAT"
    fi
else
    echo "❌ No QR code in response"
fi

echo ""
echo "================================="
echo "Test completed!"