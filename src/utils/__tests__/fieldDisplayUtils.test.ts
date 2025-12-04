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

    it('should extract General event fields correctly', () => {
      const event = {
        event_type: 3,
        activity_type: 'Farm Maintenance',
        activity_name: 'test',
        duration: '2 hours',
        people_involved: 3,
        activity_notes: 'Test 2',
        description: 'Farm maintenance activity'
      };

      const result = getEventFieldDisplay(event);

      // Verify immediate fields (Activity Type, Activity Name)
      expect(result.immediate).toHaveLength(2);
      expect(result.immediate[0]).toEqual({
        label: 'Activity Type',
        value: 'Farm Maintenance',
        priority: 'immediate',
        category: 'operational'
      });
      expect(result.immediate[1]).toEqual({
        label: 'Activity Name',
        value: 'test',
        priority: 'immediate',
        category: 'operational'
      });

      // Verify secondary fields (Duration, People Involved)
      expect(result.secondary).toHaveLength(2);
      expect(result.secondary[0]).toEqual({
        label: 'Duration',
        value: '2 hours',
        priority: 'secondary',
        category: 'measurement'
      });
      expect(result.secondary[1]).toEqual({
        label: 'People Involved',
        value: '3 people',
        priority: 'secondary',
        category: 'operational'
      });

      // Verify detail fields (Activity Notes)
      expect(result.details).toHaveLength(1);
      expect(result.details[0]).toEqual({
        label: 'Activity Notes',
        value: 'Test 2',
        priority: 'details',
        category: 'notes'
      });
    });

    it('should extract Equipment event fields correctly', () => {
      const event = {
        event_type: 4,
        description: 'Equipment operation for tractor maintenance',
        type: 'FC', // Equipment form uses 'type' with codes
        name: 'Weekly Equipment', // Equipment form uses 'name'
        operation_type: 'FC', // Mapped from 'type' for display
        operation_name: 'Weekly Equipment', // Mapped from 'name' for display
        equipment_type: 'tractor',
        fuel_consumed: 11,
        fuel_type: 'gasoline',
        hours_operated: 22,
        area_worked: 33,
        operation_efficiency: 'normal',
        operation_notes: 'Test test'
      };

      const result = getEventFieldDisplay(event);

      // Verify immediate fields (Operation Type, Operation Name, Equipment Type)
      expect(result.immediate).toHaveLength(3);
      expect(result.immediate[0]).toEqual({
        label: 'Operation Type',
        value: 'Fuel Consumption - Field Operations', // Maps from 'FC' code
        priority: 'immediate',
        category: 'operational'
      });
      expect(result.immediate[1]).toEqual({
        label: 'Operation Name',
        value: 'Weekly Equipment',
        priority: 'immediate',
        category: 'operational'
      });
      expect(result.immediate[2]).toEqual({
        label: 'Equipment Type',
        value: 'tractor',
        priority: 'immediate',
        category: 'operational'
      });

      // Verify secondary fields (Fuel Consumed, Hours Operated, Area Worked)
      expect(result.secondary).toHaveLength(3);
      expect(result.secondary[0]).toEqual({
        label: 'Fuel Consumed',
        value: '11 L',
        priority: 'secondary',
        category: 'measurement'
      });
      expect(result.secondary[1]).toEqual({
        label: 'Hours Operated',
        value: '22 hours',
        priority: 'secondary',
        category: 'measurement'
      });
      expect(result.secondary[2]).toEqual({
        label: 'Area Worked',
        value: '33 ha',
        priority: 'secondary',
        category: 'measurement'
      });

      // Verify detail fields (Fuel Type, Operation Efficiency, Operation Notes)
      expect(result.details).toHaveLength(3);
      expect(result.details[0]).toEqual({
        label: 'Fuel Type',
        value: 'gasoline',
        priority: 'details',
        category: 'operational'
      });
      expect(result.details[1]).toEqual({
        label: 'Operation Efficiency',
        value: 'normal',
        priority: 'details',
        category: 'operational'
      });
      expect(result.details[2]).toEqual({
        label: 'Operation Notes',
        value: 'Test test',
        priority: 'details',
        category: 'notes'
      });
    });

    it('should extract Soil Management event fields correctly', () => {
      const event = {
        event_type: 5,
        description: 'Soil management operation for field health',
        type: 'Soil Testing', // SoilManagementTab form uses 'type'
        name: 'Field plowing', // SoilManagementTab form uses 'name'
        soil_management_type: 'Soil Testing', // Mapped from 'type' for display
        soil_management_name: 'Field plowing', // Mapped from 'name' for display
        area_managed: 2,
        area_unit: 'Ac',
        working_depth: 21,
        depth_unit: 'Ct',
        area_covered: 2,
        fuel_consumed: 11,
        fuel_unit: 'Lil',
        equipment_hours: 3,
        production_efficiency: 'Normal Efficiency',
        transportation_distance: 5,
        transportation_unit: 'Km',
        soil_ph: 6.8,
        organic_matter: 4.0,
        soil_texture: 'Clay Loam',
        weather_conditions: 'optimal planting condition',
        temperature_range: '18-22°C',
        soil_moisture: 'Moist',
        equipment_used: 'tractor with disc harrow',
        soil_management_notes: 'test test'
      };

      const result = getEventFieldDisplay(event);

      // Verify immediate fields (Soil Management Type, Operation Name, Area Managed, Working Depth)
      expect(result.immediate).toHaveLength(4);
      expect(result.immediate[0]).toEqual({
        label: 'Soil Management Type',
        value: 'Soil Testing',
        priority: 'immediate',
        category: 'environmental'
      });
      expect(result.immediate[1]).toEqual({
        label: 'Operation Name',
        value: 'Field plowing',
        priority: 'immediate',
        category: 'operational'
      });
      expect(result.immediate[2]).toEqual({
        label: 'Area Managed',
        value: '2 Ac',
        priority: 'immediate',
        category: 'measurement'
      });
      expect(result.immediate[3]).toEqual({
        label: 'Working Depth',
        value: '21 Ct',
        priority: 'immediate',
        category: 'measurement'
      });

      // Verify secondary fields (Area Covered, Fuel Consumed, Equipment Hours, Operation Efficiency, Transportation Distance)
      expect(result.secondary).toHaveLength(5);
      expect(result.secondary[0]).toEqual({
        label: 'Area Covered',
        value: '2 hectares',
        priority: 'secondary',
        category: 'measurement'
      });
      expect(result.secondary[1]).toEqual({
        label: 'Fuel Consumed',
        value: '11 Lil',
        priority: 'secondary',
        category: 'measurement'
      });
      expect(result.secondary[2]).toEqual({
        label: 'Equipment Hours',
        value: '3 hours',
        priority: 'secondary',
        category: 'measurement'
      });
      expect(result.secondary[3]).toEqual({
        label: 'Operation Efficiency',
        value: 'Normal Efficiency',
        priority: 'secondary',
        category: 'operational'
      });
      expect(result.secondary[4]).toEqual({
        label: 'Transportation Distance',
        value: '5 Km',
        priority: 'secondary',
        category: 'measurement'
      });

      // Verify detail fields (Soil Properties, Environmental Conditions, Equipment, Notes)
      expect(result.details).toHaveLength(8);
      expect(result.details[0]).toEqual({
        label: 'Soil pH',
        value: '6.8',
        priority: 'details',
        category: 'measurement'
      });
      expect(result.details[1]).toEqual({
        label: 'Organic Matter',
        value: '4%',
        priority: 'details',
        category: 'measurement'
      });
      expect(result.details[2]).toEqual({
        label: 'Soil Texture',
        value: 'Clay Loam',
        priority: 'details',
        category: 'environmental'
      });
      expect(result.details[3]).toEqual({
        label: 'Soil Moisture',
        value: 'Moist',
        priority: 'details',
        category: 'environmental'
      });
      expect(result.details[4]).toEqual({
        label: 'Weather Conditions',
        value: 'optimal planting condition',
        priority: 'details',
        category: 'environmental'
      });
      expect(result.details[5]).toEqual({
        label: 'Temperature Range',
        value: '18-22°C',
        priority: 'details',
        category: 'environmental'
      });
      expect(result.details[6]).toEqual({
        label: 'Equipment Used',
        value: 'tractor with disc harrow',
        priority: 'details',
        category: 'operational'
      });
      expect(result.details[7]).toEqual({
        label: 'Soil Management Notes',
        value: 'test test',
        priority: 'details',
        category: 'notes'
      });
    });

    it('should extract Soil Management event fields with Tillage Operation Details correctly', () => {
      const event = {
        event_type: 5,
        description: 'Tillage implementation for soil preparation',
        type: 'TI', // Tillage Implementation code
        name: 'Spring tillage preparation',
        soil_management_type: 'TI', // Mapped from 'type' for display
        soil_management_name: 'Spring tillage preparation',
        area_managed: 3.5,
        area_unit: 'hectares',
        working_depth: 25,
        depth_unit: 'cm',
        area_covered: 3.5,
        fuel_consumed: 15,
        fuel_unit: 'L',
        equipment_hours: 4,
        production_efficiency: 'High Efficiency',
        transportation_distance: 8,
        transportation_unit: 'Km',
        soil_ph: 7.2,
        organic_matter: 3.8,
        soil_texture: 'Sandy Loam',
        weather_conditions: 'optimal tillage conditions',
        temperature_range: '20-25°C',
        soil_moisture: 'Moderate',
        equipment_used: 'John Deere tractor with chisel plow',
        // Tillage-specific fields
        tillage_type: 'chisel_plow',
        tillage_intensity: 'medium',
        tillage_direction: 'contour',
        residue_management: 'incorporated',
        soil_management_notes: 'Comprehensive tillage operation with focus on soil conservation'
      };

      const result = getEventFieldDisplay(event);

      // Verify immediate fields (Soil Management Type, Operation Name, Area Managed, Working Depth)
      expect(result.immediate).toHaveLength(4);
      expect(result.immediate[0]).toEqual({
        label: 'Soil Management Type',
        value: 'Tillage Implementation',
        priority: 'immediate',
        category: 'environmental'
      });
      expect(result.immediate[1]).toEqual({
        label: 'Operation Name',
        value: 'Spring tillage preparation',
        priority: 'immediate',
        category: 'operational'
      });
      expect(result.immediate[2]).toEqual({
        label: 'Area Managed',
        value: '3.5 hectares',
        priority: 'immediate',
        category: 'measurement'
      });
      expect(result.immediate[3]).toEqual({
        label: 'Working Depth',
        value: '25 cm',
        priority: 'immediate',
        category: 'measurement'
      });

      // Verify secondary fields (Area Covered, Fuel, Equipment, Efficiency, Transportation, Tillage Type, Tillage Intensity)
      expect(result.secondary).toHaveLength(7);
      expect(result.secondary[0]).toEqual({
        label: 'Area Covered',
        value: '3.5 hectares',
        priority: 'secondary',
        category: 'measurement'
      });
      expect(result.secondary[1]).toEqual({
        label: 'Fuel Consumed',
        value: '15 L',
        priority: 'secondary',
        category: 'measurement'
      });
      expect(result.secondary[2]).toEqual({
        label: 'Equipment Hours',
        value: '4 hours',
        priority: 'secondary',
        category: 'measurement'
      });
      expect(result.secondary[3]).toEqual({
        label: 'Operation Efficiency',
        value: 'High Efficiency',
        priority: 'secondary',
        category: 'operational'
      });
      expect(result.secondary[4]).toEqual({
        label: 'Transportation Distance',
        value: '8 Km',
        priority: 'secondary',
        category: 'measurement'
      });
      // Tillage-specific secondary fields
      expect(result.secondary[5]).toEqual({
        label: 'Tillage Type',
        value: 'Chisel Plow - Reduced tillage',
        priority: 'secondary',
        category: 'operational'
      });
      expect(result.secondary[6]).toEqual({
        label: 'Tillage Intensity',
        value: 'Medium - Moderate disturbance',
        priority: 'secondary',
        category: 'operational'
      });

      // Verify detail fields (Soil Properties, Environmental Conditions, Equipment, Tillage Details, Notes)
      expect(result.details).toHaveLength(10);
      expect(result.details[0]).toEqual({
        label: 'Soil pH',
        value: '7.2',
        priority: 'details',
        category: 'measurement'
      });
      expect(result.details[1]).toEqual({
        label: 'Organic Matter',
        value: '3.8%',
        priority: 'details',
        category: 'measurement'
      });
      expect(result.details[2]).toEqual({
        label: 'Soil Texture',
        value: 'Sandy Loam',
        priority: 'details',
        category: 'environmental'
      });
      expect(result.details[3]).toEqual({
        label: 'Soil Moisture',
        value: 'Moderate',
        priority: 'details',
        category: 'environmental'
      });
      expect(result.details[4]).toEqual({
        label: 'Weather Conditions',
        value: 'optimal tillage conditions',
        priority: 'details',
        category: 'environmental'
      });
      expect(result.details[5]).toEqual({
        label: 'Temperature Range',
        value: '20-25°C',
        priority: 'details',
        category: 'environmental'
      });
      expect(result.details[6]).toEqual({
        label: 'Equipment Used',
        value: 'John Deere tractor with chisel plow',
        priority: 'details',
        category: 'operational'
      });
      // Tillage-specific detail fields
      expect(result.details[7]).toEqual({
        label: 'Tillage Direction',
        value: 'Contour - Following natural lines',
        priority: 'details',
        category: 'operational'
      });
      expect(result.details[8]).toEqual({
        label: 'Residue Management',
        value: 'Incorporated - Mixed into soil',
        priority: 'details',
        category: 'operational'
      });
      expect(result.details[9]).toEqual({
        label: 'Soil Management Notes',
        value: 'Comprehensive tillage operation with focus on soil conservation',
        priority: 'details',
        category: 'notes'
      });
    });

    it('should extract Business event fields correctly', () => {
      const event = {
        event_type: 6,
        description: 'USDA Organic certification achievement',
        type: 'CE', // BusinessTab form uses 'type'
        name: 'Organic Certification Process', // BusinessTab form uses 'name'
        business_event_type: 'CE', // Mapped from 'type' for display
        business_event_name: 'Organic Certification Process', // Mapped from 'name' for display
        business_type: 'certification', // BusinessTab form business_type field
        business_activity_type: 'certification', // Mapped from 'business_type' for display
        certification_type: 'organic_usda',
        carbon_credits_earned: 150,
        carbon_credits_unit: 'credits',
        verification_status: 'verified',
        sustainability_practice: 'organic farming practices',
        observation: 'Successful USDA organic certification with comprehensive documentation'
      };

      const result = getEventFieldDisplay(event);

      // Verify immediate fields (Business Event Type, Event Name, Business Activity Type)
      expect(result.immediate).toHaveLength(3);
      expect(result.immediate[0]).toEqual({
        label: 'Business Event Type',
        value: 'Certification Event',
        priority: 'immediate',
        category: 'operational'
      });
      expect(result.immediate[1]).toEqual({
        label: 'Event Name',
        value: 'Organic Certification Process',
        priority: 'immediate',
        category: 'operational'
      });
      expect(result.immediate[2]).toEqual({
        label: 'Business Activity Type',
        value: 'Certification Achievement',
        priority: 'immediate',
        category: 'verification'
      });

      // Verify secondary fields (Certification Type, Carbon Credits Earned)
      expect(result.secondary).toHaveLength(2);
      expect(result.secondary[0]).toEqual({
        label: 'Certification Type',
        value: 'USDA Organic Certification',
        priority: 'secondary',
        category: 'verification'
      });
      expect(result.secondary[1]).toEqual({
        label: 'Carbon Credits Earned',
        value: '150 credits',
        priority: 'secondary',
        category: 'measurement'
      });

      // Verify detail fields (Verification Status, Sustainability Practice, Business Notes)
      expect(result.details).toHaveLength(3);
      expect(result.details[0]).toEqual({
        label: 'Verification Status',
        value: 'Verified',
        priority: 'details',
        category: 'verification'
      });
      expect(result.details[1]).toEqual({
        label: 'Sustainability Practice',
        value: 'organic farming practices',
        priority: 'details',
        category: 'environmental'
      });
      expect(result.details[2]).toEqual({
        label: 'Business Notes',
        value: 'Successful USDA organic certification with comprehensive documentation',
        priority: 'details',
        category: 'notes'
      });
    });

    it('should extract Carbon Credits Business event fields correctly', () => {
      const event = {
        event_type: 6,
        description: 'Carbon credits transaction',
        type: 'CM', // Compliance Activity
        name: 'Carbon Credit Sale Q1',
        business_event_type: 'CM',
        business_event_name: 'Carbon Credit Sale Q1',
        business_type: 'carbon_credits',
        business_activity_type: 'carbon_credits',
        carbon_credits_earned: 500,
        carbon_credits_unit: 'tonnes CO2e',
        verification_status: 'blockchain_verified',
        sustainability_practice: 'regenerative agriculture',
        observation: 'Successfully sold carbon credits through verified marketplace'
      };

      const result = getEventFieldDisplay(event);

      // Verify immediate fields
      expect(result.immediate).toHaveLength(3);
      expect(result.immediate[0]).toEqual({
        label: 'Business Event Type',
        value: 'Compliance Activity',
        priority: 'immediate',
        category: 'operational'
      });
      expect(result.immediate[1]).toEqual({
        label: 'Event Name',
        value: 'Carbon Credit Sale Q1',
        priority: 'immediate',
        category: 'operational'
      });
      expect(result.immediate[2]).toEqual({
        label: 'Business Activity Type',
        value: 'Carbon Credits Transaction',
        priority: 'immediate',
        category: 'verification'
      });

      // Verify secondary fields - Carbon credits should be prominently displayed
      expect(result.secondary).toHaveLength(1);
      expect(result.secondary[0]).toEqual({
        label: 'Carbon Credits Earned',
        value: '500 tonnes CO2e',
        priority: 'secondary',
        category: 'measurement'
      });

      // Verify detail fields
      expect(result.details).toHaveLength(3);
      expect(result.details[0]).toEqual({
        label: 'Verification Status',
        value: 'Blockchain Verified',
        priority: 'details',
        category: 'verification'
      });
      expect(result.details[1]).toEqual({
        label: 'Sustainability Practice',
        value: 'Regenerative Agriculture Practices',
        priority: 'details',
        category: 'environmental'
      });
      expect(result.details[2]).toEqual({
        label: 'Business Notes',
        value: 'Successfully sold carbon credits through verified marketplace',
        priority: 'details',
        category: 'notes'
      });
    });

    it('should handle Business events without optional fields gracefully', () => {
      const event = {
        event_type: 6,
        description: 'Basic business activity',
        type: 'IN', // Inspection Process
        name: 'Farm Inspection',
        business_event_type: 'IN',
        business_event_name: 'Farm Inspection',
        business_type: 'verification',
        business_activity_type: 'verification'
        // No optional fields like certification_type, carbon_credits_earned, etc.
      };

      const result = getEventFieldDisplay(event);

      // Should still have basic immediate fields
      expect(result.immediate).toHaveLength(3);
      expect(result.immediate[0]).toEqual({
        label: 'Business Event Type',
        value: 'Inspection Process',
        priority: 'immediate',
        category: 'operational'
      });
      expect(result.immediate[1]).toEqual({
        label: 'Event Name',
        value: 'Farm Inspection',
        priority: 'immediate',
        category: 'operational'
      });
      expect(result.immediate[2]).toEqual({
        label: 'Business Activity Type',
        value: 'Third-Party Verification',
        priority: 'immediate',
        category: 'verification'
      });

      // Should have empty secondary and details (no optional fields)
      expect(result.secondary).toHaveLength(0);
      expect(result.details).toHaveLength(0);
    });

    it('should extract Pest Management event fields correctly', () => {
      const event = {
        event_type: 7,
        description: 'Beneficial release for aphid control',
        type: 'BR', // PestManagementTab form uses 'type'
        name: 'Lady beetle release', // PestManagementTab form uses 'name'
        pest_management_type: 'BR', // Mapped from 'type' for display
        pest_management_name: 'Lady beetle release', // Mapped from 'name' for display
        // Agricultural context fields
        field_area_hectares: 2.5,
        travel_distance_km: 5.2,
        time_spent_hours: 1.5,
        // Agricultural decision fields
        crop_growth_stage: 'flowering',
        weather_conditions: 'calm morning',
        economic_threshold_met: true,
        action_recommended: 'continue_monitoring',
        // Pest management specific fields
        pest_species: 'Aphids',
        pest_pressure_level: 'high',
        beneficial_species: 'Hippodamia convergens',
        release_quantity: 500,
        trap_count: 10,
        damage_percentage: 15,
        action_threshold_met: true,
        imp_strategy: 'Integrated pest management with biological controls',
        observation: 'Successful beneficial release with good weather conditions'
      };

      const result = getEventFieldDisplay(event);

      // Verify immediate fields - check that we have the core pest management fields
      expect(result.immediate.length).toBeGreaterThanOrEqual(2);

      // Should have Pest Management Type field
      expect(result.immediate).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: 'Pest Management Type',
            value: 'Beneficial Release'
          })
        ])
      );

      // Should have Event Name field
      expect(result.immediate).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: 'Event Name',
            value: 'Lady beetle release'
          })
        ])
      );

      // Verify secondary fields - should have beneficial species and release info
      expect(result.secondary.length).toBeGreaterThanOrEqual(1);

      // Should have beneficial species field
      expect(result.secondary).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: 'Beneficial Species Released',
            value: 'Hippodamia convergens'
          })
        ])
      );

      // Verify detail fields - should have contextual information
      expect(result.details.length).toBeGreaterThanOrEqual(1);

      // Should have observations/notes
      expect(result.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: 'Pest Management Notes',
            value: 'Successful beneficial release with good weather conditions'
          })
        ])
      );
    });
  });
});
