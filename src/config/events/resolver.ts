/**
 * Event Field Registry — Resolver (Consumer API).
 *
 * The main API that display components use to query which fields to render.
 * All UI code (EventDetailsModal, ConsumerEventCard, EventPreviewModal,
 * EnhancedTimelineRow, forms) should go through these functions — never
 * reach directly into the registry data.
 *
 * Example usage:
 *   const fields = getFieldsForSurface('chemical', 'FE', 'modal', event);
 *   // Returns: { hero: [...], immediate: [...], secondary: [...], details: [...] }
 */

import { getEnumLabel } from './enums';
import type { EnumSourceKey } from './enums';
import { defaultFormatter } from './formatters';
import type {
  AnySubtype,
  DisplaySurface,
  EventRegistry,
  EventRegistryEntry,
  EventTypeCode,
  EventTypeName,
  FieldConfig,
  PhotoTier,
  PriorityTier,
  ResolvedField,
  ResolvedFieldSet
} from './registry';
import { EVENT_TYPE_CODE_TO_NAME } from './registry';
import { DISPLAY_SURFACE_RULES } from './surfaces';

// ============================================================================
// Internal registry reference (populated by index.ts barrel)
// ============================================================================

let _registry: EventRegistry | null = null;

/**
 * Register the event registry. Called once by index.ts at app startup.
 * Keeps the registry data structure out of this module so resolver.ts
 * has no circular dependencies.
 */
export function _setRegistry(registry: EventRegistry): void {
  _registry = registry;
}

function getRegistry(): EventRegistry {
  if (!_registry) {
    throw new Error(
      '[Event Registry] Registry not initialized. ' +
        'Make sure src/config/events/index.ts is imported before calling resolver functions.'
    );
  }
  return _registry;
}

// ============================================================================
// Resolution helpers (pure functions)
// ============================================================================

/** Convert event_type code to name (used when event only has numeric code) */
export function eventTypeFromCode(code: EventTypeCode): EventTypeName {
  return EVENT_TYPE_CODE_TO_NAME[code];
}

/**
 * Get registry entry for an event type.
 * Accepts either name ('chemical') or numeric code (2).
 */
export function getRegistryEntry(
  eventType: EventTypeName | EventTypeCode
): EventRegistryEntry | null {
  const registry = getRegistry();
  const name = typeof eventType === 'number' ? EVENT_TYPE_CODE_TO_NAME[eventType] : eventType;
  return registry[name] ?? null;
}

/**
 * Check if a field should be visible for the given event + subtype.
 * Runs subtype gate → predicate gate → dependency gate.
 */
