import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Text,
  Spinner,
  Badge,
  Alert,
  AlertIcon,
  Divider,
  Collapse,
  useColorModeValue,
  IconButton,
  Tooltip,
  Progress,
  Button,
  useDisclosure
} from '@chakra-ui/react';
import {
  StandardInput,
  StandardField,
  StandardAlert,
  StandardButton,
  ConsumerTooltip
} from 'components/Design/StandardComponents';
import {
  FaSearch,
  FaTimes,
  FaLeaf,
  FaInfoCircle,
  FaCheckCircle,
  FaExclamationTriangle,
  FaLightbulb,
  FaChevronDown,
  FaChevronUp,
  FaSeedling,
  FaSprayCan,
  FaShieldAlt
} from 'react-icons/fa';
import { debounce } from 'lodash';
import { useIntl } from 'react-intl';

// RTK Query hooks
import { 
  useLazySearchSmartProductsQuery,
  useValidateSmartProductMutation 
} from 'store/features/api/carbonApi';

// Types
interface ProductSuggestion {
  id: string;
  name: string;
  type: string;
  type_code: string;
  manufacturer: string;
  npk?: string;
  active_ingredient?: string;
  application_rate?: string;
  confidence: number;
  matched_text: string;
  why_matched: string;
  educational_tip?: string;
}

interface ValidationResult {
  commercial_name: string;
  correct_type: string;
  npk_ratio?: string;
  confidence: number;
  warnings: string[];
  educational_tips: string[];
  manufacturer?: string;
  active_ingredient?: string;
  application_rate?: string;
  best_practices: string[];
  validation_passed: boolean;
  requires_correction: boolean;
  smart_suggestions: {
    auto_fill_npk?: string;
    recommended_type: string;
    confidence_level: string;
  };
}

interface SmartProductInputProps {
  value: string;
  onChange: (value: string, additionalData?: any) => void;
  onValidation?: (result: ValidationResult | null) => void;
  selectedChemicalType: string;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  error?: string;
  required?: boolean;
  helpText?: string;
  showEducationalTips?: boolean;
  enableAutoFill?: boolean;
  enableRealtimeSearch?: boolean;
}

// Helper function to convert type codes to user-friendly names
const getChemicalTypeName = (typeCode: string): string => {
  switch (typeCode) {
    case 'FE': return 'Fertilizer';
    case 'PE': return 'Pesticide';
    case 'HE': return 'Herbicide';
    case 'FU': return 'Fungicide';
    default: return typeCode;
  }
};

// Chemical type icons and colors
const getChemicalTypeIcon = (typeCode: string) => {
  switch (typeCode) {
    case 'FE': return FaSeedling;
    case 'PE': return FaSprayCan;
    case 'FU': return FaShieldAlt;
    case 'HE': return FaLeaf;
    default: return FaInfoCircle;
  }
};

const getChemicalTypeColor = (typeCode: string) => {
  switch (typeCode) {
    case 'FE': return 'green';
    case 'PE': return 'red';
    case 'FU': return 'blue';
    case 'HE': return 'orange';
    default: return 'gray';
  }
};

