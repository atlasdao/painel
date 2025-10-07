#!/usr/bin/env node

/**
 * Dependency checker script to prevent missing dependencies causing white screens
 * Run this before commits or builds to ensure all required packages are installed
 */

const fs = require('fs');
const path = require('path');

// List of icon libraries and their recommended replacements
const ICON_PACKAGES = {
  '@heroicons/react': 'lucide-react', // lucide-react is already in the project
  'react-icons': 'lucide-react',
  '@fortawesome/react-fontawesome': 'lucide-react',
};

// Essential packages that must be installed
const REQUIRED_PACKAGES = [
  'react',
  'react-dom',
  'next',
  'lucide-react',
  'framer-motion',
  'react-hot-toast',
];

function checkPackageJson() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const installedDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  const errors = [];
  const warnings = [];

  // Check for required packages
  REQUIRED_PACKAGES.forEach(pkg => {
    if (!installedDeps[pkg]) {
      errors.push(`❌ Missing required package: ${pkg}`);
    }
  });

  // Warn about icon packages that should use lucide-react instead
  Object.keys(ICON_PACKAGES).forEach(pkg => {
    if (installedDeps[pkg]) {
      warnings.push(
        `⚠️  Found ${pkg} - consider using ${ICON_PACKAGES[pkg]} instead for consistency`
      );
    }
  });

  return { errors, warnings };
}

function scanForImports() {
  const componentsDir = path.join(process.cwd(), 'app');
  const issues = [];

  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        scanDirectory(filePath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');

        // Check for problematic imports
        Object.keys(ICON_PACKAGES).forEach(pkg => {
          if (content.includes(`from '${pkg}'`) || content.includes(`from "${pkg}"`)) {
            issues.push({
              file: path.relative(process.cwd(), filePath),
              package: pkg,
              suggestion: ICON_PACKAGES[pkg],
            });
          }
        });
      }
    });
  }

  scanDirectory(componentsDir);
  return issues;
}

function main() {
  console.log('🔍 Checking dependencies...\n');

  // Check package.json
  const { errors, warnings } = checkPackageJson();

  // Scan for problematic imports
  const importIssues = scanForImports();

  // Report results
  if (errors.length > 0) {
    console.log('❌ ERRORS FOUND:\n');
    errors.forEach(error => console.log('  ' + error));
    console.log('\nRun: npm install <package-name> to fix\n');
  }

  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:\n');
    warnings.forEach(warning => console.log('  ' + warning));
    console.log('');
  }

  if (importIssues.length > 0) {
    console.log('📦 IMPORT ISSUES FOUND:\n');
    importIssues.forEach(issue => {
      console.log(`  File: ${issue.file}`);
      console.log(`    Using: ${issue.package}`);
      console.log(`    Suggest: Use ${issue.suggestion} instead\n`);
    });
  }

  if (errors.length === 0 && warnings.length === 0 && importIssues.length === 0) {
    console.log('✅ All dependencies look good!');
  }

  // Exit with error code if there are errors
  process.exit(errors.length > 0 ? 1 : 0);
}

main();