/**
 * Trazo Event Field Registry — Core Types.
 *
 * Single source of truth for which fields render on which UI surfaces for
 * each event type × subtype combination. Consumers: EventDetailsModal,
 * ConsumerEventCard, EventPreviewModal, EnhancedTimelineRow, forms.
 *
 * Architecture:
 * - Layer A (API contract): auto-generated types in src/types/api.generated.ts
 *   from backend OpenAPI schema. Answers "what fields exist, what are their types?"
 * - Layer B (Display registry, THIS FILE): hand-authored. Answers "which fields
 *   show on which surface for which subtype, how formatted, what compliance rules?"
 *
 * Adding a new field:
 * 1. Add field to Django model + serializer
 * 2. Regenerate types: npm run typegen
 * 3. Add FieldConfig entry in the relevant src/config/events/<eventType>Event.ts
 * 4. That's it — all display components automatically pick it up.
 *
 * See CLAUDE.md "Event Field SSOT" section for migration plan and rationale.
 */

import type { ZodType } from 'zod';

// ============================================================================
// Event type & subtype codes (mirror backend history/constants.py)
// ============================================================================

/** Backend event_type code (matches trazo-back/history/constants.py) */
export type EventTypeCode = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Human-readable event type identifier */
export type EventTypeName =
  | 'weather' // 0
  | 'production' // 1
  | 'chemical' // 2
  | 'general' // 3
  | 'equipment' // 4
  | 'soil_management' // 5
  | 'pest_management' // 6
  | 'business'; // 7

export const EVENT_TYPE_CODE_TO_NAME: Readonly<Record<EventTypeCode, EventTypeName>> = {
  0: 'weather',
  1: 'production',
  2: 'chemical',
  3: 'general',
  4: 'equipment',
  5: 'soil_management',
  6: 'pest_management',
  7: 'business'
} as const;

export const EVENT_TYPE_NAME_TO_CODE: Readonly<Record<EventTypeName, EventTypeCode>> = {
  weather: 0,
  production: 1,
  chemical: 2,
  general: 3,
  equipment: 4,
  soil_management: 5,
  pest_management: 6,
  business: 7
} as const;

// ----- Subtype literal unions (narrow strings from Django models) -----

export type WeatherSubtype = 'FR' | 'DR' | 'HL' | 'HT' | 'TS' | 'HW' | 'HH' | 'LH';

export type ProductionSubtype =
  | 'PL' // Planting
  | 'HA' // Harvesting
  | 'IR' // Irrigation
  | 'PR' // Pruning
  | 'TR' // Transplanting
  | 'EM' // Equipment Maintenance
  | 'CU' // Cultivation
  | 'TH' // Thinning
  | 'PO' // Pollination
  | 'PH' // Post-Harvest
  | 'CM' // Canopy Management
  | 'FP' // Frost Protection (Batch 3, 2026-06)
  | 'MO'; // Mowing / Orchard-Floor (Batch 3, 2026-06)

export type ChemicalSubtype = 'FE' | 'PE' | 'FU' | 'HE';

export type EquipmentSubtype = 'MN' | 'RE' | 'CA' | 'FC' | 'BD' | 'EI';

export type SoilManagementSubtype =
  | 'ST'
  | 'PA'
  | 'OM'
  | 'CC'
  | 'TI'
  | 'CO'
  | 'GR'
  | 'HD'
  | 'NS'
  | 'LA';

export type PestManagementSubtype = 'SC' | 'BR' | 'TM' | 'PI' | 'TA' | 'IP' | 'CU';

export type BusinessSubtype = 'CE' | 'CM' | 'IN';

/** General events have no subtypes (free-form activity logging) */
export type GeneralSubtype = null;

/** Union of all subtypes across all event types */
export type AnySubtype =
  | WeatherSubtype
  | ProductionSubtype
  | ChemicalSubtype
  | EquipmentSubtype
  | SoilManagementSubtype
  | PestManagementSubtype
  | BusinessSubtype
  | null;

// ============================================================================
// Display surfaces & priority tiers
// ============================================================================

/**
 * Where a field can render. Each surface has distinct display constraints:
 * - timeline: compact 3-field producer dashboard row
 * - card: producer dashboard card (medium density)
 * - modal: full producer detail modal (all fields)
 * - form: Manual Event input form (create/edit)
 * - quick_form: Quick Event input form (subset with defaults)
 * - preview: EventPreviewModal during creation (producer reviewing)
 * - consumer_card: Consumer QR event card (FTC-constrained)
 * - consumer_timeline: "How it was grown" consumer timeline
 */
export type DisplaySurface =
  | 'timeline'
  | 'card'
  | 'modal'
  | 'form'
  | 'quick_form'
  | 'preview'
  | 'consumer_card'
  | 'consumer_timeline';

