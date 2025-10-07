#!/bin/bash

# Atlas Panel Period Filter Production Test
echo "🧪 Testing production-ready period filter functionality..."

# Test backend endpoint with period filtering
echo "📊 Testing admin transactions API with date filtering..."

# Get current date and calculate date ranges
TODAY=$(date '+%Y-%m-%d')
WEEK_AGO=$(date -d '7 days ago' '+%Y-%m-%d')
MONTH_AGO=$(date -d '30 days ago' '+%Y-%m-%d')

echo "📅 Date ranges:"
echo "   Today: $TODAY"
echo "   Week ago: $WEEK_AGO"
echo "   Month ago: $MONTH_AGO"

# Test API endpoints
echo ""
echo "🔍 Testing period filter API endpoints..."

# Test 7 days period
echo "Testing 7 days period (${WEEK_AGO} to ${TODAY}):"
curl -s "http://localhost:19997/api/v1/admin/transactions?type=DEPOSIT&limit=10&startDate=${WEEK_AGO}&endDate=${TODAY}" \
  -H "Content-Type: application/json" \
  | jq '.data | length' 2>/dev/null || echo "  ❌ API endpoint failed or no data"

# Test 30 days period
echo "Testing 30 days period (${MONTH_AGO} to ${TODAY}):"
curl -s "http://localhost:19997/api/v1/admin/transactions?type=DEPOSIT&limit=10&startDate=${MONTH_AGO}&endDate=${TODAY}" \
  -H "Content-Type: application/json" \
  | jq '.data | length' 2>/dev/null || echo "  ❌ API endpoint failed or no data"

# Test payment links endpoint
echo "Testing payment links API:"
curl -s "http://localhost:19997/api/v1/payment-links" \
  -H "Content-Type: application/json" \
  | jq '.data | length' 2>/dev/null || echo "  ❌ Payment links API failed or no data"

echo ""
echo "✅ Period filter production test completed!"
echo "💡 Note: API responses depend on actual data in database"
echo "🌐 Frontend period filter should now use only real API data"