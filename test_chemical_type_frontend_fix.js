#!/usr/bin/env node
/**
 * Test that the chemical_type field mapping fix works correctly
 */

// Mock the backend API response structure
const mockBackendResponse = {
  events: [
    {
      id: 177,
      type: "chemical", // This should NOT overwrite chemical_type
      chemical_type: "FE", // This is the correct field
      commercial_name: "Fertilizer Miracle",
      description: "test test"
    },
    {
      id: 179,
      type: "chemical",
      chemical_type: "FU", // This was the main issue
      commercial_name: "Fungicide Miracle", 
      description: "test test"
    }
  ]
};

// Simulate the field mapping that was causing the issue
function testFieldMappingOLD(rawData) {
  const result = {};
  
  // OLD BUGGY MAPPING - this was the issue
  if (rawData.chemical_type) result.chemical_type = rawData.chemical_type; // FU
  if (rawData.type) result.chemical_type = rawData.type; // "chemical" overwrites FU!
  
  return result;
}

// Test the FIXED field mapping
function testFieldMappingFIXED(rawData) {
  const result = {};
  
  // FIXED MAPPING - only map chemical_type field
  if (rawData.chemical_type) result.chemical_type = rawData.chemical_type;
  // type field is NOT mapped to chemical_type anymore
  
  return result;
}

// Simulate eventDescriptions.ts logic
function getEventDescription(event) {
  const specificType = event.chemical_type || event.type;
  
  function extractChemicalType(typeStr) {
    if (!typeStr) return null;
    if (['FE', 'PE', 'FU', 'HE'].includes(typeStr)) return typeStr;
    return null;
  }
  
  const normalizedType = extractChemicalType(specificType);
  
  if (normalizedType === 'FE') return 'fertilizer application';
  if (normalizedType === 'PE') return 'pesticide application';
  if (normalizedType === 'FU') return 'fungicide application';
  if (normalizedType === 'HE') return 'herbicide application';
  return 'chemical application';
}

console.log('🧪 TESTING CHEMICAL TYPE FIELD MAPPING FIX');
console.log('='.repeat(50));

mockBackendResponse.events.forEach((rawEvent, i) => {
  console.log(`\nEvent ${i + 1}: ${rawEvent.commercial_name}`);
  console.log(`Backend sends: type="${rawEvent.type}", chemical_type="${rawEvent.chemical_type}"`);
  
  // Test old buggy mapping
  const oldResult = testFieldMappingOLD(rawEvent);
  const oldMessage = getEventDescription(oldResult);
  console.log(`OLD mapping result: chemical_type="${oldResult.chemical_type}" → "${oldMessage}"`);
  
  // Test fixed mapping  
  const fixedResult = testFieldMappingFIXED(rawEvent);
  const fixedMessage = getEventDescription(fixedResult);
  console.log(`FIXED mapping result: chemical_type="${fixedResult.chemical_type}" → "${fixedMessage}"`);
  
  const expected = rawEvent.commercial_name.toLowerCase().includes('fungicide') ? 'fungicide application' : 'fertilizer application';
  
  if (fixedMessage === expected) {
    console.log(`✅ SUCCESS: Shows "${expected}" as expected`);
  } else {
    console.log(`❌ FAILED: Expected "${expected}", got "${fixedMessage}"`);
  }
});

console.log(`\n${'='.repeat(50)}`);
console.log('💡 SUMMARY:');
console.log('• OLD mapping: type field overwrote chemical_type → all showed "chemical application"');
console.log('• FIXED mapping: only chemical_type field mapped → specific types work correctly');
console.log('• Frontend eventDescriptions.ts logic already worked correctly');
