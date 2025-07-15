#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== CSS BUILD COMPARISON DEBUG SCRIPT ===\n');

// Function to extract CSS rules related to cards
function extractCardCSS(cssContent) {
  const cardRules = [];
  
  // Split by CSS rules
  const rules = cssContent.split('}').map(rule => rule.trim() + '}');
  
  for (const rule of rules) {
    if (rule.includes('css-') || 
        rule.includes('card') || 
        rule.includes('Card') ||
        rule.includes('establishment') ||
        rule.includes('border-radius') ||
        rule.includes('borderRadius') ||
        rule.includes('box-shadow') ||
        rule.includes('boxShadow') ||
        rule.includes('background-color') ||
        rule.includes('backgroundColor')) {
      cardRules.push(rule);
    }
  }
  
  return cardRules;
}

// Function to analyze production build CSS
function analyzeProductionBuild() {
  console.log('📦 ANALYZING PRODUCTION BUILD CSS...');
  
  const distPath = path.join(__dirname, 'dist', 'assets');
  
  if (!fs.existsSync(distPath)) {
    console.log('❌ No dist folder found. Running production build...');
    return null;
  }
  
  const cssFiles = fs.readdirSync(distPath).filter(file => file.endsWith('.css'));
  
  if (cssFiles.length === 0) {
    console.log('❌ No CSS files found in dist/assets');
    return null;
  }
  
  const cssFile = cssFiles[0];
  const cssPath = path.join(distPath, cssFile);
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  
  console.log(`✅ Found production CSS: ${cssFile}`);
  console.log(`📏 Size: ${Math.round(cssContent.length / 1024)}KB`);
  
  return extractCardCSS(cssContent);
}

// Function to check what CSS rules are actually being generated
function checkCSSRules() {
  const prodRules = analyzeProductionBuild();
  
  if (!prodRules) {
    console.log('❌ Could not analyze production build');
    return;
  }
  
  console.log('\n🔍 CARD-RELATED CSS RULES FOUND:');
  console.log('=====================================');
  
  let cardRulesFound = 0;
  let borderRadiusRules = 0;
  let backgroundRules = 0;
  let boxShadowRules = 0;
  
  for (const rule of prodRules) {
    if (rule.includes('css-1gqj9o0') || rule.includes('css-1x7hccm') || rule.includes('css-1wv0n0i')) {
      console.log(`\n🎯 CARD RULE: ${rule.substring(0, 100)}...`);
      cardRulesFound++;
    }
    
    if (rule.includes('border-radius') || rule.includes('borderRadius')) {
      borderRadiusRules++;
    }
    
    if (rule.includes('background-color') || rule.includes('backgroundColor')) {
      backgroundRules++;
    }
    
    if (rule.includes('box-shadow') || rule.includes('boxShadow')) {
      boxShadowRules++;
    }
  }
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`   Card rules found: ${cardRulesFound}`);
  console.log(`   Border radius rules: ${borderRadiusRules}`);
  console.log(`   Background rules: ${backgroundRules}`);
  console.log(`   Box shadow rules: ${boxShadowRules}`);
  
  // Check for specific classes
  const cssContent = fs.readFileSync(path.join(__dirname, 'dist', 'assets', fs.readdirSync(path.join(__dirname, 'dist', 'assets')).filter(f => f.endsWith('.css'))[0]), 'utf8');
  
  console.log(`\n🔍 SPECIFIC CLASS CHECKS:`);
  console.log(`   .css-1gqj9o0 found: ${cssContent.includes('.css-1gqj9o0')}`);
  console.log(`   .css-1x7hccm found: ${cssContent.includes('.css-1x7hccm')}`);
  console.log(`   .css-1wv0n0i found: ${cssContent.includes('.css-1wv0n0i')}`);
  console.log(`   border-radius:15px found: ${cssContent.includes('border-radius:15px')}`);
  console.log(`   !important rules: ${(cssContent.match(/!important/g) || []).length}`);
}

// Run the analysis
checkCSSRules();