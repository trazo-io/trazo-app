/**
 * Custom Fields Form Component
 *
 * Provides inline UI for farmers to add, edit, and remove custom fields to agricultural events.
 * Custom fields allow farmers to document additional farming practices beyond standard fields.
 *
 * Features:
 * - Add new custom fields directly in table with inline form
 * - Edit and delete custom fields
 * - Simple checkbox for consumer visibility
 * - Real-time validation using customFieldsUtils
 * - Seamless integration with event tabs
 *
 * CRITICAL: Custom fields must appear identical to standard fields (no visual distinction)
 */

import React, { useState } from 'react';
import {
  VStack,
  HStack,
  Box,
  IconButton,
  Text,
  useColorModeValue,
  Checkbox
} from '@chakra-ui/react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string } from 'zod';
import {
  StandardInput,
  StandardButton,
  StandardField,
  SectionBox,
  SectionHeader
} from 'components/Design/StandardComponents';
import {
  FaPlus,
  FaTrash,
  FaFileAlt
} from 'react-icons/fa';
import {
  CustomField,
  validateCustomFieldClient
} from 'utils/customFieldsUtils';

interface CustomFieldsFormProps {
  customFields: CustomField[] | undefined;
  onCustomFieldsChange: (fields: CustomField[]) => void;
  eventTypeId?: number;
  disabled?: boolean;
}

// Simplified validation schema for custom field form
const customFieldValidationSchema = object({
  label: string()
    .min(1, 'Field name is required')
    .max(100, 'Field name cannot exceed 100 characters'),
  value: string()
    .max(500, 'Value cannot exceed 500 characters'),
  is_consumer_visible: string().optional()
});

/**
 * CustomFieldsForm Component
 *
 * Allows farmers to add, edit, and delete custom fields for events.
 * Uses inline form for better UX and minimalist design.
 */
