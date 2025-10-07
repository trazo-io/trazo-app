/**
 * Unit Tests for Area Conversion System
 * Tests all conversion functions with high precision requirements
 * 
 * @author Trazo Platform
 * @version 1.0.0
 * @date 2025-01-15
 */

import {
  convertArea,
  normalizeAreaToHectares,
  formatAreaForDisplay,
  formatAreaWithBothUnits,
  validateAreaValue,
  parseAreaInput,
  getAreaForCarbonCalculation,
  migrateAcresToHectares,
  AREA_CONVERSION_FACTORS,
  REGIONAL_AREA_PREFERENCES,
  type AreaMeasurement
} from '../areaUnits';

describe('Area Unit Conversion System', () => {
  
  describe('AREA_CONVERSION_FACTORS', () => {
    test('conversion factors are accurate to USDA standards', () => {
      // Test high-precision conversion factors
      expect(AREA_CONVERSION_FACTORS.ACRES_TO_HECTARES).toBeCloseTo(0.40468564224, 10);
      expect(AREA_CONVERSION_FACTORS.HECTARES_TO_ACRES).toBeCloseTo(2.47105381467, 10);
      
      // Test reciprocal relationship
      const acreValue = 100;
      const hectareValue = acreValue * AREA_CONVERSION_FACTORS.ACRES_TO_HECTARES;
      const backToAcres = hectareValue * AREA_CONVERSION_FACTORS.HECTARES_TO_ACRES;
      expect(backToAcres).toBeCloseTo(acreValue, 6);
    });

    test('square meter conversions are correct', () => {
      expect(AREA_CONVERSION_FACTORS.SQ_METERS_TO_HECTARES).toBe(0.0001);
      expect(AREA_CONVERSION_FACTORS.HECTARES_TO_SQ_METERS).toBe(10000);
      
      // Test: 1 hectare = 10,000 square meters
      const hectares = 1;
      const sqMeters = hectares * AREA_CONVERSION_FACTORS.HECTARES_TO_SQ_METERS;
      expect(sqMeters).toBe(10000);
    });
  });

  describe('convertArea function', () => {
    test('converts acres to hectares accurately', () => {
      const result = convertArea(10, 'acres', 'hectares', 6);
      expect(result).toBeCloseTo(4.0468564224, 6);
    });

    test('converts hectares to acres accurately', () => {
      const result = convertArea(4.0468564224, 'hectares', 'acres', 6);
      expect(result).toBeCloseTo(10, 6);
    });

    test('returns same value for same unit conversion', () => {
      const result = convertArea(25.5, 'hectares', 'hectares', 2);
      expect(result).toBe(25.5);
    });

    test('handles precision correctly', () => {
      const result = convertArea(10.12345, 'acres', 'hectares', 2);
      expect(result.toString()).toMatch(/^\d+\.\d{1,2}$/);
    });

    test('converts square meters correctly', () => {
      const result = convertArea(10000, 'sq_meters', 'hectares', 4);
      expect(result).toBe(1);
    });
  });

  describe('normalizeAreaToHectares function', () => {
    test('converts acres measurement to hectares', () => {
      const area: AreaMeasurement = { value: 10, unit: 'acres' };
      const result = normalizeAreaToHectares(area);
      expect(result).toBeCloseTo(4.0468564224, 6);
    });

    test('preserves hectares measurement', () => {
      const area: AreaMeasurement = { value: 5.5, unit: 'hectares' };
      const result = normalizeAreaToHectares(area);
      expect(result).toBe(5.5);
    });

    test('uses high precision for storage', () => {
      const area: AreaMeasurement = { value: 1, unit: 'acres' };
      const result = normalizeAreaToHectares(area);
      expect(result.toString().split('.')[1].length).toBeGreaterThanOrEqual(6); // High precision
    });
  });

  describe('formatAreaForDisplay function', () => {
    test('formats for METRIC region (hectares primary)', () => {
      const result = formatAreaForDisplay(10, 'METRIC');
      expect(result.unit).toBe('hectares');
      expect(result.value).toBe(10);
      expect(result.precision).toBe(2);
    });

    test('formats for US region (acres primary)', () => {
      const result = formatAreaForDisplay(4.047, 'US');
      expect(result.unit).toBe('acres');
      expect(result.value).toBeCloseTo(10, 2);
    });

    test('uses GLOBAL region as default', () => {
      const result = formatAreaForDisplay(5.5);
      expect(result.unit).toBe('hectares');
      expect(result.value).toBe(5.5);
    });
  });

  describe('formatAreaWithBothUnits function', () => {
    test('shows both units for METRIC region', () => {
      const result = formatAreaWithBothUnits(4.047, 'METRIC');
      expect(result).toContain('hectares');
      expect(result).toContain('acres');
      expect(result).toContain('4.05 hectares');
      expect(result).toContain('acres');
    });

    test('shows single unit when configured', () => {
      const result = formatAreaWithBothUnits(5, 'GLOBAL');
      expect(result).toBe('5 hectares');
      expect(result).not.toContain('acres');
    });
  });

  describe('validateAreaValue function', () => {
    test('accepts valid area values', () => {
      const area: AreaMeasurement = { value: 10, unit: 'hectares' };
      const result = validateAreaValue(area);
      expect(result.isValid).toBe(true);
      expect(result.normalizedValue).toBe(10);
    });

    test('rejects zero or negative values', () => {
      const area: AreaMeasurement = { value: 0, unit: 'hectares' };
      const result = validateAreaValue(area);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('greater than zero');
    });

    test('rejects extremely small areas', () => {
      const area: AreaMeasurement = { value: 0.0001, unit: 'hectares' };
      const result = validateAreaValue(area);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Minimum area');
    });

    test('rejects extremely large areas', () => {
      const area: AreaMeasurement = { value: 200000, unit: 'hectares' };
      const result = validateAreaValue(area);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Maximum area');
    });

    test('converts acres to hectares for validation', () => {
      const area: AreaMeasurement = { value: 25, unit: 'acres' }; // ~10.1 hectares
      const result = validateAreaValue(area);
      expect(result.isValid).toBe(true);
      expect(result.normalizedValue).toBeCloseTo(10.117, 3);
    });
  });

  describe('parseAreaInput function', () => {
    test('parses hectares input correctly', () => {
      const cases = [
        '10.5 hectares',
        '10.5 ha',
        '10.5 hectare',
        '10.5'
      ];
      
      cases.forEach(input => {
        const result = parseAreaInput(input);
        expect(result).not.toBeNull();
        expect(result!.value).toBe(10.5);
        expect(result!.unit).toBe('hectares');
      });
    });

    test('parses acres input correctly', () => {
      const cases = [
        '25 acres',
        '25 ac',
        '25 acre',
        '25.5 acres'
      ];
      
      cases.forEach(input => {
        const result = parseAreaInput(input);
        expect(result).not.toBeNull();
        expect(result!.unit).toBe('acres');
      });
    });

    test('parses square meters input correctly', () => {
      const cases = [
        '5000 m²',
        '5000 sq m',
        '5000 square meters'
      ];
      
      cases.forEach(input => {
        const result = parseAreaInput(input);
        expect(result).not.toBeNull();
        expect(result!.unit).toBe('sq_meters');
      });
    });

    test('returns null for invalid input', () => {
      const invalidCases = [
        '',
        'abc hectares',
        '-5 hectares',
        'hectares 10'
      ];
      
      invalidCases.forEach(input => {
        const result = parseAreaInput(input);
        expect(result).toBeNull();
      });
    });
  });

  describe('getAreaForCarbonCalculation function', () => {
    test('ensures area is in hectares for carbon calculations', () => {
      const acreValue = 10;
      const result = getAreaForCarbonCalculation(acreValue, 'acres');
      expect(result).toBeCloseTo(4.0468564224, 6);
    });

    test('preserves hectares for carbon calculations', () => {
      const hectareValue = 5.5;
      const result = getAreaForCarbonCalculation(hectareValue, 'hectares');
      expect(result).toBe(5.5);
    });

    test('defaults to hectares when no unit specified', () => {
      const value = 8;
      const result = getAreaForCarbonCalculation(value);
      expect(result).toBe(8);
    });
  });

  describe('migrateAcresToHectares function', () => {
    test('converts acre values to hectares for migration', () => {
      const acreValue = 25;
      const result = migrateAcresToHectares(acreValue);
      expect(result).toBeCloseTo(10.117141056, 6);
    });

    test('uses high precision for data migration', () => {
      const acreValue = 1;
      const result = migrateAcresToHectares(acreValue);
      expect(result.toString().split('.')[1].length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('Regional Preferences', () => {
    test('REGIONAL_AREA_PREFERENCES contains expected regions', () => {
      expect(REGIONAL_AREA_PREFERENCES).toHaveProperty('US');
      expect(REGIONAL_AREA_PREFERENCES).toHaveProperty('METRIC');
      expect(REGIONAL_AREA_PREFERENCES).toHaveProperty('GLOBAL');
    });

    test('US region prefers acres', () => {
      const config = REGIONAL_AREA_PREFERENCES.US;
      expect(config.primary).toBe('acres');
      expect(config.secondary).toBe('hectares');
      expect(config.showBothUnits).toBe(true);
    });

    test('METRIC region prefers hectares', () => {
      const config = REGIONAL_AREA_PREFERENCES.METRIC;
      expect(config.primary).toBe('hectares');
      expect(config.secondary).toBe('acres');
      expect(config.showBothUnits).toBe(true);
    });
  });

  describe('Critical Agricultural Use Cases', () => {
    test('carbon calculation consistency', () => {
      // Scenario: 10 acres parcel used in carbon calculations
      const parcelAreaAcres = 10;
      const parcelAreaHectares = convertArea(parcelAreaAcres, 'acres', 'hectares', 6);
      
      // Both approaches should yield same result for carbon calculations
      const carbonArea1 = getAreaForCarbonCalculation(parcelAreaAcres, 'acres');
      const carbonArea2 = getAreaForCarbonCalculation(parcelAreaHectares, 'hectares');
      
      expect(carbonArea1).toBeCloseTo(carbonArea2, 6);
    });

    test('production form area consistency', () => {
      // Scenario: Parcel area flows from storage to production forms
      const storedAreaHectares = 4.047; // Stored as hectares now
      const displayArea = formatAreaWithBothUnits(storedAreaHectares, 'METRIC');
      
      expect(displayArea).toContain('4.05 hectares');
      expect(displayArea).toContain('acres');
    });

    test('precision requirements for different uses', () => {
      const preciseArea = 4.0468564224; // High precision from conversion
      
      // Display precision (2 decimal places)
      const displayValue = parseFloat(preciseArea.toFixed(2));
      expect(displayValue).toBe(4.05);
      
      // Storage precision (6 decimal places)
      const storageValue = parseFloat(preciseArea.toFixed(6));
      expect(storageValue).toBe(4.046856);
      
      // Calculation precision (full precision)
      expect(preciseArea).toBeCloseTo(4.0468564224, 10);
    });
  });

  describe('Error Handling', () => {
    test('convertArea handles edge cases gracefully', () => {
      expect(() => convertArea(0, 'acres', 'hectares')).not.toThrow();
      expect(() => convertArea(-5, 'acres', 'hectares')).not.toThrow();
      expect(() => convertArea(999999, 'acres', 'hectares')).not.toThrow();
    });

    test('parseAreaInput handles malformed input', () => {
      const malformedInputs = [
        '10.5.5 hectares',
        '10 hectares acres',
        'ten hectares',
        '10 unknown_unit'
      ];
      
      malformedInputs.forEach(input => {
        expect(parseAreaInput(input)).toBeNull();
      });
    });
  });
});