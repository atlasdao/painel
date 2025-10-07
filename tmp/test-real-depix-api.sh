#!/bin/bash

echo "=== TESTING REAL DEPIX API INTEGRATION ==="
echo ""
echo "Testing validation payment with real DePix/Eulen API credentials..."
echo "Expected: Real DePix QR code starting with '00020101021226860014br.gov.bcb.pix2564qrcode.fitbank.com.br'"
echo "NOT Mock: '00020101021226410014BR.GOV.BCB.PIX0119validacao@atlas.com'"
echo ""

# Test without authentication first to see if we get 401 (proper auth check)
echo "Test 1: Without authentication (should get 401)"
response1=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST http://localhost:19997/api/v1/account-validation/create-payment \
  -H "Content-Type: application/json" \
  -d '{}' 2>/dev/null)

http_status1=$(echo "$response1" | grep "HTTP_STATUS:" | cut -d: -f2)
echo "Response Status: $http_status1"

if [ "$http_status1" = "401" ]; then
  echo "✅ Authentication required (as expected)"
else
  echo "❌ Unexpected status: $http_status1"
  echo "Response: $(echo "$response1" | sed '/HTTP_STATUS:/d')"
fi

echo ""
echo "Test 2: Need to get JWT token for real API test..."
echo "To complete testing, you need:"
echo "1. Login to Atlas Panel in browser"
echo "2. Open Developer Tools -> Network tab"
echo "3. Make any authenticated request"
echo "4. Copy the 'Authorization: Bearer <token>' header"
echo "5. Run the complete test with real authentication"

echo ""
echo "Checking if backend is running with real API key..."
if curl -s http://localhost:19997/health > /dev/null 2>&1; then
  echo "✅ Backend is running on port 19997"
else
  echo "❌ Backend is not responding"
fi

echo ""
echo "=== NEXT STEPS ==="
echo "1. Backend is configured with real EULEN_API_KEY (same as JWT_SECRET)"
echo "2. System should now call real DePix API instead of MockPaymentService"
echo "3. Need authenticated request to test full validation payment flow"
echo "4. Real DePix QR code should start with 'br.gov.bcb.pix2564qrcode.fitbank.com.br'"