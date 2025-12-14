/**
 * Custom Fields Display Utilities
 * 
 * Provides utilities for displaying user-defined custom fields alongside standard
 * event fields in a seamless manner. Custom fields are indistinguishable from
 * standard fields to create a unified farming practice documentation experience.
 * 
 * CRITICAL: Custom fields must display identically in:
 * - EventPreviewModal (during event creation)
 * - ConsumerEventCard (in ProductDetail for consumers)
 * - Both must use the same formatting/filtering logic
 */

/**
 * Custom Field Interface
 * Represents a user-defined custom field attached to an event
 */
export interface CustomField {
  id: string;
  label: string;
  value: string | number;
  field_type: 'text' | 'number' | 'link' | 'photo_ref';
  visibility: 'consumer' | 'internal' | 'b2b';
  verification: 'self_reported' | 'photo_verified' | 'third_party';
  created_at?: string;
  link_url?: string;
  photo_id?: string;
}

/**
 * Filter out custom fields with empty/null values
 * 
 * CRITICAL for preview-display consistency:
 * Empty fields should not appear in either preview or final consumer display.
 * 
 * @param customFields Array of custom field objects
 * @returns Array of non-empty custom fields
 */
export function filterEmptyCustomFields(
  customFields: CustomField[] | undefined
): CustomField[] {
  if (!customFields || !Array.isArray(customFields)) {
    return [];
  }

  return customFields.filter((field) => {
    const value = field.value;
    return (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ''
    );
  });
}

/**
 * Format custom fields for display
 * 
 * Converts custom fields to display format, applying type-specific formatting:
 * - Text fields: displayed as-is
 * - Number fields: displayed with numeric formatting
 * - Link fields: displayed with link icon indicator
 * - Photo reference fields: displayed with photo badge
 * 
 * Includes verification indicators for third-party verified fields.
 * 
 * @param customFields Array of custom fields
 * @param includeEmpty If false (default), excludes fields with empty values
 * @returns Object mapping field labels to formatted display values
 */
export function formatCustomFieldsForDisplay(
  customFields: CustomField[] | undefined,
  includeEmpty: boolean = false
): Record<string, string> {
  if (!customFields) {
    return {};
  }

  const displayFields: Record<string, string> = {};

  // Filter empty values for clean display
  const fieldsToDisplay = includeEmpty
    ? customFields
    : filterEmptyCustomFields(customFields);

  fieldsToDisplay.forEach((field) => {
    let displayValue = String(field.value);

    // Apply type-specific formatting
    switch (field.field_type) {
      case 'number':
        // Format numbers with comma separators if large
        const num = parseFloat(displayValue);
        displayValue = !isNaN(num) ? num.toLocaleString() : displayValue;
        break;

      case 'link':
        // Add link indicator for link-type fields
        if (field.link_url) {
          displayValue = `${displayValue} 🔗`;
        }
        break;

      case 'photo_ref':
        // Add photo indicator for photo reference fields
        displayValue = `${displayValue} 📷`;
        break;

      case 'text':
      default:
        // Text fields displayed as-is
        break;
    }

    // Add verification indicator if third-party verified
    if (field.verification === 'third_party') {
      displayValue = `${displayValue} ✓`;
    }

    displayFields[field.label] = displayValue;
  });

  return displayFields;
}

/**
 * Filter custom fields by visibility level
 * 
 * Returns only fields visible to the specified audience.
 * Used to ensure consumers only see consumer-visible fields.
 * 
 * @param customFields Array of custom fields
 * @param visibility Visibility level to filter by
 * @returns Filtered custom fields
 */
export function filterCustomFieldsByVisibility(
  customFields: CustomField[] | undefined,
  visibility: 'consumer' | 'internal' | 'b2b' = 'consumer'
): CustomField[] {
  if (!customFields) {
    return [];
  }

  return customFields.filter(
    (field) => field.visibility === visibility
  );
}

/**
 * CRITICAL: Merge custom fields with standard event fields
 * 
 * Creates unified field display where custom fields are indistinguishable
 * from standard fields. This is essential for Trazo's design philosophy:
 * farmers should see custom fields as normal fields.
 * 
 * Implementation Notes:
 * - Custom fields are appended after standard fields
 * - Both use identical styling and formatting
 * - No "Unique Practices" or "Custom" section separators
 * - Consumer can't determine which are standard vs custom
 * 
 * @param standardFields Standard event fields (from getEventFieldDisplay)
 * @param customFields Custom fields to merge
 * @param visibility Filter custom fields by visibility (default: consumer)
 * @param includeEmpty Include empty custom fields (default: false)
 * @returns Merged fields object where custom fields are seamlessly integrated
 */
export function mergeCustomFieldsWithEventDisplay(
  standardFields: Record<string, string | React.ReactNode> | undefined,
  customFields: CustomField[] | undefined,
  visibility: 'consumer' | 'internal' | 'b2b' = 'consumer',
  includeEmpty: boolean = false
): Record<string, string | React.ReactNode> {
  const baseFields = standardFields || {};

  if (!customFields || customFields.length === 0) {
    return baseFields;
  }

  // Filter for visibility and empty values
  const visibleFields = filterCustomFieldsByVisibility(customFields, visibility);
  const nonEmptyFields = includeEmpty
    ? visibleFields
    : filterEmptyCustomFields(visibleFields);

  if (nonEmptyFields.length === 0) {
    return baseFields;
  }

  // Format custom fields for display
  const customFieldsDisplay = formatCustomFieldsForDisplay(nonEmptyFields);

  // CRITICAL: Merge seamlessly with no visual distinction
  // Custom fields appear after standard fields but use identical styling
  return {
    ...baseFields,
    ...customFieldsDisplay,
  };
}

