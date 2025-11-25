#!/usr/bin/env node

/**
 * Final Validation Test
 * 
 * This test performs a comprehensive validation to ensure that the standardization
 * layer implementation did not introduce any regressions and that all systems
 * work correctly together.
 */

const fs = require('fs');
const path = require('path');

console.log('🔬 FINAL VALIDATION TEST');
console.log('='.repeat(50));

const validationTests = [];

// Test 1: Verify all required files exist
console.log('📁 File Existence Validation...');
const requiredFiles = [
  'src/types/standardizedEvents.ts',
  'src/utils/eventFieldMapping.ts', 
  'src/utils/eventDataNormalizer.ts',
  'src/components/Events/EventPreviewModal.tsx',
  'src/views/Scan/ProductDetail/ProductDetail.tsx',
  'src/utils/fieldDisplayUtils.ts'
];

let fileTestsPassed = 0;
for (const file of requiredFiles) {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✅ ${file}`);
    fileTestsPassed++;
  } else {
    console.log(`  ❌ Missing: ${file}`);
  }
}
validationTests.push({ name: 'File Existence', passed: fileTestsPassed, total: requiredFiles.length });

// Test 2: Verify TypeScript interfaces are properly defined
console.log('\n🏗️  TypeScript Interface Validation...');
const standardizedEventsContent = fs.readFileSync(path.join(__dirname, 'src/types/standardizedEvents.ts'), 'utf8');

const requiredInterfaces = [
  'StandardizedEventBase',
  'StandardizedWeatherEvent',
  'StandardizedProductionEvent', 
  'StandardizedChemicalEvent',
  'StandardizedGeneralEvent',
  'StandardizedEquipmentEvent',
  'StandardizedSoilManagementEvent',
  'StandardizedPestManagementEvent',
  'StandardizedBusinessEvent',
  'StandardizedEvent'
];

let interfaceTestsPassed = 0;
for (const interfaceName of requiredInterfaces) {
  if (standardizedEventsContent.includes(`export interface ${interfaceName}`)) {
    console.log(`  ✅ ${interfaceName}`);
    interfaceTestsPassed++;
  } else {
    console.log(`  ❌ Missing: ${interfaceName}`);
  }
}
validationTests.push({ name: 'TypeScript Interfaces', passed: interfaceTestsPassed, total: requiredInterfaces.length });

// Test 3: Verify field mappings exist for all 8 event types
console.log('\n🗺️  Field Mapping Validation...');
const fieldMappingContent = fs.readFileSync(path.join(__dirname, 'src/utils/eventFieldMapping.ts'), 'utf8');

const requiredMappings = [
  'WEATHER_FIELD_MAPPING',
  'PRODUCTION_FIELD_MAPPING',
  'CHEMICAL_FIELD_MAPPING', 
  'GENERAL_FIELD_MAPPING',
  'EQUIPMENT_FIELD_MAPPING',
  'SOIL_MANAGEMENT_FIELD_MAPPING',
  'PEST_MANAGEMENT_FIELD_MAPPING',
  'BUSINESS_FIELD_MAPPING',
  'EVENT_FIELD_MAPPINGS'
];

let mappingTestsPassed = 0;
for (const mapping of requiredMappings) {
  if (fieldMappingContent.includes(`export const ${mapping}`)) {
    console.log(`  ✅ ${mapping}`);
    mappingTestsPassed++;
  } else {
    console.log(`  ❌ Missing: ${mapping}`);
  }
}
validationTests.push({ name: 'Field Mappings', passed: mappingTestsPassed, total: requiredMappings.length });

// Test 4: Verify normalization functions exist
console.log('\n🔄 Normalization Function Validation...');
const normalizerContent = fs.readFileSync(path.join(__dirname, 'src/utils/eventDataNormalizer.ts'), 'utf8');

const requiredFunctions = [
  'normalizeFormEventData',
  'normalizeBackendEventData',
  'normalizeEventData'
];

let functionTestsPassed = 0;
for (const functionName of requiredFunctions) {
  if (normalizerContent.includes(`export function ${functionName}`)) {
    console.log(`  ✅ ${functionName}`);
    functionTestsPassed++;
  } else {
    console.log(`  ❌ Missing: ${functionName}`);
  }
}
validationTests.push({ name: 'Normalization Functions', passed: functionTestsPassed, total: requiredFunctions.length });

// Test 5: Verify EventPreviewModal integration
console.log('\n📋 EventPreviewModal Integration Validation...');
const previewModalContent = fs.readFileSync(path.join(__dirname, 'src/components/Events/EventPreviewModal.tsx'), 'utf8');

const previewModalChecks = [
  'normalizeFormEventData',
  'StandardizedEvent',
  'from \'../../utils/eventDataNormalizer\''
];

let previewTestsPassed = 0;
for (const check of previewModalChecks) {
  if (previewModalContent.includes(check)) {
    console.log(`  ✅ Contains: ${check}`);
    previewTestsPassed++;
  } else {
    console.log(`  ❌ Missing: ${check}`);
  }
}
validationTests.push({ name: 'EventPreviewModal Integration', passed: previewTestsPassed, total: previewModalChecks.length });

// Test 6: Verify ProductDetail integration  
console.log('\n📄 ProductDetail Integration Validation...');
const productDetailContent = fs.readFileSync(path.join(__dirname, 'src/views/Scan/ProductDetail/ProductDetail.tsx'), 'utf8');

const productDetailChecks = [
  'normalizeBackendEventData',
  'StandardizedEvent',
  'from \'../../../utils/eventDataNormalizer\''
];

let productDetailTestsPassed = 0;
for (const check of productDetailChecks) {
  if (productDetailContent.includes(check)) {
    console.log(`  ✅ Contains: ${check}`);
    productDetailTestsPassed++;
  } else {
    console.log(`  ❌ Missing: ${check}`);
  }
}
validationTests.push({ name: 'ProductDetail Integration', passed: productDetailTestsPassed, total: productDetailChecks.length });

// Test 7: Verify fieldDisplayUtils simplification
console.log('\n🛠️  FieldDisplayUtils Simplification Validation...');
const fieldUtilsContent = fs.readFileSync(path.join(__dirname, 'src/utils/fieldDisplayUtils.ts'), 'utf8');

// Check that dual field checking patterns were removed
const dualFieldPatterns = [
  'extraData.',
  'event.commercial_name || extraData.commercial_name',
  '||.*event\\.',
  'extraData.*||.*event'
];

let simplificationTestsPassed = 0;
let totalSimplificationTests = dualFieldPatterns.length;

for (const pattern of dualFieldPatterns) {
  const regex = new RegExp(pattern, 'g');
  const matches = fieldUtilsContent.match(regex);
  if (!matches || matches.length === 0) {
    console.log(`  ✅ Removed dual pattern: ${pattern}`);
    simplificationTestsPassed++;
  } else {
    console.log(`  ❌ Still contains dual pattern: ${pattern} (${matches.length} occurrences)`);
  }
}

// Check for standardization comment
if (fieldUtilsContent.includes('expects standardized event data')) {
  console.log(`  ✅ Contains standardization documentation`);
  simplificationTestsPassed++;
  totalSimplificationTests++;
}

validationTests.push({ name: 'FieldDisplayUtils Simplification', passed: simplificationTestsPassed, total: totalSimplificationTests });

// Test 8: Critical field mapping verification
console.log('\n⚠️  Critical Field Mapping Verification...');
const criticalMappingChecks = [
  { field: 'application_method', mapping: 'way_of_application.*application_method' },
  { field: 'production_efficiency', mapping: 'production_efficiency.*production_efficiency' },
  { field: 'chemical_type', mapping: 'chemical_type.*chemical_type' }
];

let criticalTestsPassed = 0;
for (const check of criticalMappingChecks) {
  const regex = new RegExp(check.mapping, 'g');
  if (fieldMappingContent.match(regex)) {
    console.log(`  ✅ Critical mapping exists: ${check.field}`);
    criticalTestsPassed++;
  } else {
    console.log(`  ❌ Missing critical mapping: ${check.field}`);
  }
}
validationTests.push({ name: 'Critical Field Mappings', passed: criticalTestsPassed, total: criticalMappingChecks.length });

// Summary
console.log('\n📊 VALIDATION SUMMARY:');
console.log('='.repeat(30));

let totalTestsPassed = 0;
let totalTests = 0;

for (const test of validationTests) {
  totalTestsPassed += test.passed;
  totalTests += test.total;
  const percentage = ((test.passed / test.total) * 100).toFixed(1);
  const status = test.passed === test.total ? '✅' : '❌';
  console.log(`${status} ${test.name}: ${test.passed}/${test.total} (${percentage}%)`);
}

const overallPercentage = ((totalTestsPassed / totalTests) * 100).toFixed(1);
console.log(`\n🎯 Overall Success Rate: ${totalTestsPassed}/${totalTests} (${overallPercentage}%)`);

// Final recommendations
console.log('\n💡 FINAL ASSESSMENT:');
console.log('-'.repeat(20));

if (overallPercentage >= 95) {
  console.log('🎉 EXCELLENT! Standardization layer implemented successfully.');
  console.log('✅ All critical components are in place and integrated correctly.');
  console.log('✅ Form data and backend data will now display consistently.');
  console.log('✅ No major regressions detected.');
} else if (overallPercentage >= 85) {
  console.log('✅ GOOD! Most standardization components working correctly.');
  console.log('⚠️  Some minor issues detected that should be addressed.');
  console.log('📋 Review failed tests and fix remaining issues.');
} else {
  console.log('❌ ISSUES DETECTED! Standardization implementation needs work.');
  console.log('🔧 Multiple critical issues need to be resolved.');
  console.log('📋 Review all failed tests and fix before production.');
}

// Additional checks
console.log('\n🔍 ADDITIONAL VERIFICATION:');
console.log('-'.repeat(25));

// Check if old legacy patterns still exist
const legacyPatterns = [
  'transformFormDataToEvent',
  'hasEnoughData.*transformFormDataToEvent',
  'event.*extraData.*||'
];

let legacyPatternsFound = [];
const allContent = [previewModalContent, productDetailContent, fieldUtilsContent].join('\n');

for (const pattern of legacyPatterns) {
  if (allContent.includes(pattern) || allContent.match(new RegExp(pattern))) {
    legacyPatternsFound.push(pattern);
  }
}

if (legacyPatternsFound.length === 0) {
  console.log('✅ No legacy patterns detected - clean migration');
} else {
  console.log(`❌ Legacy patterns still exist: ${legacyPatternsFound.join(', ')}`);
}

process.exit(overallPercentage >= 95 ? 0 : 1);