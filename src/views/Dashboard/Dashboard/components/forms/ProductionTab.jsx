// ENHANCED PRODUCTION TAB - CARBON CALCULATION OPTIMIZED
// Focuses on production data critical for carbon footprint calculations
// Sprint 2 Epic 2.1: Equipment Maintenance merged as subtype (EQ)

import {
  HStack,
  Box,
  VStack,
  Text,
  Icon,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useColorModeValue,
  SimpleGrid,
  Switch,
  Badge,
  Input
} from '@chakra-ui/react';
import {
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
  FaSeedling,
  FaBalanceScale,
  FaTruck,
  FaTools,
  FaBolt,
  FaShieldAlt
} from 'react-icons/fa';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { object, string, array } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIntl } from 'react-intl';
import CustomFieldsForm from './CustomFieldsForm';
// Event Field Registry (Phase 5G — form integration)
import { useFormFields } from 'src/hooks/useFormFields';
import { RegistryFormField } from 'src/components/Forms/RegistryFormField';
import { RegistryFormSections } from 'src/components/Forms/RegistryFormSections';

// Forms keep their rich hand-crafted rendering. Registry drives display surfaces only.
const USE_FIELD_REGISTRY = false;

// Sprint 2 Epic 2.1: Equipment operation types (merged from EquipmentTab)
const EQUIPMENT_OPERATION_TYPES = [
  { value: 'FC', label: '⛽ Fuel Consumption - Regular operation' },
  { value: 'MN', label: '🔧 Maintenance - Routine maintenance' },
  { value: 'RE', label: '🔩 Repair - Equipment repair' },
  { value: 'CA', label: '📐 Calibration - Equipment calibration' },
  { value: 'BD', label: '⚠️ Breakdown - Equipment failure' },
  { value: 'EI', label: '🔍 Inspection - Equipment inspection' },
  { value: 'CL', label: '🧹 Cleaning - Equipment cleaning (NOP 205.272)' }
];

// Sprint 2 Epic 2.1: Equipment types (merged from EquipmentTab)
const EQUIPMENT_TYPES = [
  { value: 'tractor', label: '🚜 Tractor' },
  { value: 'harvester', label: '🌾 Harvester/Combine' },
  { value: 'sprayer', label: '💨 Sprayer' },
  { value: 'truck', label: '🚛 Truck/Transport' },
  { value: 'generator', label: '⚡ Generator' },
  { value: 'pump', label: '💧 Irrigation Pump' },
  { value: 'other', label: '🔧 Other Equipment' }
];

// Sprint 2 Epic 2.1: Fuel types with EPA-verified emission factors (merged from EquipmentTab)
// UPDATED 2026-02-15: All factors corrected to match EPA 40 CFR Part 98 Table C-1
// Key 'lpg' standardized to 'propane' to match backend choices.py SSOT
const FUEL_TYPES = [
  { value: 'diesel', label: '⛽ Diesel', factor: '2.70 kg CO₂e/L' },
  { value: 'gasoline', label: '⛽ Gasoline', factor: '2.32 kg CO₂e/L' },
  { value: 'natural_gas', label: '💨 Natural Gas', factor: '1.92 kg CO₂e/m³' },
  { value: 'propane', label: '🔥 LPG / Propane', factor: '1.51 kg CO₂e/L' },
  { value: 'electric', label: '⚡ Electric', factor: '0.39 kg CO₂e/kWh' },
  { value: 'biodiesel', label: '🌿 Biodiesel', factor: '2.31 kg CO₂e/L' },
  { value: 'none', label: '🔧 No Fuel / Manual', factor: '0 kg CO₂e' }
];

// Sprint 2: Production type display names for auto-generated event names
// Removes farmer burden of manually typing event names (~20 sec saved per event)
// CRITICAL FIX (2025-01-21): Changed EQ → EM to match backend Production event model
// Phase 2: Added PO (Pollination), PH (Post-Harvest Processing), CM (Canopy Management)
const PRODUCTION_TYPE_NAMES = {
  PL: 'Planting',
  HA: 'Harvesting',
  IR: 'Irrigation',
  PR: 'Pruning/Trimming',
  TR: 'Transplanting',
  CU: 'Cultivation',
  TH: 'Thinning',
  EM: 'Equipment Maintenance', // ✅ FIXED: Was EQ, now EM (Production subtype)
  PO: 'Pollination',
  PH: 'Post-Harvest Processing',
  CM: 'Canopy Management',
  // Batch 3 (2026-06): Scope-1 fuel ops that had no structured home before.
  FP: 'Frost Protection',
  MO: 'Mowing / Orchard-Floor'
};

// ENHANCED SCHEMA - Carbon calculation focused with Phase 1.3 validation
// Sprint 2 Epic 2.1: Added equipment fields, made area_covered optional for EM type
// Sprint 2: Event name is now auto-generated from production type (removes farmer burden)
// CRITICAL FIX (2025-01-21): Changed EQ → EM to match backend Production event model
const formSchemaMainInfo = object({
  type: string().min(1, 'Production type is required'),
  name: string().optional(), // Auto-generated from production type - no manual input needed
  // Sprint 2 Epic 2.1: Area is optional for Equipment Maintenance (EM) type
  area_covered: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, 'Area covered cannot be negative'),
  area_unit: string().optional(),
  yield_quantity: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, 'Yield quantity cannot be negative'),
  yield_unit: string().optional(),
  fuel_consumed: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, 'Fuel consumed cannot be negative'),
  fuel_unit: string().optional(),
  // Sprint 2 Epic 2.1: Fuel type for EPA-verified emission factors (merged from Equipment)
  fuel_type: string().optional(),
  equipment_hours: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, 'Equipment hours cannot be negative'),
  // Sprint 2 Epic 2.1: Equipment-specific fields (merged from EquipmentTab)
  equipment_type: string().optional(),
  equipment_operation_type: string().optional(),
  operation_efficiency: string().optional(),
  transportation_distance: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, 'Transportation distance cannot be negative'),
  transportation_unit: string().optional(),
  production_efficiency: string().optional(),
  // NOP Compliance: Equipment Cleaning Logs (7 CFR 205.272) — EM subtype
  cleaning_date: string().optional(),
  cleaning_method: string().optional(),
  cleaning_materials_used: string().optional(),
  cleaned_by: string().optional(),
  shared_with_conventional: string().optional(),
  cleaning_protocol_reference: string().optional(),
  // NOP Compliance: Post-Harvest Sanitizer (7 CFR 205.272 + § 205.605)
  sanitizer_name: string().optional(),
  sanitizer_ppm: string().optional(),
  rinse_step_documented: string().optional(),
  sanitizer_nop_reference: string().optional(),
  // Phase 2: Target market fields for harvest events
  harvest_quality_grade: string().optional(),
  grain_moisture: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 100;
    }, 'Grain moisture must be between 0 and 100%'),
  // Phase 2: Additional harvest fields for Quick Add parity
  harvest_method: string().optional(),
  brix_levels: string().optional(),
  // Production method for manual-operation detection (enables accurate carbon for hand labor)
  // Documenting "Hand thinning", "Pruning shears", etc. routes to ~5 kg manual estimate
  // instead of USDA blanket mechanical averages (~150 kg for thinning, ~600 kg for pruning).
  production_method: string().optional(),
  observation: string().optional(),
  // Sprint 3 Epic 3.2: Consumer Trust Fields for transparency
  seeds_source: string().optional(), // Where seeds/seedlings came from
  // NOP 7 CFR 205.204 — Seed Traceability (planting subtype)
  seed_supplier_name: string().optional(),
  seed_purchase_date: string().optional(),
  seed_purchase_invoice: string().optional(),
  seed_lot_number: string().optional(),
  seed_certification_status: string().optional(),
  seed_treatment: string().optional(),
  water_source: string().optional(), // Water source for irrigation
  // ENHANCED: USDA NASS 2023 irrigation water estimation fields
  irrigation_method: string().optional(), // drip, sprinkler, flood, etc.
  // Phase 3: Irrigation pump fields for accurate electricity emission calculation
  pump_depth_ft: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, 'Pump depth cannot be negative'),
  electricity_source: string().optional(), // grid, solar, wind, diesel_generator, mixed
  irrigation_depth: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, 'Irrigation depth cannot be negative'),
  irrigation_depth_unit: string().optional(), // inches, cm
  // Sprint 4: Aggregate Irrigation Support - log multiple irrigations as one summary
  // Reduces logging burden by 85% (Indigo Agriculture research)
  is_summary: string().optional(), // "true" or "false" as string for form compatibility
  date_start: string().optional(), // ISO date string for aggregate start
  date_end: string().optional(), // ISO date string for aggregate end
  event_count: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 1;
    }, 'Number of irrigations must be at least 1'),
  water_volume_total: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, 'Total water volume must be greater than 0'),
  water_volume_unit: string().optional(), // gallons, liters, acre_feet, cubic_meters
  // Sprint 5: Aggregate Harvest Support - log multiple harvests as one summary
  yield_total: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, 'Total yield must be greater than 0'),
  yield_total_unit: string().optional(), // lbs, kg, tons, boxes
  // Phase 2: Universal CommonEvent fields (variety, block_id, growth_stage)
  variety: string().optional(), // Crop variety/cultivar (e.g., Nonpareil, Hass)
  block_id: string().optional(), // Block or section identifier (e.g., Block A, North Orchard)
  growth_stage: string().optional(), // Phenological stage at time of event
  // Phase 2: Harvest-specific brix level
  brix_level: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 100;
    }, 'Brix level must be between 0 and 100'),
  // Phase 2: Pollination (PO) specific extra_data fields
  pollinator_type: string().optional(),
  hive_count: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 0;
    }, 'Hive count cannot be negative'),
  placement_date: string().optional(),
  removal_date: string().optional(),
  // Phase 2: Post-Harvest Processing (PH) specific extra_data fields
  processing_type: string().optional(),
  processing_duration_hours: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, 'Processing duration cannot be negative'),
  temperature_control: string().optional(),
  // Phase 2: Canopy Management (CM) specific extra_data fields
  canopy_operation: string().optional(),
  pass_number: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 1;
    }, 'Pass number must be at least 1'),
  // Batch 3 (2026-06): Frost Protection (FP) + Mowing (MO) specific extra_data fields
  protection_method: string().optional(), // FP: wind_machine / orchard_heater / under_tree_sprinkler
  low_temperature: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      return !isNaN(parseFloat(val));
    }, 'Low temperature must be a number'),
  floor_management_type: string().optional(), // MO: mow / mulch / cover_crop_mgmt / herbicide_strip
  // Phase 2: Pruning Summary Mode (mirrors IR and HA summary pattern)
  pruning_passes: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 1;
    }, 'Number of pruning passes must be at least 1'),
  // Phase 2.3: Custom fields for additional farmer-created information
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
  ).optional()
});

