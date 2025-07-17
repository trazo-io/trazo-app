#!/usr/bin/env node

/**
 * Migration script to help identify Image components that should use S3Image
 * 
 * Usage: node src/scripts/migrateToS3Image.js
 */

const fs = require('fs');
const path = require('path');

// Files to search
const searchDirectories = [
  'src/views',
  'src/components'
];

// Pattern to find Image components
const imagePatterns = [
  /<Image\s+[^>]*src=\{[^}]*\.image[^}]*\}[^>]*>/g,
  /<Image\s+[^>]*src=\{[^}]*establishment[^}]*\}[^>]*>/g,
  /<Image\s+[^>]*src=\{[^}]*user[^}]*\}[^>]*>/g,
  /<Image\s+[^>]*src=\{[^}]*product[^}]*\}[^>]*>/g,
];

// Results
let foundFiles = [];
let totalMatches = 0;

function searchFiles(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      searchFiles(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      const content = fs.readFileSync(filePath, 'utf8');
      const matches = [];
      
      imagePatterns.forEach(pattern => {
        const found = content.match(pattern);
        if (found) {
          matches.push(...found);
        }
      });
      
      if (matches.length > 0) {
        foundFiles.push({
          file: filePath,
          matches: matches,
          count: matches.length
        });
        totalMatches += matches.length;
      }
    }
  });
}

console.log('🔍 Searching for Image components that may need S3Image migration...\n');

searchDirectories.forEach(dir => {
  if (fs.existsSync(dir)) {
    searchFiles(dir);
  }
});

console.log(`📊 Found ${totalMatches} potential Image components in ${foundFiles.length} files:\n`);

foundFiles.forEach(({ file, matches, count }) => {
  console.log(`📄 ${file} (${count} matches)`);
  matches.forEach(match => {
    console.log(`   ${match.substring(0, 100)}...`);
  });
  console.log('');
});

if (foundFiles.length > 0) {
  console.log('🚀 Migration recommendations:');
  console.log('1. Replace <Image> with <S3Image> for S3 URLs');
  console.log('2. Add fallbackSrc prop for better UX');
  console.log('3. Import: import { S3Image } from "components/Design"');
  console.log('4. Test with your S3 images');
  console.log('\n📖 See README.md for detailed migration guide');
} else {
  console.log('✅ No Image components found that obviously need migration');
}

console.log('\n🔧 Manual check needed for:');
console.log('- Image components with dynamic src props');
console.log('- Images in data arrays/maps');
console.log('- Conditional image rendering');