export function isFieldVisible(
  field: FieldConfig,
  subtype: AnySubtype | undefined,
  event: Record<string, unknown>
): boolean {
  // Subtype gate
  if (field.visibleForSubtypes && field.visibleForSubtypes.length > 0) {
    if (subtype == null || !field.visibleForSubtypes.includes(subtype)) {
      return false;
    }
  }

  // Predicate gate (cross-field / mode toggles)
  if (field.visibleWhen) {
    try {
      if (!field.visibleWhen(event)) return false;
    } catch {
      // If predicate throws, field is hidden (safe default)
      return false;
    }
  }

  // Dependency gate
  if (field.dependsOn) {
    if (event[field.dependsOn.field] !== field.dependsOn.equals) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a field should render on a specific surface.
 * Combines surface membership + visibility gates.
 */
export function isFieldOnSurface(
  field: FieldConfig,
  surface: DisplaySurface,
  subtype: AnySubtype | undefined,
  event: Record<string, unknown>
): boolean {
  const tier = field.surfaces[surface];
  if (!tier) return false;

  // Surface-allowed tier check
  const surfaceRule = DISPLAY_SURFACE_RULES[surface];
  if (!surfaceRule.allowedTiers.includes(tier)) return false;

  return isFieldVisible(field, subtype, event);
}

// ============================================================================
// Main API: get fields for a specific surface
// ============================================================================

/**
 * Get ordered, tier-grouped list of fields to render on a surface.
 *
 * @param eventType Event type name ('chemical') or numeric code (2)
 * @param subtype Event subtype (e.g., 'FE' for fertilizer). Use undefined/null
 *                for event types without subtypes (GeneralEvent).
 * @param surface Display surface ('modal', 'consumer_card', etc.)
 * @param event Full event data object (used for conditional visibility + formatting)
 * @returns Fields grouped by tier, in registry order within each tier.
 *
 * Example:
 *   const { hero, immediate, secondary, details } = getFieldsForSurface(
 *     'chemical', 'FE', 'modal', event
 *   );
 */
/**
 * Translate an i18n message id. Supplied by `useEventFields` (which has `useIntl`), so the
 * resolver stays a pure module with no React dependency.
 */
export type TranslateFn = (id: string) => string | null;

export function getFieldsForSurface(
  eventType: EventTypeName | EventTypeCode,
  subtype: AnySubtype | undefined,
  surface: DisplaySurface,
  event: Record<string, unknown>,
  translate?: TranslateFn
): ResolvedFieldSet {
  const entry = getRegistryEntry(eventType);
  if (!entry) {
    return { hero: [], immediate: [], secondary: [], details: [] };
  }

  const surfaceRule = DISPLAY_SURFACE_RULES[surface];
  const buckets: ResolvedFieldSet = { hero: [], immediate: [], secondary: [], details: [] };

  // Track fields already consumed by groupWith (render once via their anchor)
  const consumedByGroup = new Set<string>();

  for (const field of entry.fields) {
    // Skip if already rendered as part of a group
    if (consumedByGroup.has(field.name)) continue;

    if (!isFieldOnSurface(field, surface, subtype, event)) continue;

    const tier = field.surfaces[surface];
    if (!tier || !surfaceRule.allowedTiers.includes(tier)) continue;

    // Mark group members as consumed (they're rendered via this field's formatter)
    // Exception: on form/quick_form surfaces, each field renders as its own input
    const isFormSurface = surface === 'form' || surface === 'quick_form';
    if (!isFormSurface && field.groupWith && field.groupWith.length > 0) {
      for (const name of field.groupWith) {
        consumedByGroup.add(name);
      }
    }

    // Resolve from the top-level field, falling back to extra_data — many fields (cover_crop_species,
    // habitat species_planted / wildlife_observed / structure_notes, etc.) are persisted inside
    // extra_data, not as model columns. Without this fallback those never render on the card.
    const extraData =
      event.extra_data && typeof event.extra_data === 'object' ? event.extra_data : {};
    const rawValue = event[field.name] ?? extraData[field.name];
    let formattedValue: string | null;

    // For enum fields: use custom formatter if available, otherwise capitalize and humanize
    // Consumer surfaces may re-voice the VALUE, not just the label — see
    // FieldConfig.consumerFormatter. Falls back to the shared formatter when absent.
    const activeFormatter =
      surfaceRule.isConsumerFacing && field.consumerFormatter
        ? field.consumerFormatter
        : field.formatter;

    if (field.valueType === 'enum' && typeof rawValue === 'string' && activeFormatter) {
      formattedValue = activeFormatter(rawValue, event);
    } else if (field.valueType === 'enum' && typeof rawValue === 'string') {
      // 🔴 2026-08-15: this branch used to ONLY de-underscore-and-capitalise, because
      // `enumSource` was never read here — its sole consumer was RegistryFormField, i.e. the
      // <option> elements. So every enum that did not declare a bespoke `formatter` rendered
      // as a slug on the detail modal and the consumer card:
      //
      //   seed_certification_status "non_organic_untreated" -> "Non Organic Untreated"
      //   seed_nonavailability_reason "quantity"            -> "Quantity"
      //   seeds_source "farm_saved"                          -> "Farm Saved"
      //
      // The authored labels existed and were translated in BOTH locales the whole time; they
      // simply never reached a display surface. "Seed Nonavailability Reason: Quantity" is the
      // sharpest case — the entire point of that field is to state a statutory ground under
      // § 205.2 (form / quality / quantity), and the bare word states none of it.
      const labelKey = field.enumSource
        ? getEnumLabel(field.enumSource as EnumSourceKey, rawValue)
        : null;
      const translated = labelKey && translate ? translate(labelKey) : null;
      formattedValue =
        translated ||
        rawValue
          .split('_')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
    } else if (activeFormatter) {
      formattedValue = activeFormatter(rawValue, event);
    } else {
      formattedValue = defaultFormatter(rawValue, event);
      // Auto-capitalize short string values that look like raw enum keys (e.g., "loam" → "Loam", "manure" → "Manure")
      if (
        formattedValue &&
        typeof rawValue === 'string' &&
        rawValue.length < 50 &&
        rawValue === rawValue.toLowerCase()
      ) {
        formattedValue = rawValue.charAt(0).toUpperCase() + rawValue.slice(1).replace(/_/g, ' ');
      }
    }

    // Skip null/empty formatted values (nothing to render)
    if (formattedValue == null || formattedValue === '') continue;

    const resolved: ResolvedField = {
      name: field.name,
      // Consumer surfaces get `consumerLabelKey` when the field defines one — producers and
      // shoppers need different words for the same data (see FieldConfig.consumerLabelKey).
      // `surfaceRule.isConsumerFacing` is the existing switch, so this follows whatever
      // surfaces.ts already classifies as consumer-facing rather than hardcoding a list.
      labelKey:
        surfaceRule.isConsumerFacing && field.consumerLabelKey
          ? field.consumerLabelKey
          : field.labelKey,
      helpKey: field.helpKey,
      tier,
      formattedValue,
      rawValue,
      isCarbonRelevant: field.carbonRelevant === true,
      requiresVerificationBadge:
        field.requiresVerificationBadge === true && surfaceRule.requiresVerificationBadges,
      group: field.groupWith
    };

    buckets[tier].push(resolved);
  }

  // Enforce maxFields limit (drop from lowest tier first)
  const total =
    buckets.hero.length +
    buckets.immediate.length +
    buckets.secondary.length +
    buckets.details.length;
  if (total > surfaceRule.maxFields) {
    const tierOrder: PriorityTier[] = ['details', 'secondary', 'immediate', 'hero'];
    let overflow = total - surfaceRule.maxFields;
    for (const tier of tierOrder) {
      if (overflow <= 0) break;
      const bucket = buckets[tier];
      const removeCount = Math.min(overflow, bucket.length);
      bucket.splice(bucket.length - removeCount, removeCount);
      overflow -= removeCount;
    }
  }

  return buckets;
}

// ============================================================================
// Secondary API: specific queries
// ============================================================================

/**
 * Get just the field names (no values) that would render on a surface.
 * Useful for form component rendering where you don't have event data yet.
 */
export function getFieldNamesForSurface(
  eventType: EventTypeName | EventTypeCode,
  subtype: AnySubtype | undefined,
  surface: DisplaySurface
): string[] {
  const entry = getRegistryEntry(eventType);
  if (!entry) return [];

  const result: string[] = [];
  const consumedByGroup = new Set<string>();

  for (const field of entry.fields) {
    if (consumedByGroup.has(field.name)) continue;
    if (!field.surfaces[surface]) continue;

    // Apply only subtype gate (no event data for form rendering)
    if (field.visibleForSubtypes && field.visibleForSubtypes.length > 0) {
      if (subtype == null || !field.visibleForSubtypes.includes(subtype)) continue;
    }

    result.push(field.name);
    // Don't consume group members on form surfaces (each needs own input)
    const isFormSurface = surface === 'form' || surface === 'quick_form';
    if (!isFormSurface && field.groupWith) {
      for (const name of field.groupWith) consumedByGroup.add(name);
    }
  }

  return result;
}

/**
 * Get the photo tier for an event subtype.
 * Determines transparency score photo penalty (essential = -50%, recommended = -25%, optional = 0%).
 */
export function getPhotoTier(
  eventType: EventTypeName | EventTypeCode,
  subtype: AnySubtype | undefined
): PhotoTier {
  const entry = getRegistryEntry(eventType);
  if (!entry) return 'optional';

  if (subtype != null) {
    const subtypeEntry = entry.subtypes.find((s) => s.code === subtype);
    if (subtypeEntry) return subtypeEntry.photoTier;
  }

  return entry.defaultPhotoTier;
}

/**
 * Look up a single FieldConfig by name within an event type's registry.
 */
export function getFieldConfig(
  eventType: EventTypeName | EventTypeCode,
  fieldName: string
): FieldConfig | null {
  const entry = getRegistryEntry(eventType);
  if (!entry) return null;
  return entry.fields.find((f) => f.name === fieldName) ?? null;
}

/**
 * Format a single field value using its registered formatter.
 * Convenience wrapper for display components that need ad-hoc formatting.
 */
export function formatFieldValue(
  eventType: EventTypeName | EventTypeCode,
  fieldName: string,
  event: Record<string, unknown>
): string | null {
  const field = getFieldConfig(eventType, fieldName);
  if (!field) return null;
  const fmt = field.formatter ?? defaultFormatter;
  return fmt(event[fieldName], event);
}

/**
 * Get the list of subtypes for an event type.
 */
export function getSubtypes(eventType: EventTypeName | EventTypeCode) {
  const entry = getRegistryEntry(eventType);
  return entry ? entry.subtypes : [];
}

/**
 * Check if the registry has been initialized (useful for tests / defensive coding).
 */
export function isRegistryInitialized(): boolean {
  return _registry !== null;
}
