// CHEMICAL TAB - ENHANCED FOLLOWING TRAZO BEST PRACTICES
// Transparency-first approach with accurate USDA/EPA carbon calculations
// Phase 1 Enhanced: StandardComponents, transparency messaging, credible emission factors

import {
  Flex,
  HStack,
  Stack,
  Box,
  VStack,
  Badge,
  Text,
  Icon,
  InputGroup,
  InputRightAddon,
  Switch,
  SimpleGrid,
  Divider,
  Wrap,
  WrapItem,
  Button,
  Checkbox
} from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import { publicNoteMentionsASupplier } from 'utils/supplierNameNudge';
import { useGetRecentInputsQuery } from 'store/api/historyApi';
import {
  StandardCard,
  StandardButton,
  StandardField,
  StandardInput,
  StandardSelect,
  StandardTextarea,
  StandardAlert,
  CollapsibleSection,
  SectionHeader,
  SectionBox
} from 'components/Design/StandardComponents';
import {
  FaChevronLeft,
  FaChevronRight,
  FaFlask,
  FaSeedling,
  FaLeaf,
  FaCalculator,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUserShield,
  FaClock,
  FaBolt,
  FaTractor,
  FaGasPump,
  FaFileInvoiceDollar,
  FaTruck,
  FaPlus,
  FaTrash
} from 'react-icons/fa';
import { FormProvider, useForm, useWatch, Controller, useFieldArray } from 'react-hook-form';
import OrganicBasisBlankNotice from './OrganicBasisBlankNotice';
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle
} from 'react';
import { CarbonImpactPreview } from 'components/Events/CarbonImpactPreview';
import { CHEMICAL_FUEL_TYPES } from 'config/events/chemicalFormOptions';
import { ReceiptDocumentSelect } from 'components/Forms/ReceiptDocumentSelect';
import InputVerifyHelper from 'components/Compliance/InputVerifyHelper';
import { object, string, array, number } from 'zod';
import CustomFieldsForm from './CustomFieldsForm';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIntl } from 'react-intl';
import {
  APPLICATION_PURPOSES,
  APPLICATION_RATE_UNITS,
  isDispenserRecord,
  retiredOrganicApprovedLabelKey
} from 'config/events/enums';
import { getSubtypes } from 'config/events';
import { isAffirmativeFlag } from 'config/events/formatters';
// Event Field Registry (Phase 5G — form integration)
import { useFormFields } from 'src/hooks/useFormFields';
import { useFarm, useFarmState } from 'hooks/useMeasurementSystem';
import { useSelector } from 'react-redux';
import { useGetParcelQuery } from 'store/api/productApi';
import { RegistryFormField } from 'src/components/Forms/RegistryFormField';

import { BlockIdField } from 'components/Fields/BlockIdField';
import {
  validateConcentration,
  ConcentrationFeedback,
  getFormatExamples
} from 'components/Forms/ConcentrationValidation';

// Phase 3: Fuel types with EPA-verified emission factors (for application equipment)
// UPDATED 2026-02-15: All factors corrected to match EPA 40 CFR Part 98 Table C-1
/**
 * The first of these that actually HOLDS a number, as a string.
 *
 * 🔴 MEASURED 2026-09-03. The volume/area fields exist twice — `volume_numeric` is what the
 * input binds, `volume_applied` is what the display registry and the voice mapper call the same
 * number — and the reset below hydrated the twin with `!== undefined && !== null`, which counts
 * an EMPTY STRING as a value.
 *
 * `onDataChange` reports this form's whole state up to the wizard every 500ms, so within a
 * second of the tab opening `eventFormData.volume_numeric` is `''`. Voice then merged
 * `volume_applied: 40` and remounted the tab (voiceSeq) — and the reset preferred the empty
 * twin, throwing the 40 away. The farmer was told "Volume Applied" had been filled and saw an
 * empty box: the banner and the form disagreed, and only the form was right.
 *
 * `application_rate` was unaffected precisely because it has no twin — its input name IS the key
 * voice writes, which is what made the difference visible.
 */
const firstFilled = (...candidates) => {
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue;
    const text = candidate.toString();
    if (text.trim() !== '') return text;
  }
  return '';
};

/**
 * `labelKey`, not `label`. These render into four <select>s, and a literal `label:` inside a
 * module-scope array is invisible to any sweep looking for JSX props — which is how the fuel
 * picker stayed English on a fully translated form. `factor` stays a literal: it is notation
 * (kg CO₂e/L), and an emission factor is not a translator's to edit.
 */
// Shared with the carbon box, so both name a fuel the same way (config/events/chemicalFormOptions).
const FUEL_TYPES = CHEMICAL_FUEL_TYPES;

// ENHANCED SCHEMA - Following Equipment/Soil/Pest enhanced patterns with dynamic validation
// Now includes the pesticide application fields of the EPA Worker Protection Standard (40 CFR 170.311(b)(1))
// 2025-01-21: Added chemical_subtype for accurate carbon emission factor selection
/**
 * A BUILDER, not a constant. The schema used to live at module scope, which put every
 * validation message beyond the reach of `intl` BY CONSTRUCTION — a Spanish-speaking
 * applicator filled a fully translated form and got "Area unit is required" back. No string
 * sweep of the JSX could ever find them either: they are `message:` properties in a zod
 * chain, not props on a component. Same failure and same fix as buildCompanySchema(intl).
 *
 * Memoise on `intl` at the call site; rebuilding the schema each render remounts the resolver.
 */
export const buildChemicalSchema = (intl, { multiTarget = false } = {}) =>
  object({
    type: string().min(
      1,
      intl.formatMessage({
        id: 'events.chemical.validation.typeRequired',
        defaultMessage: 'Chemical type is required'
      })
    ),
    // Chemical subtype for accurate emission factor selection
    // Different subtypes have different manufacturing emission factors
    chemical_subtype: string().optional(),
    commercial_name: string().min(
      2,
      intl.formatMessage({
        id: 'events.chemical.validation.commercialNameMin',
        defaultMessage: 'Commercial name must be at least 2 characters'
      })
    ),
    // OMRI catalog row the grower ATTACHED via "Use this listing" in InputVerifyHelper.
    // Never auto-populated: a fuzzy name match is a suggestion, the FK is a claim
    // (memory: consumer-omri-listing-leak-2026-08-09). Declared here so zod does not strip it.
    omri_product: number().nullable().optional(),
    // Same contract for the WSDA Materials List — a separate catalogue, a separate column.
    wsda_material: number().nullable().optional(),
    active_ingredient: string().optional(),
    // In summary mode, per-application fields are hidden and replaced by aggregate totals.
    // Validation is enforced conditionally via superRefine below.
    concentration: string().optional(),
    // "Not on my record" (OV-FJ-C12): 'true' / 'false' like the other switches on this form.
    concentration_not_recorded: string().optional(),
    volume_applied: string().optional(),
    volume_numeric: string().optional(),
    volume_unit: string().optional(),
    application_rate: string().optional(),
    application_rate_unit: string().optional(),
    area_treated: string().optional(),
    area_numeric: string().optional(),
    area_unit: string().optional(),
    // Phase 3: Fertigation toggle — fertilizer injected through irrigation system
    is_fertigation: string().optional(),
    // NOP 5012 — liquid-fertilizer nitrogen source
    nitrogen_source: string().optional(),
    application_purpose: string().optional(),
    // D2 — structured NPK trio (FE). The registry has always declared these.
    nitrogen_percentage: string().optional(),
    phosphorus_percentage: string().optional(),
    potassium_percentage: string().optional(),
    // §E-3: micronutrients (FE), 7 CFR 205.601(j)(7)
    micronutrient_type: string().optional(),
    micronutrient_rate: string().optional(),
    micronutrient_rate_unit: string().optional(),
    application_method: string().min(
      1,
      intl.formatMessage({
        id: 'events.chemical.validation.applicationMethodRequired',
        defaultMessage: 'Application method is required'
      })
    ),
    // Sprint 2 Epic 2.2: Application Details for USDA/EPA method specificity
    application_details: string().optional(),
    weather_conditions: string().optional(),
    application_timing: string().optional(),
    target_pest_disease: string().optional(),
    observation: string().optional(),
    private_note: string().optional(),
    // Pesticide application fields (EPA WPS application record: 40 CFR 170.311(b)(1))
    applicator_name: string().optional(),
    // F21 — GG authorizer (FV-GFS 32.02.01 #10) + FSMA supervisor review (112.161(b))
    authorizer_name: string().optional(),
    reviewed: string().optional(), // 'true' / 'false' string for the Switch
    reviewer_name: string().optional(),
    review_date: string().optional(),
    epa_registration_number: string().optional(),
    restricted_use_pesticide: string().optional(), // 'true' or 'false' as string for form handling
    applicator_certification: string().optional(), // Required when restricted_use_pesticide is true
    rei_hours: string()
      .optional()
      .refine((val) => {
        if (!val || val === '') return true;
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      }, intl.formatMessage({ id: 'events.chemical.validation.reiPositive', defaultMessage: 'REI must be a positive number' })),
    phi_days: string()
      .optional()
      .refine((val) => {
        if (!val || val === '') return true;
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      }, intl.formatMessage({ id: 'events.chemical.validation.phiPositive', defaultMessage: 'PHI must be a positive number' })),
    // Sprint 3 Epic 3.2: Consumer Trust Fields for transparency
    organic_approved: string().optional(), // Whether chemical is organic approved
    applied_scope: string().optional(),
    applied_scope_detail: string().optional(),
    buffer_zone_meters: string()
      .optional()
      .refine((val) => {
        if (!val || val === '') return true;
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      }, intl.formatMessage({ id: 'events.chemical.validation.bufferZonePositive', defaultMessage: 'Buffer zone must be a positive number' })),
    // NOP Compliance: Supplier & Purchase Tracking (7 CFR 205.103)
    supplier_name: string().optional(),
    purchase_date: string().optional(),
    purchase_invoice: string().optional(),
    receipt_document: string().optional(),
    chemical_lot_number: string().optional(),
    // 🔴 2026-08-15 — the mass-balance input leg. The column, the serializer field, the
    // readiness check and the packet column all existed; the INPUT did not, so 289 of 289
    // chemical events were blank and every packet printed "[REVIEW] Mass balance cannot be
    // reconciled. No purchase quantity is recorded on any chemical event."
    quantity_purchased: string().optional(),
    quantity_purchased_unit: string().optional(),
    // P0-3 — CA DPR Restricted Materials Permit (CA state law, 3 CCR 6400 et seq.)
    ca_dpr_permit_number: string().optional(),
    ca_dpr_permit_county: string().optional(),
    ca_dpr_permit_expires: string().optional(),
    // F20 — legal spray-record completeness (GLOBALG.A.P. FV-GFS 32.02.01 + CA PUR DPR-PML-017C)
    manufacturer: string().optional(),
    application_start: string().optional(),
    application_end: string().optional(),
    planted_area: string().optional(),
    planted_area_unit: string().optional(),
    operator_id: string().optional(),
    site_id: string().optional(),
    application_county: string().optional(),
    mtrs_section: string().optional(),
    mtrs_township: string().optional(),
    mtrs_range: string().optional(),
    mtrs_base_meridian: string().optional(),
    ffm_code: string().optional(),
    // Who applied it. 'true'/'false' strings like the other Switches; a hired pass is the
    // pest control business's to report on the CA PUR, not the grower's (3 CCR 6626(b)).
    applied_by_pcb: string().optional(),
    pcb_name: string().optional(),
    // Tank-mix partners (adjuvants/spreader-stickers) — each CA-registered partner
    // is reportable on its own PUR line (DPR boxes 23/24). Repeatable structured list.
    tank_mix_partners: array(
      object({
        commercial_name: string().optional(),
        manufacturer: string().optional(),
        epa_registration_number: string().optional(),
        volume: string().optional(),
        volume_unit: string().optional(),
        application_rate: string().optional(),
        application_rate_unit: string().optional(),
        organic_approved: string().optional()
      })
    ).optional(),
    // Phase 3: Application fuel tracking for equipment fuel emissions
    application_fuel_type: string().optional(),
    application_fuel_consumed: string()
      .optional()
      .refine((val) => {
        if (!val || val === '') return true;
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      }, intl.formatMessage({ id: 'events.chemical.validation.fuelNotNegative', defaultMessage: 'Application fuel amount cannot be negative' })),
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
    const req = (path, message) => {
      const value = data[path];
      if (value == null || value === '') {
        ctx.addIssue({ code: 'custom', path: [path], message });
      }
    };

    // 40 CFR 170: an RUP application needs the applicator's certification number. The
    // asterisk on that field was previously enforced by nothing at all.
    // Scoped to the types that RENDER the RUP switch — a stale 'true' carried across a
    // switch to FE must not demand a field the fertilizer form does not show.
    if (['PE', 'HE', 'FU'].includes(data.type) && data.restricted_use_pesticide === 'true') {
      req(
        'applicator_certification',
        intl.formatMessage({
          id: 'events.chemical.validation.rupCertificationRequired',
          defaultMessage: 'An RUP application needs the applicator certification number'
        })
      );
    }

    // In summary mode, per-application fields (concentration, volume_applied, area_treated)
    // are hidden and replaced by aggregate totals — their asterisks move to the aggregates,
    // which used to be marked required and enforced by nothing.
    const isSummary = data.is_summary === 'true' && ['FE', 'FU', 'PE'].includes(data.type);
    if (isSummary) {
      req(
        'date_start',
        intl.formatMessage({
          id: 'events.chemical.validation.summaryStartRequired',
          defaultMessage: 'A summary needs the period start date'
        })
      );
      req(
        'date_end',
        intl.formatMessage({
          id: 'events.chemical.validation.summaryEndRequired',
          defaultMessage: 'A summary needs the period end date'
        })
      );
      req(
        'event_count',
        intl.formatMessage({
          id: 'events.chemical.validation.summaryCountRequired',
          defaultMessage: 'How many applications does this summary cover?'
        })
      );
      if (data.type === 'FE') {
        req(
          'nitrogen_total_kg',
          intl.formatMessage({
            id: 'events.chemical.validation.summaryNitrogenRequired',
            defaultMessage: 'A fertilizer summary needs the total nitrogen'
          })
        );
      } else {
        req(
          'active_ingredient_total_kg',
          intl.formatMessage({
            id: 'events.chemical.validation.summaryActiveIngredientRequired',
            defaultMessage: 'This summary needs the total active ingredient'
          })
        );
      }
      return;
    }

    // A pheromone dispenser is counted and hung, not mixed into a tank, so "the strength on the
    // label" is not a number the grower can be made to supply for it. Optional for that method
    // only, and only on a pesticide (the one type that offers it): switching the type away from
    // PE does not clear the method, so a stale value must not waive the field on a fungicide.
    // A value typed anyway is still checked below.
    const isDispenserApplication = isDispenserRecord(data.type, data.application_method);
    // "Not on my record" answers the question: the source record does not show it. A value
    // beside the tick is refused, here and on the server: one or the other, never both.
    const concentrationNotOnRecord = data.concentration_not_recorded === 'true';
    if (concentrationNotOnRecord && data.concentration && data.concentration.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['concentration'],
        message: intl.formatMessage({
          id: 'events.chemical.validation.concentrationOrNotOnRecord',
          defaultMessage: 'Enter the concentration or tick "Not on my record", not both.'
        })
      });
    }
    const concentrationOptional = isDispenserApplication || concentrationNotOnRecord;
    // The count unit belongs to the dispenser method alone. Anything else counted in dispensers
    // would reach the PUR as "box 24 is a count" on a record that is really a spray.
    if (data.volume_unit === 'dispensers' && !isDispenserApplication) {
      ctx.addIssue({
        code: 'custom',
        path: ['volume_unit'],
        message: intl.formatMessage({
          id: 'events.chemical.validation.dispensersNeedDispenserMethod',
          defaultMessage:
            'Dispensers are counted only for a pesticide applied as hand-applied dispensers. Pick that method, or give the amount by weight or volume.'
        })
      });
    }
    if ((!data.concentration || data.concentration.length === 0) && !concentrationOptional) {
      ctx.addIssue({
        code: 'custom',
        path: ['concentration'],
        message: intl.formatMessage({
          id: 'events.chemical.validation.concentrationRequired',
          defaultMessage:
            'Product concentration is required — the strength on the label (e.g. "1.34%" or "10-10-10"). The amount and rate go in Product Amount Applied, Application Rate and Area Treated below.'
        })
      });
    } else if (data.type && data.concentration) {
      try {
        const validation = validateConcentration(data.concentration, data.type, {
          // A single-nutrient micronutrient product (zinc sulfate 36% Zn) has no NPK analysis.
          isMicronutrient: !!data.micronutrient_type
        });
        if (validation && !validation.isValid) {
          ctx.addIssue({
            code: 'custom',
            path: ['concentration'],
            message: intl.formatMessage({
              id: 'events.chemical.validation.concentrationLooksLikeRate',
              defaultMessage:
                'That looks like an application rate, not a concentration. Enter the product strength from the label (e.g. "1.34%", or "10-10-10" for a fertilizer) and put the rate in Application Rate below.'
            })
          });
        }
      } catch (e) {
        /* let it pass */
      }
    }
    // Use volume_numeric as the primary numeric field; fall back to volume_applied for backward compat
    // With several blocks the amount is asked per block (MultiParcel.PerParcelAmounts), so the
    // single total this tab would ask for does not exist and must not be required.
    const effectiveVolume = data.volume_numeric || data.volume_applied;
    if (multiTarget) {
      // per block, checked by the wizard
    } else if (!effectiveVolume || effectiveVolume.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['volume_numeric'],
        message: intl.formatMessage({
          id: 'events.chemical.validation.volumeRequired',
          defaultMessage: 'The product amount applied is required'
        })
      });
    } else if (parseFloat(effectiveVolume) <= 0 || isNaN(parseFloat(effectiveVolume))) {
      ctx.addIssue({
        code: 'custom',
        path: ['volume_numeric'],
        message: intl.formatMessage({
          id: 'events.chemical.validation.volumePositive',
          defaultMessage: 'The product amount must be greater than 0'
        })
      });
    }
    if (!data.volume_unit || data.volume_unit.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['volume_unit'],
        message: intl.formatMessage({
          id: 'events.chemical.validation.volumeUnitRequired',
          defaultMessage: 'The unit for the product amount is required'
        })
      });
    }
    // Use area_numeric as the primary numeric field; fall back to area_treated for backward compat
    const effectiveArea = data.area_numeric || data.area_treated;
    if (multiTarget) {
      // per block, checked by the wizard
    } else if (!effectiveArea || effectiveArea.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['area_numeric'],
        message: intl.formatMessage({
          id: 'events.chemical.validation.areaRequired',
          defaultMessage: 'Area treated is required'
        })
      });
    } else if (parseFloat(effectiveArea) <= 0 || isNaN(parseFloat(effectiveArea))) {
      ctx.addIssue({
        code: 'custom',
        path: ['area_numeric'],
        message: intl.formatMessage({
          id: 'events.chemical.validation.areaPositive',
          defaultMessage: 'Area must be greater than 0'
        })
      });
    }
    if (!data.area_unit || data.area_unit.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['area_unit'],
        message: intl.formatMessage({
          id: 'events.chemical.validation.areaUnitRequired',
          defaultMessage: 'Area unit is required'
        })
      });
    }
  });

/**
 * Warns while the farmer is typing that the box which PUBLISHES appears to name a supplier.
 *
 * Deliberately NOT a guarantee. The server redacts a supplier name out of the public note only
 * when it matches a name recorded in a supplier FIELD, on an exact word-boundary match; it
 * cannot recognise an abbreviation, a misspelling, or a supplier entered nowhere else. Saying
 * that while the note is being written is more honest than a promise the redactor cannot keep,
 * and it is why the privacy copy calls the match a safeguard rather than a removal guarantee.
 *
 * ⛔ `manufacturer` is NOT one of the inputs. An input's maker is legitimate public product
 * information — `history/services/privacy.py` excludes it from `VENDOR_NAME_FIELDS` in so many
 * words, because "redacting it out of a description would mangle honest copy to protect
 * something that was never withheld". Warning about it here would tell farmers to remove
 * something Trazo publishes on purpose.
 *
 * ⛔ `useWatch` in its own component, never `methods.watch(...)` in the tab body: this form is
 * ~5,600 lines and a top-level watch re-renders all of it on every keystroke in the note. Same
 * reasoning as the measured `useWatch` note in WeatherTab.
 */
const PublicNoteSupplierHint = ({ control }) => {
  const intl = useIntl();
  const note = useWatch({ control, name: 'observation', defaultValue: '' });
  const supplierName = useWatch({ control, name: 'supplier_name', defaultValue: '' });

  if (!publicNoteMentionsASupplier(note, [supplierName])) return null;
  return (
    <StandardAlert
      status="info"
      mb={0}
      description={intl.formatMessage({ id: 'events.common.help.publicNoteSupplierWarning' })}
    />
  );
};