/**
 * Get custom fields for preview display
 * 
 * Extracts and formats custom fields for display in EventPreviewModal.
 * CRITICAL: Must use identical logic to ConsumerEventCard for exact matching.
 * 
 * @param event Event object containing custom_fields in response
 * @returns Formatted custom fields for preview display
 */
export function getCustomFieldsForPreview(
  event: any
): Record<string, string> {
  const customFields = event?.custom_fields as CustomField[] | undefined;
  if (!customFields) {
    return {};
  }

  return formatCustomFieldsForDisplay(customFields, false);
}

/**
 * Get custom fields for consumer card display
 * 
 * Extracts and formats custom fields for display in ConsumerEventCard.
 * CRITICAL: Must use identical logic to EventPreviewModal for exact matching.
 * 
 * @param event Event object containing custom_fields
 * @returns Formatted custom fields for consumer display
 */
export function getCustomFieldsForConsumerCard(
  event: any
): Record<string, string> {
  const customFields = event?.custom_fields as CustomField[] | undefined;
  if (!customFields) {
    return {};
  }

  // Consumer only sees consumer-visible fields
  const visibleFields = filterCustomFieldsByVisibility(customFields, 'consumer');
  return formatCustomFieldsForDisplay(visibleFields, false);
}

/**
 * Validate custom field data structure
 * 
 * Client-side validation to catch issues before submission.
 * Server-side validation in custom_fields.py is authoritative.
 * 
 * @param field Custom field to validate
 * @returns Validation result with error messages if any
 */
export function validateCustomFieldClient(
  field: Partial<CustomField>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate label
  if (!field.label || !field.label.trim()) {
    errors.push('Label cannot be empty');
  } else if (field.label.length > 100) {
    errors.push('Label cannot exceed 100 characters');
  }

  // Validate value
  const value = String(field.value || '');
  if (value.length > 500) {
    errors.push('Value cannot exceed 500 characters');
  }

  // Validate field type
  const validTypes = ['text', 'number', 'link', 'photo_ref'];
  if (field.field_type && !validTypes.includes(field.field_type)) {
    errors.push(`Invalid field type: ${field.field_type}`);
  }

  // Validate visibility
  const validVisibility = ['consumer', 'internal', 'b2b'];
  if (field.visibility && !validVisibility.includes(field.visibility)) {
    errors.push(`Invalid visibility: ${field.visibility}`);
  }

  // Link validation for link-type fields
  if (field.field_type === 'link' && field.link_url) {
    const urlPattern = /^https?:\/\//i;
    if (!urlPattern.test(field.link_url)) {
      errors.push('Link URL must start with http:// or https://');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create new custom field with defaults
 * 
 * Helper to create a new custom field object with sensible defaults.
 * 
 * @returns New custom field object ready for editing
 */
export function createNewCustomField(): CustomField {
  return {
    id: '', // Will be generated by server
    label: '',
    value: '',
    field_type: 'text',
    visibility: 'consumer',
    verification: 'self_reported',
    created_at: new Date().toISOString(),
  };
}

/**
 * Get event type specific custom field suggestions
 * 
 * Provides helpful suggestions for custom fields based on event type.
 * These are suggestions only - farmers can create any fields they want.
 * 
 * @param eventTypeId Integer ID of event type (0-7)
 * @returns Object with suggested field names and field types
 */
export function getCustomFieldSuggestionsForEventType(eventTypeId: number): {
  suggested_fields: string[];
  field_types: string[];
} {
  const suggestions: Record<
    number,
    { suggested_fields: string[]; field_types: string[] }
  > = {
    0: {
      // Weather
      suggested_fields: [
        'Wind Direction',
        'Cloud Cover',
        'Frost Risk',
        'UV Index',
      ],
      field_types: ['text', 'number'],
    },
    1: {
      // Production
      suggested_fields: [
        'Harvest Quality',
        'Yield Grade',
        'Market Destination',
        'Post-Harvest Treatment',
      ],
      field_types: ['text', 'number'],
    },
    2: {
      // Chemical
      suggested_fields: [
        'Applicator License',
        'Pre-Harvest Interval',
        'Re-Entry Interval',
        'Weather Conditions',
      ],
      field_types: ['text', 'number', 'link'],
    },
    3: {
      // General
      suggested_fields: [
        'Labor Hours',
        'Task Completion',
        'Weather Impact',
        'Notes',
      ],
      field_types: ['text', 'number'],
    },
    4: {
      // Equipment
      suggested_fields: [
        'Maintenance Log',
        'Fuel Efficiency',
        'Operator Name',
        'Service History',
      ],
      field_types: ['text', 'number', 'photo_ref'],
    },
    5: {
      // Soil Management
      suggested_fields: [
        'Lab Results',
        'Amendment Type',
        'Application Depth',
        'Soil Microbiome',
      ],
      field_types: ['text', 'number', 'link'],
    },
    6: {
      // Pest Management
      suggested_fields: [
        'Pest Severity',
        'Treatment Threshold',
        'Beneficial Insects',
        'Detection Method',
      ],
      field_types: ['text', 'number'],
    },
    7: {
      // Business
      suggested_fields: [
        'Cost',
        'Revenue Impact',
        'Certification Status',
        'Supplier Info',
      ],
      field_types: ['text', 'number', 'link'],
    },
  };

  return (
    suggestions[eventTypeId] || { suggested_fields: [], field_types: ['text'] }
  );
}