/**
 * Visual hierarchy tier — maps to StandardComponents section.
 * - hero: above-the-fold, always-visible (e.g., commercial_name)
 * - immediate: "Key Details" section, typically 3-6 fields
 * - secondary: "Technical Details" section, compliance/EPA fields
 * - details: "Learn More" expander, verbose metadata
 */
export type PriorityTier = 'hero' | 'immediate' | 'secondary' | 'details';

/**
 * Photo requirement tier from transparency_calculator.py.
 * Essential events lose up to 50% of their transparency score without photos,
 * recommended lose up to 25%, optional have no penalty.
 */
export type PhotoTier = 'essential' | 'recommended' | 'optional';

// ============================================================================
// Field configuration
// ============================================================================

/**
 * Predicate function evaluated at render-time to decide if a field is visible.
 * Receives the full event object (plus form state for forms) to enable
 * cross-field conditionals like "show REI only if restricted_use_pesticide=true".
 */
export type VisibilityPredicate<T extends Record<string, unknown> = Record<string, unknown>> = (
  event: T
) => boolean;

/**
 * Formatter transforms a raw field value into a display string.
 * Receives the full event so it can reference related fields
 * (e.g., rendering volume+volume_unit as "400 gal").
 */
export type FieldFormatter<
  TValue = unknown,
  TEvent extends Record<string, unknown> = Record<string, unknown>
> = (
  value: TValue,
  event: TEvent,
  intl?: {
    formatNumber: (n: number, options?: Intl.NumberFormatOptions) => string;
    formatMessage: (msg: { id: string; defaultMessage?: string }) => string;
  }
) => string | null;

/**
 * Narrow value type — maps to form input widget and TypeScript runtime shape.
 */
export type FieldValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'date'
  | 'date-time'
  | 'text';

/**
 * Single field configuration — one entry per field per event type.
 * All display, formatting, validation, and compliance metadata lives here.
 */
export interface FieldConfig<
  TValue = unknown,
  TEvent extends Record<string, unknown> = Record<string, unknown>
> {
  /** Backend field name (snake_case, matches serializer output). SSOT link. */
  name: string;

  /** i18n message keys (never hardcoded strings) */
  labelKey: string;
  /**
   * Optional label used ONLY on consumer-facing surfaces (`consumer_card`,
   * `consumer_timeline`, `preview`). Falls back to `labelKey` when absent.
   *
   * Producers and shoppers need different words for the same field, and `labelKey` alone
   * forced one to lose. "Target Pest / Disease" is exactly right on the spray form — it is
   * the grower's and the certifier's vocabulary — and near-meaningless on a shopper's card,
   * where the honest phrasing is "What it protects against". Rewriting the shared label to
   * suit the shopper would have degraded the form the farmer fills in every week.
   *
   * Use this ONLY where the audiences genuinely need different words. Most fields should
   * keep one label for everyone.
   */
  consumerLabelKey?: string;
  helpKey?: string;
  tooltipKey?: string;
  placeholderKey?: string;

  /** Runtime value shape */
  valueType: FieldValueType;

  /** For valueType='enum', references a shared enum options key (see enums.ts) */
  enumSource?: string;

  // --- Subtype-conditional visibility ---
  /**
   * Absent → field shown for ALL subtypes of this event type.
   * Present → field shown only when event subtype is in this array.
   * Example: NPK fields only for chemical subtype 'FE' (Fertilizer).
   */
  visibleForSubtypes?: readonly AnySubtype[];

  /**
   * Custom predicate for cross-field dependencies, summary-mode toggles, etc.
   * Evaluated AFTER visibleForSubtypes check (both must pass).
   * Example: `(e) => e.restricted_use_pesticide === true` for applicator_certification.
   */
  visibleWhen?: VisibilityPredicate<TEvent>;

  // --- Per-surface display config ---
  /**
   * Which surfaces this field renders on + what tier.
   * Omission from a surface's key = field not shown there.
   * Example: { form: 'immediate', modal: 'secondary', consumer_card: 'secondary' }
   *
   * NOTE: `consumer_card` supports hero | immediate | secondary only — it has NO `details`
   * tier (removed 2026-07-31). The resolver silently skips a tier a surface does not allow,
   * so `consumer_card: 'details'` renders nowhere. See surfaces.ts and ADDING_FIELDS.md.
   */
  surfaces: Partial<Record<DisplaySurface, PriorityTier>>;

  // --- Compliance & transparency enforcement ---
  /**
   * True = field contains carbon data (CO2e, emissions, fuel amounts that
   * imply carbon values). FTC/EU ECGT: must NOT appear at 'hero' tier on
   * consumer_card/consumer_timeline surfaces. Enforced statically by
   * surfaces.ts CI assertion.
   */
  carbonRelevant?: boolean;

  /**
   * True = claim requires third-party verification to display without
   * disclaimer. Consumer surfaces render a "self-reported" badge next to
   * non-verified claims.
   */
  requiresVerificationBadge?: boolean;

  // --- Formatting ---
  /** Custom value-to-string formatter */
  formatter?: FieldFormatter<TValue, TEvent>;

  /**
   * Optional formatter used ONLY on consumer-facing surfaces; falls back to `formatter`.
   *
   * The companion to `consumerLabelKey`, for cases where the VALUE — not just the label —
   * means something different to a shopper. "Grade B" is the motivating case: to a grower and
   * a buyer it is a precise size/appearance sorting class, and to a shopper it reads as
   * "this food is second-rate", which is both wrong and actively harmful to the farmer whose
   * page it is.
   *
   * Returns ENGLISH, like every other registry formatter (the resolver has no `intl`), and is
   * translated downstream by `localizeFieldValue` / `FIELD_VALUE_ES`. Any string added here
   * MUST get a matching es entry in utils/fieldValues.es.ts or the Spanish page shows English.
   */
  consumerFormatter?: FieldFormatter<TValue, TEvent>;

  /** Companion unit field (e.g., 'volume_numeric' pairs with 'volume_unit') */
  unitField?: string;

  /**
   * Fields rendered atomically with this one (e.g., NPK: nitrogen/phosphorus/potassium).
   * When set, the group is rendered by a single formatter and the other fields
   * are automatically hidden from their own render slots.
   */
  groupWith?: readonly string[];

  /** Show only when another field has a specific value */
  dependsOn?: { field: string; equals: unknown };

  // --- Form validation (form + quick_form surfaces only) ---
  validation?: ZodType<TValue>;

  /**
   * boolean = always required/optional
   * function = required when predicate returns true (e.g., required for summary mode)
   */
  required?: boolean | VisibilityPredicate<TEvent>;
}

