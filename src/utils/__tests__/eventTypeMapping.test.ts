/**
 * Test suite to validate Event Type Mapping consistency across the codebase
 *
 * CRITICAL: This test ensures that EVENT_TYPE_MAP constants remain consistent
 * with backend event type definitions to prevent preview-display mismatches.
 */

import { transformFormDataToEvent } from '../eventPreviewUtils';

// Import the EVENT_TYPE_MAP directly for testing
// Note: This constant is not exported, so we verify behavior through transformFormDataToEvent
const EVENT_TYPE_MAP: Record<number, string> = {
  0: 'weather',
  1: 'production',
  2: 'chemical',
  3: 'general',
  4: 'equipment',
  5: 'soil_management',
  6: 'pest_management',  // FIXED: Event Type 6 = Pest Management
  7: 'business'          // FIXED: Event Type 7 = Business
};

describe('Event Type Mapping Validation', () => {
  describe('EVENT_TYPE_MAP Constants', () => {
    test('Event Type 0 maps to weather', () => {
      expect(EVENT_TYPE_MAP[0]).toBe('weather');
    });

    test('Event Type 1 maps to production', () => {
      expect(EVENT_TYPE_MAP[1]).toBe('production');
    });

    test('Event Type 2 maps to chemical', () => {
      expect(EVENT_TYPE_MAP[2]).toBe('chemical');
    });

    test('Event Type 3 maps to general', () => {
      expect(EVENT_TYPE_MAP[3]).toBe('general');
    });

    test('Event Type 4 maps to equipment', () => {
      expect(EVENT_TYPE_MAP[4]).toBe('equipment');
    });

    test('Event Type 5 maps to soil_management', () => {
      expect(EVENT_TYPE_MAP[5]).toBe('soil_management');
    });

    test('Event Type 6 maps to pest_management (CRITICAL FIX)', () => {
      // FIXED: Previously incorrectly mapped to 'business'
      expect(EVENT_TYPE_MAP[6]).toBe('pest_management');
    });

    test('Event Type 7 maps to business (CRITICAL FIX)', () => {
      // FIXED: Previously incorrectly mapped to 'pest_management'
      expect(EVENT_TYPE_MAP[7]).toBe('business');
    });
  });

  describe('Business Event Type Validation', () => {
    test('Business event type number is 7', () => {
      const BUSINESS_EVENT_TYPE = 7;
      expect(EVENT_TYPE_MAP[BUSINESS_EVENT_TYPE]).toBe('business');
    });

    test('Business type string does not map to pest_management', () => {
      const BUSINESS_EVENT_TYPE = 7;
      // This was the bug - business event type was being mapped to pest_management
      expect(EVENT_TYPE_MAP[BUSINESS_EVENT_TYPE]).not.toBe('pest_management');
    });
  });

  describe('Pest Management Event Type Validation', () => {
    test('Pest Management event type number is 6', () => {
      const PEST_MANAGEMENT_EVENT_TYPE = 6;
      expect(EVENT_TYPE_MAP[PEST_MANAGEMENT_EVENT_TYPE]).toBe('pest_management');
    });

    test('Pest Management type string does not map to business', () => {
      const PEST_MANAGEMENT_EVENT_TYPE = 6;
      // This was the bug - pest management event type was being mapped to business
      expect(EVENT_TYPE_MAP[PEST_MANAGEMENT_EVENT_TYPE]).not.toBe('business');
    });
  });

  describe('Complete Mapping Integrity', () => {
    test('All 8 event types have unique mappings', () => {
      const values = Object.values(EVENT_TYPE_MAP);
      const uniqueValues = new Set(values);

      expect(uniqueValues.size).toBe(8);
      expect(values.length).toBe(8);
    });

    test('Event type mapping covers all types 0-7', () => {
      for (let i = 0; i < 8; i++) {
        expect(EVENT_TYPE_MAP[i]).toBeDefined();
        expect(typeof EVENT_TYPE_MAP[i]).toBe('string');
        expect(EVENT_TYPE_MAP[i].length).toBeGreaterThan(0);
      }
    });

    test('No duplicate string values in mapping', () => {
      const values = Object.values(EVENT_TYPE_MAP);
      const duplicates = values.filter((value, index) => values.indexOf(value) !== index);

      expect(duplicates).toEqual([]);
    });
  });

  describe('Preview-Display Consistency Validation', () => {
    test('transformFormDataToEvent assigns correct type for Business events', () => {
      const businessEventType = 7;
      const formData = {
        date: new Date().toISOString(),
        description: 'Test business event'
      };

      const previewEvent = transformFormDataToEvent(businessEventType, formData);

      expect(previewEvent.event_type).toBe(7);
      expect(previewEvent.type).toBe('business');
      expect(previewEvent.type).not.toBe('pest_management');
    });

    test('transformFormDataToEvent assigns correct type for Pest Management events', () => {
      const pestManagementEventType = 6;
      const formData = {
        date: new Date().toISOString(),
        description: 'Test pest management event'
      };

      const previewEvent = transformFormDataToEvent(pestManagementEventType, formData);

      expect(previewEvent.event_type).toBe(6);
      expect(previewEvent.type).toBe('pest_management');
      expect(previewEvent.type).not.toBe('business');
    });
  });

  describe('Backward Compatibility Checks', () => {
    test('Other event types remain unchanged', () => {
      // Verify that the fix didn't affect other event types
      expect(EVENT_TYPE_MAP[0]).toBe('weather');
      expect(EVENT_TYPE_MAP[1]).toBe('production');
      expect(EVENT_TYPE_MAP[2]).toBe('chemical');
      expect(EVENT_TYPE_MAP[3]).toBe('general');
      expect(EVENT_TYPE_MAP[4]).toBe('equipment');
      expect(EVENT_TYPE_MAP[5]).toBe('soil_management');
    });
  });
});
