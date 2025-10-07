import React from 'react';
import {
  Box,
  Text,
  HStack,
  VStack,
  Icon,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react';
import { FaCheckCircle, FaExclamationTriangle, FaFlask, FaBug } from 'react-icons/fa';

export interface ConcentrationValidationResult {
  isValid: boolean;
  format: 'npk' | 'percentage' | 'unknown';
  errors: string[];
  suggestions: string[];
  parsed?: {
    nitrogen?: number;
    phosphorus?: number; 
    potassium?: number;
    percentage?: number;
  };
}

/**
 * Validates concentration input based on chemical type
 * FE (Fertilizer) = NPK format (e.g., "10-10-10", "16-16-16")  
 * PE/HE/FU (Pesticide/Herbicide/Fungicide) = Percentage format (e.g., "2.5%", "70%")
 */
export const validateConcentration = (
  concentration: string, 
  chemicalType: string
): ConcentrationValidationResult => {
  // Safety checks for invalid inputs
  if (!concentration || typeof concentration !== 'string') {
    return {
      isValid: false,
      format: 'unknown',
      errors: ['Concentration is required'],
      suggestions: getFormatSuggestions(chemicalType || '')
    };
  }

  if (!chemicalType || typeof chemicalType !== 'string') {
    return {
      isValid: false,
      format: 'unknown',
      errors: ['Chemical type must be selected first'],
      suggestions: ['Select chemical type first']
    };
  }

  if (!concentration.trim()) {
    return {
      isValid: false,
      format: 'unknown',
      errors: ['Concentration is required'],
      suggestions: getFormatSuggestions(chemicalType)
    };
  }

  const trimmed = concentration.trim();
  const isFertilizer = chemicalType === 'FE';
  const isPesticide = ['PE', 'HE', 'FU'].includes(chemicalType);

  if (isFertilizer) {
    return validateNPKFormat(trimmed);
  } else if (isPesticide) {
    return validatePercentageFormat(trimmed);
  } else {
    return {
      isValid: false,
      format: 'unknown', 
      errors: ['Unknown chemical type'],
      suggestions: []
    };
  }
};

/**
 * Validates NPK format for fertilizers (e.g., "10-10-10", "16-16-16")
 */
const validateNPKFormat = (input: string): ConcentrationValidationResult => {
  const errors: string[] = [];
  const suggestions: string[] = [];

  // Check for percentage format (common mistake)
  if (input.includes('%')) {
    errors.push('Fertilizers require NPK format, not percentage');
    suggestions.push('Use NPK format like "10-10-10" or "16-16-16"');
    return { isValid: false, format: 'percentage', errors, suggestions };
  }

  // NPK pattern: number-number-number (allows decimals)
  const npkPattern = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/;
  const match = input.match(npkPattern);

  if (!match) {
    errors.push('Invalid NPK format');
    suggestions.push('Use format: N-P-K (e.g., "10-10-10", "16-16-16", "20-5-5")');
    return { isValid: false, format: 'unknown', errors, suggestions };
  }

  const nitrogen = parseFloat(match[1]);
  const phosphorus = parseFloat(match[2]); 
  const potassium = parseFloat(match[3]);

  // Validate individual NPK values
  if (nitrogen < 0 || nitrogen > 50) {
    errors.push('Nitrogen percentage should be 0-50%');
  }
  if (phosphorus < 0 || phosphorus > 50) {
    errors.push('Phosphorus percentage should be 0-50%');
  }
  if (potassium < 0 || potassium > 50) {
    errors.push('Potassium percentage should be 0-50%');
  }

  // Check total NPK (should not exceed 100%)
  const total = nitrogen + phosphorus + potassium;
  if (total > 100) {
    errors.push(`Total NPK (${total.toFixed(1)}%) cannot exceed 100%`);
  }

  // Warnings for unusual values
  if (total < 5) {
    suggestions.push('Very low NPK total - verify this is correct');
  }
  if (nitrogen === 0 && phosphorus === 0 && potassium === 0) {
    errors.push('All NPK values cannot be zero');
  }

  return {
    isValid: errors.length === 0,
    format: 'npk',
    errors,
    suggestions,
    parsed: { nitrogen, phosphorus, potassium }
  };
};

/**
 * Validates percentage format for pesticides/herbicides/fungicides (e.g., "2.5%", "70%")
 */
const validatePercentageFormat = (input: string): ConcentrationValidationResult => {
  const errors: string[] = [];
  const suggestions: string[] = [];

  // Check for NPK format (common mistake)
  if (input.includes('-') && /^\d+-\d+-\d+$/.test(input)) {
    errors.push('Pesticides/herbicides/fungicides require percentage format, not NPK');
    suggestions.push('Use percentage format like "2.5%" or "70%"');
    return { isValid: false, format: 'npk', errors, suggestions };
  }

  // Percentage pattern: number followed by % (allows decimals and negative)
  const percentagePattern = /^(-?\d+(?:\.\d+)?)%?$/;
  const match = input.match(percentagePattern);

  if (!match) {
    errors.push('Invalid percentage format');
    suggestions.push('Use format: number% (e.g., "2.5%", "70%", "0.5%")');
    return { isValid: false, format: 'unknown', errors, suggestions };
  }

  const percentage = parseFloat(match[1]);

  // Validate percentage range
  if (percentage < 0) {
    errors.push('Percentage cannot be negative');
  }
  if (percentage > 100) {
    errors.push('Percentage cannot exceed 100%');
  }

  // Warnings for unusual values
  if (percentage === 0) {
    errors.push('Percentage cannot be zero');
  }
  if (percentage > 90) {
    suggestions.push('Very high concentration - verify this is correct');
  }
  if (percentage < 0.1) {
    suggestions.push('Very low concentration - verify this is correct');
  }

  return {
    isValid: errors.length === 0,
    format: 'percentage',
    errors,
    suggestions,
    parsed: { percentage }
  };
};

/**
 * Get format suggestions based on chemical type
 */
const getFormatSuggestions = (chemicalType: string): string[] => {
  switch (chemicalType) {
    case 'FE':
      return [
        'Use NPK format: "10-10-10"',
        'Examples: "16-16-16", "20-5-5", "15-30-15"'
      ];
    case 'PE':
    case 'HE': 
    case 'FU':
      return [
        'Use percentage format: "2.5%"',
        'Examples: "70%", "0.5%", "10%"'
      ];
    default:
      return ['Select chemical type first'];
  }
};

/**
 * React component for displaying concentration validation feedback
 */
interface ConcentrationFeedbackProps {
  validation: ConcentrationValidationResult;
  chemicalType: string;
  concentration: string;
}

export const ConcentrationFeedback: React.FC<ConcentrationFeedbackProps> = ({
  validation,
  chemicalType,
  concentration
}) => {
  if (!concentration?.trim()) {
    return (
      <Box mt={2}>
        <Text fontSize="sm" color="gray.500">
          {getFormatGuidance(chemicalType)}
        </Text>
      </Box>
    );
  }

  return (
    <VStack spacing={2} mt={2} align="stretch">
      {/* Validation Status */}
      <HStack spacing={2}>
        <Icon 
          as={validation.isValid ? FaCheckCircle : FaExclamationTriangle}
          color={validation.isValid ? 'green.500' : 'red.500'}
        />
        <Text 
          fontSize="sm" 
          fontWeight="medium"
          color={validation.isValid ? 'green.700' : 'red.700'}
        >
          {validation.isValid ? 'Valid format' : 'Invalid format'}
        </Text>
        <Badge 
          size="sm"
          colorScheme={validation.format === 'npk' ? 'green' : validation.format === 'percentage' ? 'blue' : 'gray'}
        >
          {validation.format === 'npk' ? 'NPK Format' : 
           validation.format === 'percentage' ? 'Percentage Format' : 
           'Unknown Format'}
        </Badge>
      </HStack>

      {/* Parsed Values Display */}
      {validation.isValid && validation.parsed && (
        <Box p={2} bg="green.50" borderRadius="md" borderWidth="1px" borderColor="green.200">
          {validation.format === 'npk' && validation.parsed.nitrogen !== undefined && (
            <HStack spacing={4} fontSize="sm">
              <Text><strong>N:</strong> {validation.parsed.nitrogen}%</Text>
              <Text><strong>P:</strong> {validation.parsed.phosphorus}%</Text>
              <Text><strong>K:</strong> {validation.parsed.potassium}%</Text>
              <Text color="gray.600">
                Total: {((validation.parsed.nitrogen || 0) + (validation.parsed.phosphorus || 0) + (validation.parsed.potassium || 0)).toFixed(1)}%
              </Text>
            </HStack>
          )}
          {validation.format === 'percentage' && validation.parsed.percentage !== undefined && (
            <Text fontSize="sm">
              <strong>Concentration:</strong> {validation.parsed.percentage}%
            </Text>
          )}
        </Box>
      )}

      {/* Errors */}
      {validation.errors && validation.errors.length > 0 && (
        <Alert status="error" size="sm" borderRadius="md">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            {validation.errors.map((error, index) => (
              <Text key={index} fontSize="sm">{error}</Text>
            ))}
          </VStack>
        </Alert>
      )}

      {/* Suggestions */}
      {validation.suggestions && validation.suggestions.length > 0 && (
        <Alert status="info" size="sm" borderRadius="md">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            {validation.suggestions.map((suggestion, index) => (
              <Text key={index} fontSize="sm">{suggestion}</Text>
            ))}
          </VStack>
        </Alert>
      )}
    </VStack>
  );
};

/**
 * Get format guidance text based on chemical type
 */
const getFormatGuidance = (chemicalType: string): string => {
  // Safety check for undefined/null input
  if (!chemicalType || typeof chemicalType !== 'string') {
    return 'Select chemical type to see format requirements';
  }

  switch (chemicalType) {
    case 'FE':
      return '🌱 Fertilizer: Use NPK format (e.g., "10-10-10", "16-16-16")';
    case 'PE':
      return '🐛 Pesticide: Use percentage format (e.g., "2.5%", "70%")';
    case 'HE':
      return '🌿 Herbicide: Use percentage format (e.g., "40%", "5%")';
    case 'FU':
      return '🍄 Fungicide: Use percentage format (e.g., "80%", "1.5%")';
    default:
      return 'Select chemical type to see format requirements';
  }
};

/**
 * Quick format examples for each chemical type
 */
export const getFormatExamples = (chemicalType: string): string[] => {
  // Safety check for undefined/null input
  if (!chemicalType || typeof chemicalType !== 'string') {
    return [];
  }

  switch (chemicalType) {
    case 'FE':
      return ['10-10-10', '16-16-16', '20-5-5', '15-30-15'];
    case 'PE':
      return ['2.5%', '70%', '25%', '50%'];
    case 'HE':
      return ['40%', '5%', '15%', '2%'];
    case 'FU':
      return ['80%', '1.5%', '10%', '25%'];
    default:
      return [];
  }
};

export default ConcentrationFeedback;