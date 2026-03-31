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
  SimpleGrid,
  Input,
  Divider
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
  FaClock,
  FaBolt,
  FaTractor,
  FaGasPump
} from 'react-icons/fa';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { object, string, array } from 'zod';
import CustomFieldsForm from './CustomFieldsForm';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIntl } from 'react-intl';
import {
  validateConcentration,
  ConcentrationFeedback,
  getFormatExamples
} from 'components/Forms/ConcentrationValidation';

// Phase 3: Fuel types with EPA-verified emission factors (for application equipment)
// UPDATED 2026-02-15: All factors corrected to match EPA 40 CFR Part 98 Table C-1
const FUEL_TYPES = [
  { value: 'diesel', label: '⛽ Diesel', factor: '2.70 kg CO₂e/L' },
  { value: 'gasoline', label: '⛽ Gasoline', factor: '2.32 kg CO₂e/L' },
  { value: 'natural_gas', label: '💨 Natural Gas', factor: '1.92 kg CO₂e/m³' },
  { value: 'propane', label: '🔥 LPG / Propane', factor: '1.51 kg CO₂e/L' },
  { value: 'electric', label: '⚡ Electric', factor: '0.39 kg CO₂e/kWh' },
  { value: 'biodiesel', label: '🌿 Biodiesel', factor: '2.31 kg CO₂e/L' },
  { value: 'none', label: '🔧 No Fuel / Manual', factor: '0 kg CO₂e' }
];

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
  // In summary mode, per-application fields are hidden and replaced by aggregate totals.
  // Validation is enforced conditionally via superRefine below.
  concentration: string().optional(),
  volume_applied: string().optional(),
  volume_numeric: string().optional(),
  volume_unit: string().optional(),
  area_treated: string().optional(),
  area_numeric: string().optional(),
  area_unit: string().optional(),
  // Phase 3: Fertigation toggle — fertilizer injected through irrigation system
  is_fertigation: string().optional(),
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
    }, 'Buffer zone must be a positive number'),
  // Phase 3: Application fuel tracking for equipment fuel emissions
  application_fuel_type: string().optional(),
  application_fuel_consumed: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, 'Application fuel amount cannot be negative'),
  application_fuel_unit: string().optional(),
  custom_fields: array(
    object({
      id: string().optional(),
      label: string(),
      value: string(),
      field_type: string(),
      visibility: string(),
      link_url: string().optional(),
      verification: string().optional(),
      created_at: string().optional(),
      photo_id: string().optional()
    })
  ).optional(),
  // Sprint 5: Aggregate Fertilizer Support - log multiple applications as one summary
  is_summary: string().optional(), // "true" or "false" as string for form compatibility
  date_start: string().optional(), // Period start date for aggregate events
  date_end: string().optional(), // Period end date for aggregate events
  event_count: string().optional(), // Number of applications in the period
  // Aggregate totals for fertilizer
  volume_applied_total: string().optional(), // Combined volume across all applications
  area_treated_total: string().optional(), // Combined area across all applications
  nitrogen_total_kg: string().optional(), // Total nitrogen applied (kg)
  phosphorus_total_kg: string().optional(), // Total phosphorus applied (kg)
  potassium_total_kg: string().optional(), // Total potassium applied (kg)
  fuel_consumption_total: string().optional(), // Combined fuel for application equipment
  // Fungicide-specific aggregate field
  active_ingredient_total_kg: string().optional(), // Total active ingredient for fungicides (kg)
  // Phase 2: Universal CommonEvent fields (variety, block_id, growth_stage)
  variety: string().optional(),
  block_id: string().optional(),
  growth_stage: string().optional()
}).superRefine((data, ctx) => {
  // In summary mode, per-application fields (concentration, volume_applied, area_treated)
  // are hidden and replaced by aggregate totals — skip their required validation.
  const isSummary = data.is_summary === 'true' && ['FE', 'FU', 'PE'].includes(data.type);
  if (isSummary) return;

  if (!data.concentration || data.concentration.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['concentration'], message: 'Concentration/application rate is required' });
  } else if (data.type) {
    try {
      const validation = validateConcentration(data.concentration, data.type);
      if (validation && !validation.isValid) {
        ctx.addIssue({ code: 'custom', path: ['concentration'], message: 'Invalid concentration format for selected chemical type' });
      }
    } catch (e) { /* let it pass */ }
  }
  // Use volume_numeric as the primary numeric field; fall back to volume_applied for backward compat
  const effectiveVolume = data.volume_numeric || data.volume_applied;
  if (!effectiveVolume || effectiveVolume.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['volume_numeric'], message: 'Volume applied is required' });
  } else if (parseFloat(effectiveVolume) <= 0 || isNaN(parseFloat(effectiveVolume))) {
    ctx.addIssue({ code: 'custom', path: ['volume_numeric'], message: 'Volume must be greater than 0' });
  }
  if (!data.volume_unit || data.volume_unit.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['volume_unit'], message: 'Volume unit is required' });
  }
  // Use area_numeric as the primary numeric field; fall back to area_treated for backward compat
  const effectiveArea = data.area_numeric || data.area_treated;
  if (!effectiveArea || effectiveArea.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['area_numeric'], message: 'Area treated is required for carbon calculation' });
  } else if (parseFloat(effectiveArea) <= 0 || isNaN(parseFloat(effectiveArea))) {
    ctx.addIssue({ code: 'custom', path: ['area_numeric'], message: 'Area must be greater than 0' });
  }
  if (!data.area_unit || data.area_unit.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['area_unit'], message: 'Area unit is required' });
  }
});

