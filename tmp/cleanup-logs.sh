#!/bin/bash

# Script to clean up console.log statements from production code
# This preserves legitimate logging with the Logger service

echo "🧹 Cleaning up console.log statements..."

# Find and clean console.log statements in TypeScript files
find "/Volumes/NEWATLAS/Drive/DEV/Atlas Painel" -name "*.ts" -not -path "*/node_modules/*" -not -path "*/test/*" -not -path "*/spec/*" | while read file; do
  # Count console.log statements
  log_count=$(grep -c "console\.log\|console\.warn\|console\.error\|console\.debug" "$file" 2>/dev/null || echo 0)

  if [ "$log_count" -gt 0 ]; then
    echo "Found $log_count console statements in: $file"

    # Create backup
    cp "$file" "$file.backup"

    # Remove console.log statements but preserve legitimate ones in test files
    if [[ "$file" != *".spec.ts" ]] && [[ "$file" != *".test.ts" ]] && [[ "$file" != *"seed.ts" ]]; then
      # Replace console.log with comments, preserving the message for reference
      sed -i '' 's/console\.log(/\/\/ DEBUG: console.log(/g' "$file"
      sed -i '' 's/console\.warn(/\/\/ WARN: console.warn(/g' "$file"
      sed -i '' 's/console\.error(/\/\/ ERROR: console.error(/g' "$file"
      sed -i '' 's/console\.debug(/\/\/ DEBUG: console.debug(/g' "$file"
    fi
  fi
done

echo "✅ Console cleanup completed"