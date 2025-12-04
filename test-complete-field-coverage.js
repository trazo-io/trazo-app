#!/usr/bin/env node

/**
 * Complete Field Coverage Test
 *
 * This test verifies that every field used in the 8 event type forms
 * has a corresponding mapping in the standardization layer.
 */

// Import the field mappings
const fs = require('fs');
const path = require('path');

// Read the field mapping file
const mappingFile = path.join(__dirname, 'src/utils/eventFieldMapping.ts');
const mappingContent = fs.readFileSync(mappingFile, 'utf8');

console.log('🧪 COMPLETE FIELD COVERAGE TEST');
console.log('='.repeat(50));

// Known form field usage from each event type
const FORM_FIELDS_BY_EVENT_TYPE = {
  0: {
    // Weather
    formFields: [
      'type',
      'highest_temperature',
      'lower_temperature',
      'way_of_protection',
      'protection_measures',
      'water_deficit',
      'weight',
      'diameter',
      'duration',
      'start_date',
      'end_date',
      'wind_speed',
      'precipitation_amount',
      'damage_assessment',
      'humidity_level',
      'crop_impact',
      'observation'
    ],
    source: 'WeatherTab.jsx'
  },
  1: {
    // Production
    formFields: [
      'production_type',
      'area_covered',
      'area_unit',
      'yield_quantity',
      'yield_unit',
      'fuel_consumed',
      'fuel_unit',
      'equipment_hours',
      'transportation_distance',
      'transportation_unit',
      'production_efficiency',
      'observation'
    ],
    source: 'ProductionTab-ENHANCED.jsx'
  },
  2: {
    // Chemical
    formFields: [
      'chemical_type',
      'commercial_name',
      'active_ingredient',
      'application_method',
      'target_pest_disease',
      'area_treated',
      'area_unit',
      'volume_applied',
      'volume_unit',
      'concentration',
      'npk_ratio',
      'nitrogenPercentage',
      'phosphorusPercentage',
      'potassiumPercentage',
      'application_timing',
      'weather_conditions',
      'observation'
    ],
    source: 'ChemicalTab.jsx'
  },
  3: {
    // General
    formFields: [
      'activity_type',
      'activity_name',
      'duration_hours',
      'people_involved',
      'activity_notes',
      'observation'
    ],
    source: 'GeneralTab.jsx'
  },
  4: {
    // Equipment
    formFields: [
      'operation_type',
      'operation_name',
      'equipment_type',
      'fuel_consumed',
      'fuel_type',
      'hours_operated',
      'area_worked',
      'operation_efficiency',
      'observation'
    ],
    source: 'EquipmentTab.jsx'
  },
  5: {
    // Soil Management
    formFields: [
      'soil_management_type',
      'soil_management_name',
      'area',
      'area_unit',
      'depth',
      'depth_unit',
      'soil_ph',
      'organic_matter_percentage',
      'soil_texture',
      'soil_moisture',
      'area_covered',
      'fuel_consumed',
      'fuel_unit',
      'equipment_hours',
      'production_efficiency',
      'transportation_distance',
      'transportation_unit',
      'weather_conditions',
      'temperature_range',
      'equipment_used',
      'tillage_type',
      'tillage_intensity',
      'tillage_direction',
      'residue_management',
      'observation'
    ],
    source: 'SoilManagementTab.jsx'
  },
  6: {
    // Pest Management
    formFields: [
      'pest_management_type',
      'pest_management_name',
      'field_area_hectares',
      'travel_distance_km',
      'time_spent_hours',
      'crop_growth_stage',
      'weather_conditions',
      'economic_threshold_met',
      'action_recommended',
      'pest_species',
      'pest_pressure_level',
      'beneficial_species',
      'release_quantity',
      'trap_count',
      'damage_percentage',
      'action_threshold_met',
      'imp_strategy',
      'observation'
    ],
    source: 'PestManagementTab.jsx'
  },
  7: {
    // Business
    formFields: [
      'business_event_type',
      'business_event_name',
      'business_activity_type',
      'certification_type',
      'carbon_credits_earned',
      'carbon_credits_unit',
      'verification_status',
      'sustainability_practice',
      'trust_impact',
      'transparency_benefit',
      'observation'
    ],
    source: 'BusinessTab.jsx'
  }
};

// Common fields that should be available to all event types
const COMMON_FORM_FIELDS = [
  'date',
  'description',
  'observation',
  'id',
  'name',
  'event_type',
  'acceptedFiles',
  'album',
  'imageUrls',
  'certified',
  'blockchain_verified',
  'blockchain_transaction',
  'blockchain_block_number',
  'verification_confidence',
  'verification_timestamp',
  'data_integrity_score',
  'usda_verified',
  'carbon_impact'
];

