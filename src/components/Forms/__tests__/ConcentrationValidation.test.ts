import { validateConcentration } from '../ConcentrationValidation';

describe('ConcentrationValidation', () => {
  describe('Fertilizer (FE) NPK Validation', () => {
    test('validates correct NPK formats', () => {
      const testCases = ['10-10-10', '16-16-16', '20-5-5', '15-30-15', '0-0-50', '10.5-5.2-8.1'];

      testCases.forEach((input) => {
        const result = validateConcentration(input, 'FE');
        expect(result.isValid).toBe(true);
        expect(result.format).toBe('npk');
        expect(result.parsed).toBeDefined();
      });
    });

    test('rejects percentage format for fertilizers', () => {
      const testCases = ['70%', '2.5%', '100%'];

      testCases.forEach((input) => {
        const result = validateConcentration(input, 'FE');
        expect(result.isValid).toBe(false);
        expect(result.format).toBe('percentage');
        expect(result.errors[0]).toContain('Fertilizers require NPK format');
      });
    });

    test('rejects invalid NPK formats', () => {
      const testCases = [
        '10-10', // Missing third number
        '10-10-10-10', // Too many numbers
        'abc-def-ghi', // Non-numeric
        '10_10_10', // Wrong separator
        '10/10/10' // Wrong separator
      ];

      testCases.forEach((input) => {
        const result = validateConcentration(input, 'FE');
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('Invalid NPK format');
      });
    });

    test('validates NPK value ranges', () => {
      // Test total > 100%
      const result1 = validateConcentration('50-50-50', 'FE');
      expect(result1.isValid).toBe(false);
      expect(result1.errors[0]).toContain('Total NPK (150.0%) cannot exceed 100%');

      // Test negative values
      const result2 = validateConcentration('-10-10-10', 'FE');
      expect(result2.isValid).toBe(false);

      // Test all zeros
      const result3 = validateConcentration('0-0-0', 'FE');
      expect(result3.isValid).toBe(false);
      expect(result3.errors[0]).toContain('All NPK values cannot be zero');
    });
  });

  describe('Pesticide/Herbicide/Fungicide (PE/HE/FU) Percentage Validation', () => {
    test('validates correct percentage formats', () => {
      const testCases = [
        { input: '2.5%', type: 'PE' },
        { input: '70%', type: 'HE' },
        { input: '0.5%', type: 'FU' },
        { input: '100%', type: 'PE' },
        { input: '25', type: 'HE' } // Without % symbol
      ];

      testCases.forEach(({ input, type }) => {
        const result = validateConcentration(input, type);
        expect(result.isValid).toBe(true);
        expect(result.format).toBe('percentage');
        expect(result.parsed?.percentage).toBeDefined();
      });
    });

    test('rejects NPK format for pesticides', () => {
      const testCases = ['10-10-10', '16-16-16'];

      testCases.forEach((input) => {
        const result = validateConcentration(input, 'PE');
        expect(result.isValid).toBe(false);
        expect(result.format).toBe('npk');
        expect(result.errors[0]).toContain(
          'Pesticides/herbicides/fungicides require percentage format'
        );
      });
    });

    test('validates percentage value ranges', () => {
      // Test negative percentage
      const result1 = validateConcentration('-5%', 'PE');
      expect(result1.isValid).toBe(false);
      expect(result1.errors[0]).toContain('Percentage cannot be negative');

      // Test > 100%
      const result2 = validateConcentration('150%', 'HE');
      expect(result2.isValid).toBe(false);
      expect(result2.errors[0]).toContain('Percentage cannot exceed 100%');

      // Test zero percentage
      const result3 = validateConcentration('0%', 'FU');
      expect(result3.isValid).toBe(false);
      expect(result3.errors[0]).toContain('Percentage cannot be zero');
    });

    test('provides warnings for unusual values', () => {
      // Very high concentration
      const result1 = validateConcentration('95%', 'PE');
      expect(result1.isValid).toBe(true);
      expect(result1.suggestions[0]).toContain('Very high concentration');

      // Very low concentration
      const result2 = validateConcentration('0.05%', 'HE');
      expect(result2.isValid).toBe(true);
      expect(result2.suggestions[0]).toContain('Very low concentration');
    });
  });

  describe('Edge Cases', () => {
    test('handles empty input', () => {
      const result = validateConcentration('', 'FE');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Concentration is required');
    });

    test('handles unknown chemical type', () => {
      const result = validateConcentration('10-10-10', 'UNKNOWN');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Unknown chemical type');
    });

    test('handles whitespace correctly', () => {
      const result1 = validateConcentration('  10-10-10  ', 'FE');
      expect(result1.isValid).toBe(true);

      const result2 = validateConcentration('  2.5%  ', 'PE');
      expect(result2.isValid).toBe(true);
    });
  });

  describe('Parsed Values', () => {
    test('correctly parses NPK values', () => {
      const result = validateConcentration('15-30-15', 'FE');
      expect(result.parsed?.nitrogen).toBe(15);
      expect(result.parsed?.phosphorus).toBe(30);
      expect(result.parsed?.potassium).toBe(15);
    });

    test('correctly parses percentage values', () => {
      const result1 = validateConcentration('2.5%', 'PE');
      expect(result1.parsed?.percentage).toBe(2.5);

      const result2 = validateConcentration('70', 'HE');
      expect(result2.parsed?.percentage).toBe(70);
    });
  });
});
