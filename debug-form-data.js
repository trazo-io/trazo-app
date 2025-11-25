// Debug script to test form data mapping for Production events
// This simulates the exact data structure from ProductionTab.jsx

console.log('🧪 DEBUGGING FORM DATA MAPPING\n');
console.log('=' .repeat(60));

// Mock form data from PL (Planting) - based on screenshot
const mockPLFormData = {
  type: 'PL',
  name: 'Spring Avocado',
  area_covered: '11.00',
  area_unit: 'ha',
  yield_quantity: '22.0',  // This is "Quantity Planted" in UI
  yield_unit: 'kg',
  fuel_consumed: '33.0',
  fuel_unit: 'L',
  equipment_hours: '44.0',
  observation: 'test'
};

// Mock form data from HA (Harvesting) - based on screenshot
const mockHAFormData = {
  type: 'HA',
  name: 'Spring Avocado',
  area_covered: '11.00',
  area_unit: 'ha',
  yield_quantity: '22.0',  // This is "Quantity Harvested" in UI
  yield_unit: 'kg',
  fuel_consumed: '33.0',
  fuel_unit: 'L',
  equipment_hours: '44.0',
  transportation_distance: '55.0',
  transportation_unit: 'km',
  observation: 'test'
};

// Load our eventPreviewUtils
const fs = require('fs');
const path = require('path');

// Since we can't import ES modules directly in Node.js, let's extract the transform function
const transformFormDataToEvent = (activeEventType, formData, eventId = 'preview') => {
  const event = {
    id: eventId,
    type: 'production',
    description: formData.name || 'Production activity',
    observation: formData.observation,
    date: formData.date || new Date().toISOString(),
    event_type: activeEventType,
    certified: false,
    blockchain_verified: false,
    usda_verified: false,
    carbon_impact: 2.5
  };

  if (activeEventType === 1) {
    // Set production_name and name for proper display
    if (formData.name) {
      event.production_name = formData.name;
      event.name = formData.name;
    }
    
    // Set the correct production type code
    if (formData.type) {
      event.type = formData.type;
    }
    
    // Area covered with units (ALL production types)
    if (formData.area_covered || formData.area) {
      const areaValue = parseFloat(formData.area_covered || formData.area);
      const areaUnit = formData.area_unit || formData.unit || 'hectares';
      event.area_covered = `${areaValue} ${areaUnit}`;
    }
    
    // Yield/Quantity with units (PL and HA only)
    if (formData.yield_quantity || formData.quantity_planted || formData.quantity) {
      const quantityValue = parseFloat(formData.yield_quantity || formData.quantity_planted || formData.quantity);
      const quantityUnit = formData.yield_unit || formData.quantity_unit || formData.unit_quantity || 'kg';
      event.yield_quantity = `${quantityValue} ${quantityUnit}`;
    }
    
    // Fuel consumed with units (ALL production types)
    if (formData.fuel_consumed !== undefined && formData.fuel_consumed !== '' && formData.fuel_consumed !== null) {
      const fuelValue = parseFloat(formData.fuel_consumed);
      const fuelUnit = formData.fuel_unit || 'liters';
      
      if (!isNaN(fuelValue) && fuelValue >= 0) {
        event.fuel_consumed = `${fuelValue} ${fuelUnit}`;
      }
    }
    
    // Equipment hours (ALL production types)
    if (formData.equipment_hours !== undefined && formData.equipment_hours !== '' && formData.equipment_hours !== null) {
      const hoursValue = parseFloat(formData.equipment_hours);
      
      if (!isNaN(hoursValue) && hoursValue >= 0) {
        event.equipment_hours = `${hoursValue} hours`;
      }
    }
    
    // Transportation (HA - Harvesting only)
    if (formData.transportation_distance !== undefined && formData.transportation_distance !== '' && formData.transportation_distance !== null) {
      const transportValue = parseFloat(formData.transportation_distance);
      const transportUnit = formData.transportation_unit || 'km';
      
      if (!isNaN(transportValue) && transportValue >= 0) {
        event.transportation_distance = `${transportValue} ${transportUnit}`;
      }
    }
  }
  
  return event;
};

// Test PL (Planting) event
console.log('\n🌱 TESTING PL (PLANTING) EVENT:');
console.log('📝 Form Data:');
Object.entries(mockPLFormData).forEach(([key, value]) => {
  console.log(`   ${key}: ${value}`);
});

const plEvent = transformFormDataToEvent(1, mockPLFormData, 'pl-test');
console.log('\n🔄 Transformed Event:');
Object.entries(plEvent).forEach(([key, value]) => {
  if (key !== 'date' && key !== 'id') {
    console.log(`   ${key}: ${value}`);
  }
});

// Test HA (Harvesting) event
console.log('\n\n🌾 TESTING HA (HARVESTING) EVENT:');
console.log('📝 Form Data:');
Object.entries(mockHAFormData).forEach(([key, value]) => {
  console.log(`   ${key}: ${value}`);
});

const haEvent = transformFormDataToEvent(1, mockHAFormData, 'ha-test');
console.log('\n🔄 Transformed Event:');
Object.entries(haEvent).forEach(([key, value]) => {
  if (key !== 'date' && key !== 'id') {
    console.log(`   ${key}: ${value}`);
  }
});

console.log('\n\n✅ KEY INSIGHTS:');
console.log('   • Field names are consistent between PL and HA');
console.log('   • yield_quantity is used for both "Quantity Planted" and "Quantity Harvested"');
console.log('   • transportation_distance only appears in HA events');
console.log('   • All numeric values come as strings from form');

console.log('\n🔍 POTENTIAL ISSUE:');
console.log('   • Check if form is actually sending different field names');
console.log('   • Verify that all validation logic is working correctly');
console.log('   • Ensure no empty string filtering is removing valid data');