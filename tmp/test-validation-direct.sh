#!/bin/bash

echo "=== Testing Validation Payment Creation ==="
echo ""

# Test requirements first
echo "1. Testing validation requirements endpoint..."
curl -s http://localhost:19997/api/v1/account-validation/requirements | jq '.'

echo ""
echo "2. Testing validation payment creation (will fail without auth)..."

# Try to create validation payment (will fail without auth token)
curl -X POST http://localhost:19997/api/v1/account-validation/create-payment \
  -H "Content-Type: application/json" \
  -d '{
    "depixAddress": "lq1qqw4x6h2eeg9dz8gvyz7kppq0s5rjf8h4f3dvv8x7uuq3h6k5u3jhsj2rn7t8e5c7c8k3r2q9p6s5d8f7e6t4y3u2i1o0"
  }' \
  -w "\nHTTP Status: %{http_code}\n" | jq '.' 2>/dev/null || cat

echo ""
echo "Note: The above test should fail with 401 Unauthorized (expected)"
echo "To test with authentication, you need to get a JWT token from the browser"
echo ""
echo "Steps to test properly:"
echo "1. Open browser developer tools (F12)"
echo "2. Go to Network tab"
echo "3. Login to the application"
echo "4. Find any API request and copy the Authorization header"
echo "5. Run: curl -X POST http://localhost:19997/api/v1/account-validation/create-payment -H 'Authorization: Bearer YOUR_TOKEN' -H 'Content-Type: application/json' -d '{\"depixAddress\": \"YOUR_DEPIX_ADDRESS\"}'"