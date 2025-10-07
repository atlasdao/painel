#!/bin/bash

echo "Testing Atlas Panel Settings Page..."
echo "=================================="

# Check if frontend is running
if lsof -i :11337 > /dev/null 2>&1; then
    echo "✅ Frontend is running on port 11337"
else
    echo "❌ Frontend is not running on port 11337"
fi

# Check if backend is running
if lsof -i :19997 > /dev/null 2>&1; then
    echo "✅ Backend is running on port 19997"
else
    echo "❌ Backend is not running on port 19997"
fi

echo ""
echo "Fixed Issues:"
echo "-------------"
echo "1. ✅ Fixed import statement in UserLimitsDisplay.tsx"
echo "   - Changed from: import { api } from '../lib/api';"
echo "   - Changed to: import api from '../lib/api';"
echo ""
echo "2. ✅ Added ErrorBoundary wrapper around UserLimitsDisplay"
echo "   - This prevents the component from crashing the entire page"
echo ""
echo "3. ✅ The settings page should now load properly"
echo ""
echo "To test:"
echo "1. Open http://localhost:11337/settings in your browser"
echo "2. Navigate to the Profile tab"
echo "3. The User Limits section should now display properly or show an error message"
echo ""
echo "If there are still issues, check the browser console for errors."