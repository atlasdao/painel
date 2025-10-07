#!/bin/bash

echo "🧪 Testing Avatar Upload Fix"
echo "================================================"

# Get auth token first
echo "🔐 Getting auth token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:19997/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrUsername": "admin@atlas.com",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to get auth token"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Got auth token: ${TOKEN:0:20}..."

# Create a small test image (base64) - this matches what frontend now sends
echo "📷 Creating test image data URL (complete format)..."
# This is a tiny 1x1 PNG image in complete data URL format
TEST_IMAGE_DATA_URL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

echo "📤 Testing avatar upload with complete data URL format..."
UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:19997/api/v1/profile/avatar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"avatarData\": \"$TEST_IMAGE_DATA_URL\",
    \"mimeType\": \"image/png\"
  }")

echo "📝 Upload Response:"
echo $UPLOAD_RESPONSE | jq .

# Check if upload was successful
SUCCESS=$(echo $UPLOAD_RESPONSE | jq -r '.success // false')
if [ "$SUCCESS" = "true" ]; then
  echo "🎉 Avatar upload successful! Bug is FIXED!"
else
  echo "❌ Avatar upload failed"
  echo "Error details:"
  echo $UPLOAD_RESPONSE | jq -r '.error // .message // "Unknown error"'
fi

echo "================================================"
echo "🏁 Test completed"