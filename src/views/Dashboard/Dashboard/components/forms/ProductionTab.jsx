// ENHANCED PRODUCTION TAB - CARBON CALCULATION OPTIMIZED
// Focuses on production data critical for carbon footprint calculations
// Sprint 2 Epic 2.1: Equipment Maintenance merged as subtype (EQ)

import {
  HStack,
  Box,
  VStack,
  Text,
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
  CollapsibleSection,
  SectionHeader,
  SectionBox,
  StandardNumberInput
} from 'components/Design/StandardComponents';
import { CarbonImpactPreview } from 'components/Events/CarbonImpactPreview';
import { maturityMeasuresForCrop } from 'config/harvestMaturity';
import {
  FaChevronLeft,
  FaChevronRight,
  FaSeedling,
  FaBalanceScale,
  FaTruck,
  FaTools,
  FaShieldAlt
} from 'react-icons/fa';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle
} from 'react';
import { object, string, array } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIntl } from 'react-intl';
import {
  SEED_NONAVAILABILITY_REASONS,
  SEED_NON_GMO_STATUSES,
  SEED_TREATMENT_BASES
} from 'config/events/enums';
import { AREA_SUBTYPES, BUFFER_ENTERS_COMMERCE } from 'config/events/productionEvent';
import { CONSUMER_WITHHELD_PRODUCTION_SUBTYPES, isEventOnBuyerPage } from 'utils/consumerDisplay';
// Import through the barrel, not productionEvent directly: `config/events/index.ts` is what
// calls `_setRegistry`, and `getSubtypes` answers with nothing until it has run.
import { getSubtypes } from 'config/events';
import CustomFieldsForm from './CustomFieldsForm';
import { SupervisorSignOff } from 'components/Forms/SupervisorSignOff';
// Event Field Registry (Phase 5G — form integration)
import { useFormFields } from 'src/hooks/useFormFields';
import { useDefaultUnits } from 'src/hooks/useMeasurementSystem';
// Boolean defaults must survive the wizard's string round-trip — see utils/formToggle.
import { asToggle } from 'utils/formToggle';
// §E-5 — the cleaning-event picker needs this production's sibling EM events.
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetCurrentHistoryQuery, useGetSeedSuppliersQuery } from 'store/api/historyApi';
import { RegistryFormField } from 'src/components/Forms/RegistryFormField';
import { BlockIdField } from 'components/Fields/BlockIdField';
import { offersSummaryMode, unrenderedProductionKeys } from 'utils/productionPayloadGates';
import { harvestGradeOptions, MAX_GRADE_LENGTH, OTHER_GRADE } from 'config/harvestGrades';

// Sprint 2 Epic 2.1: Equipment operation types (merged from EquipmentTab)
// Labels live in the catalogues (recordkeeping review S8: the crew's screens were half English).
const EQUIPMENT_OPERATION_TYPES = ['FC', 'MN', 'RE', 'CA', 'BD', 'EI', 'CL'].map((value) => ({
  value,
  labelKey: `events.equipmentOperation.${value}`
}));

// Sprint 2 Epic 2.1: Equipment types (merged from EquipmentTab)
const EQUIPMENT_TYPES = [
  'tractor',
  'harvester',
  'sprayer',
  'truck',
  'generator',
  'pump',
  'other'
].map((value) => ({ value, labelKey: `events.equipmentTypes.${value}` }));

// Sprint 2 Epic 2.1: Fuel types with EPA-verified emission factors (merged from EquipmentTab)
// UPDATED 2026-02-15: All factors corrected to match EPA 40 CFR Part 98 Table C-1
// Key 'lpg' standardized to 'propane' to match backend choices.py SSOT
const FUEL_TYPES = [
  { value: 'diesel', label: 'Diesel', factor: '2.70 kg CO₂e/L' },
  { value: 'gasoline', label: 'Gasoline', factor: '2.32 kg CO₂e/L' },
  { value: 'natural_gas', label: 'Natural Gas', factor: '1.92 kg CO₂e/m³' },
  { value: 'propane', label: 'LPG / Propane', factor: '1.51 kg CO₂e/L' },
  { value: 'electric', label: 'Electric', factor: '0.365 kg CO₂e/kWh' },
  { value: 'biodiesel', label: 'Biodiesel', factor: '2.31 kg CO₂e/L' },
  { value: 'none', label: 'No Fuel / Manual', factor: '0 kg CO₂e' }
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
  MO: 'Mowing / Orchard-Floor',
  // Batch 4 (2026-08-19): activities Quick Organics offers that Trazo could only record as
  // fields buried on some other event.
  TP: 'Transport',
  BU: 'Buffer Use',
  SS: 'Seed Search'
};

// The record's auto-name in the farmer's language (recordkeeping review S8, F-18: "Harvesting"
// and "Equipment Maintenance" landed as the name of Spanish records). Same keys the subtype
// picker shows (config/events/productionEvent.ts).
const PRODUCTION_TYPE_LABEL_KEYS = {
  PL: 'events.production.subtypes.planting',
  HA: 'events.production.subtypes.harvesting',
  IR: 'events.production.subtypes.irrigation',
  PR: 'events.production.subtypes.pruning',
  TR: 'events.production.subtypes.transplanting',
  CU: 'events.production.subtypes.cultivation',
  TH: 'events.production.subtypes.thinning',
  EM: 'events.production.subtypes.equipmentMaintenance',
  PO: 'events.production.subtypes.pollination',
  PH: 'events.production.subtypes.postHarvest',
  CM: 'events.production.subtypes.canopyManagement',
  FP: 'events.production.subtypes.frostProtection',
  MO: 'events.production.subtypes.mowing',
  TP: 'events.production.subtypes.transport',
  BU: 'events.production.subtypes.bufferUse',
  SS: 'events.production.subtypes.seedSearch'
};

/**
 * `water_test_results` is a JSONField of {parameter, value, unit, result} dicts. The grower
 * types free lines ("E. coli: <1 MPN/100mL"); this parses them into that shape on save and
 * renders them back to lines on edit. Added 2026-08-15 — the packet column existed with no
 * input behind it, so the water-quality table proved a test was ordered and showed no result.
 */
const summarizeWaterTestResults = (rows) =>
  Array.isArray(rows)
    ? rows
        .map((r) =>
          r && typeof r === 'object'
            ? [r.parameter, [r.value, r.unit].filter(Boolean).join(' ')].filter(Boolean).join(': ')
            : String(r ?? '')
        )
        .filter(Boolean)
        .join('\n')
    : '';

const parseWaterTestSummary = (text) =>
  String(text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(':');
      if (idx === -1) return { parameter: line, value: '', unit: '', result: '' };
      const parameter = line.slice(0, idx).trim();
      const rest = line.slice(idx + 1).trim();
      const m = rest.match(/^(\S+)\s*(.*)$/);
      return { parameter, value: m ? m[1] : rest, unit: m ? m[2] : '', result: rest };
    });

/**
 * Seed-search rows written before 2026-08-15 used `supplier`; the packet, the model
 * help_text and the demo seeder all use `supplier_name`. Normalise on the way into the
 * form so a legacy row prefills its supplier instead of showing an empty box — and so
 * saving it migrates the row rather than stripping it (zod's object() drops unknown keys).
 */
const normalizeSeedSearchRows = (rows) =>
  (Array.isArray(rows) ? rows : []).map((row) => ({
    supplier_name: row?.supplier_name ?? row?.supplier ?? '',
    date_contacted: row?.date_contacted ?? '',
    result: row?.result ?? '',
    notes: row?.notes ?? ''
  }));

// ENHANCED SCHEMA - Carbon calculation focused with Phase 1.3 validation
// Sprint 2 Epic 2.1: Added equipment fields, made area_covered optional for EM type
// Sprint 2: Event name is now auto-generated from production type (removes farmer burden)
// CRITICAL FIX (2025-01-21): Changed EQ → EM to match backend Production event model
const formSchemaMainInfo = object({
  // A message KEY, rendered through intl at the field: a schema at module scope cannot call intl.
  type: string().min(1, 'events.production.validation.typeRequired'),
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
  // §E-5 — custom operator + the EM cleaning event covering this operation (7 CFR 205.272)
  operator_is_custom: string().optional(),
  equipment_cleaning_event: string().optional(),
  cleaning_protocol_reference: string().optional(),
  // NOP Compliance: Post-Harvest Sanitizer (7 CFR 205.272 + § 205.605)
  sanitizer_name: string().optional(),
  sanitizer_ppm: string().optional(),
  sanitizer_residual_ppm_at_discharge: string().optional(),
  rinse_step_documented: string().optional(),
  sanitizer_nop_reference: string().optional(),
  // Phase 2: Target market fields for harvest events
  harvest_quality_grade: string().optional(),
  // WS-4 — harvest-record completeness (§ 205.103(b)(2); § 205.202(c))
  harvest_lot_code: string().optional(),
  amount_determination: string().optional(),
  harvest_date_end: string().optional(),
  harvest_destination: string().optional(),
  // Off-farm handling round trip — CCOF item 6 (2026-08-16).
  sent_to_handler_date: string().optional(),
  quantity_sent_to_handler: string().optional(),
  quantity_returned_from_handler: string().optional(),
  handler_quantity_unit: string().optional(),
  handler_return_unit: string().optional(),
  handler_document_reference: string().optional(),
  buffer_disposition: string().optional(),
  buffer_disposition_quantity: string().optional(),
  buffer_disposition_evidence: string().optional(),
  harvest_contract_number: string().optional(),
  cleaning_asset_class: string().optional(),
  applied_scope: string().optional(),
  purge_material: string().optional(),
  purge_quantity: string().optional(),
  purge_material_end_use: string().optional(),
  transport_origin: string().optional(),
  transport_destination_address: string().optional(),
  applied_scope_detail: string().optional(),
  storage_location: string().optional(),
  storage_temperature_f: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= -40 && num <= 150;
    }, 'Storage temperature must be between -40 and 150 °F'),
  grain_moisture: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 100;
    }, 'Grain moisture must be between 0 and 100%'),
  // Phase 2: Additional harvest fields for Quick Add parity
  harvest_method: string().optional(),
  // F43: tree-crop maturity (avocado/nut). brix_levels (plural) was dead — removed.
  dry_matter_percentage: string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 100;
    }, 'Dry matter must be between 0 and 100%'),
  // Production method for manual-operation detection (enables accurate carbon for hand labor)
  // Documenting "Hand thinning", "Pruning shears", etc. routes to ~5 kg manual estimate
  // instead of USDA blanket mechanical averages (~150 kg for thinning, ~600 kg for pruning).
  production_method: string().optional(),
  observation: string().optional(),
  private_note: string().optional(),
  // FSMA PSR § 112.161(b) sign-off. Harvest/packing (§ 112.140) and animal-intrusion
  // monitoring (§ 112.83) are part-112 records. `reviewed` rides the `...data` spread as a
  // 'true'/'false' STRING, so it is coerced to a real boolean just below.
  reviewed: string().optional(),
  reviewer_name: string().optional(),
  review_date: string().optional(),
  // Sprint 3 Epic 3.2: Consumer Trust Fields for transparency
  seeds_source: string().optional(), // Where seeds/seedlings came from
  // NOP 7 CFR 205.204 — Seed Traceability (planting subtype)
  seed_supplier_name: string().optional(),
  seed_purchase_date: string().optional(),
  seed_purchase_invoice: string().optional(),
  seed_lot_number: string().optional(),
  seed_certification_status: string().optional(),
  seed_treatment: string().optional(),
  seed_treatment_allowed_basis: string().optional(),
  seed_non_gmo_status: string().optional(),
  stock_organic_management_start: string().optional(),
  // Perennial planting stock (PL/TR) — 2026-08-15
  rootstock: string().optional(),
  plants_established: string().optional(),
  plant_spacing: string().optional(),
  seed_nonavailability_reason: string().optional(),
  // NOP 5029 / 7 CFR 205.204(a)(1) — organic-seed commercial-availability search
  // Row shape MUST match what the certifier packet reads
  // (audit_export_service._build_seed_stock_section): supplier_name / date_contacted /
  // result / notes. zod's object() STRIPS unknown keys, so a shape mismatch here does not
  // just mislabel the column — it silently deletes the value on every save.
  seed_search_attempts: array(
    object({
      supplier_name: string().optional(),
      date_contacted: string().optional(),
      result: string().optional(),
      notes: string().optional()
    })
  ).optional(),
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
  // NOP irrigation/well water test (7 CFR 205.272 / 205.671)
  water_test_date: string().optional(),
  water_test_lab: string().optional(),
  // 🔴 2026-08-15 — the packet prints a "Results" column off `water_test_results` and had no
  // input behind it, so the Water Quality table proved a test was ORDERED and showed no result.
  water_test_summary: string().optional(),
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
      return !isNaN(num) && num >= 0 && num <= 45;
    }, 'Brix level must be between 0 and 45'),
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
  floor_management_type: string().optional(), // MO: mow / mulch / cover_crop_mgmt / flame_weed
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

/**
 * The tab's schema. With several parcels (`multiTarget`) there is no summary mode: a summary
 * stands for many applications over a period, never one application on several parcels, and the
 * server refuses its keys in a multi-parcel save. A stale `is_summary` left on from before the
 * parcels were picked must not demand summary fields the form no longer shows.
 */
const buildProductionSchema = (multiTarget = false) =>
  formSchemaMainInfo.superRefine((data, ctx) => {
    // The asterisks below used to be decorative — `required` props over `.optional()`
    // keys (and eleven props using a name StandardField does not have, silently dropped), so an EM
    // record could save with no operation type and a summary event could save with
    // no period at all. Each rule here backs a rendered asterisk; keep them paired.
    const req = (path, message) => {
      const value = data[path];
      if (value == null || value === '') {
        ctx.addIssue({ code: 'custom', path: [path], message });
      }
    };
    if (data.type === 'EM') {
      req('equipment_operation_type', 'Select what kind of equipment operation this was');
    }
    // Scoped to the three subtypes that RENDER a summary toggle: a stale is_summary
    // carried across a subtype switch must not demand fields the form no longer shows.
    if (!multiTarget && ['HA', 'PR', 'IR'].includes(data.type) && data.is_summary === 'true') {
      req('date_start', 'A summary needs the period start date');
      req('date_end', 'A summary needs the period end date');
      if (data.type === 'HA') {
        req('event_count', 'How many harvest picks does this summary cover?');
        req('yield_total', 'A harvest summary needs the total yield');
      }
      if (data.type === 'PR') {
        req('pruning_passes', 'A pruning summary needs the number of passes');
      }
      if (data.type === 'IR') {
        req('event_count', 'How many irrigation events does this summary cover?');
        req('water_volume_total', 'An irrigation summary needs the total water volume');
      }
    }
  });

const FUEL_CONSUMED_INPUT_ID = 'production-fuel-consumed';

/**
 * Subtypes that can report powered equipment, and therefore the ONLY ones that show the
 * "Fuel Consumption & Equipment Data" section.
 *
 * This list was written out inline three times for the individual fields, while the section
 * WRAPPING them was gated on nothing but `productionType !== 'PO'`. So Buffer Use, Transport
 * and Seed Search rendered the section header, its "Optional — carbon only" badge and its
 * intro copy with no fuel fields inside — the only control left was Equipment Hours, which
 * no calculator reads. A farmer logging a buffer harvest saw a fuel section, typed 10 hours
 * into it, and got 0 kg CO₂e.
 *
 * TP is included: the production callout promises "transport from harvest to storage is
 * counted here rather than against field equipment, so nothing is double-counted", which is
 * only true if the operator can actually enter the haul fuel. The backend already counts it
 * (`_calculate_reported_fuel_only_emissions`).
 *
 * BU and SS stay out. SS is a phone-and-catalogue search. BU's buffer rows are often taken
 * in the same pass as the main harvest, which is logged as its own HA event — offering a
 * second fuel entry there invites double-counting, and that is a product decision rather
 * than a gap to quietly fill.
 */
const FUEL_REPORTING_SUBTYPES = [
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
  'MO',
  'TP'
];

/**
 * Which per-parcel amounts this form itself asks, for the cards that ask them with several
 * parcels: the cards must never ask what the single-parcel form does not. Fuel and machine hours
 * live in the fuel section (FUEL_REPORTING_SUBTYPES only; not pollination), and irrigation on
 * anything but a diesel pump asks no fuel at all: its energy is calculated from the water.
 * Mirrors the render gates below; `productionTabSeveralParcels.test.tsx` holds them together.
 */
export const productionAsksPerParcel = (type, fuelType) => ({
  fuel: FUEL_REPORTING_SUBTYPES.includes(type) && !(type === 'IR' && fuelType !== 'diesel'),
  hours: FUEL_REPORTING_SUBTYPES.includes(type)
});

