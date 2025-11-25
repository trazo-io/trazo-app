// Test script to verify weather events no longer show technical details in descriptions
const { getConsumerEventDescription } = require('./src/utils/eventDescriptions.ts');

// Test weather event with lots of technical details
const weatherEvent = {
  id: 'test-weather-1',
  event_type: 0,
  weather_type: 'DR', // Drought
  water_deficit: 50,
  lower_temperature: 5,
  highest_temperature: 35,
  duration: 72,
  start_date: '2024-01-15',
  end_date: '2024-01-18',
  way_of_protection: 'Cover crops',
  description: 'Drought monitoring event',
  date: '2024-01-15T10:00:00Z',
  extra_data: {
    wind_speed: 25,
    precipitation_amount: 2,
    humidity_level: 20,
    damage_assessment: 'Minor leaf stress',
    protection_measures: 'Increased irrigation'
  }
};

console.log('🌦️ Testing Weather Event Description Cleaning...\n');

const result = getConsumerEventDescription('Drought monitoring event', weatherEvent);

console.log('✅ RESULT:', result);

// Check if technical details are properly excluded from description
const hasWaterDeficit = result.description.includes('Water deficit: 50');
const hasTemperature = result.description.includes('35°C') || result.description.includes('5°C');
const hasWindSpeed = result.description.includes('Wind: 25km/h');
const hasHumidity = result.description.includes('Humidity: 20%');
const hasDuration = result.description.includes('Duration: 72');

console.log('\n📊 Technical Details Check:');
console.log('- Water deficit removed:', !hasWaterDeficit ? '✅' : '❌');
console.log('- Temperature removed:', !hasTemperature ? '✅' : '❌');
console.log('- Wind speed removed:', !hasWindSpeed ? '✅' : '❌');
console.log('- Humidity removed:', !hasHumidity ? '✅' : '❌');
console.log('- Duration removed:', !hasDuration ? '✅' : '❌');

console.log('\n🎯 Description should be clean consumer-friendly text:');
console.log(`"${result.description}"`);

// Check if it's a clean description without technical details
const isClean = !hasWaterDeficit && !hasTemperature && !hasWindSpeed && !hasHumidity && !hasDuration;

if (isClean) {
  console.log('\n✅ SUCCESS: Weather event descriptions are now clean and consumer-friendly!');
} else {
  console.log('\n❌ ISSUE: Some technical details are still showing in the description');
}