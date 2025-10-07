/**
 * Test file for field display utilities
 * Validates comprehensive field display functionality
 */

import { 
  getEventFieldDisplay,
  getWeatherEventFields,
  getChemicalEventFields,
  getProductionEventFields
} from '../fieldDisplayUtils';

describe('Field Display Utils', () => {
  describe('getWeatherEventFields', () => {
    it('should extract frost event fields correctly', () => {
      const event = {
        description: 'Frost protection event',
        extra_data: {
          lower_temperature: -2.5,
          way_of_protection: 'Irrigation and heaters',
          duration: 6
        }
      };

      const result = getWeatherEventFields(event);

      expect(result.immediate).toHaveLength(2);
      expect(result.immediate[0]).toEqual({
        label: 'Minimum Temperature',
        value: '-2.5°C (27.5°F)',
        priority: 'immediate',
        category: 'weather'
      });
      expect(result.immediate[1]).toEqual({
        label: 'Protection Measures',
        value: 'Irrigation and heaters',
        priority: 'immediate',
        category: 'environmental'
      });
      expect(result.secondary).toHaveLength(1);
    });

    it('should extract high temperature event fields correctly', () => {
      const event = {
        description: 'High temperature event',
        extra_data: {
          highest_temperature: 42,
          protection_measures: 'Shade cloth and irrigation'
        }
      };

      const result = getWeatherEventFields(event);

      expect(result.immediate).toHaveLength(2);
      expect(result.immediate[0].value).toBe('42°C (107.6°F)');
      expect(result.immediate[1].value).toBe('Shade cloth and irrigation');
    });
  });

  describe('getChemicalEventFields', () => {
    it('should extract chemical application fields correctly', () => {
      const event = {
        description: 'Fertilizer application',
        extra_data: {
          commercial_name: 'GreenGrow 10-10-10',
          application_method: 'Precision sprayer',
          target_pest_disease: 'Nitrogen deficiency',
          area_treated: 5.2,
          area_unit: 'hectares',
          concentration: '10-10-10',
          volume_applied: 150,
          volume_unit: 'L'
        }
      };

      const result = getChemicalEventFields(event);

      expect(result.immediate).toHaveLength(3);
      expect(result.immediate[0].value).toBe('GreenGrow 10-10-10');
      expect(result.immediate[1].value).toBe('Precision sprayer');
      expect(result.immediate[2].value).toBe('Nitrogen deficiency');
      
      expect(result.secondary).toHaveLength(1);
      expect(result.secondary[0].value).toBe('5.2 hectares');
      
      expect(result.details).toHaveLength(2);
    });
  });

  describe('getProductionEventFields', () => {
    it('should extract harvest fields correctly', () => {
      const event = {
        description: 'Avocado harvest',
        extra_data: {
          quantityHarvested: 2500
        }
      };

      const result = getProductionEventFields(event);

      expect(result.immediate).toHaveLength(1);
      expect(result.immediate[0]).toEqual({
        label: 'Quantity Harvested',
        value: '2500 kg',
        priority: 'immediate',
        category: 'measurement'
      });
    });

    it('should extract irrigation fields correctly', () => {
      const event = {
        description: 'Drip irrigation system',
        extra_data: {
          waterAmount: 1500
        }
      };

      const result = getProductionEventFields(event);

      expect(result.immediate).toHaveLength(1);
      expect(result.immediate[0]).toEqual({
        label: 'Water Applied',
        value: '1500 L',
        priority: 'immediate',
        category: 'measurement'
      });
    });
  });

  describe('getEventFieldDisplay', () => {
    it('should route to correct handler based on event type', () => {
      const weatherEvent = {
        type: 'weather',
        description: 'Frost event',
        extra_data: { lower_temperature: -1 }
      };

      const chemicalEvent = {
        type: 'chemical',
        description: 'Fertilizer application',
        extra_data: { commercial_name: 'Test Fertilizer' }
      };

      const weatherResult = getEventFieldDisplay(weatherEvent);
      const chemicalResult = getEventFieldDisplay(chemicalEvent);

      expect(weatherResult.immediate).toHaveLength(1);
      expect(weatherResult.immediate[0].category).toBe('weather');

      expect(chemicalResult.immediate).toHaveLength(1);
      expect(chemicalResult.immediate[0].category).toBe('application');
    });

    it('should handle events without extra_data gracefully', () => {
      const event = {
        type: 'production',
        description: 'Basic harvest event'
      };

      const result = getEventFieldDisplay(event);

      expect(result).toBeDefined();
      expect(result.immediate).toBeDefined();
      expect(result.secondary).toBeDefined();
      expect(result.details).toBeDefined();
    });
  });
});