#!/usr/bin/env node

/**
 * TEST IMPROVED WEATHER EVENT DETECTION
 * Test the fixes for the user's specific issue with missing temperature and protection data
 */

console.log('🔧 TESTING IMPROVED WEATHER EVENT DETECTION');
console.log('============================================');

// Mock the IMPROVED getConsumerEventDescription logic
function mockImprovedWeatherDetection(eventDescription, event) {
  // Step 1: Check if this is a weather event (event_type: 0)
  const isWeatherEvent = event && event.event_type === 0;
  
  // Step 2: IMPROVED detection logic
  const hasSpecificWeatherType = (event.weather_type && event.weather_type !== 'weather') || 
                                 (event.type && event.type !== 'weather') ||
                                 // Check for temperature data as indicator of weather event
                                 (event.lower_temperature !== undefined || event.upper_temperature !== undefined || event.highest_temperature !== undefined) ||
                                 // Check for weather-specific fields
                                 (event.way_of_protection !== undefined);
  
  const hasWeatherKeywords = eventDescription.toLowerCase().includes('weather') || 
                            eventDescription.toLowerCase().includes('frost') || 
                            eventDescription.toLowerCase().includes('temperature');
  
  const shouldEnterWeatherBranch = isWeatherEvent && (hasSpecificWeatherType || hasWeatherKeywords);
  
  console.log('🔍 DETECTION ANALYSIS:');
  console.log('---------------------');
  console.log(`Is weather event (type 0): ${isWeatherEvent}`);
  console.log(`Has specific weather type: ${hasSpecificWeatherType}`);
  console.log(`  - weather_type: ${event.weather_type}`);
  console.log(`  - type: ${event.type}`);
  console.log(`  - has temperature data: ${event.lower_temperature !== undefined || event.upper_temperature !== undefined}`);
  console.log(`  - has protection data: ${event.way_of_protection !== undefined}`);
  console.log(`Has weather keywords: ${hasWeatherKeywords}`);
  console.log(`FINAL DECISION: ${shouldEnterWeatherBranch ? '✅ ENTER WEATHER BRANCH' : '❌ SKIP WEATHER BRANCH'}`);
  console.log('');
  
  if (!shouldEnterWeatherBranch) {
    return {
      title: 'Agricultural Activity',
      details: '',
      weatherDetected: false
    };
  }
  
  // Step 3: Weather type mapping with improved fallbacks
  const weatherTypeMap = {
    'FR': 'Frost Weather Event',
    'DR': 'Drought Monitoring', 
    'HL': 'Hail Damage Assessment',
    'HT': 'Heat Stress Monitoring',
    'TS': 'Storm & Wind Event'
  };
  
  const weatherTypeCode = event.weather_type || event.type;
  let weatherTitle = weatherTypeMap[weatherTypeCode];
  
  if (!weatherTitle) {
    // IMPROVED: Infer weather type from data
    if (event.lower_temperature !== undefined && event.lower_temperature < 35) {
      weatherTitle = 'Frost Weather Event';
    } else if (event.way_of_protection && event.way_of_protection.toLowerCase().includes('cover')) {
      weatherTitle = 'Frost Weather Event';
    } else if (eventDescription.toLowerCase().includes('frost')) {
      weatherTitle = 'Frost Weather Event';
    } else if (eventDescription.toLowerCase().includes('drought')) {
      weatherTitle = 'Drought Monitoring';
    } else if (eventDescription.toLowerCase().includes('temperature')) {
      weatherTitle = 'Heat Stress Monitoring';
    } else {
      weatherTitle = 'Weather Monitoring';
    }
  }
  
  // Step 4: Extract temperature and protection details
  const details = [];
  
  // Temperature data (main object first, then extra_data)
  const lowerTempValue = event.lower_temperature !== undefined ? event.lower_temperature : 
                        (event.extra_data && event.extra_data.lower_temperature);
  if (lowerTempValue !== undefined) {
    details.push(`Min temp: ${lowerTempValue}°C`);
  }
  
  const upperTempValue = event.upper_temperature !== undefined ? event.upper_temperature : 
                        (event.extra_data && event.extra_data.upper_temperature);
  if (upperTempValue !== undefined) {
    details.push(`Max temp: ${upperTempValue}°C`);
  }
  
  // Protection measures
  const protectionValue = event.way_of_protection || (event.extra_data && event.extra_data.way_of_protection);
  if (protectionValue && String(protectionValue).trim()) {
    details.push(`Protection: ${protectionValue}`);
  }
  
  console.log('📊 EXTRACTED DATA:');
  console.log('-----------------');
  console.log(`Weather Title: ${weatherTitle}`);
  console.log(`Temperature Details: ${details.filter(d => d.includes('temp')).join(', ') || 'None'}`);
  console.log(`Protection Details: ${details.filter(d => d.includes('Protection')).join(', ') || 'None'}`);
  console.log(`All Details: [${details.join(', ')}]`);
  
  return {
    title: weatherTitle,
    details: details.length > 0 ? ` • ${details.join(' • ')}` : '',
    weatherDetected: true,
    extractedTemperature: lowerTempValue !== undefined || upperTempValue !== undefined,
    extractedProtection: protectionValue !== undefined
  };
}

