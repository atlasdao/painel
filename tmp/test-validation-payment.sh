#!/bin/bash

# Test Validation Payment Creation
echo "🧪 Testing Validation Payment Creation..."

# Check if backend is running
if ! lsof -i :19997 >/dev/null 2>&1; then
    echo "❌ Backend is not running on port 19997"
    echo "Please start the backend with: cd Atlas-API && PORT=19997 npm run start:dev"
    exit 1
fi

echo "✅ Backend is running on port 19997"

# Test the validation payment endpoint directly
echo "📝 Testing validation payment endpoint..."

# First, get a valid JWT token (you may need to adjust this for your test user)
echo "🔑 Testing with validation payment creation..."

# Test validation payment creation with curl
curl -X POST "http://localhost:19997/api/v1/account-validation/create-payment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "depixAddress": "VJL7M4PGaLjxJ6Q4o1Y8fz8xg9W5J2kM8qA7hR3cN1x2B4v6"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "🔍 Check the backend logs for detailed information about the request processing"
echo "🔧 If authentication fails, this is expected with test tokens"
echo "🔄 The system should fall back to development mode mock responses"