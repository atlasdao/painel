#!/bin/bash

echo "1. Logging in..."
RESPONSE=$(curl -s -X POST http://localhost:19997/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername":"admin@atlas.com","password":"admin123"}')

TOKEN=$(echo $RESPONSE | grep -o '"accessToken":"[^"]*' | sed 's/"accessToken":"//')

if [ -z "$TOKEN" ]; then
  echo "Failed to login. Response:"
  echo $RESPONSE | python3 -m json.tool
  exit 1
fi

echo "2. Login successful. Token obtained."
echo ""
echo "3. Testing /api/v1/profile/limits endpoint..."
curl -X GET http://localhost:19997/api/v1/profile/limits \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool