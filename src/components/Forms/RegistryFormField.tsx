/**
 * RegistryFormField — Renders a single form input from a FieldConfig.
 *
 * Reads the registry's FieldConfig and renders the appropriate StandardComponent
 * input widget (text, number, select, textarea, boolean toggle). Integrates with
 * react-hook-form via Controller.
 *
 * For complex fields that need custom rendering (NPK trio, EPA sections,
 * concentration validation), register a custom renderer in CUSTOM_FIELD_RENDERERS.
 *
 * Usage:
 *   const { fields } = useFormFields({ eventType: 'chemical', subtype: 'FE' });
 *   return fields.map(f => (
 *     <RegistryFormField key={f.name} field={f} control={control} eventData={watchedValues} />
 *   ));
 */

import React from 'react';

import { Checkbox, HStack, Box } from '@chakra-ui/react';
import { Controller, type Control } from 'react-hook-form';
import { useIntl } from 'react-intl';

import type { FieldConfig } from 'src/config/events';
import { getEnumOptions, type EnumSourceKey } from 'src/config/events';
import {
  StandardField,
  StandardInput,
  StandardSelect,
  StandardTextarea
} from 'src/components/Design/StandardComponents';

// ============================================================================
// Custom renderer registry (escape hatch for complex fields)
// ============================================================================

/**
 * Custom renderer component type.
 * Receives the field config + form control + event data.
 * Register overrides for fields that need more than standard inputs
 * (e.g., NPK trio, concentration validation, summary mode sections).
 */
export interface CustomFieldRendererProps {
  field: FieldConfig;
  control: Control<any>;
  eventData: Record<string, unknown>;
  isDisabled?: boolean;
}

type CustomFieldRenderer = React.ComponentType<CustomFieldRendererProps>;

/**
 * Map of field names → custom renderer components.
 * When a field has an entry here, RegistryFormField delegates to it
 * instead of rendering a standard input.
 *
 * Register custom renderers for complex fields:
 *   CUSTOM_FIELD_RENDERERS.set('nitrogen_percentage', NPKTrioField);
 *   CUSTOM_FIELD_RENDERERS.set('concentration', ConcentrationField);
 */
export const CUSTOM_FIELD_RENDERERS = new Map<string, CustomFieldRenderer>();

// ============================================================================
// Label resolution
// ============================================================================

/**
 * Map unit field names to their enum source keys.
 * Handles compound names like 'application_fuel_unit' → 'fuel_units'.
 */
const UNIT_FIELD_TO_ENUM: Record<string, EnumSourceKey> = {
  volume_unit: 'volume_units',
  area_unit: 'area_units',
  fuel_unit: 'fuel_units',
  yield_unit: 'yield_units',
  transportation_unit: 'distance_units',
  irrigation_depth_unit: 'depth_units',
  application_fuel_unit: 'fuel_units',
  amendment_amount_unit: 'volume_units',
  depth_unit: 'depth_units'
};

function resolveUnitOptions(unitFieldName: string) {
  const key = UNIT_FIELD_TO_ENUM[unitFieldName];
  if (key) return getEnumOptions(key) ?? [];
  // Fallback: try direct derivation (e.g., 'foo_unit' → 'foo_units')
  const derived = unitFieldName.replace(/_unit$/, '_units') as EnumSourceKey;
  return getEnumOptions(derived) ?? [];
}

