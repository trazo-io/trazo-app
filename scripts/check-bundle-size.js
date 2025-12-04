#!/usr/bin/env node
/**
 * Bundle size check script for CI/CD pipeline
 * Ensures bundle sizes stay within acceptable limits
 */

const fs = require('fs');
const path = require('path');

// Bundle size limits (in bytes)
const BUNDLE_LIMITS = {
  'index.js': 500 * 1024, // 500KB for main bundle
  'vendor.js': 2 * 1024 * 1024, // 2MB for vendor bundle
  'index.css': 100 * 1024, // 100KB for CSS
  totalJS: 2.5 * 1024 * 1024 // 2.5MB total JS
};

// Color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function checkBundleSize() {
  const distPath = path.join(__dirname, '../dist');

  if (!fs.existsSync(distPath)) {
    log('red', 'Error: dist folder not found. Please run "npm run build" first.');
    process.exit(1);
  }

  log('blue', '📦 Checking bundle sizes...\n');

  const assets = fs.readdirSync(distPath);
  const bundleStats = {};
  let totalJSSize = 0;
  let hasErrors = false;

  // Analyze bundle files
  assets.forEach((file) => {
    const filePath = path.join(distPath, file);
    const stats = fs.statSync(filePath);

    if (stats.isFile()) {
      const size = stats.size;
      bundleStats[file] = size;

      // Track JS bundle sizes
      if (file.endsWith('.js')) {
        totalJSSize += size;
      }

      // Check individual file limits
      Object.keys(BUNDLE_LIMITS).forEach((pattern) => {
        if (pattern === 'totalJS') return; // Handle separately

        if (file.includes(pattern.replace('.js', '').replace('.css', ''))) {
          const limit = BUNDLE_LIMITS[pattern];
          const isOverLimit = size > limit;

          if (isOverLimit) {
            hasErrors = true;
            log('red', `❌ ${file}: ${formatBytes(size)} (exceeds ${formatBytes(limit)})`);
          } else {
            const percentage = ((size / limit) * 100).toFixed(1);
            const color = percentage > 80 ? 'yellow' : 'green';
            log(color, `✅ ${file}: ${formatBytes(size)} (${percentage}% of limit)`);
          }
        }
      });
    }
  });

  // Check total JS size
  const totalJSLimit = BUNDLE_LIMITS.totalJS;
  const isTotalOverLimit = totalJSSize > totalJSLimit;

  log('blue', `\n📊 Total JS bundle size: ${formatBytes(totalJSSize)}`);

  if (isTotalOverLimit) {
    hasErrors = true;
    log('red', `❌ Total JS size exceeds limit of ${formatBytes(totalJSLimit)}`);
  } else {
    const percentage = ((totalJSSize / totalJSLimit) * 100).toFixed(1);
    const color = percentage > 80 ? 'yellow' : 'green';
    log(color, `✅ Total JS size within limit (${percentage}% of ${formatBytes(totalJSLimit)})`);
  }

  // Performance recommendations
  log('blue', '\n💡 Performance Recommendations:');

  if (totalJSSize > 1.5 * 1024 * 1024) {
    // 1.5MB
    log('yellow', '  • Consider code splitting for better initial load performance');
  }

  const cssFiles = assets.filter((f) => f.endsWith('.css'));
  const totalCSSSize = cssFiles.reduce((sum, file) => {
    return sum + bundleStats[file];
  }, 0);

  if (totalCSSSize > 150 * 1024) {
    // 150KB
    log('yellow', '  • Consider CSS optimization and unused styles removal');
  }

  // Bundle composition analysis
  log('blue', '\n📈 Bundle Composition:');
  const sortedAssets = Object.entries(bundleStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10); // Top 10 largest files

  sortedAssets.forEach(([file, size]) => {
    const percentage = ((size / totalJSSize) * 100).toFixed(1);
    log('blue', `  ${file}: ${formatBytes(size)} (${percentage}%)`);
  });

  // Generate size report for CI
  const report = {
    timestamp: new Date().toISOString(),
    totalJSSize: totalJSSize,
    totalCSSSize: totalCSSSize,
    assets: bundleStats,
    limits: BUNDLE_LIMITS,
    passed: !hasErrors
  };

  fs.writeFileSync(
    path.join(__dirname, '../bundle-size-report.json'),
    JSON.stringify(report, null, 2)
  );

  log('blue', '\n📝 Bundle size report saved to bundle-size-report.json');

  // Exit with error if limits exceeded
  if (hasErrors) {
    log('red', '\n❌ Bundle size check failed! Some files exceed size limits.');
    process.exit(1);
  } else {
    log('green', '\n✅ Bundle size check passed! All files within limits.');
    process.exit(0);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Bundle Size Checker

Usage: node check-bundle-size.js [options]

Options:
  --help, -h     Show this help message
  --verbose, -v  Show detailed output

This script checks if the built bundle sizes are within acceptable limits.
Configure limits in the BUNDLE_LIMITS object at the top of this file.
`);
  process.exit(0);
}

checkBundleSize();
