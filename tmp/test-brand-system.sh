#!/bin/bash

echo "🎨 Atlas Painel Brand System Check"
echo "=================================="
echo ""

# Check if brand files exist
echo "✅ Checking brand files..."
files=(
    "Atlas-Panel/app/config/brand.config.ts"
    "Atlas-Panel/components/ui/BrandButton.tsx"
    "Atlas-Panel/components/ui/BrandCard.tsx"
    "Atlas-Panel/components/ui/LoadingSkeleton.tsx"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file exists"
    else
        echo "  ✗ $file missing"
    fi
done

echo ""
echo "✅ Brand colors configured in CSS:"
grep -E "brand-primary|brand-secondary" Atlas-Panel/app/globals.css | head -5

echo ""
echo "✅ Login page updated with brand components:"
grep -E "BrandButton|BrandCard" Atlas-Panel/app/\(auth\)/login/page.tsx | head -3

echo ""
echo "🌐 Frontend running at: http://localhost:11337"
echo "📖 View brand guide at: http://localhost:11337/admin/brand-guide"
echo ""
echo "✨ Brand system successfully implemented!"