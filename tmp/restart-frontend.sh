#!/bin/bash

# Atlas Panel Frontend Restart Script
# Fixes white screen and missing CSS issues

echo "🔧 Starting Atlas Panel frontend restart process..."

# 1. Kill all conflicting processes
echo "1️⃣ Killing conflicting processes..."
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "node.*next" 2>/dev/null || true
lsof -ti:11337 | xargs kill -9 2>/dev/null || true

# 2. Wait for termination
echo "2️⃣ Waiting for process termination..."
sleep 3

# 3. Aggressive cache cleanup
echo "3️⃣ Cleaning caches..."
cd "/Volumes/NEWATLAS/Drive/DEV/Atlas Painel/Atlas-Panel"
rm -rf .next
rm -rf node_modules/.cache
rm -rf .next/cache .next/server .next/static

# 4. Start fresh dev server
echo "4️⃣ Starting fresh dev server..."
npm run dev

echo "✅ Frontend restart complete!"
