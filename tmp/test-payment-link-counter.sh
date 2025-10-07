#!/bin/bash

# Test script to verify payment link counter updates

API_URL="http://localhost:19997"
echo "Testing Payment Link Counter Update"
echo "===================================="

# Step 1: Create a test payment link
echo -e "\n1. Creating payment link..."
PAYMENT_LINK_RESPONSE=$(curl -s -X POST "$API_URL/payment-links" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 100,
    "walletAddress": "lq1qqw508d6qejxtdg4y5r3zarvary0c5xw7kxqd6t",
    "description": "Test Payment Link"
  }')

echo "Response: $PAYMENT_LINK_RESPONSE"

# Extract shortCode from response
SHORT_CODE=$(echo "$PAYMENT_LINK_RESPONSE" | grep -o '"shortCode":"[^"]*' | cut -d'"' -f4)
PAYMENT_LINK_ID=$(echo "$PAYMENT_LINK_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

echo "Payment Link ID: $PAYMENT_LINK_ID"
echo "Short Code: $SHORT_CODE"

# Step 2: Generate QR Code
echo -e "\n2. Generating QR Code..."
QR_RESPONSE=$(curl -s -X POST "$API_URL/payment-links/$SHORT_CODE/qr-code" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "QR Code generated"

# Step 3: Get payment link details (check initial counters)
echo -e "\n3. Checking initial counters..."
LINK_DETAILS=$(curl -s -X GET "$API_URL/payment-links" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN")

echo "Payment Links: $LINK_DETAILS"

# Step 4: Simulate webhook (payment completion)
echo -e "\n4. Simulating payment completion webhook..."
WEBHOOK_RESPONSE=$(curl -s -X POST "$API_URL/webhooks/deposit" \
  -H "Content-Type: application/json" \
  -d '{
    "qrId": "test-transaction-id",
    "status": "depix_sent",
    "bankTxId": "test-bank-tx",
    "blockchainTxID": "test-blockchain-tx",
    "payerName": "Test Payer",
    "payerTaxNumber": "12345678900",
    "valueInCents": 10000
  }')

echo "Webhook response: $WEBHOOK_RESPONSE"

# Step 5: Check updated counters
echo -e "\n5. Checking updated counters..."
UPDATED_LINKS=$(curl -s -X GET "$API_URL/payment-links" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN")

echo "Updated Payment Links: $UPDATED_LINKS"

echo -e "\n===================================="
echo "Test complete. Check the totalPayments and totalAmount fields in the responses."
echo "Note: You need to replace YOUR_JWT_TOKEN with an actual JWT token from login."