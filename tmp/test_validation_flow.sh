#!/bin/bash

# Validation Flow Testing Script
# This script helps verify that the validation payment system is working correctly

echo "🔍 ATLAS PAINEL - VALIDATION SYSTEM TEST"
echo "========================================"
echo

# Check if both services are running
echo "1. Checking service status..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:19997/api/v1/account-validation/requirements)
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:11337)

if [ "$BACKEND_STATUS" = "200" ]; then
    echo "✅ Backend API (port 19997): RUNNING"
else
    echo "❌ Backend API (port 19997): NOT RESPONDING (HTTP $BACKEND_STATUS)"
    echo "   Please start backend: cd Atlas-API && PORT=19997 npm run start:dev"
    exit 1
fi

if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Frontend (port 11337): RUNNING"
else
    echo "❌ Frontend (port 11337): NOT RESPONDING (HTTP $FRONTEND_STATUS)"
    echo "   Please start frontend: cd Atlas-Panel && npm run dev"
    exit 1
fi

echo

# Test validation requirements endpoint
echo "2. Testing validation requirements..."
REQUIREMENTS=$(curl -s http://localhost:19997/api/v1/account-validation/requirements)
if echo "$REQUIREMENTS" | grep -q "amount"; then
    AMOUNT=$(echo "$REQUIREMENTS" | grep -o '"amount":[0-9]*' | grep -o '[0-9]*')
    echo "✅ Validation requirements endpoint working"
    echo "   Validation amount: R$ $AMOUNT,00"
else
    echo "❌ Validation requirements endpoint failed"
    echo "   Response: $REQUIREMENTS"
fi

echo

# Check for common issues
echo "3. Checking for common issues..."

# Check if multiple Node processes are running
NODE_PROCESSES=$(ps aux | grep "node" | grep -v grep | wc -l)
if [ "$NODE_PROCESSES" -gt 4 ]; then
    echo "⚠️  Warning: Multiple Node processes detected ($NODE_PROCESSES)"
    echo "   This might cause conflicts. Consider restarting services."
else
    echo "✅ Node processes count normal ($NODE_PROCESSES)"
fi

# Check ports
BACKEND_PID=$(lsof -ti:19997)
FRONTEND_PID=$(lsof -ti:11337)

if [ -n "$BACKEND_PID" ]; then
    echo "✅ Backend correctly using port 19997 (PID: $BACKEND_PID)"
else
    echo "❌ No process listening on port 19997"
fi

if [ -n "$FRONTEND_PID" ]; then
    echo "✅ Frontend correctly using port 11337 (PID: $FRONTEND_PID)"
else
    echo "❌ No process listening on port 11337"
fi

echo

# User testing instructions
echo "4. MANUAL TESTING INSTRUCTIONS:"
echo "==============================="
echo
echo "Step 1: Clear browser cache"
echo "  • Chrome/Edge: Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)"
echo "  • Firefox: Ctrl+Shift+Del (Windows) or Cmd+Shift+Del (Mac)"
echo "  • Or use Incognito/Private mode"
echo
echo "Step 2: Open browser developer tools"
echo "  • Press F12 or Ctrl+Shift+I (Windows) or Cmd+Option+I (Mac)"
echo "  • Go to Network tab"
echo "  • Check 'Preserve log' option"
echo
echo "Step 3: Navigate to validation"
echo "  • Go to: http://localhost:11337/deposit"
echo "  • Look for yellow button 'Validar Conta por R$ $AMOUNT,00'"
echo "  • DO NOT use the regular deposit form"
echo
echo "Step 4: Test validation payment"
echo "  • Click the yellow 'Validar Conta' button"
echo "  • In the modal, click 'Gerar QR Code'"
echo "  • Watch the Network tab in browser dev tools"
echo
echo "✅ EXPECTED NETWORK CALLS FOR VALIDATION:"
echo "  POST /api/v1/account-validation/create-payment"
echo
echo "❌ INCORRECT NETWORK CALLS (should NOT happen):"
echo "  POST /api/v1/pix/qrcode"
echo
echo "Step 5: Test regular deposit (for comparison)"
echo "  • Fill in the deposit form with amount and wallet"
echo "  • Click 'Gerar QR Code PIX' (blue button)"
echo "  • Watch the Network tab"
echo
echo "✅ EXPECTED NETWORK CALLS FOR REGULAR DEPOSIT:"
echo "  POST /api/v1/pix/qrcode"
echo
echo "============================================"
echo "🔍 DEBUGGING TIPS:"
echo "============================================"
echo
echo "If you see wrong API calls:"
echo "1. Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)"
echo "2. Clear browser cache and cookies completely"
echo "3. Try in incognito/private mode"
echo "4. Check console for errors (Console tab in dev tools)"
echo
echo "If validation fails with 'invalid tax number':"
echo "1. This confirms you're hitting PIX service directly"
echo "2. The validation service should bypass this check"
echo "3. Make sure you're using the yellow validation button"
echo
echo "If you need authentication:"
echo "1. Go to http://localhost:11337/login"
echo "2. Log in with your credentials"
echo "3. Then test validation flow"
echo
echo "============================================"
echo "📧 REPORT RESULTS:"
echo "============================================"
echo
echo "Please share:"
echo "1. Screenshot of Network tab showing API calls"
echo "2. Any console errors"
echo "3. Which button you clicked (validation vs regular deposit)"
echo "4. Browser and version being used"
echo
echo "Test completed! Follow the manual steps above."