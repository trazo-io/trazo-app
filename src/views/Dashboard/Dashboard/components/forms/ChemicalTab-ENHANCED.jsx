// CHEMICAL TAB - ENHANCED FOLLOWING TRAZO BEST PRACTICES
// Transparency-first approach with accurate USDA/EPA carbon calculations
// Phase 1 Enhanced: StandardComponents, transparency messaging, credible emission factors

import {
  Flex,
  HStack,
  Box,
  VStack,
  Badge,
  Text,
  Icon,
  InputGroup,
  InputRightAddon,
  Switch,
  Collapse,
  SimpleGrid
} from '@chakra-ui/react';
import {
  StandardCard,
  StandardButton,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardTextarea,
  StandardAlert,
  SectionHeader,
  SectionBox
} from 'components/Design/StandardComponents';
import {
  FaChevronLeft,
  FaChevronRight,
  FaFlask,
  FaSeedling,
  FaLeaf,
  FaShieldAlt,
  FaCalculator,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUserShield,
  FaClock
} from 'react-icons/fa';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import React, { useEffect, useRef, useState } from 'react';
import { object, string } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIntl } from 'react-intl';
import {
  validateConcentration,
  ConcentrationFeedback,
  getFormatExamples
} from 'components/Forms/ConcentrationValidation';

// ENHANCED SCHEMA - Following Equipment/Soil/Pest enhanced patterns with dynamic validation
// Now includes EPA Worker Protection Standard (WPS) compliance fields per 40 CFR 170.309
// 2025-01-21: Added chemical_subtype for accurate carbon emission factor selection
const formSchemaMainInfo = object({
  type: string().min(1, 'Chemical type is required'),
  // Chemical subtype for accurate emission factor selection
  // Different subtypes have different manufacturing emission factors
  chemical_subtype: string().optional(),
  commercial_name: string().min(2, 'Commercial name must be at least 2 characters'),
  active_ingredient: string().optional(),
  concentration: string()
    .min(1, 'Concentration/application rate is required')
    .refine(
      (value, context) => {
        console.log('[ChemicalTab] 🔍 Zod concentration validation called with:', {
          value,
          context
        });

        try {
          // Safely access context and parent properties
          const chemicalType = context?.parent?.type;
          console.log('[ChemicalTab] 📝 Chemical type from context:', chemicalType);

          if (!chemicalType) {
            console.log('[ChemicalTab] ⚠️ No chemical type, skipping validation');
            return true; // Let type validation handle this
          }

          const validation = validateConcentration(value, chemicalType);
          console.log('[ChemicalTab] ✅ Validation result:', validation);

          // Check if validation object exists and has the expected structure
          if (!validation) {
            console.warn('[ChemicalTab] ⚠️ Validation returned null/undefined');
            return false;
          }

          return validation.isValid === true;
        } catch (error) {
          console.error('[ChemicalTab] ❌ Concentration validation error:', error);
          console.error('[ChemicalTab] 📊 Error stack:', error.stack);
          return false; // Fail validation if there's an error
        }
      },
      {
        message: 'Invalid concentration format for selected chemical type'
      }
    ),
  volume_applied: string()
    .min(1, 'Volume applied is required')
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, 'Volume must be greater than 0'),
  volume_unit: string().min(1, 'Volume unit is required'),
  area_treated: string()
    .min(1, 'Area treated is required for carbon calculation')
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, 'Area must be greater than 0'),
  area_unit: string().min(1, 'Area unit is required'),
  application_method: string().min(1, 'Application method is required'),
  // Sprint 2 Epic 2.2: Application Details for USDA/EPA method specificity
  application_details: string().optional(),
  weather_conditions: string().optional(),
  application_timing: string().optional(),
  target_pest_disease: string().optional(),
  observation: string().optional(),
  // EPA Worker Protection Standard (WPS) Compliance Fields - 40 CFR 170.309
  applicator_name: string().optional(),
  epa_registration_number: string().optional(),
  restricted_use_pesticide: string().optional(), // 'true' or 'false' as string for form handling
  applicator_certification: string().optional(), // Required when restricted_use_pesticide is true
  rei_hours: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, 'REI must be a positive number'),
  phi_days: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, 'PHI must be a positive number'),
  // Sprint 3 Epic 3.2: Consumer Trust Fields for transparency
  organic_approved: string().optional(), // Whether chemical is organic approved
  buffer_zone_meters: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, 'Buffer zone must be a positive number')
});

