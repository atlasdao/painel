#!/bin/bash

echo "🔍 Debugging Avatar UI Issue"
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

# First, check current profile
echo "📋 Checking current profile..."
PROFILE_RESPONSE=$(curl -s -X GET http://localhost:19997/api/v1/auth/profile \
  -H "Authorization: Bearer $TOKEN")

echo "Current profile picture length: $(echo $PROFILE_RESPONSE | jq -r '.profilePicture | length // 0')"

# Upload a new avatar
echo "📤 Uploading new avatar..."
TEST_IMAGE_DATA_URL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:19997/api/v1/profile/avatar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"avatarData\": \"$TEST_IMAGE_DATA_URL\",
    \"mimeType\": \"image/png\"
  }")

echo "Upload response:"
echo $UPLOAD_RESPONSE | jq .

# Check profile again immediately after upload
echo "📋 Checking profile after upload..."
PROFILE_AFTER_RESPONSE=$(curl -s -X GET http://localhost:19997/api/v1/auth/profile \
  -H "Authorization: Bearer $TOKEN")

echo "New profile picture length: $(echo $PROFILE_AFTER_RESPONSE | jq -r '.profilePicture | length // 0')"

# Compare the uploaded data
UPLOADED_PICTURE=$(echo $UPLOAD_RESPONSE | jq -r '.profilePicture')
PROFILE_PICTURE=$(echo $PROFILE_AFTER_RESPONSE | jq -r '.profilePicture')

if [ "$UPLOADED_PICTURE" = "$PROFILE_PICTURE" ]; then
  echo "✅ Profile picture matches upload response"
else
  echo "❌ Profile picture mismatch!"
  echo "Upload response length: ${#UPLOADED_PICTURE}"
  echo "Profile response length: ${#PROFILE_PICTURE}"
fi

echo "================================================"
echo "🏁 Debug completed"