const ProductionTab = forwardRef(
  ({ onSubmitHandler, onDataChange, onPrev, initialValues = {}, hideActions = false }, ref) => {
    const intl = useIntl();
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const [customFields, setCustomFields] = useState(initialValues.custom_fields || []);

    const methods = useForm({
      resolver: zodResolver(formSchemaMainInfo),
      defaultValues: {
        type: initialValues.type || 'PL',
        // Sprint 2: Auto-generate name from type - fallback to initial name if provided
        name: initialValues.name || PRODUCTION_TYPE_NAMES[initialValues.type || 'PL'] || '',
        area_covered: initialValues.area_covered?.toString() || '',
        area_unit: initialValues.area_unit || 'acres',
        yield_quantity: initialValues.yield_quantity?.toString() || '',
        yield_unit: initialValues.yield_unit || 'kg',
        fuel_consumed: initialValues.fuel_consumed?.toString() || '',
        fuel_unit: initialValues.fuel_unit || 'L',
        // Sprint 2 Epic 2.1: Fuel type for Equipment Maintenance
        fuel_type: initialValues.fuel_type || '',
        equipment_hours: initialValues.equipment_hours?.toString() || '',
        // Sprint 2 Epic 2.1: Equipment-specific fields (merged from EquipmentTab)
        equipment_type: initialValues.equipment_type || '',
        equipment_operation_type: initialValues.equipment_operation_type || '',
        operation_efficiency:
          initialValues.operation_efficiency || initialValues.production_efficiency || 'normal',
        transportation_distance: initialValues.transportation_distance?.toString() || '',
        transportation_unit: initialValues.transportation_unit || 'km',
        production_efficiency: initialValues.production_efficiency || 'normal',
        // Phase 2: Target market fields
        harvest_quality_grade: initialValues.harvest_quality_grade || '',
        grain_moisture: initialValues.grain_moisture?.toString() || '',
        harvest_method: initialValues.harvest_method || '',
        brix_levels: initialValues.brix_levels || '',
        // Production method: supports both top-level and extra_data.method
        // (demo data stores it in extra_data.method, e.g. "Hand thinning with pruning shears")
        production_method:
          initialValues.production_method ||
          initialValues.method ||
          initialValues.extra_data?.method ||
          '',
        observation: initialValues.observation || '',
        // Sprint 3 Epic 3.2: Consumer Trust Fields
        seeds_source: initialValues.seeds_source || '',
        // NOP 7 CFR 205.204 — Seed Traceability (planting subtype)
        seed_supplier_name: initialValues.seed_supplier_name || '',
        seed_purchase_date: initialValues.seed_purchase_date || '',
        seed_purchase_invoice: initialValues.seed_purchase_invoice || '',
        seed_lot_number: initialValues.seed_lot_number || '',
        seed_certification_status: initialValues.seed_certification_status || '',
        seed_treatment: initialValues.seed_treatment || '',
        water_source: initialValues.water_source || '',
        // ENHANCED: USDA NASS 2023 irrigation water estimation fields
        irrigation_method: initialValues.irrigation_method || '',
        // Phase 3: Irrigation pump fields
        pump_depth_ft: initialValues.pump_depth_ft?.toString() || '',
        electricity_source: initialValues.electricity_source || '',
        irrigation_depth: initialValues.irrigation_depth?.toString() || '',
        irrigation_depth_unit: initialValues.irrigation_depth_unit || 'inches',
        // Sprint 4: Aggregate Irrigation Support
        // FIX: Use strict comparison — string "false" is truthy in JS!
        is_summary:
          initialValues.is_summary === 'true' || initialValues.is_summary === true
            ? 'true'
            : 'false',
        date_start: initialValues.date_start || '',
        date_end: initialValues.date_end || '',
        event_count: initialValues.event_count?.toString() || '',
        water_volume_total: initialValues.water_volume_total?.toString() || '',
        water_volume_unit: initialValues.water_volume_unit || 'gallons',
        // Sprint 5: Aggregate Harvest Support
        yield_total: initialValues.yield_total?.toString() || '',
        yield_total_unit: initialValues.yield_total_unit || 'lbs',
        // Phase 2: Universal CommonEvent fields
        variety: initialValues.variety || '',
        block_id: initialValues.block_id || '',
        growth_stage: initialValues.growth_stage || '',
        // Phase 2: Harvest brix level
        brix_level: initialValues.brix_level?.toString() || '',
        // Phase 2: Pollination (PO) fields
        pollinator_type: initialValues.pollinator_type || '',
        hive_count: initialValues.hive_count?.toString() || '',
        placement_date: initialValues.placement_date || '',
        removal_date: initialValues.removal_date || '',
        // Phase 2: Post-Harvest Processing (PH) fields
        processing_type: initialValues.processing_type || '',
        processing_duration_hours: initialValues.processing_duration_hours?.toString() || '',
        temperature_control: initialValues.temperature_control || 'false',
        // Phase 2: Canopy Management (CM) fields
        canopy_operation:
          initialValues.canopy_operation || initialValues.extra_data?.canopy_operation || '',
        pass_number:
          (initialValues.pass_number ?? initialValues.extra_data?.pass_number)?.toString() || '',
        // Batch 3 (2026-06): Frost Protection (FP) + Mowing (MO) fields
        protection_method:
          initialValues.protection_method || initialValues.extra_data?.protection_method || '',
        low_temperature:
          (
            initialValues.low_temperature ?? initialValues.extra_data?.low_temperature
          )?.toString() || '',
        floor_management_type:
          initialValues.floor_management_type ||
          initialValues.extra_data?.floor_management_type ||
          '',
        // Phase 2: Pruning Summary Mode
        pruning_passes: initialValues.pruning_passes?.toString() || '',
        // NOP Compliance: Equipment Cleaning Logs (7 CFR 205.272)
        cleaning_date: initialValues.cleaning_date || '',
        cleaning_method: initialValues.cleaning_method || '',
        cleaning_materials_used: initialValues.cleaning_materials_used || '',
        cleaned_by: initialValues.cleaned_by || '',
        shared_with_conventional: initialValues.shared_with_conventional ? 'true' : 'false',
        cleaning_protocol_reference: initialValues.cleaning_protocol_reference || '',
        // NOP Compliance: Post-Harvest Sanitizer (7 CFR 205.272 + § 205.605)
        sanitizer_name: initialValues.sanitizer_name || '',
        sanitizer_ppm: initialValues.sanitizer_ppm ? String(initialValues.sanitizer_ppm) : '',
        rinse_step_documented: initialValues.rinse_step_documented ? 'true' : 'false',
        sanitizer_nop_reference: initialValues.sanitizer_nop_reference || '',
        // Phase 2.3: Custom fields initialization
        custom_fields: initialValues.custom_fields || []
      }
    });

    // Ref to always hold the latest submit handler, avoiding stale closures in useImperativeHandle
    const submitHandlerRef = useRef(null);

    // Expose flushData and submitForm methods to parent via ref
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [onDataChange]
    );

    // Update form values when initialValues change
    useEffect(() => {
      // Better condition check: ensure we have actual form data, not just an empty object
      if (
        initialValues &&
        (Object.keys(initialValues).length > 2 || initialValues.name || initialValues.area_covered)
      ) {
        const resetData = {
          type: initialValues.type || 'PL',
          // Sprint 2: Auto-generate name from type - fallback to initial name if provided
          name: initialValues.name || PRODUCTION_TYPE_NAMES[initialValues.type || 'PL'] || '',
          area_covered: initialValues.area_covered?.toString() || '',
          area_unit: initialValues.area_unit || 'acres',
          yield_quantity: initialValues.yield_quantity?.toString() || '',
          yield_unit: initialValues.yield_unit || 'kg',
          fuel_consumed: initialValues.fuel_consumed?.toString() || '',
          fuel_unit: initialValues.fuel_unit || 'L',
          // Sprint 2 Epic 2.1: Fuel type for Equipment Maintenance
          fuel_type: initialValues.fuel_type || '',
          equipment_hours: initialValues.equipment_hours?.toString() || '',
          // Sprint 2 Epic 2.1: Equipment-specific fields (merged from EquipmentTab)
          equipment_type: initialValues.equipment_type || '',
          equipment_operation_type: initialValues.equipment_operation_type || '',
          operation_efficiency:
            initialValues.operation_efficiency || initialValues.production_efficiency || 'normal',
          transportation_distance: initialValues.transportation_distance?.toString() || '',
          transportation_unit: initialValues.transportation_unit || 'km',
          production_efficiency: initialValues.production_efficiency || 'normal',
          observation: initialValues.observation || '',
          // Sprint 3 Epic 3.2: Consumer Trust Fields
          seeds_source: initialValues.seeds_source || '',
          water_source: initialValues.water_source || '',
          // ENHANCED: USDA NASS 2023 irrigation water estimation fields
          irrigation_method: initialValues.irrigation_method || '',
          // Phase 3: Irrigation pump fields
          pump_depth_ft: initialValues.pump_depth_ft?.toString() || '',
          electricity_source: initialValues.electricity_source || '',
          irrigation_depth: initialValues.irrigation_depth?.toString() || '',
          irrigation_depth_unit: initialValues.irrigation_depth_unit || 'inches',
          // Sprint 4: Aggregate Irrigation Support
          // FIX: Use strict comparison — string "false" is truthy in JS!
          is_summary:
            initialValues.is_summary === 'true' || initialValues.is_summary === true
              ? 'true'
              : 'false',
          date_start: initialValues.date_start || '',
          date_end: initialValues.date_end || '',
          event_count: initialValues.event_count?.toString() || '',
          water_volume_total: initialValues.water_volume_total?.toString() || '',
          water_volume_unit: initialValues.water_volume_unit || 'gallons',
          // Sprint 5: Aggregate Harvest Support
          yield_total: initialValues.yield_total?.toString() || '',
          yield_total_unit: initialValues.yield_total_unit || 'lbs',
          // Phase 2: Target market fields
          harvest_quality_grade: initialValues.harvest_quality_grade || '',
          grain_moisture: initialValues.grain_moisture?.toString() || '',
          harvest_method: initialValues.harvest_method || '',
          brix_levels: initialValues.brix_levels || '',
          // Production method for manual-operation detection
          production_method:
            initialValues.production_method ||
            initialValues.method ||
            initialValues.extra_data?.method ||
            '',
          // Phase 2: Universal CommonEvent fields
          variety: initialValues.variety || '',
          block_id: initialValues.block_id || '',
          growth_stage: initialValues.growth_stage || '',
          brix_level: initialValues.brix_level?.toString() || '',
          // Phase 2: Pollination (PO) fields
          pollinator_type: initialValues.pollinator_type || '',
          hive_count: initialValues.hive_count?.toString() || '',
          placement_date: initialValues.placement_date || '',
          removal_date: initialValues.removal_date || '',
          // Phase 2: Post-Harvest Processing (PH) fields
          processing_type: initialValues.processing_type || '',
          processing_duration_hours: initialValues.processing_duration_hours?.toString() || '',
          temperature_control: initialValues.temperature_control || 'false',
          // Phase 2: Canopy Management (CM) fields
          canopy_operation:
            initialValues.canopy_operation || initialValues.extra_data?.canopy_operation || '',
          pass_number:
            (initialValues.pass_number ?? initialValues.extra_data?.pass_number)?.toString() || '',
          // Batch 3 (2026-06): Frost Protection (FP) + Mowing (MO) fields
          protection_method:
            initialValues.protection_method || initialValues.extra_data?.protection_method || '',
          low_temperature:
            (
              initialValues.low_temperature ?? initialValues.extra_data?.low_temperature
            )?.toString() || '',
          floor_management_type:
            initialValues.floor_management_type ||
            initialValues.extra_data?.floor_management_type ||
            '',
          // Phase 2: Pruning Summary Mode
          pruning_passes: initialValues.pruning_passes?.toString() || '',
          // NOP Compliance: Equipment Cleaning Logs (7 CFR 205.272)
          cleaning_date: initialValues.cleaning_date || '',
          cleaning_method: initialValues.cleaning_method || '',
          cleaning_materials_used: initialValues.cleaning_materials_used || '',
          cleaned_by: initialValues.cleaned_by || '',
          shared_with_conventional: initialValues.shared_with_conventional ? 'true' : 'false',
          cleaning_protocol_reference: initialValues.cleaning_protocol_reference || '',
          // NOP Compliance: Post-Harvest Sanitizer (7 CFR 205.272 + § 205.605)
          sanitizer_name: initialValues.sanitizer_name || '',
          sanitizer_ppm: initialValues.sanitizer_ppm ? String(initialValues.sanitizer_ppm) : '',
          rinse_step_documented: initialValues.rinse_step_documented ? 'true' : 'false',
          sanitizer_nop_reference: initialValues.sanitizer_nop_reference || '',
          // Phase 2.3: Custom fields reset
          custom_fields: initialValues.custom_fields || []
        };

        methods.reset(resetData);
      }
    }, [initialValues, methods.reset]); // Use methods.reset instead of entire methods object

    const {
      handleSubmit,
      watch,
      formState: { errors }
    } = methods;

    const productionType = watch('type');
    // Sprint 4: Watch for summary mode toggle
    const isSummaryMode = watch('is_summary') === 'true';
    // NOP: Watch shared_with_conventional for visual feedback on cleaning section
    const isSharedWithConventional = watch('shared_with_conventional') === 'true';

    // Sprint 2: Auto-generate event name from production type (removes farmer burden ~20 sec per event)
    // FIX: Only auto-generate if name is empty or was previously auto-generated.
    // Prevents overwriting saved custom names (e.g. "Season Irrigation Program") on edit.
    useEffect(() => {
      if (productionType && PRODUCTION_TYPE_NAMES[productionType]) {
        const currentName = methods.getValues('name');
        const autoNames = Object.values(PRODUCTION_TYPE_NAMES);
        if (!currentName || !currentName.trim() || autoNames.includes(currentName)) {
          const autoGeneratedName = PRODUCTION_TYPE_NAMES[productionType];
          methods.setValue('name', autoGeneratedName, { shouldDirty: false });
        }
      }
    }, [productionType, methods]);

    // ELECTRIC EQUIPMENT FIX (2025-12-14): Auto-switch fuel unit based on fuel type
    // - Electric → kWh (only valid unit for electricity)
    // - Diesel/Gasoline/etc → L (default for liquid fuels)
    const fuelType = watch('fuel_type');
    useEffect(() => {
      if (fuelType === 'electric') {
        methods.setValue('fuel_unit', 'kWh', { shouldDirty: false });
      } else if (fuelType && fuelType !== 'electric') {
        // Only reset to L if switching FROM electric TO another fuel type
        const currentUnit = methods.getValues('fuel_unit');
        if (currentUnit === 'kWh') {
          methods.setValue('fuel_unit', 'L', { shouldDirty: false });
        }
      }
    }, [fuelType, methods]);

    // Phase 2.3: Sync custom fields with form state
    useEffect(() => {
      methods.setValue('custom_fields', customFields);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customFields]);

    // Production events carbon calculation - LIMITED SCOPE to avoid double-counting
    //
    // CRITICAL ISSUE IDENTIFIED: Production events were double-counting emissions
    // that should be tracked in specialized event types:
    // - Fertilization → Use Chemical Events
    // - Soil Cultivation → Use Soil Management Events
    // - Weed Management → Use Pest Management Events
    // - Equipment fuel → Use Equipment Events
    //
    // SOLUTION: Focus Production events only on production-specific activities:
    // - Yield documentation (no direct emissions)
    // - Harvest transportation (separate from field equipment)
    // - Post-harvest processing (if applicable)

    // Sprint 2 Epic 2.1: Added equipment-specific fields to watched fields
    // FIXED: Added unit fields (area_unit, yield_unit, fuel_unit, transportation_unit) so unit changes trigger onDataChange
    const watchedFields = watch([
      'type',
      'name',
      'area_covered',
      'area_unit',
      'yield_quantity',
      'yield_unit',
      'transportation_distance',
      'transportation_unit',
      'fuel_consumed',
      'fuel_unit',
      'fuel_type',
      'equipment_type',
      'equipment_operation_type',
      'operation_efficiency',
      'equipment_hours',
      'observation',
      // Sprint 3 Epic 3.2: Consumer Trust Fields for preview
      'seeds_source',
      'custom_fields',
      // Summary mode fields for aggregate carbon calculation
      'is_summary',
      'water_volume_total',
      'water_volume_unit',
      // Irrigation pump factor selection
      'water_source',
      // Phase 3: Irrigation pump fields
      'pump_depth_ft',
      'electricity_source',
      // Irrigation depth / method — drive water-volume carbon calc (area × depth × 27154)
      'irrigation_depth',
      'irrigation_depth_unit',
      'irrigation_method',
      // Harvest-specific fields for preview card updates
      'harvest_method',
      'brix_levels',
      'grain_moisture',
      'quality_grade',
      'production_efficiency',
      // Production method triggers manual-operation detection in carbon preview
      'production_method',
      // Phase 2: Universal CommonEvent fields
      'variety',
      'block_id',
      'growth_stage',
      'brix_level',
      // Phase 2: Subtype-specific fields
      'pollinator_type',
      'processing_type',
      'canopy_operation',
      // Batch 3 (2026-06): Frost Protection (FP) + Mowing (MO) subtype fields
      'protection_method',
      'low_temperature',
      'floor_management_type',
      // NOP Compliance: Equipment Cleaning Logs (7 CFR 205.272)
      'cleaning_date',
      'cleaning_method',
      'cleaning_materials_used',
      'cleaned_by',
      'shared_with_conventional',
      'cleaning_protocol_reference',
      // NOP Compliance: Post-Harvest Sanitizer (7 CFR 205.272 + § 205.605)
      'sanitizer_name',
      'sanitizer_ppm',
      'rinse_step_documented',
      'sanitizer_nop_reference'
    ]);
    const previousValuesRef = useRef({});
    const isInitialMountRef = useRef(true);

    // Real-time field watching for carbon calculation updates (following ChemicalTab.jsx pattern)
    useEffect(() => {
      const timeoutId = setTimeout(() => {
        if (onDataChange && typeof onDataChange === 'function') {
          const currentValues = methods.getValues();

          const relevantFields = [
            'type',
            'name',
            'area_covered',
            'area_unit',
            'yield_quantity',
            'yield_unit',
            'fuel_consumed',
            'fuel_unit',
            // Sprint 2 Epic 2.1: Added equipment-specific fields
            'fuel_type',
            'equipment_type',
            'equipment_operation_type',
            'operation_efficiency',
            'equipment_hours',
            'transportation_distance',
            'transportation_unit',
            'observation',
            // Phase 2.3: Added custom fields for farmer-created data
            'custom_fields',
            // Sprint 3 Epic 3.2: Consumer Trust Fields for preview
            'seeds_source',
            // Summary mode fields for aggregate carbon calculation
            'is_summary',
            'water_volume_total',
            'water_volume_unit',
            // Irrigation pump factor selection (USDA NRCS)
            'water_source',
            // Phase 3: Irrigation pump fields
            'pump_depth_ft',
            'electricity_source',
            // Irrigation depth / method — drive water-volume carbon calc (area × depth × 27154)
            'irrigation_depth',
            'irrigation_depth_unit',
            'irrigation_method',
            // Harvest-specific fields for preview card updates
            'harvest_method',
            'brix_levels',
            'grain_moisture',
            'quality_grade',
            'production_efficiency',
            // Production method triggers manual-operation detection in carbon preview
            'production_method',
            // NOP Compliance: Equipment Cleaning Logs (7 CFR 205.272)
            'cleaning_date',
            'cleaning_method',
            'cleaning_materials_used',
            'cleaned_by',
            'shared_with_conventional',
            'cleaning_protocol_reference',
            // NOP Compliance: Post-Harvest Sanitizer (7 CFR 205.272 + § 205.605)
            'sanitizer_name',
            'sanitizer_ppm',
            'rinse_step_documented',
            'sanitizer_nop_reference'
          ];
          const currentRelevantValues = {};
          relevantFields.forEach((field) => {
            currentRelevantValues[field] = currentValues[field];
          });

          const previousValuesStr = JSON.stringify(previousValuesRef.current);
          const currentValuesStr = JSON.stringify(currentRelevantValues);
          const hasChanged = previousValuesStr !== currentValuesStr;

          // FIX: Always trigger onDataChange when type is set and values changed.
          // This ensures non-carbon fields (name, observation) update the preview card.
          // Carbon calculation in NewEvent.jsx handles its own validation.
          const hasValidType = currentValues.type && currentValues.type !== '';
          const shouldTrigger = hasValidType && (hasChanged || isInitialMountRef.current);

          if (shouldTrigger) {
            if (import.meta.env.MODE === 'development') {
              console.log('[ProductionTab]: ✅ Triggering carbon calculation', {
                type: currentValues.type,
                area_covered: currentValues.area_covered,
                area_unit: currentValues.area_unit, // DEBUG: Added to verify unit is passed
                fuel_consumed: currentValues.fuel_consumed,
                transportation_distance: currentValues.transportation_distance
              });
            }
            previousValuesRef.current = currentRelevantValues;
            isInitialMountRef.current = false;
            try {
              onDataChange(currentValues);
            } catch (error) {
              console.error('[ProductionTab]: ❌ Error calling onDataChange:', error);
            }
          }
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    }, [watchedFields]); // FIXED: Removed onDataChange to prevent infinite loop

    const onSubmit = (data) => {
      // Convert string numbers to numbers for backend carbon calculations
      // Sprint 2 Epic 2.1: Handle Equipment Maintenance (EM) type with equipment-specific fields
      // CRITICAL FIX (2025-01-21): Changed EQ → EM to match backend Production event model

      // CRITICAL FIX: Extract yield_quantity from custom_fields if main field is empty
      // This handles cases where users add "Yield Quantity" as a custom field instead of using the main form field
      let yieldQuantityValue = data.yield_quantity;
      if (!yieldQuantityValue && data.custom_fields && data.custom_fields.length > 0) {
        const yieldCustomField = data.custom_fields.find(
          (field) =>
            field.label?.toLowerCase() === 'yield quantity' ||
            field.label?.toLowerCase() === 'quantity'
        );
        if (yieldCustomField && yieldCustomField.value) {
          // Extract numeric value from "50 trees" format
          const numericValue = parseFloat(yieldCustomField.value.toString().split(' ')[0]);
          if (!isNaN(numericValue)) {
            yieldQuantityValue = numericValue;
          }
        }
      }

      const isSummaryEvent = data.is_summary === 'true' || data.is_summary === true;

      const processedData = {
        ...data,
        area_covered: data.area_covered ? parseFloat(data.area_covered) : undefined,
        yield_quantity: yieldQuantityValue ? parseFloat(yieldQuantityValue) : undefined,
        fuel_consumed: data.fuel_consumed ? parseFloat(data.fuel_consumed) : undefined,
        equipment_hours: data.equipment_hours ? parseFloat(data.equipment_hours) : undefined,
        transportation_distance: data.transportation_distance
          ? parseFloat(data.transportation_distance)
          : undefined,
        grain_moisture: data.grain_moisture ? parseFloat(data.grain_moisture) : undefined,
        // Phase 2: Additional harvest fields
        harvest_method: data.harvest_method || undefined,
        brix_levels: data.brix_levels || undefined,
        // Phase 2: Universal CommonEvent top-level fields
        variety: data.variety || undefined,
        block_id: data.block_id || undefined,
        growth_stage: data.growth_stage || undefined,
        // Phase 2: Brix level for HA events (top-level ProductionEvent field)
        brix_level: data.brix_level ? parseFloat(data.brix_level) : undefined,
        // F28 fix (2026-06): the Production Efficiency field renders ONLY for HA
        // (productionType === 'HA' gate), but its 'normal' default was spread via
        // ...data and submitted for every other subtype — a phantom value the
        // farmer never set. Only send it for HA.
        production_efficiency: data.type === 'HA' ? data.production_efficiency : undefined,
        // Empty date strings from default form state would fail backend DateField
        // validation ("Date has wrong format"). cleaning_date is a top-level
        // ProductionEvent DateField — coerce "" → null across every subtype, not
        // just EM. placement_date/removal_date/date_start/date_end are nested in
        // extra_data and already null-coerced in their conditional spreads below.
        cleaning_date: data.cleaning_date || null,
        // Sprint 2 Epic 2.1: Include equipment-specific data when type is EM
        // CRITICAL FIX (2025-01-21): Changed EQ → EM to match backend Production event model
        ...(data.type === 'EM' && {
          equipment_type: data.equipment_type,
          equipment_operation_type: data.equipment_operation_type,
          fuel_type: data.fuel_type,
          operation_efficiency: data.operation_efficiency,
          // NOP Compliance: Equipment Cleaning Logs (7 CFR 205.272)
          cleaning_date: data.cleaning_date || null,
          cleaning_method: data.cleaning_method || undefined,
          cleaning_materials_used: data.cleaning_materials_used || undefined,
          cleaned_by: data.cleaned_by || undefined,
          shared_with_conventional: data.shared_with_conventional === 'true',
          cleaning_protocol_reference: data.cleaning_protocol_reference || undefined,
          // NOP Compliance: Post-Harvest Sanitizer (7 CFR 205.272 + § 205.605)
          sanitizer_name: data.sanitizer_name || undefined,
          sanitizer_ppm: data.sanitizer_ppm ? parseFloat(data.sanitizer_ppm) : undefined,
          rinse_step_documented: data.rinse_step_documented === 'true',
          sanitizer_nop_reference: data.sanitizer_nop_reference || undefined
        }),
        // Irrigation model fields at top level (not in extra_data)
        water_source: data.water_source || undefined,
        irrigation_method: data.irrigation_method || undefined,
        irrigation_depth: data.irrigation_depth ? parseFloat(data.irrigation_depth) : undefined,
        irrigation_depth_unit: data.irrigation_depth_unit || undefined,
        // Phase 3: Pump fields for IR events — top-level model fields
        pump_depth_ft:
          data.type === 'IR' && data.pump_depth_ft ? parseFloat(data.pump_depth_ft) : undefined,
        electricity_source:
          data.type === 'IR' && data.electricity_source ? data.electricity_source : undefined,
        // Summary mode fields stored in extra_data (not model fields)
        extra_data: {
          is_summary: isSummaryEvent,
          ...(isSummaryEvent && {
            date_start: data.date_start || null,
            date_end: data.date_end || null,
            event_count: data.event_count ? parseInt(data.event_count, 10) : null,
            // Irrigation summary fields
            ...(data.type === 'IR' && {
              water_volume_total: data.water_volume_total
                ? parseFloat(data.water_volume_total)
                : null,
              water_volume_unit: data.water_volume_unit || 'gallons'
            }),
            // Sprint 5: Harvest summary fields
            ...(data.type === 'HA' && {
              yield_total: data.yield_total ? parseFloat(data.yield_total) : undefined,
              yield_total_unit: data.yield_total_unit || 'lbs'
            }),
            // Phase 2: Pruning summary fields
            ...(data.type === 'PR' && {
              pruning_passes: data.pruning_passes ? parseInt(data.pruning_passes, 10) : null
            })
          }),
          // Phase 2: Pollination (PO) extra_data fields
          ...(data.type === 'PO' && {
            pollinator_type: data.pollinator_type || undefined,
            hive_count: data.hive_count ? parseInt(data.hive_count, 10) : undefined,
            placement_date: data.placement_date || undefined,
            removal_date: data.removal_date || undefined
          }),
          // Phase 2: Post-Harvest Processing (PH) extra_data fields
          ...(data.type === 'PH' && {
            processing_type: data.processing_type || undefined,
            processing_duration_hours: data.processing_duration_hours
              ? parseFloat(data.processing_duration_hours)
              : undefined,
            temperature_control: data.temperature_control === 'true'
          }),
          // Phase 2: Canopy Management (CM) extra_data fields
          ...(data.type === 'CM' && {
            canopy_operation: data.canopy_operation || undefined,
            pass_number: data.pass_number ? parseInt(data.pass_number, 10) : undefined
          }),
          // Batch 3 (2026-06): Frost Protection (FP) extra_data fields
          ...(data.type === 'FP' && {
            protection_method: data.protection_method || undefined,
            low_temperature:
              data.low_temperature !== '' && data.low_temperature != null
                ? parseFloat(data.low_temperature)
                : undefined
          }),
          // Batch 3 (2026-06): Mowing / Orchard-Floor (MO) extra_data fields
          ...(data.type === 'MO' && {
            floor_management_type: data.floor_management_type || undefined
          }),
          // Production method (manual-operation detection): stored in extra_data.method
          // for consistency with demo data format. Backend reads both top-level and extra_data.
          ...(data.production_method && { method: data.production_method })
        }
      };
      onSubmitHandler(processedData);
    };

    // Keep ref in sync with latest handler on every render (avoids stale closures)
    submitHandlerRef.current = onSubmit;

    return (
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ width: '100%' }}>
          <VStack spacing={6} align="stretch">
            {/* Transparency Focus Alert */}
            <StandardAlert status="success" title="Agricultural Production Transparency">
              <HStack spacing={2} mb={2}>
                <Icon as={FaSeedling} color="green.500" />
                <Text fontSize="sm" fontWeight="bold">
                  Yield & Transportation Documentation
                </Text>
              </HStack>
              <Text fontSize="sm">
                Document production activities and yields to complete your agricultural transparency
                story. Transportation emissions from harvest to storage are calculated to avoid
                double-counting with field equipment.
              </Text>
            </StandardAlert>

            {USE_FIELD_REGISTRY ? (
              <RegistryFormSections
                eventType="production"
                subtype={watch('type')}
                control={methods.control}
                eventData={methods.getValues()}
                errors={errors}
              />
            ) : (
              <>
                {/* Basic Production Information */}
                <SectionBox variant="default">
                  <SectionHeader
                    icon={FaSeedling}
                    iconColor="green.500"
                    title="Production Activity"
                    badge="Carbon Critical"
                    badgeColorScheme="green"
                  />
                  <VStack spacing={4} align="stretch">
                    {/* Production Type - Structured for carbon calculations */}
                    <StandardField
                      label="Production Type"
                      required
                      error={errors.type?.message}
                      helpText="Production type determines carbon calculation method"
                    >
                      <Controller
                        name="type"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardSelect {...field} placeholder="Select production activity...">
                            <option value="PL">🌱 Planting - Crop establishment</option>
                            <option value="HA">🚜 Harvesting - Crop collection & transport</option>
                            <option value="IR">💧 Irrigation - Water application</option>
                            <option value="PR">✂️ Pruning/Trimming - Plant maintenance</option>
                            <option value="TR">🌿 Transplanting - Plant relocation</option>
                            {/* Sprint 2 Epic 2.2: Added CU and TH production types */}
                            <option value="CU">
                              🌾 Cultivation - Soil cultivation & weed control
                            </option>
                            <option value="TH">✂️ Thinning - Plant spacing optimization</option>
                            {/* Sprint 2 Epic 2.1: Equipment Operations merged from Equipment tab */}
                            {/* CRITICAL FIX (2025-01-21): Changed EQ → EM to match backend Production event model */}
                            <option value="EM">
                              🔧 Equipment Maintenance - Equipment usage & maintenance
                            </option>
                            {/* Phase 2: New production subtypes */}
                            <option value="PO">
                              🐝 Pollination - Pollinator placement & management
                            </option>
                            <option value="PH">
                              📦 Post-Harvest Processing - Washing, cooling, packing
                            </option>
                            <option value="CM">
                              🌿 Canopy Management - Pruning, hedging, leaf pulling, thinning
                            </option>
                            {/* Batch 3 (2026-06): Scope-1 fuel ops previously carbon-invisible */}
                            <option value="FP">
                              ❄️ Frost Protection - Wind machines / heaters
                            </option>
                            <option value="MO">
                              🌱 Mowing / Orchard-Floor - Mow, mulch, floor management
                            </option>
                          </StandardSelect>
                        )}
                      />
                    </StandardField>

                    {/* Event Name - Optional, auto-generated from production type if empty */}
                    <StandardField
                      label="Event Name"
                      helpText="Auto-generated from production type. Customize for multi-pass harvests, etc."
                    >
                      <StandardInput
                        type="text"
                        placeholder={`e.g., ${
                          PRODUCTION_TYPE_NAMES[productionType] || 'Harvesting'
                        } - Pass 1`}
                        {...methods.register('name')}
                      />
                    </StandardField>

                    {/* Area Covered - Critical for carbon calculations (hidden for EM/PO — no area concept) */}
                    {!['EM', 'PO'].includes(productionType) && (
                      <HStack spacing={4} align="stretch">
                        <Box flex={2}>
                          <StandardField
                            label="Area Covered"
                            required
                            error={errors.area_covered?.message}
                            helpText="Essential for calculating carbon emissions per hectare"
                          >
                            <Controller
                              name="area_covered"
                              control={methods.control}
                              render={({ field }) => (
                                <NumberInput
                                  min={0}
                                  precision={2}
                                  step={0.01}
                                  value={field.value || ''}
                                  onChange={(valueString) => field.onChange(valueString)}
                                >
                                  <NumberInputField placeholder="0.00" />
                                  <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                  </NumberInputStepper>
                                </NumberInput>
                              )}
                            />
                          </StandardField>
                        </Box>

                        <Box flex={1}>
                          <StandardField label="Unit" required error={errors.area_unit?.message}>
                            <Controller
                              name="area_unit"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardSelect {...field}>
                                  <option value="ha">Hectares</option>
                                  <option value="acres">Acres</option>
                                  <option value="m2">Square Meters</option>
                                  <option value="km2">Square Kilometers</option>
                                </StandardSelect>
                              )}
                            />
                          </StandardField>
                        </Box>
                      </HStack>
                    )}
                  </VStack>
                </SectionBox>

                {/* Sprint 2 Epic 2.1: Equipment Operations Section - Only for EM type */}
                {/* CRITICAL FIX (2025-01-21): Changed EQ → EM to match backend Production event model */}
                {productionType === 'EM' && (
                  <SectionBox variant="highlighted">
                    <SectionHeader
                      icon={FaTools}
                      iconColor="orange.500"
                      title="Equipment Details"
                      badge="Equipment Operations"
                      badgeColorScheme="orange"
                      description="Specify equipment operation type and equipment used for accurate carbon emission calculations."
                    />
                    <VStack spacing={4} align="stretch">
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <StandardField
                          label="Operation Type"
                          required
                          error={errors.equipment_operation_type?.message}
                          helpText="What type of equipment operation?"
                        >
                          <Controller
                            name="equipment_operation_type"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect {...field} placeholder="Select operation type...">
                                {EQUIPMENT_OPERATION_TYPES.map((type) => (
                                  <option key={type.value} value={type.value}>
                                    {type.label}
                                  </option>
                                ))}
                              </StandardSelect>
                            )}
                          />
                        </StandardField>

                        <StandardField
                          label="Equipment Type"
                          required
                          error={errors.equipment_type?.message}
                          helpText="Select the type of equipment used"
                        >
                          <Controller
                            name="equipment_type"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect {...field} placeholder="Select equipment type...">
                                {EQUIPMENT_TYPES.map((type) => (
                                  <option key={type.value} value={type.value}>
                                    {type.label}
                                  </option>
                                ))}
                              </StandardSelect>
                            )}
                          />
                        </StandardField>
                      </SimpleGrid>

                      <StandardField
                        label="Operation Efficiency"
                        error={errors.operation_efficiency?.message}
                        helpText="Equipment condition and performance rating"
                      >
                        <Controller
                          name="operation_efficiency"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect {...field}>
                              <option value="high">
                                High Efficiency (well-maintained, optimal conditions)
                              </option>
                              <option value="normal">Normal Efficiency (standard operation)</option>
                              <option value="low">
                                Low Efficiency (needs maintenance, suboptimal conditions)
                              </option>
                            </StandardSelect>
                          )}
                        />
                      </StandardField>
                    </VStack>
                  </SectionBox>
                )}

                {/* NOP Compliance: Equipment Cleaning Logs (7 CFR 205.272) — EM/CL only.
                    Two-tier gate: EM subtype + equipment_operation_type === 'CL'. Without
                    the second tier the cleaning section renders for Fuel Consumption /
                    Repair / Maintenance EM events too, leaking irrelevant fields. */}
                {productionType === 'EM' && watch('equipment_operation_type') === 'CL' && (
                  <SectionBox variant="highlighted">
                    <SectionHeader
                      icon={FaShieldAlt}
                      iconColor="red.500"
                      title="NOP Equipment Cleaning Log"
                      badge="Organic Compliance"
                      badgeColorScheme="red"
                      description="Document equipment cleaning per NOP 7 CFR 205.272. Required when equipment is shared between organic and conventional operations."
                    />
                    <VStack spacing={4} align="stretch">
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <StandardField label="Cleaning Date" helpText="Date equipment was cleaned">
                          <Controller
                            name="cleaning_date"
                            control={methods.control}
                            render={({ field }) => <Input {...field} type="date" size="md" />}
                          />
                        </StandardField>

                        <StandardField
                          label="Cleaned By"
                          helpText="Person who performed or verified the cleaning"
                        >
                          <Controller
                            name="cleaned_by"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput
                                {...field}
                                placeholder="e.g., Miguel Ramirez (Farm Manager)"
                              />
                            )}
                          />
                        </StandardField>
                      </SimpleGrid>

                      <StandardField
                        label="Cleaning Method"
                        helpText="How the equipment was cleaned (pressure wash, manual scrub, steam, etc.)"
                      >
                        <Controller
                          name="cleaning_method"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              placeholder="e.g., Pressure wash + manual scrub with brushes"
                            />
                          )}
                        />
                      </StandardField>

                      <StandardField
                        label="Cleaning Materials Used"
                        helpText="Cleaning agents used (must be NOP-approved for organic operations)"
                      >
                        <Controller
                          name="cleaning_materials_used"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardTextarea
                              {...field}
                              placeholder="e.g., Water, NOP-approved BioSafe Systems SaniDate (hydrogen peroxide + peroxyacetic acid)"
                              rows={2}
                            />
                          )}
                        />
                      </StandardField>

                      <StandardField
                        label="Cleaning Protocol Reference"
                        helpText="Reference to cleaning SOP or protocol (e.g., SOP-CLEAN-001)"
                      >
                        <Controller
                          name="cleaning_protocol_reference"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput {...field} placeholder="e.g., SOP-CLEAN-001" />
                          )}
                        />
                      </StandardField>

                      {/* NOP Post-Harvest Sanitizer Detail (7 CFR 205.272 + § 205.605) */}
                      <Box
                        p={3}
                        borderWidth="1px"
                        borderColor="orange.200"
                        borderRadius="md"
                        bg="orange.50"
                      >
                        <Text fontWeight="semibold" fontSize="sm" mb={1}>
                          Post-Harvest Sanitation (7 CFR 205.272 + § 205.605)
                        </Text>
                        <Text fontSize="xs" color="gray.700" mb={3}>
                          Required when a chemical sanitizer (chlorine, peracetic acid, hydrogen
                          peroxide, etc.) contacts crops or food-contact surfaces. Must be listed in
                          7 CFR § 205.605, used at allowed concentration, and followed by a
                          potable-water rinse step per § 205.272(b).
                        </Text>
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                          <StandardField
                            label="Sanitizer Name"
                            helpText="e.g., 'Chlorine (sodium hypochlorite)', 'Peracetic acid'"
                          >
                            <Controller
                              name="sanitizer_name"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardInput {...field} placeholder="e.g., Sodium hypochlorite" />
                              )}
                            />
                          </StandardField>
                          <StandardField
                            label="Concentration (ppm)"
                            helpText="Chlorine residual must stay ≤ 4 mg/L per § 205.605(b)"
                          >
                            <Controller
                              name="sanitizer_ppm"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardInput
                                  {...field}
                                  type="number"
                                  min="0"
                                  max="10000"
                                  step="0.1"
                                  placeholder="e.g., 150"
                                />
                              )}
                            />
                          </StandardField>
                        </SimpleGrid>
                        <StandardField
                          label="National List Reference"
                          helpText="e.g., '§ 205.605(b) - Sodium hypochlorite' or an OMRI certificate #"
                        >
                          <Controller
                            name="sanitizer_nop_reference"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput
                                {...field}
                                placeholder="e.g., § 205.605(b) - Sodium hypochlorite"
                              />
                            )}
                          />
                        </StandardField>
                        <HStack mt={3} justify="space-between">
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="semibold" fontSize="sm">
                              Potable-Water Rinse Step Documented
                            </Text>
                            <Text fontSize="xs" color="gray.600">
                              Required after sanitizer contact per § 205.272(b)
                            </Text>
                          </VStack>
                          <Controller
                            name="rinse_step_documented"
                            control={methods.control}
                            render={({ field }) => (
                              <Switch
                                colorScheme="orange"
                                size="lg"
                                isChecked={field.value === 'true'}
                                onChange={(e) =>
                                  field.onChange(e.target.checked ? 'true' : 'false')
                                }
                              />
                            )}
                          />
                        </HStack>
                      </Box>

                      <HStack
                        p={3}
                        bg={isSharedWithConventional ? 'red.50' : 'gray.50'}
                        borderRadius="md"
                        borderWidth="1px"
                        borderColor={isSharedWithConventional ? 'red.200' : 'gray.200'}
                        justify="space-between"
                      >
                        <VStack align="start" spacing={0}>
                          <HStack>
                            <Text fontWeight="semibold" fontSize="sm">
                              Shared with Conventional Operations
                            </Text>
                            {isSharedWithConventional && (
                              <Badge colorScheme="red" size="sm">
                                Requires Cleaning
                              </Badge>
                            )}
                          </HStack>
                          <Text fontSize="xs" color="gray.600">
                            Is this equipment shared between organic and conventional operations?
                          </Text>
                        </VStack>
                        <Controller
                          name="shared_with_conventional"
                          control={methods.control}
                          render={({ field }) => (
                            <Switch
                              colorScheme="red"
                              size="lg"
                              isChecked={field.value === 'true'}
                              onChange={(e) => field.onChange(e.target.checked ? 'true' : 'false')}
                            />
                          )}
                        />
                      </HStack>
                    </VStack>
                  </SectionBox>
                )}

                {/* Yield & Output - For carbon efficiency calculation */}
                {(productionType === 'HA' || productionType === 'PL') && (
                  <SectionBox variant="default">
                    <SectionHeader
                      icon={FaBalanceScale}
                      iconColor="blue.500"
                      title="Yield & Output"
                      badge="Efficiency Calculation"
                      badgeColorScheme="blue"
                    />
                    <VStack spacing={4} align="stretch">
                      <HStack spacing={4} align="stretch">
                        <Box flex={2}>
                          <StandardField
                            label={
                              productionType === 'HA' ? 'Quantity Harvested' : 'Quantity Planted'
                            }
                            error={errors.yield_quantity?.message}
                            helpText="Used to calculate carbon efficiency per unit of production"
                          >
                            <Controller
                              name="yield_quantity"
                              control={methods.control}
                              render={({ field }) => (
                                <NumberInput
                                  min={0}
                                  precision={1}
                                  step={0.1}
                                  value={field.value || ''}
                                  onChange={(valueString) => field.onChange(valueString)}
                                >
                                  <NumberInputField placeholder="0.0" />
                                  <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                  </NumberInputStepper>
                                </NumberInput>
                              )}
                            />
                          </StandardField>
                        </Box>

                        <Box flex={1}>
                          <StandardField label="Unit">
                            <Controller
                              name="yield_unit"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardSelect {...field}>
                                  <option value="kg">Kilograms</option>
                                  <option value="tons">Tonnes</option>
                                  <option value="lbs">Pounds</option>
                                  <option value="boxes">Boxes</option>
                                  <option value="plants">Plants</option>
                                  <option value="seeds">Seeds</option>
                                </StandardSelect>
                              )}
                            />
                          </StandardField>
                        </Box>
                      </HStack>
                    </VStack>
                  </SectionBox>
                )}

                {/* Harvest Quality - For premium fruit & grain markets */}
                {productionType === 'HA' && (
                  <SectionBox variant="default">
                    <SectionHeader
                      icon={FaBalanceScale}
                      iconColor="orange.500"
                      title="Harvest Quality"
                      badge="Market Grading"
                      badgeColorScheme="orange"
                    />
                    <VStack spacing={4} align="stretch">
                      <HStack spacing={4} align="stretch">
                        <Box flex={1}>
                          <StandardField
                            label="Quality Grade"
                            error={errors.harvest_quality_grade?.message}
                            helpText="Classification for market destination (export, domestic, processing)"
                          >
                            <Controller
                              name="harvest_quality_grade"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardSelect {...field} placeholder="Select grade (optional)">
                                  <option value="export_quality">Export Quality</option>
                                  <option value="grade_a">Grade A</option>
                                  <option value="grade_b">Grade B</option>
                                  <option value="grade_c">Grade C</option>
                                  <option value="domestic">Domestic Market</option>
                                  <option value="processing">Processing / Juice</option>
                                </StandardSelect>
                              )}
                            />
                          </StandardField>
                        </Box>

                        <Box flex={1}>
                          <StandardField
                            label="Grain Moisture %"
                            error={errors.grain_moisture?.message}
                            helpText="Grain crops ONLY (corn, wheat, rice, soybean, oats, barley, sorghum). Leave EMPTY for fruits, vegetables, nuts — use Brix (fruits) or dry matter % (avocado/nuts) instead. Do not treat the placeholder as a value."
                          >
                            <Controller
                              name="grain_moisture"
                              control={methods.control}
                              render={({ field }) => (
                                <NumberInput
                                  min={0}
                                  max={100}
                                  precision={1}
                                  step={0.1}
                                  value={field.value || ''}
                                  onChange={(valueString) => field.onChange(valueString)}
                                >
                                  <NumberInputField placeholder="Leave blank if N/A" />
                                  <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                  </NumberInputStepper>
                                </NumberInput>
                              )}
                            />
                          </StandardField>
                        </Box>
                      </HStack>

                      {/* Phase 2: Harvest Method & Brix Levels for Quick Add parity */}
                      <HStack spacing={4} align="stretch">
                        <Box flex={1}>
                          <StandardField
                            label="Harvest Method"
                            error={errors.harvest_method?.message}
                            helpText="How the crop was harvested (consumer trust indicator)"
                          >
                            <Controller
                              name="harvest_method"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardSelect
                                  {...field}
                                  placeholder="Select harvest method (optional)"
                                >
                                  <option value="hand_picking">Hand Picking</option>
                                  <option value="selective_hand_picking">
                                    Selective Hand Picking
                                  </option>
                                  <option value="mechanical">Mechanical Harvester</option>
                                  <option value="shake_and_catch">Shake and Catch</option>
                                  <option value="strip_picking">Strip Picking</option>
                                </StandardSelect>
                              )}
                            />
                          </StandardField>
                        </Box>

                        <Box flex={1}>
                          <StandardField
                            label={intl.formatMessage({ id: 'production.brixLevel' })}
                            error={errors.brix_level?.message}
                            helpText={intl.formatMessage({ id: 'production.brixLevelHelp' })}
                          >
                            <Controller
                              name="brix_level"
                              control={methods.control}
                              render={({ field }) => (
                                <NumberInput
                                  min={0}
                                  max={45}
                                  precision={1}
                                  step={0.1}
                                  value={field.value || ''}
                                  onChange={(valueString) => field.onChange(valueString)}
                                >
                                  <NumberInputField placeholder="Leave blank if N/A" />
                                  <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                  </NumberInputStepper>
                                </NumberInput>
                              )}
                            />
                          </StandardField>
                        </Box>
                      </HStack>
                    </VStack>
                  </SectionBox>
                )}

                {/* Sprint 5: Aggregate Harvest Summary Toggle & Fields */}
                {productionType === 'HA' && (
                  <SectionBox variant="highlighted">
                    <SectionHeader
                      icon={FaBalanceScale}
                      iconColor="blue.500"
                      title="Harvest Summary Mode"
                      badge="Aggregate Logging"
                      badgeColorScheme="blue"
                      description="Log multiple harvest picks as one summary record to reduce logging burden while maintaining full transparency."
                    />
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      {/* Sprint 5: Aggregate Harvest Toggle */}
                      <Box gridColumn={{ md: 'span 2' }} mb={2}>
                        <HStack
                          p={3}
                          bg={isSummaryMode ? 'blue.50' : 'gray.50'}
                          borderRadius="md"
                          borderWidth="1px"
                          borderColor={isSummaryMode ? 'blue.200' : 'gray.200'}
                          justify="space-between"
                        >
                          <VStack align="start" spacing={0}>
                            <HStack>
                              <Text fontWeight="semibold" fontSize="sm">
                                📊 Harvest Summary Mode
                              </Text>
                              {isSummaryMode && (
                                <Badge colorScheme="blue" size="sm">
                                  Active
                                </Badge>
                              )}
                            </HStack>
                            <Text fontSize="xs" color="gray.600">
                              {isSummaryMode
                                ? 'Log multiple harvests as one summary (e.g., "24 picks over 3 months")'
                                : 'Enable to log multiple harvest events at once'}
                            </Text>
                          </VStack>
                          <Controller
                            name="is_summary"
                            control={methods.control}
                            render={({ field }) => (
                              <Switch
                                colorScheme="blue"
                                size="lg"
                                isChecked={field.value === 'true'}
                                onChange={(e) =>
                                  field.onChange(e.target.checked ? 'true' : 'false')
                                }
                              />
                            )}
                          />
                        </HStack>
                      </Box>

                      {/* Sprint 5: Aggregate Harvest Fields (shown when summary mode is active) */}
                      {isSummaryMode && (
                        <>
                          <StandardField label="Period Start Date" isRequired>
                            <Controller
                              name="date_start"
                              control={methods.control}
                              render={({ field }) => <Input {...field} type="date" size="md" />}
                            />
                          </StandardField>

                          <StandardField label="Period End Date" isRequired>
                            <Controller
                              name="date_end"
                              control={methods.control}
                              render={({ field }) => <Input {...field} type="date" size="md" />}
                            />
                          </StandardField>

                          <StandardField label="Number of Harvests" isRequired>
                            <Controller
                              name="event_count"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardInput
                                  {...field}
                                  type="number"
                                  min="1"
                                  placeholder="e.g., 24"
                                />
                              )}
                            />
                          </StandardField>

                          <StandardField label="Total Yield" isRequired>
                            <HStack spacing={2}>
                              <Controller
                                name="yield_total"
                                control={methods.control}
                                render={({ field }) => (
                                  <StandardInput
                                    {...field}
                                    flex={2}
                                    type="number"
                                    step="0.01"
                                    placeholder="e.g., 5000"
                                  />
                                )}
                              />
                              <Controller
                                name="yield_total_unit"
                                control={methods.control}
                                render={({ field }) => (
                                  <StandardSelect {...field} flex={1}>
                                    <option value="lbs">Pounds</option>
                                    <option value="kg">Kilograms</option>
                                    <option value="tons">Tonnes</option>
                                    <option value="boxes">Boxes</option>
                                  </StandardSelect>
                                )}
                              />
                            </HStack>
                          </StandardField>
                        </>
                      )}
                    </SimpleGrid>
                  </SectionBox>
                )}

                {/* Phase 2: Universal Field Details - variety, block_id, growth_stage */}
                {/* Hidden for PO, PH, CM, EM — these subtypes handle fields in their own sections or don't need them */}
                {!['PO', 'PH', 'CM', 'EM'].includes(productionType) && (
                  <SectionBox variant="default">
                    <SectionHeader
                      icon={FaSeedling}
                      iconColor="teal.500"
                      title={intl.formatMessage({ id: 'fieldDetails.title' })}
                      badge={intl.formatMessage({ id: 'fieldDetails.badge' })}
                      badgeColorScheme="teal"
                      description={intl.formatMessage({ id: 'fieldDetails.description' })}
                    />
                    <SimpleGrid
                      columns={{ base: 1, md: ['PL', 'TR', 'HA'].includes(productionType) ? 2 : 3 }}
                      spacing={4}
                    >
                      <StandardField
                        label={intl.formatMessage({ id: 'fieldDetails.variety' })}
                        helpText={intl.formatMessage({ id: 'fieldDetails.varietyHelp' })}
                      >
                        <Controller
                          name="variety"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              placeholder={intl.formatMessage({
                                id: 'fieldDetails.varietyPlaceholder'
                              })}
                            />
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
                            <StandardInput
                              {...field}
                              placeholder={intl.formatMessage({
                                id: 'fieldDetails.blockIdPlaceholder'
                              })}
                            />
                          )}
                        />
                      </StandardField>

                      {/* Growth Stage — hidden for PL, TR (meaningless at planting) and HA (always harvest_ready) */}
                      {!['PL', 'TR', 'HA'].includes(productionType) && (
                        <StandardField
                          label={intl.formatMessage({ id: 'fieldDetails.growthStage' })}
                          helpText={intl.formatMessage({ id: 'fieldDetails.growthStageHelp' })}
                        >
                          <Controller
                            name="growth_stage"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect {...field} placeholder="Select growth stage...">
                                <option value="dormant">
                                  {intl.formatMessage({ id: 'fieldDetails.growthStage.dormant' })}
                                </option>
                                <option value="budbreak">
                                  {intl.formatMessage({ id: 'fieldDetails.growthStage.budbreak' })}
                                </option>
                                <option value="bloom">
                                  {intl.formatMessage({ id: 'fieldDetails.growthStage.bloom' })}
                                </option>
                                <option value="fruit_set">
                                  {intl.formatMessage({ id: 'fieldDetails.growthStage.fruit_set' })}
                                </option>
                                <option value="vegetative">
                                  {intl.formatMessage({
                                    id: 'fieldDetails.growthStage.vegetative'
                                  })}
                                </option>
                                <option value="maturation">
                                  {intl.formatMessage({
                                    id: 'fieldDetails.growthStage.maturation'
                                  })}
                                </option>
                                <option value="harvest_ready">
                                  {intl.formatMessage({
                                    id: 'fieldDetails.growthStage.harvest_ready'
                                  })}
                                </option>
                                <option value="post_harvest">
                                  {intl.formatMessage({
                                    id: 'fieldDetails.growthStage.post_harvest'
                                  })}
                                </option>
                              </StandardSelect>
                            )}
                          />
                        </StandardField>
                      )}
                    </SimpleGrid>
                  </SectionBox>
                )}

                {/* Phase 2: Pollination (PO) specific fields */}
                {productionType === 'PO' && (
                  <SectionBox variant="highlighted">
                    <SectionHeader
                      icon={FaSeedling}
                      iconColor="yellow.500"
                      title={intl.formatMessage({ id: 'production.pollination.title' })}
                      badge={intl.formatMessage({ id: 'production.pollination.badge' })}
                      badgeColorScheme="yellow"
                      description="Document pollinator placement and management for full production transparency."
                    />
                    <VStack spacing={4} align="stretch">
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <StandardField
                          label={intl.formatMessage({ id: 'production.pollination.varietyLabel' })}
                          helpText={intl.formatMessage({
                            id: 'production.pollination.varietyHelp'
                          })}
                        >
                          <Controller
                            name="variety"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput
                                {...field}
                                placeholder={intl.formatMessage({
                                  id: 'fieldDetails.varietyPlaceholder'
                                })}
                              />
                            )}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({ id: 'fieldDetails.blockId' })}
                          helpText={intl.formatMessage({
                            id: 'production.pollination.blockIdHelp'
                          })}
                        >
                          <Controller
                            name="block_id"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput
                                {...field}
                                placeholder={intl.formatMessage({
                                  id: 'fieldDetails.blockIdPlaceholder'
                                })}
                              />
                            )}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({
                            id: 'production.pollination.pollinatorType'
                          })}
                          helpText={intl.formatMessage({
                            id: 'production.pollination.pollinatorTypeHelp'
                          })}
                        >
                          <Controller
                            name="pollinator_type"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect {...field} placeholder="Select pollinator type...">
                                <option value="honeybee">
                                  🐝 {intl.formatMessage({ id: 'production.pollination.honeybee' })}
                                </option>
                                <option value="mason_bee">
                                  🐝{' '}
                                  {intl.formatMessage({ id: 'production.pollination.mason_bee' })}
                                </option>
                                <option value="bumblebee">
                                  🐝{' '}
                                  {intl.formatMessage({ id: 'production.pollination.bumblebee' })}
                                </option>
                                <option value="native_pollinators">
                                  🌸{' '}
                                  {intl.formatMessage({
                                    id: 'production.pollination.native_pollinators'
                                  })}
                                </option>
                                <option value="wind">
                                  💨 {intl.formatMessage({ id: 'production.pollination.wind' })}
                                </option>
                              </StandardSelect>
                            )}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({ id: 'production.pollination.hiveCount' })}
                          error={errors.hive_count?.message}
                          helpText={intl.formatMessage({
                            id: 'production.pollination.hiveCountHelp'
                          })}
                        >
                          <Controller
                            name="hive_count"
                            control={methods.control}
                            render={({ field }) => (
                              <NumberInput
                                min={0}
                                precision={0}
                                step={1}
                                value={field.value || ''}
                                onChange={(valueString) => field.onChange(valueString)}
                              >
                                <NumberInputField placeholder="e.g., 4" />
                                <NumberInputStepper>
                                  <NumberIncrementStepper />
                                  <NumberDecrementStepper />
                                </NumberInputStepper>
                              </NumberInput>
                            )}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({ id: 'production.pollination.placementDate' })}
                          helpText={intl.formatMessage({
                            id: 'production.pollination.placementDateHelp'
                          })}
                        >
                          <Controller
                            name="placement_date"
                            control={methods.control}
                            render={({ field }) => <Input {...field} type="date" size="md" />}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({ id: 'production.pollination.removalDate' })}
                          helpText={intl.formatMessage({
                            id: 'production.pollination.removalDateHelp'
                          })}
                        >
                          <Controller
                            name="removal_date"
                            control={methods.control}
                            render={({ field }) => <Input {...field} type="date" size="md" />}
                          />
                        </StandardField>
                      </SimpleGrid>
                    </VStack>
                  </SectionBox>
                )}

                {/* Phase 2: Post-Harvest Processing (PH) specific fields */}
                {productionType === 'PH' && (
                  <SectionBox variant="highlighted">
                    <SectionHeader
                      icon={FaTools}
                      iconColor="purple.500"
                      title={intl.formatMessage({ id: 'production.postHarvest.title' })}
                      badge={intl.formatMessage({ id: 'production.postHarvest.badge' })}
                      badgeColorScheme="purple"
                      description="Document post-harvest handling and processing operations for full traceability."
                    />
                    <VStack spacing={4} align="stretch">
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <StandardField
                          label={intl.formatMessage({ id: 'production.postHarvest.varietyLabel' })}
                          helpText={intl.formatMessage({
                            id: 'production.postHarvest.varietyHelp'
                          })}
                        >
                          <Controller
                            name="variety"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput
                                {...field}
                                placeholder={intl.formatMessage({
                                  id: 'fieldDetails.varietyPlaceholder'
                                })}
                              />
                            )}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({
                            id: 'production.postHarvest.processingType'
                          })}
                          helpText={intl.formatMessage({
                            id: 'production.postHarvest.processingTypeHelp'
                          })}
                        >
                          <Controller
                            name="processing_type"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect {...field} placeholder="Select processing type...">
                                <option value="washing">
                                  🚿 {intl.formatMessage({ id: 'production.postHarvest.washing' })}
                                </option>
                                <option value="cooling">
                                  ❄️ {intl.formatMessage({ id: 'production.postHarvest.cooling' })}
                                </option>
                                <option value="drying">
                                  ☀️ {intl.formatMessage({ id: 'production.postHarvest.drying' })}
                                </option>
                                <option value="sorting">
                                  🔍 {intl.formatMessage({ id: 'production.postHarvest.sorting' })}
                                </option>
                                <option value="grading">
                                  📊 {intl.formatMessage({ id: 'production.postHarvest.grading' })}
                                </option>
                                <option value="packing">
                                  📦 {intl.formatMessage({ id: 'production.postHarvest.packing' })}
                                </option>
                                <option value="hulling">
                                  ⚙️ {intl.formatMessage({ id: 'production.postHarvest.hulling' })}
                                </option>
                                <option value="shelling">
                                  ⚙️ {intl.formatMessage({ id: 'production.postHarvest.shelling' })}
                                </option>
                                <option value="pressing">
                                  🗜️ {intl.formatMessage({ id: 'production.postHarvest.pressing' })}
                                </option>
                                <option value="milling">
                                  ⚙️ {intl.formatMessage({ id: 'production.postHarvest.milling' })}
                                </option>
                                <option value="smoking">
                                  🔥 {intl.formatMessage({ id: 'production.postHarvest.smoking' })}
                                </option>
                              </StandardSelect>
                            )}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({ id: 'production.postHarvest.durationHours' })}
                          error={errors.processing_duration_hours?.message}
                          helpText={intl.formatMessage({
                            id: 'production.postHarvest.durationHoursHelp'
                          })}
                        >
                          <Controller
                            name="processing_duration_hours"
                            control={methods.control}
                            render={({ field }) => (
                              <NumberInput
                                min={0}
                                precision={1}
                                step={0.5}
                                value={field.value || ''}
                                onChange={(valueString) => field.onChange(valueString)}
                              >
                                <NumberInputField placeholder="e.g., 4.5" />
                                <NumberInputStepper>
                                  <NumberIncrementStepper />
                                  <NumberDecrementStepper />
                                </NumberInputStepper>
                              </NumberInput>
                            )}
                          />
                        </StandardField>
                      </SimpleGrid>

                      <Box
                        p={3}
                        bg={watch('temperature_control') === 'true' ? 'blue.50' : 'gray.50'}
                        borderRadius="md"
                        borderWidth="1px"
                        borderColor={
                          watch('temperature_control') === 'true' ? 'blue.200' : 'gray.200'
                        }
                      >
                        <HStack justify="space-between">
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="semibold" fontSize="sm">
                              ❄️{' '}
                              {intl.formatMessage({
                                id: 'production.postHarvest.temperatureControl'
                              })}
                            </Text>
                            <Text fontSize="xs" color="gray.600">
                              {intl.formatMessage({
                                id: 'production.postHarvest.temperatureControlHelp'
                              })}
                            </Text>
                          </VStack>
                          <Controller
                            name="temperature_control"
                            control={methods.control}
                            render={({ field }) => (
                              <Switch
                                colorScheme="blue"
                                size="lg"
                                isChecked={field.value === 'true'}
                                onChange={(e) =>
                                  field.onChange(e.target.checked ? 'true' : 'false')
                                }
                              />
                            )}
                          />
                        </HStack>
                      </Box>
                    </VStack>
                  </SectionBox>
                )}

                {/* Phase 2: Canopy Management (CM) specific fields */}
                {productionType === 'CM' && (
                  <SectionBox variant="highlighted">
                    <SectionHeader
                      icon={FaSeedling}
                      iconColor="green.600"
                      title={intl.formatMessage({ id: 'production.canopy.title' })}
                      badge={intl.formatMessage({ id: 'production.canopy.badge' })}
                      badgeColorScheme="green"
                      description="Document canopy management operations for transparency and carbon-accurate equipment tracking."
                    />
                    <VStack spacing={4} align="stretch">
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <StandardField
                          label={intl.formatMessage({ id: 'fieldDetails.variety' })}
                          helpText={intl.formatMessage({ id: 'production.canopy.varietyHelp' })}
                        >
                          <Controller
                            name="variety"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput {...field} placeholder="e.g., Mourvèdre, Cabernet" />
                            )}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({ id: 'fieldDetails.blockId' })}
                          helpText={intl.formatMessage({ id: 'production.canopy.blockIdHelp' })}
                        >
                          <Controller
                            name="block_id"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput
                                {...field}
                                placeholder={intl.formatMessage({
                                  id: 'fieldDetails.blockIdPlaceholder'
                                })}
                              />
                            )}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({ id: 'fieldDetails.growthStage' })}
                          helpText={intl.formatMessage({ id: 'production.canopy.growthStageHelp' })}
                        >
                          <Controller
                            name="growth_stage"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect {...field} placeholder="Select growth stage...">
                                <option value="dormant">
                                  {intl.formatMessage({ id: 'fieldDetails.growthStage.dormant' })}
                                </option>
                                <option value="budbreak">
                                  {intl.formatMessage({ id: 'fieldDetails.growthStage.budbreak' })}
                                </option>
                                <option value="bloom">
                                  {intl.formatMessage({ id: 'fieldDetails.growthStage.bloom' })}
                                </option>
                                <option value="fruit_set">
                                  {intl.formatMessage({ id: 'fieldDetails.growthStage.fruit_set' })}
                                </option>
                                <option value="vegetative">
                                  {intl.formatMessage({
                                    id: 'fieldDetails.growthStage.vegetative'
                                  })}
                                </option>
                                <option value="maturation">
                                  {intl.formatMessage({
                                    id: 'fieldDetails.growthStage.maturation'
                                  })}
                                </option>
                                <option value="harvest_ready">
                                  {intl.formatMessage({
                                    id: 'fieldDetails.growthStage.harvest_ready'
                                  })}
                                </option>
                                <option value="post_harvest">
                                  {intl.formatMessage({
                                    id: 'fieldDetails.growthStage.post_harvest'
                                  })}
                                </option>
                              </StandardSelect>
                            )}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({ id: 'production.canopy.operation' })}
                          helpText={intl.formatMessage({ id: 'production.canopy.operationHelp' })}
                        >
                          <Controller
                            name="canopy_operation"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect {...field} placeholder="Select canopy operation...">
                                <option value="pruning">
                                  ✂️ {intl.formatMessage({ id: 'production.canopy.pruning' })}
                                </option>
                                <option value="leaf_pulling">
                                  🍃 {intl.formatMessage({ id: 'production.canopy.leaf_pulling' })}
                                </option>
                                <option value="hedging">
                                  🌳 {intl.formatMessage({ id: 'production.canopy.hedging' })}
                                </option>
                                <option value="shoot_positioning">
                                  🌱{' '}
                                  {intl.formatMessage({
                                    id: 'production.canopy.shoot_positioning'
                                  })}
                                </option>
                                <option value="thinning">
                                  🪚 {intl.formatMessage({ id: 'production.canopy.thinning' })}
                                </option>
                                <option value="tucking">
                                  🤲 {intl.formatMessage({ id: 'production.canopy.tucking' })}
                                </option>
                                <option value="suckering">
                                  🌿 {intl.formatMessage({ id: 'production.canopy.suckering' })}
                                </option>
                              </StandardSelect>
                            )}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({ id: 'production.canopy.passNumber' })}
                          error={errors.pass_number?.message}
                          helpText={intl.formatMessage({ id: 'production.canopy.passNumberHelp' })}
                        >
                          <Controller
                            name="pass_number"
                            control={methods.control}
                            render={({ field }) => (
                              <NumberInput
                                min={1}
                                precision={0}
                                step={1}
                                value={field.value || ''}
                                onChange={(valueString) => field.onChange(valueString)}
                              >
                                <NumberInputField placeholder="e.g., 1" />
                                <NumberInputStepper>
                                  <NumberIncrementStepper />
                                  <NumberDecrementStepper />
                                </NumberInputStepper>
                              </NumberInput>
                            )}
                          />
                        </StandardField>
                      </SimpleGrid>
                    </VStack>
                  </SectionBox>
                )}

                {/* Batch 3 (2026-06): Frost Protection (FP) — wind machines / heaters.
                    Fuel type, fuel consumed, equipment hours and area are captured by the
                    shared fuel/area sections below and feed the carbon calculation. */}
                {productionType === 'FP' && (
                  <SectionBox variant="highlighted">
                    <SectionHeader
                      icon={FaShieldAlt}
                      iconColor="blue.600"
                      title="Frost Protection Details"
                      badge="Scope-1 Fuel"
                      badgeColorScheme="blue"
                      description="Document the frost-protection method and conditions. Record the equipment fuel and run hours in the Fuel & Equipment section below so the carbon impact is captured."
                    />
                    <VStack spacing={4} align="stretch">
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <StandardField label="Protection Method" helpText="How frost was mitigated">
                          <Controller
                            name="protection_method"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect {...field} placeholder="Select method...">
                                <option value="wind_machine">Wind machine</option>
                                <option value="orchard_heater">Orchard heater(s)</option>
                                <option value="under_tree_sprinkler">Under-tree sprinklers</option>
                                <option value="other">Other (describe in notes)</option>
                              </StandardSelect>
                            )}
                          />
                        </StandardField>

                        <StandardField
                          label="Low Temperature (°C)"
                          error={errors.low_temperature?.message}
                          helpText="Lowest temperature that triggered protection"
                        >
                          <Controller
                            name="low_temperature"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput
                                {...field}
                                type="number"
                                step="0.1"
                                placeholder="e.g., -2.0"
                              />
                            )}
                          />
                        </StandardField>
                      </SimpleGrid>
                    </VStack>
                  </SectionBox>
                )}

                {/* Batch 3 (2026-06): Mowing / Orchard-Floor (MO). Fuel/area/hours captured
                    by the shared sections below; distinct from CU (tillage) carbon profile. */}
                {productionType === 'MO' && (
                  <SectionBox variant="highlighted">
                    <SectionHeader
                      icon={FaSeedling}
                      iconColor="green.600"
                      title="Orchard-Floor Management"
                      badge="Scope-1 Fuel"
                      badgeColorScheme="green"
                      description="Document the floor-management operation. Record equipment fuel and run hours in the Fuel & Equipment section below so the carbon impact is captured."
                    />
                    <VStack spacing={4} align="stretch">
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <StandardField
                          label="Floor Management Type"
                          helpText="The operation performed on the orchard floor / row middles"
                        >
                          <Controller
                            name="floor_management_type"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect {...field} placeholder="Select operation...">
                                <option value="mow">Mow</option>
                                <option value="mulch">Mulch</option>
                                <option value="cover_crop_mgmt">Cover-crop management</option>
                                <option value="herbicide_strip">Herbicide strip</option>
                              </StandardSelect>
                            )}
                          />
                        </StandardField>
                      </SimpleGrid>
                    </VStack>
                  </SectionBox>
                )}

                {/* Phase 2: Pruning Summary Mode (mirrors IR and HA summary pattern) */}
                {productionType === 'PR' && (
                  <SectionBox variant="highlighted">
                    <SectionHeader
                      icon={FaSeedling}
                      iconColor="orange.500"
                      title={intl.formatMessage({ id: 'production.pruning.summaryTitle' })}
                      badge={intl.formatMessage({ id: 'production.pruning.summaryBadge' })}
                      badgeColorScheme="orange"
                      description={intl.formatMessage({
                        id: 'production.pruning.summaryDescription'
                      })}
                    />
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <Box gridColumn={{ md: 'span 2' }} mb={2}>
                        <HStack
                          p={3}
                          bg={isSummaryMode ? 'orange.50' : 'gray.50'}
                          borderRadius="md"
                          borderWidth="1px"
                          borderColor={isSummaryMode ? 'orange.200' : 'gray.200'}
                          justify="space-between"
                        >
                          <VStack align="start" spacing={0}>
                            <HStack>
                              <Text fontWeight="semibold" fontSize="sm">
                                📊{' '}
                                {intl.formatMessage({
                                  id: 'production.pruning.summaryToggleLabel'
                                })}
                              </Text>
                              {isSummaryMode && (
                                <Badge colorScheme="orange" size="sm">
                                  Active
                                </Badge>
                              )}
                            </HStack>
                            <Text fontSize="xs" color="gray.600">
                              {isSummaryMode
                                ? intl.formatMessage({
                                    id: 'production.pruning.summaryToggleActive'
                                  })
                                : intl.formatMessage({
                                    id: 'production.pruning.summaryToggleInactive'
                                  })}
                            </Text>
                          </VStack>
                          <Controller
                            name="is_summary"
                            control={methods.control}
                            render={({ field }) => (
                              <Switch
                                colorScheme="orange"
                                size="lg"
                                isChecked={field.value === 'true'}
                                onChange={(e) =>
                                  field.onChange(e.target.checked ? 'true' : 'false')
                                }
                              />
                            )}
                          />
                        </HStack>
                      </Box>

                      {isSummaryMode && (
                        <>
                          <StandardField label="Period Start Date" isRequired>
                            <Controller
                              name="date_start"
                              control={methods.control}
                              render={({ field }) => <Input {...field} type="date" size="md" />}
                            />
                          </StandardField>

                          <StandardField label="Period End Date" isRequired>
                            <Controller
                              name="date_end"
                              control={methods.control}
                              render={({ field }) => <Input {...field} type="date" size="md" />}
                            />
                          </StandardField>

                          <StandardField
                            label={intl.formatMessage({ id: 'production.pruning.passes' })}
                            isRequired
                          >
                            <Controller
                              name="pruning_passes"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardInput
                                  {...field}
                                  type="number"
                                  min="1"
                                  placeholder="e.g., 5"
                                />
                              )}
                            />
                          </StandardField>
                        </>
                      )}
                    </SimpleGrid>
                  </SectionBox>
                )}

                {/* Equipment & Fuel Usage - Hidden for PO (Pollination is zero-emission biological service) */}
                {productionType !== 'PO' && (
                  <SectionBox variant="highlighted">
                    <SectionHeader
                      icon={FaSeedling}
                      iconColor="green.600"
                      title="Fuel Consumption & Equipment Data"
                      badge="Enhanced Carbon Accuracy"
                      badgeColorScheme="green"
                      description="Document your actual equipment usage and fuel consumption to build consumer trust through transparent farming practices. These details help consumers understand the real operational impact of your production operations."
                    />

                    <VStack spacing={4} align="stretch">
                      {/* Production Method - Manual operation detection for Trazo's Direct Operational
                    Emissions philosophy. Documenting "Hand thinning with pruning shears",
                    "Hand weeding", etc. produces accurate ~5 kg CO2e (manual labor estimate)
                    instead of USDA blanket mechanical averages (~150 kg). Only shown for types
                    where hand labor is common (thinning, pruning, transplanting, cultivation,
                    harvesting, canopy management). */}
                      {['HA', 'PR', 'TR', 'CU', 'TH', 'CM'].includes(productionType) && (
                        <StandardField
                          label="Production Method (optional)"
                          helpText="Describe how this was done (e.g. 'Hand thinning with pruning shears'). If manual, carbon is calculated at ~0.1 kg CO₂e/acre instead of USDA mechanical averages."
                        >
                          <Controller
                            name="production_method"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput
                                {...field}
                                placeholder="Describe the method (leave blank if unsure)"
                              />
                            )}
                          />
                        </StandardField>
                      )}

                      {/* Fuel Type - Only for fuel-consuming operations */}
                      {/* CRITICAL FIX (2025-01-21): Removed EQ (standalone Equipment type 4), kept EM (Production subtype) */}
                      {/* ELECTRIC EQUIPMENT FIX (2025-12-14): Added IR for electric irrigation pumps, PR/TH for powered pruning/thinning */}
                      {/* Phase 2: Added PH (Post-Harvest Processing) for processing equipment fuel */}
                      {[
                        'PL',
                        'HA',
                        'IR',
                        'PR',
                        'TR',
                        'CU',
                        'TH',
                        'EM',
                        'PH',
                        'CM',
                        'FP',
                        'MO'
                      ].includes(productionType) && (
                        <StandardField
                          label="Fuel Type"
                          error={errors.fuel_type?.message}
                          helpText="Select a fuel type only if powered equipment was used. Leave blank for hand/manual operations — carbon is estimated as manual labor (~0.1 kg CO₂e/acre)."
                        >
                          <Controller
                            name="fuel_type"
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
                      )}

                      {/* Fuel Consumption - Only for fuel-consuming operations */}
                      {/* CRITICAL FIX (2025-01-21): Removed EQ (standalone Equipment type 4), kept EM (Production subtype) */}
                      {/* ELECTRIC EQUIPMENT FIX (2025-12-14): Added IR for electric irrigation pumps, PR/TH for powered pruning/thinning */}
                      {/* IRRIGATION PUMP FIX (2026-02-19): Hide Energy Amount for electric IR — energy auto-calculated from water volume × pump factor */}
                      {/* Phase 2: Added PH (Post-Harvest Processing) and CM (Canopy Management) */}
                      {[
                        'PL',
                        'HA',
                        'IR',
                        'PR',
                        'TR',
                        'CU',
                        'TH',
                        'EM',
                        'PH',
                        'CM',
                        'FP',
                        'MO'
                      ].includes(productionType) && (
                        <>
                          {/* For electric irrigation, energy is auto-calculated from water volume + water source */}
                          {productionType === 'IR' && watch('fuel_type') !== 'diesel' ? (
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
                                  Electric Pump:
                                </Text>{' '}
                                Energy consumption is automatically calculated from your water
                                volume and water source using USDA NRCS pump efficiency factors
                                (0.39 kg CO₂/kWh). If you use a diesel pump, select "Diesel" as Fuel
                                Type above.
                              </Text>
                            </Box>
                          ) : (
                            <>
                              <HStack spacing={4} align="stretch">
                                <Box flex={2}>
                                  <StandardField
                                    label={
                                      watch('fuel_type') === 'electric'
                                        ? 'Energy Amount (kWh)'
                                        : 'Fuel Consumed'
                                    }
                                    error={errors.fuel_consumed?.message}
                                    helpText={
                                      watch('fuel_type') === 'electric'
                                        ? 'Energy consumption for carbon emission calculation'
                                        : 'Fuel consumption for carbon emission calculation'
                                    }
                                  >
                                    <Controller
                                      name="fuel_consumed"
                                      control={methods.control}
                                      render={({ field }) => (
                                        <NumberInput
                                          min={0}
                                          precision={1}
                                          step={0.1}
                                          value={field.value || ''}
                                          onChange={(valueString) => field.onChange(valueString)}
                                        >
                                          <NumberInputField
                                            placeholder={
                                              watch('fuel_type') === 'electric'
                                                ? 'e.g., 50 kWh'
                                                : 'Optional'
                                            }
                                          />
                                          <NumberInputStepper>
                                            <NumberIncrementStepper />
                                            <NumberDecrementStepper />
                                          </NumberInputStepper>
                                        </NumberInput>
                                      )}
                                    />
                                  </StandardField>
                                </Box>

                                <Box flex={1}>
                                  <StandardField label="Unit">
                                    <Controller
                                      name="fuel_unit"
                                      control={methods.control}
                                      render={({ field }) => (
                                        <StandardSelect {...field}>
                                          {/* ELECTRIC EQUIPMENT FIX (2025-12-14): Show only relevant units based on fuel type */}
                                          {watch('fuel_type') === 'electric' ? (
                                            <option value="kWh">Kilowatt-hours</option>
                                          ) : (
                                            <>
                                              <option value="L">Liters</option>
                                              <option value="gal">Gallons</option>
                                              <option value="kg">Kilograms</option>
                                            </>
                                          )}
                                        </StandardSelect>
                                      )}
                                    />
                                  </StandardField>
                                </Box>
                              </HStack>

                              {/* Electric Equipment Info Box */}
                              {watch('fuel_type') === 'electric' && (
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
                                    Enter energy consumption in kilowatt-hours (kWh). Grid
                                    electricity uses 0.39 kg CO₂/kWh. Solar/wind powered equipment
                                    has zero emissions.
                                  </Text>
                                </Box>
                              )}
                            </>
                          )}
                        </>
                      )}

                      {/* Equipment Hours */}
                      <StandardField
                        label="Equipment Operating Hours"
                        error={errors.equipment_hours?.message}
                        helpText="Used for calculating fuel efficiency and carbon per hour"
                      >
                        <Controller
                          name="equipment_hours"
                          control={methods.control}
                          render={({ field }) => (
                            <NumberInput
                              min={0}
                              precision={1}
                              step={0.1}
                              value={field.value || ''}
                              onChange={(valueString) => field.onChange(valueString)}
                            >
                              <NumberInputField placeholder="Optional" />
                              <NumberInputStepper>
                                <NumberIncrementStepper />
                                <NumberDecrementStepper />
                              </NumberInputStepper>
                            </NumberInput>
                          )}
                        />
                      </StandardField>
                    </VStack>
                  </SectionBox>
                )}

                {/* Transportation - For logistics emissions */}
                {productionType === 'HA' && (
                  <SectionBox variant="default">
                    <SectionHeader
                      icon={FaTruck}
                      iconColor="purple.500"
                      title="Transportation"
                      badge="Logistics Emissions"
                      badgeColorScheme="purple"
                    />
                    <VStack spacing={4} align="stretch">
                      <HStack spacing={4} align="stretch">
                        <Box flex={2}>
                          <StandardField
                            label="Transportation Distance"
                            error={errors.transportation_distance?.message}
                            helpText="Distance for transporting harvest affects carbon footprint"
                          >
                            <Controller
                              name="transportation_distance"
                              control={methods.control}
                              render={({ field }) => (
                                <NumberInput
                                  min={0}
                                  precision={1}
                                  step={0.1}
                                  value={field.value || ''}
                                  onChange={(valueString) => field.onChange(valueString)}
                                >
                                  <NumberInputField placeholder="Optional" />
                                  <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                  </NumberInputStepper>
                                </NumberInput>
                              )}
                            />
                          </StandardField>
                        </Box>

                        <Box flex={1}>
                          <StandardField label="Unit">
                            <Controller
                              name="transportation_unit"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardSelect {...field}>
                                  <option value="km">Kilometers</option>
                                  <option value="miles">Miles</option>
                                  <option value="m">Meters</option>
                                </StandardSelect>
                              )}
                            />
                          </StandardField>
                        </Box>
                      </HStack>

                      {/* Production Efficiency Rating */}
                      <StandardField
                        label="Production Efficiency"
                        error={errors.production_efficiency?.message}
                        helpText="Rate the efficiency of this production activity for carbon scoring"
                      >
                        <Controller
                          name="production_efficiency"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect {...field}>
                              <option value="high">
                                High Efficiency (optimal conditions, planned operations)
                              </option>
                              <option value="normal">Normal Efficiency (standard operation)</option>
                              <option value="low">
                                Low Efficiency (adverse conditions, unplanned operations)
                              </option>
                            </StandardSelect>
                          )}
                        />
                      </StandardField>
                    </VStack>
                  </SectionBox>
                )}

                {/* Sprint 3 Epic 3.2: Consumer Trust & Transparency Fields */}
                {(productionType === 'PL' ||
                  productionType === 'TR' ||
                  productionType === 'IR') && (
                  <SectionBox variant="highlighted">
                    <SectionHeader
                      icon={FaSeedling}
                      iconColor="teal.500"
                      title="Consumer Trust & Transparency"
                      badge="Builds Consumer Trust"
                      badgeColorScheme="teal"
                      description="Document your sourcing practices to help consumers understand the origins and quality of your farming inputs."
                    />
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      {(productionType === 'PL' || productionType === 'TR') && (
                        <>
                          <StandardField
                            label="Seed/Seedling Source"
                            helpText="Where did your seeds or seedlings come from?"
                          >
                            <Controller
                              name="seeds_source"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardSelect {...field} placeholder="Select seed source...">
                                  <option value="farm_saved">♻️ Farm-Saved Seeds</option>
                                  <option value="local">🏡 Local Nursery/Supplier</option>
                                  <option value="cooperative">🤝 Farmer Cooperative</option>
                                  <option value="commercial">🏭 Commercial Supplier</option>
                                  <option value="other">📝 Other (specify in notes)</option>
                                </StandardSelect>
                              )}
                            />
                          </StandardField>
                          <StandardField
                            label="Seed Certification Status"
                            helpText="Regulatory classification per NOP 7 CFR 205.204"
                          >
                            <Controller
                              name="seed_certification_status"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardSelect
                                  {...field}
                                  placeholder="Select certification status..."
                                >
                                  <option value="certified_organic">🌱 Certified Organic</option>
                                  <option value="transitional">🔄 Transitional</option>
                                  <option value="non_organic_untreated">
                                    ⚪ Non-organic (Untreated)
                                  </option>
                                  <option value="non_organic_treated">
                                    ⚠️ Non-organic (Treated)
                                  </option>
                                </StandardSelect>
                              )}
                            />
                          </StandardField>
                          <StandardField
                            label="Supplier Name"
                            helpText="Who you bought the seed/planting stock from (NOP traceability)"
                          >
                            <Controller
                              name="seed_supplier_name"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardInput
                                  {...field}
                                  placeholder="e.g., Johnny's Selected Seeds"
                                />
                              )}
                            />
                          </StandardField>
                          <StandardField
                            label="Purchase Date"
                            helpText="Date of seed purchase (matches supplier invoice)"
                          >
                            <Controller
                              name="seed_purchase_date"
                              control={methods.control}
                              render={({ field }) => <StandardInput {...field} type="date" />}
                            />
                          </StandardField>
                          <StandardField
                            label="Invoice #"
                            helpText="Supplier invoice or receipt number"
                          >
                            <Controller
                              name="seed_purchase_invoice"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardInput {...field} placeholder="e.g., INV-2026-0045" />
                              )}
                            />
                          </StandardField>
                          <StandardField
                            label="Lot / Batch #"
                            helpText="Supplier lot or batch identifier from the seed packet"
                          >
                            <Controller
                              name="seed_lot_number"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardInput {...field} placeholder="e.g., 23-TX-01" />
                              )}
                            />
                          </StandardField>
                          <StandardField
                            label="Seed Treatment"
                            helpText="Coatings, inoculants, or pelleting applied to the seed (if any)"
                          >
                            <Controller
                              name="seed_treatment"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardInput
                                  {...field}
                                  placeholder="e.g., Rhizobium inoculant, None"
                                />
                              )}
                            />
                          </StandardField>
                        </>
                      )}

                      {productionType === 'IR' && (
                        <>
                          {/* Sprint 4: Aggregate Irrigation Toggle */}
                          <Box gridColumn={{ md: 'span 2' }} mb={2}>
                            <HStack
                              p={3}
                              bg={isSummaryMode ? 'blue.50' : 'gray.50'}
                              borderRadius="md"
                              borderWidth="1px"
                              borderColor={isSummaryMode ? 'blue.200' : 'gray.200'}
                              justify="space-between"
                            >
                              <VStack align="start" spacing={0}>
                                <HStack>
                                  <Text fontWeight="semibold" fontSize="sm">
                                    📊 Irrigation Summary Mode
                                  </Text>
                                  {isSummaryMode && (
                                    <Badge colorScheme="blue" size="sm">
                                      Active
                                    </Badge>
                                  )}
                                </HStack>
                                <Text fontSize="xs" color="gray.600">
                                  {isSummaryMode
                                    ? 'Log multiple irrigations as one summary (e.g., "12 irrigations in May")'
                                    : 'Enable to log multiple irrigation events at once'}
                                </Text>
                              </VStack>
                              <Controller
                                name="is_summary"
                                control={methods.control}
                                render={({ field }) => (
                                  <Switch
                                    colorScheme="blue"
                                    size="lg"
                                    isChecked={field.value === 'true'}
                                    onChange={(e) =>
                                      field.onChange(e.target.checked ? 'true' : 'false')
                                    }
                                  />
                                )}
                              />
                            </HStack>
                          </Box>

                          {/* Sprint 4: Aggregate Irrigation Fields (shown when summary mode is active) */}
                          {isSummaryMode && (
                            <>
                              <StandardField
                                label="Period Start Date"
                                helpText="When did this irrigation period begin?"
                                isRequired
                              >
                                <Controller
                                  name="date_start"
                                  control={methods.control}
                                  render={({ field }) => <Input {...field} type="date" size="md" />}
                                />
                              </StandardField>

                              <StandardField
                                label="Period End Date"
                                helpText="When did this irrigation period end?"
                                isRequired
                              >
                                <Controller
                                  name="date_end"
                                  control={methods.control}
                                  render={({ field }) => <Input {...field} type="date" size="md" />}
                                />
                              </StandardField>

                              <StandardField
                                label="Number of Irrigations"
                                helpText="How many irrigation events occurred during this period?"
                                isRequired
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
                                    />
                                  )}
                                />
                              </StandardField>

                              <StandardField
                                label="Total Water Volume"
                                helpText="Combined water used across all irrigation events"
                                isRequired
                              >
                                <HStack spacing={2}>
                                  <Controller
                                    name="water_volume_total"
                                    control={methods.control}
                                    render={({ field }) => (
                                      <StandardInput
                                        {...field}
                                        flex={2}
                                        type="number"
                                        step="0.01"
                                        placeholder="e.g., 50000"
                                      />
                                    )}
                                  />
                                  <Controller
                                    name="water_volume_unit"
                                    control={methods.control}
                                    render={({ field }) => (
                                      <StandardSelect {...field} flex={1}>
                                        <option value="gallons">Gallons</option>
                                        <option value="liters">Liters</option>
                                        <option value="acre_feet">Acre-feet</option>
                                        <option value="cubic_meters">Cubic Meters</option>
                                      </StandardSelect>
                                    )}
                                  />
                                </HStack>
                              </StandardField>
                            </>
                          )}

                          <StandardField
                            label="Water Source"
                            helpText="Primary water source for this irrigation"
                          >
                            <Controller
                              name="water_source"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardSelect {...field} placeholder="Select water source...">
                                  <option value="well_groundwater">Well/Groundwater</option>
                                  <option value="municipal">Municipal Water Supply</option>
                                  <option value="rainwater_harvesting">Rainwater Harvesting</option>
                                  <option value="irrigation_canal">
                                    Irrigation Canal/District
                                  </option>
                                  <option value="river_stream">River/Stream</option>
                                  <option value="pond_reservoir">Pond/Reservoir</option>
                                  <option value="recycled_water">Recycled/Reclaimed Water</option>
                                  <option value="other">Other (specify in notes)</option>
                                </StandardSelect>
                              )}
                            />
                          </StandardField>

                          {/* ENHANCED: USDA NASS 2023 irrigation method for water estimation */}
                          <StandardField
                            label="Irrigation Method"
                            helpText="Type of irrigation system used (affects water usage calculation)"
                          >
                            <Controller
                              name="irrigation_method"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardSelect
                                  {...field}
                                  placeholder="Select irrigation method..."
                                >
                                  <option value="drip">Drip Irrigation (most efficient)</option>
                                  <option value="micro_sprinkler">Micro-sprinkler</option>
                                  <option value="sprinkler">Sprinkler System</option>
                                  <option value="center_pivot">Center Pivot</option>
                                  <option value="flood">Flood/Furrow Irrigation</option>
                                  <option value="subsurface">Subsurface Drip</option>
                                  <option value="hand_watering">Hand Watering</option>
                                  <option value="other">Other Method</option>
                                </StandardSelect>
                              )}
                            />
                          </StandardField>

                          {/* ENHANCED: Irrigation depth for USDA NASS 2023 water volume calculation */}
                          <StandardField
                            label="Irrigation Depth"
                            helpText="Water depth applied (USDA: 27,154 gal/acre per inch)"
                          >
                            <HStack spacing={2}>
                              <Controller
                                name="irrigation_depth"
                                control={methods.control}
                                render={({ field }) => (
                                  <StandardInput
                                    {...field}
                                    flex={2}
                                    type="number"
                                    step="0.1"
                                    placeholder="1.0"
                                  />
                                )}
                              />
                              <Controller
                                name="irrigation_depth_unit"
                                control={methods.control}
                                render={({ field }) => (
                                  <StandardSelect {...field} flex={1}>
                                    <option value="inches">Inches</option>
                                    <option value="cm">Centimeters</option>
                                  </StandardSelect>
                                )}
                              />
                            </HStack>
                          </StandardField>

                          {/* Phase 3: Well pump depth — affects electricity emission calculation */}
                          <StandardField
                            label={intl.formatMessage({
                              id: 'app.pumpDepthFt',
                              defaultMessage: 'Well Pump Depth (ft)'
                            })}
                            helpText={intl.formatMessage({
                              id: 'app.pumpDepthFtHelp',
                              defaultMessage:
                                'Deeper wells use more energy — affects carbon calculation accuracy'
                            })}
                            error={errors.pump_depth_ft?.message}
                          >
                            <Controller
                              name="pump_depth_ft"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardInput
                                  {...field}
                                  type="number"
                                  step="1"
                                  min="0"
                                  placeholder={intl.formatMessage({
                                    id: 'app.pumpDepthFtPlaceholder',
                                    defaultMessage: 'e.g., 200'
                                  })}
                                />
                              )}
                            />
                          </StandardField>

                          {/* Phase 3: Electricity source — determines pump emission factor */}
                          <StandardField
                            label={intl.formatMessage({
                              id: 'app.electricitySource',
                              defaultMessage: 'Pump Power Source'
                            })}
                            helpText={intl.formatMessage({
                              id: 'app.electricitySourceHelp',
                              defaultMessage: 'Solar/wind powered pumps have near-zero emissions'
                            })}
                          >
                            <Controller
                              name="electricity_source"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardSelect
                                  {...field}
                                  placeholder={intl.formatMessage({
                                    id: 'app.electricitySourcePlaceholder',
                                    defaultMessage: 'Select power source...'
                                  })}
                                >
                                  <option value="grid">
                                    {intl.formatMessage({
                                      id: 'app.electricitySource.grid',
                                      defaultMessage: 'Grid Electricity'
                                    })}
                                  </option>
                                  <option value="solar">
                                    {intl.formatMessage({
                                      id: 'app.electricitySource.solar',
                                      defaultMessage: 'Solar'
                                    })}
                                  </option>
                                  <option value="wind">
                                    {intl.formatMessage({
                                      id: 'app.electricitySource.wind',
                                      defaultMessage: 'Wind'
                                    })}
                                  </option>
                                  <option value="diesel_generator">
                                    {intl.formatMessage({
                                      id: 'app.electricitySource.dieselGenerator',
                                      defaultMessage: 'Diesel Generator'
                                    })}
                                  </option>
                                  <option value="mixed">
                                    {intl.formatMessage({
                                      id: 'app.electricitySource.mixed',
                                      defaultMessage: 'Mixed Sources'
                                    })}
                                  </option>
                                </StandardSelect>
                              )}
                            />
                          </StandardField>
                        </>
                      )}
                    </SimpleGrid>

                    <Box
                      bg="teal.50"
                      p={3}
                      borderRadius="md"
                      borderLeft="4px"
                      borderLeftColor="teal.400"
                      mt={4}
                    >
                      <HStack spacing={2} mb={1}>
                        <Icon as={FaSeedling} color="teal.500" fontSize="sm" />
                        <Text fontSize="sm" fontWeight="semibold" color="teal.700">
                          Why This Matters to Consumers
                        </Text>
                      </HStack>
                      <Text fontSize="xs" color="teal.600">
                        Consumers increasingly want to know where their food comes from and how it
                        was produced. Documenting your input sources builds trust and demonstrates
                        your commitment to sustainable, transparent farming practices.
                      </Text>
                    </Box>
                  </SectionBox>
                )}

                {/* Observations */}
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
                    helpText="Share details about this production activity that help consumers understand your farming practices"
                  >
                    <Controller
                      name="observation"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardTextarea
                          {...field}
                          placeholder="Optional: Describe the conditions that affected this production activity, efficiency measures taken, or any observations that consumers might find valuable."
                          rows={4}
                        />
                      )}
                    />
                  </StandardField>
                </SectionBox>
              </>
            )}

            {/* Phase 2.3: Custom Fields Section */}
            <CustomFieldsForm
              customFields={customFields}
              onCustomFieldsChange={setCustomFields}
              eventTypeId={1}
              disabled={false}
            />

            {/* Navigation */}
            {!hideActions && (
              <Box pt={4} mt={4} borderTop="1px" borderColor={borderColor}>
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
ProductionTab.displayName = 'ProductionTab';

export default ProductionTab;
