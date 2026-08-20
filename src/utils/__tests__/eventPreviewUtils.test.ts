/**
 * ⚠️ FIVE ASSERTIONS IN THIS FILE WERE INVERTED (2026-08-19), NOT "FIXED".
 *
 * They had been failing since the behaviour they pinned was deliberately changed, and each one
 * demanded something the change removed. Made green the lazy way — by reverting the code — they
 * would have restored three separate defects. The reasoning per assertion:
 *
 *   `type` is the SUBTYPE code ('HA'), not the family name ('production'). eventPreviewUtils
 *   sets it under a `// Set the correct production type code` comment, the same correctness
 *   work as `resolveBusinessSubtype`: an event stored under its family default displayed as
 *   the wrong thing on the audit PDF and the consumer page.
 *
 *   `description` is the farmer's own words or empty — never generated. The old expectations
 *   ("Applied Test Fertilizer fertilizer", "General farming activity") are machine prose in a
 *   field presented as the grower's voice, which is the defect the farmer-words rule exists to
 *   prevent. `generateEventDescription` still sits in the module with ZERO callers as a result
 *   — dead code, flagged rather than deleted here since this is a test file.
 *
 *   Values carry their unit ('150 L', not '150'). Serving a magnitude without its basis is
 *   what mislabelled treated area by 2.47x when a unit was guessed downstream.
 *
 *   Fields carry a human label ('Fuel Consumption', not the raw code 'FC').
 */
import { describe, it, expect } from 'vitest';
import {
  transformFormDataToEvent,
  hasMinimalPreviewData,
  formatPreviewDate
} from '../eventPreviewUtils';