// ============================================================================
// Computed fields (derived from other field values)
// ============================================================================

/**
 * Computed field configuration. Identical to FieldConfig but value is
 * calculated from other event data rather than stored.
 * Example: yield_per_hectare = yield_quantity / area_covered.
 */
export interface ComputedFieldConfig<
  TEvent extends Record<string, unknown> = Record<string, unknown>
> extends Omit<FieldConfig, 'name' | 'valueType' | 'validation' | 'required' | 'formatter'> {
  name: string;
  valueType: 'string' | 'number';
  compute: (event: TEvent) => number | string | null;
  formatter?: FieldFormatter<number | string | null, TEvent>;
}

// ============================================================================
// Event-level registry entry
// ============================================================================

/** Subtype enum entry (code + i18n label) */
export interface SubtypeEntry<TSubtype extends AnySubtype = AnySubtype> {
  code: TSubtype;
  labelKey: string;
  /** Per-subtype photo tier from transparency_calculator */
  photoTier: PhotoTier;
}

/**
 * Complete configuration for a single event type.
 * One EventRegistryEntry per file in src/config/events/<eventType>Event.ts.
 */
export interface EventRegistryEntry<
  TSubtype extends AnySubtype = AnySubtype,
  TEvent extends Record<string, unknown> = Record<string, unknown>
> {
  /** Backend event_type code */
  eventType: EventTypeCode;
  /** Human-readable name */
  eventTypeName: EventTypeName;
  /** i18n key for the event type display name */
  labelKey: string;
  /** All subtypes for this event type */
  subtypes: readonly SubtypeEntry<TSubtype>[];
  /**
   * Default photo tier when subtype has no specific tier defined.
   * Used as fallback; per-subtype tier in SubtypeEntry takes precedence.
   */
  defaultPhotoTier: PhotoTier;
  /** Ordered list of all fields (renders respect this order within each tier) */
  fields: readonly FieldConfig<unknown, TEvent>[];
  /** Computed/derived fields (rendered after real fields) */
  computedFields?: readonly ComputedFieldConfig<TEvent>[];
}

/**
 * Top-level registry: name → entry.
 * Populated in src/config/events/index.ts by importing individual event modules.
 */
export type EventRegistry = Readonly<Record<EventTypeName, EventRegistryEntry>>;

// ============================================================================
// Resolver result types
// ============================================================================

/** A single field ready to render (resolved from registry + event data) */
export interface ResolvedField {
  name: string;
  labelKey: string;
  helpKey?: string;
  tier: PriorityTier;
  formattedValue: string | null;
  rawValue: unknown;
  isCarbonRelevant: boolean;
  requiresVerificationBadge: boolean;
  group?: readonly string[];
}

/** Ordered result of getFieldsForSurface — grouped by tier */
export interface ResolvedFieldSet {
  hero: ResolvedField[];
  immediate: ResolvedField[];
  secondary: ResolvedField[];
  details: ResolvedField[];
}