export const SmartProductInput: React.FC<SmartProductInputProps> = ({
  value,
  onChange,
  onValidation,
  selectedChemicalType,
  disabled = false,
  placeholder = "Enter product name (e.g., Miracle-Gro, Roundup, Osmocote)",
  label = "Product Name",
  error,
  required = false,
  helpText,
  showEducationalTips = true,
  enableAutoFill = true,
  enableRealtimeSearch = true
}) => {
  const intl = useIntl();
  
  // RTK Query hooks
  const [searchTrigger, searchResult] = useLazySearchSmartProductsQuery();
  const [validateProduct, validateResult] = useValidateSmartProductMutation();
  
  // Component state
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Loading states from RTK Query
  const isSearching = searchResult.isLoading || searchResult.isFetching;
  const isValidating = validateResult.isLoading;
  
  // Educational tips state
  const { isOpen: showTips, onToggle: toggleTips } = useDisclosure();
  
  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBgColor = useColorModeValue('green.50', 'green.900');
  const selectedBgColor = useColorModeValue('green.100', 'green.800');
  
  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim() || query.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      
      try {
        const result = await searchTrigger({
          q: query,
          max_results: 8,
          type_filter: selectedChemicalType
        }).unwrap();
        
        if (result.suggestions) {
          setSuggestions(result.suggestions);
          setShowSuggestions(true);
          setSelectedSuggestionIndex(-1);
        }
      } catch (error) {
        console.error('Smart product search failed:', error);
        setSuggestions([]);
      }
    }, 300),
    [searchTrigger, selectedChemicalType]
  );
  
  // Validation function
  const validateProductData = useCallback(async (productName: string) => {
    if (!productName.trim() || productName.length < 3) {
      setValidationResult(null);
      onValidation?.(null);
      return;
    }
    
    try {
      const result = await validateProduct({
        commercial_name: productName,
        user_selected_type: selectedChemicalType,
        confidence_threshold: 0.5
      }).unwrap();
      
      if (result.validation_result) {
        const validationData = result.validation_result;
        setValidationResult(validationData);
        onValidation?.(validationData);
        
        // Auto-fill NPK if enabled, available, and high confidence match
        if (enableAutoFill && 
            validationData.smart_suggestions?.auto_fill_npk && 
            validationData.confidence >= 0.7 &&
            validationData.validation_passed) {
          // Emit auto-fill data to parent
          onChange(productName, {
            auto_fill_npk: validationData.smart_suggestions.auto_fill_npk,
            manufacturer: validationData.manufacturer,
            active_ingredient: validationData.active_ingredient,
            application_rate: validationData.application_rate,
            recommended_type: validationData.smart_suggestions.recommended_type
          });
        }
      }
    } catch (error) {
      console.error('Smart product validation failed:', error);
      setValidationResult(null);
    }
  }, [validateProduct, selectedChemicalType, enableAutoFill, onChange, onValidation]);
  
  // Re-validate when chemical type changes
  const prevChemicalTypeRef = React.useRef(selectedChemicalType);
  React.useEffect(() => {
    // Only re-validate if chemical type actually changed and we have a value
    if (prevChemicalTypeRef.current !== selectedChemicalType && 
        value && 
        value.trim().length >= 3) {
      // Update the ref
      prevChemicalTypeRef.current = selectedChemicalType;
      // Trigger new validation with updated chemical type
      validateProductData(value);
    }
  }, [selectedChemicalType, value, validateProductData]); // Only depend on what we need
  
  // Handle input change
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setSearchQuery(newValue);
    onChange(newValue);
    
    // Clear validation when user is typing
    if (validationResult) {
      setValidationResult(null);
      onValidation?.(null);
    }
    
    if (enableRealtimeSearch) {
      debouncedSearch(newValue);
    }
  };
  
  // Handle input blur (trigger validation)
  const handleInputBlur = () => {
    setTimeout(() => {
      if (value.trim() && value.length >= 3) {
        validateProductData(value);
      }
      setShowSuggestions(false);
    }, 200);
  };
  
  // Handle suggestion selection
  const selectSuggestion = (suggestion: ProductSuggestion) => {
    const newValue = suggestion.name;
    setSearchQuery(newValue);
    onChange(newValue);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    
    // Trigger immediate validation
    setTimeout(() => validateProductData(newValue), 100);
    
    // Focus back to input
    inputRef.current?.focus();
  };
  
  // Keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          selectSuggestion(suggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };
  
  // Clear input
  const clearInput = () => {
    setSearchQuery('');
    onChange('');
    setSuggestions([]);
    setShowSuggestions(false);
    setValidationResult(null);
    inputRef.current?.focus();
  };
  
  // Render confidence indicator
  const renderConfidenceIndicator = (confidence: number) => {
    const level = confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'medium' : 'low';
    const color = level === 'high' ? 'green' : level === 'medium' ? 'yellow' : 'red';
    
    return (
      <HStack spacing={1}>
        <Progress 
          value={confidence * 100} 
          size="sm" 
          width="40px" 
          colorScheme={color}
          borderRadius="md"
        />
        <Text fontSize="xs" color={`${color}.600`} textTransform="capitalize">
          {level}
        </Text>
      </HStack>
    );
  };
  
  // Render suggestion item
  const renderSuggestion = (suggestion: ProductSuggestion, index: number) => {
    const Icon = getChemicalTypeIcon(suggestion.type_code);
    const colorScheme = getChemicalTypeColor(suggestion.type_code);
    const isSelected = index === selectedSuggestionIndex;
    
    return (
      <Box
        key={`${suggestion.id}-${index}`}
        p={3}
        cursor="pointer"
        bg={isSelected ? selectedBgColor : 'transparent'}
        _hover={{ bg: hoverBgColor }}
        borderRadius="md"
        border={isSelected ? `2px solid var(--chakra-colors-${colorScheme}-400)` : '1px solid transparent'}
        onClick={() => selectSuggestion(suggestion)}
        transition="all 0.2s"
      >
        <HStack spacing={3} align="flex-start">
          <Box>
            <Badge colorScheme={colorScheme} variant="solid" borderRadius="md">
              <HStack spacing={1}>
                <Icon size={12} />
                <Text fontSize="xs">{suggestion.type}</Text>
              </HStack>
            </Badge>
          </Box>
          
          <VStack align="flex-start" spacing={1} flex={1}>
            <HStack spacing={2} w="full" justify="space-between">
              <Text fontWeight="semibold" fontSize="sm" color="gray.800">
                {suggestion.name}
              </Text>
              {renderConfidenceIndicator(suggestion.confidence)}
            </HStack>
            
            <Text fontSize="xs" color="gray.600">
              {suggestion.manufacturer} • {suggestion.why_matched}
            </Text>
            
            {suggestion.npk && (
              <Badge colorScheme="green" variant="outline" fontSize="xs">
                NPK: {suggestion.npk}
              </Badge>
            )}
            
            {suggestion.educational_tip && (
              <Text fontSize="xs" color="blue.600" fontStyle="italic">
                💡 {suggestion.educational_tip}
              </Text>
            )}
          </VStack>
        </HStack>
      </Box>
    );
  };
  
  return (
    <StandardField 
      label={label} 
      required={required} 
      error={error}
      helpText={helpText}
    >
      <VStack spacing={3} align="stretch">
        {/* Main Input with Search */}
        <Box position="relative">
          <InputGroup size="lg">
            <InputLeftElement>
              {isSearching ? (
                <Spinner size="sm" color="green.500" />
              ) : (
                <FaSearch color="gray" size={16} />
              )}
            </InputLeftElement>
            
            <StandardInput
              ref={inputRef}
              value={searchQuery || value}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              borderRadius="xl"
              fontSize="md"
              paddingLeft="3rem"
            />
            
            <InputRightElement width="fit-content" pr={2}>
              <HStack spacing={1}>
                {isValidating && <Spinner size="sm" color="green.500" />}
                {value && (
                  <Tooltip label="Clear input" placement="top">
                    <IconButton
                      aria-label="Clear input"
                      icon={<FaTimes />}
                      size="sm"
                      variant="ghost"
                      colorScheme="gray"
                      onClick={clearInput}
                      disabled={disabled}
                    />
                  </Tooltip>
                )}
              </HStack>
            </InputRightElement>
          </InputGroup>
          
          {/* Suggestions Dropdown */}
          <Collapse in={showSuggestions && suggestions.length > 0}>
            <Box
              ref={suggestionsRef}
              position="absolute"
              top="100%"
              left={0}
              right={0}
              zIndex={1000}
              bg={bgColor}
              border="1px solid"
              borderColor={borderColor}
              borderRadius="xl"
              mt={2}
              maxH="300px"
              overflowY="auto"
              boxShadow="lg"
            >
              <VStack spacing={0} align="stretch" p={2}>
                {suggestions.map((suggestion, index) => renderSuggestion(suggestion, index))}
              </VStack>
            </Box>
          </Collapse>
        </Box>
        
        {/* Validation Results */}
        {validationResult && (
          <VStack spacing={3} align="stretch">
            {/* Validation Status */}
            <Alert 
              status={validationResult.validation_passed ? "success" : "info"}
              borderRadius="lg"
              variant="left-accent"
            >
              <AlertIcon as={validationResult.validation_passed ? FaCheckCircle : FaInfoCircle} />
              <VStack align="start" spacing={1} flex={1}>
                <Text fontWeight="semibold" fontSize="sm">
                  {validationResult.validation_passed && validationResult.confidence >= 0.8
                    ? "Perfect match!" 
                    : validationResult.validation_passed && validationResult.confidence >= 0.6
                    ? "Good match!"
                    : `Detected as ${getChemicalTypeName(validationResult.correct_type)}`
                  }
                </Text>
                <Text fontSize="xs" color="gray.600">
                  {validationResult.validation_passed 
                    ? `${Math.round(validationResult.confidence * 100)}% confidence`
                    : `${Math.round(validationResult.confidence * 100)}% confidence • Consider selecting ${getChemicalTypeName(validationResult.correct_type)} type above`
                  }
                  {validationResult.npk_ratio && ` • NPK: ${validationResult.npk_ratio}`}
                </Text>
              </VStack>
            </Alert>
            
            {/* Type Suggestion - When type mismatch detected */}
            {!validationResult.validation_passed && validationResult.confidence >= 0.5 && (
              <Alert status="warning" borderRadius="lg" variant="left-accent">
                <AlertIcon />
                <VStack align="start" spacing={1} flex={1}>
                  <Text fontWeight="semibold" fontSize="sm">
                    Detected as {getChemicalTypeName(validationResult.correct_type)}
                  </Text>
                  <Text fontSize="xs" color="orange.700">
                    Please select "{getChemicalTypeName(validationResult.correct_type)}" in the Type dropdown above for accurate carbon calculation
                  </Text>
                </VStack>
              </Alert>
            )}
            
            {/* Other Warnings - Only show most important one */}
            {validationResult.warnings.length > 0 && !validationResult.validation_passed && validationResult.confidence < 0.5 && (
              <StandardAlert 
                status="warning" 
                description={validationResult.warnings[0]} // Only show first/most important warning
              />
            )}
            
            {/* Educational Tips - Only for successful matches */}
            {showEducationalTips && validationResult.validation_passed && validationResult.educational_tips.length > 0 && (
              <Box>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<FaLightbulb />}
                  rightIcon={showTips ? <FaChevronUp /> : <FaChevronDown />}
                  onClick={toggleTips}
                  colorScheme="blue"
                  fontSize="sm"
                  color="blue.600"
                >
                  💡 Tips for {validationResult.commercial_name}
                </Button>
                
                <Collapse in={showTips}>
                  <Box mt={2} p={3} bg="blue.50" borderRadius="lg" border="1px solid" borderColor="blue.200">
                    <VStack spacing={2} align="stretch">
                      {validationResult.educational_tips.slice(0, 3).map((tip, index) => (
                        <HStack key={index} align="flex-start" spacing={2}>
                          <FaInfoCircle color="var(--chakra-colors-blue-500)" size={14} style={{ marginTop: 2 }} />
                          <Text fontSize="sm" color="blue.700">{tip}</Text>
                        </HStack>
                      ))}
                    </VStack>
                  </Box>
                </Collapse>
              </Box>
            )}
            
            {/* Auto-fill Success - Only for high confidence matches */}
            {enableAutoFill && 
             validationResult.smart_suggestions?.auto_fill_npk && 
             validationResult.confidence >= 0.7 &&
             validationResult.validation_passed && (
              <Alert status="info" borderRadius="lg" variant="left-accent">
                <AlertIcon />
                <Text fontSize="sm">
                  <Text as="span" fontWeight="semibold">NPK Auto-filled:</Text> {validationResult.smart_suggestions.auto_fill_npk}
                </Text>
              </Alert>
            )}
          </VStack>
        )}
      </VStack>
    </StandardField>
  );
};

export default SmartProductInput;