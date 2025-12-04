// Quick test for the updated concentration validation
// Test the two audit guide cases: "82-0-0" fertilizer and "2.08 EC" pesticide

import { validateConcentration } from './src/components/Forms/ConcentrationValidation.tsx';

console.log('🧪 Testing Updated Concentration Validation\n');

// Test Case 1: Iowa Corn Farm - Anhydrous Ammonia (82-0-0)
console.log('📋 Test Case 1: Iowa Corn Farm Fertilizer');
console.log('Input: "82-0-0" with chemical type "FE"');
const fertilizerResult = validateConcentration('82-0-0', 'FE');
console.log('Result:', fertilizerResult);
console.log('✅ Valid:', fertilizerResult.isValid);
console.log('📊 Parsed:', fertilizerResult.parsed);
console.log('');

// Test Case 2: California Avocado - Lambda-cyhalothrin (2.08 EC)
console.log('📋 Test Case 2: California Avocado Pesticide');
console.log('Input: "2.08 EC" with chemical type "PE"');
const pesticideResult = validateConcentration('2.08 EC', 'PE');
console.log('Result:', pesticideResult);
console.log('✅ Valid:', pesticideResult.isValid);
console.log('📊 Parsed:', pesticideResult.parsed);
console.log('');

// Additional test: Traditional percentage format still works
console.log('📋 Test Case 3: Traditional Percentage Format');
console.log('Input: "2.5%" with chemical type "PE"');
const percentageResult = validateConcentration('2.5%', 'PE');
console.log('Result:', percentageResult);
console.log('✅ Valid:', percentageResult.isValid);
console.log('📊 Parsed:', percentageResult.parsed);

console.log('\n🎯 All audit guide test cases should now be supported!');
