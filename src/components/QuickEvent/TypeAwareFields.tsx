import React, { useCallback, useMemo } from 'react';
import { VStack, HStack, InputGroup, InputRightAddon, Text, Box, Badge, Icon } from '@chakra-ui/react';
import { useIntl } from 'react-intl';
import { FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import {
  StandardField,
  StandardInput,
  StandardSelect,
  StandardTextarea
} from 'components/Design';
import {
  QuickEventField,
  QuickEventTypeConfig,
  getQuickEventFields,
  getDefaultFieldValues
} from 'config/quickEventFields';
import {
  validateConcentration,
  ConcentrationFeedback
} from 'components/Forms/ConcentrationValidation';

interface TypeAwareFieldsProps {
  /**
   * Template ID to determine which fields to show
   */
  templateId: string;

  /**
   * Current field values
   */
  values: Record<string, unknown>;

  /**
   * Handler for field value changes
   */
  onChange: (fieldName: string, value: unknown) => void;

  /**
   * Optional validation errors keyed by field name
   */
  errors?: Record<string, string>;

  /**
   * Whether all fields are disabled
   */
  isDisabled?: boolean;
}

/**
 * TypeAwareFields Component
 *
 * Renders dynamic form fields based on the selected event template.
 * Uses field configurations from quickEventFields.ts and i18n for all labels.
 *
 * Features:
 * - Dynamic field rendering based on template type
 * - Conditional field visibility (showIf logic)
 * - Smart defaults for each field
 * - Full i18n support for labels, help text, and options
 * - Unit display for numeric fields
 */
export const TypeAwareFields: React.FC<TypeAwareFieldsProps> = ({
  templateId,
  values,
  onChange,
  errors = {},
  isDisabled = false
}) => {
  const intl = useIntl();

  // Get field configuration for this template
  const config = useMemo(() => getQuickEventFields(templateId), [templateId]);

  // Render a single field based on its configuration
  const renderField = useCallback(
    (field: QuickEventField) => {
      // Check showIf condition
      if (field.showIf && !field.showIf(values)) {
        return null;
      }

      const label = intl.formatMessage({ id: field.labelKey });
      const helpText = field.helpKey
        ? intl.formatMessage({ id: field.helpKey })
        : undefined;
      const placeholder = field.placeholderKey
        ? intl.formatMessage({ id: field.placeholderKey })
        : undefined;
      const error = errors[field.name];
      const value = values[field.name] ?? field.default ?? '';
      const unit = field.unitKey ? intl.formatMessage({ id: field.unitKey }) : undefined;

      switch (field.type) {
        case 'select':
          return (
            <StandardField
              key={field.name}
              label={label}
              required={field.required}
              helpText={helpText}
              error={error}
            >
              <StandardSelect
                value={value as string}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  onChange(field.name, e.target.value)
                }
                isDisabled={isDisabled}
              >
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {intl.formatMessage({ id: option.labelKey })}
                  </option>
                ))}
              </StandardSelect>
            </StandardField>
          );

        case 'number':
          // Check if this field has a unit dropdown (like area_covered + area_unit)
          if (field.hasUnitDropdown && field.unitFieldName) {
            const unitValue = values[field.unitFieldName] as string || '';
            return (
              <StandardField
                key={field.name}
                label={label}
                required={field.required}
                helpText={helpText}
                error={error}
              >
                <HStack spacing={2}>
                  <Box flex={2}>
                    <StandardInput
                      type="number"
                      value={value}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        onChange(field.name, parseFloat(e.target.value) || 0)
                      }
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      isDisabled={isDisabled}
                    />
                  </Box>
                  <Box flex={1}>
                    <StandardSelect
                      value={unitValue}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        onChange(field.unitFieldName!, e.target.value)
                      }
                      isDisabled={isDisabled}
                      size="lg"
                    >
                      {field.unitOptions?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {intl.formatMessage({ id: option.labelKey })}
                        </option>
                      ))}
                    </StandardSelect>
                  </Box>
                </HStack>
              </StandardField>
            );
          }

          // Regular number field with static unit suffix
          return (
            <StandardField
              key={field.name}
              label={label}
              required={field.required}
              helpText={helpText}
              error={error}
            >
              {unit ? (
                <InputGroup size="lg">
                  <StandardInput
                    type="number"
                    value={value}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      onChange(field.name, parseFloat(e.target.value) || 0)
                    }
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    isDisabled={isDisabled}
                    borderRightRadius={0}
                  />
                  <InputRightAddon
                    bg="gray.100"
                    color="gray.600"
                    fontWeight="medium"
                    fontSize="sm"
                    borderRadius="lg"
                    borderLeftRadius={0}
                    h="auto"
                  >
                    {unit}
                  </InputRightAddon>
                </InputGroup>
              ) : (
                <StandardInput
                  type="number"
                  value={value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onChange(field.name, parseFloat(e.target.value) || 0)
                  }
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  isDisabled={isDisabled}
                />
              )}
            </StandardField>
          );

        case 'textarea':
          return (
            <StandardField
              key={field.name}
              label={label}
              required={field.required}
              helpText={helpText}
              error={error}
            >
              <StandardTextarea
                value={value as string}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  onChange(field.name, e.target.value)
                }
                placeholder={placeholder}
                isDisabled={isDisabled}
              />
            </StandardField>
          );

        case 'text':
        default:
          // Check if this is a concentration field with validation
          if (field.validationType === 'concentration' && config?.eventType) {
            const concentrationValue = (value as string) || '';
            const chemicalType = config.eventType; // FE, PE, HE, FU
            const concentrationValidation = concentrationValue.trim()
              ? validateConcentration(concentrationValue, chemicalType)
              : null;

            // Get the dynamic label based on chemical type (matching ChemicalTab-ENHANCED.jsx)
            const concentrationLabel = chemicalType === 'FE'
              ? intl.formatMessage({ id: 'quickAdd.fields.concentration.npkRatio' }, { defaultMessage: 'NPK Ratio' })
              : chemicalType === 'PE'
              ? intl.formatMessage({ id: 'quickAdd.fields.concentration.pesticideConcentration' }, { defaultMessage: 'Pesticide Concentration' })
              : chemicalType === 'HE'
              ? intl.formatMessage({ id: 'quickAdd.fields.concentration.herbicideConcentration' }, { defaultMessage: 'Herbicide Concentration' })
              : chemicalType === 'FU'
              ? intl.formatMessage({ id: 'quickAdd.fields.concentration.fungicideConcentration' }, { defaultMessage: 'Fungicide Concentration' })
              : label;

            return (
              <StandardField
                key={field.name}
                label={
                  <HStack spacing={2} align="center">
                    <Text>{concentrationLabel}</Text>
                    {concentrationValidation && (
                      <Badge
                        colorScheme={concentrationValidation.isValid ? 'green' : 'red'}
                        variant={concentrationValidation ? 'solid' : 'outline'}
                        fontSize="xs"
                      >
                        {concentrationValidation.isValid ? '✓ Valid' : '✗ Invalid'}
                      </Badge>
                    )}
                  </HStack>
                }
                required={field.required}
                error={error || (concentrationValidation && !concentrationValidation.isValid ? concentrationValidation.errors[0] : undefined)}
              >
                <VStack spacing={2} align="stretch">
                  <StandardInput
                    type="text"
                    value={concentrationValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      onChange(field.name, e.target.value)
                    }
                    placeholder={placeholder}
                    isDisabled={isDisabled}
                    borderColor={
                      concentrationValidation?.isValid
                        ? 'green.400'
                        : concentrationValidation && !concentrationValidation.isValid
                        ? 'red.400'
                        : undefined
                    }
                  />
                  {/* Show validation feedback - matching ChemicalTab-ENHANCED.jsx */}
                  <ConcentrationFeedback
                    validation={
                      concentrationValidation || {
                        isValid: false,
                        format: 'unknown',
                        errors: [],
                        suggestions: []
                      }
                    }
                    chemicalType={chemicalType}
                    concentration={concentrationValue}
                  />
                </VStack>
              </StandardField>
            );
          }

          // Regular text field without special validation
          return (
            <StandardField
              key={field.name}
              label={label}
              required={field.required}
              helpText={helpText}
              error={error}
            >
              <StandardInput
                type="text"
                value={value as string}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange(field.name, e.target.value)
                }
                placeholder={placeholder}
                isDisabled={isDisabled}
              />
            </StandardField>
          );
      }
    },
    [intl, values, onChange, errors, isDisabled, config]
  );

  // Group fields into rows for better layout
  const groupFieldsIntoRows = useCallback(
    (fields: QuickEventField[]) => {
      // Find all unit field names that are handled by hasUnitDropdown
      const unitFieldNames = new Set(
        fields
          .filter((f) => f.hasUnitDropdown && f.unitFieldName)
          .map((f) => f.unitFieldName!)
      );

      const visibleFields = fields.filter(
        (field) =>
          (!field.showIf || field.showIf(values)) &&
          // Skip standalone unit fields that are rendered with their parent
          !unitFieldNames.has(field.name)
      );

      // Group numeric fields with similar widths into rows of 2-3
      const rows: QuickEventField[][] = [];
      let currentRow: QuickEventField[] = [];

      visibleFields.forEach((field) => {
        // NPK percentages should be grouped together
        if (
          field.name === 'nitrogen_percentage' ||
          field.name === 'phosphorus_percentage' ||
          field.name === 'potassium_percentage'
        ) {
          if (currentRow.length > 0) {
            rows.push(currentRow);
            currentRow = [];
          }
          currentRow.push(field);
          if (currentRow.length === 3) {
            rows.push(currentRow);
            currentRow = [];
          }
        }
        // Volume and area fields can be paired
        else if (
          (field.name === 'volume_applied' ||
            field.name === 'area_treated' ||
            field.name === 'area_covered') &&
          currentRow.length === 0
        ) {
          currentRow.push(field);
        } else if (
          (field.name === 'volume_applied' ||
            field.name === 'area_treated' ||
            field.name === 'area_covered') &&
          currentRow.length === 1 &&
          (currentRow[0].name === 'volume_applied' ||
            currentRow[0].name === 'area_treated' ||
            currentRow[0].name === 'area_covered')
        ) {
          currentRow.push(field);
          rows.push(currentRow);
          currentRow = [];
        }
        // Water volume and area covered can be paired
        else if (
          (field.name === 'water_volume' ||
            field.name === 'area_covered') &&
          currentRow.length === 0
        ) {
          currentRow.push(field);
        } else if (
          (field.name === 'water_volume' ||
            field.name === 'area_covered') &&
          currentRow.length === 1 &&
          (currentRow[0].name === 'water_volume' ||
            currentRow[0].name === 'area_covered')
        ) {
          currentRow.push(field);
          rows.push(currentRow);
          currentRow = [];
        }
        // Fuel consumed and fuel type can be paired
        else if (
          field.name === 'fuel_consumed' &&
          currentRow.length === 0
        ) {
          currentRow.push(field);
        } else if (
          field.name === 'fuel_type' &&
          currentRow.length === 1 &&
          currentRow[0].name === 'fuel_consumed'
        ) {
          currentRow.push(field);
          rows.push(currentRow);
          currentRow = [];
        }
        // Everything else goes in its own row
        else {
          if (currentRow.length > 0) {
            rows.push(currentRow);
            currentRow = [];
          }
          rows.push([field]);
        }
      });

      // Don't forget the last row
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }

      return rows;
    },
    [values]
  );

  // No config found for this template
  if (!config) {
    return null;
  }

  const fieldRows = groupFieldsIntoRows(config.quickFields);

  return (
    <VStack spacing={5} align="stretch" w="100%">
      {fieldRows.map((row, rowIndex) => {
        if (row.length === 1) {
          return renderField(row[0]);
        }

        // Multiple fields in a row
        return (
          <HStack key={rowIndex} spacing={4} align="start">
            {row.map((field) => (
              <VStack key={field.name} flex={1} align="stretch">
                {renderField(field)}
              </VStack>
            ))}
          </HStack>
        );
      })}
    </VStack>
  );
};

/**
 * Hook to manage type-aware field state
 */
export const useTypeAwareFields = (templateId: string) => {
  const [values, setValues] = React.useState<Record<string, unknown>>(() =>
    getDefaultFieldValues(templateId)
  );

  // Reset values when template changes
  React.useEffect(() => {
    setValues(getDefaultFieldValues(templateId));
  }, [templateId]);

  const handleChange = useCallback((fieldName: string, value: unknown) => {
    setValues((prev) => ({
      ...prev,
      [fieldName]: value
    }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setValues(getDefaultFieldValues(templateId));
  }, [templateId]);

  return {
    values,
    setValues,
    handleChange,
    resetToDefaults
  };
};

export default TypeAwareFields;