// Test Case 1: User's problematic event - minimal weather data
console.log('🧪 TEST CASE 1: User\'s Problem Event (Minimal Data)');
console.log('===================================================');

const userProblemEvent = {
  event_type: 0,
  // Missing specific weather_type or type
  lower_temperature: 32,
  way_of_protection: 'Row covers',
  description: 'Weather monitoring'
};

const result1 = mockImprovedWeatherDetection('Weather monitoring', userProblemEvent);
console.log(`Result: ${JSON.stringify(result1, null, 2)}`);
console.log('');

// Test Case 2: Event with generic weather type
console.log('🧪 TEST CASE 2: Generic Weather Type');
console.log('====================================');

const genericWeatherEvent = {
  event_type: 0,
  weather_type: 'weather',  // Generic type that was failing before
  lower_temperature: 28,
  way_of_protection: 'Frost blankets',
  description: 'Frost protection event'
};

const result2 = mockImprovedWeatherDetection('Frost protection event', genericWeatherEvent);
console.log(`Result: ${JSON.stringify(result2, null, 2)}`);
console.log('');

// Test Case 3: Event with no weather type but clear frost indicators
console.log('🧪 TEST CASE 3: No Weather Type, Clear Frost Indicators');
console.log('======================================================');

const frostIndicatorEvent = {
  event_type: 0,
  // No weather_type or type field
  lower_temperature: 30,
  way_of_protection: 'Row covers and heaters',
  description: 'Frost protection measures implemented'
};

const result3 = mockImprovedWeatherDetection('Frost protection measures implemented', frostIndicatorEvent);
console.log(`Result: ${JSON.stringify(result3, null, 2)}`);
console.log('');

// Test Case 4: Event that should fail detection (no indicators)
console.log('🧪 TEST CASE 4: Should Fail Detection');
console.log('=====================================');

const nonWeatherEvent = {
  event_type: 1,  // Not weather event type
  name: 'Regular farming activity',
  description: 'General farm work'
};

const result4 = mockImprovedWeatherDetection('General farm work', nonWeatherEvent);
console.log(`Result: ${JSON.stringify(result4, null, 2)}`);
console.log('');

console.log('🎯 IMPROVEMENT SUMMARY:');
console.log('======================');
console.log('✅ Improved weather event detection:');
console.log('   - Detects weather events even without specific weather_type');
console.log('   - Uses temperature/protection data as indicators');
console.log('   - Uses description keywords as fallback');
console.log('');
console.log('✅ Better weather type inference:');
console.log('   - Infers frost from low temperature (<35°C)');
console.log('   - Infers frost from protection method keywords');
console.log('   - Infers weather type from description');
console.log('');
console.log('✅ Consistent data extraction:');
console.log('   - Checks main event object first');
console.log('   - Falls back to extra_data if needed');
console.log('   - Properly formats temperature and protection info');
console.log('');
console.log('🔧 This should fix the user\'s issue with:');
console.log('   ❌ "Agricultural Activity" → ✅ Specific weather event title');
console.log('   ❌ Missing temperature → ✅ "Min temp: 32°C"'); 
console.log('   ❌ Missing protection → ✅ "Protection: Row covers"');