// Function to extract field mappings from the mapping file content
function extractFieldMappingsFromFile(content, eventType) {
  const mappingNames = {
    0: 'WEATHER_FIELD_MAPPING',
    1: 'PRODUCTION_FIELD_MAPPING',
    2: 'CHEMICAL_FIELD_MAPPING',
    3: 'GENERAL_FIELD_MAPPING',
    4: 'EQUIPMENT_FIELD_MAPPING',
    5: 'SOIL_MANAGEMENT_FIELD_MAPPING',
    6: 'PEST_MANAGEMENT_FIELD_MAPPING',
    7: 'BUSINESS_FIELD_MAPPING'
  };

  const mappingName = mappingNames[eventType];
  if (!mappingName) return null;

  // Find the mapping object in the file
  const regex = new RegExp(
    `export const ${mappingName}[\\s\\S]*?form: {([\\s\\S]*?)},\\s*backend:`,
    'm'
  );
  const match = content.match(regex);

  if (!match) return null;

  // Extract field names from the form mapping
  const formSection = match[1];
  const fieldMatches = formSection.match(/'([^']+)':\s*'[^']+'/g);

  if (!fieldMatches) return [];

  return fieldMatches
    .map((match) => {
      const fieldMatch = match.match(/'([^']+)':/);
      return fieldMatch ? fieldMatch[1] : null;
    })
    .filter(Boolean);
}

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const issues = [];

console.log('Testing field coverage for all 8 event types...\n');

// Test each event type
for (const [eventType, config] of Object.entries(FORM_FIELDS_BY_EVENT_TYPE)) {
  const eventTypeNum = parseInt(eventType);
  console.log(`📋 Event Type ${eventTypeNum} (${config.source}):`);

  // Get mapped fields from the mapping file
  const mappedFields = extractFieldMappingsFromFile(mappingContent, eventTypeNum);

  if (!mappedFields) {
    issues.push(`❌ Event Type ${eventTypeNum}: Could not extract field mappings from file`);
    failedTests++;
    continue;
  }

  // Check each form field
  const missingFields = [];
  const foundFields = [];

  for (const formField of config.formFields) {
    totalTests++;

    // Check if field is in event-specific mapping or common mapping
    const inEventMapping = mappedFields.includes(formField);
    const inCommonMapping = COMMON_FORM_FIELDS.includes(formField);

    if (inEventMapping || inCommonMapping) {
      foundFields.push(formField);
      passedTests++;
    } else {
      missingFields.push(formField);
      failedTests++;
      issues.push(`❌ Event Type ${eventTypeNum}: Missing mapping for form field '${formField}'`);
    }
  }

  console.log(`  ✅ Mapped fields (${foundFields.length}): ${foundFields.join(', ')}`);
  if (missingFields.length > 0) {
    console.log(`  ❌ Missing fields (${missingFields.length}): ${missingFields.join(', ')}`);
  }
  console.log('');
}

// Test results summary
console.log('📊 COVERAGE TEST RESULTS:');
console.log('='.repeat(30));
console.log(`Total field tests: ${totalTests}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

if (issues.length > 0) {
  console.log('🚨 ISSUES FOUND:');
  console.log('-'.repeat(20));
  issues.forEach((issue) => console.log(issue));
  console.log('');
}

// Additional validation: Check for unused mappings
console.log('🔍 CHECKING FOR UNUSED MAPPINGS...');
console.log('-'.repeat(40));

for (const [eventType, config] of Object.entries(FORM_FIELDS_BY_EVENT_TYPE)) {
  const eventTypeNum = parseInt(eventType);
  const mappedFields = extractFieldMappingsFromFile(mappingContent, eventTypeNum);

  if (mappedFields) {
    const unusedMappings = mappedFields.filter(
      (mapped) => !config.formFields.includes(mapped) && !COMMON_FORM_FIELDS.includes(mapped)
    );

    if (unusedMappings.length > 0) {
      console.log(
        `⚠️ Event Type ${eventTypeNum}: Potentially unused mappings: ${unusedMappings.join(', ')}`
      );
    }
  }
}

console.log('\n🎯 RECOMMENDATIONS:');
console.log('-'.repeat(20));

if (failedTests === 0) {
  console.log('✅ All form fields have proper mappings!');
  console.log('✅ The standardization layer should work correctly.');
} else {
  console.log(`❌ ${failedTests} form fields are missing mappings.`);
  console.log('🔧 Add missing field mappings to eventFieldMapping.ts');
  console.log('🔧 Ensure form field names match the mapping keys');
}

process.exit(failedTests > 0 ? 1 : 0);