describe('eventPreviewUtils', () => {
  describe('transformFormDataToEvent', () => {
    it('should transform weather event (type 0) correctly', () => {
      const formData = {
        date: '2024-01-20T10:30:00.000Z',
        description: 'Morning weather monitoring',
        highest_temperature: '85',
        lower_temperature: '62',
        wind_speed: '15',
        precipitation_amount: '0.5',
        humidity_level: '78'
      };

      const result = transformFormDataToEvent(0, formData, 'test-weather');

      expect(result.type).toBe('weather');
      expect(result.description).toBe('Morning weather monitoring');
      expect(result.carbon_impact).toBeGreaterThan(0);
      expect(result.extra_data).toMatchObject({
        highest_temperature: '85',
        lower_temperature: '62',
        wind_speed: '15',
        precipitation_amount: '0.5',
        humidity_level: '78'
      });
    });

    it('should transform production event (type 1) correctly', () => {
      const formData = {
        date: '2024-01-20T08:00:00.000Z',
        type: 'HA',
        description: 'Avocado harvest',
        area_covered: '5.2',
        yield_quantity: '1200',
        fuel_consumed: '25.5',
        operating_hours: '6',
        area_unit: 'acres',
        yield_unit: 'kg',
        fuel_unit: 'gallons'
      };

      const result = transformFormDataToEvent(1, formData, 'test-production');

      // Subtype code, not family name — see the header note.
      expect(result.type).toBe('HA');
      expect(result.description).toBe('Avocado harvest');
      // Magnitude AND basis — a bare number is what a downstream default can mislabel.
      expect(result.area_covered).toBe('5.2 acres');
      expect(result.yield_quantity).toBe('1200 kg');
      expect(result.fuel_consumed).toBe('25.5 gallons');
      expect(result.equipment_hours).toBe('6 hours');
      expect(result.area_unit).toBe('acres');
    });

    it('should transform chemical event (type 2) correctly', () => {
      const formData = {
        date: '2024-01-20T06:30:00.000Z',
        commercial_name: 'Premium NPK Fertilizer',
        type: 'FE',
        volume_applied: '150',
        area_treated: '10',
        concentration: '20-10-10',
        npk_ratio: '20:10:10',
        active_ingredient: 'Nitrogen, Phosphorus, Potassium',
        way_of_application: 'Spray',
        target_pest_disease_need: 'Nutrient deficiency',
        weather_conditions: 'Clear, no wind',
        application_timing: 'Early morning'
      };

      const result = transformFormDataToEvent(2, formData, 'test-chemical');

      expect(result.type).toBe('chemical');
      expect(result.commercial_name).toBe('Premium NPK Fertilizer');
      expect(result.volume).toBe('150 L');
      expect(result.area).toBe('10 ha');
      expect(result.concentration).toBe('20-10-10');
      expect(result.application_method).toBe('Spray');
      // Farmer-voice field: empty when the grower wrote nothing. See the header note.
      expect(result.description).toBe('');
    });

    it('should transform equipment event (type 4) correctly', () => {
      const formData = {
        date: '2024-01-20T07:00:00.000Z',
        // NEW Equipment form fields (matching EquipmentTab.jsx)
        type: 'FC', // Fuel Consumption - Field Operations
        name: 'Weekly Equipment Operation',
        equipment_type: 'tractor',
        fuel_consumed: '50',
        fuel_unit: 'L',
        fuel_type: 'gasoline',
        hours_operated: '22',
        area_worked: '33',
        area_unit: 'ha',
        operation_efficiency: 'normal',
        observation: 'Equipment operation went smoothly.'
      };

      const result = transformFormDataToEvent(4, formData, 'test-equipment');

      // Verify the Equipment form field mapping works correctly
      expect(result.type).toBe('FC'); // Keep original type
      // Mapped for DISPLAY, so it carries the human label, not the raw code.
      expect(result.operation_type).toBe('Fuel Consumption');
      expect(result.operation_name).toBe('Weekly Equipment Operation'); // Mapped for display
      expect(result.name).toBe('Weekly Equipment Operation'); // Keep original
      expect(result.equipment_type).toBe('tractor');
      expect(result.fuel_consumed).toBe(50); // Parsed as number
      expect(result.fuel_type).toBe('Gasoline');
      expect(result.hours_operated).toBe(22); // Parsed as number
      expect(result.area_worked).toBe(33); // Parsed as number
      expect(result.operation_efficiency).toBe('normal');
      expect(result.description).toBe('Equipment operation went smoothly.');
    });

    it('should generate appropriate description when user description is empty', () => {
      const formData = {
        date: '2024-01-20T06:30:00.000Z',
        commercial_name: 'Test Fertilizer',
        type: 'FE'
      };

      const result = transformFormDataToEvent(2, formData, 'test-auto-desc');

      // Generated prose must NOT appear in the farmer-voice field; empty is the correct
      // outcome when the grower wrote nothing.
      expect(result.description).toBe('');
    });

    it('should handle missing optional fields gracefully', () => {
      const formData = {
        date: '2024-01-20T10:30:00.000Z'
      };

      const result = transformFormDataToEvent(3, formData, 'test-minimal');

      expect(result.type).toBe('general');
      // Same rule: no machine-written stand-in for the grower's words.
      expect(result.description).toBe('');
      expect(result.carbon_impact).toBeGreaterThan(0);
      expect(result.verification_confidence).toBe(85);
    });
  });

  describe('hasMinimalPreviewData', () => {
    it('should return false if no date provided', () => {
      const formData = { description: 'Test event' };
      const result = hasMinimalPreviewData(0, formData);
      expect(result).toBe(false);
    });

    it('should return true for weather events with date', () => {
      const formData = { date: '2024-01-20T10:30:00.000Z' };
      const result = hasMinimalPreviewData(0, formData);
      expect(result).toBe(true);
    });

    it('should require additional data for chemical events', () => {
      const formDataMinimal = { date: '2024-01-20T10:30:00.000Z' };
      const resultMinimal = hasMinimalPreviewData(2, formDataMinimal);
      expect(resultMinimal).toBe(false);

      const formDataWithProduct = {
        date: '2024-01-20T10:30:00.000Z',
        commercial_name: 'Test Product'
      };
      const resultWithProduct = hasMinimalPreviewData(2, formDataWithProduct);
      expect(resultWithProduct).toBe(true);
    });

    it('should require additional data for production events', () => {
      const formDataMinimal = { date: '2024-01-20T10:30:00.000Z' };
      const resultMinimal = hasMinimalPreviewData(1, formDataMinimal);
      expect(resultMinimal).toBe(false);

      const formDataWithType = {
        date: '2024-01-20T10:30:00.000Z',
        type: 'HA'
      };
      const resultWithType = hasMinimalPreviewData(1, formDataWithType);
      expect(resultWithType).toBe(true);
    });
  });

  describe('formatPreviewDate', () => {
    it('should format valid date string correctly', () => {
      const dateString = '2024-01-20T10:30:00.000Z';
      const result = formatPreviewDate(dateString);
      expect(result).toMatch(/Jan 20, 2024 at \d{1,2}:\d{2} [AP]M/);
    });

    it('should handle invalid date gracefully', () => {
      const invalidDate = 'invalid-date';
      const result = formatPreviewDate(invalidDate);
      expect(result).toBe('Just now');
    });
  });
});