function resolveLabel(labelKey: string, intl?: ReturnType<typeof useIntl>): string {
  if (intl) {
    // Try i18n first; fall back to key-derived label if message not found
    const msg = intl.formatMessage({ id: labelKey, defaultMessage: '' });
    if (msg && msg !== labelKey) return msg;
  }
  // Derive from key: 'events.chemical.fields.commercialName' → 'Commercial Name'
  const lastSegment = labelKey.split('.').pop() || labelKey;
  return lastSegment
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

// ============================================================================
// Main component
// ============================================================================

export interface RegistryFormFieldProps {
  /** Field configuration from the registry */
  field: FieldConfig;
  /** react-hook-form control object */
  control: Control<any>;
  /** Current form/event data (for visibility predicates) */
  eventData: Record<string, unknown>;
  /** Disable the input */
  isDisabled?: boolean;
  /** Field-level errors from react-hook-form */
  errors?: Record<string, { message?: string }>;
}

export const RegistryFormField: React.FC<RegistryFormFieldProps> = ({
  field,
  control,
  eventData,
  isDisabled = false,
  errors = {}
}) => {
  const intl = useIntl();

  // --- Check custom renderer first ---
  const CustomRenderer = CUSTOM_FIELD_RENDERERS.get(field.name);
  if (CustomRenderer) {
    return <CustomRenderer field={field} control={control} eventData={eventData} isDisabled={isDisabled} />;
  }

  // --- Check visibility ---
  if (field.visibleWhen && !field.visibleWhen(eventData)) return null;

  // --- Resolve display props ---
  const label = resolveLabel(field.labelKey, intl);
  const helpText = field.helpKey ? resolveLabel(field.helpKey, intl) : undefined;
  const placeholder = field.placeholderKey ? resolveLabel(field.placeholderKey, intl) : undefined;
  const error = errors[field.name]?.message;
  const isRequired = typeof field.required === 'function' ? field.required(eventData) : field.required === true;

  // --- Render by value type ---
  switch (field.valueType) {
    case 'enum': {
      const options = field.enumSource ? (getEnumOptions(field.enumSource as EnumSourceKey) ?? []) : [];
      return (
        <StandardField label={label} required={isRequired} helpText={helpText} error={error}>
          <Controller
            name={field.name}
            control={control}
            render={({ field: formField }) => (
              <StandardSelect
                {...formField}
                value={formField.value ?? ''}
                placeholder={placeholder || `Select ${label.toLowerCase()}`}
                isDisabled={isDisabled}
              >
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {resolveLabel(opt.labelKey, intl)}
                  </option>
                ))}
              </StandardSelect>
            )}
          />
        </StandardField>
      );
    }

    case 'number': {
      // If field has a unit companion, render number + unit select side by side
      if (field.unitField) {
        const unitOptions = resolveUnitOptions(field.unitField);
        return (
          <StandardField label={label} required={isRequired} helpText={helpText} error={error}>
            <HStack spacing={2}>
              <Box flex={2}>
                <Controller
                  name={field.name}
                  control={control}
                  render={({ field: formField }) => (
                    <StandardInput
                      {...formField}
                      type="number"
                      value={formField.value ?? ''}
                      placeholder={placeholder}
                      isDisabled={isDisabled}
                      step="any"
                    />
                  )}
                />
              </Box>
              {unitOptions.length > 0 && (
                <Box flex={1}>
                  <Controller
                    name={field.unitField!}
                    control={control}
                    render={({ field: unitFormField }) => (
                      <StandardSelect
                        {...unitFormField}
                        value={unitFormField.value ?? ''}
                        isDisabled={isDisabled}
                        size="sm"
                      >
                        {unitOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {resolveLabel(opt.labelKey, intl)}
                          </option>
                        ))}
                      </StandardSelect>
                    )}
                  />
                </Box>
              )}
            </HStack>
          </StandardField>
        );
      }

      return (
        <StandardField label={label} required={isRequired} helpText={helpText} error={error}>
          <Controller
            name={field.name}
            control={control}
            render={({ field: formField }) => (
              <StandardInput
                {...formField}
                type="number"
                value={formField.value ?? ''}
                placeholder={placeholder}
                isDisabled={isDisabled}
                step="any"
              />
            )}
          />
        </StandardField>
      );
    }

    case 'boolean':
      return (
        <StandardField label="" error={error}>
          <Controller
            name={field.name}
            control={control}
            render={({ field: formField }) => (
              <Checkbox
                isChecked={Boolean(formField.value)}
                onChange={formField.onChange}
                isDisabled={isDisabled}
                colorScheme="green"
              >
                {label}
              </Checkbox>
            )}
          />
        </StandardField>
      );

    case 'text':
      return (
        <StandardField label={label} required={isRequired} helpText={helpText} error={error}>
          <Controller
            name={field.name}
            control={control}
            render={({ field: formField }) => (
              <StandardTextarea
                {...formField}
                value={formField.value ?? ''}
                placeholder={placeholder}
                isDisabled={isDisabled}
                rows={3}
              />
            )}
          />
        </StandardField>
      );

    case 'date':
    case 'date-time':
      return (
        <StandardField label={label} required={isRequired} helpText={helpText} error={error}>
          <Controller
            name={field.name}
            control={control}
            render={({ field: formField }) => (
              <StandardInput
                {...formField}
                type={field.valueType === 'date' ? 'date' : 'datetime-local'}
                value={formField.value ?? ''}
                isDisabled={isDisabled}
              />
            )}
          />
        </StandardField>
      );

    case 'string':
    default:
      return (
        <StandardField label={label} required={isRequired} helpText={helpText} error={error}>
          <Controller
            name={field.name}
            control={control}
            render={({ field: formField }) => (
              <StandardInput
                {...formField}
                value={formField.value ?? ''}
                placeholder={placeholder}
                isDisabled={isDisabled}
              />
            )}
          />
        </StandardField>
      );
  }
};