const ChemicalTab = ({
  onSubmitHandler,
  onDataChange,
  onPrev,
  initialValues = {},
  hideActions = false
}) => {
  const intl = useIntl();
  const [hasInitialized, setHasInitialized] = useState(false);

  const methods = useForm({
    resolver: zodResolver(formSchemaMainInfo),
    defaultValues: {
      type: initialValues.type || '',
      chemical_subtype: initialValues.chemical_subtype || '',
      commercial_name: initialValues.commercial_name || '',
      active_ingredient: initialValues.active_ingredient || '',
      concentration: initialValues.concentration || '',
      volume_applied: initialValues.volume_applied?.toString() || '',
      volume_unit: initialValues.volume_unit || 'L',
      area_treated: initialValues.area_treated?.toString() || '',
      area_unit: initialValues.area_unit || 'ha',
      application_method: initialValues.application_method || '',
      application_details: initialValues.application_details || '',
      weather_conditions: initialValues.weather_conditions || '',
      application_timing: initialValues.application_timing || '',
      target_pest_disease: initialValues.target_pest_disease || '',
      observation: initialValues.observation || '',
      // EPA WPS Compliance Fields
      applicator_name: initialValues.applicator_name || '',
      epa_registration_number: initialValues.epa_registration_number || '',
      restricted_use_pesticide: initialValues.restricted_use_pesticide?.toString() || 'false',
      applicator_certification: initialValues.applicator_certification || '',
      rei_hours: initialValues.rei_hours?.toString() || '',
      phi_days: initialValues.phi_days?.toString() || '',
      // Sprint 3 Epic 3.2: Consumer Trust Fields
      organic_approved: initialValues.organic_approved || '',
      buffer_zone_meters: initialValues.buffer_zone_meters?.toString() || ''
    }
  });

  // Helper function to map backend event types to frontend codes
  const mapBackendTypeToFrontendCode = (backendType) => {
    if (!backendType) return '';

    // Map verbose backend types to frontend codes
    const typeMap = {
      'event.chemical.fertilizer': 'FE',
      'event.chemical.pesticide': 'PE',
      'event.chemical.fungicide': 'FU',
      'event.chemical.herbicide': 'HE'
    };

    // If it's already a code (FE, PE, FU, HE), return it as is
    if (['FE', 'PE', 'FU', 'HE'].includes(backendType)) {
      return backendType;
    }

    // Otherwise, try to map it
    return typeMap[backendType] || '';
  };

  // Initialize form values when initialValues change - ONLY ONCE to prevent form clearing
  useEffect(() => {
    // Reset form when we have meaningful data AND haven't initialized yet
    const hasData =
      initialValues &&
      Object.keys(initialValues).length > 0 &&
      (initialValues.type || initialValues.commercial_name || initialValues.concentration);

    if (
      (hasData || (initialValues && Object.keys(initialValues).length === 0)) &&
      !hasInitialized
    ) {
      console.log('[ChemicalTab] Resetting form with initialValues:', initialValues);
      console.log(
        '[ChemicalTab] RAW initialValues.type:',
        initialValues.type,
        typeof initialValues.type
      );
      console.log(
        '[ChemicalTab] RAW initialValues.volume (backend):',
        initialValues.volume,
        typeof initialValues.volume
      );
      console.log(
        '[ChemicalTab] RAW initialValues.area (backend):',
        initialValues.area,
        typeof initialValues.area
      );
      console.log(
        '[ChemicalTab] RAW initialValues.way_of_application (backend):',
        initialValues.way_of_application,
        typeof initialValues.way_of_application
      );

      // Map backend type to frontend code
      const mappedType = mapBackendTypeToFrontendCode(initialValues.type);
      console.log('[ChemicalTab] Mapped type from', initialValues.type, 'to', mappedType);

      const resetData = {
        type: mappedType,
        chemical_subtype: initialValues.chemical_subtype || '',
        commercial_name: initialValues.commercial_name || initialValues.name || '',
        active_ingredient: initialValues.active_ingredient || '',
        concentration: initialValues.concentration || '',
        // FIXED: Use correct backend field names for form population - check both possible field names
        volume_applied:
          initialValues.volume_applied !== undefined && initialValues.volume_applied !== null
            ? initialValues.volume_applied.toString()
            : initialValues.volume !== undefined && initialValues.volume !== null
            ? initialValues.volume.toString()
            : '',
        volume_unit: initialValues.volume_unit || 'L',
        area_treated:
          initialValues.area_treated !== undefined && initialValues.area_treated !== null
            ? initialValues.area_treated.toString()
            : initialValues.area !== undefined && initialValues.area !== null
            ? initialValues.area.toString()
            : '',
        area_unit: initialValues.area_unit || 'ha',
        application_method: initialValues.way_of_application || '',
        application_details: initialValues.application_details || '',
        // Environmental context fields for transparency
        weather_conditions: initialValues.weather_conditions || '',
        application_timing: initialValues.application_timing || '',
        target_pest_disease: initialValues.target_pest_disease || '',
        observation: initialValues.observation || '',
        // EPA WPS Compliance Fields
        applicator_name: initialValues.applicator_name || '',
        epa_registration_number: initialValues.epa_registration_number || '',
        restricted_use_pesticide: initialValues.restricted_use_pesticide?.toString() || 'false',
        applicator_certification: initialValues.applicator_certification || '',
        rei_hours: initialValues.rei_hours?.toString() || '',
        phi_days: initialValues.phi_days?.toString() || '',
        // Sprint 3 Epic 3.2: Consumer Trust Fields
        organic_approved: initialValues.organic_approved || '',
        buffer_zone_meters: initialValues.buffer_zone_meters?.toString() || ''
      };

      console.log('[ChemicalTab] Calling methods.reset() with:', resetData);
      console.log('[ChemicalTab] resetData.type:', resetData.type, typeof resetData.type);
      console.log(
        '[ChemicalTab] resetData.volume_applied:',
        resetData.volume_applied,
        typeof resetData.volume_applied
      );
      console.log(
        '[ChemicalTab] resetData.area_treated:',
        resetData.area_treated,
        typeof resetData.area_treated
      );

      methods.reset(resetData);
      setHasInitialized(true);

      console.log(
        '[ChemicalTab] INITIAL SETUP COMPLETE - After reset, getValues():',
        methods.getValues()
      );
    }
  }, [initialValues, hasInitialized]); // Only run when initialValues change or when not yet initialized

  const {
    handleSubmit,
    watch,
    formState: { errors }
  } = methods;

  const chemicalType = watch('type');
  const areaValue = watch('area_treated');
  const volumeValue = watch('volume_applied');
  const concentrationValue = watch('concentration');
  const isRestrictedUse = watch('restricted_use_pesticide') === 'true';

  // Clear chemical_subtype when chemical type changes (to prevent invalid subtype/type combinations)
  const previousChemicalTypeRef = useRef(chemicalType);
  useEffect(() => {
    if (hasInitialized && previousChemicalTypeRef.current !== chemicalType && chemicalType) {
      // Only clear if the type actually changed (not on initial load)
      methods.setValue('chemical_subtype', '');
      console.log('[ChemicalTab] Chemical type changed, clearing subtype');
    }
    previousChemicalTypeRef.current = chemicalType;
  }, [chemicalType, hasInitialized, methods]);

  // Real-time concentration validation
  const concentrationValidation =
    chemicalType && concentrationValue
      ? validateConcentration(concentrationValue, chemicalType)
      : null;

  // Real-time carbon calculation updates - only when sufficient data present
  const watchedFields = watch([
    'type',
    'volume_applied',
    'volume_unit',
    'area_treated',
    'area_unit',
    'concentration'
  ]);
  const previousValuesRef = useRef({});

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (onDataChange && typeof onDataChange === 'function') {
        const currentValues = methods.getValues();

        // FIXED: Always save form data for persistence, regardless of completeness
        // This ensures Volume Applied and Area Treated values persist when navigating between steps
        if (
          currentValues.volume_applied ||
          currentValues.area_treated ||
          currentValues.type ||
          currentValues.concentration ||
          currentValues.commercial_name
        ) {
          const relevantFields = [
            'type',
            'chemical_subtype',
            'commercial_name',
            'active_ingredient',
            'volume_applied',
            'volume_unit',
            'area_treated',
            'area_unit',
            'concentration',
            'application_method',
            'application_details',
            'weather_conditions',
            'application_timing',
            'target_pest_disease',
            'observation',
            'applicator_name',
            'epa_registration_number',
            'restricted_use_pesticide',
            'applicator_certification',
            'rei_hours',
            'phi_days'
          ];
          const currentRelevantValues = {};
          relevantFields.forEach((field) => {
            currentRelevantValues[field] = currentValues[field];
          });

          const hasChanged =
            JSON.stringify(currentRelevantValues) !== JSON.stringify(previousValuesRef.current);

          if (hasChanged) {
            previousValuesRef.current = currentRelevantValues;
            try {
              onDataChange(currentValues);
              console.log('[ChemicalTab]: 💾 Saved form data for persistence:', currentValues);
            } catch (error) {
              console.error('[ChemicalTab]: Error calling onDataChange:', error);
            }
          }
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [watchedFields]); // FIXED: Removed onDataChange to prevent infinite loop

  const onSubmit = (data) => {
    console.log('[ChemicalTab] 🚀 onSubmit called with data:', data);
    console.log('[ChemicalTab] 🔍 Form validation errors:', errors);
    console.log('[ChemicalTab] 📝 Form values from getValues():', methods.getValues());

    // Process numeric data and map frontend field names to backend field names
    const {
      // Remove frontend-only field names to avoid confusion
      volume_applied,
      area_treated,
      application_method,
      application_details,
      // Extract environmental context fields to include in backend submission
      weather_conditions,
      application_timing,
      target_pest_disease,
      // Extract EPA WPS compliance fields
      applicator_name,
      epa_registration_number,
      restricted_use_pesticide,
      applicator_certification,
      rei_hours,
      phi_days,
      ...filteredData
    } = data;

    const processedData = {
      ...filteredData,
      // Map frontend field names to backend field names - ensure required fields are always strings
      volume: volume_applied ? `${volume_applied} ${data.volume_unit}` : '',
      area: area_treated ? `${area_treated} ${data.area_unit}` : '',
      way_of_application: application_method || '',
      // EPA Worker Protection Standard (WPS) Compliance - 40 CFR 170.309
      // These are direct model fields on ChemicalEvent, not extra_data
      applicator_name: applicator_name || null,
      epa_registration_number: epa_registration_number || null,
      restricted_use_pesticide: restricted_use_pesticide === 'true',
      applicator_certification: applicator_certification || null,
      rei_hours: rei_hours ? parseFloat(rei_hours) : null,
      phi_days: phi_days ? parseFloat(phi_days) : null,
      // Store enhanced fields in extra_data for backend compatibility
      extra_data: {
        // Unit fields for carbon calculation accuracy
        volume_unit: data.volume_unit || '',
        area_unit: data.area_unit || '',
        // Sprint 2 Epic 2.2: Application details for USDA/EPA method specificity
        application_details: application_details || '',
        // Environmental context fields for transparency
        weather_conditions: weather_conditions || '',
        application_timing: application_timing || '',
        target_pest_disease: target_pest_disease || ''
      }
    };

    console.log('[ChemicalTab] Submitting with backend field names:', processedData);
    console.log('[ChemicalTab] 🎯 About to call onSubmitHandler...');

    try {
      const result = onSubmitHandler(processedData);
      console.log('[ChemicalTab] ✅ onSubmitHandler returned:', result);
    } catch (error) {
      console.error('[ChemicalTab] ❌ onSubmitHandler error:', error);
    }
  };

  // Calculate application rate for validation
  const applicationRate =
    volumeValue && areaValue ? (parseFloat(volumeValue) / parseFloat(areaValue)).toFixed(2) : null;

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
        <VStack spacing={6} align="stretch">
          {/* Transparency Focus Alert */}
          <StandardAlert status="info" title="Chemical Application Transparency">
            <HStack spacing={2} mb={2}>
              <Icon as={FaShieldAlt} color="blue.500" />
              <Text fontSize="sm" fontWeight="bold">
                EPA-Verified Carbon Calculations
              </Text>
            </HStack>
            <Text fontSize="sm">
              Document chemical applications with accurate carbon impact calculations using EPA
              emission factors. This information builds consumer trust through transparent
              agricultural practices.
            </Text>
          </StandardAlert>

          {/* Section 1: Chemical Selection & Identification */}
          <SectionBox variant="default">
            <SectionHeader
              icon={FaFlask}
              iconColor="purple.500"
              title="Chemical Application Details"
              badge="EPA Verified"
              badgeColorScheme="purple"
            />
            <VStack spacing={4} align="stretch">
              <StandardField
                label="Chemical Type"
                required
                error={errors.type?.message}
                helpText="Select the type of chemical for accurate carbon calculations"
              >
                <Controller
                  name="type"
                  control={methods.control}
                  render={({ field }) => (
                    <StandardSelect {...field} placeholder="Select chemical type...">
                      <option value="FE">🌱 Fertilizer - Nutrient application</option>
                      <option value="PE">🐛 Pesticide - Pest control</option>
                      <option value="FU">🍄 Fungicide - Disease prevention</option>
                      <option value="HE">🌿 Herbicide - Weed management</option>
                    </StandardSelect>
                  )}
                />
              </StandardField>

              {/* Chemical Subtype - Conditional based on chemical type for accurate emission factors */}
              {chemicalType && (
                <StandardField
                  label="Chemical Subtype"
                  error={errors.chemical_subtype?.message}
                  helpText="Select the specific subtype for accurate carbon emission calculations. Different subtypes have different manufacturing emission factors."
                >
                  <Controller
                    name="chemical_subtype"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardSelect {...field} placeholder="Select subtype (optional)...">
                        {/* Fertilizer subtypes */}
                        {chemicalType === 'FE' && (
                          <>
                            <option value="synthetic_fertilizer">
                              🏭 Synthetic/Chemical (Urea, Ammonium Nitrate, etc.)
                            </option>
                            <option value="organic_fertilizer">
                              🌿 Organic (Compost, Manure, etc.)
                            </option>
                            <option value="slow_release_fertilizer">
                              ⏳ Slow-Release/Controlled
                            </option>
                          </>
                        )}

                        {/* Pesticide subtypes */}
                        {chemicalType === 'PE' && (
                          <>
                            <option value="synthetic_pesticide">🏭 Synthetic (Conventional)</option>
                            <option value="organic_pesticide">
                              🌿 Organic/Natural (Neem, Pyrethrin, etc.)
                            </option>
                            <option value="biological_pesticide">
                              🦠 Biological (Bt, Spinosad, etc.)
                            </option>
                          </>
                        )}

                        {/* Herbicide subtypes */}
                        {chemicalType === 'HE' && (
                          <>
                            <option value="synthetic_herbicide">
                              🏭 Synthetic (Glyphosate, 2,4-D, Atrazine, etc.)
                            </option>
                            <option value="organic_herbicide">
                              🌿 Organic/Natural (Vinegar, Acetic Acid, Clove Oil, etc.)
                            </option>
                          </>
                        )}

                        {/* Fungicide subtypes */}
                        {chemicalType === 'FU' && (
                          <>
                            <option value="synthetic_fungicide">
                              🏭 Synthetic (Chlorothalonil, Mancozeb, etc.)
                            </option>
                            <option value="copper_fungicide">
                              🟤 Copper-Based (Bordeaux Mix, Copper Sulfate, Kocide, etc.)
                            </option>
                            <option value="sulfur_fungicide">🟡 Sulfur-Based</option>
                            <option value="biological_fungicide">
                              🦠 Biological (Bacillus, Trichoderma, etc.)
                            </option>
                          </>
                        )}
                      </StandardSelect>
                    )}
                  />
                </StandardField>
              )}

              <StandardField
                label="Commercial Name / Product"
                required
                error={errors.commercial_name?.message}
                helpText="Brand name or product name for transparency documentation"
              >
                <Controller
                  name="commercial_name"
                  control={methods.control}
                  render={({ field }) => (
                    <StandardInput
                      {...field}
                      placeholder="e.g., Miracle-Gro All Purpose, Roundup WeatherMAX"
                    />
                  )}
                />
              </StandardField>

              <StandardField
                label="Active Ingredient (Optional)"
                error={errors.active_ingredient?.message}
                helpText="Main active ingredient for consumer transparency"
              >
                <Controller
                  name="active_ingredient"
                  control={methods.control}
                  render={({ field }) => (
                    <StandardInput {...field} placeholder="e.g., Glyphosate, NPK 10-10-10" />
                  )}
                />
              </StandardField>
            </VStack>
          </SectionBox>

          {/* Section 2: Application Details & Carbon Calculation Data */}
          <SectionBox variant="highlighted">
            <SectionHeader
              icon={FaCalculator}
              iconColor="green.600"
              title="Application Rate & Coverage"
              badge="Carbon Calculation"
              badgeColorScheme="green"
              description="Accurate application rates are essential for calculating the environmental impact of your chemical applications."
            />
            <VStack spacing={4} align="stretch">
              <HStack spacing={4} align="top">
                <StandardField
                  label="Volume Applied"
                  required
                  error={errors.volume_applied?.message}
                  helpText="Total volume applied for carbon calculation"
                  flex={2}
                >
                  <Controller
                    name="volume_applied"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardInput
                        {...field}
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="0.0"
                        bg="white"
                      />
                    )}
                  />
                </StandardField>

                <StandardField label="Unit" flex={1} mt="0px">
                  <Controller
                    name="volume_unit"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardSelect {...field} bg="white">
                        <option value="L">Liters (L)</option>
                        <option value="gal">Gallons</option>
                        <option value="kg">Kilograms</option>
                        <option value="lb">Pounds</option>
                      </StandardSelect>
                    )}
                  />
                </StandardField>
              </HStack>

              <HStack spacing={4} align="top">
                <StandardField
                  label="Area Treated"
                  required
                  error={errors.area_treated?.message}
                  helpText="Area coverage for accurate carbon calculation"
                  flex={2}
                >
                  <Controller
                    name="area_treated"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardInput
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        bg="white"
                      />
                    )}
                  />
                </StandardField>

                <StandardField label="Unit" flex={1} mt="0px">
                  <Controller
                    name="area_unit"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardSelect {...field} bg="white">
                        <option value="ha">Hectares (ha)</option>
                        <option value="acres">Acres</option>
                        <option value="m2">Square meters</option>
                      </StandardSelect>
                    )}
                  />
                </StandardField>
              </HStack>

              <StandardField
                label={
                  <HStack spacing={2}>
                    <Text>
                      {chemicalType === 'FE'
                        ? 'NPK Ratio'
                        : chemicalType === 'PE'
                        ? 'Pesticide Concentration'
                        : chemicalType === 'HE'
                        ? 'Herbicide Concentration'
                        : chemicalType === 'FU'
                        ? 'Fungicide Concentration'
                        : 'Concentration / Application Rate'}
                    </Text>
                    <Badge
                      size="sm"
                      colorScheme={concentrationValidation?.isValid ? 'green' : 'red'}
                      variant={concentrationValidation ? 'solid' : 'outline'}
                    >
                      {chemicalType === 'FE'
                        ? 'NPK'
                        : ['PE', 'HE', 'FU'].includes(chemicalType)
                        ? '%'
                        : 'Required'}
                    </Badge>
                  </HStack>
                }
                required
                error={errors.concentration?.message}
                helpText={
                  chemicalType
                    ? `Enter ${
                        chemicalType === 'FE'
                          ? 'NPK format (e.g., "10-10-10")'
                          : 'percentage (e.g., "2.5%")'
                      } for accurate carbon calculations`
                    : 'Select chemical type first for format guidance'
                }
              >
                <Controller
                  name="concentration"
                  control={methods.control}
                  render={({ field }) => (
                    <VStack spacing={2} align="stretch">
                      <StandardInput
                        {...field}
                        placeholder={
                          chemicalType === 'FE'
                            ? getFormatExamples('FE')[0]
                            : chemicalType === 'PE'
                            ? getFormatExamples('PE')[0]
                            : chemicalType === 'HE'
                            ? getFormatExamples('HE')[0]
                            : chemicalType === 'FU'
                            ? getFormatExamples('FU')[0]
                            : 'Select chemical type first...'
                        }
                        isDisabled={!chemicalType}
                        bg="white"
                        borderColor={
                          concentrationValidation?.isValid
                            ? 'green.300'
                            : concentrationValidation && !concentrationValidation.isValid
                            ? 'red.300'
                            : undefined
                        }
                      />

                      {/* Real-time Validation Feedback */}
                      {chemicalType && (
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
                          concentration={concentrationValue || ''}
                        />
                      )}
                    </VStack>
                  )}
                />
              </StandardField>

              {/* Sprint 2 Epic 2.2: Consolidated Application Methods - USDA/EPA Standards
                  Fertilizer: 5 USDA NRCS methods (Conservation Practice Standard 590)
                  Pesticide/Fungicide/Herbicide: 4 EPA methods (Pesticide Product Label Requirements)
                  Total: 9 standardized methods (reduced from 32)
              */}
              <StandardField
                label="Application Method"
                required
                error={errors.application_method?.message}
                helpText="USDA/EPA standard method - use Application Details for specifics"
              >
                <Controller
                  name="application_method"
                  control={methods.control}
                  render={({ field }) => (
                    <StandardSelect {...field} bg="white">
                      <option value="">Select application method...</option>

                      {/* USDA NRCS Standard Methods for Fertilizer (5 methods) */}
                      {chemicalType === 'FE' && (
                        <>
                          <option value="broadcast">
                            📡 Broadcast - Surface or incorporated spreading
                          </option>
                          <option value="banded">📏 Banded - Precise row/band placement</option>
                          <option value="subsurface">
                            💉 Subsurface - Below soil surface injection
                          </option>
                          <option value="fertigation">
                            💧 Fertigation - Through irrigation system
                          </option>
                          <option value="foliar">🌿 Foliar - Leaf surface application</option>
                        </>
                      )}

                      {/* EPA Standard Methods for Pesticide (4 methods) */}
                      {chemicalType === 'PE' && (
                        <>
                          <option value="ground_spray">
                            🌊 Ground Spray - Spray application to crops/soil
                          </option>
                          <option value="chemigation">
                            💧 Chemigation - Through irrigation system
                          </option>
                          <option value="seed_treatment">
                            🌱 Seed Treatment - Pre-planting seed coating
                          </option>
                          <option value="soil_incorporation">
                            🔄 Soil Incorporation - Mixed into soil
                          </option>
                        </>
                      )}

                      {/* EPA Standard Methods for Herbicide (4 methods) */}
                      {chemicalType === 'HE' && (
                        <>
                          <option value="ground_spray">
                            🌊 Ground Spray - Pre/post-emergent spray
                          </option>
                          <option value="chemigation">
                            💧 Chemigation - Through irrigation system
                          </option>
                          <option value="seed_treatment">
                            🌱 Seed Treatment - Pre-planting application
                          </option>
                          <option value="soil_incorporation">
                            🔄 Soil Incorporation - Mixed into soil
                          </option>
                        </>
                      )}

                      {/* EPA Standard Methods for Fungicide (4 methods) */}
                      {chemicalType === 'FU' && (
                        <>
                          <option value="ground_spray">
                            🌊 Ground Spray - Foliar or soil spray
                          </option>
                          <option value="chemigation">
                            💧 Chemigation - Through irrigation system
                          </option>
                          <option value="seed_treatment">
                            🌱 Seed Treatment - Preventive coating
                          </option>
                          <option value="soil_incorporation">
                            🔄 Soil Incorporation - Soil drench/mix
                          </option>
                        </>
                      )}

                      {/* Generic USDA/EPA methods when no type selected */}
                      {!chemicalType && (
                        <>
                          <option value="broadcast">📡 Broadcast - Surface spreading</option>
                          <option value="ground_spray">🌊 Ground Spray - Spray application</option>
                          <option value="chemigation">💧 Chemigation - Through irrigation</option>
                          <option value="foliar">🌿 Foliar - Leaf application</option>
                          <option value="soil_incorporation">
                            🔄 Soil Incorporation - Mixed into soil
                          </option>
                        </>
                      )}
                    </StandardSelect>
                  )}
                />
              </StandardField>

              {/* Sprint 2 Epic 2.2: Application Details for USDA/EPA method specificity */}
              <StandardField
                label="Application Details"
                helpText="Specific details about application method (e.g., equipment used, incorporated vs surface, pre vs post-emergent)"
              >
                <Controller
                  name="application_details"
                  control={methods.control}
                  render={({ field }) => (
                    <StandardInput
                      {...field}
                      placeholder="e.g., Tractor-mounted boom sprayer, incorporated 4 inches deep"
                    />
                  )}
                />
              </StandardField>
            </VStack>
          </SectionBox>

          {/* Section 3: Environmental Context & Transparency */}
          <SectionBox variant="default">
            <SectionHeader
              icon={FaLeaf}
              iconColor="green.500"
              title="Environmental Context"
              badge="Transparency"
              badgeColorScheme="green"
            />
            <VStack spacing={4} align="stretch">
              <StandardField
                label="Weather Conditions"
                error={errors.weather_conditions?.message}
                helpText="Weather conditions during application for transparency"
              >
                <Controller
                  name="weather_conditions"
                  control={methods.control}
                  render={({ field }) => (
                    <StandardSelect {...field}>
                      <option value="">Select conditions...</option>
                      <option value="calm_dry">☀️ Calm & Dry - Ideal conditions</option>
                      <option value="light_wind">🌬️ Light Wind - Suitable conditions</option>
                      <option value="humid">💨 Humid - Acceptable conditions</option>
                      <option value="windy">🌪️ Windy - Challenging conditions</option>
                    </StandardSelect>
                  )}
                />
              </StandardField>

              <StandardField
                label="Application Timing"
                error={errors.application_timing?.message}
                helpText="When the application was made for consumer understanding"
              >
                <Controller
                  name="application_timing"
                  control={methods.control}
                  render={({ field }) => (
                    <StandardSelect {...field}>
                      <option value="">Select timing...</option>
                      <option value="pre_plant">🌱 Pre-Planting</option>
                      <option value="post_emergence">🌿 Post-Emergence</option>
                      <option value="flowering">🌸 Flowering Stage</option>
                      <option value="fruit_development">🍎 Fruit Development</option>
                      <option value="harvest">🚜 Pre-Harvest</option>
                    </StandardSelect>
                  )}
                />
              </StandardField>

              <StandardField
                label="Target Pest/Disease/Need"
                error={errors.target_pest_disease?.message}
                helpText="What problem this application addresses for transparency"
              >
                <Controller
                  name="target_pest_disease"
                  control={methods.control}
                  render={({ field }) => (
                    <StandardInput
                      {...field}
                      placeholder="e.g., Aphid control, Nutrient deficiency, Weed suppression"
                    />
                  )}
                />
              </StandardField>

              {/* Sprint 3 Epic 3.2: Consumer Trust Fields */}
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <StandardField
                  label="Organic Approved"
                  helpText="Is this chemical approved for organic farming?"
                >
                  <Controller
                    name="organic_approved"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardSelect {...field} placeholder="Select organic status...">
                        <option value="omri_listed">✅ OMRI Listed - Organic certified</option>
                        <option value="usda_nop_approved">
                          🌱 USDA NOP Approved - National Organic Program
                        </option>
                        <option value="organic_equivalent">
                          🌿 Organic Equivalent - Meets organic standards
                        </option>
                        <option value="not_organic">
                          ❌ Not Organic Approved - Conventional use only
                        </option>
                        <option value="transitional">
                          🔄 Transitional - In certification process
                        </option>
                      </StandardSelect>
                    )}
                  />
                </StandardField>

                <StandardField
                  label="Buffer Zone (meters)"
                  error={errors.buffer_zone_meters?.message}
                  helpText="Required buffer distance from sensitive areas"
                >
                  <Controller
                    name="buffer_zone_meters"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardInput
                        {...field}
                        type="number"
                        step="1"
                        min="0"
                        placeholder="e.g., 15"
                      />
                    )}
                  />
                </StandardField>
              </SimpleGrid>

              <Box
                bg="teal.50"
                p={3}
                borderRadius="md"
                borderLeft="4px"
                borderLeftColor="teal.400"
                mt={2}
              >
                <HStack spacing={2} mb={1}>
                  <Icon as={FaLeaf} color="teal.500" fontSize="sm" />
                  <Text fontSize="sm" fontWeight="semibold" color="teal.700">
                    Consumer Trust Information
                  </Text>
                </HStack>
                <Text fontSize="xs" color="teal.600">
                  Consumers value knowing if products used on their food are organic-approved and
                  what safety measures protect nearby waterways and ecosystems. This transparency
                  builds trust in your farming practices.
                </Text>
              </Box>
            </VStack>
          </SectionBox>

          {/* Section 4: EPA Worker Protection Standard (WPS) Compliance - 40 CFR 170.309 */}
          {(chemicalType === 'PE' || chemicalType === 'HE' || chemicalType === 'FU') && (
            <SectionBox variant="default">
              <SectionHeader
                icon={FaUserShield}
                iconColor="orange.500"
                title="Safety & Compliance"
                badge="EPA Required"
                badgeColorScheme="orange"
              />
              <VStack spacing={4} align="stretch">
                {/* Clean info text without redundant alert styling */}
                <Text fontSize="sm" color="gray.600">
                  EPA Worker Protection Standard (40 CFR 170.309) requires documentation of
                  applicator information and safety intervals for pesticide applications.
                </Text>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <StandardField
                    label="Applicator Name"
                    error={errors.applicator_name?.message}
                    helpText="Person who applied the chemical"
                  >
                    <Controller
                      name="applicator_name"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardInput {...field} placeholder="Enter applicator name" />
                      )}
                    />
                  </StandardField>

                  <StandardField
                    label="EPA Registration Number"
                    error={errors.epa_registration_number?.message}
                    helpText="Product EPA registration number"
                  >
                    <Controller
                      name="epa_registration_number"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardInput {...field} placeholder="e.g., 12345-67" />
                      )}
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Restricted Use Pesticide - Clean toggle design */}
                <StandardField
                  label="Restricted Use Pesticide (RUP)"
                  helpText="Does this product require certified applicator for purchase/use?"
                >
                  <HStack
                    justify="space-between"
                    align="center"
                    p={3}
                    bg="gray.50"
                    borderRadius="md"
                  >
                    <Text fontSize="sm" color="gray.700">
                      This product is classified as Restricted Use
                    </Text>
                    <HStack spacing={3}>
                      {isRestrictedUse && (
                        <Badge colorScheme="red" size="sm">
                          RESTRICTED
                        </Badge>
                      )}
                      <Controller
                        name="restricted_use_pesticide"
                        control={methods.control}
                        render={({ field }) => (
                          <Switch
                            isChecked={field.value === 'true'}
                            onChange={(e) => field.onChange(e.target.checked ? 'true' : 'false')}
                            colorScheme="red"
                            size="lg"
                          />
                        )}
                      />
                    </HStack>
                  </HStack>
                </StandardField>

                {/* Conditional Certification Field */}
                <Collapse in={isRestrictedUse} animateOpacity>
                  <StandardField
                    label="Applicator Certification Number"
                    required={isRestrictedUse}
                    error={errors.applicator_certification?.message}
                    helpText="Required for restricted use pesticides - enter your state pesticide applicator license number"
                  >
                    <Controller
                      name="applicator_certification"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardInput {...field} placeholder="e.g., CA-12345-AG" />
                      )}
                    />
                  </StandardField>
                </Collapse>

                {/* Safety Intervals - Clean layout matching other sections */}
                <Text fontSize="sm" fontWeight="medium" color="gray.700" mt={2}>
                  Safety Intervals
                </Text>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <StandardField
                    label="REI (Restricted Entry Interval)"
                    error={errors.rei_hours?.message}
                    helpText="Hours before workers can re-enter treated area"
                  >
                    <Controller
                      name="rei_hours"
                      control={methods.control}
                      render={({ field }) => (
                        <InputGroup>
                          <StandardInput
                            {...field}
                            type="number"
                            step="1"
                            min="0"
                            placeholder="0"
                          />
                          <InputRightAddon>hours</InputRightAddon>
                        </InputGroup>
                      )}
                    />
                  </StandardField>

                  <StandardField
                    label="PHI (Pre-Harvest Interval)"
                    error={errors.phi_days?.message}
                    helpText="Days before harvest after application"
                  >
                    <Controller
                      name="phi_days"
                      control={methods.control}
                      render={({ field }) => (
                        <InputGroup>
                          <StandardInput
                            {...field}
                            type="number"
                            step="1"
                            min="0"
                            placeholder="0"
                          />
                          <InputRightAddon>days</InputRightAddon>
                        </InputGroup>
                      )}
                    />
                  </StandardField>
                </SimpleGrid>
              </VStack>
            </SectionBox>
          )}

          {/* Section 5: Farmer's Field Notes */}
          <SectionBox variant="default">
            <SectionHeader
              icon={FaSeedling}
              iconColor="green.500"
              title="Farmer's Field Notes & Consumer Transparency"
              badge="Consumer Transparency"
              badgeColorScheme="green"
            />
            <StandardField
              label="Observations & Notes"
              error={errors.observation?.message}
              helpText="Share details about this chemical application that help consumers understand your farming practices"
            >
              <Controller
                name="observation"
                control={methods.control}
                render={({ field }) => (
                  <StandardTextarea
                    {...field}
                    placeholder="Optional: Describe the purpose of this chemical application, environmental conditions, safety measures taken, or any observations that consumers might find valuable."
                    rows={4}
                  />
                )}
              />
            </StandardField>
          </SectionBox>

          {/* Navigation */}
          {!hideActions && (
            <Box pt={4} mt={4} borderTop="1px" borderColor="gray.200">
              <HStack justify="space-between">
                <StandardButton
                  variant="outline"
                  onClick={onPrev}
                  leftIcon={<FaChevronLeft />}
                  size="lg"
                >
                  {intl.formatMessage({ id: 'app.previous' }) || 'Previous'}
                </StandardButton>
                <StandardButton
                  variant="primary"
                  type="submit"
                  rightIcon={<FaChevronRight />}
                  size="lg"
                  onClick={() => {
                    console.log('[ChemicalTab] 🖱️ Continue button clicked!');
                    console.log('[ChemicalTab] 📊 Current form state:', methods.formState);
                    console.log('[ChemicalTab] ❗ Form errors before submit:', errors);
                  }}
                >
                  {intl.formatMessage({ id: 'app.continue' }) || 'Continue'}
                </StandardButton>
              </HStack>
            </Box>
          )}
        </VStack>
      </form>
    </FormProvider>
  );
};

export default ChemicalTab;
