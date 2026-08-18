/**
 * React hook for getting registry-driven form field configs.
 *
 * Returns an ordered list of FieldConfig objects for the `form` surface,
 * filtered by event type + subtype. Form components iterate this list
 * and render either standard inputs (via RegistryFormField) or custom
 * renderers for complex fields.
 *
 * This hook replaces the hardcoded switch statements in Tab.jsx files
 * for determining WHICH fields to show. The HOW (rendering) stays with
 * RegistryFormField or custom components.
 */

import { useMemo } from 'react';

import type { AnySubtype, EventTypeCode, EventTypeName, FieldConfig } from 'src/config/events';
import { getFieldConfig, getFieldNamesForSurface, getRegistryEntry } from 'src/config/events';

export interface UseFormFieldsOptions {
  eventType: EventTypeName | EventTypeCode;
  subtype?: AnySubtype;
  /** Override surface (default: 'form'). Use 'quick_form' for quick event forms. */
  surface?: 'form' | 'quick_form';
}

export interface UseFormFieldsResult {
  /** Ordered list of FieldConfig objects to render as form inputs */
  fields: FieldConfig[];
  /** Field names only (convenience for validation schema building) */
  fieldNames: string[];
  /** Quick lookup: is this field in the current form? */
  hasField: (name: string) => boolean;
  /** Get a single field config by name */
  getField: (name: string) => FieldConfig | null;
}

/**
 * Get the ordered list of form fields for an event type + subtype.
 *
 * @example
 *   const { fields, hasField } = useFormFields({
 *     eventType: 'chemical',
 *     subtype: 'FE',
 *   });
 *   return fields.map(f => <RegistryFormField key={f.name} field={f} control={control} />);
 */
export function useFormFields({
  eventType,
  subtype,
  surface = 'form'
}: UseFormFieldsOptions): UseFormFieldsResult {
  return useMemo(() => {
    const fieldNames = getFieldNamesForSurface(eventType, subtype, surface);
    const fields: FieldConfig[] = [];

    for (const name of fieldNames) {
      const config = getFieldConfig(eventType, name);
      if (config) {
        fields.push(config);
      }
    }

    const nameSet = new Set(fieldNames);

    return {
      fields,
      fieldNames,
      hasField: (name: string) => nameSet.has(name),
      getField: (name: string) => fields.find((f) => f.name === name) ?? null
    };
  }, [eventType, subtype, surface]);
}