const CustomFieldsForm: React.FC<CustomFieldsFormProps> = ({
  customFields = [],
  onCustomFieldsChange,
  eventTypeId = 3,
  disabled = false
}) => {
  const [isAddingField, setIsAddingField] = useState(false);
  const tableHeaderBg = useColorModeValue('gray.50', 'gray.700');
  const tableBorder = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  const methods = useForm({
    resolver: zodResolver(customFieldValidationSchema),
    defaultValues: {
      label: '',
      value: '',
      is_consumer_visible: 'true'
    }
  });

  const { handleSubmit, reset, control, formState: { errors } } = methods;

  /**
   * Handle adding a new custom field
   */
  const onSubmit = (data: any) => {
    const validation = validateCustomFieldClient(data);

    if (!validation.valid) {
      console.error('Field validation failed:', validation.errors);
      return;
    }

    // Create new field with always text type and simplified visibility
    // Generate temporary client-side UUID to prevent deletion bug where all empty IDs get deleted
    const newField: CustomField = {
      id: crypto.randomUUID(), // Temporary client-side ID (will be replaced by server ID on save)
      label: data.label,
      value: data.value,
      field_type: 'text', // Always text for minimalist approach
      visibility: data.is_consumer_visible === 'true' ? 'consumer' : 'internal',
      verification: 'self_reported',
      created_at: new Date().toISOString()
    };

    const updatedFields = [...customFields, newField];
    onCustomFieldsChange(updatedFields);

    // Reset form and close adding mode
    reset();
    setIsAddingField(false);
  };

  /**
   * Handle deleting a field
   */
  const handleDeleteField = (fieldId: string) => {
    const updatedFields = customFields.filter((f) => f.id !== fieldId);
    onCustomFieldsChange(updatedFields);
  };

  /**
   * Cancel adding a field
   */
  const handleCancelAdd = () => {
    reset();
    setIsAddingField(false);
  };

  return (
    <SectionBox variant="default">
      <VStack spacing={4} align="stretch">
        {/* Section Header */}
        <SectionHeader
          icon={FaFileAlt}
          iconColor="green.500"
          title="Additional Information"
        />

        {/* Custom Fields - Stacked Card Layout */}
        {customFields.length > 0 && (
          <VStack spacing={3} align="stretch">
            {customFields.map((field) => (
              <Box
                key={field.id}
                p={3}
                borderRadius="lg"
                border="1px solid"
                borderColor={tableBorder}
                bg={useColorModeValue('white', 'gray.800')}
                _hover={{ bg: hoverBg, borderColor: 'green.300' }}
                transition="all 0.2s"
              >
                <HStack justify="space-between" align="center" spacing={3}>
                  {/* Field Label and Value */}
                  <VStack align="start" spacing={1} flex={1} minW={0}>
                    <Text fontSize="xs" fontWeight="600" color="gray.600">
                      {field.label}
                    </Text>
                    <Text fontSize="sm" fontWeight="500" color="gray.900" noOfLines={2}>
                      {String(field.value)}
                    </Text>
                  </VStack>

                  {/* Visibility Checkbox + Delete Button */}
                  <HStack spacing={2} flexShrink={0}>
                    <Checkbox
                      isChecked={field.visibility === 'consumer'}
                      isReadOnly
                      size="sm"
                      colorScheme="green"
                      isDisabled={disabled}
                    >
                      <Text fontSize="xs" color="gray.600" display={{ base: 'none', md: 'inline' }}>
                        Visible
                      </Text>
                    </Checkbox>
                    <IconButton
                      icon={<FaTrash />}
                      aria-label="Delete field"
                      size="sm"
                      colorScheme="red"
                      variant="ghost"
                      onClick={() => handleDeleteField(field.id)}
                      isDisabled={disabled}
                    />
                  </HStack>
                </HStack>
              </Box>
            ))}
          </VStack>
        )}

        {/* Empty State */}
        {customFields.length === 0 && !isAddingField && (
          <Box
            p={4}
            textAlign="center"
            borderRadius="lg"
            bg={useColorModeValue('gray.50', 'gray.700')}
            borderLeft="4px"
            borderLeftColor="green.400"
          >
            <Text color="gray.500" fontSize="sm">
              Add custom fields to document additional farming practices
            </Text>
          </Box>
        )}

        {/* Add Field Button */}
        {!isAddingField && customFields.length < 10 && (
          <HStack justify="flex-start">
            <StandardButton
              variant="outline"
              leftIcon={<FaPlus />}
              onClick={() => setIsAddingField(true)}
              size="sm"
              isDisabled={disabled}
            >
              Add Custom Field
            </StandardButton>
          </HStack>
        )}

        {/* Inline Add Form */}
        {isAddingField && customFields.length < 10 && (
          <Box
            p={4}
            borderRadius="lg"
            border="1px solid"
            borderColor="green.300"
            bg={useColorModeValue('green.50', 'gray.800')}
          >
            <form onSubmit={handleSubmit(onSubmit)}>
              <VStack spacing={4} align="stretch">
                {/* Field Name Input */}
                <StandardField
                  label="Field Name"
                  required
                  error={errors.label?.message}
                  helpText="Brief name for this information"
                >
                  <Controller
                    name="label"
                    control={control}
                    render={({ field }) => (
                      <StandardInput
                        {...field}
                        placeholder="e.g., Soil Type, Irrigation Source"
                        size="md"
                        autoFocus
                      />
                    )}
                  />
                </StandardField>

                {/* Value Input */}
                <StandardField
                  label="Value"
                  error={errors.value?.message}
                  helpText="Details for this field"
                >
                  <Controller
                    name="value"
                    control={control}
                    render={({ field }) => (
                      <StandardInput
                        {...field}
                        placeholder="e.g., Loamy soil, Well water"
                        size="md"
                      />
                    )}
                  />
                </StandardField>

                {/* Visibility Checkbox */}
                <Box>
                  <Controller
                    name="is_consumer_visible"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        isChecked={field.value === 'true'}
                        onChange={(e) => field.onChange(e.target.checked ? 'true' : 'false')}
                        size="md"
                        colorScheme="green"
                      >
                        <Text fontSize="sm" fontWeight="500" color="gray.700">
                          Visible to consumers
                        </Text>
                      </Checkbox>
                    )}
                  />
                  <Text fontSize="xs" color="gray.500" mt={1} ml={6}>
                    Show this information on public transparency pages
                  </Text>
                </Box>

                {/* Action Buttons */}
                <HStack spacing={3} justify="flex-end" pt={2}>
                  <StandardButton
                    variant="outline"
                    onClick={handleCancelAdd}
                    size="md"
                  >
                    Cancel
                  </StandardButton>
                  <StandardButton
                    variant="primary"
                    onClick={handleSubmit(onSubmit)}
                    size="md"
                  >
                    Add Field
                  </StandardButton>
                </HStack>
              </VStack>
            </form>
          </Box>
        )}

        {/* Max fields reached message */}
        {customFields.length >= 10 && (
          <Box
            p={3}
            borderRadius="lg"
            bg={useColorModeValue('orange.50', 'gray.700')}
            borderLeft="4px"
            borderLeftColor="orange.400"
          >
            <Text fontSize="sm" fontWeight="500" color="orange.700">
              Maximum 10 fields reached
            </Text>
          </Box>
        )}
      </VStack>
    </SectionBox>
  );
};

export default CustomFieldsForm;
