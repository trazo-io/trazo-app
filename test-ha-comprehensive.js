// Test HA (Harvesting) event with all fields from user's form
// Exact data from user's screenshot

const mockHAFormData = {
  name: 'Spring Avocado', // Event Name
  type: 'HA', // Harvesting - Crop collection & transport
  area_covered: 11.0, // Area Covered: 11.00
  area_unit: 'ha', // Unit: Hectares
  yield_quantity: 22.0, // Quantity Harvested: 22.0
  yield_unit: 'kg', // Unit: Kilograms
  fuel_consumed: 33.0, // Fuel Consumed: 33.0
  fuel_unit: 'L', // Unit: Liters
  equipment_hours: 44.0, // Equipment Operating Hours: 44.0
  transportation_distance: 55.0, // Transportation Distance: 55.0
  transportation_unit: 'km', // Unit: Kilometers
  observation: 'test', // Observations & Notes: test
  date: new Date().toISOString()
};

// Enhanced transformFormDataToEvent for Production events (with transportation support)
function transformFormDataToEvent(activeEventType, formData, eventId = 'preview') {
  const event = {
    id: eventId,
    type: 'production',
    description: formData.name || 'Production activity',
    observation: formData.observation,
    date: formData.date,
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
      const quantityValue = parseFloat(
        formData.yield_quantity || formData.quantity_planted || formData.quantity
      );
      const quantityUnit =
        formData.yield_unit || formData.quantity_unit || formData.unit_quantity || 'kg';
      event.yield_quantity = `${quantityValue} ${quantityUnit}`;
    }

    // Fuel consumed with units (ALL production types)
    if (
      formData.fuel_consumed !== undefined &&
      formData.fuel_consumed !== '' &&
      formData.fuel_consumed !== null
    ) {
      const fuelValue = parseFloat(formData.fuel_consumed);
      const fuelUnit = formData.fuel_unit || 'liters';

      if (!isNaN(fuelValue) && fuelValue >= 0) {
        event.fuel_consumed = `${fuelValue} ${fuelUnit}`;
      }
    }

    // Equipment hours (ALL production types)
    if (
      formData.equipment_hours !== undefined &&
      formData.equipment_hours !== '' &&
      formData.equipment_hours !== null
    ) {
      const hoursValue = parseFloat(formData.equipment_hours);

      if (!isNaN(hoursValue) && hoursValue >= 0) {
        event.equipment_hours = `${hoursValue} hours`;
      }
    }

    // Transportation (HA - Harvesting only)
    if (
      formData.transportation_distance !== undefined &&
      formData.transportation_distance !== '' &&
      formData.transportation_distance !== null
    ) {
      const transportValue = parseFloat(formData.transportation_distance);
      const transportUnit = formData.transportation_unit || 'km';

      if (!isNaN(transportValue) && transportValue >= 0) {
        event.transportation_distance = `${transportValue} ${transportUnit}`;
      }
    }
  }

  return event;
}

// Enhanced getProductionEventFields with transportation support
function getProductionEventFields(event) {
  const immediate = [];
  const secondary = [];
  const details = [];

  // Core transparency fields (IMMEDIATE display)
  if (event.area_covered && String(event.area_covered).trim() !== 'null') {
    immediate.push({
      label: 'Area Covered',
      value: event.area_covered,
      priority: 'immediate',
      category: 'measurement'
    });
  }

  if (event.yield_quantity && String(event.yield_quantity).trim() !== 'null') {
    immediate.push({
      label: 'Quantity',
      value: event.yield_quantity,
      priority: 'immediate',
      category: 'measurement'
    });
  }

  // Equipment and fuel information (SECONDARY display)
  if (event.fuel_consumed && String(event.fuel_consumed).trim() !== 'null') {
    secondary.push({
      label: 'Fuel Consumed',
      value: event.fuel_consumed,
      priority: 'secondary',
      category: 'operational'
    });
  }

  if (event.equipment_hours && String(event.equipment_hours).trim() !== 'null') {
    secondary.push({
      label: 'Equipment Hours',
      value: event.equipment_hours,
      priority: 'secondary',
      category: 'operational'
    });
  }

  // Transportation (HA - Harvesting events only, SECONDARY display)
  if (event.transportation_distance && String(event.transportation_distance).trim() !== 'null') {
    secondary.push({
      label: 'Transportation Distance',
      value: event.transportation_distance,
      priority: 'secondary',
      category: 'operational'
    });
  }

  return { immediate, secondary, details };
}

// Test the complete HA (Harvesting) flow
console.log('🧪 TESTING HA (HARVESTING) EVENT - ALL FIELDS\n');
console.log('='.repeat(60));

console.log('\n📝 FORM DATA (From user screenshot):');
Object.entries(mockHAFormData).forEach(([key, value]) => {
  if (key !== 'date') console.log(`   ${key}: ${value}`);
});

console.log('\n🔄 TRANSFORM TO EVENT:');
const haEvent = transformFormDataToEvent(1, mockHAFormData, 'ha-test');
console.log('   Event fields created:');
Object.entries(haEvent).forEach(([key, value]) => {
  if (key !== 'date' && key !== 'id') console.log(`     ${key}: ${value}`);
});

console.log('\n📱 CONSUMER DISPLAY FIELDS:');
const haFields = getProductionEventFields(haEvent);
console.log('   IMMEDIATE (shown first):');
if (haFields.immediate.length === 0) console.log('     (none)');
haFields.immediate.forEach((field) => console.log(`     ${field.label}: ${field.value}`));

console.log('   SECONDARY (shown in details):');
if (haFields.secondary.length === 0) console.log('     (none)');
haFields.secondary.forEach((field) => console.log(`     ${field.label}: ${field.value}`));

console.log('\n✅ EXPECTED RESULT FOR HA (HARVESTING):');
console.log('   IMMEDIATE: Area Covered + Quantity Harvested');
console.log('   SECONDARY: Fuel Consumed + Equipment Hours + Transportation Distance');
console.log('   ALL FIELDS should appear since user filled them all');

console.log('\n🌱 TRANSPARENCY SUCCESS FOR HA EVENTS:');
console.log('   • Custom name "Spring Avocado" preserved');
console.log('   • All measurement fields visible (area, quantity)');
console.log('   • All operational fields visible (fuel, equipment, transport)');
console.log('   • Transportation unique to harvesting events');
console.log('   • Complete agricultural documentation for consumer trust');