const ChemicalTab = forwardRef(
  ({ onSubmitHandler, onDataChange, onPrev, initialValues = {}, hideActions = false }, ref) => {
    const intl = useIntl();
    const [hasInitialized, setHasInitialized] = useState(false);

    // SPRINT 6 DEBUG: Log initialValues only on mount (not every render)
    // Moved to useEffect to prevent console spam from parent re-renders

    const methods = useForm({
      resolver: zodResolver(formSchemaMainInfo),
      defaultValues: {
        type: initialValues.type || '',
        chemical_subtype: initialValues.chemical_subtype || '',
        commercial_name: initialValues.commercial_name || '',
        // SPRINT 6 FIX (2025-12-24): Read from extra_data as fallback (no model field exists)
        active_ingredient:
          initialValues.active_ingredient || initialValues.extra_data?.active_ingredient || '',
        concentration: initialValues.concentration || '',
        volume_applied: initialValues.volume_applied?.toString() || '',
        volume_numeric: initialValues.volume_numeric?.toString() || initialValues.volume_applied?.toString() || '',
        volume_unit: initialValues.volume_unit || initialValues.extra_data?.volume_unit || 'gal',
        area_treated: initialValues.area_treated?.toString() || '',
        area_numeric: initialValues.area_numeric?.toString() || initialValues.area_treated?.toString() || '',
        area_unit: initialValues.area_unit || initialValues.extra_data?.area_unit || 'acres',
        is_fertigation: initialValues.is_fertigation === true || initialValues.is_fertigation === 'true' ? 'true' : 'false',
        application_method: initialValues.application_method || '',
        // SPRINT 6 FIX (2025-12-24): Read from extra_data as fallback (stored there in onSubmit)
        application_details:
          initialValues.application_details || initialValues.extra_data?.application_details || '',
        weather_conditions: initialValues.weather_conditions || initialValues.extra_data?.weather_conditions || '',
        application_timing: initialValues.application_timing || initialValues.extra_data?.application_timing || '',
        target_pest_disease: initialValues.target_pest_disease || initialValues.extra_data?.target_pest_disease || '',
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
        buffer_zone_meters: initialValues.buffer_zone_meters?.toString() || '',
        // Phase 3: Application fuel tracking
        application_fuel_type: initialValues.application_fuel_type || '',
        application_fuel_consumed: initialValues.application_fuel_consumed?.toString() || '',
        application_fuel_unit: initialValues.application_fuel_unit || 'gal',
        custom_fields: initialValues.custom_fields || [],
        // Sprint 5: Aggregate Fertilizer Support
        // FIX: Use strict comparison — string "false" is truthy in JS!
        is_summary: initialValues.is_summary === 'true' || initialValues.is_summary === true ? 'true' : 'false',
        date_start: initialValues.date_start || '',
        date_end: initialValues.date_end || '',
        event_count: initialValues.event_count?.toString() || '',
        volume_applied_total: initialValues.volume_applied_total?.toString() || '',
        area_treated_total: initialValues.area_treated_total?.toString() || '',
        nitrogen_total_kg: initialValues.nitrogen_total_kg?.toString() || '',
        phosphorus_total_kg: initialValues.phosphorus_total_kg?.toString() || '',
        potassium_total_kg: initialValues.potassium_total_kg?.toString() || '',
        fuel_consumption_total: initialValues.fuel_consumption_total?.toString() || '',
        // Fungicide-specific aggregate field
        active_ingredient_total_kg: initialValues.active_ingredient_total_kg?.toString() || '',
        // Phase 2: Universal CommonEvent fields
        variety: initialValues.variety || '',
        block_id: initialValues.block_id || '',
        growth_stage: initialValues.growth_stage || ''
      }
    });

    // Ref to always hold the latest submit handler, avoiding stale closures in useImperativeHandle
    const submitHandlerRef = useRef(null);

    // Expose flushData and submitForm methods to parent via ref
    // flushData: force-sync raw form values before step change (legacy fallback)
    // submitForm: programmatically trigger form validation + onSubmit (preferred path)
    useImperativeHandle(
      ref,
      () => ({
        flushData: () => {
          if (onDataChange) {
            const currentValues = methods.getValues();
            onDataChange(currentValues);
          }
        },
        submitForm: () =>
          new Promise((resolve, reject) => {
            methods.handleSubmit(
              (data) => {
                submitHandlerRef.current(data);
                resolve();
              },
              (errors) => {
                reject(errors);
              }
            )();
          })
      }),
      [onDataChange, methods]
    );

    // Custom fields state for Phase 2.3
    const [customFields, setCustomFields] = useState(initialValues.custom_fields || []);

    // Helper function to map backend event types to frontend codes
    // COMPREHENSIVE CHEMICAL EVENT TYPE MAPPING
    const mapBackendTypeToFrontendCode = (backendType) => {
      if (!backendType) {
        return '';
      }

      // CHEMICAL EVENT TYPE MAP: Backend verbose property paths → Frontend short codes
      const typeMap = {
        'event.chemical.fertilizer': 'FE',
        'event.chemical.pesticide': 'PE',
        'event.chemical.fungicide': 'FU',
        'event.chemical.herbicide': 'HE'
      };

      // ALL VALID CHEMICAL SHORT CODES
      const validCodes = ['FE', 'PE', 'FU', 'HE'];

      // If it's already a short code, return it as is
      if (validCodes.includes(backendType)) {
        return backendType;
      }

      // Try to map verbose backend type to short code
      const mappedCode = typeMap[backendType];

      if (mappedCode) {
        return mappedCode;
      } else {
        console.warn('[ChemicalTab] Unknown backend chemical type:', backendType);
        return ''; // Return empty string for unknown types (form will use default)
      }
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
        // Map backend type to frontend code
        const mappedType = mapBackendTypeToFrontendCode(initialValues.type);

        const resetData = {
          type: mappedType,
          chemical_subtype: initialValues.chemical_subtype || '',
          commercial_name: initialValues.commercial_name || initialValues.name || '',
          // SPRINT 6 FIX (2025-12-24): Read from extra_data as fallback (no model field exists)
          active_ingredient:
            initialValues.active_ingredient || initialValues.extra_data?.active_ingredient || '',
          concentration: initialValues.concentration || '',
          // FIXED: Use correct backend field names for form population - check both possible field names
          volume_applied:
            initialValues.volume_applied !== undefined && initialValues.volume_applied !== null
              ? initialValues.volume_applied.toString()
              : initialValues.volume !== undefined && initialValues.volume !== null
              ? initialValues.volume.toString()
              : '',
          volume_numeric:
            initialValues.volume_numeric !== undefined && initialValues.volume_numeric !== null
              ? initialValues.volume_numeric.toString()
              : initialValues.volume_applied !== undefined && initialValues.volume_applied !== null
              ? initialValues.volume_applied.toString()
              : initialValues.volume !== undefined && initialValues.volume !== null
              ? initialValues.volume.toString()
              : '',
          volume_unit: initialValues.volume_unit || initialValues.extra_data?.volume_unit || 'gal',
          area_treated:
            initialValues.area_treated !== undefined && initialValues.area_treated !== null
              ? initialValues.area_treated.toString()
              : initialValues.area !== undefined && initialValues.area !== null
              ? initialValues.area.toString()
              : '',
          area_numeric:
            initialValues.area_numeric !== undefined && initialValues.area_numeric !== null
              ? initialValues.area_numeric.toString()
              : initialValues.area_treated !== undefined && initialValues.area_treated !== null
              ? initialValues.area_treated.toString()
              : initialValues.area !== undefined && initialValues.area !== null
              ? initialValues.area.toString()
              : '',
          area_unit: initialValues.area_unit || initialValues.extra_data?.area_unit || 'acres',
          is_fertigation: initialValues.is_fertigation === true || initialValues.is_fertigation === 'true' ? 'true' : 'false',
          application_method: initialValues.application_method || initialValues.way_of_application || '',
          // SPRINT 6 FIX (2025-12-24): Read from extra_data as fallback (stored there in onSubmit)
          application_details:
            initialValues.application_details ||
            initialValues.extra_data?.application_details ||
            '',
          // Environmental context fields for transparency (model columns with extra_data fallback)
          weather_conditions: initialValues.weather_conditions || initialValues.extra_data?.weather_conditions || '',
          application_timing: initialValues.application_timing || initialValues.extra_data?.application_timing || '',
          target_pest_disease: initialValues.target_pest_disease || initialValues.extra_data?.target_pest_disease || '',
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
          buffer_zone_meters: initialValues.buffer_zone_meters?.toString() || '',
          // Phase 3: Application fuel tracking
          application_fuel_type: initialValues.application_fuel_type || '',
          application_fuel_consumed: initialValues.application_fuel_consumed?.toString() || '',
          application_fuel_unit: initialValues.application_fuel_unit || 'gal',
          custom_fields: initialValues.custom_fields || [],
          // Sprint 5: Aggregate Fertilizer Support
          // FIX: Use strict comparison — string "false" is truthy in JS!
          is_summary: initialValues.is_summary === 'true' || initialValues.is_summary === true ? 'true' : 'false',
          date_start: initialValues.date_start || '',
          date_end: initialValues.date_end || '',
          event_count: initialValues.event_count?.toString() || '',
          volume_applied_total: initialValues.volume_applied_total?.toString() || '',
          area_treated_total: initialValues.area_treated_total?.toString() || '',
          nitrogen_total_kg: initialValues.nitrogen_total_kg?.toString() || '',
          phosphorus_total_kg: initialValues.phosphorus_total_kg?.toString() || '',
          potassium_total_kg: initialValues.potassium_total_kg?.toString() || '',
          fuel_consumption_total: initialValues.fuel_consumption_total?.toString() || '',
          // Fungicide-specific aggregate field
          active_ingredient_total_kg: initialValues.active_ingredient_total_kg?.toString() || '',
          // Phase 2: Universal CommonEvent fields
          variety: initialValues.variety || '',
          block_id: initialValues.block_id || '',
          growth_stage: initialValues.growth_stage || ''
        };

        methods.reset(resetData);
        setHasInitialized(true);
      }
    }, [initialValues, hasInitialized]); // Only run when initialValues change or when not yet initialized

    // Sync custom fields with form
    useEffect(() => {
      methods.setValue('custom_fields', customFields);
    }, [customFields, methods]);

    const {
      handleSubmit,
      watch,
      formState: { errors }
    } = methods;

    const chemicalType = watch('type');
    const areaValue = watch('area_numeric') || watch('area_treated');
    const volumeValue = watch('volume_numeric') || watch('volume_applied');
    const concentrationValue = watch('concentration');
    const isRestrictedUse = watch('restricted_use_pesticide') === 'true';

    // Sprint 5: Watch for summary mode toggle (Aggregate Fertilizer Support)
    // SPRINT 6 FIX (2025-12-23): Only enable summary mode for chemical types that support it (FE, FU, PE)
    // This prevents HE (Herbicide) from having hidden quantity fields when is_summary is stale/true
    const isSummaryMode =
      watch('is_summary') === 'true' && ['FE', 'FU', 'PE'].includes(chemicalType);

    // Clear chemical_subtype when chemical type changes (to prevent invalid subtype/type combinations)
    const previousChemicalTypeRef = useRef(chemicalType);
    useEffect(() => {
      if (hasInitialized && previousChemicalTypeRef.current !== chemicalType && chemicalType) {
        // Only clear if the type actually changed (not on initial load)
        methods.setValue('chemical_subtype', '');
      }
      previousChemicalTypeRef.current = chemicalType;
    }, [chemicalType, hasInitialized, methods]);

    // Real-time concentration validation
    const concentrationValidation =
      chemicalType && concentrationValue
        ? validateConcentration(concentrationValue, chemicalType)
        : null;

    // Real-time updates - watch ALL fields that appear in preview or affect carbon calculation
    // Previously only carbon-related fields were watched, causing stale preview data
    // for safety/compliance/transparency fields (REI, PHI, applicator, EPA reg, etc.)
    const watchedFields = watch([
      'type',
      'commercial_name',
      'chemical_subtype',
      'active_ingredient',
      'volume_applied',
      'volume_numeric',
      'volume_unit',
      'area_treated',
      'area_numeric',
      'area_unit',
      'is_fertigation',
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
      'phi_days',
      'organic_approved',
      'buffer_zone_meters',
      'application_fuel_type',
      'application_fuel_consumed',
      'application_fuel_unit',
      // Summary mode fields for aggregate carbon calculation
      'is_summary',
      'active_ingredient_total_kg',
      'fuel_consumption_total',
      'nitrogen_total_kg',
      'phosphorus_total_kg',
      'potassium_total_kg',
      'event_count'
    ]);
    // Serialize watched values so useEffect only fires when actual VALUES change,
    // not on every render (watch() returns a new array reference each time)
    const watchedFieldsSerialized = JSON.stringify(watchedFields);
    const previousValuesRef = useRef({});

    useEffect(() => {
      const timeoutId = setTimeout(() => {
        if (onDataChange && typeof onDataChange === 'function') {
          const currentValues = methods.getValues();

          // FIXED: Always save form data for persistence, regardless of completeness
          // This ensures all form data is saved, even if not all required fields are filled
          const relevantFields = [
            'type',
            'chemical_subtype',
            'commercial_name',
            'active_ingredient',
            'volume_applied',
            'volume_numeric',
            'volume_unit',
            'area_treated',
            'area_numeric',
            'area_unit',
            'is_fertigation',
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
            'phi_days',
            'organic_approved',
            'buffer_zone_meters',
            'custom_fields',
            'application_fuel_type',
            'application_fuel_consumed',
            'application_fuel_unit',
            // Summary mode fields for aggregate carbon calculation
            'is_summary',
            'active_ingredient_total_kg',
            'fuel_consumption_total',
            'nitrogen_total_kg',
            'phosphorus_total_kg',
            'potassium_total_kg',
            'event_count'
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
            } catch (error) {
              console.error('[ChemicalTab]: Error calling onDataChange:', error);
            }
          }
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    }, [watchedFieldsSerialized]); // Use serialized values: only fires when actual field values change, not on every render

    const onSubmit = (data) => {
      // Process numeric data and map frontend field names to backend field names
      const {
        // Remove frontend-only field names to avoid confusion
        volume_applied,
        volume_numeric,
        area_treated,
        area_numeric,
        application_method,
        application_details,
        // SPRINT 6 FIX (2025-12-24): Extract active_ingredient to store in extra_data (no model field)
        active_ingredient,
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
        // Phase 3: Extract is_fertigation to include in extra_data
        is_fertigation,
        ...filteredData
      } = data;

      // Phase 3: Derive effective volume and area — volume_numeric / area_numeric are primary
      const effectiveVolume = volume_numeric || volume_applied || '';
      const effectiveArea = area_numeric || area_treated || '';

      // Sprint 5: Check for aggregate mode
      const isSummaryEvent = data.is_summary === 'true';

      const processedData = {
        ...filteredData,
        // SPRINT 6 FIX (2025-12-24): Explicitly set fields to undefined that are now in extra_data
        // This prevents stale top-level values from eventFormData being preserved during merge
        // When onSubmitMainInfo does {...eventFormData, ...data}, undefined values will be filtered by cleanEventData
        active_ingredient: undefined,
        application_details: undefined,
        weather_conditions: undefined,
        application_timing: undefined,
        target_pest_disease: undefined,
        // Phase 3: volume_numeric / area_numeric are the primary numeric fields.
        // volume_applied and area_treated are kept for backward compatibility.
        volume_numeric: effectiveVolume ? parseFloat(effectiveVolume) : null,
        area_numeric: effectiveArea ? parseFloat(effectiveArea) : null,
        // 🔧 FIELD UNIFICATION FIX: Send separate numeric values and units
        // Backend UpdateChemicalEventSerializer handles:
        //   - volume_applied → maps to volume field
        //   - volume_unit → stores in extra_data
        //   - area_treated → maps to area field
        //   - area_unit → stores in extra_data
        // Do NOT combine into strings like "400 L" - keep them separate!
        volume_applied: effectiveVolume || '',
        area_treated: effectiveArea || '',
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
          // Phase 3: Fertigation flag — application fuel excluded from carbon calc to avoid double-counting
          is_fertigation: is_fertigation === 'true',
          // Sprint 2 Epic 2.2: Application details for USDA/EPA method specificity
          application_details: application_details || '',
          // SPRINT 6 FIX (2025-12-24): Store active_ingredient in extra_data (no model field exists)
          active_ingredient: active_ingredient || '',
          // Environmental context fields for transparency
          weather_conditions: weather_conditions || '',
          application_timing: application_timing || '',
          target_pest_disease: target_pest_disease || '',
          // FIX: Always persist fuel fields in extra_data (no model columns exist for these)
          application_fuel_type: data.application_fuel_type || '',
          application_fuel_consumed: data.application_fuel_consumed || '',
          application_fuel_unit: data.application_fuel_unit || 'gal',
          // Sprint 5: Aggregate Chemical Support (Fertilizer, Fungicide & Pesticide)
          ...(isSummaryEvent && {
            is_summary: true,
            date_start: data.date_start || null,
            date_end: data.date_end || null,
            event_count: data.event_count ? parseInt(data.event_count, 10) : null,
            // NPK totals for fertilizer carbon calculation
            nitrogen_total_kg: data.nitrogen_total_kg ? parseFloat(data.nitrogen_total_kg) : null,
            phosphorus_total_kg: data.phosphorus_total_kg
              ? parseFloat(data.phosphorus_total_kg)
              : null,
            potassium_total_kg: data.potassium_total_kg
              ? parseFloat(data.potassium_total_kg)
              : null,
            // Active ingredient total for fungicide & pesticide carbon calculation
            active_ingredient_total_kg: data.active_ingredient_total_kg
              ? parseFloat(data.active_ingredient_total_kg)
              : null,
            // Volume and area totals
            volume_applied_total: data.volume_applied_total
              ? parseFloat(data.volume_applied_total)
              : null,
            area_treated_total: data.area_treated_total
              ? parseFloat(data.area_treated_total)
              : null,
            // Equipment fuel
            fuel_consumption_total: data.fuel_consumption_total
              ? parseFloat(data.fuel_consumption_total)
              : null,
            fuel_unit: data.application_fuel_unit || 'gal',
            fuel_type: data.application_fuel_type || 'diesel'
          })
        }
      };

      try {
        const result = onSubmitHandler(processedData);
      } catch (error) {
        console.error('[ChemicalTab] onSubmitHandler error:', error);
      }
    };

    // Calculate application rate for validation
    const applicationRate =
      volumeValue && areaValue
        ? (parseFloat(volumeValue) / parseFloat(areaValue)).toFixed(2)
        : null;

    // Keep ref in sync with latest handler on every render (avoids stale closures)
    submitHandlerRef.current = onSubmit;

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
                              <option value="synthetic_pesticide">
                                🏭 Synthetic (Conventional)
                              </option>
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

                {/* Organic Certification Status — shown early for organic farm workflows */}
                {chemicalType && (
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
                )}

                {/* Sprint 5: Aggregate Chemical Support - Summary Mode Toggle (Fertilizer, Fungicide & Pesticide) */}
                {(chemicalType === 'FE' || chemicalType === 'FU' || chemicalType === 'PE') && (
                  <Box
                    p={4}
                    bg={isSummaryMode ? 'blue.50' : 'gray.50'}
                    borderRadius="md"
                    border="1px solid"
                    borderColor={isSummaryMode ? 'blue.200' : 'gray.200'}
                    mb={4}
                  >
                    <HStack justify="space-between" align="center">
                      <Box flex={1}>
                        {isSummaryMode && (
                          <Badge colorScheme="blue" mb={2}>
                            Summary Mode
                          </Badge>
                        )}
                        <Text fontSize="sm" color="gray.600">
                          {isSummaryMode
                            ? `Log multiple ${
                                chemicalType === 'FE'
                                  ? 'fertilizer'
                                  : chemicalType === 'FU'
                                  ? 'fungicide'
                                  : 'pesticide'
                              } applications as one summary (e.g., "${
                                chemicalType === 'FE'
                                  ? '6 monthly'
                                  : chemicalType === 'FU'
                                  ? '12 bi-weekly'
                                  : '8 weekly'
                              } applications")`
                            : 'Toggle to log multiple applications at once'}
                        </Text>
                      </Box>
                      <Controller
                        name="is_summary"
                        control={methods.control}
                        render={({ field }) => (
                          <Switch
                            {...field}
                            isChecked={field.value === 'true'}
                            onChange={(e) => field.onChange(e.target.checked ? 'true' : 'false')}
                            colorScheme="blue"
                            size="lg"
                          />
                        )}
                      />
                    </HStack>

                    {/* Benefits of Summary Mode */}
                    {isSummaryMode && (
                      <Box mt={3} p={2} bg="blue.100" borderRadius="md">
                        <Text fontSize="xs" color="blue.700">
                          <Icon as={FaCheckCircle} mr={1} />
                          <strong>
                            {chemicalType === 'FE'
                              ? '95%'
                              : chemicalType === 'FU'
                              ? '87-93%'
                              : '90%'}{' '}
                            time savings:
                          </strong>{' '}
                          Log multiple applications with one entry while maintaining accurate carbon
                          calculations
                        </Text>
                      </Box>
                    )}
                  </Box>
                )}

                {/* Sprint 5: Aggregate Fertilizer Fields (shown when summary mode is active) */}
                {isSummaryMode && chemicalType === 'FE' && (
                  <Box
                    p={4}
                    bg="blue.50"
                    borderRadius="md"
                    border="1px solid"
                    borderColor="blue.200"
                    mb={4}
                  >
                    <Text fontWeight="semibold" color="blue.700" mb={4}>
                      <Icon as={FaCalculator} mr={2} />
                      Aggregate Application Period
                    </Text>

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
                      <StandardField
                        label="Period Start Date"
                        helpText="When did this application period begin?"
                        required
                      >
                        <Controller
                          name="date_start"
                          control={methods.control}
                          render={({ field }) => (
                            <Input {...field} type="date" size="md" bg="white" />
                          )}
                        />
                      </StandardField>

                      <StandardField
                        label="Period End Date"
                        helpText="When did this application period end?"
                        required
                      >
                        <Controller
                          name="date_end"
                          control={methods.control}
                          render={({ field }) => (
                            <Input {...field} type="date" size="md" bg="white" />
                          )}
                        />
                      </StandardField>
                    </SimpleGrid>

                    <StandardField
                      label="Number of Applications"
                      helpText="How many fertilizer applications occurred during this period?"
                      required
                    >
                      <Controller
                        name="event_count"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardInput
                            {...field}
                            type="number"
                            min="1"
                            placeholder="e.g., 6"
                            bg="white"
                          />
                        )}
                      />
                    </StandardField>

                    <Text fontWeight="semibold" color="blue.700" mt={6} mb={4}>
                      <Icon as={FaSeedling} mr={2} />
                      Total NPK Applied (for Carbon Calculation)
                    </Text>

                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={4}>
                      <StandardField
                        label="Total Nitrogen (kg)"
                        helpText="Combined N across all applications"
                        required
                      >
                        <Controller
                          name="nitrogen_total_kg"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              type="number"
                              step="0.1"
                              min="0"
                              placeholder="e.g., 120"
                              bg="white"
                            />
                          )}
                        />
                      </StandardField>

                      <StandardField
                        label="Total Phosphorus (kg)"
                        helpText="Combined P across all applications"
                      >
                        <Controller
                          name="phosphorus_total_kg"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              type="number"
                              step="0.1"
                              min="0"
                              placeholder="e.g., 60"
                              bg="white"
                            />
                          )}
                        />
                      </StandardField>

                      <StandardField
                        label="Total Potassium (kg)"
                        helpText="Combined K across all applications"
                      >
                        <Controller
                          name="potassium_total_kg"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              type="number"
                              step="0.1"
                              min="0"
                              placeholder="e.g., 60"
                              bg="white"
                            />
                          )}
                        />
                      </StandardField>
                    </SimpleGrid>

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <StandardField
                        label="Total Volume Applied"
                        helpText="Combined volume across all applications"
                      >
                        <HStack spacing={2}>
                          <Controller
                            name="volume_applied_total"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput
                                {...field}
                                flex={2}
                                type="number"
                                step="0.01"
                                placeholder="e.g., 1200"
                                bg="white"
                              />
                            )}
                          />
                          <Controller
                            name="volume_unit"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect {...field} flex={1} bg="white">
                                <option value="L">Liters</option>
                                <option value="gal">Gallons</option>
                                <option value="kg">Kilograms</option>
                              </StandardSelect>
                            )}
                          />
                        </HStack>
                      </StandardField>

                      <StandardField
                        label="Total Area Treated"
                        helpText="Combined area across all applications"
                      >
                        <HStack spacing={2}>
                          <Controller
                            name="area_treated_total"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput
                                {...field}
                                flex={2}
                                type="number"
                                step="0.01"
                                placeholder="e.g., 50"
                                bg="white"
                              />
                            )}
                          />
                          <Controller
                            name="area_unit"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect {...field} flex={1} bg="white">
                                <option value="ha">Hectares</option>
                                <option value="acres">Acres</option>
                              </StandardSelect>
                            )}
                          />
                        </HStack>
                      </StandardField>
                    </SimpleGrid>

                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mt={4}>
                      <StandardField
                        label="Equipment Fuel Type (optional)"
                        helpText="Fuel type used for application equipment"
                      >
                        <Controller
                          name="application_fuel_type"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect {...field} placeholder="Select fuel type..." bg="white">
                              {FUEL_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label} ({type.factor})
                                </option>
                              ))}
                            </StandardSelect>
                          )}
                        />
                      </StandardField>

                      <StandardField
                        label="Total Equipment Fuel"
                        helpText="Combined fuel across all applications"
                      >
                        <Controller
                          name="fuel_consumption_total"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              type="number"
                              step="0.1"
                              placeholder="e.g., 24"
                              bg="white"
                            />
                          )}
                        />
                      </StandardField>

                      <StandardField label="Fuel Unit">
                        <Controller
                          name="application_fuel_unit"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect {...field} bg="white">
                              <option value="gal">Gallons</option>
                              <option value="L">Liters</option>
                              <option value="kWh">Kilowatt-hours</option>
                            </StandardSelect>
                          )}
                        />
                      </StandardField>
                    </SimpleGrid>

                    {/* Carbon Calculation Preview */}
                    <Box
                      mt={4}
                      p={3}
                      bg="green.50"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="green.200"
                    >
                      <HStack spacing={2} mb={1}>
                        <Icon as={FaLeaf} color="green.500" fontSize="sm" />
                        <Text fontSize="sm" fontWeight="semibold" color="green.700">
                          Carbon Calculation Method
                        </Text>
                      </HStack>
                      <Text fontSize="xs" color="green.600">
                        Aggregate fertilizer carbon = (N × 10.5) + (P × 1.19) + (K × 0.65) + fuel
                        emissions
                        <br />
                        <strong>IPCC 2006 & EPA 40 CFR Part 98 verified emission factors</strong>
                      </Text>
                    </Box>
                  </Box>
                )}

                {/* Sprint 5: Aggregate Fungicide Fields (shown when summary mode is active for FU) */}
                {isSummaryMode && chemicalType === 'FU' && (
                  <Box
                    p={4}
                    bg="purple.50"
                    borderRadius="md"
                    border="1px solid"
                    borderColor="purple.200"
                    mb={4}
                  >
                    <Text fontWeight="semibold" color="purple.700" mb={4}>
                      <Icon as={FaCalculator} mr={2} />
                      Aggregate Application Period
                    </Text>

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
                      <StandardField
                        label="Period Start Date"
                        helpText="When did this application period begin?"
                        required
                      >
                        <Controller
                          name="date_start"
                          control={methods.control}
                          render={({ field }) => (
                            <Input {...field} type="date" size="md" bg="white" />
                          )}
                        />
                      </StandardField>

                      <StandardField
                        label="Period End Date"
                        helpText="When did this application period end?"
                        required
                      >
                        <Controller
                          name="date_end"
                          control={methods.control}
                          render={({ field }) => (
                            <Input {...field} type="date" size="md" bg="white" />
                          )}
                        />
                      </StandardField>
                    </SimpleGrid>

                    <StandardField
                      label="Number of Applications"
                      helpText="How many fungicide applications occurred during this period?"
                      required
                    >
                      <Controller
                        name="event_count"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardInput
                            {...field}
                            type="number"
                            min="1"
                            placeholder="e.g., 12"
                            bg="white"
                          />
                        )}
                      />
                    </StandardField>

                    <Text fontWeight="semibold" color="purple.700" mt={6} mb={4}>
                      <Icon as={FaFlask} mr={2} />
                      Active Ingredient Total (for Carbon Calculation)
                    </Text>

                    <StandardField
                      label="Total Active Ingredient (kg)"
                      helpText="Combined active ingredient across all applications - used for manufacturing emission calculation"
                      required
                    >
                      <Controller
                        name="active_ingredient_total_kg"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardInput
                            {...field}
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="e.g., 48"
                            bg="white"
                          />
                        )}
                      />
                    </StandardField>

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mt={4}>
                      <StandardField
                        label="Total Volume Applied"
                        helpText="Combined volume across all applications"
                      >
                        <HStack spacing={2}>
                          <Controller
                            name="volume_applied_total"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput
                                {...field}
                                flex={2}
                                type="number"
                                step="0.01"
                                placeholder="e.g., 600"
                                bg="white"
                              />
                            )}
                          />
                          <Controller
                            name="volume_unit"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect {...field} flex={1} bg="white">
                                <option value="L">Liters</option>
                                <option value="gal">Gallons</option>
                              </StandardSelect>
                            )}
                          />
                        </HStack>
                      </StandardField>

                      <StandardField
                        label="Total Area Treated"
                        helpText="Combined area across all applications"
                      >
                        <HStack spacing={2}>
                          <Controller
                            name="area_treated_total"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput
                                {...field}
                                flex={2}
                                type="number"
                                step="0.01"
                                placeholder="e.g., 50"
                                bg="white"
                              />
                            )}
                          />
                          <Controller
                            name="area_unit"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect {...field} flex={1} bg="white">
                                <option value="ha">Hectares</option>
                                <option value="acres">Acres</option>
                              </StandardSelect>
                            )}
                          />
                        </HStack>
                      </StandardField>
                    </SimpleGrid>

                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mt={4}>
                      <StandardField
                        label="Equipment Fuel Type (optional)"
                        helpText="Fuel type used for spraying equipment"
                      >
                        <Controller
                          name="application_fuel_type"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect {...field} placeholder="Select fuel type..." bg="white">
                              {FUEL_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label} ({type.factor})
                                </option>
                              ))}
                            </StandardSelect>
                          )}
                        />
                      </StandardField>

                      <StandardField
                        label="Total Equipment Fuel"
                        helpText="Combined fuel across all applications"
                      >
                        <Controller
                          name="fuel_consumption_total"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              type="number"
                              step="0.1"
                              placeholder="e.g., 24"
                              bg="white"
                            />
                          )}
                        />
                      </StandardField>

                      <StandardField label="Fuel Unit">
                        <Controller
                          name="application_fuel_unit"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect {...field} bg="white">
                              <option value="gal">Gallons</option>
                              <option value="L">Liters</option>
                              <option value="kWh">Kilowatt-hours</option>
                            </StandardSelect>
                          )}
                        />
                      </StandardField>
                    </SimpleGrid>

                    {/* Carbon Calculation Preview for Fungicide */}
                    <Box
                      mt={4}
                      p={3}
                      bg="green.50"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="green.200"
                    >
                      <HStack spacing={2} mb={1}>
                        <Icon as={FaLeaf} color="green.500" fontSize="sm" />
                        <Text fontSize="sm" fontWeight="semibold" color="green.700">
                          Carbon Calculation Method
                        </Text>
                      </HStack>
                      <Text fontSize="xs" color="green.600">
                        Aggregate fungicide carbon = (Active Ingredient kg × emission factor) + fuel
                        emissions
                        <br />
                        <strong>Emission factors:</strong> Copper: 5.5, Sulfur: 1.8, Biological:
                        2.0, Synthetic: 4.5 kg CO₂e/kg
                        <br />
                        <strong>Source: Lal 2004, Audsley et al.</strong>
                      </Text>
                    </Box>
                  </Box>
                )}

                {/* Sprint 5: Aggregate Pesticide Fields (shown when summary mode is active for PE) */}
                {isSummaryMode && chemicalType === 'PE' && (
                  <Box
                    p={4}
                    bg="orange.50"
                    borderRadius="md"
                    border="1px solid"
                    borderColor="orange.200"
                    mb={4}
                  >
                    <Text fontWeight="semibold" color="orange.700" mb={4}>
                      <Icon as={FaCalculator} mr={2} />
                      Aggregate Application Period
                    </Text>

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
                      <StandardField
                        label="Period Start Date"
                        helpText="When did this application period begin?"
                        required
                      >
                        <Controller
                          name="date_start"
                          control={methods.control}
                          render={({ field }) => (
                            <Input {...field} type="date" size="md" bg="white" />
                          )}
                        />
                      </StandardField>

                      <StandardField
                        label="Period End Date"
                        helpText="When did this application period end?"
                        required
                      >
                        <Controller
                          name="date_end"
                          control={methods.control}
                          render={({ field }) => (
                            <Input {...field} type="date" size="md" bg="white" />
                          )}
                        />
                      </StandardField>
                    </SimpleGrid>

                    <StandardField
                      label="Number of Applications"
                      helpText="Total pesticide applications in this period"
                      required
                    >
                      <Controller
                        name="event_count"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardInput {...field} type="number" placeholder="e.g., 8" min="1" />
                        )}
                      />
                    </StandardField>

                    <Divider my={4} />

                    <Text fontWeight="semibold" color="orange.700" mb={3}>
                      <Icon as={FaFlask} mr={2} />
                      Pesticide Totals for Carbon Calculation
                    </Text>

                    <StandardField
                      label="Total Active Ingredient (kg)"
                      helpText="Combined active ingredient across all applications"
                      required
                    >
                      <Controller
                        name="active_ingredient_total_kg"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardInput
                            {...field}
                            type="number"
                            step="0.01"
                            placeholder="e.g., 12.5"
                          />
                        )}
                      />
                    </StandardField>

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
                      <StandardField
                        label="Total Volume Applied"
                        helpText="Combined volume across all applications"
                      >
                        <Controller
                          name="volume_applied_total"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              type="number"
                              step="0.01"
                              placeholder="e.g., 2400"
                            />
                          )}
                        />
                      </StandardField>

                      <StandardField
                        label="Total Area Treated"
                        helpText="Combined area across all applications"
                      >
                        <Controller
                          name="area_treated_total"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              type="number"
                              step="0.01"
                              placeholder="e.g., 80"
                            />
                          )}
                        />
                      </StandardField>
                    </SimpleGrid>

                    <Divider my={4} />

                    <Text fontWeight="semibold" color="orange.700" mb={3}>
                      <Icon as={FaTractor} mr={2} />
                      Equipment Fuel Usage
                    </Text>

                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                      <StandardField
                        label="Equipment Fuel Type"
                        helpText="Fuel type used for application equipment"
                      >
                        <Controller
                          name="application_fuel_type"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect {...field} placeholder="Select fuel type...">
                              {FUEL_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label} ({type.factor})
                                </option>
                              ))}
                            </StandardSelect>
                          )}
                        />
                      </StandardField>

                      <StandardField
                        label="Total Fuel Consumed"
                        helpText="Combined fuel for all application equipment"
                      >
                        <Controller
                          name="fuel_consumption_total"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              type="number"
                              step="0.01"
                              placeholder="e.g., 18"
                            />
                          )}
                        />
                      </StandardField>

                      <StandardField label="Fuel Unit">
                        <Controller
                          name="application_fuel_unit"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect {...field}>
                              <option value="gal">Gallons (gal)</option>
                              <option value="L">Liters (L)</option>
                              <option value="kWh">Kilowatt-hours (kWh)</option>
                            </StandardSelect>
                          )}
                        />
                      </StandardField>
                    </SimpleGrid>

                    {/* Carbon Calculation Preview */}
                    <Box
                      mt={4}
                      p={3}
                      bg="green.50"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="green.200"
                    >
                      <HStack spacing={2} mb={1}>
                        <Icon as={FaLeaf} color="green.500" fontSize="sm" />
                        <Text fontSize="sm" fontWeight="semibold" color="green.700">
                          Carbon Calculation Method
                        </Text>
                      </HStack>
                      <Text fontSize="xs" color="green.600">
                        Aggregate pesticide carbon = (Active Ingredient kg × 8.8) + fuel emissions
                        <br />
                        <strong>
                          EPA 40 CFR Part 98: Diesel 10.21 kg CO₂e/gal | Pesticide: 8.8 kg CO₂e/kg
                          AI
                        </strong>
                        <br />
                        <strong>Source: Lal 2004, Audsley et al.</strong>
                      </Text>
                    </Box>
                  </Box>
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
                {/* Sprint 5: Hide individual quantity fields when in Summary Mode - aggregate fields replace them */}
                {!isSummaryMode && (
                  <>
                    {/* Phase 3: volume_numeric is the primary numeric field; volume_applied kept for backward compat */}
                    <HStack spacing={4} align="top">
                      <StandardField
                        label={intl.formatMessage({ id: 'app.volumeApplied', defaultMessage: 'Volume Applied' })}
                        required
                        error={errors.volume_numeric?.message}
                        helpText={intl.formatMessage({ id: 'app.volumeAppliedHelp', defaultMessage: 'Total volume of product applied' })}
                        flex={2}
                      >
                        <Controller
                          name="volume_numeric"
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

                      <StandardField
                        label={intl.formatMessage({ id: 'app.volumeUnit', defaultMessage: 'Unit' })}
                        flex={1}
                        mt="0px"
                      >
                        <Controller
                          name="volume_unit"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect {...field} bg="white">
                              <option value="L">{intl.formatMessage({ id: 'app.unit.liters', defaultMessage: 'Liters (L)' })}</option>
                              <option value="gal">{intl.formatMessage({ id: 'app.unit.gallons', defaultMessage: 'Gallons (gal)' })}</option>
                              <option value="mL">{intl.formatMessage({ id: 'app.unit.milliliters', defaultMessage: 'Milliliters (mL)' })}</option>
                              <option value="oz">{intl.formatMessage({ id: 'app.unit.fluidOunces', defaultMessage: 'Fluid Ounces (oz)' })}</option>
                              <option value="kg">{intl.formatMessage({ id: 'app.unit.kilograms', defaultMessage: 'Kilograms (kg)' })}</option>
                              <option value="lbs">{intl.formatMessage({ id: 'app.unit.pounds', defaultMessage: 'Pounds (lbs)' })}</option>
                            </StandardSelect>
                          )}
                        />
                      </StandardField>
                    </HStack>

                    {/* Phase 3: area_numeric is the primary numeric field; area_treated kept for backward compat */}
                    <HStack spacing={4} align="top">
                      <StandardField
                        label={intl.formatMessage({ id: 'app.areaTreated', defaultMessage: 'Area Treated' })}
                        required
                        error={errors.area_numeric?.message}
                        helpText={intl.formatMessage({ id: 'app.areaTreatedHelp', defaultMessage: 'Area coverage for accurate carbon calculation' })}
                        flex={2}
                      >
                        <Controller
                          name="area_numeric"
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

                      <StandardField
                        label={intl.formatMessage({ id: 'app.areaUnit', defaultMessage: 'Unit' })}
                        flex={1}
                        mt="0px"
                      >
                        <Controller
                          name="area_unit"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect {...field} bg="white">
                              <option value="ha">{intl.formatMessage({ id: 'app.unit.hectares', defaultMessage: 'Hectares (ha)' })}</option>
                              <option value="acres">{intl.formatMessage({ id: 'app.unit.acres', defaultMessage: 'Acres' })}</option>
                              <option value="m2">{intl.formatMessage({ id: 'app.unit.squareMeters', defaultMessage: 'Square meters (m²)' })}</option>
                            </StandardSelect>
                          )}
                        />
                      </StandardField>
                    </HStack>

                    {/* Phase 3: Fertigation toggle — shown only for Fertilizer (FE) subtype */}
                    {chemicalType === 'FE' && (
                      <Box
                        p={3}
                        bg="teal.50"
                        borderRadius="md"
                        border="1px solid"
                        borderColor="teal.200"
                      >
                        <HStack justify="space-between" align="center">
                          <VStack align="start" spacing={0} flex={1}>
                            <Text fontSize="sm" fontWeight="semibold" color="teal.800">
                              {intl.formatMessage({ id: 'app.fertigation', defaultMessage: 'Fertigation' })}
                            </Text>
                            <Text fontSize="xs" color="teal.600">
                              {intl.formatMessage({ id: 'app.fertigationHelp', defaultMessage: 'Fertilizer injected through irrigation system' })}
                            </Text>
                            <Text fontSize="xs" color="teal.500" mt={1}>
                              {intl.formatMessage({ id: 'app.fertigationCarbonNote', defaultMessage: 'When enabled, application fuel is excluded from carbon calculations to avoid double-counting with irrigation events.' })}
                            </Text>
                          </VStack>
                          <Controller
                            name="is_fertigation"
                            control={methods.control}
                            render={({ field }) => (
                              <Switch
                                isChecked={field.value === 'true'}
                                onChange={(e) => field.onChange(e.target.checked ? 'true' : 'false')}
                                colorScheme="teal"
                                size="lg"
                              />
                            )}
                          />
                        </HStack>
                      </Box>
                    )}

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
                  </>
                )}

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
                            <option value="ground_spray">
                              🌊 Ground Spray - Spray application
                            </option>
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
                        <option value="overcast_humid">🌥️ Overcast & Humid - Good for herbicides</option>
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
                        <option value="post_harvest">🌾 Post-Harvest</option>
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

            {/* Section 4: Application Equipment & Fuel Usage - Phase 3 Electric Equipment Support */}
            {/* Hidden in Summary Mode - aggregate fuel fields are shown in the summary sections instead */}
            {!isSummaryMode && (
            <SectionBox variant="highlighted">
              <SectionHeader
                icon={FaBolt}
                iconColor="blue.600"
                title="Application Equipment & Fuel Usage"
                badge="Enhanced Carbon Accuracy"
                badgeColorScheme="blue"
                description="Document your sprayer, spreader, or other application equipment fuel consumption for accurate carbon calculations. Electric equipment has significantly lower carbon impact than diesel."
              />

              <VStack spacing={4} align="stretch">
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  {/* Phase 3: Application Fuel Type Selector */}
                  <StandardField
                    label="Application Equipment Fuel Type"
                    helpText="Fuel type used for spraying or spreading equipment"
                  >
                    <Controller
                      name="application_fuel_type"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardSelect {...field} placeholder="Select fuel type...">
                          {FUEL_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label} ({type.factor})
                            </option>
                          ))}
                        </StandardSelect>
                      )}
                    />
                  </StandardField>

                  <StandardField
                    label={
                      watch('application_fuel_type') === 'electric'
                        ? 'Energy Amount (kWh)'
                        : 'Fuel Consumed'
                    }
                    helpText={
                      watch('application_fuel_type') === 'electric'
                        ? 'Energy consumption for carbon emission calculation'
                        : 'Fuel consumed during application'
                    }
                  >
                    <HStack spacing={2}>
                      <Controller
                        name="application_fuel_consumed"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardInput
                            {...field}
                            flex={2}
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder={
                              watch('application_fuel_type') === 'electric'
                                ? 'e.g., 5 kWh'
                                : 'e.g., 2.5'
                            }
                          />
                        )}
                      />
                      <Controller
                        name="application_fuel_unit"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardSelect flex={1} {...field}>
                            <option value="L">Liters</option>
                            <option value="gal">Gallons</option>
                            <option value="kg">Kilograms</option>
                            <option value="kWh">Kilowatt-hours</option>
                          </StandardSelect>
                        )}
                      />
                    </HStack>
                  </StandardField>
                </SimpleGrid>

                {/* Phase 3: Electric Equipment Info Box */}
                {watch('application_fuel_type') === 'electric' && (
                  <Box
                    p={3}
                    bg="blue.50"
                    borderRadius="md"
                    border="1px solid"
                    borderColor="blue.200"
                  >
                    <Text fontSize="sm" color="blue.700">
                      <Icon as={FaBolt} mr={2} color="blue.600" />
                      <Text as="span" fontWeight="semibold">
                        Electric Equipment:
                      </Text>{' '}
                      Enter energy consumption in kilowatt-hours (kWh). Grid electricity uses 0.39
                      kg CO₂/kWh. Solar/wind powered equipment has zero emissions.
                    </Text>
                  </Box>
                )}

                <Box
                  bg="blue.50"
                  p={3}
                  borderRadius="md"
                  borderLeft="4px"
                  borderLeftColor="blue.400"
                  mt={2}
                >
                  <HStack spacing={2} mb={1}>
                    <Icon as={FaFlask} color="blue.500" fontSize="sm" />
                    <Text fontSize="sm" fontWeight="semibold" color="blue.700">
                      Application Carbon Tracking
                    </Text>
                  </HStack>
                  <Text fontSize="xs" color="blue.600">
                    Application equipment fuel (sprayers, spreaders, etc.) contributes significantly
                    to chemical operation carbon footprint. Documenting actual fuel usage provides
                    consumers with complete transparency into your chemical application practices.
                  </Text>
                </Box>
              </VStack>
            </SectionBox>
            )}

            {/* Section 5: EPA Worker Protection Standard (WPS) Compliance - 40 CFR 170.309 */}
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

            {/* Phase 2: Universal Field Details - variety, block_id, growth_stage */}
            <SectionBox variant="default">
              <SectionHeader
                icon={FaSeedling}
                iconColor="teal.500"
                title={intl.formatMessage({ id: 'fieldDetails.title' })}
                badge={intl.formatMessage({ id: 'fieldDetails.badge' })}
                badgeColorScheme="teal"
                description={intl.formatMessage({ id: 'fieldDetails.description' })}
              />
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <StandardField
                  label={intl.formatMessage({ id: 'fieldDetails.variety' })}
                  helpText={intl.formatMessage({ id: 'fieldDetails.varietyHelp' })}
                >
                  <Controller
                    name="variety"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardInput {...field} placeholder={intl.formatMessage({ id: 'fieldDetails.varietyPlaceholder' })} />
                    )}
                  />
                </StandardField>

                <StandardField
                  label={intl.formatMessage({ id: 'fieldDetails.blockId' })}
                  helpText={intl.formatMessage({ id: 'fieldDetails.blockIdHelp' })}
                >
                  <Controller
                    name="block_id"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardInput {...field} placeholder={intl.formatMessage({ id: 'fieldDetails.blockIdPlaceholder' })} />
                    )}
                  />
                </StandardField>

                <StandardField
                  label={intl.formatMessage({ id: 'fieldDetails.growthStage' })}
                  helpText={intl.formatMessage({ id: 'fieldDetails.growthStageHelp' })}
                >
                  <Controller
                    name="growth_stage"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardSelect {...field} placeholder="Select growth stage...">
                        <option value="dormant">{intl.formatMessage({ id: 'fieldDetails.growthStage.dormant' })}</option>
                        <option value="budbreak">{intl.formatMessage({ id: 'fieldDetails.growthStage.budbreak' })}</option>
                        <option value="bloom">{intl.formatMessage({ id: 'fieldDetails.growthStage.bloom' })}</option>
                        <option value="fruit_set">{intl.formatMessage({ id: 'fieldDetails.growthStage.fruit_set' })}</option>
                        <option value="vegetative">{intl.formatMessage({ id: 'fieldDetails.growthStage.vegetative' })}</option>
                        <option value="maturation">{intl.formatMessage({ id: 'fieldDetails.growthStage.maturation' })}</option>
                        <option value="harvest_ready">{intl.formatMessage({ id: 'fieldDetails.growthStage.harvest_ready' })}</option>
                        <option value="post_harvest">{intl.formatMessage({ id: 'fieldDetails.growthStage.post_harvest' })}</option>
                      </StandardSelect>
                    )}
                  />
                </StandardField>
              </SimpleGrid>
            </SectionBox>

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

            {/* Phase 2.3: Custom Fields Section */}
            <CustomFieldsForm
              customFields={customFields}
              onCustomFieldsChange={setCustomFields}
              eventTypeId={2}
              disabled={false}
            />

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
  }
);

// Add display name for better debugging
ChemicalTab.displayName = 'ChemicalTab';

export default ChemicalTab;