const ChemicalTab = forwardRef(
  (
    {
      onSubmitHandler,
      onDataChange,
      onPrev,
      initialValues = {},
      hideActions = false,
      /**
       * Hide the raw chemical-type select because the wizard already asked (2026-09-01).
       *
       * "Input application" names no practice on its own, and FE/PE/FU/HE decide which half of
       * this tab's fields render — so the question moved to step 0's ActivitySubtypeChooser,
       * in the registry's farmer vocabulary and in the active locale. The options here were
       * four hardcoded English strings.
       *
       * ⛔ Hiding it does NOT stop `type` being posted: the field stays in `defaultValues`
       * (seeded from `initialValues.type`), so zod validation, every `visibleForSubtypes` gate,
       * the carbon factor and the PUR export keep reading it. It removes a SECOND ask, not the
       * answer. NewEvent passes this on every path — create and edit alike.
       */
      hideTypeSelect = false,
      /**
       * One spray on several blocks (MultiParcel). The amount and area treated, where on the
       * block, the block id, summary mode, tank-mix partner volumes and fuel are per block or
       * have no per-block value, so they are hidden here and asked per block by the wizard.
       */
      multiTarget = false,
      carbonCalculation = null,
      isCalculatingCarbon = false
    },
    ref
  ) => {
    const intl = useIntl();
    // Memoised on `intl`: a new schema object each render would hand zodResolver a fresh
    // resolver every time and reset the form's validation state mid-typing.
    const formSchemaMainInfo = useMemo(
      () => buildChemicalSchema(intl, { multiTarget }),
      [intl, multiTarget]
    );
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
        // A ticked "Not on my record" wins over a seeded or merged value (review of app #371).
        concentration: isAffirmativeFlag(initialValues.concentration_not_recorded)
          ? ''
          : initialValues.concentration || '',
        concentration_not_recorded: isAffirmativeFlag(initialValues.concentration_not_recorded)
          ? 'true'
          : 'false',
        volume_applied: initialValues.volume_applied?.toString() || '',
        volume_numeric:
          initialValues.volume_numeric?.toString() ||
          initialValues.volume_applied?.toString() ||
          '',
        volume_unit: initialValues.volume_unit || initialValues.extra_data?.volume_unit || 'gal',
        // No default UNIT. A rate whose denominator we guessed is a different fact from the one
        // the grower stated — `volume_unit` can default to 'gal' because the number beside it is
        // meaningless without a value anyway, but "6" with an assumed "/acre" reads as a
        // statement. The formatter renders nothing until both halves are present.
        application_rate:
          initialValues.application_rate?.toString() ||
          initialValues.extra_data?.application_rate?.toString() ||
          '',
        application_rate_unit:
          initialValues.application_rate_unit ||
          initialValues.extra_data?.application_rate_unit ||
          '',
        area_treated: initialValues.area_treated?.toString() || '',
        area_numeric:
          initialValues.area_numeric?.toString() || initialValues.area_treated?.toString() || '',
        area_unit: initialValues.area_unit || initialValues.extra_data?.area_unit || 'acres',
        is_fertigation:
          initialValues.is_fertigation === true || initialValues.is_fertigation === 'true'
            ? 'true'
            : 'false',
        nitrogen_source: initialValues.nitrogen_source || '',
        application_purpose: initialValues.application_purpose || '',
        // D2
        nitrogen_percentage: initialValues.nitrogen_percentage?.toString?.() || '',
        phosphorus_percentage: initialValues.phosphorus_percentage?.toString?.() || '',
        potassium_percentage: initialValues.potassium_percentage?.toString?.() || '',
        // §E-3
        micronutrient_type: initialValues.micronutrient_type || '',
        micronutrient_rate: initialValues.micronutrient_rate?.toString?.() || '',
        micronutrient_rate_unit: initialValues.micronutrient_rate_unit || 'lb/ac',
        application_method: initialValues.application_method || '',
        // SPRINT 6 FIX (2025-12-24): Read from extra_data as fallback (stored there in onSubmit)
        application_details:
          initialValues.application_details || initialValues.extra_data?.application_details || '',
        weather_conditions:
          initialValues.weather_conditions || initialValues.extra_data?.weather_conditions || '',
        application_timing:
          initialValues.application_timing || initialValues.extra_data?.application_timing || '',
        target_pest_disease:
          initialValues.target_pest_disease || initialValues.extra_data?.target_pest_disease || '',
        observation: initialValues.observation || '',
        private_note: initialValues.private_note || '',
        // EPA WPS Compliance Fields
        applicator_name: initialValues.applicator_name || '',
        // F21 — authorizer (GG) + supervisor review (FSMA)
        authorizer_name: initialValues.authorizer_name || '',
        reviewed:
          initialValues.reviewed === true || initialValues.reviewed === 'true' ? 'true' : 'false',
        reviewer_name: initialValues.reviewer_name || '',
        review_date: initialValues.review_date || '',
        epa_registration_number: initialValues.epa_registration_number || '',
        restricted_use_pesticide: initialValues.restricted_use_pesticide?.toString() || 'false',
        applicator_certification: initialValues.applicator_certification || '',
        rei_hours: initialValues.rei_hours?.toString() || '',
        phi_days: initialValues.phi_days?.toString() || '',
        // Sprint 3 Epic 3.2: Consumer Trust Fields
        organic_approved: initialValues.organic_approved || '',
        applied_scope: initialValues.applied_scope || '',
        applied_scope_detail: initialValues.applied_scope_detail || '',
        buffer_zone_meters: initialValues.buffer_zone_meters?.toString() || '',
        // NOP Compliance: Supplier & Purchase Tracking (7 CFR 205.103)
        supplier_name: initialValues.supplier_name || initialValues.extra_data?.supplier_name || '',
        purchase_date: initialValues.purchase_date || initialValues.extra_data?.purchase_date || '',
        purchase_invoice:
          initialValues.purchase_invoice || initialValues.extra_data?.purchase_invoice || '',
        chemical_lot_number:
          initialValues.chemical_lot_number || initialValues.extra_data?.chemical_lot_number || '',
        quantity_purchased: initialValues.quantity_purchased?.toString() ?? '',
        quantity_purchased_unit: initialValues.quantity_purchased_unit || 'gal',
        // P0-3 — CA DPR Restricted Materials Permit
        ca_dpr_permit_number: initialValues.ca_dpr_permit_number || '',
        ca_dpr_permit_county: initialValues.ca_dpr_permit_county || '',
        ca_dpr_permit_expires: initialValues.ca_dpr_permit_expires || '',
        // F20 — legal spray-record completeness
        manufacturer: initialValues.manufacturer || '',
        application_start: (initialValues.application_start || '').slice(0, 16),
        application_end: (initialValues.application_end || '').slice(0, 16),
        planted_area: initialValues.planted_area?.toString() || '',
        planted_area_unit: initialValues.planted_area_unit || 'acres',
        operator_id: initialValues.operator_id || '',
        site_id: initialValues.site_id || '',
        application_county: initialValues.application_county || '',
        mtrs_section: initialValues.mtrs_section || '',
        mtrs_township: initialValues.mtrs_township || '',
        mtrs_range: initialValues.mtrs_range || '',
        mtrs_base_meridian: initialValues.mtrs_base_meridian || '',
        ffm_code: initialValues.ffm_code || '',
        applied_by_pcb:
          initialValues.applied_by_pcb === true || initialValues.applied_by_pcb === 'true'
            ? 'true'
            : 'false',
        pcb_name: initialValues.pcb_name || '',
        // Normalize to strings: the form schema declares every adjuvant field as a
        // zod string(), but the backend returns organic_approved as a bool (and volume
        // may be numeric). Un-normalized values fail zod validation on edit → blocked save.
        tank_mix_partners: Array.isArray(initialValues.tank_mix_partners)
          ? initialValues.tank_mix_partners.map((p) => ({
              commercial_name: p.commercial_name || '',
              manufacturer: p.manufacturer || '',
              epa_registration_number: p.epa_registration_number || '',
              volume: p.volume != null ? String(p.volume) : '',
              volume_unit: p.volume_unit || 'gal',
              organic_approved:
                p.organic_approved === true || p.organic_approved === 'true' ? 'true' : 'false'
            }))
          : [],
        // Phase 3: Application fuel tracking
        application_fuel_type: initialValues.application_fuel_type || '',
        application_fuel_consumed: initialValues.application_fuel_consumed?.toString() || '',
        application_fuel_unit: initialValues.application_fuel_unit || 'gal',
        custom_fields: initialValues.custom_fields || [],
        omri_product:
          typeof initialValues.omri_product === 'number' ? initialValues.omri_product : null,
        wsda_material:
          typeof initialValues.wsda_material === 'number' ? initialValues.wsda_material : null,
        // Sprint 5: Aggregate Fertilizer Support
        // FIX: Use strict comparison — string "false" is truthy in JS!
        is_summary:
          initialValues.is_summary === 'true' || initialValues.is_summary === true
            ? 'true'
            : 'false',
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

    // Quick-pick: recently used chemical inputs on this establishment (route :farmId)
    // Clicking a chip prefills product identity fields; the farmer can still edit everything.
    const { farmId, parcelId } = useParams();
    const { data: recentInputs } = useGetRecentInputsQuery(
      { establishmentId: farmId },
      { skip: !farmId }
    );

    // Gates the CA Pesticide Use Report block below. null (unknown state) hides it,
    // which is correct: the PUR only applies to California operations.
    const farmState = useFarmState(farmId);
    // Every California-only heading, badge, citation (DPR boxes, 3 CCR, PUR) and field on this
    // form keys off this one flag (overall review 2026-11, OV-FJ-C13: a Washington farm's spray
    // form read "Legal spray record / CA pesticide report" and cited DPR boxes on its start and
    // stop times). While the state is unknown (loading, or none on the farm) the neutral
    // wording shows: a California obligation is never assumed.
    const isCaFarm = farmState === 'CA';
    // Hiding is a display decision and never hides data already on the record. A record that
    // holds California PUR identifiers or a county permit keeps showing them on any farm, so
    // the grower can still see, check or clear what was saved.
    //
    // Latched, not re-read: `initialValues` is the wizard's live form state (this form's own
    // debounced onDataChange writes back into it), so a plain read flipped to false the moment
    // the grower cleared the field, and the section unmounted mid-edit with no way back on a
    // non-CA farm (review of app #370). Once the record has shown a value, the section stays for
    // the life of the form. A record that loads after mount still latches when its values arrive.
    const recordHolds = (...names) =>
      names.some((name) => String(initialValues?.[name] ?? '').trim() !== '');
    const heldCaFieldsRef = useRef({ purIdentity: false, permit: false });
    if (
      recordHolds(
        'operator_id',
        'site_id',
        'application_county',
        'mtrs_section',
        'mtrs_township',
        'mtrs_range',
        'mtrs_base_meridian',
        'ffm_code'
      )
    ) {
      heldCaFieldsRef.current.purIdentity = true;
    }
    if (recordHolds('ca_dpr_permit_number', 'ca_dpr_permit_county', 'ca_dpr_permit_expires')) {
      heldCaFieldsRef.current.permit = true;
    }
    const recordHoldsCaPurIdentity = heldCaFieldsRef.current.purIdentity;
    const recordHoldsCaPermit = heldCaFieldsRef.current.permit;

    // PUR boxes 3 and 8 are issued to the OPERATOR and the SITE, not to a spray (3 CCR 6622),
    // so the farm and the parcel carry them and the export falls back to those. The inputs
    // below stay per-record for the exception (a second county's Operator ID, a block with
    // its own site number) and show the default they would otherwise inherit.
    const currentCompanyForDefaults = useSelector((state) => state.company?.currentCompany);
    const { data: parcelForDefaults } = useGetParcelQuery(
      { companyId: currentCompanyForDefaults?.id, farmId, parcelId },
      { skip: farmState !== 'CA' || !parcelId || !farmId || !currentCompanyForDefaults?.id }
    );
    const parcelSiteIdDefault = (parcelForDefaults?.ca_site_id || '').trim();

    // 🔴 2026-08-19 — the verification basis was optional for every farm, and a blank one
    // reaches the certifier packet as an amber "the transition date cannot be confirmed
    // until they are classified" (§ 205.202(b)) that the grower never saw coming. For a farm
    // that declares itself organic the basis is not optional under § 205.201(a)(2): the OSP
    // must document that each substance is allowed, which is exactly what CCOF's Input
    // Material Application Record asks for. So it is required here, where the grower has the
    // label in hand — not discovered on the packet months later.
    //
    // Conventional / regenerative operations are untouched: the question does not apply to
    // them and blocking their save would be the same mistake in the other direction.
    // An ALLOW-LIST of affirmative organic methods, not a substring match with exceptions.
    // `includes('organic')` plus a `^non[-\s]?organic` escape hatch is denylist thinking: it
    // reads "not organic" as organic and would block a CONVENTIONAL grower from saving at all.
    // `farming_method` is a choice-less CharField, so unknown values must fail SAFE — a
    // missing basis raises a REVIEW on the packet that names the record, which is recoverable;
    // a false requirement is a farmer who cannot log their spray.
    const ORGANIC_FARMING_METHODS = ['organic', 'certified organic'];
    const farm = useFarm(farmId);
    const farmOperatorIdDefault = (farm?.ca_operator_id || '').trim();
    const farmingMethod = (farm?.farming_method || '').trim().toLowerCase();
    const requiresOrganicBasis = ORGANIC_FARMING_METHODS.includes(farmingMethod);

    // Mirrors ORGANIC_APPROVED_OK_VALUES in common/field_registry.py — the backend list is
    // the source of truth; this copy only drives local UI affordances.
    const ORGANIC_APPROVED_VALUES = [
      'omri_listed',
      'wsda_listed',
      'nop_seal_on_label',
      'certifier_approved',
      'usda_nop_approved'
    ];
    const RECENT_INPUT_PREFILL_FIELDS = [
      'commercial_name',
      'active_ingredient',
      'concentration',
      'organic_approved',
      'epa_registration_number',
      'application_method'
    ];

    const handleRecentInputPick = (product) => {
      // Only set the chemical type when the farmer hasn't chosen one yet
      if (!methods.getValues('type') && ['FE', 'PE', 'FU', 'HE'].includes(product.type)) {
        methods.setValue('type', product.type, { shouldDirty: true });
      }
      // A prefilled name is a new name: whatever listing was attached belonged to the old one.
      if (methods.getValues('omri_product') != null) {
        methods.setValue('omri_product', null, { shouldDirty: true });
      }
      if (methods.getValues('wsda_material') != null) {
        methods.setValue('wsda_material', null, { shouldDirty: true });
      }
      RECENT_INPUT_PREFILL_FIELDS.forEach((field) => {
        // A ticked "Not on my record" is this record's answer; a past record's label value is not.
        if (field === 'concentration' && methods.getValues('concentration_not_recorded') === 'true')
          return;
        if (product[field] !== null && product[field] !== undefined && product[field] !== '') {
          methods.setValue(field, String(product[field]), { shouldDirty: true });
        }
      });
    };

    /**
     * Attach or detach a catalog listing, and keep the § 205.601 BASIS in step with it.
     *
     * 🔴 2026-09-03. The two were independent facts a grower could leave contradicting each
     * other: "Use this listing" wrote `omri_product` and nothing else, so the commonest shape
     * was an attached OMRI row above an unanswered "How is this input verified for organic
     * use?". That record's certifier packet then prints NOTHING in the Organic Status column —
     * `_organic_basis_cell` reads the dropdown, not the FK — on a record for which Trazo holds
     * real catalog evidence.
     *
     * Setting it here is not the client deciding a claim. What a SHOPPER is told is still
     * decided server-side by `claim_authority.may_claim_input_listing`, which reads the FK and
     * ignores this field entirely; and the tap on "Use this listing" is the grower's own act,
     * which is exactly what `organic_approved` records. The old rule in InputVerifyHelper's
     * docstring ("do NOT auto-populate") was written about the LOOKUP, which is a fuzzy matcher
     * running on every keystroke. An attach is a decision.
     *
     * ⛔ Only ever fills a blank. A grower who answered "not organic" and then attached a
     * listing is stating a disagreement, and the server already resolves that honestly (the
     * prohibited branch of `resolve_input_status` outranks the catalog match). Overwriting
     * their answer would be the client upgrading a claim after all.
     */
    const attachListing = (field, basis, pk) => {
      methods.setValue(field, pk, { shouldDirty: true });
      const current = String(methods.getValues('organic_approved') ?? '').trim();
      if (pk != null) {
        if (!current) {
          methods.setValue('organic_approved', basis, { shouldDirty: true, shouldValidate: true });
        }
        return;
      }
      // Detaching takes back only what attaching gave. A basis the grower picked themselves,
      // or one backed by the OTHER catalog, survives.
      const other = field === 'omri_product' ? 'wsda_material' : 'omri_product';
      if (current === basis && methods.getValues(other) == null) {
        methods.setValue('organic_approved', '', { shouldDirty: true, shouldValidate: true });
      }
    };

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
                // A handler may veto AFTER zod passes (farm-dependent rules the
                // module-level schema cannot see). `false` means: stay on this step.
                if (submitHandlerRef.current(data) === false) {
                  reject(methods.formState.errors);
                  return;
                }
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
          // The tick wins over a voice or re-offer merge: the box is disabled under it.
          concentration: isAffirmativeFlag(initialValues.concentration_not_recorded)
            ? ''
            : initialValues.concentration || '',
          concentration_not_recorded: isAffirmativeFlag(initialValues.concentration_not_recorded)
            ? 'true'
            : 'false',
          // FIXED: Use correct backend field names for form population - check both possible field names
          volume_applied: firstFilled(initialValues.volume_applied, initialValues.volume),
          volume_numeric: firstFilled(
            initialValues.volume_numeric,
            initialValues.volume_applied,
            initialValues.volume
          ),
          volume_unit: initialValues.volume_unit || initialValues.extra_data?.volume_unit || 'gal',
          // No default UNIT. A rate whose denominator we guessed is a different fact from the one
          // the grower stated — `volume_unit` can default to 'gal' because the number beside it is
          // meaningless without a value anyway, but "6" with an assumed "/acre" reads as a
          // statement. The formatter renders nothing until both halves are present.
          application_rate:
            initialValues.application_rate?.toString() ||
            initialValues.extra_data?.application_rate?.toString() ||
            '',
          application_rate_unit:
            initialValues.application_rate_unit ||
            initialValues.extra_data?.application_rate_unit ||
            '',
          area_treated: firstFilled(initialValues.area_treated, initialValues.area),
          area_numeric: firstFilled(
            initialValues.area_numeric,
            initialValues.area_treated,
            initialValues.area
          ),
          area_unit: initialValues.area_unit || initialValues.extra_data?.area_unit || 'acres',
          is_fertigation:
            initialValues.is_fertigation === true || initialValues.is_fertigation === 'true'
              ? 'true'
              : 'false',
          nitrogen_source: initialValues.nitrogen_source || '',
          application_purpose: initialValues.application_purpose || '',
          // D2
          nitrogen_percentage: initialValues.nitrogen_percentage?.toString?.() || '',
          phosphorus_percentage: initialValues.phosphorus_percentage?.toString?.() || '',
          potassium_percentage: initialValues.potassium_percentage?.toString?.() || '',
          // §E-3
          micronutrient_type: initialValues.micronutrient_type || '',
          micronutrient_rate: initialValues.micronutrient_rate?.toString?.() || '',
          micronutrient_rate_unit: initialValues.micronutrient_rate_unit || 'lb/ac',
          application_method:
            initialValues.application_method || initialValues.way_of_application || '',
          // SPRINT 6 FIX (2025-12-24): Read from extra_data as fallback (stored there in onSubmit)
          application_details:
            initialValues.application_details ||
            initialValues.extra_data?.application_details ||
            '',
          // Environmental context fields for transparency (model columns with extra_data fallback)
          weather_conditions:
            initialValues.weather_conditions || initialValues.extra_data?.weather_conditions || '',
          application_timing:
            initialValues.application_timing || initialValues.extra_data?.application_timing || '',
          target_pest_disease:
            initialValues.target_pest_disease ||
            initialValues.extra_data?.target_pest_disease ||
            '',
          observation: initialValues.observation || '',
          private_note: initialValues.private_note || '',
          // EPA WPS Compliance Fields
          applicator_name: initialValues.applicator_name || '',
          // F21 — authorizer (GG) + supervisor review (FSMA)
          authorizer_name: initialValues.authorizer_name || '',
          reviewed:
            initialValues.reviewed === true || initialValues.reviewed === 'true' ? 'true' : 'false',
          reviewer_name: initialValues.reviewer_name || '',
          review_date: initialValues.review_date || '',
          epa_registration_number: initialValues.epa_registration_number || '',
          restricted_use_pesticide: initialValues.restricted_use_pesticide?.toString() || 'false',
          applicator_certification: initialValues.applicator_certification || '',
          rei_hours: initialValues.rei_hours?.toString() || '',
          phi_days: initialValues.phi_days?.toString() || '',
          // Sprint 3 Epic 3.2: Consumer Trust Fields
          organic_approved: initialValues.organic_approved || '',
          applied_scope: initialValues.applied_scope || '',
          applied_scope_detail: initialValues.applied_scope_detail || '',
          buffer_zone_meters: initialValues.buffer_zone_meters?.toString() || '',
          // NOP Compliance: Supplier & Purchase Tracking (7 CFR 205.103)
          supplier_name:
            initialValues.supplier_name || initialValues.extra_data?.supplier_name || '',
          purchase_date:
            initialValues.purchase_date || initialValues.extra_data?.purchase_date || '',
          purchase_invoice:
            initialValues.purchase_invoice || initialValues.extra_data?.purchase_invoice || '',
          chemical_lot_number:
            initialValues.chemical_lot_number ||
            initialValues.extra_data?.chemical_lot_number ||
            '',
          // P0-3 — CA DPR Restricted Materials Permit
          ca_dpr_permit_number: initialValues.ca_dpr_permit_number || '',
          ca_dpr_permit_county: initialValues.ca_dpr_permit_county || '',
          ca_dpr_permit_expires: initialValues.ca_dpr_permit_expires || '',
          // F20 — legal spray-record completeness
          manufacturer: initialValues.manufacturer || '',
          application_start: (initialValues.application_start || '').slice(0, 16),
          application_end: (initialValues.application_end || '').slice(0, 16),
          planted_area: initialValues.planted_area?.toString() || '',
          planted_area_unit: initialValues.planted_area_unit || 'acres',
          operator_id: initialValues.operator_id || '',
          site_id: initialValues.site_id || '',
          application_county: initialValues.application_county || '',
          mtrs_section: initialValues.mtrs_section || '',
          mtrs_township: initialValues.mtrs_township || '',
          mtrs_range: initialValues.mtrs_range || '',
          mtrs_base_meridian: initialValues.mtrs_base_meridian || '',
          ffm_code: initialValues.ffm_code || '',
          applied_by_pcb:
            initialValues.applied_by_pcb === true || initialValues.applied_by_pcb === 'true'
              ? 'true'
              : 'false',
          pcb_name: initialValues.pcb_name || '',
          // Normalize to strings (see the primary defaultValues block): backend returns
          // organic_approved as a bool / volume as numeric, which fail zod string() on edit.
          tank_mix_partners: Array.isArray(initialValues.tank_mix_partners)
            ? initialValues.tank_mix_partners.map((p) => ({
                commercial_name: p.commercial_name || '',
                manufacturer: p.manufacturer || '',
                epa_registration_number: p.epa_registration_number || '',
                volume: p.volume != null ? String(p.volume) : '',
                volume_unit: p.volume_unit || 'gal',
                organic_approved:
                  p.organic_approved === true || p.organic_approved === 'true' ? 'true' : 'false'
              }))
            : [],
          // Phase 3: Application fuel tracking
          application_fuel_type: initialValues.application_fuel_type || '',
          application_fuel_consumed: initialValues.application_fuel_consumed?.toString() || '',
          application_fuel_unit: initialValues.application_fuel_unit || 'gal',
          custom_fields: initialValues.custom_fields || [],
          omri_product:
            typeof initialValues.omri_product === 'number' ? initialValues.omri_product : null,
          wsda_material:
            typeof initialValues.wsda_material === 'number' ? initialValues.wsda_material : null,
          // Sprint 5: Aggregate Fertilizer Support
          // FIX: Use strict comparison — string "false" is truthy in JS!
          is_summary:
            initialValues.is_summary === 'true' || initialValues.is_summary === true
              ? 'true'
              : 'false',
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customFields]);

    const {
      handleSubmit,
      watch,
      formState: { errors }
    } = methods;

    // Tank-mix adjuvants — repeatable structured rows (each becomes its own PUR line).
    const {
      fields: adjuvantFields,
      append: appendAdjuvant,
      remove: removeAdjuvant
    } = useFieldArray({ control: methods.control, name: 'tank_mix_partners' });

    const chemicalType = watch('type');

    /*
     * "My products" scoped to the type in force — see the comment at the render site.
     *
     * Before the type is known (a non-wizard caller whose select is still blank) the whole
     * list stands, which is the pre-2026-09-01 behaviour: with nothing to contradict, there
     * is nothing to scope to.
     */
    const typeScopedRecentInputs = useMemo(() => {
      const rows = recentInputs || [];
      if (!chemicalType) return rows;
      return rows.filter((product) => product.type === chemicalType);
    }, [recentInputs, chemicalType]);

    const areaValue = watch('area_numeric') || watch('area_treated');
    const volumeValue = watch('volume_numeric') || watch('volume_applied');
    const concentrationValue = watch('concentration');
    const isRestrictedUse = watch('restricted_use_pesticide') === 'true';

    // D2 — derive the free-text "NPK Ratio" from the structured trio so the farmer types the
    // analysis once. Only fills when concentration is EMPTY: a value they typed themselves is
    // never overwritten, and a product whose label reads something other than N-P-K keeps it.
    const nValue = watch('nitrogen_percentage');
    const pValue = watch('phosphorus_percentage');
    const kValue = watch('potassium_percentage');
    const concentrationNotOnRecord = watch('concentration_not_recorded') === 'true';
    const NPK_SHAPE = /^\d+(?:\.\d+)?-\d+(?:\.\d+)?-\d+(?:\.\d+)?$/;
    useEffect(() => {
      // Ticked "Not on my record": the box stays empty, so nothing is derived into it.
      if (concentrationNotOnRecord) return;
      const current = concentrationValue == null ? '' : String(concentrationValue).trim();

      if (chemicalType !== 'FE') {
        // Switching away from fertilizer leaves an NPK-shaped value that is invalid for a
        // pesticide/fungicide/herbicide (those want a percentage). The farmer would face a
        // validation error on a field they never touched, caused by the auto-fill above, so
        // clear it — only when it still looks auto-derived, never free text they typed.
        if (current && NPK_SHAPE.test(current)) {
          methods.setValue('concentration', '', { shouldValidate: false, shouldDirty: true });
        }
        return;
      }

      const filled = [nValue, pValue, kValue].every((v) => v !== '' && v != null);
      if (!filled) return;
      if (current !== '') return;
      methods.setValue(
        'concentration',
        `${parseFloat(nValue)}-${parseFloat(pValue)}-${parseFloat(kValue)}`,
        { shouldValidate: true, shouldDirty: true }
      );
    }, [
      chemicalType,
      nValue,
      pValue,
      kValue,
      concentrationValue,
      concentrationNotOnRecord,
      methods
    ]);

    // Sprint 5: Watch for summary mode toggle (Aggregate Fertilizer Support)
    // SPRINT 6 FIX (2025-12-23): Only enable summary mode for chemical types that support it (FE, FU, PE)
    // This prevents HE (Herbicide) from having hidden quantity fields when is_summary is stale/true
    const isSummaryMode =
      !multiTarget && watch('is_summary') === 'true' && ['FE', 'FU', 'PE'].includes(chemicalType);

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
        ? validateConcentration(concentrationValue, chemicalType, {
            isMicronutrient: !!watch('micronutrient_type')
          })
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
      'application_rate',
      'application_rate_unit',
      'is_fertigation',
      'concentration',
      'concentration_not_recorded',
      'application_method',
      'application_details',
      'weather_conditions',
      'application_timing',
      'target_pest_disease',
      'observation',
      'private_note',
      'applicator_name',
      'epa_registration_number',
      'restricted_use_pesticide',
      'applicator_certification',
      'rei_hours',
      'phi_days',
      'organic_approved',
      'buffer_zone_meters',
      'applied_scope',
      'applied_scope_detail',
      // NOP Compliance: Supplier & Purchase Tracking
      'supplier_name',
      'purchase_date',
      'purchase_invoice',
      'chemical_lot_number',
      // P0-3 — CA DPR Restricted Materials Permit
      'ca_dpr_permit_number',
      'ca_dpr_permit_county',
      'ca_dpr_permit_expires',
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
            'application_rate',
            'application_rate_unit',
            'is_fertigation',
            'concentration',
            'concentration_not_recorded',
            'application_method',
            'application_details',
            'weather_conditions',
            'application_timing',
            'target_pest_disease',
            'observation',
            'private_note',
            'applicator_name',
            'epa_registration_number',
            'restricted_use_pesticide',
            'applicator_certification',
            'rei_hours',
            'phi_days',
            'organic_approved',
            'buffer_zone_meters',
            'applied_scope',
            'applied_scope_detail',
            'custom_fields',
            // NOP Compliance: Supplier & Purchase Tracking
            'supplier_name',
            'purchase_date',
            'purchase_invoice',
            'chemical_lot_number',
            // P0-3 — CA DPR Restricted Materials Permit
            'ca_dpr_permit_number',
            'ca_dpr_permit_county',
            'ca_dpr_permit_expires',
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
      // § 205.201(a)(2): an organic operation's OSP must document that each substance used
      // is allowed. Enforced here rather than in the zod schema because the schema is a
      // module-level constant with no access to which farm this event belongs to.
      if (requiresOrganicBasis && chemicalType && !data.organic_approved) {
        methods.setError('organic_approved', {
          type: 'manual',
          message: intl.formatMessage({ id: 'events.chemical.organicBasis.required' })
        });
        // `false` tells submitForm to reject — without it the wizard's submit promise
        // resolved on this early return and advanced past a form that saved nothing.
        return false;
      }

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
        // NOP Compliance: Supplier & Purchase Tracking (7 CFR 205.103)
        supplier_name,
        purchase_date,
        purchase_invoice,
        chemical_lot_number,
        receipt_document,
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
        // F20 — legal spray-record fields flow via ...filteredData as top-level model
        // fields. Coerce the two datetimes to null when blank: a DRF DateTimeField
        // rejects "" with a 400 (it must be null or a valid timestamp).
        application_start: data.application_start || null,
        application_end: data.application_end || null,
        // F21 — supervisor review: coerce the Switch's 'true'/'false' string to a real
        // bool and blank review_date to null (DRF DateField rejects "").
        reviewed: data.reviewed === 'true' || data.reviewed === true,
        review_date: data.review_date || null,
        // Hired application: real bool; the business name only travels with the flag on, so
        // turning it off cannot leave a stale contractor on a self-applied record.
        applied_by_pcb: data.applied_by_pcb === 'true' || data.applied_by_pcb === true,
        pcb_name:
          data.applied_by_pcb === 'true' || data.applied_by_pcb === true ? data.pcb_name || '' : '',
        // "Not on my record": a real bool, and an EMPTY STRING for the value, never null. The
        // payload builder drops nulls, so a null would leave an edited record's old value in place
        // beside the tick, which the server refuses (the flag or the value, never both).
        concentration_not_recorded: data.concentration_not_recorded === 'true',
        concentration: data.concentration_not_recorded === 'true' ? '' : data.concentration,
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
        // The label rate. BOTH HALVES OR NEITHER — the same rule the micronutrient trio above
        // spells out: a rate with no unit measures nothing, and a unit with no rate is a
        // denominator attached to silence. `null` on either side clears both, so clearing the
        // number in an edit cannot leave a stale "/acre" behind.
        application_rate:
          data.application_rate && data.application_rate_unit
            ? parseFloat(data.application_rate)
            : null,
        application_rate_unit:
          data.application_rate && data.application_rate_unit ? data.application_rate_unit : '',
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
        // Keep the form's own key too. The wizard's step-3 required-field check reads
        // `application_method`; with only the renamed key present it passed or failed
        // depending on whether a late onDataChange flush raced in after this submit —
        // "Please fill in all required fields: Application Method" on a filled form
        // (2026-08-21, Serenade and Grandevo on the Calapooia Bend rehearsal).
        application_method: application_method || '',
        // Pesticide application fields (EPA WPS application record: 40 CFR 170.311(b)(1))
        // These are direct model fields on ChemicalEvent, not extra_data
        applicator_name: applicator_name || null,
        epa_registration_number: epa_registration_number || null,
        restricted_use_pesticide: restricted_use_pesticide === 'true',
        applicator_certification: applicator_certification || null,
        rei_hours: rei_hours ? parseFloat(rei_hours) : null,
        phi_days: phi_days ? parseFloat(phi_days) : null,
        // NOP Compliance: Supplier & Purchase Tracking (7 CFR 205.103)
        // These are direct model fields on ChemicalEvent
        supplier_name: supplier_name || null,
        purchase_date: purchase_date || null, // DateField — empty string must be null
        purchase_invoice: purchase_invoice || null,
        // FK — an empty select must post null, never "" (DRF PK field 400s on "")
        receipt_document: receipt_document || null,
        chemical_lot_number: chemical_lot_number || null,
        // D2 — the structured NPK trio, fertilizer-only. Sent as null for other subtypes so
        // re-typing an FE event as a pesticide clears them rather than leaving a phantom
        // analysis attached to a product that has none.
        nitrogen_percentage:
          chemicalType === 'FE' &&
          data.nitrogen_percentage !== '' &&
          data.nitrogen_percentage != null
            ? data.nitrogen_percentage
            : null,
        phosphorus_percentage:
          chemicalType === 'FE' &&
          data.phosphorus_percentage !== '' &&
          data.phosphorus_percentage != null
            ? data.phosphorus_percentage
            : null,
        potassium_percentage:
          chemicalType === 'FE' &&
          data.potassium_percentage !== '' &&
          data.potassium_percentage != null
            ? data.potassium_percentage
            : null,
        // §E-3: micronutrients (7 CFR 205.601(j)(7)). Fertilizer-only: send null for every
        // other subtype so re-typing an FE event as a pesticide actually clears the stored
        // values rather than leaving a phantom zinc application on the record.
        // All three stand or fall together: a rate with no nutrient names nothing, and a unit
        // with no rate measures nothing.
        micronutrient_type: chemicalType === 'FE' ? data.micronutrient_type || null : null,
        micronutrient_rate:
          chemicalType === 'FE' &&
          data.micronutrient_type &&
          data.micronutrient_rate !== '' &&
          data.micronutrient_rate != null
            ? data.micronutrient_rate
            : null,
        micronutrient_rate_unit:
          chemicalType === 'FE' && data.micronutrient_type && data.micronutrient_rate
            ? data.micronutrient_rate_unit || 'lb/ac'
            : null,
        // P0-3 — CA DPR Restricted Materials Permit (direct model fields)
        ca_dpr_permit_number: data.ca_dpr_permit_number || null,
        ca_dpr_permit_county: data.ca_dpr_permit_county || null,
        ca_dpr_permit_expires: data.ca_dpr_permit_expires || null,
        // Tank-mix adjuvants (direct JSONField) — drop fully-blank rows the farmer
        // added but never filled; coerce the organic flag to a real bool.
        tank_mix_partners: Array.isArray(data.tank_mix_partners)
          ? data.tank_mix_partners
              .filter((p) => p && (p.commercial_name || p.epa_registration_number || p.volume))
              .map((p) => ({
                commercial_name: p.commercial_name || '',
                manufacturer: p.manufacturer || '',
                epa_registration_number: p.epa_registration_number || '',
                volume: p.volume || '',
                volume_unit: p.volume_unit || 'gal',
                organic_approved: p.organic_approved === 'true' || p.organic_approved === true
              }))
          : [],
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
            // F28 fix (2026-06): don't inject phantom diesel/gal fuel metadata when
            // no fuel was reported for the summary period. Only assert unit/type when
            // the farmer provided a fuel amount or explicitly picked a fuel type.
            ...((data.fuel_consumption_total || data.application_fuel_type) && {
              fuel_unit: data.application_fuel_unit || 'gal',
              fuel_type: data.application_fuel_type || 'diesel'
            })
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
        <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ width: '100%' }}>
          <VStack spacing={6} align="stretch">
            {/*
              One callout, one message — the OSP-module pattern. This used to stack a title AND a
              bold "EPA/USDA-Sourced Carbon Calculations" line with its own blue shield icon on
              top of the body, then repeat the same claim in a purple badge on the card below:
              the same fact said three times, in three colours, two of which carry no meaning in
              this system. Copy also moved off "builds consumer trust through transparent
              agricultural practices" — a general-benefit consumer claim, and the wrong frame for
              October, which sells the record a certifier reviews at renewal.
            */}

            {/* Quick-pick: products recently used on this establishment.
                Scoped to the type the wizard already answered (2026-09-01). A chip prefills
                `commercial_name`, `active_ingredient`, `concentration`, `organic_approved` and
                the EPA registration number, so a fungicide chip tapped on a Fertilizer record
                writes a fungicide's identity into it — `handleRecentInputPick` guards `type`
                itself (it only fills a blank one) and nothing guarded the other five.
                A row carrying no type is dropped rather than shown: it cannot be matched, and
                an unmatchable row is exactly the one that would prefill the wrong identity. */}
            {typeScopedRecentInputs.length > 0 && (
              <Box>
                <HStack spacing={2} mb={2} flexWrap="wrap">
                  <Icon as={FaFlask} color="green.500" boxSize={3.5} />
                  <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                    {intl.formatMessage({ id: 'chemical.recentInputs.title' })}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {intl.formatMessage({ id: 'chemical.recentInputs.helper' })}
                  </Text>
                </HStack>
                <Wrap spacing={2}>
                  {typeScopedRecentInputs.slice(0, 6).map((product, index) => (
                    <WrapItem key={`${product.commercial_name}-${index}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        colorScheme="green"
                        borderRadius="full"
                        // 44px, not 36px: these pills are the fast path for re-entering a
                        // product a grower already uses, and they are tapped one-handed in the
                        // field. They sit in a <Wrap> with their own spacing, so growing them
                        // reflows cleanly rather than colliding with anything.
                        minH="44px"
                        onClick={() => handleRecentInputPick(product)}>
                        <HStack spacing={1.5}>
                          <Text fontSize="xs" fontWeight="medium" noOfLines={1} maxW="160px">
                            {product.commercial_name}
                          </Text>
                          {ORGANIC_APPROVED_VALUES.includes(product.organic_approved) && (
                            // Run 8 (R8-26 class, manual pass 2026-10-06): the grower's own
                            // earlier answer, not an approval. Neutral, and said as recorded.
                            <Badge colorScheme="gray" fontSize="11px" borderRadius="full" px={1.5}>
                              {intl.formatMessage({ id: 'chemical.recentInputs.organicBadge' })}
                            </Badge>
                          )}
                        </HStack>
                      </Button>
                    </WrapItem>
                  ))}
                </Wrap>
              </Box>
            )}

            {/* Forms are hand-crafted by design: the NOP section grouping below is what
                makes the audit export complete, and the registry renderer flattens it.
                The field registry is the SSOT for DISPLAY surfaces (consumer card, modal,
                timeline) and is enforced here by src/config/events/__tests__/
                formConformance.test.ts, not by a runtime flag. */}
            <>
              {/* Section 1: Chemical Selection & Identification */}
              <SectionBox>
                {/* The "EPA/USDA-Sourced" badge is gone: the callout above already states it,
                    and purple carries no meaning in this system (see .claude/rules/frontend.md —
                    status colour is meaning, never decoration). Icon moved to the brand green. */}
                {/* Not "Chemical Application Details". EVENT_TYPE_NAMES[2] is "Chemical
                    Application", and the farmer reached this form by tapping "Input
                    application" — on a certified-organic operation the record is often an
                    OMRI-listed fish fertiliser, which is not a "chemical" in any sense the
                    grower or their certifier uses. Same retired-family defect as
                    ProductionTab's first heading, and hardcoded English besides.

                    "Input Identification" names what the group holds: type, subtype, how it
                    is verified for organic use, commercial name, active ingredient. */}
                <SectionHeader
                  icon={FaFlask}
                  title={intl.formatMessage({ id: 'events.section.chemical.identification' })}
                  badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                />
                <VStack spacing={4} align="stretch">
                  {/* Chemical Type — only for a caller the wizard is not driving.
                        The wizard asks it in step 0 (ActivitySubtypeChooser), in the display
                        registry's vocabulary and in the active locale; the four options below
                        were hardcoded English and are the fourth copy of a list the registry
                        already owns. See hideTypeSelect above for why hiding must not
                        unregister the field. */}
                  {!hideTypeSelect && (
                    <StandardField
                      label={intl.formatMessage({ id: 'events.chemical.fields.type' })}
                      required
                      error={errors.type?.message}
                      helpText={intl.formatMessage({
                        id: 'events.chemical.fields.typeHelp'
                      })}>
                      <Controller
                        name="type"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardSelect
                            {...field}
                            placeholder={intl.formatMessage({
                              id: 'events.chemical.fields.typePlaceholder'
                            })}>
                            {getSubtypes(2).map((entry) => (
                              <option key={entry.code} value={entry.code}>
                                {intl.formatMessage({ id: entry.labelKey })}
                              </option>
                            ))}
                          </StandardSelect>
                        )}
                      />
                    </StandardField>
                  )}

                  {/* Chemical Subtype - conditional on the chemical type. The carbon estimate
                      still reads it in the background; the help speaks about the label, not
                      about emission factors (OV-FJ-C13). */}
                  {chemicalType && (
                    <StandardField
                      label={intl.formatMessage({
                        id: 'events.chemical.form.chemicalSubtype',
                        defaultMessage: 'Chemical Subtype'
                      })}
                      error={errors.chemical_subtype?.message}
                      helpText={intl.formatMessage({
                        id: 'events.chemical.form.chemicalSubtypeHelp',
                        defaultMessage: 'Optional. Pick the kind of product the label describes.'
                      })}>
                      <Controller
                        name="chemical_subtype"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardSelect
                            {...field}
                            placeholder={intl.formatMessage({
                              id: 'events.chemical.form.chemicalSubtypePlaceholder',
                              defaultMessage: 'Select subtype (optional)...'
                            })}>
                            {/* Fertilizer subtypes */}
                            {chemicalType === 'FE' && (
                              <>
                                <option value="synthetic_fertilizer">
                                  {intl.formatMessage({
                                    id: 'events.chemical.subtypeOptions.syntheticFertilizer',
                                    defaultMessage:
                                      'Synthetic/Chemical (Urea, Ammonium Nitrate, etc.)'
                                  })}
                                </option>
                                <option value="organic_fertilizer">
                                  {intl.formatMessage({
                                    id: 'events.chemical.subtypeOptions.organicFertilizer',
                                    defaultMessage: 'Organic (Compost, Manure, etc.)'
                                  })}
                                </option>
                                <option value="slow_release_fertilizer">
                                  {intl.formatMessage({
                                    id: 'events.chemical.subtypeOptions.slowRelease',
                                    defaultMessage: 'Slow-Release/Controlled'
                                  })}
                                </option>
                              </>
                            )}

                            {/* Pesticide subtypes */}
                            {chemicalType === 'PE' && (
                              <>
                                <option value="synthetic_pesticide">
                                  {intl.formatMessage({
                                    id: 'events.chemical.subtypeOptions.syntheticPesticide',
                                    defaultMessage: 'Synthetic (Conventional)'
                                  })}
                                </option>
                                <option value="organic_pesticide">
                                  {intl.formatMessage({
                                    id: 'events.chemical.subtypeOptions.organicPesticide',
                                    defaultMessage: 'Organic/Natural (Neem, Pyrethrin, etc.)'
                                  })}
                                </option>
                                <option value="biological_pesticide">
                                  {intl.formatMessage({
                                    id: 'events.chemical.subtypeOptions.biologicalPesticide',
                                    defaultMessage: 'Biological (Bt, Spinosad, etc.)'
                                  })}
                                </option>
                              </>
                            )}

                            {/* Herbicide subtypes */}
                            {chemicalType === 'HE' && (
                              <>
                                <option value="synthetic_herbicide">
                                  {intl.formatMessage({
                                    id: 'events.chemical.subtypeOptions.syntheticHerbicide',
                                    defaultMessage: 'Synthetic (Glyphosate, 2,4-D, Atrazine, etc.)'
                                  })}
                                </option>
                                <option value="organic_herbicide">
                                  {intl.formatMessage({
                                    id: 'events.chemical.subtypeOptions.organicHerbicide',
                                    defaultMessage:
                                      'Organic/Natural (Vinegar, Acetic Acid, Clove Oil, etc.)'
                                  })}
                                </option>
                              </>
                            )}

                            {/* Fungicide subtypes */}
                            {chemicalType === 'FU' && (
                              <>
                                <option value="synthetic_fungicide">
                                  {intl.formatMessage({
                                    id: 'events.chemical.subtypeOptions.syntheticFungicide',
                                    defaultMessage: 'Synthetic (Chlorothalonil, Mancozeb, etc.)'
                                  })}
                                </option>
                                <option value="organic_fungicide">
                                  {intl.formatMessage({
                                    id: 'events.chemical.subtypeOptions.organicFungicide',
                                    defaultMessage:
                                      'Organic/Natural (Neem Oil, Potassium Bicarbonate, etc.)'
                                  })}
                                </option>
                                <option value="copper_fungicide">
                                  {intl.formatMessage({
                                    id: 'events.chemical.subtypeOptions.copperFungicide',
                                    defaultMessage:
                                      'Copper-Based (Bordeaux Mix, Copper Sulfate, Kocide, etc.)'
                                  })}
                                </option>
                                <option value="sulfur_fungicide">
                                  {intl.formatMessage({
                                    id: 'events.chemical.subtypeOptions.sulfurFungicide',
                                    defaultMessage: 'Sulfur-Based'
                                  })}
                                </option>
                                <option value="biological_fungicide">
                                  {intl.formatMessage({
                                    id: 'events.chemical.subtypeOptions.biologicalFungicide',
                                    defaultMessage: 'Biological (Bacillus, Trichoderma, etc.)'
                                  })}
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
                      label={intl.formatMessage({ id: 'events.chemical.form.organicBasis' })}
                      required={requiresOrganicBasis}
                      error={methods.formState.errors.organic_approved?.message}
                      helpText={intl.formatMessage({
                        id: 'events.chemical.form.organicBasisHelp'
                      })}>
                      <Controller
                        name="organic_approved"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardSelect
                            {...field}
                            placeholder={intl.formatMessage({
                              id: 'events.chemical.form.organicBasisPlaceholder'
                            })}>
                            {/* 🔴 2026-08-15. Was "USDA NOP Approved — National Organic
                                Program" and "Organic Equivalent — Meets organic standards".
                                The NOP approves no products; it publishes a substance list
                                and licenses a seal. "Organic Equivalent" was a grower-graded
                                self-assessment in the column an inspector reads as a
                                verification basis, and appears nowhere in the corpus. The two
                                lawful bases that had NO option — WSDA and certifier review —
                                are exactly why growers reached for the invented ones. */}
                            <option value="omri_listed">
                              {intl.formatMessage({ id: 'events.organicApproved.omriListed' })}
                            </option>
                            <option value="wsda_listed">
                              {intl.formatMessage({ id: 'events.organicApproved.wsdaListed' })}
                            </option>
                            <option value="nop_seal_on_label">
                              {intl.formatMessage({ id: 'events.organicApproved.nopSeal' })}
                            </option>
                            <option value="certifier_approved">
                              {intl.formatMessage({
                                id: 'events.organicApproved.certifierApproved'
                              })}
                            </option>
                            {/* Run 8 (R8-08): an honest answer when the listing is unknown.
                                Never reads as allowed; the record lists the basis as missing. */}
                            <option value="unverified">
                              {intl.formatMessage({ id: 'events.organicApproved.unverified' })}
                            </option>
                            <option value="not_organic">
                              {intl.formatMessage({
                                id: 'events.organicApproved.notOrganicOption',
                                defaultMessage: 'No organic basis: conventional use only'
                              })}
                            </option>
                            <option value="transitional">
                              {intl.formatMessage({
                                id: 'events.organicApproved.transitionalOption',
                                defaultMessage: 'Transitional - in certification process'
                              })}
                            </option>
                            {/* A <select> bound to a value with no matching <option> shows
                                the placeholder, and the next save writes ''. Retiring
                                `usda_nop_approved` / `organic_equivalent` on 2026-08-15
                                therefore silently ERASED the recorded § 205.601 verification
                                basis on any older record a grower reopened. Keep the stored
                                answer selectable, marked retired, until they replace it. */}
                            {retiredOrganicApprovedLabelKey(field.value) && (
                              <option value={field.value}>
                                {intl.formatMessage(
                                  { id: 'events.organicApproved.retiredOption' },
                                  {
                                    label: intl.formatMessage({
                                      id: retiredOrganicApprovedLabelKey(field.value)
                                    })
                                  }
                                )}
                              </option>
                            )}
                          </StandardSelect>
                        )}
                      />
                    </StandardField>
                  )}
                  {/* Not where the basis is required: there the save is refused with its own
                      error, and "you can save without one" would contradict it (review of
                      trazo-app #359). */}
                  {chemicalType && !requiresOrganicBasis && (
                    <OrganicBasisBlankNotice
                      control={methods.control}
                      messageId="events.chemical.organicBasis.blankWarning"
                    />
                  )}

                  {/* Sprint 5: Aggregate Chemical Support - Summary Mode Toggle (Fertilizer, Fungicide & Pesticide) */}
                  {!multiTarget &&
                    (chemicalType === 'FE' || chemicalType === 'FU' || chemicalType === 'PE') && (
                      <Box
                        p={4}
                        bg={isSummaryMode ? 'white' : 'gray.50'}
                        borderRadius="md"
                        border="1px solid"
                        borderColor={isSummaryMode ? 'gray.300' : 'gray.200'}
                        mb={4}>
                        <HStack justify="space-between" align="center">
                          <Box flex={1}>
                            {isSummaryMode && (
                              <Badge variant="neutral" mb={2}>
                                {intl.formatMessage({
                                  id: 'events.chemical.summaryMode.badge',
                                  defaultMessage: 'Summary Mode'
                                })}
                              </Badge>
                            )}
                            {/* ICU arguments, not a template literal. The English read
                              `Log multiple ${kind} applications as one summary (e.g. "${n}
                              applications")`, which is untranslatable BY CONSTRUCTION: word
                              order, gender agreement and the noun's plural all move with the
                              language, and a concatenation fixes them at English. Spanish needs
                              "aplicaciones de fungicida", not "fungicida aplicaciones". */}
                            <Text fontSize="sm" color="gray.600">
                              {isSummaryMode
                                ? intl.formatMessage(
                                    {
                                      id: 'events.chemical.summaryMode.on',
                                      defaultMessage:
                                        'Log multiple {kind} applications as one summary (e.g., "{example}").'
                                    },
                                    {
                                      kind: intl
                                        .formatMessage({
                                          id:
                                            chemicalType === 'FE'
                                              ? 'events.chemical.subtypes.fertilizer'
                                              : chemicalType === 'FU'
                                              ? 'events.chemical.subtypes.fungicide'
                                              : 'events.chemical.subtypes.pesticide'
                                        })
                                        .toLowerCase(),
                                      example: intl.formatMessage({
                                        id:
                                          chemicalType === 'FE'
                                            ? 'events.chemical.summaryMode.exampleFertilizer'
                                            : chemicalType === 'FU'
                                            ? 'events.chemical.summaryMode.exampleFungicide'
                                            : 'events.chemical.summaryMode.examplePesticide'
                                      })
                                    }
                                  )
                                : intl.formatMessage({
                                    id: 'events.chemical.summaryMode.off',
                                    defaultMessage: 'Toggle to log multiple applications at once'
                                  })}
                            </Text>
                          </Box>
                          <Controller
                            name="is_summary"
                            control={methods.control}
                            render={({ field }) => (
                              <Switch
                                {...field}
                                isChecked={field.value === 'true'}
                                onChange={(e) =>
                                  field.onChange(e.target.checked ? 'true' : 'false')
                                }
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
                              {/* ⚠️ UNSOURCED. The 95% / 87-93% / 90% figures predate this file's
                                git history and cite nothing. They are producer-facing, so no FTC
                                green-claim exposure — but they are still numbers on screen with
                                no measurement behind them. Translated as found rather than
                                silently dropped; deleting a claim is a product call. */}
                              <strong>
                                {intl.formatMessage(
                                  {
                                    id: 'events.chemical.summaryMode.timeSavings',
                                    defaultMessage: '{percent} time savings:'
                                  },
                                  {
                                    percent:
                                      chemicalType === 'FE'
                                        ? '95%'
                                        : chemicalType === 'FU'
                                        ? '87-93%'
                                        : '90%'
                                  }
                                )}
                              </strong>{' '}
                              {intl.formatMessage({
                                id: 'events.chemical.summaryMode.timeSavingsHelp',
                                defaultMessage: 'Log multiple applications with one entry'
                              })}
                            </Text>
                          </Box>
                        )}
                      </Box>
                    )}

                  {/* Sprint 5: Aggregate Fertilizer Fields (shown when summary mode is active) */}
                  {isSummaryMode && chemicalType === 'FE' && (
                    <Box
                      p={4}
                      bg="gray.50"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="gray.200"
                      mb={4}>
                      <Text fontWeight="semibold" color="gray.700" mb={4}>
                        <Icon as={FaCalculator} mr={2} color="gray.500" />
                        {intl.formatMessage({
                          id: 'events.chemical.aggregate.periodHeading',
                          defaultMessage: 'Aggregate Application Period'
                        })}
                      </Text>

                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.chemical.form.periodStart',
                            defaultMessage: 'Period Start Date'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.chemical.form.periodStartHelp',
                            defaultMessage: 'When did this application period begin?'
                          })}
                          required>
                          <Controller
                            name="date_start"
                            control={methods.control}
                            render={({ field }) => <StandardInput {...field} type="date" />}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.chemical.form.periodEnd',
                            defaultMessage: 'Period End Date'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.chemical.form.periodEndHelp',
                            defaultMessage: 'When did this application period end?'
                          })}
                          required>
                          <Controller
                            name="date_end"
                            control={methods.control}
                            render={({ field }) => <StandardInput {...field} type="date" />}
                          />
                        </StandardField>
                      </SimpleGrid>

                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.chemical.form.applicationCount',
                          defaultMessage: 'Number of Applications'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.chemical.form.applicationCountHelpFertilizer',
                          defaultMessage:
                            'How many fertilizer applications occurred during this period?'
                        })}
                        required>
                        <Controller
                          name="event_count"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput {...field} type="number" min="1" placeholder="e.g., 6" />
                          )}
                        />
                      </StandardField>

                      <Text fontWeight="semibold" color="blue.700" mt={6} mb={4}>
                        <Icon as={FaSeedling} mr={2} />
                        {intl.formatMessage({
                          id: 'events.chemical.aggregate.npkHeading',
                          defaultMessage: 'Total NPK Applied'
                        })}
                      </Text>

                      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={4}>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.chemical.form.totalNitrogen',
                            defaultMessage: 'Total Nitrogen (kg)'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.chemical.form.totalNitrogenHelp',
                            defaultMessage: 'Combined N across all applications'
                          })}
                          required>
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
                              />
                            )}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.chemical.form.totalPhosphorus',
                            defaultMessage: 'Total Phosphorus (kg)'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.chemical.form.totalPhosphorusHelp',
                            defaultMessage: 'Combined P across all applications'
                          })}>
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
                              />
                            )}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.chemical.form.totalPotassium',
                            defaultMessage: 'Total Potassium (kg)'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.chemical.form.totalPotassiumHelp',
                            defaultMessage: 'Combined K across all applications'
                          })}>
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
                              />
                            )}
                          />
                        </StandardField>
                      </SimpleGrid>

                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.chemical.form.totalProductAmount',
                            defaultMessage: 'Total Product Amount Applied'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.chemical.form.totalProductAmountHelp',
                            defaultMessage:
                              'The product itself, added up across all applications. Not the spray volume.'
                          })}>
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
                                />
                              )}
                            />
                            <Controller
                              name="volume_unit"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardSelect {...field} flex={1}>
                                  <option value="L">
                                    {intl.formatMessage({ id: 'app.unit.liters' })}
                                  </option>
                                  <option value="gal">
                                    {intl.formatMessage({ id: 'app.unit.gallons' })}
                                  </option>
                                  <option value="kg">
                                    {intl.formatMessage({ id: 'app.unit.kilograms' })}
                                  </option>
                                </StandardSelect>
                              )}
                            />
                          </HStack>
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.chemical.form.totalAreaTreated',
                            defaultMessage: 'Total Area Treated'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.chemical.form.totalAreaTreatedHelp',
                            defaultMessage: 'Combined area across all applications'
                          })}>
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
                                />
                              )}
                            />
                            <Controller
                              name="area_unit"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardSelect {...field} flex={1}>
                                  <option value="ha">
                                    {intl.formatMessage({ id: 'app.unit.hectares' })}
                                  </option>
                                  <option value="acres">
                                    {intl.formatMessage({ id: 'app.unit.acres' })}
                                  </option>
                                </StandardSelect>
                              )}
                            />
                          </HStack>
                        </StandardField>
                      </SimpleGrid>

                      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mt={4}>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.chemical.form.equipmentFuelTypeOptional',
                            defaultMessage: 'Equipment Fuel Type (optional)'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.chemical.form.equipmentFuelTypeHelp',
                            defaultMessage: 'Fuel type used for application equipment'
                          })}>
                          <Controller
                            name="application_fuel_type"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect
                                {...field}
                                placeholder={intl.formatMessage({
                                  id: 'events.chemical.form.fuelTypePlaceholder',
                                  defaultMessage: 'Select fuel type...'
                                })}>
                                {FUEL_TYPES.map((type) => (
                                  <option key={type.value} value={type.value}>
                                    {intl.formatMessage({ id: type.labelKey })}
                                  </option>
                                ))}
                              </StandardSelect>
                            )}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.chemical.form.totalEquipmentFuel',
                            defaultMessage: 'Total Equipment Fuel'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.chemical.form.totalEquipmentFuelHelp',
                            defaultMessage: 'Combined fuel across all applications'
                          })}>
                          <Controller
                            name="fuel_consumption_total"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput
                                {...field}
                                type="number"
                                step="0.1"
                                placeholder="e.g., 24"
                              />
                            )}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.chemical.form.fuelUnit',
                            defaultMessage: 'Fuel Unit'
                          })}>
                          <Controller
                            name="application_fuel_unit"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect {...field}>
                                <option value="gal">
                                  {intl.formatMessage({ id: 'app.unit.gallons' })}
                                </option>
                                <option value="L">
                                  {intl.formatMessage({ id: 'app.unit.liters' })}
                                </option>
                                <option value="kWh">
                                  {intl.formatMessage({ id: 'app.unit.kilowattHours' })}
                                </option>
                              </StandardSelect>
                            )}
                          />
                        </StandardField>
                      </SimpleGrid>
                      {/* No carbon-method box here (OV-FJ-C13). This form is the grower's
                          record; the estimate still runs in the background, and its formula and
                          factors do not belong between the inputs. */}
                    </Box>
                  )}

                  {/* Sprint 5: Aggregate Fungicide Fields (shown when summary mode is active for FU) */}
                  {isSummaryMode && chemicalType === 'FU' && (
                    <Box
                      p={4}
                      bg="white"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="green.200"
                      mb={4}>
                      <Text fontWeight="semibold" color="green.700" mb={4}>
                        <Icon as={FaCalculator} mr={2} />
                        {intl.formatMessage({
                          id: 'events.chemical.aggregate.periodHeading',
                          defaultMessage: 'Aggregate Application Period'
                        })}
                      </Text>

                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.chemical.form.periodStart',
                            defaultMessage: 'Period Start Date'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.chemical.form.periodStartHelp',
                            defaultMessage: 'When did this application period begin?'
                          })}
                          required>
                          <Controller
                            name="date_start"
                            control={methods.control}
                            render={({ field }) => <StandardInput {...field} type="date" />}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.chemical.form.periodEnd',
                            defaultMessage: 'Period End Date'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.chemical.form.periodEndHelp',
                            defaultMessage: 'When did this application period end?'
                          })}
                          required>
                          <Controller
                            name="date_end"
                            control={methods.control}
                            render={({ field }) => <StandardInput {...field} type="date" />}
                          />
                        </StandardField>
                      </SimpleGrid>

                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.chemical.form.applicationCount',
                          defaultMessage: 'Number of Applications'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.chemical.form.applicationCountHelpFungicide',
                          defaultMessage:
                            'How many fungicide applications occurred during this period?'
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
                              placeholder="e.g., 12"
                            />
                          )}
                        />
                      </StandardField>

                      <Text fontWeight="semibold" color="green.700" mt={6} mb={4}>
                        <Icon as={FaFlask} mr={2} />
                        {intl.formatMessage({
                          id: 'events.chemical.aggregate.activeIngredientHeading',
                          defaultMessage: 'Active Ingredient Total'
                        })}
                      </Text>

                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.chemical.form.totalActiveIngredient',
                          defaultMessage: 'Total Active Ingredient (kg)'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.chemical.form.totalActiveIngredientHelp',
                          defaultMessage: 'Combined active ingredient across all applications'
                        })}
                        required>
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
                            />
                          )}
                        />
                      </StandardField>

                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mt={4}>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.chemical.form.totalProductAmount',
                            defaultMessage: 'Total Product Amount Applied'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.chemical.form.totalProductAmountHelp',
                            defaultMessage:
                              'The product itself, added up across all applications. Not the spray volume.'
                          })}>
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
                                />
                              )}
                            />
                            <Controller
                              name="volume_unit"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardSelect {...field} flex={1}>
                                  <option value="L">
                                    {intl.formatMessage({ id: 'app.unit.liters' })}
                                  </option>
                                  <option value="gal">
                                    {intl.formatMessage({ id: 'app.unit.gallons' })}
                                  </option>
                                </StandardSelect>
                              )}
                            />
                          </HStack>
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.chemical.form.totalAreaTreated',
                            defaultMessage: 'Total Area Treated'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.chemical.form.totalAreaTreatedHelp',
                            defaultMessage: 'Combined area across all applications'
                          })}>
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
                                />
                              )}
                            />
                            <Controller
                              name="area_unit"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardSelect {...field} flex={1}>
                                  <option value="ha">
                                    {intl.formatMessage({ id: 'app.unit.hectares' })}
                                  </option>
                                  <option value="acres">
                                    {intl.formatMessage({ id: 'app.unit.acres' })}
                                  </option>
                                </StandardSelect>
                              )}
                            />
                          </HStack>
                        </StandardField>
                      </SimpleGrid>

                      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mt={4}>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.chemical.form.equipmentFuelTypeOptional',
                            defaultMessage: 'Equipment Fuel Type (optional)'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.chemical.form.equipmentFuelTypeHelpSpray',
                            defaultMessage: 'Fuel type used for spraying equipment'
                          })}>
                          <Controller
                            name="application_fuel_type"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect
                                {...field}
                                placeholder={intl.formatMessage({
                                  id: 'events.chemical.form.fuelTypePlaceholder',
                                  defaultMessage: 'Select fuel type...'
                                })}>
                                {FUEL_TYPES.map((type) => (
                                  <option key={type.value} value={type.value}>
                                    {intl.formatMessage({ id: type.labelKey })}
                                  </option>
                                ))}
                              </StandardSelect>
                            )}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.chemical.form.totalEquipmentFuel',
                            defaultMessage: 'Total Equipment Fuel'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.chemical.form.totalEquipmentFuelHelp',
                            defaultMessage: 'Combined fuel across all applications'
                          })}>
                          <Controller
                            name="fuel_consumption_total"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput
                                {...field}
                                type="number"
                                step="0.1"
                                placeholder="e.g., 24"
                              />
                            )}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.chemical.form.fuelUnit',
                            defaultMessage: 'Fuel Unit'
                          })}>
                          <Controller
                            name="application_fuel_unit"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect {...field}>
                                <option value="gal">
                                  {intl.formatMessage({ id: 'app.unit.gallons' })}
                                </option>
                                <option value="L">
                                  {intl.formatMessage({ id: 'app.unit.liters' })}
                                </option>
                                <option value="kWh">
                                  {intl.formatMessage({ id: 'app.unit.kilowattHours' })}
                                </option>
                              </StandardSelect>
                            )}
                          />
                        </StandardField>
                      </SimpleGrid>
                      {/* No carbon-method box (OV-FJ-C13): see the fertilizer summary above. */}
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
                      mb={4}>
                      <Text fontWeight="semibold" color="orange.700" mb={4}>
                        <Icon as={FaCalculator} mr={2} />
                        {intl.formatMessage({
                          id: 'events.chemical.aggregate.periodHeading',
                          defaultMessage: 'Aggregate Application Period'
                        })}
                      </Text>

                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.chemical.form.periodStart',
                            defaultMessage: 'Period Start Date'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.chemical.form.periodStartHelp',
                            defaultMessage: 'When did this application period begin?'
                          })}
                          required>
                          <Controller
                            name="date_start"
                            control={methods.control}
                            render={({ field }) => <StandardInput {...field} type="date" />}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.chemical.form.periodEnd',
                            defaultMessage: 'Period End Date'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.chemical.form.periodEndHelp',
                            defaultMessage: 'When did this application period end?'
                          })}
                          required>
                          <Controller
                            name="date_end"
                            control={methods.control}
                            render={({ field }) => <StandardInput {...field} type="date" />}
                          />
                        </StandardField>
                      </SimpleGrid>

                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.chemical.form.applicationCount',
                          defaultMessage: 'Number of Applications'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.chemical.form.applicationCountHelpPesticide',
                          defaultMessage: 'Total pesticide applications in this period'
                        })}
                        required>
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
                        {intl.formatMessage({
                          id: 'events.chemical.aggregate.pesticideTotalsHeading',
                          defaultMessage: 'Pesticide Totals'
                        })}
                      </Text>

                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.chemical.form.totalActiveIngredient',
                          defaultMessage: 'Total Active Ingredient (kg)'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.chemical.form.totalActiveIngredientHelp',
                          defaultMessage: 'Combined active ingredient across all applications'
                        })}
                        required>
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
                          label={intl.formatMessage({
                            id: 'events.chemical.form.totalProductAmount',
                            defaultMessage: 'Total Product Amount Applied'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.chemical.form.totalProductAmountHelp',
                            defaultMessage:
                              'The product itself, added up across all applications. Not the spray volume.'
                          })}>
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
                          label={intl.formatMessage({
                            id: 'events.chemical.form.totalAreaTreated',
                            defaultMessage: 'Total Area Treated'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.chemical.form.totalAreaTreatedHelp',
                            defaultMessage: 'Combined area across all applications'
                          })}>
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
                        {intl.formatMessage({
                          id: 'events.chemical.aggregate.equipmentFuelHeading',
                          defaultMessage: 'Equipment Fuel Usage'
                        })}
                      </Text>

                      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.chemical.form.equipmentFuelType',
                            defaultMessage: 'Equipment Fuel Type'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.chemical.form.equipmentFuelTypeHelp',
                            defaultMessage: 'Fuel type used for application equipment'
                          })}>
                          <Controller
                            name="application_fuel_type"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect
                                {...field}
                                placeholder={intl.formatMessage({
                                  id: 'events.chemical.form.fuelTypePlaceholder',
                                  defaultMessage: 'Select fuel type...'
                                })}>
                                {FUEL_TYPES.map((type) => (
                                  <option key={type.value} value={type.value}>
                                    {intl.formatMessage({ id: type.labelKey })}
                                  </option>
                                ))}
                              </StandardSelect>
                            )}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.chemical.form.totalFuelConsumed',
                            defaultMessage: 'Total Fuel Consumed'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.chemical.form.totalFuelConsumedHelp',
                            defaultMessage: 'Combined fuel for all application equipment'
                          })}>
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

                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.chemical.form.fuelUnit',
                            defaultMessage: 'Fuel Unit'
                          })}>
                          <Controller
                            name="application_fuel_unit"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect {...field}>
                                <option value="gal">
                                  {intl.formatMessage({ id: 'app.unit.gallons' })}
                                </option>
                                <option value="L">
                                  {intl.formatMessage({ id: 'app.unit.liters' })}
                                </option>
                                <option value="kWh">
                                  {intl.formatMessage({ id: 'app.unit.kilowattHours' })}
                                </option>
                              </StandardSelect>
                            )}
                          />
                        </StandardField>
                      </SimpleGrid>
                      {/* No carbon-method box (OV-FJ-C13): see the fertilizer summary above. */}
                    </Box>
                  )}

                  <StandardField
                    label={intl.formatMessage({
                      id: 'events.chemical.form.commercialName',
                      defaultMessage: 'Commercial Name / Product'
                    })}
                    required
                    error={errors.commercial_name?.message}
                    helpText={intl.formatMessage({
                      id: 'events.chemical.form.commercialNameHelp',
                      defaultMessage:
                        'The product name exactly as it appears on the label — this is what your certifier looks up.'
                    })}>
                    <Controller
                      name="commercial_name"
                      control={methods.control}
                      render={({ field }) => (
                        <>
                          <StandardInput
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              // The attached listing is for the name that was looked up. Editing
                              // the name detaches it; the grower looks the new name up again.
                              if (methods.getValues('omri_product') != null) {
                                methods.setValue('omri_product', null, { shouldDirty: true });
                              }
                              if (methods.getValues('wsda_material') != null) {
                                methods.setValue('wsda_material', null, { shouldDirty: true });
                              }
                            }}
                            placeholder={intl.formatMessage({
                              id: 'events.chemical.form.commercialNamePlaceholder',
                              defaultMessage: "e.g., Kocide 3000, Neptune's Harvest Fish & Seaweed"
                            })}
                          />
                          <InputVerifyHelper
                            name={field.value || ''}
                            attachedOmriPk={methods.watch('omri_product')}
                            attachedWsdaPk={methods.watch('wsda_material')}
                            onAttachOmri={(pk) => attachListing('omri_product', 'omri_listed', pk)}
                            onAttachWsda={(pk) => attachListing('wsda_material', 'wsda_listed', pk)}
                          />
                        </>
                      )}
                    />
                  </StandardField>

                  <StandardField
                    label={intl.formatMessage({
                      id: 'events.chemical.form.activeIngredient',
                      defaultMessage: 'Active Ingredient (Optional)'
                    })}
                    error={errors.active_ingredient?.message}
                    helpText={intl.formatMessage({
                      id: 'events.chemical.form.activeIngredientHelp',
                      defaultMessage:
                        'The active ingredient is what Trazo matches against 7 CFR 205.601/602 — a brand name alone rarely appears on the National List.'
                    })}>
                    <Controller
                      name="active_ingredient"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardInput
                          {...field}
                          placeholder={intl.formatMessage({
                            id: 'events.chemical.form.activeIngredientPlaceholder',
                            defaultMessage: 'e.g., Copper hydroxide, NPK 2-3-1'
                          })}
                        />
                      )}
                    />
                  </StandardField>
                </VStack>
              </SectionBox>

              {/* Section 2: Application Details & Carbon Calculation Data */}
              <SectionBox>
                <SectionHeader
                  icon={FaCalculator}
                  title={intl.formatMessage({ id: 'events.section.chemical.rate' })}
                  badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                  description={intl.formatMessage({
                    id: 'events.section.desc.chemicalRate',
                    defaultMessage:
                      'Rate and area are what a certifier checks a label maximum against, and what § 205.103(b)(2) means by records detailed enough to be audited.'
                  })}
                />{' '}
                <VStack spacing={4} align="stretch">
                  {/* Sprint 5: Hide individual quantity fields when in Summary Mode - aggregate fields replace them */}
                  {!isSummaryMode && (
                    <>
                      {/* Phase 3: volume_numeric is the primary numeric field; volume_applied kept for backward compat */}
                      <Stack direction={{ base: 'column', md: 'row' }} spacing={4} align="stretch">
                        {/* Several blocks: the amount is asked per block (MultiParcel). The unit stays here. */}
                        {!multiTarget && (
                          <StandardField
                            label={intl.formatMessage({
                              id: 'app.volumeApplied',
                              defaultMessage: 'Product Amount Applied'
                            })}
                            required
                            error={errors.volume_numeric?.message}
                            helpText={intl.formatMessage({
                              id: 'app.volumeAppliedHelp',
                              defaultMessage:
                                'How much of the PRODUCT itself went out, added up over the area treated. Not the tank or spray volume it was mixed into.'
                            })}
                            flex={2}>
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
                                />
                              )}
                            />
                          </StandardField>
                        )}

                        <StandardField
                          label={intl.formatMessage({
                            id: 'app.volumeUnit',
                            defaultMessage: 'Unit'
                          })}
                          required
                          error={errors.volume_unit?.message}
                          flex={1}>
                          <Controller
                            name="volume_unit"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect {...field}>
                                <option value="L">
                                  {intl.formatMessage({
                                    id: 'app.unit.liters',
                                    defaultMessage: 'Liters (L)'
                                  })}
                                </option>
                                <option value="gal">
                                  {intl.formatMessage({
                                    id: 'app.unit.gallons',
                                    defaultMessage: 'Gallons (gal)'
                                  })}
                                </option>
                                <option value="mL">
                                  {intl.formatMessage({
                                    id: 'app.unit.milliliters',
                                    defaultMessage: 'Milliliters (mL)'
                                  })}
                                </option>
                                {/* Fluid and weight ounces are separate units (pilot rehearsal
                                    2026-10-17). The old "oz", which this option stored while
                                    labelled "Fluid Ounces", is shown only on a record that
                                    already holds it: it does not say which ounce it means. */}
                                <option value="fl_oz">
                                  {intl.formatMessage({ id: 'app.unit.fluidOunces' })}
                                </option>
                                <option value="oz_wt">
                                  {intl.formatMessage({ id: 'app.unit.ouncesWeight' })}
                                </option>
                                {field.value === 'oz' && (
                                  <option value="oz">
                                    {intl.formatMessage({ id: 'app.unit.ouncesUnstated' })}
                                  </option>
                                )}
                                <option value="kg">
                                  {intl.formatMessage({
                                    id: 'app.unit.kilograms',
                                    defaultMessage: 'Kilograms (kg)'
                                  })}
                                </option>
                                <option value="lbs">
                                  {intl.formatMessage({
                                    id: 'app.unit.pounds',
                                    defaultMessage: 'Pounds (lbs)'
                                  })}
                                </option>
                                {/* A count, not a measure: mating-disruption dispensers are
                                    hung by hand. Never converted to kg or L downstream.
                                    Pesticides only, like the method; a record already holding
                                    it keeps the option so the value never goes blank. */}
                                {(chemicalType === 'PE' || field.value === 'dispensers') && (
                                  <option value="dispensers">
                                    {intl.formatMessage({ id: 'app.unit.dispensers' })}
                                  </option>
                                )}
                              </StandardSelect>
                            )}
                          />
                        </StandardField>
                      </Stack>

                      {/* Phase 3: area_numeric is the primary numeric field; area_treated kept for backward compat */}
                      <Stack direction={{ base: 'column', md: 'row' }} spacing={4} align="stretch">
                        {/* Several blocks: the area is asked per block (MultiParcel). The unit stays here. */}
                        {!multiTarget && (
                          <StandardField
                            label={intl.formatMessage({
                              id: 'app.areaTreated',
                              defaultMessage: 'Area Treated'
                            })}
                            required
                            error={errors.area_numeric?.message}
                            helpText={intl.formatMessage({
                              id: 'app.areaTreatedHelp',
                              defaultMessage: 'Total area treated with product'
                            })}
                            flex={2}>
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
                                />
                              )}
                            />
                          </StandardField>
                        )}

                        <StandardField
                          label={intl.formatMessage({
                            id: 'app.areaUnit',
                            defaultMessage: 'Unit'
                          })}
                          required
                          error={errors.area_unit?.message}
                          flex={1}>
                          <Controller
                            name="area_unit"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect {...field}>
                                <option value="ha">
                                  {intl.formatMessage({
                                    id: 'app.unit.hectares',
                                    defaultMessage: 'Hectares (ha)'
                                  })}
                                </option>
                                <option value="acres">
                                  {intl.formatMessage({
                                    id: 'app.unit.acres',
                                    defaultMessage: 'Acres'
                                  })}
                                </option>
                                <option value="m2">
                                  {intl.formatMessage({
                                    id: 'app.unit.squareMeters',
                                    defaultMessage: 'Square meters (m²)'
                                  })}
                                </option>
                              </StandardSelect>
                            )}
                          />
                        </StandardField>
                      </Stack>

                      {/*
                        The LABEL RATE. This section has called itself "rate" since it was
                        written, and its own description says rate and area are what a certifier
                        checks a label maximum against — but until 2026-09-03 the only numbers in
                        it were a total and an area, and the rate had to be inferred by dividing.
                        Optional on purpose: the total and the area are what carbon and the
                        § 205.103(b)(2) mass balance need, and are required above. This is the
                        number the grower actually says out loud, because it is the number
                        printed on the jug.
                      */}
                      <Stack direction={{ base: 'column', md: 'row' }} spacing={4} align="stretch">
                        <StandardField
                          label={intl.formatMessage({
                            id: 'app.applicationRate',
                            defaultMessage: 'Application Rate'
                          })}
                          error={errors.application_rate?.message}
                          helpText={intl.formatMessage({
                            id: 'app.applicationRateHelp',
                            defaultMessage:
                              'Amount applied per acre or hectare — the label rate, not the total.'
                          })}
                          flex={2}>
                          <Controller
                            name="application_rate"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardInput
                                {...field}
                                type="number"
                                step="0.001"
                                min="0"
                                placeholder="0.0"
                              />
                            )}
                          />
                        </StandardField>

                        <StandardField
                          label={intl.formatMessage({
                            id: 'app.applicationRateUnit',
                            defaultMessage: 'Unit'
                          })}
                          error={errors.application_rate_unit?.message}
                          flex={1}>
                          <Controller
                            name="application_rate_unit"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect
                                {...field}
                                placeholder={intl.formatMessage({
                                  id: 'app.applicationRateUnitPlaceholder',
                                  defaultMessage: 'Select unit...'
                                })}>
                                {APPLICATION_RATE_UNITS.map((unit) => (
                                  <option key={unit.value} value={unit.value}>
                                    {intl.formatMessage({ id: unit.labelKey })}
                                  </option>
                                ))}
                              </StandardSelect>
                            )}
                          />
                        </StandardField>
                      </Stack>

                      {/* Phase 3: Fertigation toggle — shown only for Fertilizer (FE) subtype */}
                      {chemicalType === 'FE' && (
                        <Box
                          p={3}
                          bg="teal.50"
                          borderRadius="md"
                          border="1px solid"
                          borderColor="teal.200">
                          <HStack justify="space-between" align="center">
                            <VStack align="start" spacing={0} flex={1}>
                              <Text fontSize="sm" fontWeight="semibold" color="teal.800">
                                {intl.formatMessage({
                                  id: 'app.fertigation',
                                  defaultMessage: 'Fertigation'
                                })}
                              </Text>
                              <Text fontSize="xs" color="teal.600">
                                {intl.formatMessage({
                                  id: 'app.fertigationHelp',
                                  defaultMessage: 'Fertilizer injected through irrigation system'
                                })}
                              </Text>
                              {/* The carbon effect of this switch (fuel left out of the estimate)
                                  is said once, in the carbon preview of the fuel section
                                  (`app.fertigationCarbonNote`), not on the control (OV-FJ-C13). */}
                            </VStack>
                            <Controller
                              name="is_fertigation"
                              control={methods.control}
                              render={({ field }) => (
                                <Switch
                                  isChecked={field.value === 'true'}
                                  onChange={(e) =>
                                    field.onChange(e.target.checked ? 'true' : 'false')
                                  }
                                  colorScheme="teal"
                                  size="lg"
                                />
                              )}
                            />
                          </HStack>
                        </Box>
                      )}

                      {/* §E-3 Micronutrients (FE only). 7 CFR 205.601(j)(7) permits synthetic
                            micronutrients ONLY where a soil or plant-tissue deficiency is
                            documented — so the field carries the pointer to that record rather
                            than leaving an inspector to guess why zinc was applied. UC Davis 2024
                            organic-almond study: zinc sulfate 10 lb/ac and 20% boron at 2 lb/ac
                            foliar post-harvest, plus fertigated boron. */}
                      {chemicalType === 'FE' && (
                        <Stack
                          direction={{ base: 'column', md: 'row' }}
                          spacing={4}
                          align="stretch">
                          <StandardField
                            label={intl.formatMessage({
                              id: 'events.chemical.fields.micronutrientType',
                              defaultMessage: 'Micronutrient'
                            })}
                            helpText={intl.formatMessage({
                              id: 'events.chemical.fields.micronutrientTypeHelp',
                              defaultMessage:
                                'Permitted under 7 CFR 205.601(j)(7) only when a soil or tissue test documents the deficiency, or another verifiable method your certifier approves. Log that analysis as a Soil & amendments activity.'
                            })}
                            flex={2}>
                            <Controller
                              name="micronutrient_type"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardSelect
                                  {...field}
                                  placeholder={intl.formatMessage({
                                    id: 'app.notApplicable',
                                    defaultMessage: 'Not applicable'
                                  })}>
                                  <option value="zinc">
                                    {intl.formatMessage({
                                      id: 'events.chemical.micronutrients.zinc'
                                    })}
                                  </option>
                                  <option value="boron">
                                    {intl.formatMessage({
                                      id: 'events.chemical.micronutrients.boron'
                                    })}
                                  </option>
                                  <option value="manganese">
                                    {intl.formatMessage({
                                      id: 'events.chemical.micronutrients.manganese'
                                    })}
                                  </option>
                                  <option value="iron">
                                    {intl.formatMessage({
                                      id: 'events.chemical.micronutrients.iron'
                                    })}
                                  </option>
                                  <option value="copper">
                                    {intl.formatMessage({
                                      id: 'events.chemical.micronutrients.copper'
                                    })}
                                  </option>
                                  <option value="calcium">
                                    {intl.formatMessage({
                                      id: 'events.chemical.micronutrients.calcium'
                                    })}
                                  </option>
                                  <option value="magnesium">
                                    {intl.formatMessage({
                                      id: 'events.chemical.micronutrients.magnesium'
                                    })}
                                  </option>
                                  <option value="sulfur">
                                    {intl.formatMessage({
                                      id: 'events.chemical.micronutrients.sulfur'
                                    })}
                                  </option>
                                  <option value="other">
                                    {intl.formatMessage({
                                      id: 'app.other',
                                      defaultMessage: 'Other'
                                    })}
                                  </option>
                                </StandardSelect>
                              )}
                            />
                          </StandardField>
                          <StandardField
                            label={intl.formatMessage({
                              id: 'events.chemical.fields.micronutrientRate',
                              defaultMessage: 'Micronutrient Rate'
                            })}
                            flex={1}>
                            <StandardInput
                              type="number"
                              step="0.001"
                              min="0"
                              placeholder="e.g., 10"
                              {...methods.register('micronutrient_rate')}
                            />
                          </StandardField>
                          <StandardField
                            label={intl.formatMessage({
                              id: 'events.chemical.fields.micronutrientRateUnit',
                              defaultMessage: 'Rate Unit'
                            })}
                            flex={1}>
                            <Controller
                              name="micronutrient_rate_unit"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardSelect {...field}>
                                  <option value="lb/ac">lb/ac</option>
                                  <option value="kg/ha">kg/ha</option>
                                  <option value="gal/ac">gal/ac</option>
                                  <option value="L/ha">L/ha</option>
                                  <option value="oz/ac">oz/ac</option>
                                  <option value="ppm">ppm</option>
                                </StandardSelect>
                              )}
                            />
                          </StandardField>
                        </Stack>
                      )}

                      {/* D2 — the structured NPK trio (FE only). chemicalEvent.ts has always
                            declared nitrogen/phosphorus/potassium_percentage with a `form`
                            surface and a formatNPK group formatter, but the form collected only
                            the free-text `concentration` — so formatNPK had nothing to render and
                            no fertilizer event carried structured NPK the carbon calculator or a
                            certifier could read. The free-text field stays (below) for the label
                            printed on the bag; these are the numbers. */}
                      {chemicalType === 'FE' && (
                        <Box>
                          <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={1}>
                            {intl.formatMessage({
                              id: 'events.chemical.sections.npkAnalysis',
                              defaultMessage: 'Guaranteed Analysis (N-P-K)'
                            })}
                          </Text>
                          <Text fontSize="xs" color="gray.500" mb={3}>
                            {intl.formatMessage({
                              id: 'events.chemical.sections.npkAnalysisHelp',
                              defaultMessage:
                                'The three percentages printed on the product label. Leave blank for a product with no NPK analysis.'
                            })}
                          </Text>
                          <HStack spacing={4} align="flex-start">
                            {[
                              { name: 'nitrogen_percentage', label: 'N (%)', ph: 'e.g., 5' },
                              { name: 'phosphorus_percentage', label: 'P (%)', ph: 'e.g., 1' },
                              { name: 'potassium_percentage', label: 'K (%)', ph: 'e.g., 1' }
                            ].map((f) => (
                              <StandardField key={f.name} label={f.label} flex={1}>
                                <StandardInput
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="100"
                                  placeholder={f.ph}
                                  {...methods.register(f.name)}
                                />
                              </StandardField>
                            ))}
                          </HStack>
                        </Box>
                      )}

                      {/* Plain-string label, like every other field on this form.
                          It used to be an <HStack> holding a <Badge> that showed the expected
                          FORMAT ("NPK" / "%") once a chemical type was chosen — and fell back to
                          the literal word "Required" before then. That put a red "Required" pill
                          beside a field that already carries StandardField's asterisk, saying the
                          same thing twice in two visual languages; and because the label was a JSX
                          element rather than a string, the asterisk wrapped onto a line of its own.
                          The format hint belongs in helpText, which is where every other field on
                          this form puts it. */}
                      <StandardField
                        label={
                          chemicalType === 'FE'
                            ? intl.formatMessage({ id: 'quickAdd.fields.concentration.npkRatio' })
                            : chemicalType === 'PE'
                            ? intl.formatMessage({
                                id: 'quickAdd.fields.concentration.pesticideConcentration'
                              })
                            : chemicalType === 'HE'
                            ? intl.formatMessage({
                                id: 'quickAdd.fields.concentration.herbicideConcentration'
                              })
                            : chemicalType === 'FU'
                            ? intl.formatMessage({
                                id: 'quickAdd.fields.concentration.fungicideConcentration'
                              })
                            : // ⛔ NOT "Concentration / Application Rate". `validateConcentration`
                              // accepts an NPK analysis or a percentage and rejects everything
                              // else, so a grower reading "application rate" types the number off
                              // the label — "4 qt/acre", exactly how Serenade's label reads — and
                              // is hard-blocked. The RATE has its own home: Product Amount
                              // Applied over Area Treated, which is what the packet divides to print
                              // "4.00 gal/acre" and what a reviewer checks a label maximum
                              // against. This field is the product's strength, nothing else.
                              intl.formatMessage({
                                id: 'events.chemical.concentration.productConcentration'
                              })
                        }
                        required={
                          !concentrationNotOnRecord &&
                          !isDispenserRecord(chemicalType, watch('application_method'))
                        }
                        error={errors.concentration?.message}
                        helpText={intl.formatMessage({
                          id: !chemicalType
                            ? 'events.chemical.concentration.help.pickType'
                            : concentrationNotOnRecord
                            ? 'events.chemical.concentration.notOnMyRecordHelp'
                            : isDispenserRecord(chemicalType, watch('application_method'))
                            ? 'events.chemical.concentration.help.dispenser'
                            : chemicalType === 'FE'
                            ? watch('micronutrient_type')
                              ? // §E-3: a single-nutrient product has no NPK analysis.
                                'events.chemical.concentration.help.npkOrPercent'
                              : 'events.chemical.concentration.help.npk'
                            : 'events.chemical.concentration.help.percent'
                        })}>
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
                                    : intl.formatMessage({
                                        id: 'events.chemical.concentration.placeholder.pickType'
                                      })
                                }
                                isDisabled={!chemicalType || concentrationNotOnRecord}
                                borderColor={
                                  concentrationValidation?.isValid
                                    ? 'green.300'
                                    : concentrationValidation && !concentrationValidation.isValid
                                    ? 'red.300'
                                    : undefined
                                }
                              />

                              {/* "Not on my record" (OV-FJ-C12). A paper spray log often has no
                                  concentration, and the only other way through was to look up a
                                  label or invent one. Ticking clears and disables the box; the
                                  packet prints "Not on the source record" in its place. Chakra's
                                  Checkbox is themed (frontend.md); there is no Standard wrapper. */}
                              {chemicalType && (
                                <Controller
                                  name="concentration_not_recorded"
                                  control={methods.control}
                                  render={({ field: flag }) => (
                                    <Checkbox
                                      // Its own id and state: inside the field's FormControl it
                                      // would otherwise take the input's id (the label's target)
                                      // and its asterisk, and turn red with the input's error.
                                      id="concentration-not-recorded"
                                      required={false}
                                      isInvalid={false}
                                      colorScheme="green"
                                      minH="44px"
                                      alignItems="center"
                                      isChecked={flag.value === 'true'}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          methods.setValue('concentration', '', {
                                            shouldDirty: true
                                          });
                                        }
                                        flag.onChange(e.target.checked ? 'true' : 'false');
                                        methods.trigger('concentration');
                                      }}
                                      data-testid="concentration-not-recorded">
                                      <Text fontSize="sm" color="gray.700">
                                        {intl.formatMessage({
                                          id: 'events.chemical.concentration.notOnMyRecord'
                                        })}
                                      </Text>
                                    </Checkbox>
                                  )}
                                />
                              )}

                              {/* Real-time Validation Feedback */}
                              {chemicalType && !concentrationNotOnRecord && (
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

                  {/* USDA Input Material Application Record, "Purpose / Reason for Use".
                        Footnote 5: "Some materials, for example, are allowed for pest management
                        but not as a soil amendment." § 205.601 lists synthetics BY USE, so the
                        purpose is part of the allowability record. Shown for every subtype —
                        `target_pest_disease` names the specific target for PE/FU/HE, which is a
                        different fact from the § 205.601 use category. */}
                  <StandardField
                    label={intl.formatMessage({
                      id: 'events.chemical.fields.applicationPurpose',
                      defaultMessage: 'Purpose / Reason for Use'
                    })}>
                    <Controller
                      name="application_purpose"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardSelect {...field}>
                          <option value="">
                            {intl.formatMessage({
                              id: 'events.chemical.fields.applicationPurposePlaceholder',
                              defaultMessage: 'Select purpose...'
                            })}
                          </option>
                          {APPLICATION_PURPOSES.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {intl.formatMessage({ id: opt.labelKey })}
                            </option>
                          ))}
                        </StandardSelect>
                      )}
                    />
                  </StandardField>

                  {/* NOP 5012 — liquid/soluble fertilizer nitrogen-source verification. */}
                  {chemicalType === 'FE' && (
                    <StandardField
                      label={intl.formatMessage({
                        id: 'events.chemical.fields.nitrogenSource',
                        defaultMessage: 'Nitrogen Source (NOP 5012)'
                      })}
                      helpText={intl.formatMessage({
                        id: 'events.chemical.form.nitrogenSourceHelp',
                        defaultMessage:
                          "Liquid/soluble fertilizers must be free of prohibited synthetic nitrogen. Synthetic N is prohibited (§ 205.105(a)); sodium nitrate is capped at 20% of the crop's N need."
                      })}>
                      <Controller
                        name="nitrogen_source"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardSelect {...field}>
                            <option value="">
                              {intl.formatMessage({
                                id: 'events.chemical.nitrogenSource.placeholder'
                              })}
                            </option>
                            <option value="organic">
                              {intl.formatMessage({ id: 'events.chemical.nitrogenSource.organic' })}
                            </option>
                            <option value="mined_natural">
                              {intl.formatMessage({
                                id: 'events.chemical.nitrogenSource.minedNatural'
                              })}
                            </option>
                            <option value="synthetic_prohibited">
                              {intl.formatMessage({
                                id: 'events.chemical.nitrogenSource.syntheticProhibited'
                              })}
                            </option>
                            <option value="unknown">
                              {intl.formatMessage({ id: 'events.chemical.nitrogenSource.unknown' })}
                            </option>
                          </StandardSelect>
                        )}
                      />
                    </StandardField>
                  )}

                  {/* Sprint 2 Epic 2.2: Consolidated Application Methods - USDA/EPA Standards
                  Fertilizer: 5 USDA NRCS methods (Conservation Practice Standard 590)
                  Pesticide/Fungicide/Herbicide: 4 EPA methods (Pesticide Product Label Requirements)
                  Total: 9 standardized methods (reduced from 32)
              */}
                  <StandardField
                    label={intl.formatMessage({
                      id: 'events.chemical.fields.applicationMethod',
                      defaultMessage: 'Application Method'
                    })}
                    required
                    error={errors.application_method?.message}
                    helpText={intl.formatMessage({
                      id: 'events.chemical.form.applicationMethodHelp',
                      defaultMessage:
                        'USDA/EPA standard method - use Application Details for specifics'
                    })}>
                    <Controller
                      name="application_method"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardSelect {...field}>
                          <option value="">
                            {intl.formatMessage({ id: 'events.chemical.methods.placeholder' })}
                          </option>

                          {/* USDA NRCS Standard Methods for Fertilizer (5 methods) */}
                          {chemicalType === 'FE' && (
                            <>
                              <option value="broadcast">
                                {intl.formatMessage({
                                  id: 'events.chemical.methods.broadcastIncorporated'
                                })}
                              </option>
                              <option value="banded">
                                {intl.formatMessage({ id: 'events.chemical.methods.banded' })}
                              </option>
                              <option value="subsurface">
                                {intl.formatMessage({ id: 'events.chemical.methods.subsurface' })}
                              </option>
                              <option value="fertigation">
                                {intl.formatMessage({ id: 'events.chemical.methods.fertigation' })}
                              </option>
                              <option value="foliar">
                                {intl.formatMessage({
                                  id: 'events.chemical.methods.foliarSurface'
                                })}
                              </option>
                            </>
                          )}

                          {/* EPA Standard Methods for Pesticide (4 methods) */}
                          {chemicalType === 'PE' && (
                            <>
                              <option value="ground_spray">
                                {intl.formatMessage({
                                  id: 'events.chemical.methods.groundSprayCropsSoil'
                                })}
                              </option>
                              <option value="chemigation">
                                {intl.formatMessage({
                                  id: 'events.chemical.methods.chemigationSystem'
                                })}
                              </option>
                              <option value="seed_treatment">
                                {intl.formatMessage({
                                  id: 'events.chemical.methods.seedTreatmentCoating'
                                })}
                              </option>
                              <option value="soil_incorporation">
                                {intl.formatMessage({
                                  id: 'events.chemical.methods.soilIncorporationMixed'
                                })}
                              </option>
                              {/* Pheromone dispensers for mating disruption, hung by hand.
                                  Without it the record printed into the packet as a spray. */}
                              <option value="hand_dispenser">
                                {intl.formatMessage({
                                  id: 'events.chemical.methods.handDispenser'
                                })}
                              </option>
                            </>
                          )}

                          {/* EPA Standard Methods for Herbicide (4 methods) */}
                          {chemicalType === 'HE' && (
                            <>
                              <option value="ground_spray">
                                {intl.formatMessage({
                                  id: 'events.chemical.methods.groundSprayEmergent'
                                })}
                              </option>
                              <option value="chemigation">
                                {intl.formatMessage({
                                  id: 'events.chemical.methods.chemigationSystem'
                                })}
                              </option>
                              <option value="seed_treatment">
                                {intl.formatMessage({
                                  id: 'events.chemical.methods.seedTreatmentPrePlant'
                                })}
                              </option>
                              <option value="soil_incorporation">
                                {intl.formatMessage({
                                  id: 'events.chemical.methods.soilIncorporationMixed'
                                })}
                              </option>
                            </>
                          )}

                          {/* EPA Standard Methods for Fungicide (4 methods) */}
                          {chemicalType === 'FU' && (
                            <>
                              <option value="ground_spray">
                                {intl.formatMessage({
                                  id: 'events.chemical.methods.groundSprayFoliarSoil'
                                })}
                              </option>
                              <option value="chemigation">
                                {intl.formatMessage({
                                  id: 'events.chemical.methods.chemigationSystem'
                                })}
                              </option>
                              <option value="seed_treatment">
                                {intl.formatMessage({
                                  id: 'events.chemical.methods.seedTreatmentPreventive'
                                })}
                              </option>
                              <option value="soil_incorporation">
                                {intl.formatMessage({
                                  id: 'events.chemical.methods.soilIncorporationDrench'
                                })}
                              </option>
                            </>
                          )}

                          {/* Generic USDA/EPA methods when no type selected */}
                          {!chemicalType && (
                            <>
                              <option value="broadcast">
                                {intl.formatMessage({
                                  id: 'events.chemical.methods.broadcastSurface'
                                })}
                              </option>
                              <option value="ground_spray">
                                {intl.formatMessage({ id: 'events.chemical.methods.groundSpray' })}
                              </option>
                              <option value="chemigation">
                                {intl.formatMessage({ id: 'events.chemical.methods.chemigation' })}
                              </option>
                              <option value="foliar">
                                {intl.formatMessage({ id: 'events.chemical.methods.foliar' })}
                              </option>
                              <option value="soil_incorporation">
                                {intl.formatMessage({
                                  id: 'events.chemical.methods.soilIncorporationMixed'
                                })}
                              </option>
                            </>
                          )}

                          {/* F20 (2026-06): orchard / CA DPR method categories shared by all
                                spray chemicals (PE/HE/FU). Air-blast is the orchard standard;
                                aerial/fumigation map to DPR-PML-017C box 21 "Air"/"Fume". */}
                          {['PE', 'HE', 'FU'].includes(chemicalType) && (
                            <>
                              <option value="air_blast">
                                {intl.formatMessage({ id: 'events.chemical.methods.airBlast' })}
                              </option>
                              <option value="aerial">
                                {intl.formatMessage({ id: 'events.chemical.methods.aerial' })}
                              </option>
                              <option value="fumigation">
                                {intl.formatMessage({ id: 'events.chemical.methods.fumigation' })}
                              </option>
                            </>
                          )}
                        </StandardSelect>
                      )}
                    />
                  </StandardField>

                  {/* Sprint 2 Epic 2.2: Application Details for USDA/EPA method specificity */}
                  <StandardField
                    label={intl.formatMessage({
                      id: 'events.chemical.fields.applicationDetails',
                      defaultMessage: 'Application Details'
                    })}
                    helpText={intl.formatMessage({
                      id: 'events.chemical.form.applicationDetailsHelp',
                      defaultMessage:
                        'Specific details about application method (e.g., equipment used, incorporated vs surface, pre vs post-emergent)'
                    })}>
                    <Controller
                      name="application_details"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardInput
                          {...field}
                          placeholder={intl.formatMessage({
                            id: 'events.chemical.form.applicationDetailsPlaceholder',
                            defaultMessage:
                              'e.g., Tractor-mounted boom sprayer, incorporated 4 inches deep'
                          })}
                        />
                      )}
                    />
                  </StandardField>
                </VStack>
              </SectionBox>

              {/* Section 3: Environmental Context & Transparency */}
              <SectionBox>
                <SectionHeader
                  icon={FaLeaf}
                  title={intl.formatMessage({ id: 'events.section.chemical.environment' })}
                  badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                />{' '}
                <VStack spacing={4} align="stretch">
                  <StandardField
                    label={intl.formatMessage({
                      id: 'events.chemical.fields.weatherConditions',
                      defaultMessage: 'Weather Conditions'
                    })}
                    error={errors.weather_conditions?.message}
                    helpText={intl.formatMessage({
                      id: 'events.chemical.form.weatherConditionsHelp',
                      defaultMessage: 'Weather conditions during application for transparency'
                    })}>
                    <Controller
                      name="weather_conditions"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardSelect {...field}>
                          <option value="">
                            {intl.formatMessage({ id: 'events.chemical.weather.placeholder' })}
                          </option>
                          <option value="calm_dry">
                            {intl.formatMessage({ id: 'events.chemical.weather.calmDry' })}
                          </option>
                          <option value="overcast_humid">
                            {intl.formatMessage({ id: 'events.chemical.weather.overcastHumid' })}
                          </option>
                          <option value="light_wind">
                            {intl.formatMessage({ id: 'events.chemical.weather.lightWind' })}
                          </option>
                          <option value="humid">
                            {intl.formatMessage({ id: 'events.chemical.weather.humid' })}
                          </option>
                          <option value="windy">
                            {intl.formatMessage({ id: 'events.chemical.weather.windy' })}
                          </option>
                        </StandardSelect>
                      )}
                    />
                  </StandardField>

                  <StandardField
                    label={intl.formatMessage({
                      id: 'events.chemical.fields.applicationTiming',
                      defaultMessage: 'Application Timing'
                    })}
                    error={errors.application_timing?.message}
                    helpText={intl.formatMessage({
                      id: 'events.chemical.form.applicationTimingHelp',
                      defaultMessage: 'When the application was made for consumer understanding'
                    })}>
                    <Controller
                      name="application_timing"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardSelect {...field}>
                          <option value="">
                            {intl.formatMessage({ id: 'events.chemical.timing.placeholder' })}
                          </option>
                          <option value="pre_plant">
                            {intl.formatMessage({ id: 'events.chemical.timing.prePlanting' })}
                          </option>
                          <option value="post_emergence">
                            {intl.formatMessage({ id: 'events.chemical.timing.postEmergence' })}
                          </option>
                          <option value="flowering">
                            {intl.formatMessage({ id: 'events.chemical.timing.flowering' })}
                          </option>
                          <option value="fruit_development">
                            {intl.formatMessage({ id: 'events.chemical.timing.fruitDevelopment' })}
                          </option>
                          <option value="harvest">
                            {intl.formatMessage({ id: 'events.chemical.timing.preHarvest' })}
                          </option>
                          <option value="post_harvest">
                            {intl.formatMessage({ id: 'events.chemical.timing.postHarvest' })}
                          </option>
                        </StandardSelect>
                      )}
                    />
                  </StandardField>

                  <StandardField
                    label={intl.formatMessage({
                      id: 'events.chemical.form.targetPest',
                      defaultMessage: 'Target Pest/Disease/Need'
                    })}
                    error={errors.target_pest_disease?.message}
                    helpText={intl.formatMessage({
                      id: 'events.chemical.form.targetPestHelp',
                      defaultMessage: 'What problem this application addresses for transparency'
                    })}>
                    <Controller
                      name="target_pest_disease"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardInput
                          {...field}
                          placeholder={intl.formatMessage({
                            id: 'events.chemical.form.targetPestPlaceholder',
                            defaultMessage:
                              'e.g., Aphid control, Nutrient deficiency, Weed suppression'
                          })}
                        />
                      )}
                    />
                  </StandardField>

                  {/* Sprint 3 Epic 3.2: Consumer Trust Fields */}
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <StandardField
                      label={intl.formatMessage({
                        id: 'events.chemical.form.bufferZone',
                        defaultMessage: 'Buffer Zone (meters)'
                      })}
                      error={errors.buffer_zone_meters?.message}
                      helpText={intl.formatMessage({
                        id: 'events.chemical.form.bufferZoneHelp',
                        defaultMessage: 'Required buffer distance from sensitive areas'
                      })}>
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

                    {/* WS-4 — § 205.103(b)(2): records must identify WHERE the input went.
                        (b)(1) is "be adapted to the particular business" and says nothing about
                        location; the user-facing help string already cites (b)(2). */}
                    {/* Several blocks: whole block or part is asked per block (MultiParcel). */}
                    {!multiTarget && (
                      <>
                        <StandardField
                          label={intl.formatMessage({ id: 'events.chemical.fields.appliedScope' })}
                          error={errors.applied_scope?.message}
                          helpText={intl.formatMessage({ id: 'chemical.appliedScopeHelp' })}>
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

                        {methods.watch('applied_scope') === 'part' && (
                          <StandardField
                            label={intl.formatMessage({
                              id: 'events.chemical.fields.appliedScopeDetail'
                            })}
                            error={errors.applied_scope_detail?.message}
                            helpText={intl.formatMessage({
                              id: 'chemical.appliedScopeDetailHelp'
                            })}>
                            <Controller
                              name="applied_scope_detail"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardInput
                                  {...field}
                                  placeholder={intl.formatMessage({
                                    id: 'chemical.appliedScopeDetailPlaceholder'
                                  })}
                                />
                              )}
                            />
                          </StandardField>
                        )}
                      </>
                    )}
                  </SimpleGrid>
                </VStack>
              </SectionBox>

              {/* Section 3.5: NOP Supplier & Purchase Tracking (7 CFR 205.103) */}
              {/* Required for mass-balance audits — purchased inputs must match applied inputs */}
              {!isSummaryMode && (
                <SectionBox>
                  <SectionHeader
                    icon={FaTruck}
                    title={intl.formatMessage({ id: 'events.section.chemical.supplier' })}
                    badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                    description={intl.formatMessage({
                      id: 'events.section.desc.chemicalSupplier',
                      defaultMessage:
                        'Document input suppliers and purchase records for organic mass-balance audits.'
                    })}
                  />

                  <VStack spacing={4} align="stretch">
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.chemical.form.supplierName',
                          defaultMessage: 'Supplier Name'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.chemical.form.supplierNameHelp',
                          defaultMessage: 'Input supplier or vendor name for audit trail'
                        })}>
                        <Controller
                          name="supplier_name"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              placeholder={intl.formatMessage({
                                id: 'events.chemical.form.supplierNamePlaceholder',
                                defaultMessage: "e.g., Hydra-Gardens Inc. (Neptune's Harvest)"
                              })}
                            />
                          )}
                        />
                      </StandardField>

                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.chemical.fields.purchaseDate',
                          defaultMessage: 'Purchase Date'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.chemical.form.purchaseDateHelp',
                          defaultMessage: 'When the input was purchased'
                        })}>
                        <Controller
                          name="purchase_date"
                          control={methods.control}
                          render={({ field }) => <StandardInput {...field} type="date" />}
                        />
                      </StandardField>
                    </SimpleGrid>

                    <StandardField
                      label={intl.formatMessage({
                        id: 'events.chemical.form.purchaseInvoice',
                        defaultMessage: 'Purchase Invoice / Reference'
                      })}
                      helpText={intl.formatMessage({
                        id: 'events.chemical.form.purchaseInvoiceHelp',
                        defaultMessage: 'Invoice or receipt number for audit trail'
                      })}>
                      <Controller
                        name="purchase_invoice"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardInput
                            {...field}
                            placeholder={intl.formatMessage({
                              id: 'events.chemical.form.purchaseInvoicePlaceholder',
                              defaultMessage: 'e.g., INV-HG-2026-0142'
                            })}
                          />
                        )}
                      />
                    </StandardField>

                    {/* The FILE behind the number (2026-08-25): links an uploaded
                        receipt so the packet carries it in receipts/ and the audit
                        table marks the row "[receipt on file]". */}
                    <Controller
                      name="receipt_document"
                      control={methods.control}
                      render={({ field }) => (
                        <ReceiptDocumentSelect value={field.value} onChange={field.onChange} />
                      )}
                    />

                    <StandardField
                      label={intl.formatMessage({
                        id: 'events.chemical.fields.chemicalLotNumber',
                        defaultMessage: 'Lot / Batch Number'
                      })}
                      helpText={intl.formatMessage({
                        id: 'events.chemical.chemicalLotNumberHelp',
                        defaultMessage:
                          'Manufacturer/supplier lot or batch # for NOP input traceability'
                      })}>
                      <Controller
                        name="chemical_lot_number"
                        control={methods.control}
                        render={({ field }) => (
                          <StandardInput
                            {...field}
                            placeholder={intl.formatMessage({
                              id: 'events.chemical.chemicalLotNumberPlaceholder',
                              defaultMessage: 'e.g., LOT-ENT-4471'
                            })}
                          />
                        )}
                      />
                    </StandardField>

                    {/* 🔴 The mass-balance input leg. Without a quantity, the packet cannot
                        reconcile purchases against applications and prints a [REVIEW] block —
                        which it did on every packet ever produced, because this input did not
                        exist while the check that demands it did. */}
                    <StandardField
                      label={intl.formatMessage({
                        id: 'events.chemical.fields.quantityPurchased',
                        defaultMessage: 'Quantity Purchased'
                      })}
                      helpText={intl.formatMessage({
                        id: 'events.chemical.quantityPurchasedHelp',
                        defaultMessage:
                          'Total amount bought on this invoice. Certifiers reconcile purchased against applied — leave blank if this application was not a purchase.'
                      })}>
                      <HStack spacing={2} align="start">
                        <Controller
                          name="quantity_purchased"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="0.00"
                            />
                          )}
                        />
                        <Controller
                          name="quantity_purchased_unit"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect {...field} maxW="130px">
                              <option value="L">
                                {intl.formatMessage({ id: 'app.unit.liters' })}
                              </option>
                              <option value="gal">
                                {intl.formatMessage({ id: 'app.unit.gallons' })}
                              </option>
                              <option value="mL">
                                {intl.formatMessage({ id: 'app.unit.milliliters' })}
                              </option>
                              <option value="fl_oz">
                                {intl.formatMessage({ id: 'app.unit.fluidOunces' })}
                              </option>
                              <option value="oz_wt">
                                {intl.formatMessage({ id: 'app.unit.ouncesWeight' })}
                              </option>
                              {field.value === 'oz' && (
                                <option value="oz">
                                  {intl.formatMessage({ id: 'app.unit.ouncesUnstated' })}
                                </option>
                              )}
                              <option value="kg">
                                {intl.formatMessage({ id: 'app.unit.kilograms' })}
                              </option>
                              <option value="lbs">
                                {intl.formatMessage({ id: 'app.unit.pounds' })}
                              </option>
                              {(chemicalType === 'PE' || field.value === 'dispensers') && (
                                <option value="dispensers">
                                  {intl.formatMessage({ id: 'app.unit.dispensers' })}
                                </option>
                              )}
                            </StandardSelect>
                          )}
                        />
                      </HStack>
                    </StandardField>

                    <Box
                      bg="orange.50"
                      p={3}
                      borderRadius="md"
                      borderLeft="3px solid"
                      borderLeftColor="orange.400">
                      <HStack spacing={2} mb={1}>
                        <Icon as={FaFileInvoiceDollar} color="orange.500" fontSize="sm" />
                        <Text fontSize="sm" fontWeight="semibold" color="orange.700">
                          {intl.formatMessage({
                            id: 'events.chemical.massBalance.heading',
                            defaultMessage: 'NOP Mass-Balance Audit'
                          })}
                        </Text>
                      </HStack>
                      <Text fontSize="xs" color="orange.600">
                        {intl.formatMessage({
                          id: 'events.chemical.massBalance.body',
                          defaultMessage:
                            'Organic certifiers reconcile purchased inputs against applied quantities. Supplier, date, invoice, lot AND quantity together let that reconciliation run; § 205.103(b)(2) asks that records span "the time of purchase or acquisition, through production, to sale or transport".'
                        })}
                      </Text>
                    </Box>
                  </VStack>
                </SectionBox>
              )}

              {/* F20 (2026-06): one Trazo event can double as a GLOBALG.A.P. IFA v6
                    FV-GFS 32.02.01 PPP record AND a CA Pesticide Use Report (DPR-PML-017C).
                    Manufacturer + start/end + planted-area are universal fields; only their
                    WORDING is Californian. So a California farm reads "Legal spray record",
                    the PUR badge and the DPR box numbers, and every other farm (or one whose
                    state is unknown) reads the same fields under neutral words that claim no
                    state's law (OV-FJ-C13). The badge outside California is "Certifier record":
                    manufacturer, the pest control business and the tank-mix partners print in
                    the certifier packet. */}
              {!isSummaryMode && (
                <SectionBox>
                  <SectionHeader
                    icon={FaClock}
                    title={intl.formatMessage({
                      id: isCaFarm
                        ? 'events.section.chemical.sprayRecord'
                        : 'events.section.chemical.applicationDetails'
                    })}
                    badge={
                      isCaFarm
                        ? intl.formatMessage({ id: 'events.section.badge.caPesticideReport' })
                        : intl.formatMessage({ id: 'events.section.badge.certifierRecord' })
                    }
                    description={
                      isCaFarm
                        ? intl.formatMessage({
                            id: 'events.section.desc.chemicalPur',
                            defaultMessage:
                              'Optional fields that make this entry a complete legal pesticide-use record — GLOBALG.A.P. FV-GFS 32.02.01 and the CA monthly Pesticide Use Report (DPR-PML-017C).'
                          })
                        : intl.formatMessage({
                            id: 'events.section.desc.chemicalApplicationDetails'
                          })
                    }
                  />
                  <VStack spacing={4} align="stretch">
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.chemical.form.manufacturer',
                          defaultMessage: 'Manufacturer / Registrant'
                        })}
                        helpText={
                          isCaFarm
                            ? intl.formatMessage({
                                id: 'events.chemical.form.manufacturerHelp',
                                defaultMessage:
                                  'GLOBALG.A.P. FV-GFS 32.02.01 + DPR box 28 (commercial name holds the brand)'
                              })
                            : intl.formatMessage({
                                id: 'events.chemical.form.manufacturerHelpNeutral'
                              })
                        }>
                        <Controller
                          name="manufacturer"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              placeholder={intl.formatMessage({
                                id: 'events.chemical.form.manufacturerPlaceholder',
                                defaultMessage: 'e.g., Corteva, Bayer, Valent'
                              })}
                            />
                          )}
                        />
                      </StandardField>
                      {/* Planted area is a fact of each site, so with several parcels the shared
                          body drops it; it is not offered there, and each record can take its own
                          afterwards. */}
                      {!multiTarget && (
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.chemical.fields.plantedArea',
                            defaultMessage: 'Total Planted Area'
                          })}
                          helpText={
                            isCaFarm
                              ? intl.formatMessage({
                                  id: 'events.chemical.form.plantedAreaHelp',
                                  defaultMessage:
                                    'DPR box 9 — total planted acres/units at the site (distinct from area treated)'
                                })
                              : intl.formatMessage({
                                  id: 'events.chemical.form.plantedAreaHelpNeutral'
                                })
                          }>
                          <HStack spacing={2}>
                            <Controller
                              name="planted_area"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardInput
                                  {...field}
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  flex={2}
                                />
                              )}
                            />
                            <Controller
                              name="planted_area_unit"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardSelect {...field} flex={1}>
                                  <option value="acres">
                                    {intl.formatMessage({ id: 'app.unit.acres' })}
                                  </option>
                                  <option value="ha">
                                    {intl.formatMessage({ id: 'app.unit.hectares' })}
                                  </option>
                                  <option value="sq_ft">
                                    {intl.formatMessage({ id: 'app.unit.squareFeet' })}
                                  </option>
                                  <option value="units">
                                    {intl.formatMessage({ id: 'app.unit.units' })}
                                  </option>
                                </StandardSelect>
                              )}
                            />
                          </HStack>
                        </StandardField>
                      )}
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.chemical.fields.applicationStart',
                          defaultMessage: 'Application Start'
                        })}
                        helpText={
                          isCaFarm
                            ? intl.formatMessage({
                                id: 'events.chemical.form.applicationStartHelp',
                                defaultMessage: '3 CCR 6624(c)(2) / DPR box 17 — start date & time'
                              })
                            : intl.formatMessage({
                                id: 'events.chemical.form.applicationStartHelpNeutral'
                              })
                        }>
                        <Controller
                          name="application_start"
                          control={methods.control}
                          render={({ field }) => <StandardInput {...field} type="datetime-local" />}
                        />
                      </StandardField>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.chemical.fields.applicationEnd',
                          defaultMessage: 'Application End'
                        })}
                        helpText={
                          isCaFarm
                            ? intl.formatMessage({
                                id: 'events.chemical.form.applicationEndHelp',
                                defaultMessage:
                                  '3 CCR 6624(c)(2) / DPR box 18 — completion date & time'
                              })
                            : intl.formatMessage({
                                id: 'events.chemical.form.applicationEndHelpNeutral'
                              })
                        }>
                        <Controller
                          name="application_end"
                          control={methods.control}
                          render={({ field }) => <StandardInput {...field} type="datetime-local" />}
                        />
                      </StandardField>
                    </SimpleGrid>

                    {/* Applied for hire. A licensed pest control business is the reporter for its
                        own applications on the CA PUR (3 CCR 6626(b); PUE Compendium Vol. 1 Ch. 4
                        p. 4-8 — the grower "should not include applications made by pest control
                        businesses on his/her use report"). Without this switch every hired pass
                        was exported on the grower's own report, so it was filed twice. The record
                        stays in the spray log either way (3 CCR 6624(d)). */}
                    <Box
                      p={3}
                      bg="gray.50"
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor="gray.200">
                      <HStack justify="space-between" align="flex-start" spacing={3}>
                        <Box>
                          <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                            {intl.formatMessage({
                              id: 'events.chemical.fields.appliedByPcb',
                              defaultMessage: 'Applied by a pest control business'
                            })}
                          </Text>
                          <Text fontSize="xs" color="gray.600" mt={0.5}>
                            {isCaFarm
                              ? intl.formatMessage({
                                  id: 'events.chemical.form.appliedByPcbHelp',
                                  defaultMessage:
                                    'Turn on when a licensed pest control business made this application for hire. The business files its own CA Pesticide Use Report (3 CCR 6626(b)), so this record stays in your spray log but is left off your monthly PUR.'
                                })
                              : intl.formatMessage({
                                  id: 'events.chemical.form.appliedByPcbHelpNeutral'
                                })}
                          </Text>
                        </Box>
                        <Controller
                          name="applied_by_pcb"
                          control={methods.control}
                          render={({ field }) => (
                            <Switch
                              isChecked={field.value === 'true'}
                              onChange={(e) => field.onChange(e.target.checked ? 'true' : 'false')}
                              colorScheme="green"
                              aria-label={intl.formatMessage({
                                id: 'events.chemical.fields.appliedByPcb',
                                defaultMessage: 'Applied by a pest control business'
                              })}
                            />
                          )}
                        />
                      </HStack>
                      {watch('applied_by_pcb') === 'true' && (
                        <Box mt={3}>
                          <StandardField
                            label={intl.formatMessage({
                              id: 'events.chemical.fields.pcbName',
                              defaultMessage: 'Pest control business'
                            })}>
                            <Controller
                              name="pcb_name"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardInput
                                  {...field}
                                  placeholder={intl.formatMessage({
                                    id: 'events.chemical.form.pcbNamePlaceholder',
                                    defaultMessage: 'e.g., Valley Ag Spray Inc.'
                                  })}
                                />
                              )}
                            />
                          </StandardField>
                        </Box>
                      )}
                    </Box>

                    {/* CA Pesticide Use Report identity — California only.
                        The block already said "leave blank if outside California", but it
                        still occupied a full grid on every non-CA grower's spray form, on
                        the most-repeated form in the product. Hidden outside CA rather than
                        labelled optional. Fields stay in the schema and payload allow-list
                        so previously-saved CA data still round-trips, and a record that
                        already holds any of them shows the block on any farm, so stored
                        values are never out of the grower's sight. */}
                    {(isCaFarm || recordHoldsCaPurIdentity) && (
                      <Box
                        p={3}
                        bg="gray.50"
                        borderRadius="md"
                        border="1px solid"
                        borderColor="gray.200">
                        <HStack mb={2}>
                          <Icon as={FaFileInvoiceDollar} color="gray.600" />
                          <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                            {intl.formatMessage({
                              id: 'events.chemical.pur.heading',
                              defaultMessage:
                                'California Pesticide Use Report (PUR) — California only'
                            })}
                          </Text>
                        </HStack>
                        <Text fontSize="xs" color="gray.600" mb={3}>
                          {intl.formatMessage({
                            id: 'events.chemical.pur.body',
                            defaultMessage:
                              'County-issued identifiers from your Operator ID / permit and field maps. Required to generate the monthly PUR (DPR-PML-017C). Leave blank if outside California.'
                          })}
                        </Text>
                        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                          <StandardField
                            label={intl.formatMessage({
                              id: 'events.chemical.fields.operatorId',
                              defaultMessage: 'Operator ID / Permit No.'
                            })}
                            helpText={
                              farmOperatorIdDefault
                                ? intl.formatMessage(
                                    { id: 'events.chemical.form.operatorIdFarmDefault' },
                                    { value: farmOperatorIdDefault }
                                  )
                                : intl.formatMessage({
                                    id: 'events.chemical.form.operatorIdHelp',
                                    defaultMessage: 'DPR box 3'
                                  })
                            }>
                            <Controller
                              name="operator_id"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardInput
                                  {...field}
                                  placeholder={farmOperatorIdDefault || 'e.g., 37-1234'}
                                />
                              )}
                            />
                          </StandardField>
                          <StandardField
                            label={intl.formatMessage({
                              id: 'events.chemical.fields.siteId',
                              defaultMessage: 'Site ID'
                            })}
                            helpText={
                              parcelSiteIdDefault
                                ? intl.formatMessage(
                                    { id: 'events.chemical.form.siteIdParcelDefault' },
                                    { value: parcelSiteIdDefault }
                                  )
                                : intl.formatMessage({
                                    id: 'events.chemical.form.siteIdHelp',
                                    defaultMessage: 'DPR box 8 (1-8 chars)'
                                  })
                            }>
                            <Controller
                              name="site_id"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardInput
                                  {...field}
                                  placeholder={parcelSiteIdDefault || 'e.g., 0001'}
                                />
                              )}
                            />
                          </StandardField>
                          <StandardField
                            label={intl.formatMessage({
                              id: 'events.chemical.fields.applicationCounty',
                              defaultMessage: 'County'
                            })}
                            helpText={intl.formatMessage({
                              id: 'events.chemical.form.countyHelp',
                              defaultMessage: 'DPR box 10'
                            })}>
                            <Controller
                              name="application_county"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardInput
                                  {...field}
                                  placeholder={intl.formatMessage({
                                    id: 'events.chemical.form.countyPlaceholder',
                                    defaultMessage: 'e.g., Fresno'
                                  })}
                                />
                              )}
                            />
                          </StandardField>
                          <StandardField
                            label={intl.formatMessage({
                              id: 'events.chemical.form.mtrsSection',
                              defaultMessage: 'Section'
                            })}
                            helpText={intl.formatMessage({
                              id: 'events.chemical.form.mtrsSectionHelp',
                              defaultMessage: 'DPR box 11 (MTRS)'
                            })}>
                            <Controller
                              name="mtrs_section"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardInput {...field} placeholder="e.g., 12" />
                              )}
                            />
                          </StandardField>
                          <StandardField
                            label={intl.formatMessage({
                              id: 'events.chemical.fields.mtrsTownship',
                              defaultMessage: 'Township'
                            })}
                            helpText={intl.formatMessage({
                              id: 'events.chemical.form.mtrsTownshipHelp',
                              defaultMessage: 'DPR box 12 (N/S)'
                            })}>
                            <Controller
                              name="mtrs_township"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardInput {...field} placeholder="e.g., 14S" />
                              )}
                            />
                          </StandardField>
                          <StandardField
                            label={intl.formatMessage({
                              id: 'events.chemical.fields.mtrsRange',
                              defaultMessage: 'Range'
                            })}
                            helpText={intl.formatMessage({
                              id: 'events.chemical.form.mtrsRangeHelp',
                              defaultMessage: 'DPR box 13 (E/W)'
                            })}>
                            <Controller
                              name="mtrs_range"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardInput {...field} placeholder="e.g., 22E" />
                              )}
                            />
                          </StandardField>
                          <StandardField
                            label={intl.formatMessage({
                              id: 'events.chemical.fields.mtrsBaseMeridian',
                              defaultMessage: 'Base & Meridian'
                            })}
                            helpText={intl.formatMessage({
                              id: 'events.chemical.form.mtrsBaseMeridianHelp',
                              defaultMessage: 'DPR box 14 (H/M/S)'
                            })}>
                            <Controller
                              name="mtrs_base_meridian"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardSelect
                                  {...field}
                                  placeholder={intl.formatMessage({
                                    id: 'events.chemical.form.selectPlaceholder',
                                    defaultMessage: 'Select...'
                                  })}>
                                  <option value="">
                                    {intl.formatMessage({
                                      id: 'events.chemical.form.selectPlaceholder'
                                    })}
                                  </option>
                                  <option value="H">
                                    {intl.formatMessage({
                                      id: 'events.chemical.baseMeridian.humboldt'
                                    })}
                                  </option>
                                  <option value="M">
                                    {intl.formatMessage({
                                      id: 'events.chemical.baseMeridian.mountDiablo'
                                    })}
                                  </option>
                                  <option value="S">
                                    {intl.formatMessage({
                                      id: 'events.chemical.baseMeridian.sanBernardino'
                                    })}
                                  </option>
                                </StandardSelect>
                              )}
                            />
                          </StandardField>
                          {watch('application_method') === 'fumigation' && (
                            <StandardField
                              label={intl.formatMessage({
                                id: 'events.chemical.form.ffmCode',
                                defaultMessage: 'Field Fumigation Method (FFM) Code'
                              })}
                              helpText={intl.formatMessage({
                                id: 'events.chemical.form.ffmCodeHelp',
                                defaultMessage:
                                  'DPR box 21 / 3 CCR 6624(c)(8) — required for fumigation'
                              })}>
                              <Controller
                                name="ffm_code"
                                control={methods.control}
                                render={({ field }) => (
                                  <StandardInput
                                    {...field}
                                    placeholder={intl.formatMessage({
                                      id: 'events.chemical.form.ffmCodePlaceholder',
                                      defaultMessage: '4-digit FFM code'
                                    })}
                                  />
                                )}
                              />
                            </StandardField>
                          )}
                        </SimpleGrid>
                      </Box>
                    )}

                    {/* Tank-mix adjuvants. In California each CA-registered partner is a
                        separate PUR line, which only a California farm is told. */}
                    {/* Several blocks: partner volumes are per product and per block, so not asked here. */}
                    {!multiTarget && (
                      <Box
                        p={3}
                        bg="gray.50"
                        borderRadius="md"
                        border="1px solid"
                        borderColor="gray.200">
                        {/* An HStack is a single non-wrapping row, and Chakra's Button base style is
                          `whiteSpace: nowrap`. At 375px the Spanish title ("Coadyuvantes /
                          adherentes de mezcla en tanque") wrapped to three lines while "Agregar
                          coadyuvante" stayed on one and ran straight through the panel's right
                          border, printing ON TOP of the title. The header stacks on mobile and
                          only becomes a row once there is width for both. */}
                        <Stack
                          direction={{ base: 'column', smd: 'row' }}
                          align={{ base: 'stretch', smd: 'center' }}
                          justify="space-between"
                          spacing={2}
                          mb={2}>
                          <HStack align="flex-start">
                            <Icon as={FaFlask} color="gray.600" mt="2px" flexShrink={0} />
                            <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                              {intl.formatMessage({
                                id: 'events.chemical.adjuvants.title',
                                defaultMessage: 'Tank-mix adjuvants / spreader-stickers'
                              })}
                            </Text>
                          </HStack>
                          <StandardButton
                            size="sm"
                            variant="outline"
                            flexShrink={0}
                            alignSelf={{ base: 'flex-start', smd: 'auto' }}
                            leftIcon={<FaPlus />}
                            onClick={() =>
                              appendAdjuvant({
                                commercial_name: '',
                                manufacturer: '',
                                epa_registration_number: '',
                                volume: '',
                                volume_unit: 'gal',
                                organic_approved: 'false'
                              })
                            }>
                            {intl.formatMessage({
                              id: 'events.chemical.adjuvants.add',
                              defaultMessage: 'Add adjuvant'
                            })}
                          </StandardButton>
                        </Stack>
                        <Text fontSize="xs" color="gray.600" mb={3}>
                          {isCaFarm
                            ? intl.formatMessage({
                                id: 'events.chemical.adjuvants.help',
                                defaultMessage:
                                  'CA-registered adjuvants applied in the tank mix are reportable — each is added as its own line on the Pesticide Use Report (DPR boxes 23/24). Leave empty if none.'
                              })
                            : intl.formatMessage({ id: 'events.chemical.adjuvants.helpNeutral' })}
                        </Text>

                        {adjuvantFields.length === 0 ? (
                          <Text fontSize="xs" color="gray.500" fontStyle="italic">
                            {intl.formatMessage({
                              id: 'events.chemical.adjuvants.empty',
                              defaultMessage: 'No adjuvants added.'
                            })}
                          </Text>
                        ) : (
                          <VStack spacing={3} align="stretch">
                            {adjuvantFields.map((adjuvant, index) => (
                              <Box
                                key={adjuvant.id}
                                p={3}
                                bg="white"
                                borderRadius="md"
                                border="1px solid"
                                borderColor="gray.200">
                                <HStack mb={2} justify="space-between">
                                  <Text fontSize="xs" fontWeight="semibold" color="gray.600">
                                    {intl.formatMessage(
                                      {
                                        id: 'events.chemical.adjuvants.itemLabel',
                                        defaultMessage: 'Adjuvant {n}'
                                      },
                                      { n: index + 1 }
                                    )}
                                  </Text>
                                  <StandardButton
                                    size="sm"
                                    variant="ghost"
                                    leftIcon={<FaTrash />}
                                    onClick={() => removeAdjuvant(index)}>
                                    {intl.formatMessage({
                                      id: 'events.chemical.adjuvants.remove',
                                      defaultMessage: 'Remove'
                                    })}
                                  </StandardButton>
                                </HStack>
                                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                                  <StandardField
                                    label={intl.formatMessage({
                                      id: 'events.chemical.adjuvants.productName',
                                      defaultMessage: 'Product name'
                                    })}>
                                    <Controller
                                      name={`tank_mix_partners.${index}.commercial_name`}
                                      control={methods.control}
                                      render={({ field }) => (
                                        <StandardInput
                                          {...field}
                                          placeholder={intl.formatMessage({
                                            id: 'events.chemical.form.adjuvantProductPlaceholder',
                                            defaultMessage: 'e.g., Dyne-Amic'
                                          })}
                                        />
                                      )}
                                    />
                                  </StandardField>
                                  <StandardField
                                    label={intl.formatMessage({
                                      id: 'events.chemical.adjuvants.manufacturer',
                                      defaultMessage: 'Manufacturer'
                                    })}>
                                    <Controller
                                      name={`tank_mix_partners.${index}.manufacturer`}
                                      control={methods.control}
                                      render={({ field }) => (
                                        <StandardInput
                                          {...field}
                                          placeholder={intl.formatMessage({
                                            id: 'events.chemical.form.adjuvantManufacturerPlaceholder',
                                            defaultMessage: 'e.g., Helena'
                                          })}
                                        />
                                      )}
                                    />
                                  </StandardField>
                                  <StandardField
                                    label={intl.formatMessage({
                                      id: 'events.chemical.adjuvants.epaReg',
                                      defaultMessage: 'EPA / State Reg. No.'
                                    })}
                                    helpText={
                                      isCaFarm
                                        ? intl.formatMessage({
                                            id: 'events.chemical.form.adjuvantAmountHelp',
                                            defaultMessage: 'DPR box 23'
                                          })
                                        : undefined
                                    }>
                                    <Controller
                                      name={`tank_mix_partners.${index}.epa_registration_number`}
                                      control={methods.control}
                                      render={({ field }) => (
                                        <StandardInput {...field} placeholder="e.g., 5905-501" />
                                      )}
                                    />
                                  </StandardField>
                                  <StandardField
                                    label={intl.formatMessage({
                                      id: 'events.chemical.adjuvants.amount',
                                      defaultMessage: 'Total product used'
                                    })}
                                    helpText={
                                      isCaFarm
                                        ? intl.formatMessage({
                                            id: 'events.chemical.form.adjuvantEpaRegHelp',
                                            defaultMessage: 'DPR box 24'
                                          })
                                        : undefined
                                    }>
                                    <HStack spacing={2}>
                                      <Controller
                                        name={`tank_mix_partners.${index}.volume`}
                                        control={methods.control}
                                        render={({ field }) => (
                                          <StandardInput
                                            {...field}
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            flex={2}
                                          />
                                        )}
                                      />
                                      <Controller
                                        name={`tank_mix_partners.${index}.volume_unit`}
                                        control={methods.control}
                                        render={({ field }) => (
                                          <StandardSelect {...field} flex={1}>
                                            <option value="gal">gal</option>
                                            <option value="qt">qt</option>
                                            <option value="pt">pt</option>
                                            <option value="fl_oz">fl oz</option>
                                            <option value="oz">oz</option>
                                            <option value="lb">lb</option>
                                            <option value="L">L</option>
                                          </StandardSelect>
                                        )}
                                      />
                                    </HStack>
                                  </StandardField>
                                </SimpleGrid>
                                <HStack mt={2}>
                                  <Controller
                                    name={`tank_mix_partners.${index}.organic_approved`}
                                    control={methods.control}
                                    render={({ field }) => (
                                      <Switch
                                        isChecked={field.value === 'true' || field.value === true}
                                        onChange={(e) =>
                                          field.onChange(e.target.checked ? 'true' : 'false')
                                        }
                                        colorScheme="green"
                                      />
                                    )}
                                  />
                                  <Text fontSize="xs" color="gray.600">
                                    {intl.formatMessage({
                                      id: 'events.chemical.adjuvants.organicApproved',
                                      defaultMessage:
                                        'Adjuvant has an organic basis (for example OMRI listed)'
                                    })}
                                  </Text>
                                </HStack>
                              </Box>
                            ))}
                          </VStack>
                        )}
                      </Box>
                    )}
                  </VStack>
                </SectionBox>
              )}

              {/* Section 3.6: CA DPR Restricted Materials Permit (P0-3) */}
              {/*
                🔴 2026-09-08 — now gated on the FARM'S STATE as well as the product name.
                It was keyword-only, so an Oregon grower spraying sulfur, Entrust or a copper
                fungicide — all ordinary organic inputs, all on the keyword list — was shown a
                California county Restricted Materials Permit section asking for a permit number,
                county and expiry that do not exist outside California. That is the audit's T05
                finding in its most concrete form: a form asking a farmer to interpret a field
                that cannot apply to them.

                `useFarmState` returns null when the state is unknown and the block then stays
                hidden, which is the right default: inventing a Californian obligation for a farm
                whose state we cannot read is worse than omitting an optional section. The
                identity block above (operator/site/county, DPR-PML-017C boxes 3/8/10) has always
                been gated this way; this section was the sibling that was not.

                The fields stay in the schema and the payload allow-list, so an existing CA record
                still round-trips, and the drift detector keeps gating the actual finding
                server-side. A record that already holds a permit value shows the section on any
                farm and whatever the product name now says: stored data stays in sight.
              */}
              {!isSummaryMode &&
                (isCaFarm || recordHoldsCaPermit) &&
                (() => {
                  const name = (methods.watch('commercial_name') || '').toLowerCase();
                  const CA_RESTRICTED_KEYWORDS = [
                    'copper hydroxide',
                    'copper sulfate',
                    'copper oxychloride',
                    'bordeaux',
                    'kocide',
                    'sulfur',
                    'pyrethrin',
                    'spinosad',
                    'entrust',
                    'rotenone'
                  ];
                  const isRestricted = CA_RESTRICTED_KEYWORDS.some((kw) => name.includes(kw));
                  if (!isRestricted && !recordHoldsCaPermit) return null;
                  return (
                    <SectionBox>
                      <SectionHeader
                        icon={FaFileInvoiceDollar}
                        title={intl.formatMessage({ id: 'events.section.chemical.dprPermit' })}
                        badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                        description={intl.formatMessage({
                          id: 'events.chemical.form.countyPermitAlert',
                          defaultMessage:
                            'This input is a California county-restricted material (3 CCR 6400 et seq.). Even when NOP-allowed under 7 CFR 205.601, a county Ag Commissioner permit is required before application.'
                        })}
                      />
                      <VStack spacing={4} align="stretch">
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                          <StandardField
                            label={intl.formatMessage({
                              id: 'events.chemical.form.permitNumber',
                              defaultMessage: 'Permit Number'
                            })}
                            helpText={intl.formatMessage({
                              id: 'events.chemical.form.permitNumberHelp',
                              defaultMessage: 'County Ag Commissioner-issued permit #'
                            })}>
                            <Controller
                              name="ca_dpr_permit_number"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardInput {...field} placeholder="e.g., SD-2026-00147" />
                              )}
                            />
                          </StandardField>
                          <StandardField
                            label={intl.formatMessage({
                              id: 'events.chemical.form.permitCounty',
                              defaultMessage: 'Issuing County'
                            })}
                            helpText={intl.formatMessage({
                              id: 'events.chemical.form.permitCountyHelp',
                              defaultMessage: 'CA county that issued the permit'
                            })}>
                            <Controller
                              name="ca_dpr_permit_county"
                              control={methods.control}
                              render={({ field }) => (
                                <StandardInput
                                  {...field}
                                  placeholder={intl.formatMessage({
                                    id: 'events.chemical.form.permitCountyPlaceholder',
                                    defaultMessage: 'e.g., San Diego'
                                  })}
                                />
                              )}
                            />
                          </StandardField>
                        </SimpleGrid>
                        <StandardField
                          label={intl.formatMessage({
                            id: 'events.chemical.fields.caDprPermitExpires',
                            defaultMessage: 'Permit Expires'
                          })}
                          helpText={intl.formatMessage({
                            id: 'events.chemical.form.permitExpiresHelp',
                            defaultMessage:
                              'Expiry date from the permit — drift detector flags expired permits'
                          })}>
                          <Controller
                            name="ca_dpr_permit_expires"
                            control={methods.control}
                            render={({ field }) => <StandardInput {...field} type="date" />}
                          />
                        </StandardField>
                        <Box
                          bg="red.50"
                          p={3}
                          borderRadius="md"
                          borderLeft="3px solid"
                          borderLeftColor="red.400">
                          <Text fontSize="xs" color="red.700">
                            <b>
                              {intl.formatMessage({
                                id: 'events.chemical.countyPermit.enforcementLabel',
                                defaultMessage: 'Enforcement:'
                              })}
                            </b>{' '}
                            {intl.formatMessage({
                              id: 'events.chemical.countyPermit.enforcementBody',
                              defaultMessage:
                                "County Ag Commissioner. Applying a restricted material without a current permit is a violation of CA state law independent of organic compliance. If you're outside California, you can leave these fields blank — the server-side drift detector only flags CA establishments."
                            })}
                          </Text>
                        </Box>
                      </VStack>
                    </SectionBox>
                  );
                })()}

              {/* Section 4: Application Equipment & Fuel Usage - Phase 3 Electric Equipment Support */}
              {/* Hidden in Summary Mode - aggregate fuel fields are shown in the summary sections instead */}
              {/* With several parcels the fuel type and unit stay shared and the amount is
                  asked on each parcel's card, so only the amount input is left out here. */}
              {!isSummaryMode && (
                <CollapsibleSection
                  icon={FaBolt}
                  title={intl.formatMessage({ id: 'events.section.chemical.equipmentFuel' })}
                  badge={intl.formatMessage({ id: 'events.section.badge.optionalCarbon' })}
                  description={intl.formatMessage({ id: 'events.section.desc.carbonOptional' })}
                  badgeTone="optional">
                  {' '}
                  <VStack spacing={4} align="stretch">
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      {/* Phase 3: Application Fuel Type Selector */}
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.chemical.form.applicationEquipmentFuelType',
                          defaultMessage: 'Application Equipment Fuel Type'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.chemical.form.equipmentFuelTypeHelpSpraySpread',
                          defaultMessage: 'Fuel type used for spraying or spreading equipment'
                        })}>
                        <Controller
                          name="application_fuel_type"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardSelect
                              {...field}
                              placeholder={intl.formatMessage({
                                id: 'events.chemical.form.fuelTypePlaceholder',
                                defaultMessage: 'Select fuel type...'
                              })}>
                              {/* The fuel's name only. Its kg CO₂e factor stays in
                                  CHEMICAL_FUEL_TYPES for the carbon preview, which states its
                                  sources; a grower picking diesel is recording what the sprayer
                                  burned, not choosing an emission factor (OV-FJ-C13). */}
                              {FUEL_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {intl.formatMessage({ id: type.labelKey })}
                                </option>
                              ))}
                            </StandardSelect>
                          )}
                        />
                      </StandardField>

                      <StandardField
                        label={
                          multiTarget
                            ? intl.formatMessage({ id: 'events.multiParcel.fuelUnitLabel' })
                            : watch('application_fuel_type') === 'electric'
                            ? intl.formatMessage({ id: 'production.field.energyAmount' })
                            : intl.formatMessage({ id: 'app.fuelConsumed' })
                        }
                        helpText={
                          multiTarget
                            ? intl.formatMessage({ id: 'events.multiParcel.fuelUnitHelp' })
                            : watch('application_fuel_type') === 'electric'
                            ? intl.formatMessage({ id: 'events.chemical.form.energyUsedHelp' })
                            : intl.formatMessage({ id: 'app.applicationFuelConsumedHelp' })
                        }>
                        <HStack spacing={2}>
                          {!multiTarget && (
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
                          )}
                          <Controller
                            name="application_fuel_unit"
                            control={methods.control}
                            render={({ field }) => (
                              <StandardSelect flex={1} {...field}>
                                <option value="L">
                                  {intl.formatMessage({ id: 'app.unit.liters' })}
                                </option>
                                <option value="gal">
                                  {intl.formatMessage({ id: 'app.unit.gallons' })}
                                </option>
                                <option value="kg">
                                  {intl.formatMessage({ id: 'app.unit.kilograms' })}
                                </option>
                                <option value="kWh">
                                  {intl.formatMessage({ id: 'app.unit.kilowattHours' })}
                                </option>
                              </StandardSelect>
                            )}
                          />
                        </HStack>
                      </StandardField>
                    </SimpleGrid>

                    {/* Phase 3: Electric Equipment Info Box */}
                    {watch('application_fuel_type') === 'electric' && (
                      <StandardAlert
                        status="info"
                        mb={0}
                        title={intl.formatMessage({ id: 'events.electricEquipment.title' })}
                        description={intl.formatMessage({ id: 'events.electricEquipment.body' })}
                      />
                    )}

                    <Box mt={2}>
                      <StandardAlert
                        status="info"
                        mb={0}
                        title={intl.formatMessage({
                          id: 'events.chemical.applicationCarbon.heading'
                        })}
                        description={intl.formatMessage({
                          id: 'events.chemical.applicationCarbon.body'
                        })}
                      />
                    </Box>

                    {/* No `onEnterActualFuel` here on purpose. ChemicalTab renders this
                        fuel block once per application subtype — four `fuel_consumption_total`
                        inputs exist in the tree — so a "jump to the fuel field" link has no
                        single unambiguous target. The measured-vs-assumed disclosure still
                        renders; only the shortcut is withheld. */}
                    {(carbonCalculation || isCalculatingCarbon) && (
                      <CarbonImpactPreview
                        eventType="Chemical"
                        /* LIVE values — see the same fix in ProductionTab. The fertigation
                           note keys off `type === 'FE'` plus `is_fertigation`, and
                           `initialValues` is empty on a new event. */
                        formData={{
                          ...initialValues,
                          type: chemicalType,
                          is_fertigation: watch('is_fertigation')
                        }}
                        calculation={carbonCalculation}
                        isCalculating={isCalculatingCarbon}
                      />
                    )}
                  </VStack>
                </CollapsibleSection>
              )}

              {/* Section 5: pesticide application record (EPA WPS, 40 CFR 170.311(b)(1)) */}
              {(chemicalType === 'PE' || chemicalType === 'HE' || chemicalType === 'FU') && (
                <SectionBox>
                  <SectionHeader
                    icon={FaUserShield}
                    title={intl.formatMessage({ id: 'events.section.chemical.safety' })}
                    badge={intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                  />
                  <VStack spacing={4} align="stretch">
                    {/* Clean info text without redundant alert styling */}
                    <Text fontSize="sm" color="gray.600">
                      {intl.formatMessage({
                        id: 'events.chemical.wps.body',
                        defaultMessage:
                          'EPA Worker Protection Standard (40 CFR 170.311(b)(1)): for each pesticide product applied, keep the safety data sheet, the product name, EPA registration number and active ingredients, the crop or site treated, the dates and times the application started and ended, and the restricted-entry interval. Applicator certification for restricted use pesticides is a separate federal rule (7 U.S.C. 136j(a)(2)(F)).'
                      })}
                    </Text>

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.chemical.fields.applicatorName',
                          defaultMessage: 'Applicator Name'
                        })}
                        error={errors.applicator_name?.message}
                        helpText={intl.formatMessage({
                          id: 'events.chemical.form.applicatorNameHelp',
                          defaultMessage: 'Person who applied the chemical'
                        })}>
                        <Controller
                          name="applicator_name"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              placeholder={intl.formatMessage({
                                id: 'events.chemical.form.applicatorNamePlaceholder',
                                defaultMessage: 'Enter applicator name'
                              })}
                            />
                          )}
                        />
                      </StandardField>

                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.chemical.form.epaRegistrationNumber',
                          defaultMessage: 'EPA Registration Number'
                        })}
                        error={errors.epa_registration_number?.message}
                        helpText={intl.formatMessage({
                          id: 'events.chemical.form.epaRegistrationNumberHelp',
                          defaultMessage: 'Product EPA registration number'
                        })}>
                        <Controller
                          name="epa_registration_number"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput {...field} placeholder="e.g., 12345-67" />
                          )}
                        />
                      </StandardField>

                      {/* F21 — GG FV-GFS 32.02.01 #10: technically-responsible authorizer */}
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.chemical.fields.authorizerName',
                          defaultMessage: 'Authorized By'
                        })}
                        helpText={intl.formatMessage({
                          id: 'events.chemical.form.authorizerNameHelp',
                          defaultMessage:
                            'Technically-responsible person who authorized this application (GLOBALG.A.P.) — often the grower or PCA'
                        })}>
                        <Controller
                          name="authorizer_name"
                          control={methods.control}
                          render={({ field }) => (
                            <StandardInput
                              {...field}
                              placeholder={intl.formatMessage({
                                id: 'events.chemical.form.authorizerNamePlaceholder',
                                defaultMessage: 'e.g., J. Smith, PCA #12345'
                              })}
                            />
                          )}
                        />
                      </StandardField>
                    </SimpleGrid>

                    {/* Restricted Use Pesticide - Clean toggle design */}
                    <StandardField
                      label={intl.formatMessage({
                        id: 'events.chemical.form.restrictedUsePesticide',
                        defaultMessage: 'Restricted Use Pesticide (RUP)'
                      })}
                      helpText={intl.formatMessage({
                        id: 'events.chemical.form.restrictedUsePesticideHelp',
                        defaultMessage:
                          'Does this product require certified applicator for purchase/use?'
                      })}>
                      <HStack
                        justify="space-between"
                        align="center"
                        p={3}
                        bg="gray.50"
                        borderRadius="md">
                        <Text fontSize="sm" color="gray.700">
                          {intl.formatMessage({
                            id: 'events.chemical.restrictedUse.statement',
                            defaultMessage: 'This product is classified as Restricted Use'
                          })}
                        </Text>
                        <HStack spacing={3}>
                          {isRestrictedUse && (
                            <Badge colorScheme="red" size="sm">
                              {intl.formatMessage({
                                id: 'events.chemical.restrictedUse.badge',
                                defaultMessage: 'RESTRICTED'
                              })}
                            </Badge>
                          )}
                          <Controller
                            name="restricted_use_pesticide"
                            control={methods.control}
                            render={({ field }) => (
                              <Switch
                                isChecked={field.value === 'true'}
                                onChange={(e) =>
                                  field.onChange(e.target.checked ? 'true' : 'false')
                                }
                                colorScheme="red"
                                size="lg"
                              />
                            )}
                          />
                        </HStack>
                      </HStack>
                    </StandardField>

                    {/* Applicator Certification — always shown for NOP traceability.
                          Required only when RUP=true (7 U.S.C. 136j(a)(2)(F));
                          optional but audit-surfaced for organic/biological applications. */}
                    <StandardField
                      label={intl.formatMessage({
                        id: 'events.chemical.form.applicatorCertificationNumber',
                        defaultMessage: 'Applicator Certification Number'
                      })}
                      required={isRestrictedUse}
                      error={errors.applicator_certification?.message}
                      helpText={
                        isRestrictedUse
                          ? 'Required for restricted use pesticides - enter your state pesticide applicator license number'
                          : 'Optional - license or training credential of the person who applied this product (NOP traceability)'
                      }>
                      <Controller
                        name="applicator_certification"
                        control={methods.control}
                        render={({ field }) => (
                          // A California-shaped example only on a California farm (OV-FJ-C13).
                          <StandardInput
                            {...field}
                            placeholder={
                              isCaFarm
                                ? 'e.g., CA-12345-AG'
                                : intl.formatMessage({
                                    id: 'events.chemical.form.applicatorCertificationPlaceholder'
                                  })
                            }
                          />
                        )}
                      />
                    </StandardField>

                    {/* Safety Intervals - Clean layout matching other sections */}
                    <Text fontSize="sm" fontWeight="medium" color="gray.700" mt={2}>
                      {intl.formatMessage({
                        id: 'events.chemical.safetyIntervals.heading',
                        defaultMessage: 'Safety Intervals'
                      })}
                    </Text>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.chemical.form.reiHours',
                          defaultMessage: 'REI (Restricted Entry Interval)'
                        })}
                        error={errors.rei_hours?.message}
                        helpText={intl.formatMessage({
                          id: 'events.chemical.form.reiHoursHelp',
                          defaultMessage: 'Hours before workers can re-enter treated area'
                        })}>
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
                              <InputRightAddon>
                                {intl.formatMessage({
                                  id: 'app.unit.hours',
                                  defaultMessage: 'hours'
                                })}
                              </InputRightAddon>
                            </InputGroup>
                          )}
                        />
                      </StandardField>

                      <StandardField
                        label={intl.formatMessage({
                          id: 'events.chemical.form.phiDays',
                          defaultMessage: 'PHI (Pre-Harvest Interval)'
                        })}
                        error={errors.phi_days?.message}
                        helpText={intl.formatMessage({
                          id: 'events.chemical.form.phiDaysHelp',
                          defaultMessage: 'Days before harvest after application'
                        })}>
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
                              <InputRightAddon>
                                {intl.formatMessage({
                                  id: 'app.unit.days',
                                  defaultMessage: 'days'
                                })}
                              </InputRightAddon>
                            </InputGroup>
                          )}
                        />
                      </StandardField>
                    </SimpleGrid>
                  </VStack>
                </SectionBox>
              )}

              {/* F21 — FSMA PSR § 112.161(b) supervisor review / sign-off.

                        Moved OUT of the PE/HE/FU block 2026-08-16. It had been nested inside
                        the pesticide-only section, so a FERTILIZER record could never be signed
                        off — and § 112.161(b) is a RECORDS rule ("All records must be reviewed,
                        dated, and signed... by a supervisor or responsible party"), not a
                        pesticide rule. Soil amendments of animal origin are squarely in part 112
                        scope (§ 112.60), so a fertilizer record is exactly the kind it covers.

                        REI, PHI, EPA registration and applicator certification stay inside that
                        block on purpose: those ARE pesticide concepts and a fertilizer has none. */}
              <Box
                mt={4}
                p={3}
                bg="gray.50"
                borderRadius="md"
                border="1px solid"
                borderColor="gray.200">
                <HStack justify="space-between" mb={3}>
                  {/* Inline sub-block rather than a SectionBox, which is why it carried no
                      destination badge while every section around it did. Both fields DO reach
                      the certifier packet. The FSMA cite stays because it is why the field
                      exists — but a grower should be told where the data lands, not left to
                      infer it from a food-safety clause number. */}
                  <HStack spacing={2}>
                    <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                      {intl.formatMessage({
                        id: 'events.chemical.supervisorReview.heading',
                        defaultMessage: 'Supervisor Review (FSMA § 112.161(b))'
                      })}
                    </Text>
                    {/* textTransform is not decoration here: the theme capitalizes the green
                        palette only, so without it this lone hand-rolled badge renders
                        "Certifier Record" beside sections rendering "Certifier record". */}
                    <Badge colorScheme="green" textTransform="none" fontSize="xs">
                      {intl.formatMessage({ id: 'events.section.badge.certifierRecord' })}
                    </Badge>
                  </HStack>
                  <Controller
                    name="reviewed"
                    control={methods.control}
                    render={({ field }) => (
                      <Switch
                        isChecked={field.value === 'true'}
                        onChange={(e) => field.onChange(e.target.checked ? 'true' : 'false')}
                        colorScheme="green"
                      />
                    )}
                  />
                </HStack>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <StandardField
                    label={intl.formatMessage({
                      id: 'events.chemical.form.reviewedBy',
                      defaultMessage: 'Reviewed By'
                    })}
                    helpText={intl.formatMessage({
                      id: 'events.chemical.form.reviewedByHelp',
                      defaultMessage: 'Supervisor who reviewed this record'
                    })}>
                    <Controller
                      name="reviewer_name"
                      control={methods.control}
                      render={({ field }) => (
                        <StandardInput
                          {...field}
                          placeholder={intl.formatMessage({
                            id: 'events.chemical.form.reviewedByPlaceholder',
                            defaultMessage: 'Reviewer name'
                          })}
                        />
                      )}
                    />
                  </StandardField>
                  <StandardField
                    label={intl.formatMessage({
                      id: 'events.chemical.form.reviewDate',
                      defaultMessage: 'Review Date'
                    })}>
                    <Controller
                      name="review_date"
                      control={methods.control}
                      render={({ field }) => <StandardInput {...field} type="date" />}
                    />
                  </StandardField>
                </SimpleGrid>
              </Box>

              {/* Phase 2: Universal Field Details - variety, block_id, growth_stage */}
              <SectionBox>
                <SectionHeader
                  icon={FaSeedling}
                  title={intl.formatMessage({ id: 'fieldDetails.title' })}
                  badge={intl.formatMessage({ id: 'fieldDetails.badge' })}
                  description={intl.formatMessage({ id: 'fieldDetails.description' })}
                />
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
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
                            id: 'events.chemical.form.growthStagePlaceholder',
                            defaultMessage: 'Select growth stage...'
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
                            {intl.formatMessage({ id: 'fieldDetails.growthStage.vegetative' })}
                          </option>
                          <option value="maturation">
                            {intl.formatMessage({ id: 'fieldDetails.growthStage.maturation' })}
                          </option>
                          <option value="harvest_ready">
                            {intl.formatMessage({ id: 'fieldDetails.growthStage.harvest_ready' })}
                          </option>
                          <option value="post_harvest">
                            {intl.formatMessage({ id: 'fieldDetails.growthStage.post_harvest' })}
                          </option>
                        </StandardSelect>
                      )}
                    />
                  </StandardField>
                </SimpleGrid>
              </SectionBox>

              {/* Section 5: Farmer's Field Notes */}
              <SectionBox>
                <SectionHeader
                  icon={FaSeedling}
                  title={intl.formatMessage({ id: 'events.section.fieldNotes' })}
                  badge={intl.formatMessage({ id: 'events.section.badge.certifierRecordAndBuyer' })}
                />
                <StandardField
                  label={intl.formatMessage({
                    id: 'events.chemical.form.observations',
                    defaultMessage: 'Observations & Notes'
                  })}
                  error={errors.observation?.message}
                  helpText={intl.formatMessage({ id: 'events.common.help.observationAudience' })}>
                  <Controller
                    name="observation"
                    control={methods.control}
                    render={({ field }) => (
                      <StandardTextarea
                        {...field}
                        placeholder={intl.formatMessage({
                          id: 'events.chemical.form.observationsPlaceholder',
                          defaultMessage:
                            'Optional: Describe the purpose of this chemical application, environmental conditions, safety measures taken, or any observations that consumers might find valuable.'
                        })}
                        rows={4}
                      />
                    )}
                  />
                  {/* Write-time hint, deliberately NOT a guarantee. The server redacts a
                      supplier name out of this box only when it matches a name recorded in a
                      supplier FIELD, on an exact word-boundary match — it cannot recognise an
                      abbreviation, a misspelling, or a supplier entered nowhere else. Saying so
                      while the farmer types is more honest than a promise the redactor cannot
                      keep, and it is the reason the privacy copy describes the match as a
                      safeguard rather than a removal guarantee. */}
                  <PublicNoteSupplierHint control={methods.control} />
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
              </SectionBox>
            </>

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
ChemicalTab.displayName = 'ChemicalTab';

export default ChemicalTab;