const ProductionTab = forwardRef(
  (
    {
      onSubmitHandler,
      onDataChange,
      onPrev,
      initialValues = {},
      hideActions = false,
      /**
       * Hide the raw subtype select because the wizard already asked.
       *
       * ⛔ Hiding it does NOT stop `type` being posted: the field stays in the form's
       * defaultValues (seeded from `initialValues.type`), so validation and every
       * `.includes(data.type)` payload gate keep working. It removes a SECOND ask, not the
       * answer. NewEvent passes this on every create path — a verb tile, a season-plan item
       * or step 0's ActivitySubtypeChooser has answered by the time this mounts.
       */
      hideSubtypeSelect = false,
      /**
       * Who wrote the name in the form (Run 8b R4): 'auto' (this tab generated it), 'operator'
       * (typed into the name field) or 'unknown' (edit, repeat, a restored draft). The wizard
       * owns it because the tab remounts on every template or voice merge and would forget.
       * Only 'auto' regenerates. A blank name is filled unless the operator cleared it.
       */
      nameOrigin = 'auto',
      /** Called when the operator types in the name field, so the wizard records the origin. */
      onNameEdited,
      carbonCalculation = null,
      isCalculatingCarbon = false,
      /**
       * Several parcels: what differs per parcel (area, scope, section, fuel, hours, depth,
       * plants, hives) is asked on each parcel's card below the form, so its input is left out
       * here; units stay, because the cards read them. Summary mode is off. The keys come from
       * the server's spec (`multiParcelSpec.json`, type 1).
       */
      multiTarget = false
    },
    ref
  ) => {
    const intl = useIntl();
    const productionSchema = React.useMemo(() => buildProductionSchema(multiTarget), [multiTarget]);

    /**
     * Send the operator to the fuel input the carbon panel is talking about. When fuel is
     * blank the calculation substitutes a national average, and this is the one control
     * that turns that assumption back into a record.
     */
    const focusFuelConsumed = useCallback(() => {
      const input = document.getElementById(FUEL_CONSUMED_INPUT_ID);
      if (!input) return;
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Focus after the smooth scroll settles, or the browser fights it.
      window.setTimeout(() => input.focus(), 300);
    }, []);
    // US-first unit defaults — see useMeasurementSystem. area_unit was already 'acres'
    // here; yield and fuel were not, so a US harvest defaulted to kilograms and litres.
    const defaultUnits = useDefaultUnits();
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const [customFields, setCustomFields] = useState(initialValues.custom_fields || []);

    // §E-5 — the EM cleaning events already logged on this production, so a farmer can point a
    // shared-equipment or custom-operator pass at the cleaning that preceded it (7 CFR 205.272).
    // Without this the FK would exist on the model and be unreachable from the UI.
    const { farmId, parcelId } = useParams();

    // Suppliers this farm has recorded before (§ 205.204(a)(1) / USDA Form 10 Part A).
    // A supplier list only earns its keep if it survives the season — retyping "Sacramento
    // Rootstock Co." from memory every March is how the same vendor ends up in the record
    // under four spellings, and an inspector matching invoices to search rows cannot tell
    // they are one company.
    const { data: seedSupplierData } = useGetSeedSuppliersQuery(
      { establishmentId: farmId },
      { skip: !farmId }
    );
    const seedSupplierNames = React.useMemo(
      () =>
        Array.isArray(seedSupplierData)
          ? seedSupplierData.map((row) => row.supplier_name).filter(Boolean)
          : [],
      [seedSupplierData]
    );
    const currentCompanyId = useSelector((state) => state.company.currentCompany?.id);
    const { data: currentProduction } = useGetCurrentHistoryQuery(
      { companyId: currentCompanyId, farmId, parcelId },
      { skip: !currentCompanyId || !farmId || !parcelId }
    );
    // F5 — which grade family this pick's crop belongs to. The crop_type slug is the exact
    // key `harvestGrades` is written against; the product name is the fallback for older
    // productions that carry no crop_type (the COG Pro importer can create one).
    const harvestCropName =
      currentProduction?.crop_type?.slug ||
      currentProduction?.crop_type?.name ||
      currentProduction?.product ||
      '';
    // Which maturity measures this crop actually has. 🔴 Audit T05: grain moisture, Brix and
    // avocado/nut dry matter rendered on EVERY harvest form, so a carrot pick asked for all
    // three with "Leave blank if N/A" — the instruction the audit called evidence that the
    // interface should hide the field by context. An unmapped crop still gets all three.
    const maturity = maturityMeasuresForCrop(harvestCropName);

    // Whether the operator picked "Other" and is typing a grade the catalogue does not carry.
    // State, not derived from the value, so the empty box right after choosing "Other" does
    // not snap the select back to the placeholder.
    const [isTypingOwnGrade, setIsTypingOwnGrade] = useState(false);
    // Whether the § 205.272 cleaning-link control is on screen at all.
    //
    // 🔴 It used to render for EVERY production subtype, including Planting, where the
    // dropdown was invariably empty. An always-rendered control whose value is always ''
    // meant `onSubmit` posted `equipment_cleaning_event: null` on every save — so editing an
    // event that HAD a link, on a form that could not show it, silently destroyed the link.
    // That is the clobber class the Mutation Payload Rule exists to stop.
    //
    // Deliberately NOT deleted from Planting. § 205.272 asks about shared equipment on ANY
    // pass, and a grower who logged a cleaning before planting is entitled to cite it. The
    // control appears when there is something to pick, or when a link already exists — never
    // as an empty box that can only do harm.
    const showCleaningLink = React.useMemo(() => {
      const events = currentProduction?.events || [];
      const hasOptions = events.some(
        (ev) => (ev.production_type || ev.type) === 'EM' && ev.id !== initialValues.id
      );
      return hasOptions || Boolean(initialValues.equipment_cleaning_event);
    }, [currentProduction, initialValues.id, initialValues.equipment_cleaning_event]);

    const cleaningEventOptions = React.useMemo(() => {
      const events = currentProduction?.events || [];
      return events
        .filter((ev) => {
          // event_type 1 = production; EM is the merged Equipment Maintenance subtype.
          const subtype = ev.production_type || ev.type;
          return subtype === 'EM' && ev.id !== initialValues.id;
        })
        .map((ev) => ({
          id: ev.id,
          label: [
            ev.cleaning_date || (ev.date ? String(ev.date).slice(0, 10) : ''),
            ev.cleaning_method || ev.name || ev.description || 'Cleaning'
          ]
            .filter(Boolean)
            .join(' — ')
        }));
    }, [currentProduction, initialValues.id]);

    const methods = useForm({
      resolver: zodResolver(productionSchema),
      defaultValues: {
        type: initialValues.type || 'PL',
        // Sprint 2: Auto-generate name from type - fallback to initial name if provided
        name: initialValues.name || PRODUCTION_TYPE_NAMES[initialValues.type || 'PL'] || '',
        area_covered: initialValues.area_covered?.toString() || '',
        area_unit: initialValues.area_unit || defaultUnits.area,
        yield_quantity: initialValues.yield_quantity?.toString() || '',
        yield_unit: initialValues.yield_unit || defaultUnits.yieldUnit,
        fuel_consumed: initialValues.fuel_consumed?.toString() || '',
        fuel_unit: initialValues.fuel_unit || defaultUnits.fuel,
        // Sprint 2 Epic 2.1: Fuel type for Equipment Maintenance
        fuel_type: initialValues.fuel_type || '',
        equipment_hours: initialValues.equipment_hours?.toString() || '',
        // Sprint 2 Epic 2.1: Equipment-specific fields (merged from EquipmentTab)
        equipment_type: initialValues.equipment_type || '',
        equipment_operation_type: initialValues.equipment_operation_type || '',
        operation_efficiency:
          initialValues.operation_efficiency || initialValues.production_efficiency || '',
        transportation_distance: initialValues.transportation_distance?.toString() || '',
        transportation_unit: initialValues.transportation_unit || 'km',
        production_efficiency: initialValues.production_efficiency || '',
        // Phase 2: Target market fields
        harvest_quality_grade: initialValues.harvest_quality_grade || '',
        harvest_lot_code: initialValues.harvest_lot_code || '',
        amount_determination: initialValues.amount_determination || '',
        harvest_date_end: initialValues.harvest_date_end || '',
        harvest_destination: initialValues.harvest_destination || '',
        sent_to_handler_date: initialValues.sent_to_handler_date || '',
        quantity_sent_to_handler: initialValues.quantity_sent_to_handler?.toString() ?? '',
        quantity_returned_from_handler:
          initialValues.quantity_returned_from_handler?.toString() ?? '',
        handler_quantity_unit: initialValues.handler_quantity_unit || 'lbs',
        handler_return_unit: initialValues.handler_return_unit || 'lbs',
        handler_document_reference: initialValues.handler_document_reference || '',
        buffer_disposition: initialValues.buffer_disposition || '',
        buffer_disposition_quantity: initialValues.buffer_disposition_quantity || '',
        buffer_disposition_evidence: initialValues.buffer_disposition_evidence || '',
        storage_location: initialValues.storage_location || '',
        storage_temperature_f: initialValues.storage_temperature_f?.toString() || '',
        harvest_contract_number: initialValues.harvest_contract_number || '',
        cleaning_asset_class: initialValues.cleaning_asset_class || '',
        applied_scope: initialValues.applied_scope || '',
        // A field absent from defaultValues is WIPED by the reset() this form runs on
        // subtype/initialValues change: react-hook-form resets to exactly these keys, so an
        // unlisted one is not left alone, it is dropped. MEASURED: a Transport event saved its
        // endpoints fine when nothing else was touched, and lost them the moment the
        // harvest_destination select re-rendered the section.
        purge_material: initialValues.purge_material || '',
        purge_quantity: initialValues.purge_quantity || '',
        purge_material_end_use: initialValues.purge_material_end_use || '',
        transport_origin: initialValues.transport_origin || '',
        transport_destination_address: initialValues.transport_destination_address || '',
        applied_scope_detail: initialValues.applied_scope_detail || '',
        grain_moisture: initialValues.grain_moisture?.toString() || '',
        harvest_method: initialValues.harvest_method || '',
        dry_matter_percentage: initialValues.dry_matter_percentage?.toString() || '',
        // Production method: supports both top-level and extra_data.method
        // (demo data stores it in extra_data.method, e.g. "Hand thinning with pruning shears")
        production_method:
          initialValues.production_method ||
          initialValues.method ||
          initialValues.extra_data?.method ||
          '',
        observation: initialValues.observation || '',
        private_note: initialValues.private_note || '',
        reviewed:
          initialValues.reviewed === true || initialValues.reviewed === 'true' ? 'true' : 'false',
        reviewer_name: initialValues.reviewer_name || '',
        review_date: initialValues.review_date || '',
        // Sprint 3 Epic 3.2: Consumer Trust Fields
        seeds_source: initialValues.seeds_source || '',
        // NOP 7 CFR 205.204 — Seed Traceability (planting subtype)
        seed_supplier_name: initialValues.seed_supplier_name || '',
        rootstock: initialValues.rootstock || '',
        plants_established: initialValues.plants_established?.toString() ?? '',
        plant_spacing: initialValues.plant_spacing || '',
        seed_purchase_date: initialValues.seed_purchase_date || '',
        seed_purchase_invoice: initialValues.seed_purchase_invoice || '',
        seed_lot_number: initialValues.seed_lot_number || '',
        seed_certification_status: initialValues.seed_certification_status || '',
        seed_treatment: initialValues.seed_treatment || '',
        seed_treatment_allowed_basis: initialValues.seed_treatment_allowed_basis || '',
        seed_non_gmo_status: initialValues.seed_non_gmo_status || '',
        stock_organic_management_start: initialValues.stock_organic_management_start || '',
        seed_nonavailability_reason: initialValues.seed_nonavailability_reason || '',
        seed_search_attempts: normalizeSeedSearchRows(initialValues.seed_search_attempts),
        water_source: initialValues.water_source || '',
        // ENHANCED: USDA NASS 2023 irrigation water estimation fields
        irrigation_method: initialValues.irrigation_method || '',
        // Phase 3: Irrigation pump fields
        pump_depth_ft: initialValues.pump_depth_ft?.toString() || '',
        electricity_source: initialValues.electricity_source || '',
        water_test_date: initialValues.water_test_date || '',
        water_test_lab: initialValues.water_test_lab || '',
        // The form's own value wins. `initialValues` is the wizard's running snapshot (it never
        // carries `water_test_results` — that is derived at submit), so re-deriving here on
        // every snapshot change reset the textarea to '' under the farmer's hands (2026-08-21:
        // an irrigation record kept only the tail of its water-test results).
        water_test_summary:
          initialValues.water_test_summary ??
          summarizeWaterTestResults(initialValues.water_test_results),
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
        shared_with_conventional: asToggle(initialValues.shared_with_conventional),
        operator_is_custom: asToggle(initialValues.operator_is_custom),
        equipment_cleaning_event: initialValues.equipment_cleaning_event
          ? String(initialValues.equipment_cleaning_event)
          : '',
        cleaning_protocol_reference: initialValues.cleaning_protocol_reference || '',
        // NOP Compliance: Post-Harvest Sanitizer (7 CFR 205.272 + § 205.605)
        sanitizer_name: initialValues.sanitizer_name || '',
        sanitizer_ppm: initialValues.sanitizer_ppm ? String(initialValues.sanitizer_ppm) : '',
        sanitizer_residual_ppm_at_discharge: initialValues.sanitizer_residual_ppm_at_discharge
          ? String(initialValues.sanitizer_residual_ppm_at_discharge)
          : '',
        rinse_step_documented: asToggle(initialValues.rinse_step_documented),
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
          area_unit: initialValues.area_unit || defaultUnits.area,
          yield_quantity: initialValues.yield_quantity?.toString() || '',
          yield_unit: initialValues.yield_unit || defaultUnits.yieldUnit,
          fuel_consumed: initialValues.fuel_consumed?.toString() || '',
          fuel_unit: initialValues.fuel_unit || defaultUnits.fuel,
          // Sprint 2 Epic 2.1: Fuel type for Equipment Maintenance
          fuel_type: initialValues.fuel_type || '',
          equipment_hours: initialValues.equipment_hours?.toString() || '',
          // Sprint 2 Epic 2.1: Equipment-specific fields (merged from EquipmentTab)
          equipment_type: initialValues.equipment_type || '',
          equipment_operation_type: initialValues.equipment_operation_type || '',
          operation_efficiency:
            initialValues.operation_efficiency || initialValues.production_efficiency || '',
          transportation_distance: initialValues.transportation_distance?.toString() || '',
          transportation_unit: initialValues.transportation_unit || 'km',
          production_efficiency: initialValues.production_efficiency || '',
          observation: initialValues.observation || '',
          private_note: initialValues.private_note || '',
          reviewed:
            initialValues.reviewed === true || initialValues.reviewed === 'true' ? 'true' : 'false',
          reviewer_name: initialValues.reviewer_name || '',
          review_date: initialValues.review_date || '',
          // Sprint 3 Epic 3.2: Consumer Trust Fields
          seeds_source: initialValues.seeds_source || '',
          // F15 fix (2026-06): the 6 NOP 205.204 seed-traceability fields MUST be in resetData —
          // they're in defaultValues but were omitted here, so methods.reset() on edit wiped the
          // farmer's logged seed records (supplier/date/invoice/lot/cert/treatment).
          seed_supplier_name: initialValues.seed_supplier_name || '',
          rootstock: initialValues.rootstock || '',
          plants_established: initialValues.plants_established?.toString() ?? '',
          plant_spacing: initialValues.plant_spacing || '',
          seed_purchase_date: initialValues.seed_purchase_date || '',
          seed_purchase_invoice: initialValues.seed_purchase_invoice || '',
          seed_lot_number: initialValues.seed_lot_number || '',
          seed_certification_status: initialValues.seed_certification_status || '',
          seed_treatment: initialValues.seed_treatment || '',
          seed_treatment_allowed_basis: initialValues.seed_treatment_allowed_basis || '',
          seed_non_gmo_status: initialValues.seed_non_gmo_status || '',
          stock_organic_management_start: initialValues.stock_organic_management_start || '',
          seed_nonavailability_reason: initialValues.seed_nonavailability_reason || '',
          seed_search_attempts: normalizeSeedSearchRows(initialValues.seed_search_attempts),
          water_source: initialValues.water_source || '',
          // ENHANCED: USDA NASS 2023 irrigation water estimation fields
          irrigation_method: initialValues.irrigation_method || '',
          // Phase 3: Irrigation pump fields
          pump_depth_ft: initialValues.pump_depth_ft?.toString() || '',
          electricity_source: initialValues.electricity_source || '',
          water_test_date: initialValues.water_test_date || '',
          water_test_lab: initialValues.water_test_lab || '',
          // The form's own value wins. `initialValues` is the wizard's running snapshot (it never
          // carries `water_test_results` — that is derived at submit), so re-deriving here on
          // every snapshot change reset the textarea to '' under the farmer's hands (2026-08-21:
          // an irrigation record kept only the tail of its water-test results).
          water_test_summary:
            initialValues.water_test_summary ??
            summarizeWaterTestResults(initialValues.water_test_results),
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
          harvest_lot_code: initialValues.harvest_lot_code || '',
          amount_determination: initialValues.amount_determination || '',
          harvest_date_end: initialValues.harvest_date_end || '',
          harvest_destination: initialValues.harvest_destination || '',
          sent_to_handler_date: initialValues.sent_to_handler_date || '',
          quantity_sent_to_handler: initialValues.quantity_sent_to_handler?.toString() ?? '',
          quantity_returned_from_handler:
            initialValues.quantity_returned_from_handler?.toString() ?? '',
          handler_quantity_unit: initialValues.handler_quantity_unit || 'lbs',
          handler_return_unit: initialValues.handler_return_unit || 'lbs',
          handler_document_reference: initialValues.handler_document_reference || '',
          buffer_disposition: initialValues.buffer_disposition || '',
          buffer_disposition_quantity: initialValues.buffer_disposition_quantity || '',
          buffer_disposition_evidence: initialValues.buffer_disposition_evidence || '',
          storage_location: initialValues.storage_location || '',
          storage_temperature_f: initialValues.storage_temperature_f?.toString() || '',
          harvest_contract_number: initialValues.harvest_contract_number || '',
          cleaning_asset_class: initialValues.cleaning_asset_class || '',
          applied_scope: initialValues.applied_scope || '',
          // A field absent from defaultValues is WIPED by the reset() this form runs on
          // subtype/initialValues change: react-hook-form resets to exactly these keys, so an
          // unlisted one is not left alone, it is dropped. MEASURED: a Transport event saved its
          // endpoints fine when nothing else was touched, and lost them the moment the
          // harvest_destination select re-rendered the section.
          purge_material: initialValues.purge_material || '',
          purge_quantity: initialValues.purge_quantity || '',
          purge_material_end_use: initialValues.purge_material_end_use || '',
          transport_origin: initialValues.transport_origin || '',
          transport_destination_address: initialValues.transport_destination_address || '',
          applied_scope_detail: initialValues.applied_scope_detail || '',
          grain_moisture: initialValues.grain_moisture?.toString() || '',
          harvest_method: initialValues.harvest_method || '',
          dry_matter_percentage: initialValues.dry_matter_percentage?.toString() || '',
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
          shared_with_conventional: asToggle(initialValues.shared_with_conventional),
          operator_is_custom: asToggle(initialValues.operator_is_custom),
          equipment_cleaning_event: initialValues.equipment_cleaning_event
            ? String(initialValues.equipment_cleaning_event)
            : '',
          cleaning_protocol_reference: initialValues.cleaning_protocol_reference || '',
          // NOP Compliance: Post-Harvest Sanitizer (7 CFR 205.272 + § 205.605)
          sanitizer_name: initialValues.sanitizer_name || '',
          sanitizer_ppm: initialValues.sanitizer_ppm ? String(initialValues.sanitizer_ppm) : '',
          sanitizer_residual_ppm_at_discharge: initialValues.sanitizer_residual_ppm_at_discharge
            ? String(initialValues.sanitizer_residual_ppm_at_discharge)
            : '',
          rinse_step_documented: asToggle(initialValues.rinse_step_documented),
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
    // Buffer use, seed search, equipment cleanout and transport are withheld WHOLE from every
    // public serializer (claim_authority._CONSUMER_WITHHELD_PRODUCTION_SUBTYPES), so their note
    // never reaches the buyer page. The notes section must say so instead of promising a
    // public note. Read from the mirror, never a local list.
    const noteIsCertifierOnly = !isEventOnBuyerPage({
      event_type: 1,
      production_type: productionType
    });

    /*
     * The subtype list the select renders — the display registry's, not a local copy.
     *
     * There were four lists of the same sixteen codes (backend PRODUCTION_EVENTS, this
     * file's <option> block, PRODUCTION_TYPE_NAMES, and config/events) and they had already
     * drifted: TP/BU/SS shipped to three of them and never to the registry.
     *
     * Read at RENDER time on purpose. `getSubtypes` answers from a registry that
     * `config/events/index.ts` populates when IT evaluates; a module-scope
     * `const OPTIONS = getSubtypes(1)` here would snapshot whatever existed at this file's
     * evaluation and could never recover — an empty select, permanently, if a bundler ever
     * ordered the two modules the other way. Eight entries and a find; the cost is nothing.
     */
    const subtypeOptions = React.useMemo(() => getSubtypes(1), []);
    // Sprint 4: Watch for summary mode toggle
    const isSummaryMode = !multiTarget && watch('is_summary') === 'true';
    // NOP: Watch shared_with_conventional for visual feedback on cleaning section
    const isSharedWithConventional = watch('shared_with_conventional') === 'true';

    // NOP 5029 / 7 CFR 205.204(a)(1): non-organic seed/planting stock requires a
    // documented >=3-supplier commercial-availability search. The widget appears only
    // when the farmer selects a non-organic seed certification status.
    const seedCertStatus = watch('seed_certification_status');
    const needsSeedSearch =
      seedCertStatus === 'non_organic_untreated' || seedCertStatus === 'non_organic_treated';
    const seedSearchAttempts = watch('seed_search_attempts') || [];
    const addSeedSearch = () =>
      methods.setValue(
        'seed_search_attempts',
        [
          ...(methods.getValues('seed_search_attempts') || []),
          { supplier_name: '', date_contacted: '', result: '', notes: '' }
        ],
        { shouldDirty: true }
      );
    const removeSeedSearch = (idx) => {
      const next = [...(methods.getValues('seed_search_attempts') || [])];
      next.splice(idx, 1);
      methods.setValue('seed_search_attempts', next, { shouldDirty: true });
    };
    const updateSeedSearch = (idx, key, value) => {
      const next = [...(methods.getValues('seed_search_attempts') || [])];
      next[idx] = { ...next[idx], [key]: value };
      methods.setValue('seed_search_attempts', next, { shouldDirty: true });
    };

    // Sprint 2: Auto-generate event name from production type (removes farmer burden ~20 sec per event)
    // Run 8b R4 (2026-10-15): regenerate only while the name is the tab's own (`nameOrigin`
    // 'auto') or blank. It used to infer the origin from the TEXT, by comparing the name with
    // every default label in the current language, so an English auto-name became "typed by the
    // operator" after a switch to Spanish and froze, while a name the operator typed that
    // happened to equal some default was overwritten. Origin is now recorded on input, and an
    // unknown origin (edit, repeat, restored draft) preserves the name.
    // A cleanout is named as a cleanout (recordkeeping review S4, F-13, 2026-10-07): the
    // cleanout tile lands on EM with the operation preset to Cleaning, and the record was
    // auto-named "Equipment Maintenance", which is what the certifier's cleaning log then
    // read. The verb's own label is the name, in the farmer's language.
    const equipmentOperationType = watch('equipment_operation_type');
    const cleanoutName = intl.formatMessage({ id: 'activities.verb.cleanout' });
    const localizedTypeName = (code) =>
      PRODUCTION_TYPE_LABEL_KEYS[code]
        ? intl.formatMessage({ id: PRODUCTION_TYPE_LABEL_KEYS[code] })
        : PRODUCTION_TYPE_NAMES[code];
    useEffect(() => {
      if (productionType && PRODUCTION_TYPE_NAMES[productionType]) {
        const currentName = methods.getValues('name');
        const isBlank = !currentName || !String(currentName).trim();
        // An operator-touched name is theirs even when blank: clearing the field to retype is
        // an edit, and refilling it would fight the cursor. There is no way back to auto-naming
        // short of a new record; a blank name is filled only when nobody typed it ('unknown').
        if (nameOrigin === 'auto' || (isBlank && nameOrigin !== 'operator')) {
          const autoGeneratedName =
            productionType === 'EM' && equipmentOperationType === 'CL'
              ? cleanoutName
              : localizedTypeName(productionType);
          methods.setValue('name', autoGeneratedName, { shouldDirty: false });
        }
      }
    }, [productionType, equipmentOperationType, cleanoutName, nameOrigin, methods, intl]);
    const nameField = methods.register('name');

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
      'private_note',
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
      'water_test_date',
      'water_test_lab',
      // Irrigation depth / method — drive water-volume carbon calc (area × depth × 27154)
      'irrigation_depth',
      'irrigation_depth_unit',
      'irrigation_method',
      // Harvest-specific fields for preview card updates
      'harvest_method',
      'dry_matter_percentage',
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
      'operator_is_custom',
      'cleaning_protocol_reference',
      // NOP Compliance: Post-Harvest Sanitizer (7 CFR 205.272 + § 205.605)
      'sanitizer_name',
      'sanitizer_ppm',
      'sanitizer_residual_ppm_at_discharge',
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
            'private_note',
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
            'water_test_date',
            'water_test_lab',
            // Irrigation depth / method — drive water-volume carbon calc (area × depth × 27154)
            'irrigation_depth',
            'irrigation_depth_unit',
            'irrigation_method',
            // Harvest-specific fields for preview card updates
            'harvest_method',
            'dry_matter_percentage',
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
            'sanitizer_residual_ppm_at_discharge',
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

      // The subtypes that put seed or planting stock in the ground, i.e. the ones whose seed
      // section this form renders. Mirrors SEED_SOURCED_SUBTYPES in common/field_registry.py.
      const isSeedSourced = ['PL', 'TR', 'SS'].includes(data.type);

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

      const isSummaryEvent =
        !multiTarget && (data.is_summary === 'true' || data.is_summary === true);
      const OFFERS_SUMMARY_MODE = offersSummaryMode(data.type);

      // See the note inside processedData below. TP / BU / SS reuse these columns because the
      // fact is identical; only its ownership moves off the harvest event.
      const RECORDS_LOT_DISPOSITION = ['HA', 'TP', 'BU'].includes(data.type);
      const RECORDS_BUFFER = ['HA', 'BU'].includes(data.type);
      const RECORDS_HANDLER = ['HA', 'TP'].includes(data.type);

      const processedData = {
        ...data,
        // 🔴 F9 (2026-08-21) — the mutation-payload rule, enforced. `...data` above is
        // react-hook-form's WHOLE defaultValues object: every key for every subtype, several
        // seeded with a non-empty literal (`|| 'gallons'`, `|| 'lbs'`, `|| 'false'`). A
        // pruning record posted `is_summary:'false'`, `yield_total_unit:'lbs'`,
        // `water_volume_unit:'gallons'` and `temperature_control:'false'` — none of them
        // controls its form renders — and the backend does not discard them:
        // `ProductionEventSerializer.to_internal_value` lifts exactly those names out of the
        // top level into `extra_data`. The gates live in one testable module rather than as
        // more ternaries here; see utils/productionPayloadGates.ts for the reasoning.
        ...unrenderedProductionKeys(data, { amountsPerParcel: multiTarget }),
        // The Switch stores 'true'/'false' strings; the model field is a BooleanField.
        // Coerced explicitly rather than trusting DRF's string parsing, and to match the
        // Chemical and Soil tabs.
        reviewed: data.reviewed === 'true' || data.reviewed === true,
        reviewer_name: data.reviewer_name || null,
        review_date: data.review_date || null,
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
        dry_matter_percentage: data.dry_matter_percentage
          ? parseFloat(data.dry_matter_percentage)
          : undefined,
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
        // WHICH ACTIVITY OWNS WHICH RECORD.
        //
        // Transport, Buffer Use and Seed Search are their own activities (see
        // config/activityVerbs.ts) and reuse these columns, because the FACT is the same —
        // a load left, buffer crop was disposed of, a seed search happened. What changes is
        // that the record no longer has to belong to the harvest event it used to hang off:
        // a load ships days after the pick, and one pick can ship on several dates.
        //
        // Written as sets rather than repeating a ternary per key so the next subtype is one
        // edit, and so the render gates in the JSX below can be checked against these lists.
        production_efficiency: data.type === 'HA' ? data.production_efficiency : undefined,
        // WS-4 harvest-record completeness — HA-only (F28 phantom-value precedent).
        // harvest_date_end: null clears on edit; '' would fail DateField validation.
        // Blank is meaningful: the model assigns a crop+block+date code when the operator
        // leaves it empty, so an empty string must reach the API as undefined, not as ''.
        harvest_lot_code: RECORDS_LOT_DISPOSITION ? data.harvest_lot_code || undefined : undefined,
        // Renders inside the shared Harvest/Transport/Buffer section, so it must post for all
        // three: "how was this quantity arrived at" is as real for a weighed load or a buffer
        // disposal as for a pick.
        amount_determination: RECORDS_LOT_DISPOSITION
          ? data.amount_determination || undefined
          : undefined,
        harvest_date_end: data.type === 'HA' ? data.harvest_date_end || null : undefined,
        harvest_destination: RECORDS_LOT_DISPOSITION
          ? data.harvest_destination || undefined
          : undefined,
        // null so the select can be cleared. With `|| undefined` the key is omitted and the
        // backend keeps the old value, so a grower who picks a disposition by mistake and
        // blanks it again is stuck with it. (Many other fields in this payload still carry
        // that pattern — a wider sweep, not a drive-by.)
        buffer_disposition: RECORDS_BUFFER ? data.buffer_disposition || null : undefined,
        // § 205.202(c) proof rides a commerce-entering disposition only.
        //
        // null, NOT undefined, on the inapplicable branch. `|| undefined` omits the key and
        // the backend KEEPS its previous value — so a grower who records "sold as
        // conventional" with a delivery tag, then corrects the entry to "left in field",
        // leaves the old evidence string behind. The packet would then print delivery-tag
        // documentation beside a crop that never left the farm. Same reason
        // `harvest_date_end` sends null rather than ''.
        buffer_disposition_quantity: RECORDS_BUFFER
          ? (BUFFER_ENTERS_COMMERCE(data.buffer_disposition) && data.buffer_disposition_quantity) ||
            null
          : undefined,
        buffer_disposition_evidence: RECORDS_BUFFER
          ? (BUFFER_ENTERS_COMMERCE(data.buffer_disposition) && data.buffer_disposition_evidence) ||
            null
          : undefined,
        // Storage fields ride the "stored" destination only — a location typed and then
        // orphaned by switching the destination to sold_direct must not submit.
        //
        // 🔴 2026-09-06 — HA AND TP. The JSX renders the storage inputs for both (the
        // destination select follows RECORDS_HANDLER), but this gate said `type === 'HA'`, so a
        // Transport record "to storage" showed a location and a temperature, saved neither, and
        // the packet's Harvest & Transport table printed "—" under Storage for the load. Render
        // gate ≠ payload gate, per field — the class the pilot rehearsal named.
        storage_location:
          RECORDS_HANDLER && data.harvest_destination === 'stored'
            ? data.storage_location || undefined
            : undefined,
        storage_temperature_f:
          RECORDS_HANDLER && data.harvest_destination === 'stored' && data.storage_temperature_f
            ? parseFloat(data.storage_temperature_f)
            : undefined,
        harvest_contract_number: RECORDS_HANDLER
          ? data.harvest_contract_number || undefined
          : undefined,
        // Handler round trip rides the "handler" destination only — the same phantom-value
        // rule as storage_* above. `null` rather than `undefined` on the inapplicable branch
        // so switching the destination away from "handler" CLEARS what was typed instead of
        // leaving a pack-out figure attached to a lot that never left the farm.
        sent_to_handler_date:
          RECORDS_HANDLER && data.harvest_destination === 'handler'
            ? data.sent_to_handler_date || null
            : null,
        quantity_sent_to_handler:
          RECORDS_HANDLER &&
          data.harvest_destination === 'handler' &&
          data.quantity_sent_to_handler !== ''
            ? parseFloat(data.quantity_sent_to_handler)
            : null,
        quantity_returned_from_handler:
          RECORDS_HANDLER &&
          data.harvest_destination === 'handler' &&
          data.quantity_returned_from_handler !== ''
            ? parseFloat(data.quantity_returned_from_handler)
            : null,
        handler_quantity_unit:
          RECORDS_HANDLER && data.harvest_destination === 'handler'
            ? data.handler_quantity_unit || undefined
            : null,
        handler_return_unit:
          RECORDS_HANDLER && data.harvest_destination === 'handler'
            ? data.handler_return_unit || undefined
            : null,
        handler_document_reference:
          RECORDS_HANDLER && data.harvest_destination === 'handler'
            ? data.handler_document_reference || null
            : null,
        // F28 phantom-value precedent, applied to the seed fields: these controls render only
        // for the seed-sourced subtypes, so sending them for HA/IR/etc. would write a value
        // the farmer never saw.
        //
        // 🔴 The gate was `=== 'PL'` until 2026-08-15 while the form has always rendered the
        // seed block for PL *and* TR — so a transplant's allowability basis and
        // nonavailability ground were silently dropped on save. TR is squarely § 205.204
        // (nursery stock is planting stock) and, on a perennial orchard, the more common
        // record of the two.
        seed_non_gmo_status: isSeedSourced ? data.seed_non_gmo_status || undefined : undefined,
        // null, not undefined: a date the grower CLEARS must reach the API as an explicit
        // clear, and `undefined` would silently keep the stored value.
        stock_organic_management_start: isSeedSourced
          ? data.stock_organic_management_start || null
          : undefined,
        seed_treatment_allowed_basis: isSeedSourced
          ? data.seed_treatment_allowed_basis || undefined
          : undefined,
        seed_nonavailability_reason: isSeedSourced
          ? data.seed_nonavailability_reason || undefined
          : undefined,
        // Irrigation water test — free-text lines parsed into the JSONField shape the
        // packet's "Results" column reads. Ungated on purpose: the input only renders for IR,
        // so on any other subtype the summary is empty and this resolves to undefined.
        water_test_results: data.water_test_summary
          ? parseWaterTestSummary(data.water_test_summary)
          : undefined,
        // Perennial planting stock — same gate, same reason as the seed fields above.
        rootstock: isSeedSourced ? data.rootstock || undefined : undefined,
        plants_established: isSeedSourced
          ? data.plants_established === '' || data.plants_established == null
            ? undefined
            : Number(data.plants_established)
          : undefined,
        plant_spacing: isSeedSourced ? data.plant_spacing || undefined : undefined,
        // Asset class rides cleaning operations only (EM + CL), same gate the
        // cleaning_* fields use.
        cleaning_asset_class:
          data.type === 'EM' && data.equipment_operation_type === 'CL'
            ? data.cleaning_asset_class || undefined
            : undefined,
        // Whole-vs-part coverage — the Yield & Output section (HA/PL) is its form home.
        // PH was missing here while the section that collects these two renders for
        // HA || PL || PH (see the Yield & Output gate). A post-harvest event showed the
        // farmer both inputs and posted neither — the lot-scope locator the certifier packet
        // prints in its Partial-Area table simply vanished on save. Keep this list and the
        // render gate identical; they are the same decision written twice.
        applied_scope: ['HA', 'PL', 'PH'].includes(data.type)
          ? data.applied_scope || undefined
          : undefined,
        applied_scope_detail:
          ['HA', 'PL', 'PH'].includes(data.type) && data.applied_scope === 'part'
            ? data.applied_scope_detail || undefined
            : undefined,
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
          cleaning_protocol_reference: data.cleaning_protocol_reference || undefined
        }),
        // 🔴 2026-08-15 — these three moved OUT of the `type === 'EM'` spread above.
        //
        // The "Custom Operator & Equipment Cleaning" section renders for EVERY subtype (its
        // own comment says so), and the packet's § 205.272 per-operation coverage table reads
        // them only where `ev.type != "EM"` — i.e. exactly the events whose values the EM gate
        // was throwing away. A grower could tick "shared with conventional equipment" on a
        // harvest, watch it save, and the fact ceased to exist a millisecond later; the
        // coverage table was structurally unpopulatable from the UI.
        //
        // `equipment_cleaning_event` sends null (not '') so DRF clears the FK when unset. The
        // model's own clean() already refuses a self-link, a non-EM target, a cross-production
        // link and a cleaning dated after the operation, so widening the write is safe.
        ...(data.type !== 'SS' && {
          shared_with_conventional: data.shared_with_conventional === 'true',
          operator_is_custom: data.operator_is_custom === 'true'
        }),
        // Sent ONLY when the control is on screen. Posting null from a form that never
        // showed the picker is how an existing § 205.272 link got destroyed by a save that
        // touched something else entirely.
        ...(showCleaningLink && {
          equipment_cleaning_event: data.equipment_cleaning_event
            ? parseInt(data.equipment_cleaning_event, 10)
            : null
        }),
        // NOP 5026 / 7 CFR 205.272 + § 205.605 — sanitizer record.
        // 2026-07-31: these five used to sit INSIDE the `type === 'EM'` spread above, so a
        // post-harvest wash could never submit them even once the inputs were on screen —
        // the form would have accepted the residual reading and silently dropped it. Now
        // sent for equipment cleaning AND post-harvest handling, which is where chlorinated
        // water actually contacts the crop.
        ...((data.type === 'EM' || data.type === 'PH') && {
          sanitizer_name: data.sanitizer_name || undefined,
          sanitizer_ppm: data.sanitizer_ppm ? parseFloat(data.sanitizer_ppm) : undefined,
          sanitizer_residual_ppm_at_discharge: data.sanitizer_residual_ppm_at_discharge
            ? parseFloat(data.sanitizer_residual_ppm_at_discharge)
            : undefined,
          rinse_step_documented: data.rinse_step_documented === 'true',
          sanitizer_nop_reference: data.sanitizer_nop_reference || undefined
        }),
        // Irrigation model fields at top level (not in extra_data)
        water_source: data.water_source || undefined,
        irrigation_method: data.irrigation_method || undefined,
        irrigation_depth: data.irrigation_depth ? parseFloat(data.irrigation_depth) : undefined,
        // Ungated here on purpose: `unrenderedProductionKeys` above already drops the unit
        // when no depth was entered, and re-asserting it after the gate would put the phantom
        // straight back — the "a narrow gate OVERWRITTEN by a later spread" shape from the
        // 2026-08-19 rehearsal, in reverse.
        // With several parcels an irrigation's depth is on each parcel's card: the unit still
        // travels. Only irrigation: every subtype carries the unit's default, unrendered.
        irrigation_depth_unit:
          data.irrigation_depth || (multiTarget && data.type === 'IR')
            ? data.irrigation_depth_unit || undefined
            : undefined,
        // Phase 3: Pump fields for IR events — top-level model fields
        pump_depth_ft:
          data.type === 'IR' && data.pump_depth_ft ? parseFloat(data.pump_depth_ft) : undefined,
        electricity_source:
          data.type === 'IR' && data.electricity_source ? data.electricity_source : undefined,
        // NOP irrigation/well water test (IR) — top-level model fields
        water_test_date:
          data.type === 'IR' && data.water_test_date ? data.water_test_date : undefined,
        water_test_lab: data.type === 'IR' && data.water_test_lab ? data.water_test_lab : undefined,
        // Summary mode fields stored in extra_data (not model fields)
        extra_data: {
          // Only where the toggle exists. PL/TR/CU/... have no summary mode, so
          // `is_summary: false` there is a statement about a control the farmer never saw.
          ...(OFFERS_SUMMARY_MODE && { is_summary: isSummaryEvent }),
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

    // NOP 5026 / 7 CFR 205.605(b) wash-water + sanitizer record.
    // Hoisted out of the EM/CL cleaning log (2026-07-31): it used to render ONLY for
    // Equipment Maintenance with operation type 'Cleaning', so a POST-HARVEST wash --
    // the dump tank, hydrocooler or huller where chlorinated water actually contacts the
    // crop, which is precisely what NOP 5026 governs -- had nowhere to record a residual.
    // The columns existed and were even exposed on the consumer payload; only the seed
    // commands could populate them. Rendered for equipment cleaning AND for wet
    // post-harvest processing.
    const sanitizerRecordBlock = (
      <Box p={3} borderWidth="1px" borderColor="orange.200" borderRadius="md" bg="orange.50">
        <Text fontWeight="semibold" fontSize="sm" mb={1}>
          {intl.formatMessage({ id: 'events.production.sanitation.heading' })}
        </Text>
        {/* Run 7 (R7-05): this stated one rinse rule for every sanitizer and cited § 205.272 for
            it. § 205.605(b) sets conditions per material. */}
        <Text fontSize="xs" color="gray.700" mb={3}>
          {intl.formatMessage({ id: 'events.production.sanitation.intro' })}
        </Text>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <StandardField
            label={intl.formatMessage({ id: 'events.production.fields.sanitizerName' })}
            helpText={intl.formatMessage({ id: 'events.production.sanitation.nameHelp' })}>
            <Controller
              name="sanitizer_name"
              control={methods.control}
              render={({ field }) => (
                <StandardInput
                  {...field}
                  placeholder={intl.formatMessage({
                    id: 'events.production.sanitation.namePlaceholder'
                  })}
                />
              )}
            />
          </StandardField>
          <StandardField
            label={intl.formatMessage({ id: 'events.production.fields.sanitizerPpm' })}
            helpText={intl.formatMessage({ id: 'events.production.sanitation.concentrationHelp' })}>
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
                  placeholder={intl.formatMessage({
                    id: 'events.production.sanitation.concentrationPlaceholder'
                  })}
                />
              )}
            />
          </StandardField>
          <StandardField
            label={intl.formatMessage({ id: 'events.production.sanitation.residualLabel' })}
            helpText={intl.formatMessage({ id: 'events.production.sanitation.residualHelp' })}>
            <Controller
              name="sanitizer_residual_ppm_at_discharge"
              control={methods.control}
              render={({ field }) => (
                <StandardInput
                  {...field}
                  type="number"
                  min="0"
                  max="10000"
                  step="0.1"
                  placeholder={intl.formatMessage({
                    id: 'events.production.sanitation.residualPlaceholder'
                  })}
                />
              )}
            />
          </StandardField>
        </SimpleGrid>
        <StandardField
          label={intl.formatMessage({ id: 'events.production.fields.sanitizerNopReference' })}
          helpText={intl.formatMessage({ id: 'events.production.sanitation.referenceHelp' })}>
          <Controller
            name="sanitizer_nop_reference"
            control={methods.control}
            render={({ field }) => (
              <StandardInput
                {...field}
                placeholder={intl.formatMessage({
                  id: 'events.production.sanitation.referencePlaceholder'
                })}
              />
            )}
          />
        </StandardField>
        <HStack mt={3} justify="space-between">
          <VStack align="start" spacing={0}>
            <Text fontWeight="semibold" fontSize="sm">
              {intl.formatMessage({ id: 'events.production.sanitation.rinseLabel' })}
            </Text>
            <Text fontSize="xs" color="gray.600">
              {intl.formatMessage({ id: 'events.production.sanitation.rinseHint' })}
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
                onChange={(e) => field.onChange(e.target.checked ? 'true' : 'false')}
              />
            )}
          />
        </HStack>
      </Box>
    );

    return (
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ width: '100%' }}>
          <VStack spacing={6} align="stretch">
            {/* One callout, one message — see the note in ChemicalTab-ENHANCED. ChemicalTab
                dropped its callout entirely; the generic production one went the same way
                (2026-08-29). "This is the production record your certifier reviews at
                renewal" restated the page the operator is already on, and cost ~200px above
                the first field on a phone — the form's own section headers and field helpers
                carry the same guidance where it applies.

                Seed Search KEEPS its callout: § 205.204 is the reason the record exists at
                all (non-organic untreated seed is permitted only when organic seed is not
                commercially available), and nothing else on the form says so. */}
            {productionType === 'SS' && (
              <StandardAlert
                status="info"
                title={intl.formatMessage({ id: 'events.callout.production.title' })}>
                <Text fontSize="sm">
                  {intl.formatMessage({ id: 'events.callout.production.bodySeedSearch' })}
                </Text>
              </StandardAlert>
            )}

            {/* Certifier-only notice — SSOT is CONSUMER_WITHHELD_PRODUCTION_SUBTYPES
                (mirrors the backend event-level withhold in claim_authority.py). The
                farmer learns at WRITE time that this record never reaches the buyer
                page, and why — instead of discovering a "consumer card" for it in
                their own preview and assuming shoppers see it. */}
            {CONSUMER_WITHHELD_PRODUCTION_SUBTYPES[productionType] && (
              <StandardAlert
                status="info"
                title={intl.formatMessage({ id: 'events.certifierOnly.title' })}>
                <Text fontSize="sm">
                  {intl.formatMessage({
                    id: CONSUMER_WITHHELD_PRODUCTION_SUBTYPES[productionType]
                  })}
                </Text>
              </StandardAlert>
            )}

            {/* Forms are hand-crafted by design: the NOP section grouping below is what
                makes the audit export complete, and the registry renderer flattens it.
                The field registry is the SSOT for DISPLAY surfaces (consumer card, modal,
                timeline) and is enforced here by src/config/events/__tests__/
                formConformance.test.ts, not by a runtime flag. */}
            <>
              {/* Basic Production Information */}
              <SectionBox>
                {/* Not "Production Activity". That is EVENT_TYPE_NAMES[1] — the retired
                    seven-family vocabulary narrative.ts forbids rendering, and it arrived
                    here as a hardcoded English literal so every locale read it. A farmer
                    who tapped the Planting tile and reads "Log activity — Planting" was
                    then told by the first heading inside the form that they were filing a
                    "Production Activity": one record, two identities, the same defect
                    already fixed on the timeline and the edit path.

                    The sibling headings in this file name a FIELD GROUP ("Yield & Output",
                    "Harvest Quality"), so this one does too — it holds the name, area and
                    unit. Echoing the subtype label instead would only restate the page
                    title. */}
                <SectionHeader
                  icon={FaSeedling}
                  title={intl.formatMessage({ id: 'events.section.activityBasics' })}
                  badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                />
                <VStack spacing={4} align="stretch">
                  {/* Production Type — EDIT MODE ONLY on the wizard path.
                        The create path answers this in step 0, in farmer vocabulary
                        (ActivitySubtypeChooser); rendering it again here is the double-ask
                        removed 2026-08-22. Options come from the display registry, so this
                        list cannot drift from history/models.py PRODUCTION_EVENTS or from the
                        labels the timeline and the certifier packet use — the previous
                        hand-written <option> block was English-only and had grown a fourth
                        copy of the same list. */}
                  {!hideSubtypeSelect && (
                    <StandardField
                      label={intl.formatMessage({ id: 'production.field.productionType' })}
                      required
                      error={
                        errors.type?.message && intl.formatMessage({ id: errors.type.message })
                      }
                      helpText={intl.formatMessage({
                        id: 'events.production.fields.activityTypeHelp'
                      })}>
                      <Controller
                        name="type"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardSelect
                            {...field}
                            placeholder={intl.formatMessage({
                              id: 'events.production.fields.productionTypePlaceholder'
                            })}>
                            {subtypeOptions.map((entry) => (
                              <option key={entry.code} value={entry.code}>
                                {intl.formatMessage({ id: entry.labelKey })}
                              </option>
                            ))}
                          </StandardSelect>
                        )}
                      />
                    </StandardField>
                  )}

                  {/* Event Name - Optional, auto-generated from production type if empty */}
                  <StandardField
                    label={intl.formatMessage({ id: 'production.field.eventName' })}
                    helpText={intl.formatMessage({ id: 'events.production.help.eventName' })}>
                    <StandardInput
                      type="text"
                      placeholder={`${
                        localizedTypeName(productionType) || localizedTypeName('HA')
                      } - 1`}
                      {...nameField}
                      onChange={(event) => {
                        onNameEdited?.();
                        return nameField.onChange(event);
                      }}
                    />
                  </StandardField>

                  {/* Area Covered — field operations only. AREA_SUBTYPES is the registry's
                      own gate: EM/PO/TP/BU/SS have no area concept, the display registry
                      never shows the value for them, and the backend rejects area <= 0 for
                      exactly those types — so asking here made Seed Search demand a number
                      that could neither be displayed nor honestly entered. */}
                  {AREA_SUBTYPES.includes(productionType) && (
                    <HStack spacing={4} align="stretch">
                      {!multiTarget && (
                        <Box flex={2}>
                          <StandardField
                            label={intl.formatMessage({ id: 'events.common.fields.areaCovered' })}
                            error={errors.area_covered?.message}
                            helpText={intl.formatMessage({
                              id: 'quickAdd.fields.areaCoveredHelp'
                            })}>
                            <Controller
                              name="area_covered"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardNumberInput
                                  min={0}
                                  precision={2}
                                  step={0.01}
                                  value={field.value || ''}
                                  onChange={(valueString) => field.onChange(valueString)}
                                  placeholder="0.00"
                                />
                              )}
                            />
                          </StandardField>
                        </Box>
                      )}

                      <Box flex={1}>
                        <StandardField
                          label={intl.formatMessage({ id: 'production.field.unit' })}
                          error={errors.area_unit?.message}>
                          <Controller
                            name="area_unit"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect {...field}>
                                <option value="ha">
                                  {intl.formatMessage({ id: 'events.units.hectares' })}
                                </option>
                                <option value="acres">
                                  {intl.formatMessage({ id: 'events.units.acres' })}
                                </option>
                                <option value="m2">
                                  {intl.formatMessage({ id: 'events.units.squareMeters' })}
                                </option>
                                <option value="km2">
                                  {intl.formatMessage({ id: 'events.units.squareKilometers' })}
                                </option>
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
                <SectionBox>
                  <SectionHeader
                    icon={FaTools}
                    title={intl.formatMessage({ id: 'events.section.production.equipment' })}
                    badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                    description={intl.formatMessage({
                      id: 'events.production.help.equipmentSection'
                    })}
                  />
                  <VStack spacing={4} align="stretch">
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.production.fields.equipmentOperationType'
                        })}
                        required
                        error={errors.equipment_operation_type?.message}
                        helpText="What type of equipment operation?">
                        <Controller
                          name="equipment_operation_type"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect
                              {...field}
                              placeholder={intl.formatMessage({
                                id: 'events.production.help.operationTypePlaceholder'
                              })}>
                              {EQUIPMENT_OPERATION_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {intl.formatMessage({ id: type.labelKey })}
                                </option>
                              ))}
                            </StandardSelect>
                          )}
                        />
                      </StandardField>

                      <StandardField
                        label={intl.formatMessage({ id: 'events.production.fields.equipmentType' })}
                        error={errors.equipment_type?.message}
                        helpText={intl.formatMessage({
                          id: 'events.production.help.equipmentType'
                        })}>
                        <Controller
                          name="equipment_type"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect
                              {...field}
                              placeholder={intl.formatMessage({
                                id: 'events.production.help.equipmentTypePlaceholder'
                              })}>
                              {EQUIPMENT_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {intl.formatMessage({ id: type.labelKey })}
                                </option>
                              ))}
                            </StandardSelect>
                          )}
                        />
                      </StandardField>
                    </SimpleGrid>

                    <StandardField
                      label={intl.formatMessage({
                        id: 'events.equipment.fields.operationEfficiency'
                      })}
                      error={errors.operation_efficiency?.message}
                      helpText="Equipment condition and performance rating">
                      <Controller
                        name="operation_efficiency"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardSelect {...field}>
                            <option value="">
                              {intl.formatMessage({ id: 'events.production.help.efficiencyUnset' })}
                            </option>
                            <option value="high">
                              {intl.formatMessage({ id: 'events.productionEfficiency.high' })}
                            </option>
                            <option value="normal">
                              {intl.formatMessage({ id: 'events.productionEfficiency.normal' })}
                            </option>
                            <option value="low">
                              {intl.formatMessage({ id: 'events.productionEfficiency.low' })}
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
                <SectionBox>
                  <SectionHeader
                    icon={FaShieldAlt}
                    title={intl.formatMessage({
                      id: 'events.section.production.equipmentCleaning'
                    })}
                    badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                    description={intl.formatMessage({
                      id: 'events.production.help.cleaningSection'
                    })}
                  />
                  <VStack spacing={4} align="stretch">
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.production.fields.cleaningAssetClass'
                        })}
                        error={errors.cleaning_asset_class?.message}
                        helpText={intl.formatMessage({ id: 'production.cleaningAssetClassHelp' })}>
                        <Controller
                          name="cleaning_asset_class"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect
                              {...field}
                              placeholder={intl.formatMessage({ id: 'app.select' })}>
                              <option value="equipment">
                                {intl.formatMessage({
                                  id: 'events.cleaningAssetClass.equipment'
                                })}
                              </option>
                              <option value="harvest_bins">
                                {intl.formatMessage({
                                  id: 'events.cleaningAssetClass.harvestBins'
                                })}
                              </option>
                              <option value="storage">
                                {intl.formatMessage({
                                  id: 'events.cleaningAssetClass.storage'
                                })}
                              </option>
                              <option value="processing_line">
                                {intl.formatMessage({
                                  id: 'events.cleaningAssetClass.processingLine'
                                })}
                              </option>
                              <option value="livestock_housing">
                                {intl.formatMessage({
                                  id: 'events.cleaningAssetClass.livestockHousing'
                                })}
                              </option>
                              <option value="other">
                                {intl.formatMessage({
                                  id: 'events.cleaningAssetClass.other'
                                })}
                              </option>
                              <option value="transport_vehicle">
                                {intl.formatMessage({
                                  id: 'events.cleaningAssetClass.transportVehicle'
                                })}
                              </option>
                            </StandardSelect>
                          )}
                        />
                      </StandardField>

                      <StandardField
                        label={intl.formatMessage({ id: 'events.production.fields.cleaningDate' })}
                        helpText={intl.formatMessage({ id: 'production.field.cleaningDateHelp' })}>
                        <Controller
                          name="cleaning_date"
                          control={methods.control}
                          render={({ field }) => <StandardInput {...field} type="date" />}
                        />
                      </StandardField>

                      <StandardField
                        label={intl.formatMessage({ id: 'events.production.fields.cleanedBy' })}
                        helpText={intl.formatMessage({ id: 'events.production.help.cleanedBy' })}>
                        <Controller
                          name="cleaned_by"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              placeholder={intl.formatMessage({
                                id: 'events.production.fields.cleanedByPlaceholder'
                              })}
                            />
                          )}
                        />
                      </StandardField>
                    </SimpleGrid>

                    <StandardField
                      label={intl.formatMessage({ id: 'events.production.fields.cleaningMethod' })}
                      helpText="How the equipment was cleaned (pressure wash, manual scrub, steam, etc.)">
                      <Controller
                        name="cleaning_method"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardInput
                            {...field}
                            placeholder={intl.formatMessage({
                              id: 'events.production.fields.cleaningMethodPlaceholder'
                            })}
                          />
                        )}
                      />
                    </StandardField>

                    <StandardField
                      label={intl.formatMessage({
                        id: 'events.production.fields.cleaningMaterialsUsed'
                      })}
                      helpText={intl.formatMessage({
                        id: 'events.production.help.cleaningMaterials'
                      })}>
                      <Controller
                        name="cleaning_materials_used"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardTextarea
                            {...field}
                            placeholder={intl.formatMessage({
                              id: 'events.production.fields.cleaningMaterialsPlaceholder'
                            })}
                            rows={2}
                          />
                        )}
                      />
                    </StandardField>

                    <StandardField
                      label={intl.formatMessage({
                        id: 'events.production.fields.cleaningProtocolReference'
                      })}
                      helpText="Reference to cleaning SOP or protocol (e.g., SOP-CLEAN-001)">
                      <Controller
                        name="cleaning_protocol_reference"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardInput
                            {...field}
                            placeholder={intl.formatMessage({
                              id: 'events.production.fields.cleaningProtocolReferencePlaceholder'
                            })}
                          />
                        )}
                      />
                    </StandardField>

                    {/* Purge records (§ 205.272). A purge is how a shared line or auger is
                        cleared: material is run through and the first output discarded. The
                        END USE is the compliance-relevant half — purge fed to livestock, sold
                        as conventional or discarded are three different stories — and it had
                        no home before. Quick Organics asks all three on its Cleanout activity. */}
                    <StandardField
                      label={intl.formatMessage({ id: 'events.production.fields.purgeMaterial' })}
                      helpText={intl.formatMessage({ id: 'events.production.help.purgeMaterial' })}>
                      <Controller
                        name="purge_material"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardInput
                            {...field}
                            placeholder={intl.formatMessage({
                              id: 'events.production.fields.purgeMaterialPlaceholder'
                            })}
                          />
                        )}
                      />
                    </StandardField>

                    <StandardField
                      label={intl.formatMessage({ id: 'events.production.fields.purgeQuantity' })}
                      helpText={intl.formatMessage({ id: 'events.production.help.purgeQuantity' })}>
                      <Controller
                        name="purge_quantity"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardInput
                            {...field}
                            placeholder={intl.formatMessage({
                              id: 'events.production.fields.purgeQuantityPlaceholder'
                            })}
                          />
                        )}
                      />
                    </StandardField>

                    <StandardField
                      label={intl.formatMessage({ id: 'events.production.fields.purgeEndUse' })}
                      helpText={intl.formatMessage({ id: 'events.production.help.purgeEndUse' })}>
                      <Controller
                        name="purge_material_end_use"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardTextarea
                            {...field}
                            rows={2}
                            placeholder={intl.formatMessage({
                              id: 'events.production.fields.purgeEndUsePlaceholder'
                            })}
                          />
                        )}
                      />
                    </StandardField>

                    {sanitizerRecordBlock}

                    <HStack
                      p={3}
                      bg={isSharedWithConventional ? 'red.50' : 'gray.50'}
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor={isSharedWithConventional ? 'red.200' : 'gray.200'}
                      justify="space-between">
                      <VStack align="start" spacing={0}>
                        <HStack>
                          <Text fontWeight="semibold" fontSize="sm">
                            {intl.formatMessage({ id: 'events.production.equipment.sharedLabel' })}
                          </Text>
                          {isSharedWithConventional && (
                            <Badge colorScheme="red" size="sm">
                              {intl.formatMessage({
                                id: 'events.production.equipment.requiresCleaning'
                              })}
                            </Badge>
                          )}
                        </HStack>
                        <Text fontSize="xs" color="gray.600">
                          {intl.formatMessage({ id: 'events.production.equipment.sharedHelp' })}
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

              {/* §E-5 Custom operator & cleaning coverage (7 CFR 205.272) — every subtype.
                    A contractor's harvester or mower arrives from another farm, which is the
                    commingling exposure the rule is about. Naming the cleaning that preceded the
                    pass is what turns the page-1 contamination-prevention row from an aggregate
                    count into evidence about THIS operation. */}
              {/* SS is a sourcing-paperwork record — no pass, no equipment, nothing to
                  clean — so the operator/shared-equipment questions do not apply. */}
              {productionType !== 'SS' && (
                <SectionBox>
                  <SectionHeader
                    icon={FaTruck}
                    title={intl.formatMessage({
                      id: 'events.production.sections.customOperator',
                      defaultMessage: 'Custom Operator & Equipment Cleaning'
                    })}
                    badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                    description={intl.formatMessage({
                      id: 'events.production.sections.customOperatorHelp',
                      defaultMessage:
                        'If a contractor ran this pass with their own equipment, say so and point to the cleaning that came before it.'
                    })}
                  />
                  <VStack spacing={4} align="stretch">
                    <HStack justify="space-between" align="center">
                      <VStack align="start" spacing={0} flex={1}>
                        <Text fontSize="sm" fontWeight="semibold">
                          {intl.formatMessage({
                            id: 'events.production.fields.operatorIsCustom',
                            defaultMessage: 'Custom Operator'
                          })}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {intl.formatMessage({
                            id: 'events.production.fields.operatorIsCustomHelp',
                            defaultMessage:
                              'A contractor performed this operation with their own equipment. Put their name in "Performed By".'
                          })}
                        </Text>
                      </VStack>
                      <Controller
                        name="operator_is_custom"
                        control={methods.control}
                        render={({ field }) => (
                          <Switch
                            colorScheme="orange"
                            size="lg"
                            isChecked={field.value === 'true'}
                            onChange={(e) => field.onChange(e.target.checked ? 'true' : 'false')}
                          />
                        )}
                      />
                    </HStack>

                    {/* 2026-08-25 — the control the 2026-08-15 payload widening assumed was
                      here. The payload posts shared_with_conventional for EVERY subtype and
                      the packet's § 205.272 coverage table reads it on non-EM events, but the
                      only rendered switch lived inside the EM cleaning log — so every other
                      subtype posted a hard `false` for a question the farmer was never asked.
                      EM keeps its copy in the cleaning log, where the cleaning evidence lives. */}
                    {productionType !== 'EM' && (
                      <HStack justify="space-between" align="center">
                        <VStack align="start" spacing={0} flex={1}>
                          <Text fontSize="sm" fontWeight="semibold">
                            {intl.formatMessage({
                              id: 'events.production.fields.sharedWithConventional',
                              defaultMessage: 'Equipment Shared with a Conventional Operation'
                            })}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            {intl.formatMessage({
                              id: 'events.production.fields.sharedWithConventionalHelp',
                              defaultMessage:
                                'The equipment used for this pass also works conventional ground. Link the cleaning that came before it below (§ 205.272).'
                            })}
                          </Text>
                        </VStack>
                        <Controller
                          name="shared_with_conventional"
                          control={methods.control}
                          render={({ field }) => (
                            <Switch
                              colorScheme="orange"
                              size="lg"
                              isChecked={field.value === 'true'}
                              onChange={(e) => field.onChange(e.target.checked ? 'true' : 'false')}
                            />
                          )}
                        />
                      </HStack>
                    )}

                    {showCleaningLink && (
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.production.fields.equipmentCleaningEvent',
                          defaultMessage: 'Cleanout that covers this pass'
                        })}
                        helpText={
                          cleaningEventOptions.length
                            ? intl.formatMessage({
                                id: 'events.production.fields.equipmentCleaningEventHelp',
                                defaultMessage:
                                  'Pick the equipment cleanout logged before this pass. It must be dated on or before this activity.'
                              })
                            : intl.formatMessage({
                                id: 'events.production.fields.equipmentCleaningEventEmpty',
                                defaultMessage:
                                  'No equipment cleanout logged in this season yet. Log an Equipment cleanout to link it here.'
                              })
                        }>
                        <Controller
                          name="equipment_cleaning_event"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect
                              {...field}
                              isDisabled={cleaningEventOptions.length === 0}
                              placeholder={intl.formatMessage({
                                id: 'events.production.fields.equipmentCleaningEventNone',
                                defaultMessage: 'Not linked'
                              })}>
                              {cleaningEventOptions.map((opt) => (
                                <option key={opt.id} value={String(opt.id)}>
                                  {opt.label}
                                </option>
                              ))}
                            </StandardSelect>
                          )}
                        />
                      </StandardField>
                    )}
                  </VStack>
                </SectionBox>
              )}

              {/* Yield & Output - For carbon efficiency calculation */}
              {/* PH belongs here. The registry declares `yield_quantity` for HA, PH and PL
                  (productionEvent.ts — and this file's own header says "HA/PH: …
                  yield_quantity/unit"), but the form gated it to HA and PL, so a Post-Harvest
                  event could never record the yield the registry promises to display on the
                  timeline and consumer card. Caught by formRenderConformance. */}
              {(productionType === 'HA' || productionType === 'PL' || productionType === 'PH') &&
                !multiTarget && (
                  <SectionBox>
                    {/* NOT collapsible and NOT optional. Quantity harvested, its unit and
                      "Amount Determined By" are the mass-balance inputs § 205.103(b)(2) turns
                      on, and NOP Harvest Record C14 asks for Quantity outright. This section
                      was badged "Efficiency Calculation" historically, which is how it briefly
                      became "Optional — carbon only" and got folded shut by default. The
                      crop metrics beside them (Brix, moisture) are the odd ones out here,
                      not the yield. */}
                    <SectionHeader
                      icon={FaBalanceScale}
                      title={intl.formatMessage({ id: 'events.section.production.yield' })}
                      badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                    />
                    <VStack spacing={4} align="stretch">
                      <HStack spacing={4} align="stretch">
                        <Box flex={2}>
                          <StandardField
                            label={intl.formatMessage({
                              // Three subtypes render this section, not two. PH (post-harvest
                              // washing / cooling / packing) fell through to the planting
                              // default and asked a packing-shed operator for "Quantity
                              // planted".
                              id:
                                productionType === 'HA'
                                  ? 'production.field.quantityHarvested'
                                  : productionType === 'PH'
                                  ? 'production.field.quantityProcessed'
                                  : 'production.field.quantityPlanted'
                            })}
                            error={errors.yield_quantity?.message}
                            helpText={intl.formatMessage({ id: 'production.field.quantityHelp' })}>
                            <Controller
                              name="yield_quantity"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardNumberInput
                                  min={0}
                                  precision={1}
                                  step={0.1}
                                  value={field.value || ''}
                                  onChange={(valueString) => field.onChange(valueString)}
                                  placeholder="0.0"
                                />
                              )}
                            />
                          </StandardField>
                        </Box>

                        <Box flex={1}>
                          <StandardField
                            label={intl.formatMessage({ id: 'production.field.unit' })}>
                            <Controller
                              name="yield_unit"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardSelect {...field}>
                                  <option value="kg">
                                    {intl.formatMessage({ id: 'events.units.kilograms' })}
                                  </option>
                                  <option value="tons">
                                    {intl.formatMessage({ id: 'events.units.tonnes' })}
                                  </option>
                                  <option value="lbs">
                                    {intl.formatMessage({ id: 'events.units.pounds' })}
                                  </option>
                                  <option value="boxes">
                                    {intl.formatMessage({ id: 'events.units.boxes' })}
                                  </option>
                                  <option value="bins">
                                    {intl.formatMessage({ id: 'events.units.bins' })}
                                  </option>
                                  <option value="plants">
                                    {intl.formatMessage({ id: 'events.units.plants' })}
                                  </option>
                                  <option value="seeds">
                                    {intl.formatMessage({ id: 'events.units.seeds' })}
                                  </option>
                                </StandardSelect>
                              )}
                            />
                          </StandardField>
                        </Box>
                      </HStack>

                      {/* Whole-vs-part coverage (§ 205.103(b)(2)) — mirrors the
                        ChemicalEvent applied_scope pair. */}
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.appliedScope'
                          })}
                          error={errors.applied_scope?.message}
                          helpText={intl.formatMessage({ id: 'production.appliedScopeHelp' })}>
                          <Controller
                            name="applied_scope"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect
                                {...field}
                                placeholder={intl.formatMessage({ id: 'app.select' })}>
                                <option value="all">
                                  {intl.formatMessage({ id: 'events.appliedScope.all' })}
                                </option>
                                <option value="part">
                                  {intl.formatMessage({ id: 'events.appliedScope.part' })}
                                </option>
                              </StandardSelect>
                            )}
                          />
                        </StandardField>

                        {watch('applied_scope') === 'part' && (
                          <StandardField
                            label={intl.formatMessage({
                              id: 'events.production.fields.appliedScopeDetail'
                            })}
                            error={errors.applied_scope_detail?.message}>
                            <Controller
                              name="applied_scope_detail"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardInput
                                  {...field}
                                  placeholder={intl.formatMessage({
                                    id: 'events.production.fields.appliedScopeDetailPlaceholder'
                                  })}
                                />
                              )}
                            />
                          </StandardField>
                        )}
                      </SimpleGrid>
                    </VStack>
                  </SectionBox>
                )}

              {/* Harvest Quality - For premium fruit & grain markets */}
              {productionType === 'HA' && (
                <SectionBox>
                  <SectionHeader
                    icon={FaBalanceScale}
                    title={intl.formatMessage({ id: 'events.section.production.harvestQuality' })}
                    badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                  />
                  <VStack spacing={4} align="stretch">
                    <HStack spacing={4} align="stretch">
                      <Box flex={1}>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.harvestQuality'
                          })}
                          error={errors.harvest_quality_grade?.message}
                          helpText={intl.formatMessage({ id: 'harvestGrade.help' })}>
                          {/* 🔴 F5 (2026-08-21) — these six options were Export Quality /
                              Grade A / B / C / Domestic / Processing, while the season
                              header's Finish form offered a DIFFERENT five (Premium / Grade A
                              / Grade B / Standard / Processing). One fact, two vocabularies:
                              the lot header and its own picks could not agree and the packet
                              printed both. None of the eleven is a grade a US packing record
                              uses — a certifier reviewer put it plainly, "Grade A is not an
                              apple grade". Both forms now render config/harvestGrades.ts,
                              crop-aware, with a free-text escape for private buyer grades. */}
                          <Controller
                            name="harvest_quality_grade"
                            control={methods.control}
                            render={({ field }) => {
                              const options = harvestGradeOptions(harvestCropName, field.value);
                              const isOther =
                                isTypingOwnGrade ||
                                (!!field.value && !options.some((o) => o.value === field.value));
                              return (
                                <VStack spacing={2} align="stretch">
                                  <StandardSelect
                                    value={isOther ? OTHER_GRADE : field.value || ''}
                                    onChange={(e) => {
                                      if (e.target.value === OTHER_GRADE) {
                                        setIsTypingOwnGrade(true);
                                        field.onChange('');
                                        return;
                                      }
                                      setIsTypingOwnGrade(false);
                                      field.onChange(e.target.value);
                                    }}>
                                    <option value="">
                                      {intl.formatMessage({ id: 'harvestGrade.placeholder' })}
                                    </option>
                                    {options.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </StandardSelect>
                                  {isOther && (
                                    <StandardInput
                                      value={field.value || ''}
                                      onChange={field.onChange}
                                      placeholder={intl.formatMessage({
                                        id: 'harvestGrade.other.placeholder'
                                      })}
                                      maxLength={MAX_GRADE_LENGTH}
                                    />
                                  )}
                                </VStack>
                              );
                            }}
                          />
                        </StandardField>
                      </Box>

                      {maturity.grainMoisture && (
                        <Box flex={1}>
                          <StandardField
                            label={intl.formatMessage({
                              id: 'events.production.fields.grainMoisture'
                            })}
                            error={errors.grain_moisture?.message}
                            helpText={intl.formatMessage({
                              id: 'production.field.grainMoistureHelp'
                            })}>
                            <Controller
                              name="grain_moisture"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardNumberInput
                                  min={0}
                                  max={100}
                                  precision={1}
                                  step={0.1}
                                  value={field.value || ''}
                                  onChange={(valueString) => field.onChange(valueString)}
                                  placeholder={intl.formatMessage({
                                    id: 'events.production.fields.leaveBlankIfNaPlaceholder'
                                  })}
                                />
                              )}
                            />
                          </StandardField>
                        </Box>
                      )}
                    </HStack>

                    {/* Phase 2: Harvest Method & Brix Levels for Quick Add parity */}
                    <HStack spacing={4} align="stretch">
                      <Box flex={1}>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.harvestMethod'
                          })}
                          error={errors.harvest_method?.message}
                          helpText={intl.formatMessage({
                            id: 'events.production.help.harvestMethod'
                          })}>
                          <Controller
                            name="harvest_method"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect
                                {...field}
                                placeholder={intl.formatMessage({
                                  id: 'events.production.help.harvestMethodPlaceholder'
                                })}>
                                <option value="hand_picking">
                                  {intl.formatMessage({ id: 'app.harvestMethod.handPicking' })}
                                </option>
                                <option value="selective_hand_picking">
                                  {intl.formatMessage({
                                    id: 'app.harvestMethod.selectiveHandPicking'
                                  })}
                                </option>
                                <option value="mechanical">
                                  {intl.formatMessage({ id: 'app.harvestMethod.mechanical' })}
                                </option>
                                <option value="shake_and_catch">
                                  {intl.formatMessage({ id: 'app.harvestMethod.shakeAndCatch' })}
                                </option>
                                <option value="strip_picking">
                                  {intl.formatMessage({ id: 'app.harvestMethod.stripPicking' })}
                                </option>
                              </StandardSelect>
                            )}
                          />
                        </StandardField>
                      </Box>

                      {maturity.brix && (
                        <Box flex={1}>
                          <StandardField
                            label={intl.formatMessage({ id: 'production.brixLevel' })}
                            error={errors.brix_level?.message}
                            helpText={intl.formatMessage({ id: 'production.brixLevelHelp' })}>
                            <Controller
                              name="brix_level"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardNumberInput
                                  min={0}
                                  max={45}
                                  precision={1}
                                  step={0.1}
                                  value={field.value || ''}
                                  onChange={(valueString) => field.onChange(valueString)}
                                  placeholder={intl.formatMessage({
                                    id: 'events.production.fields.leaveBlankIfNaPlaceholder'
                                  })}
                                />
                              )}
                            />
                          </StandardField>
                        </Box>
                      )}

                      {/* F43: Dry matter % — the correct maturity metric for avocado & nuts (the
                            CA orchard ICP). Brix is for citrus/sugar fruit; grain moisture is grain-only. */}
                      {maturity.dryMatter && (
                        <Box flex={1}>
                          <StandardField
                            label={intl.formatMessage({
                              id: 'events.production.fields.dryMatterPercentage'
                            })}
                            error={errors.dry_matter_percentage?.message}
                            helpText={intl.formatMessage({ id: 'production.field.dryMatterHelp' })}>
                            <Controller
                              name="dry_matter_percentage"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardNumberInput
                                  min={0}
                                  max={100}
                                  precision={1}
                                  step={0.1}
                                  value={field.value || ''}
                                  onChange={(valueString) => field.onChange(valueString)}
                                  placeholder={intl.formatMessage({
                                    id: 'events.production.fields.leaveBlankIfNaPlaceholder'
                                  })}
                                />
                              )}
                            />
                          </StandardField>
                        </Box>
                      )}
                    </HStack>
                  </VStack>
                </SectionBox>
              )}

              {/* WS-4 — harvest-record completeness (§ 205.103(b)(2); § 205.202(c)) */}
              {/* Transport and Buffer Use record the same fact this section already holds — what came
                  off, and where it went. They are separate activities because the record does not
                  belong to the pick: a load ships days later, buffer crop is disposed on its own
                  schedule. Keep this list in step with RECORDS_LOT_DISPOSITION above. */}
              {['HA', 'TP', 'BU'].includes(productionType) && (
                <SectionBox>
                  <SectionHeader
                    icon={FaBalanceScale}
                    title={intl.formatMessage({ id: 'production.harvestRecord' })}
                    badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                    description={intl.formatMessage({ id: 'production.harvestRecordHint' })}
                  />
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <StandardField
                      label={intl.formatMessage({ id: 'events.production.fields.harvestLotCode' })}
                      error={errors.harvest_lot_code?.message}
                      helpText={intl.formatMessage({ id: 'production.harvestLotCodeHelp' })}>
                      <Controller
                        name="harvest_lot_code"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardInput
                            {...field}
                            value={field.value || ''}
                            maxLength={60}
                            placeholder={intl.formatMessage({
                              id: 'production.harvestLotCodePlaceholder'
                            })}
                          />
                        )}
                      />
                    </StandardField>
                    <StandardField
                      label={intl.formatMessage({
                        id: 'events.production.fields.amountDetermination'
                      })}
                      error={errors.amount_determination?.message}
                      helpText={intl.formatMessage({ id: 'production.amountDeterminationHelp' })}>
                      <Controller
                        name="amount_determination"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardSelect
                            {...field}
                            placeholder={intl.formatMessage({ id: 'app.select' })}>
                            <option value="estimated">
                              {intl.formatMessage({ id: 'events.amountDetermination.estimated' })}
                            </option>
                            <option value="scale_verified">
                              {intl.formatMessage({
                                id: 'events.amountDetermination.scaleVerified'
                              })}
                            </option>
                          </StandardSelect>
                        )}
                      />
                    </StandardField>

                    {/* Transport endpoints (§ 205.272). `harvest_destination` below is a
                        CATEGORY — stored / sold / handler / feed. It says what KIND of move,
                        never to whom or where, and a load to a custom huller is not a sale, so
                        no SalesRecord carries the counterparty either. TP only: on a harvest
                        the endpoints are the farm and its own storage. */}
                    {productionType === 'TP' && (
                      <>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.transportOrigin'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.production.help.transportOrigin'
                          })}>
                          <Controller
                            name="transport_origin"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardTextarea
                                {...field}
                                rows={2}
                                placeholder={intl.formatMessage({
                                  id: 'events.production.fields.nameAndAddressPlaceholder'
                                })}
                              />
                            )}
                          />
                        </StandardField>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.transportDestination'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.production.help.transportDestination'
                          })}>
                          <Controller
                            name="transport_destination_address"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardTextarea
                                {...field}
                                rows={2}
                                placeholder={intl.formatMessage({
                                  id: 'events.production.fields.nameAndAddressPlaceholder'
                                })}
                              />
                            )}
                          />
                        </StandardField>
                      </>
                    )}

                    {/* Destination + the handler round trip below it belong to a LOAD, so
                        they follow RECORDS_HANDLER (HA, TP). A buffer-use record has no
                        handler leg. Keep in step with the payload gate. */}
                    {['HA', 'TP'].includes(productionType) && (
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.production.fields.harvestDestination'
                        })}
                        error={errors.harvest_destination?.message}
                        helpText={intl.formatMessage({ id: 'production.harvestDestinationHelp' })}>
                        <Controller
                          name="harvest_destination"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect
                              {...field}
                              placeholder={intl.formatMessage({ id: 'app.select' })}>
                              <option value="stored">
                                {intl.formatMessage({ id: 'events.harvestDestination.stored' })}
                              </option>
                              <option value="sold_direct">
                                {intl.formatMessage({ id: 'events.harvestDestination.soldDirect' })}
                              </option>
                              {/* CCOF item 6 — sending a lot to a huller / dryer / cold store /
                                packer is not a sale. Without this option growers recorded the
                                handler as a BUYER, which corrupts the § 205.307 sales table. */}
                              <option value="handler">
                                {intl.formatMessage({ id: 'events.harvestDestination.handler' })}
                              </option>
                              <option value="livestock_feed">
                                {intl.formatMessage({
                                  id: 'events.harvestDestination.livestockFeed'
                                })}
                              </option>
                              <option value="other">
                                {intl.formatMessage({ id: 'events.harvestDestination.other' })}
                              </option>
                            </StandardSelect>
                          )}
                        />
                      </StandardField>
                    )}

                    {/* HA only — a transport or a buffer disposal has one date, not a range. */}
                    {productionType === 'HA' && (
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.production.fields.harvestDateEnd'
                        })}
                        error={errors.harvest_date_end?.message}
                        helpText={intl.formatMessage({ id: 'production.harvestDateEndHelp' })}>
                        <Controller
                          name="harvest_date_end"
                          control={methods.control}
                          render={({ field }) => <StandardInput {...field} type="date" />}
                        />
                      </StandardField>
                    )}

                    {/* Buffer disposition follows RECORDS_BUFFER (HA, BU). A transport
                        record does not decide what happened to buffer rows. */}
                    {['HA', 'BU'].includes(productionType) && (
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.production.fields.bufferDisposition'
                        })}
                        error={errors.buffer_disposition?.message}
                        helpText={intl.formatMessage({ id: 'production.bufferDispositionHelp' })}>
                        <Controller
                          name="buffer_disposition"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect
                              {...field}
                              placeholder={intl.formatMessage({ id: 'app.select' })}>
                              {/* Common-OSP § 6 disposition taxonomy. Legacy
                                harvested_conventional stays valid server-side so stored
                                rows keep rendering, but new entries pick a specific
                                disposition — except when editing a row that already
                                carries the legacy value. */}
                              <option value="not_harvested">
                                {intl.formatMessage({
                                  id: 'events.bufferDisposition.notHarvested'
                                })}
                              </option>
                              <option value="left_in_field">
                                {intl.formatMessage({
                                  id: 'events.bufferDisposition.leftInField'
                                })}
                              </option>
                              <option value="sold_conventional">
                                {intl.formatMessage({
                                  id: 'events.bufferDisposition.soldConventional'
                                })}
                              </option>
                              <option value="fed_nonorganic_livestock">
                                {intl.formatMessage({
                                  id: 'events.bufferDisposition.fedNonorganicLivestock'
                                })}
                              </option>
                              <option value="disposed">
                                {intl.formatMessage({
                                  id: 'events.bufferDisposition.disposed'
                                })}
                              </option>
                              <option value="given_away">
                                {intl.formatMessage({
                                  id: 'events.bufferDisposition.givenAway'
                                })}
                              </option>
                              {field.value === 'harvested_conventional' && (
                                <option value="harvested_conventional">
                                  {intl.formatMessage({
                                    id: 'events.bufferDisposition.harvestedConventional'
                                  })}
                                </option>
                              )}
                            </StandardSelect>
                          )}
                        />
                      </StandardField>
                    )}

                    {/* USDA Buffer Crop Disposition Record: "Commercial quantities of crops
                        require more formal documentation (delivery tags and nonorganic sales
                        records) to show that the buffer crop has not been represented as
                        organic." § 205.202(c). The obligation attaches only once the crop
                        leaves the operation — a disked-under buffer row cannot be mis-sold,
                        so asking for paperwork there would be Trazo inventing a requirement. */}
                    {BUFFER_ENTERS_COMMERCE(watch('buffer_disposition')) && (
                      <>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.bufferDispositionQuantity'
                          })}
                          error={errors.buffer_disposition_quantity?.message}
                          helpText={intl.formatMessage({
                            id: 'events.production.fields.bufferDispositionQuantityHelp'
                          })}>
                          <Controller
                            name="buffer_disposition_quantity"
                            control={methods.control}
                            render={({ field }) => <StandardInput {...field} />}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.bufferDispositionEvidence'
                          })}
                          error={errors.buffer_disposition_evidence?.message}
                          helpText={intl.formatMessage({
                            id: 'events.production.fields.bufferDispositionEvidenceHelp'
                          })}>
                          <Controller
                            name="buffer_disposition_evidence"
                            control={methods.control}
                            render={({ field }) => <StandardInput {...field} />}
                          />
                        </StandardField>
                      </>
                    )}

                    {/* A work order belongs to a pick or a load, not to a buffer disposal. Matches
                        RECORDS_HANDLER on the payload side. */}
                    {['HA', 'TP'].includes(productionType) && (
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.production.fields.harvestContractNumber'
                        })}
                        error={errors.harvest_contract_number?.message}
                        helpText={intl.formatMessage({ id: 'production.harvestContractHelp' })}>
                        <Controller
                          name="harvest_contract_number"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              placeholder={intl.formatMessage({
                                id: 'events.production.fields.harvestContractPlaceholder'
                              })}
                            />
                          )}
                        />
                      </StandardField>
                    )}

                    {/* Off-farm handling round trip — CCOF grower checklist item 6
                        ("what you sent, where, when, and what you received as the outcome").
                        Rides the "handler" destination only, like the storage block below. */}
                    {watch('harvest_destination') === 'handler' && (
                      <>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.sentToHandlerDate'
                          })}
                          error={errors.sent_to_handler_date?.message}
                          helpText={intl.formatMessage({ id: 'production.sentToHandlerDateHelp' })}>
                          <Controller
                            name="sent_to_handler_date"
                            control={methods.control}
                            render={({ field }) => <StandardInput {...field} type="date" />}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.quantitySentToHandler'
                          })}
                          error={errors.quantity_sent_to_handler?.message}
                          helpText={intl.formatMessage({
                            id: 'production.quantitySentToHandlerHelp'
                          })}>
                          <HStack spacing={2}>
                            <Controller
                              name="quantity_sent_to_handler"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardInput
                                  {...field}
                                  flex={2}
                                  type="number"
                                  step="0.01"
                                  min={0}
                                  placeholder="0.00"
                                />
                              )}
                            />
                            <Controller
                              name="handler_quantity_unit"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardSelect {...field} flex={1}>
                                  <option value="lbs">
                                    {intl.formatMessage({ id: 'app.unit.lbs' })}
                                  </option>
                                  <option value="kg">
                                    {intl.formatMessage({ id: 'app.unit.kg' })}
                                  </option>
                                  <option value="tons">
                                    {intl.formatMessage({ id: 'events.units.yield.tons' })}
                                  </option>
                                  <option value="bins">
                                    {intl.formatMessage({ id: 'events.units.yield.bins' })}
                                  </option>
                                  <option value="boxes">
                                    {intl.formatMessage({ id: 'events.units.yield.boxes' })}
                                  </option>
                                </StandardSelect>
                              )}
                            />
                          </HStack>
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.quantityReturnedFromHandler'
                          })}
                          error={errors.quantity_returned_from_handler?.message}
                          helpText={intl.formatMessage({
                            id: 'production.quantityReturnedFromHandlerHelp'
                          })}>
                          <HStack spacing={2}>
                            <Controller
                              name="quantity_returned_from_handler"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardInput
                                  {...field}
                                  flex={2}
                                  type="number"
                                  step="0.01"
                                  min={0}
                                  placeholder="0.00"
                                />
                              )}
                            />
                            {/* A SEPARATE unit from the one sent: hulling changes the unit
                                (in-shell in, shelled out). */}
                            <Controller
                              name="handler_return_unit"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardSelect {...field} flex={1}>
                                  <option value="lbs">
                                    {intl.formatMessage({ id: 'app.unit.lbs' })}
                                  </option>
                                  <option value="kg">
                                    {intl.formatMessage({ id: 'app.unit.kg' })}
                                  </option>
                                  <option value="tons">
                                    {intl.formatMessage({ id: 'events.units.yield.tons' })}
                                  </option>
                                  <option value="bins">
                                    {intl.formatMessage({ id: 'events.units.yield.bins' })}
                                  </option>
                                  <option value="boxes">
                                    {intl.formatMessage({ id: 'events.units.yield.boxes' })}
                                  </option>
                                </StandardSelect>
                              )}
                            />
                          </HStack>
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.handlerDocumentReference'
                          })}
                          error={errors.handler_document_reference?.message}
                          helpText={intl.formatMessage({
                            id: 'production.handlerDocumentReferenceHelp'
                          })}>
                          <Controller
                            name="handler_document_reference"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput
                                {...field}
                                placeholder={intl.formatMessage({
                                  id: 'events.production.fields.handlerDocumentReferencePlaceholder'
                                })}
                              />
                            )}
                          />
                        </StandardField>
                      </>
                    )}

                    {/* Storage traceability — only meaningful when the lot's first hop
                        is on-farm storage (NOP 205.272 commingling; FSMA 204 KDE). */}
                    {watch('harvest_destination') === 'stored' && (
                      <>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.storageLocation'
                          })}
                          error={errors.storage_location?.message}
                          helpText={intl.formatMessage({ id: 'production.storageLocationHelp' })}>
                          <Controller
                            name="storage_location"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput
                                {...field}
                                placeholder={intl.formatMessage({
                                  id: 'events.production.fields.storageLocationPlaceholder'
                                })}
                              />
                            )}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.storageTemperatureF'
                          })}
                          error={errors.storage_temperature_f?.message}
                          helpText={intl.formatMessage({
                            id: 'production.storageTemperatureHelp'
                          })}>
                          <Controller
                            name="storage_temperature_f"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput {...field} type="number" step="0.1" />
                            )}
                          />
                        </StandardField>
                      </>
                    )}
                  </SimpleGrid>
                </SectionBox>
              )}

              {/* Sprint 5: Aggregate Harvest Summary Toggle & Fields */}
              {productionType === 'HA' && (
                <SectionBox>
                  <SectionHeader
                    icon={FaBalanceScale}
                    title={intl.formatMessage({ id: 'events.section.production.harvestSummary' })}
                    badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                    description={intl.formatMessage({
                      id: 'events.production.help.harvestSummary'
                    })}
                  />
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    {/* Sprint 5: Aggregate Harvest Toggle */}
                    <Box gridColumn={{ md: 'span 2' }} mb={2}>
                      <HStack
                        p={3}
                        bg={isSummaryMode ? 'white' : 'gray.50'}
                        borderRadius="md"
                        borderWidth="1px"
                        borderColor={isSummaryMode ? 'gray.300' : 'gray.200'}
                        justify="space-between">
                        <VStack align="start" spacing={0}>
                          <HStack>
                            <Text fontWeight="semibold" fontSize="sm">
                              {intl.formatMessage({
                                id: 'events.section.production.harvestSummary'
                              })}
                            </Text>
                          </HStack>
                          <Text fontSize="xs" color="gray.600">
                            {intl.formatMessage({
                              id: isSummaryMode
                                ? 'events.section.production.harvestSummaryOn'
                                : 'events.section.production.harvestSummaryOff'
                            })}
                          </Text>
                        </VStack>
                        <Controller
                          name="is_summary"
                          control={methods.control}
                          render={({ field }) => (
                            <Switch
                              size="lg"
                              isChecked={field.value === 'true'}
                              onChange={(e) => field.onChange(e.target.checked ? 'true' : 'false')}
                            />
                          )}
                        />
                      </HStack>
                    </Box>

                    {/* Sprint 5: Aggregate Harvest Fields (shown when summary mode is active) */}
                    {isSummaryMode && (
                      <>
                        <StandardField
                          label={intl.formatMessage({ id: 'production.field.periodStart' })}
                          required>
                          <Controller
                            name="date_start"
                            control={methods.control}
                            render={({ field }) => <StandardInput {...field} type="date" />}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({ id: 'production.field.periodEnd' })}
                          required>
                          <Controller
                            name="date_end"
                            control={methods.control}
                            render={({ field }) => <StandardInput {...field} type="date" />}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({ id: 'production.field.harvestCount' })}
                          required>
                          <Controller
                            name="event_count"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput
                                {...field}
                                type="number"
                                min="1"
                                placeholder={intl.formatMessage(
                                  { id: 'events.production.fields.examplePlaceholder' },
                                  { value: '24' }
                                )}
                              />
                            )}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({ id: 'production.field.totalYield' })}
                          required>
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
                                  placeholder={intl.formatMessage(
                                    { id: 'events.production.fields.examplePlaceholder' },
                                    { value: '5000' }
                                  )}
                                />
                              )}
                            />
                            <Controller
                              name="yield_total_unit"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardSelect {...field} flex={1}>
                                  <option value="lbs">
                                    {intl.formatMessage({ id: 'events.units.pounds' })}
                                  </option>
                                  <option value="kg">
                                    {intl.formatMessage({ id: 'events.units.kilograms' })}
                                  </option>
                                  <option value="tons">
                                    {intl.formatMessage({ id: 'events.units.tonnes' })}
                                  </option>
                                  <option value="boxes">
                                    {intl.formatMessage({ id: 'events.units.boxes' })}
                                  </option>
                                  <option value="bins">
                                    {intl.formatMessage({ id: 'events.units.bins' })}
                                  </option>
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
                <SectionBox>
                  <SectionHeader
                    icon={FaSeedling}
                    title={intl.formatMessage({ id: 'fieldDetails.title' })}
                    badge={intl.formatMessage({ id: 'fieldDetails.badge' })}
                    description={intl.formatMessage({ id: 'fieldDetails.description' })}
                  />
                  <SimpleGrid
                    columns={{ base: 1, md: ['PL', 'TR', 'HA'].includes(productionType) ? 2 : 3 }}
                    spacing={4}>
                    <StandardField
                      label={intl.formatMessage({ id: 'fieldDetails.variety' })}
                      helpText={intl.formatMessage({ id: 'fieldDetails.varietyHelp' })}>
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

                    {!multiTarget && <BlockIdField control={methods.control} />}

                    {/* Perennial planting stock — PL/TR only. Added 2026-08-15: for a
                        California orchard "40 Hass on Duke 7" is the sentence a grower says,
                        and until now only the variety half of it had anywhere to go. */}
                    {['PL', 'TR'].includes(productionType) && (
                      <>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.rootstock',
                            defaultMessage: 'Rootstock'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.production.fields.rootstockHelp',
                            defaultMessage:
                              'Planting stock under 7 CFR 205.2 — its organic status is what § 205.204 tests.'
                          })}>
                          <Controller
                            name="rootstock"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput
                                {...field}
                                placeholder={intl.formatMessage({
                                  id: 'events.production.fields.rootstockPlaceholder',
                                  defaultMessage: 'e.g., Duke 7, Dusa clonal'
                                })}
                              />
                            )}
                          />
                        </StandardField>

                        {!multiTarget && (
                          <StandardField
                            label={intl.formatMessage({
                              id: 'events.production.fields.plantsEstablished',
                              defaultMessage: 'Trees / Plants Planted'
                            })}
                            helpText={intl.formatMessage({
                              id: 'events.production.fields.plantsEstablishedHelp',
                              defaultMessage:
                                'The number a certifier reconciles against the nursery invoice.'
                            })}>
                            <Controller
                              name="plants_established"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardInput {...field} type="number" min={0} placeholder="0" />
                              )}
                            />
                          </StandardField>
                        )}

                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.plantSpacing',
                            defaultMessage: 'Spacing / Density'
                          })}>
                          <Controller
                            name="plant_spacing"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput
                                {...field}
                                placeholder={intl.formatMessage({
                                  id: 'events.production.fields.plantSpacingPlaceholder',
                                  defaultMessage: 'e.g., 27 ft x 22 ft or 73 trees/ac'
                                })}
                              />
                            )}
                          />
                        </StandardField>
                      </>
                    )}

                    {/* Growth Stage — hidden for PL, TR (meaningless at planting), HA
                        (always harvest_ready), and the record-only subtypes SS/TP/BU
                        (a sourcing search, a haul and a disposition have no phenology;
                        the display registry never shows the value for them). */}
                    {!['PL', 'TR', 'HA', 'SS', 'TP', 'BU'].includes(productionType) && (
                      <StandardField
                        label={intl.formatMessage({ id: 'fieldDetails.growthStage' })}
                        helpText={intl.formatMessage({ id: 'fieldDetails.growthStageHelp' })}>
                        <Controller
                          name="growth_stage"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect
                              {...field}
                              placeholder={intl.formatMessage({
                                id: 'events.chemical.form.growthStagePlaceholder'
                              })}>
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
                <SectionBox>
                  <SectionHeader
                    icon={FaSeedling}
                    title={intl.formatMessage({ id: 'production.pollination.title' })}
                    badge={intl.formatMessage({ id: 'production.pollination.badge' })}
                    description={intl.formatMessage({ id: 'production.pollination.description' })}
                  />
                  <VStack spacing={4} align="stretch">
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <StandardField
                        label={intl.formatMessage({ id: 'production.pollination.varietyLabel' })}
                        helpText={intl.formatMessage({
                          id: 'production.pollination.varietyHelp'
                        })}>
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

                      {!multiTarget && <BlockIdField control={methods.control} />}

                      <StandardField
                        label={intl.formatMessage({
                          id: 'production.pollination.pollinatorType'
                        })}
                        helpText={intl.formatMessage({
                          id: 'production.pollination.pollinatorTypeHelp'
                        })}>
                        <Controller
                          name="pollinator_type"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect
                              {...field}
                              placeholder={intl.formatMessage({
                                id: 'events.production.fields.pollinatorTypePlaceholder'
                              })}>
                              <option value="honeybee">
                                {intl.formatMessage({ id: 'production.pollination.honeybee' })}
                              </option>
                              <option value="mason_bee">
                                {intl.formatMessage({ id: 'production.pollination.mason_bee' })}
                              </option>
                              <option value="bumblebee">
                                {intl.formatMessage({ id: 'production.pollination.bumblebee' })}
                              </option>
                              <option value="native_pollinators">
                                {intl.formatMessage({
                                  id: 'production.pollination.native_pollinators'
                                })}
                              </option>
                              <option value="wind">
                                {intl.formatMessage({ id: 'production.pollination.wind' })}
                              </option>
                            </StandardSelect>
                          )}
                        />
                      </StandardField>

                      {!multiTarget && (
                        <StandardField
                          label={intl.formatMessage({ id: 'production.pollination.hiveCount' })}
                          error={errors.hive_count?.message}
                          helpText={intl.formatMessage({
                            id: 'production.pollination.hiveCountHelp'
                          })}>
                          <Controller
                            name="hive_count"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardNumberInput
                                min={0}
                                precision={0}
                                step={1}
                                value={field.value || ''}
                                onChange={(valueString) => field.onChange(valueString)}
                                placeholder={intl.formatMessage(
                                  { id: 'events.production.fields.examplePlaceholder' },
                                  { value: '4' }
                                )}
                              />
                            )}
                          />
                        </StandardField>
                      )}

                      <StandardField
                        label={intl.formatMessage({ id: 'production.pollination.placementDate' })}
                        helpText={intl.formatMessage({
                          id: 'production.pollination.placementDateHelp'
                        })}>
                        <Controller
                          name="placement_date"
                          control={methods.control}
                          render={({ field }) => <StandardInput {...field} type="date" />}
                        />
                      </StandardField>

                      <StandardField
                        label={intl.formatMessage({ id: 'production.pollination.removalDate' })}
                        helpText={intl.formatMessage({
                          id: 'production.pollination.removalDateHelp'
                        })}>
                        <Controller
                          name="removal_date"
                          control={methods.control}
                          render={({ field }) => <StandardInput {...field} type="date" />}
                        />
                      </StandardField>
                    </SimpleGrid>
                  </VStack>
                </SectionBox>
              )}

              {/* Phase 2: Post-Harvest Processing (PH) specific fields */}
              {productionType === 'PH' && (
                <SectionBox>
                  <SectionHeader
                    icon={FaTools}
                    title={intl.formatMessage({ id: 'production.postHarvest.title' })}
                    badge={intl.formatMessage({ id: 'production.postHarvest.badge' })}
                    description="Document post-harvest handling and processing operations for full traceability."
                  />
                  <VStack spacing={4} align="stretch">
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <StandardField
                        label={intl.formatMessage({ id: 'production.postHarvest.varietyLabel' })}
                        helpText={intl.formatMessage({
                          id: 'production.postHarvest.varietyHelp'
                        })}>
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
                        })}>
                        <Controller
                          name="processing_type"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect
                              {...field}
                              placeholder={intl.formatMessage({
                                id: 'events.production.fields.processingTypePlaceholder'
                              })}>
                              <option value="washing">
                                {intl.formatMessage({ id: 'production.postHarvest.washing' })}
                              </option>
                              <option value="cooling">
                                {intl.formatMessage({ id: 'production.postHarvest.cooling' })}
                              </option>
                              <option value="drying">
                                {intl.formatMessage({ id: 'production.postHarvest.drying' })}
                              </option>
                              <option value="sorting">
                                {intl.formatMessage({ id: 'production.postHarvest.sorting' })}
                              </option>
                              <option value="grading">
                                {intl.formatMessage({ id: 'production.postHarvest.grading' })}
                              </option>
                              <option value="packing">
                                {intl.formatMessage({ id: 'production.postHarvest.packing' })}
                              </option>
                              <option value="hulling">
                                {intl.formatMessage({ id: 'production.postHarvest.hulling' })}
                              </option>
                              <option value="shelling">
                                {intl.formatMessage({ id: 'production.postHarvest.shelling' })}
                              </option>
                              <option value="pressing">
                                {intl.formatMessage({ id: 'production.postHarvest.pressing' })}
                              </option>
                              <option value="milling">
                                {intl.formatMessage({ id: 'production.postHarvest.milling' })}
                              </option>
                              <option value="smoking">
                                {intl.formatMessage({ id: 'production.postHarvest.smoking' })}
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
                        })}>
                        <Controller
                          name="processing_duration_hours"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardNumberInput
                              min={0}
                              precision={1}
                              step={0.5}
                              value={field.value || ''}
                              onChange={(valueString) => field.onChange(valueString)}
                              placeholder={intl.formatMessage(
                                { id: 'events.production.fields.examplePlaceholder' },
                                { value: '4.5' }
                              )}
                            />
                          )}
                        />
                      </StandardField>
                    </SimpleGrid>

                    <Box
                      p={3}
                      bg={watch('temperature_control') === 'true' ? 'white' : 'gray.50'}
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor={
                        watch('temperature_control') === 'true' ? 'gray.300' : 'gray.200'
                      }>
                      <HStack justify="space-between">
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="semibold" fontSize="sm">
                            {' '}
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
                              size="lg"
                              isChecked={field.value === 'true'}
                              onChange={(e) => field.onChange(e.target.checked ? 'true' : 'false')}
                            />
                          )}
                        />
                      </HStack>
                    </Box>

                    {/*
                      NOP 5026: chlorine residual is capped at the SDWA MRDL at the point of
                      LAST CROP CONTACT. That point is here — the dump tank, hydrocooler or
                      huller — not the equipment-cleaning log where this block used to live.
                      Shown only for wet operations; a dry sort or pack has no wash water and
                      an empty sanitizer section invites fabricated readings.
                    */}
                    {['washing', 'cooling', 'hulling', 'shelling'].includes(
                      watch('processing_type')
                    ) && sanitizerRecordBlock}
                  </VStack>
                </SectionBox>
              )}

              {/* Phase 2: Canopy Management (CM) specific fields */}
              {productionType === 'CM' && (
                <SectionBox>
                  <SectionHeader
                    icon={FaSeedling}
                    title={intl.formatMessage({ id: 'production.canopy.title' })}
                    badge={intl.formatMessage({ id: 'production.canopy.badge' })}
                    description="Document canopy management operations for transparency and carbon-accurate equipment tracking."
                  />
                  <VStack spacing={4} align="stretch">
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <StandardField
                        label={intl.formatMessage({ id: 'fieldDetails.variety' })}
                        helpText={intl.formatMessage({ id: 'production.canopy.varietyHelp' })}>
                        <Controller
                          name="variety"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              placeholder={intl.formatMessage({
                                id: 'events.production.fields.canopyVarietyPlaceholder'
                              })}
                            />
                          )}
                        />
                      </StandardField>

                      {!multiTarget && <BlockIdField control={methods.control} />}

                      <StandardField
                        label={intl.formatMessage({ id: 'fieldDetails.growthStage' })}
                        helpText={intl.formatMessage({ id: 'production.canopy.growthStageHelp' })}>
                        <Controller
                          name="growth_stage"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect
                              {...field}
                              placeholder={intl.formatMessage({
                                id: 'events.chemical.form.growthStagePlaceholder'
                              })}>
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
                        helpText={intl.formatMessage({ id: 'production.canopy.operationHelp' })}>
                        <Controller
                          name="canopy_operation"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect
                              {...field}
                              placeholder={intl.formatMessage({
                                id: 'events.production.fields.canopyOperationPlaceholder'
                              })}>
                              <option value="pruning">
                                {intl.formatMessage({ id: 'production.canopy.pruning' })}
                              </option>
                              <option value="leaf_pulling">
                                {intl.formatMessage({ id: 'production.canopy.leaf_pulling' })}
                              </option>
                              <option value="hedging">
                                {intl.formatMessage({ id: 'production.canopy.hedging' })}
                              </option>
                              <option value="shoot_positioning">
                                {intl.formatMessage({
                                  id: 'production.canopy.shoot_positioning'
                                })}
                              </option>
                              <option value="thinning">
                                {intl.formatMessage({ id: 'production.canopy.thinning' })}
                              </option>
                              <option value="tucking">
                                {intl.formatMessage({ id: 'production.canopy.tucking' })}
                              </option>
                              <option value="suckering">
                                {intl.formatMessage({ id: 'production.canopy.suckering' })}
                              </option>
                            </StandardSelect>
                          )}
                        />
                      </StandardField>

                      <StandardField
                        label={intl.formatMessage({ id: 'production.canopy.passNumber' })}
                        error={errors.pass_number?.message}
                        helpText={intl.formatMessage({ id: 'production.canopy.passNumberHelp' })}>
                        <Controller
                          name="pass_number"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardNumberInput
                              min={1}
                              precision={0}
                              step={1}
                              value={field.value || ''}
                              onChange={(valueString) => field.onChange(valueString)}
                              placeholder={intl.formatMessage(
                                { id: 'events.production.fields.examplePlaceholder' },
                                { value: '1' }
                              )}
                            />
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
                <SectionBox>
                  <SectionHeader
                    icon={FaShieldAlt}
                    title={intl.formatMessage({ id: 'events.section.production.frostProtection' })}
                    badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                    description="Document the frost-protection method and conditions. Record the equipment fuel and run hours in the Fuel & Equipment section below so the carbon impact is captured."
                  />{' '}
                  <VStack spacing={4} align="stretch">
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.production.fields.protectionMethod'
                        })}
                        helpText={intl.formatMessage({
                          id: 'production.field.protectionMethodHelp'
                        })}>
                        <Controller
                          name="protection_method"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect
                              {...field}
                              placeholder={intl.formatMessage({
                                id: 'events.production.fields.protectionMethodPlaceholder'
                              })}>
                              <option value="wind_machine">
                                {intl.formatMessage({
                                  id: 'events.production.fields.frostMethod.windMachine'
                                })}
                              </option>
                              <option value="orchard_heater">
                                {intl.formatMessage({
                                  id: 'events.production.fields.frostMethod.orchardHeater'
                                })}
                              </option>
                              <option value="under_tree_sprinkler">
                                {intl.formatMessage({
                                  id: 'events.production.fields.frostMethod.underTreeSprinkler'
                                })}
                              </option>
                              <option value="other">
                                {intl.formatMessage({
                                  id: 'events.production.fields.frostMethod.other'
                                })}
                              </option>
                            </StandardSelect>
                          )}
                        />
                      </StandardField>

                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.production.fields.lowTemperature'
                        })}
                        error={errors.low_temperature?.message}
                        helpText="Lowest temperature that triggered protection">
                        <Controller
                          name="low_temperature"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              type="number"
                              step="0.1"
                              placeholder={intl.formatMessage(
                                { id: 'events.production.fields.examplePlaceholder' },
                                { value: '-2.0' }
                              )}
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
                <SectionBox>
                  <SectionHeader
                    icon={FaSeedling}
                    title={intl.formatMessage({ id: 'events.section.production.orchardFloor' })}
                    badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                    description="Document the floor-management operation. Record equipment fuel and run hours in the Fuel & Equipment section below so the carbon impact is captured."
                  />{' '}
                  <VStack spacing={4} align="stretch">
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'production.floorManagement.typeLabel',
                          defaultMessage: 'Floor Management Type'
                        })}
                        helpText={intl.formatMessage({
                          id: 'production.floorManagement.typeHelp',
                          defaultMessage:
                            'The operation performed on the orchard floor / row middles. Record propane use for flame weeding in Fuel & Equipment below.'
                        })}>
                        <Controller
                          name="floor_management_type"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect
                              {...field}
                              placeholder={intl.formatMessage({
                                id: 'production.floorManagement.typePlaceholder',
                                defaultMessage: 'Select operation...'
                              })}>
                              <option value="mow">
                                {intl.formatMessage({
                                  id: 'production.floorManagement.mow',
                                  defaultMessage: 'Mow'
                                })}
                              </option>
                              <option value="mulch">
                                {intl.formatMessage({
                                  id: 'production.floorManagement.mulch',
                                  defaultMessage: 'Mulch'
                                })}
                              </option>
                              <option value="cover_crop_mgmt">
                                {intl.formatMessage({
                                  id: 'production.floorManagement.coverCropMgmt',
                                  defaultMessage: 'Cover-crop management'
                                })}
                              </option>
                              {/* Flame weeding: 6 passes/yr in the UC Davis 2024 organic
                                  almond cost study. `herbicide_strip` was removed here —
                                  a synthetic herbicide strip is prohibited under
                                  7 CFR 205.105 for the certified-organic ICP. */}
                              <option value="flame_weed">
                                {intl.formatMessage({
                                  id: 'production.floorManagement.flameWeed',
                                  defaultMessage: 'Flame weeding (propane)'
                                })}
                              </option>
                            </StandardSelect>
                          )}
                        />
                      </StandardField>
                    </SimpleGrid>
                  </VStack>
                </SectionBox>
              )}

              {/* Phase 2: Pruning Summary Mode (mirrors IR and HA summary pattern) */}
              {productionType === 'PR' && !multiTarget && (
                <SectionBox>
                  <SectionHeader
                    icon={FaSeedling}
                    title={intl.formatMessage({ id: 'production.pruning.summaryTitle' })}
                    badge={intl.formatMessage({ id: 'production.pruning.summaryBadge' })}
                    description={intl.formatMessage({
                      id: 'production.pruning.summaryDescription'
                    })}
                  />
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <Box gridColumn={{ md: 'span 2' }} mb={2}>
                      <HStack
                        p={3}
                        bg={isSummaryMode ? 'white' : 'gray.50'}
                        borderRadius="md"
                        borderWidth="1px"
                        borderColor={isSummaryMode ? 'gray.300' : 'gray.200'}
                        justify="space-between">
                        <VStack align="start" spacing={0}>
                          <HStack>
                            <Text fontWeight="semibold" fontSize="sm">
                              {' '}
                              {intl.formatMessage({
                                id: 'production.pruning.summaryToggleLabel'
                              })}
                            </Text>
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
                              size="lg"
                              isChecked={field.value === 'true'}
                              onChange={(e) => field.onChange(e.target.checked ? 'true' : 'false')}
                            />
                          )}
                        />
                      </HStack>
                    </Box>

                    {isSummaryMode && (
                      <>
                        <StandardField
                          label={intl.formatMessage({ id: 'production.field.periodStart' })}
                          required>
                          <Controller
                            name="date_start"
                            control={methods.control}
                            render={({ field }) => <StandardInput {...field} type="date" />}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({ id: 'production.field.periodEnd' })}
                          required>
                          <Controller
                            name="date_end"
                            control={methods.control}
                            render={({ field }) => <StandardInput {...field} type="date" />}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({ id: 'production.pruning.passes' })}
                          required>
                          <Controller
                            name="pruning_passes"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput
                                {...field}
                                type="number"
                                min="1"
                                placeholder={intl.formatMessage(
                                  { id: 'events.production.fields.examplePlaceholder' },
                                  { value: '5' }
                                )}
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
              {/* Gated by the SAME list as the fields inside it. `!== 'PO'` let the section
                  render for BU/TP/SS, which have no fuel fields — an empty shell around one
                  inert control. */}
              {FUEL_REPORTING_SUBTYPES.includes(productionType) && (
                <CollapsibleSection
                  icon={FaSeedling}
                  title={intl.formatMessage({ id: 'events.section.fuelEquipment' })}
                  badge={intl.formatMessage({ id: 'events.section.badge.optionalCarbon' })}
                  description={intl.formatMessage({ id: 'events.section.desc.carbonOptional' })}
                  badgeTone="optional">
                  {' '}
                  <VStack spacing={4} align="stretch">
                    {/* Production Method - Manual operation detection for Trazo's Direct Operational
                    Emissions philosophy. Documenting "Hand thinning with pruning shears",
                    "Hand weeding", etc. produces accurate ~5 kg CO2e (manual labor estimate)
                    instead of USDA blanket mechanical averages (~150 kg). Only shown for types
                    where hand labor is common (thinning, pruning, transplanting, cultivation,
                    harvesting, canopy management). */}
                    {/* PL added 2026-08-15: hand-planting had nowhere to go, so the carbon path
                        fell back to USDA MECHANICAL averages for an operation done with a shovel.
                        MO added the same day to close a hole the registry opened — `method`
                        declares MO on the modal surface, and without MO here it displayed a field
                        no grower could fill. */}
                    {['HA', 'PL', 'PR', 'TR', 'CU', 'TH', 'CM', 'MO'].includes(productionType) && (
                      <StandardField
                        label={intl.formatMessage({ id: 'production.field.productionMethod' })}
                        helpText="Describe how this was done (e.g. 'Hand thinning with pruning shears'). If manual, carbon is calculated at ~0.1 kg CO₂e/acre instead of USDA mechanical averages.">
                        <Controller
                          name="production_method"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              placeholder={intl.formatMessage({
                                id: 'events.production.fields.productionMethodPlaceholder'
                              })}
                            />
                          )}
                        />
                      </StandardField>
                    )}

                    {/* One labelled group instead of three bare inputs.
                        The Planting teardown proposed COLLAPSING these behind a disclosure —
                        reconsidered and NOT done, because the only two ways to collapse them
                        both cost more than they buy: unmounting the inputs blinds the
                        render-conformance sweep that guards this tab, and hiding them while
                        mounted leaves focusable controls inside a zero-height box. The real
                        complaint was that three always-visible inputs READ as required
                        certifier fields when they are neither. A header that says so fixes
                        that without hiding anything. */}
                    {FUEL_REPORTING_SUBTYPES.includes(productionType) && (
                      <Box gridColumn={{ md: 'span 2' }} pt={2}>
                        <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                          {intl.formatMessage({ id: 'production.equipmentFuel.groupTitle' })}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {intl.formatMessage({ id: 'production.equipmentFuel.groupHelp' })}
                        </Text>
                      </Box>
                    )}

                    {/* Fuel Type - Only for fuel-consuming operations */}
                    {/* CRITICAL FIX (2025-01-21): Removed EQ (standalone Equipment type 4), kept EM (Production subtype) */}
                    {/* ELECTRIC EQUIPMENT FIX (2025-12-14): Added IR for electric irrigation pumps, PR/TH for powered pruning/thinning */}
                    {/* Phase 2: Added PH (Post-Harvest Processing) for processing equipment fuel */}
                    {FUEL_REPORTING_SUBTYPES.includes(productionType) && (
                      <StandardField
                        label={intl.formatMessage({ id: 'events.common.fields.fuelType' })}
                        error={errors.fuel_type?.message}
                        helpText="Select a fuel type only if powered equipment was used. Leave blank for hand/manual operations — carbon is estimated as manual labor (~0.1 kg CO₂e/acre).">
                        <Controller
                          name="fuel_type"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect
                              {...field}
                              placeholder={intl.formatMessage({
                                id: 'events.chemical.form.fuelTypePlaceholder'
                              })}>
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
                    {FUEL_REPORTING_SUBTYPES.includes(productionType) && (
                      <>
                        {/* For electric irrigation, energy is auto-calculated from water volume + water source */}
                        {productionType === 'IR' && watch('fuel_type') !== 'diesel' ? (
                          <StandardAlert
                            status="info"
                            mb={0}
                            title={intl.formatMessage({
                              id: 'events.production.electricPump.title'
                            })}
                            description={intl.formatMessage({
                              id: 'events.production.electricPump.body'
                            })}
                          />
                        ) : (
                          <>
                            <HStack spacing={4} align="stretch">
                              {!multiTarget && (
                                <Box flex={2}>
                                  <StandardField
                                    label={intl.formatMessage({
                                      id:
                                        watch('fuel_type') === 'electric'
                                          ? 'production.field.energyAmount'
                                          : 'events.common.fields.fuelConsumed'
                                    })}
                                    error={errors.fuel_consumed?.message}
                                    helpText={
                                      watch('fuel_type') === 'electric'
                                        ? 'Energy consumption for carbon emission calculation'
                                        : 'Fuel consumption for carbon emission calculation'
                                    }>
                                    <Controller
                                      name="fuel_consumed"
                                      control={methods.control}
                                      render={({ field }) => (
                                        // Explicit id because the carbon panel below links
                                        // straight to this input, and Chakra's
                                        // NumberInputField renders no `name` attribute of its
                                        // own to find it by.
                                        <StandardNumberInput
                                          min={0}
                                          precision={1}
                                          step={0.1}
                                          value={field.value || ''}
                                          onChange={(valueString) => field.onChange(valueString)}
                                          id={FUEL_CONSUMED_INPUT_ID}
                                          placeholder={
                                            watch('fuel_type') === 'electric'
                                              ? 'e.g., 50 kWh'
                                              : 'Optional'
                                          }
                                        />
                                      )}
                                    />
                                  </StandardField>
                                </Box>
                              )}

                              <Box flex={1}>
                                <StandardField
                                  label={intl.formatMessage({ id: 'production.field.unit' })}
                                  helpText={
                                    multiTarget
                                      ? intl.formatMessage({
                                          id: 'events.multiParcel.fuelUnitHelp'
                                        })
                                      : undefined
                                  }>
                                  <Controller
                                    name="fuel_unit"
                                    control={methods.control}
                                    render={({ field }) => (
                                      <StandardSelect {...field}>
                                        {/* ELECTRIC EQUIPMENT FIX (2025-12-14): Show only relevant units based on fuel type */}
                                        {watch('fuel_type') === 'electric' ? (
                                          <option value="kWh">
                                            {intl.formatMessage({
                                              id: 'events.units.kilowattHours'
                                            })}
                                          </option>
                                        ) : (
                                          <>
                                            <option value="L">
                                              {intl.formatMessage({ id: 'events.units.liters' })}
                                            </option>
                                            <option value="gal">
                                              {intl.formatMessage({ id: 'events.units.gallons' })}
                                            </option>
                                            <option value="kg">
                                              {intl.formatMessage({ id: 'events.units.kilograms' })}
                                            </option>
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
                              <StandardAlert
                                status="info"
                                mb={0}
                                title={intl.formatMessage({ id: 'events.electricEquipment.title' })}
                                description={intl.formatMessage({
                                  id: 'events.electricEquipment.body'
                                })}
                              />
                            )}
                          </>
                        )}
                      </>
                    )}

                    {/* Equipment Hours */}
                    {!multiTarget && (
                      <StandardField
                        label={intl.formatMessage({ id: 'events.common.fields.equipmentHours' })}
                        error={errors.equipment_hours?.message}
                        /* Was "Used for calculating fuel efficiency and carbon per hour".
                         That is not true and has not been since the hours multiplier was
                         removed in 2025 (USDA per-hectare factors are area-based; scaling
                         them by time double-counted). MEASURED 2026-08-20: entering 10
                         equipment hours changes co2e by exactly 0 for every one of the 16
                         production subtypes. A field that claims to drive a number it
                         cannot touch is the same defect class as a form key nothing
                         downstream reads — the farmer fills it in expecting an effect and
                         calibrates their trust on the result. */
                        helpText={intl.formatMessage({ id: 'production.equipmentHours.help' })}>
                        <Controller
                          name="equipment_hours"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardNumberInput
                              min={0}
                              precision={1}
                              step={0.1}
                              value={field.value || ''}
                              onChange={(valueString) => field.onChange(valueString)}
                              placeholder={intl.formatMessage({
                                id: 'events.production.fields.optionalPlaceholder'
                              })}
                            />
                          )}
                        />
                      </StandardField>
                    )}

                    {/* The carbon panel lives HERE, not in a sidebar. It reports on the
                        fields directly above it, and when fuel is left blank its "Enter
                        your actual fuel" link has somewhere to send the operator that is
                        two rows up rather than half a screen away. */}
                    {(carbonCalculation || isCalculatingCarbon) && (
                      <CarbonImpactPreview
                        eventType="Production"
                        /* LIVE values, not `initialValues`. The panel branches on
                           `type`/`electricity_source` to decide whether to show the
                           zero-emission pollination copy or the solar-pump note, and
                           `initialValues` is the seed the form was mounted with — empty on
                           a new event, so those branches would never fire. */
                        formData={{
                          ...initialValues,
                          type: productionType,
                          electricity_source: watch('electricity_source')
                        }}
                        calculation={carbonCalculation}
                        isCalculating={isCalculatingCarbon}
                        onEnterActualFuel={focusFuelConsumed}
                      />
                    )}
                  </VStack>
                </CollapsibleSection>
              )}

              {/* Transportation - For logistics emissions. TP is the activity that IS the
                  haul — it had origin and destination but nowhere to put the distance. */}
              {['HA', 'TP'].includes(productionType) && (
                <SectionBox>
                  <SectionHeader
                    icon={FaTruck}
                    title={intl.formatMessage({ id: 'events.section.production.transport' })}
                    badge={intl.formatMessage({ id: 'events.section.badge.optionalCarbon' })}
                    badgeTone="optional"
                  />
                  <VStack spacing={4} align="stretch">
                    <HStack spacing={4} align="stretch">
                      <Box flex={2}>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.transportationDistance'
                          })}
                          error={errors.transportation_distance?.message}
                          helpText="Distance for transporting harvest affects carbon footprint">
                          <Controller
                            name="transportation_distance"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardNumberInput
                                min={0}
                                precision={1}
                                step={0.1}
                                value={field.value || ''}
                                onChange={(valueString) => field.onChange(valueString)}
                                placeholder={intl.formatMessage({
                                  id: 'events.production.fields.optionalPlaceholder'
                                })}
                              />
                            )}
                          />
                        </StandardField>
                      </Box>

                      <Box flex={1}>
                        <StandardField label={intl.formatMessage({ id: 'production.field.unit' })}>
                          <Controller
                            name="transportation_unit"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect {...field}>
                                <option value="km">
                                  {intl.formatMessage({ id: 'events.units.kilometers' })}
                                </option>
                                <option value="miles">
                                  {intl.formatMessage({ id: 'events.units.miles' })}
                                </option>
                                <option value="m">
                                  {intl.formatMessage({ id: 'events.units.meters' })}
                                </option>
                              </StandardSelect>
                            )}
                          />
                        </StandardField>
                      </Box>
                    </HStack>

                    {/* Production Efficiency Rating — HA only: the registry displays it
                        for HA alone, so a TP value would be write-only. */}
                    {productionType === 'HA' && (
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.common.fields.productionEfficiency'
                        })}
                        error={errors.production_efficiency?.message}
                        helpText={intl.formatMessage({ id: 'app.operationEfficiencyHelp' })}>
                        <Controller
                          name="production_efficiency"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect {...field}>
                              <option value="">
                                {intl.formatMessage({
                                  id: 'events.production.help.efficiencyUnset'
                                })}
                              </option>
                              <option value="high">
                                {intl.formatMessage({ id: 'events.productionEfficiency.high' })}
                              </option>
                              <option value="normal">
                                {intl.formatMessage({ id: 'events.productionEfficiency.normal' })}
                              </option>
                              <option value="low">
                                {intl.formatMessage({ id: 'events.productionEfficiency.low' })}
                              </option>
                            </StandardSelect>
                          )}
                        />
                      </StandardField>
                    )}
                  </VStack>
                </SectionBox>
              )}

              {/* § 205.204 seed & planting-stock records (PL/TR) or Common OSP § 10 C water source (IR) */}
              {['PL', 'TR', 'SS', 'IR'].includes(productionType) && (
                <SectionBox>
                  {/* One section, two very different payloads. For PL/TR it holds the
                      § 205.204 seed and planting-stock records — source, supplier, lot,
                      treatment, and the (a)(4) one-year rule via stock_organic_management_start.
                      For IR it holds water source and water testing, which the Common OSP asks
                      about in § 10 C. It was titled "Consumer Trust & Transparency" and carried
                      a description reading "not part of the records your certifier reviews" —
                      false for both payloads, and the most scrutinised half of a planting
                      record. Title and description now follow the subtype. */}
                  <SectionHeader
                    icon={FaSeedling}
                    title={intl.formatMessage({
                      id:
                        productionType === 'IR'
                          ? 'events.section.water.title'
                          : 'events.section.seedStock.title'
                    })}
                    badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                    description={intl.formatMessage({
                      id:
                        productionType === 'IR'
                          ? 'events.section.water.desc'
                          : 'events.section.seedStock.desc'
                    })}
                  />{' '}
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    {['PL', 'TR', 'SS'].includes(productionType) && (
                      <>
                        <StandardField
                          label={intl.formatMessage({ id: 'events.production.fields.seedsSource' })}
                          helpText="Where did your seeds or seedlings come from?">
                          <Controller
                            name="seeds_source"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect
                                {...field}
                                placeholder={intl.formatMessage({
                                  id: 'events.production.fields.seedsSourcePlaceholder'
                                })}>
                                <option value="farm_saved">
                                  {intl.formatMessage({ id: 'events.seedsSources.farmSaved' })}
                                </option>
                                <option value="local">
                                  {intl.formatMessage({ id: 'app.seedSource.local' })}
                                </option>
                                <option value="cooperative">
                                  {intl.formatMessage({ id: 'app.seedSource.cooperative' })}
                                </option>
                                <option value="commercial">
                                  {intl.formatMessage({ id: 'events.seedsSources.commercial' })}
                                </option>
                                <option value="other">
                                  {intl.formatMessage({ id: 'events.seedsSources.otherSpecify' })}
                                </option>
                              </StandardSelect>
                            )}
                          />
                        </StandardField>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.seedCertificationStatus'
                          })}
                          helpText="Regulatory classification per NOP 7 CFR 205.204">
                          <Controller
                            name="seed_certification_status"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect
                                {...field}
                                placeholder={intl.formatMessage({
                                  id: 'events.production.fields.seedCertificationStatusPlaceholder'
                                })}>
                                <option value="certified_organic">
                                  {intl.formatMessage({
                                    id: 'app.seedCertStatus.certifiedOrganic'
                                  })}
                                </option>
                                <option value="transitional">
                                  {intl.formatMessage({ id: 'app.seedCertStatus.transitional' })}
                                </option>
                                <option value="non_organic_untreated">
                                  {intl.formatMessage({
                                    id: 'app.seedCertStatus.nonOrganicUntreated'
                                  })}
                                </option>
                                <option value="non_organic_treated">
                                  {intl.formatMessage({
                                    id: 'app.seedCertStatus.nonOrganicTreated'
                                  })}
                                </option>
                              </StandardSelect>
                            )}
                          />
                        </StandardField>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.seedSupplierName'
                          })}
                          helpText="Who you bought the seed/planting stock from (NOP traceability)">
                          <Controller
                            name="seed_supplier_name"
                            control={methods.control}
                            render={({ field }) => (
                              <>
                                <StandardInput
                                  {...field}
                                  list="trazo-seed-suppliers"
                                  placeholder={intl.formatMessage({
                                    id: 'production.seedSupplier.placeholder'
                                  })}
                                />
                                {/* Suggestions only — never a closed list. A grower buying
                                    from a new nursery must be able to type a name that has
                                    never appeared in their records. */}
                                <datalist id="trazo-seed-suppliers">
                                  {seedSupplierNames.map((name) => (
                                    <option key={name} value={name} />
                                  ))}
                                </datalist>
                              </>
                            )}
                          />
                        </StandardField>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.seedPurchaseDate'
                          })}
                          helpText="Date of seed purchase (matches supplier invoice)">
                          <Controller
                            name="seed_purchase_date"
                            control={methods.control}
                            render={({ field }) => <StandardInput {...field} type="date" />}
                          />
                        </StandardField>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.seedPurchaseInvoice'
                          })}
                          helpText="Supplier invoice or receipt number">
                          <Controller
                            name="seed_purchase_invoice"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput
                                {...field}
                                placeholder={intl.formatMessage({
                                  id: 'events.production.fields.seedPurchaseInvoicePlaceholder'
                                })}
                              />
                            )}
                          />
                        </StandardField>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.seedLotNumber'
                          })}
                          helpText="Supplier lot or batch identifier from the seed packet">
                          <Controller
                            name="seed_lot_number"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput
                                {...field}
                                placeholder={intl.formatMessage({
                                  id: 'events.production.fields.seedLotNumberPlaceholder'
                                })}
                              />
                            )}
                          />
                        </StandardField>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.seedTreatment',
                            defaultMessage: 'Seed Treatment'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.production.fields.seedTreatmentHelp',
                            defaultMessage:
                              'Coatings, inoculants, or pelleting applied to the seed (if any)'
                          })}>
                          <Controller
                            name="seed_treatment"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput
                                {...field}
                                placeholder={intl.formatMessage({
                                  id: 'events.production.fields.seedTreatmentPlaceholder'
                                })}
                              />
                            )}
                          />
                        </StandardField>

                        {/* USDA "Seed Records Part C" pairs every named treatment with a
                              "Documentation of Allowed Status" column. § 205.204(a)(2): a named
                              treatment with no basis is unreviewable. */}
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.seedTreatmentAllowedBasis',
                            defaultMessage: 'Treatment Allowed Because'
                          })}>
                          <Controller
                            name="seed_treatment_allowed_basis"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect {...field}>
                                <option value="">
                                  {intl.formatMessage({
                                    id: 'events.production.fields.seedTreatmentAllowedBasisPlaceholder',
                                    defaultMessage: 'Select the basis...'
                                  })}
                                </option>
                                {SEED_TREATMENT_BASES.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {intl.formatMessage({ id: opt.labelKey })}
                                  </option>
                                ))}
                              </StandardSelect>
                            )}
                          />
                        </StandardField>

                        {/* 7 CFR 205.105(e) — excluded methods. The third leg of USDA Form 11's
                              allowed-status triple; the other two legs are answered above by the
                              certification status and the treatment basis. */}
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.seedNonGmoStatus'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.production.fields.seedNonGmoStatusHelp'
                          })}>
                          <Controller
                            name="seed_non_gmo_status"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect
                                {...field}
                                placeholder={intl.formatMessage({ id: 'app.select' })}>
                                {SEED_NON_GMO_STATUSES.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {intl.formatMessage({ id: opt.labelKey })}
                                  </option>
                                ))}
                              </StandardSelect>
                            )}
                          />
                        </StandardField>

                        {/* 7 CFR 205.204(a)(4) — perennial stock needs a full year under organic
                              management before its crop sells as organic. The packet computes the
                              elapsed time from this date and flags a shortfall. */}
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.stockOrganicManagementStart'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.production.fields.stockOrganicManagementStartHelp'
                          })}>
                          <Controller
                            name="stock_organic_management_start"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput {...field} type="date" value={field.value || ''} />
                            )}
                          />
                        </StandardField>

                        {/* 7 CFR 205.204(a)(1) — organic-seed commercial-availability search.
                              ALWAYS rendered for PL/TR, not gated on a non-organic status.

                              🔴 It used to be `{needsSeedSearch && (`. Two consequences,
                              both measured on the demo farm's own planting record: a grower
                              who recorded a search and THEN selected "Certified Organic" made
                              their own three stored rows invisible and unreachable without
                              deleting them; and a grower who searched before buying organic
                              seed — good practice, and what § 205.2's "as determined by the
                              certifying agent" invites — had nowhere to record it. The
                              non-organic status now drives the WARNING styling and copy, not
                              whether the evidence can be entered at all. */}
                        {['PL', 'TR', 'SS'].includes(productionType) && (
                          <Box
                            gridColumn={{ md: 'span 2' }}
                            p={3}
                            bg={needsSeedSearch ? 'orange.50' : 'gray.50'}
                            borderRadius="md"
                            borderLeft="3px solid"
                            borderLeftColor={needsSeedSearch ? 'orange.400' : 'gray.300'}>
                            <Text
                              fontSize="sm"
                              fontWeight="semibold"
                              color={needsSeedSearch ? 'orange.700' : 'gray.700'}
                              mb={1}>
                              {intl.formatMessage({
                                id: 'events.production.seedSearch.title',
                                defaultMessage:
                                  'Organic-Seed Commercial-Availability Search (7 CFR 205.204)'
                              })}
                            </Text>
                            {/* ⚠️ Wording: § 205.204 sets NO supplier count. "At least three"
                                  is a certifier EXPECTATION from USDA's optional Guide for
                                  Organic Crop Producers, and the earlier copy ("requires ...
                                  at least 3", "{count} of 3 minimum") stated it as law — the
                                  same overstatement the packet made with "All 3 required
                                  supplier searches documented per NOP 5029". */}
                            <Text
                              fontSize="xs"
                              color={needsSeedSearch ? 'orange.600' : 'gray.600'}
                              mb={3}>
                              {needsSeedSearch
                                ? intl.formatMessage(
                                    {
                                      id: 'events.production.seedSearch.help',
                                      defaultMessage:
                                        'Non-organic seed or planting stock may only be used when an equivalent organic variety is not commercially available. Record who you contacted — certifiers typically look for three. {count} recorded.'
                                    },
                                    { count: seedSearchAttempts.length }
                                  )
                                : intl.formatMessage({
                                    id: 'events.production.seedSearch.helpOptional',
                                    defaultMessage:
                                      'Optional for organic seed. If you compared suppliers before buying, recording it here strengthens the record.'
                                  })}
                            </Text>
                            {/* § 205.204(a)(1) permits non-organic seed only when an equivalent
                                  organic variety is not "commercially available", and § 205.2
                                  defines that by FORM, QUALITY or QUANTITY. The supplier rows
                                  below record WHO was contacted; this records the statutory
                                  ground the exemption rests on. */}
                            {/* Only meaningful when an exemption is actually claimed —
                                  "Why organic seed wasn't available" on a certified-organic
                                  planting is a question with no answer. */}
                            <Box mb={3} display={needsSeedSearch ? 'block' : 'none'}>
                              <StandardField
                                label={intl.formatMessage({
                                  id: 'events.production.fields.seedNonavailabilityReason',
                                  defaultMessage: "Why Organic Seed Wasn't Available"
                                })}>
                                <Controller
                                  name="seed_nonavailability_reason"
                                  control={methods.control}
                                  render={({ field }) => (
                                    <StandardSelect {...field} size="sm">
                                      <option value="">
                                        {intl.formatMessage({
                                          id: 'events.production.fields.seedNonavailabilityReasonPlaceholder',
                                          defaultMessage: 'Select the reason...'
                                        })}
                                      </option>
                                      {SEED_NONAVAILABILITY_REASONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                          {intl.formatMessage({ id: opt.labelKey })}
                                        </option>
                                      ))}
                                    </StandardSelect>
                                  )}
                                />
                              </StandardField>
                            </Box>

                            <VStack spacing={2} align="stretch">
                              {seedSearchAttempts.map((row, idx) => (
                                <SimpleGrid key={idx} columns={{ base: 1, md: 4 }} spacing={2}>
                                  {/* 🔴 The key is `supplier_name`, NOT `supplier`. The
                                      certifier packet reads attempt["supplier_name"], and
                                      until 2026-08-15 this widget wrote `supplier` — so
                                      every search a grower typed printed with an EMPTY
                                      "Supplier Contacted" column in the NOP 5029 table,
                                      which is the § 205.204(a)(1) evidence itself. Nothing
                                      caught it because the only rows in any database had
                                      been written by the demo seeder, which used the right
                                      key. Migration 0205 rewrites the legacy rows. */}
                                  <StandardInput
                                    size="sm"
                                    value={row.supplier_name || ''}
                                    onChange={(e) =>
                                      updateSeedSearch(idx, 'supplier_name', e.target.value)
                                    }
                                    placeholder={intl.formatMessage({
                                      id: 'events.production.seedSearch.supplierPlaceholder',
                                      defaultMessage: 'Supplier contacted'
                                    })}
                                  />
                                  <StandardInput
                                    size="sm"
                                    type="date"
                                    value={row.date_contacted || ''}
                                    onChange={(e) =>
                                      updateSeedSearch(idx, 'date_contacted', e.target.value)
                                    }
                                  />
                                  <StandardInput
                                    size="sm"
                                    value={row.result || ''}
                                    onChange={(e) =>
                                      updateSeedSearch(idx, 'result', e.target.value)
                                    }
                                    placeholder={intl.formatMessage({
                                      id: 'events.production.seedSearch.resultPlaceholder',
                                      defaultMessage: 'Result (e.g., not available organic)'
                                    })}
                                  />
                                  <HStack spacing={1}>
                                    {/* The packet prints a Notes column; before 08-15 the
                                        form had no input for it, so it was always blank. */}
                                    <StandardInput
                                      size="sm"
                                      value={row.notes || ''}
                                      onChange={(e) =>
                                        updateSeedSearch(idx, 'notes', e.target.value)
                                      }
                                      placeholder={intl.formatMessage({
                                        id: 'events.production.seedSearch.notesPlaceholder',
                                        defaultMessage: 'Notes (optional)'
                                      })}
                                    />
                                    <StandardButton
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => removeSeedSearch(idx)}>
                                      ✕
                                    </StandardButton>
                                  </HStack>
                                </SimpleGrid>
                              ))}
                              <StandardButton
                                type="button"
                                size="sm"
                                variant="outline"
                                alignSelf="flex-start"
                                onClick={addSeedSearch}>
                                {intl.formatMessage({
                                  id: 'events.production.seedSearch.addButton',
                                  defaultMessage: '+ Add supplier search'
                                })}
                              </StandardButton>
                            </VStack>
                          </Box>
                        )}
                      </>
                    )}

                    {productionType === 'IR' && (
                      <>
                        {/* Sprint 4: Aggregate Irrigation Toggle */}
                        {!multiTarget && (
                          <Box gridColumn={{ md: 'span 2' }} mb={2}>
                            <HStack
                              p={3}
                              bg={isSummaryMode ? 'white' : 'gray.50'}
                              borderRadius="md"
                              borderWidth="1px"
                              borderColor={isSummaryMode ? 'gray.300' : 'gray.200'}
                              justify="space-between">
                              <VStack align="start" spacing={0}>
                                <HStack>
                                  <Text fontWeight="semibold" fontSize="sm">
                                    {intl.formatMessage({
                                      id: 'events.section.production.irrigationSummary'
                                    })}
                                  </Text>
                                </HStack>
                                <Text fontSize="xs" color="gray.600">
                                  {intl.formatMessage({
                                    id: isSummaryMode
                                      ? 'events.section.production.irrigationSummaryOn'
                                      : 'events.section.production.irrigationSummaryOff'
                                  })}
                                </Text>
                              </VStack>
                              <Controller
                                name="is_summary"
                                control={methods.control}
                                render={({ field }) => (
                                  <Switch
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
                        )}

                        {/* Sprint 4: Aggregate Irrigation Fields (shown when summary mode is active) */}
                        {isSummaryMode && (
                          <>
                            <StandardField
                              label={intl.formatMessage({ id: 'production.field.periodStart' })}
                              helpText="When did this irrigation period begin?"
                              required>
                              <Controller
                                name="date_start"
                                control={methods.control}
                                render={({ field }) => <StandardInput {...field} type="date" />}
                              />
                            </StandardField>

                            <StandardField
                              label={intl.formatMessage({ id: 'production.field.periodEnd' })}
                              helpText="When did this irrigation period end?"
                              required>
                              <Controller
                                name="date_end"
                                control={methods.control}
                                render={({ field }) => <StandardInput {...field} type="date" />}
                              />
                            </StandardField>

                            <StandardField
                              label={intl.formatMessage({ id: 'production.field.irrigationCount' })}
                              helpText={intl.formatMessage({
                                id: 'production.field.irrigationCountHelp'
                              })}
                              required>
                              <Controller
                                name="event_count"
                                control={methods.control}
                                render={({ field }) => (
                                  <StandardInput
                                    {...field}
                                    type="number"
                                    min="1"
                                    placeholder={intl.formatMessage(
                                      { id: 'events.production.fields.examplePlaceholder' },
                                      { value: '12' }
                                    )}
                                  />
                                )}
                              />
                            </StandardField>

                            <StandardField
                              label={intl.formatMessage({
                                id: 'production.field.totalWaterVolume'
                              })}
                              helpText={intl.formatMessage({
                                id: 'production.field.totalWaterVolumeHelp'
                              })}
                              required>
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
                                      placeholder={intl.formatMessage(
                                        { id: 'events.production.fields.examplePlaceholder' },
                                        { value: '50000' }
                                      )}
                                    />
                                  )}
                                />
                                <Controller
                                  name="water_volume_unit"
                                  control={methods.control}
                                  render={({ field }) => (
                                    <StandardSelect {...field} flex={1}>
                                      <option value="gallons">
                                        {intl.formatMessage({ id: 'events.units.gallons' })}
                                      </option>
                                      <option value="liters">
                                        {intl.formatMessage({ id: 'events.units.liters' })}
                                      </option>
                                      <option value="acre_feet">
                                        {intl.formatMessage({ id: 'events.units.acreFeet' })}
                                      </option>
                                      <option value="cubic_meters">
                                        {intl.formatMessage({ id: 'events.units.cubicMeters' })}
                                      </option>
                                    </StandardSelect>
                                  )}
                                />
                              </HStack>
                            </StandardField>
                          </>
                        )}

                        <StandardField
                          label={intl.formatMessage({ id: 'events.production.fields.waterSource' })}
                          helpText="Primary water source for this irrigation">
                          <Controller
                            name="water_source"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect
                                {...field}
                                placeholder={intl.formatMessage({
                                  id: 'events.production.fields.waterSourcePlaceholder'
                                })}>
                                <option value="well_groundwater">
                                  {intl.formatMessage({
                                    id: 'events.waterSources.wellGroundwater'
                                  })}
                                </option>
                                <option value="municipal">
                                  {intl.formatMessage({ id: 'events.waterSources.municipal' })}
                                </option>
                                <option value="rainwater_harvesting">
                                  {intl.formatMessage({
                                    id: 'events.waterSources.rainwaterHarvesting'
                                  })}
                                </option>
                                <option value="irrigation_canal">
                                  {intl.formatMessage({
                                    id: 'events.waterSources.irrigationCanal'
                                  })}
                                </option>
                                <option value="river_stream">
                                  {intl.formatMessage({ id: 'events.waterSources.riverStream' })}
                                </option>
                                <option value="pond_reservoir">
                                  {intl.formatMessage({ id: 'events.waterSources.pondReservoir' })}
                                </option>
                                <option value="recycled_water">
                                  {intl.formatMessage({ id: 'events.waterSources.recycledWater' })}
                                </option>
                                <option value="other">
                                  {intl.formatMessage({ id: 'events.waterSources.otherSpecify' })}
                                </option>
                              </StandardSelect>
                            )}
                          />
                        </StandardField>

                        {/* ENHANCED: USDA NASS 2023 irrigation method for water estimation */}
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.irrigationMethod'
                          })}
                          helpText="Type of irrigation system used (affects water usage calculation)">
                          <Controller
                            name="irrigation_method"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect
                                {...field}
                                placeholder={intl.formatMessage({
                                  id: 'events.production.fields.irrigationMethodPlaceholder'
                                })}>
                                <option value="drip">
                                  {intl.formatMessage({ id: 'events.irrigationMethods.drip' })}
                                </option>
                                <option value="micro_sprinkler">
                                  {intl.formatMessage({
                                    id: 'events.irrigationMethods.microSprinkler'
                                  })}
                                </option>
                                <option value="sprinkler">
                                  {intl.formatMessage({ id: 'events.irrigationMethods.sprinkler' })}
                                </option>
                                <option value="center_pivot">
                                  {intl.formatMessage({
                                    id: 'events.irrigationMethods.centerPivot'
                                  })}
                                </option>
                                <option value="flood">
                                  {intl.formatMessage({
                                    id: 'events.irrigationMethods.floodFurrow'
                                  })}
                                </option>
                                <option value="subsurface">
                                  {intl.formatMessage({
                                    id: 'events.irrigationMethods.subIrrigation'
                                  })}
                                </option>
                                <option value="hand_watering">
                                  {intl.formatMessage({
                                    id: 'events.irrigationMethods.handWatering'
                                  })}
                                </option>
                                <option value="other">
                                  {intl.formatMessage({ id: 'events.irrigationMethods.other' })}
                                </option>
                              </StandardSelect>
                            )}
                          />
                        </StandardField>

                        {/* ENHANCED: Irrigation depth for USDA NASS 2023 water volume calculation */}
                        <StandardField
                          label={intl.formatMessage({
                            id: multiTarget
                              ? 'events.multiParcel.depthUnitLabel'
                              : 'events.production.fields.irrigationDepth'
                          })}
                          helpText={
                            multiTarget
                              ? intl.formatMessage({ id: 'events.multiParcel.depthUnitHelp' })
                              : 'Water depth applied (USDA: 27,154 gal/acre per inch)'
                          }>
                          <HStack spacing={2}>
                            {!multiTarget && (
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
                            )}
                            <Controller
                              name="irrigation_depth_unit"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardSelect {...field} flex={1}>
                                  <option value="inches">
                                    {intl.formatMessage({ id: 'app.inches' })}
                                  </option>
                                  <option value="cm">
                                    {intl.formatMessage({ id: 'app.centimeters' })}
                                  </option>
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
                          error={errors.pump_depth_ft?.message}>
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
                          })}>
                          <Controller
                            name="electricity_source"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect
                                {...field}
                                placeholder={intl.formatMessage({
                                  id: 'app.electricitySourcePlaceholder',
                                  defaultMessage: 'Select power source...'
                                })}>
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

                        {/* NOP irrigation/well water test (7 CFR 205.272 / 205.671) */}
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.waterTestDate',
                            defaultMessage: 'Water Test Date'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.production.waterTestDateHelp',
                            defaultMessage:
                              'Date of the annual irrigation/well water analysis (CCOF water-quality record)'
                          })}>
                          <Controller
                            name="water_test_date"
                            control={methods.control}
                            render={({ field }) => <StandardInput {...field} type="date" />}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.waterTestLab',
                            defaultMessage: 'Water Test Laboratory'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.production.waterTestLabHelp',
                            defaultMessage:
                              'Lab that analyzed the water sample (attach the report as a photo)'
                          })}>
                          <Controller
                            name="water_test_lab"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput
                                {...field}
                                placeholder={intl.formatMessage({
                                  id: 'events.production.waterTestLabPlaceholder',
                                  defaultMessage: 'e.g., BlueWater Labs'
                                })}
                              />
                            )}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.production.fields.waterTestResults',
                            defaultMessage: 'Test Results'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.production.waterTestResultsHelp',
                            defaultMessage:
                              'One result per line, e.g. "E. coli: <1 MPN/100mL". This is what prints in the Results column of the water-quality record.'
                          })}>
                          <Controller
                            name="water_test_summary"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardTextarea
                                {...field}
                                rows={3}
                                placeholder={intl.formatMessage({
                                  id: 'events.production.fields.waterTestSummaryPlaceholder'
                                })}
                              />
                            )}
                          />
                        </StandardField>
                      </>
                    )}
                  </SimpleGrid>
                </SectionBox>
              )}

              {/* Observations */}
              <SectionBox>
                <SectionHeader
                  icon={FaSeedling}
                  // The heading follows the same visibility rule as the badge, label and
                  // helper below: a withheld subtype's note reaches no buyer page (Run 8b R2).
                  title={intl.formatMessage({
                    id: noteIsCertifierOnly
                      ? 'events.section.fieldNotesCertifierOnly'
                      : 'events.section.fieldNotes'
                  })}
                  badge={intl.formatMessage({
                    id: noteIsCertifierOnly
                      ? 'events.section.badge.certifierRecordOnly'
                      : 'events.section.badge.certifierRecordAndBuyer'
                  })}
                />
                <StandardField
                  label={intl.formatMessage({
                    id: noteIsCertifierOnly
                      ? 'events.common.fields.observationCertifierOnly'
                      : 'events.common.fields.observation'
                  })}
                  error={errors.observation?.message}
                  helpText={intl.formatMessage({
                    id: noteIsCertifierOnly
                      ? 'events.common.help.observationCertifierOnly'
                      : 'events.common.help.observationAudience'
                  })}>
                  <Controller
                    name="observation"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardTextarea
                        {...field}
                        placeholder={intl.formatMessage({
                          id: noteIsCertifierOnly
                            ? 'events.common.placeholders.observationCertifierOnly'
                            : 'events.common.placeholders.observationPublic'
                        })}
                        rows={4}
                      />
                    )}
                  />
                </StandardField>
                <StandardField
                  label={intl.formatMessage({ id: 'events.common.fields.privateNote' })}
                  helpText={intl.formatMessage({ id: 'events.common.help.privateNoteAudience' })}>
                  <Controller
                    name="private_note"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardTextarea
                        {...field}
                        placeholder={intl.formatMessage({
                          id: 'events.common.placeholders.privateNote'
                        })}
                        rows={3}
                      />
                    )}
                  />
                </StandardField>

                <SupervisorSignOff control={methods.control} />
              </SectionBox>
            </>

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
                    size="lg">
                    {intl.formatMessage({ id: 'app.previous' }) || 'Previous'}
                  </StandardButton>
                  <StandardButton
                    variant="primary"
                    type="submit"
                    rightIcon={<FaChevronRight />}
                    size="lg">
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
