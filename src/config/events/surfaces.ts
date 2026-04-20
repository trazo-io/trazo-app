/**
 * Display Surface Rules & Compliance Guards.
 *
 * Defines per-surface constraints on field visibility and enforces
 * Trazo's Sustainability Compliance Rules (CLAUDE.md §Sustainability Compliance).
 *
 * Key invariants enforced:
 * 1. FTC Green Guides (16 CFR 260): carbon-relevant fields cannot appear at
 *    'hero' tier on consumer surfaces without a verified audit badge.
 * 2. EU ECGT (Directive 2024/825): transparency score is self-reported; must
 *    not masquerade as third-party verified.
 * 3. Transparency-first: consumer surfaces lead with transparency metrics,
 *    carbon data stays in expandable secondary/details tiers.
 */

import type { DisplaySurface, PriorityTier } from './registry';

// ============================================================================
// Surface capability rules
// ============================================================================

/** Per-surface configuration */
export interface SurfaceRule {
  /** Max number of fields to render at this surface (safety net for UI density) */
  maxFields: number;
  /** Tiers this surface supports, in render order */
  allowedTiers: readonly PriorityTier[];
  /** True if this surface is shown to consumers (not producers) */
  isConsumerFacing: boolean;
  /** True if carbon-relevant fields are allowed at `hero` tier (false for consumer surfaces per FTC) */
  allowsHeroCarbon: boolean;
  /** True if verification badges must be rendered next to self-reported fields */
  requiresVerificationBadges: boolean;
  /** True if field labels support full i18n (form surfaces use more condensed labels) */
  supportsFullLabels: boolean;
}

export const DISPLAY_SURFACE_RULES: Readonly<Record<DisplaySurface, SurfaceRule>> = {
  // --- Producer surfaces ---
  timeline: {
    maxFields: 3,
    allowedTiers: ['hero', 'immediate'],
    isConsumerFacing: false,
    allowsHeroCarbon: true,
    requiresVerificationBadges: false,
    supportsFullLabels: false
  },
  card: {
    maxFields: 8,
    allowedTiers: ['hero', 'immediate'],
    isConsumerFacing: false,
    allowsHeroCarbon: true,
    requiresVerificationBadges: false,
    supportsFullLabels: true
  },
  modal: {
    maxFields: 50,
    allowedTiers: ['hero', 'immediate', 'secondary', 'details'],
    isConsumerFacing: false,
    allowsHeroCarbon: true,
    requiresVerificationBadges: false,
    supportsFullLabels: true
  },
  // --- Form surfaces ---
  form: {
    maxFields: 50,
    allowedTiers: ['hero', 'immediate', 'secondary', 'details'],
    isConsumerFacing: false,
    allowsHeroCarbon: true,
    requiresVerificationBadges: false,
    supportsFullLabels: true
  },
  quick_form: {
    maxFields: 15,
    allowedTiers: ['hero', 'immediate', 'secondary'],
    isConsumerFacing: false,
    allowsHeroCarbon: true,
    requiresVerificationBadges: false,
    supportsFullLabels: true
  },
  preview: {
    maxFields: 30,
    allowedTiers: ['hero', 'immediate', 'secondary', 'details'],
    // Preview is what producer sees about consumer — apply consumer rules
    isConsumerFacing: true,
    allowsHeroCarbon: false,
    requiresVerificationBadges: true,
    supportsFullLabels: true
  },
  // --- Consumer surfaces (FTC-constrained) ---
  consumer_card: {
    // Bumped from 20 → 30: Chemical events can resolve 22+ fields when all NOP
    // compliance + carbon tracking data is populated. The prior limit silently
    // dropped application_fuel_type/consumed (carbon-relevant details tier)
    // because hero `commercial_name` and filtered-out `observation` still count
    // toward the total even though they render outside the field list.
    maxFields: 30,
    allowedTiers: ['hero', 'immediate', 'secondary', 'details'],
    isConsumerFacing: true,
    allowsHeroCarbon: false, // FTC: carbon in expandable details, not hero
    requiresVerificationBadges: true,
    supportsFullLabels: true
  },
  consumer_timeline: {
    maxFields: 5,
    allowedTiers: ['hero', 'immediate'],
    isConsumerFacing: true,
    allowsHeroCarbon: false,
    requiresVerificationBadges: true,
    supportsFullLabels: false
  }
} as const;

// ============================================================================
// Compliance validation (runs at module load — fails fast on violations)
// ============================================================================

/**
 * Static assertion that a field configuration respects surface rules.
 * Called during registry load to catch FTC violations at dev/build time,
 * not production runtime.
 */
export interface FieldSurfaceDecl {
  name: string;
  tier: PriorityTier;
  carbonRelevant: boolean;
}

/**
 * Validate that a field's per-surface tier assignment respects compliance rules.
 * Returns violation message if rules are broken, null otherwise.
 */
export function validateFieldSurface(
  fieldName: string,
  surface: DisplaySurface,
  tier: PriorityTier,
  carbonRelevant: boolean
): string | null {
  const rule = DISPLAY_SURFACE_RULES[surface];

  // Tier allowed on this surface?
  if (!rule.allowedTiers.includes(tier)) {
    return (
      `Field "${fieldName}" declares tier "${tier}" on surface "${surface}", ` +
      `but this surface only supports tiers: [${rule.allowedTiers.join(', ')}]`
    );
  }

  // FTC: carbon at hero on consumer surface?
  if (tier === 'hero' && carbonRelevant && !rule.allowsHeroCarbon) {
    return (
      `FTC VIOLATION: Field "${fieldName}" is carbon-relevant and declared at ` +
      `tier "hero" on consumer surface "${surface}". Per FTC Green Guides (16 CFR 260), ` +
      `carbon data must appear in expandable secondary/details tiers on consumer displays. ` +
      `See CLAUDE.md §Sustainability Compliance.`
    );
  }

  return null;
}

/**
 * Batch-validate a list of field declarations.
 * Throws AggregateError with all violations if any rule is broken.
 * Called by registry loaders at module initialization time.
 */
export function assertFieldSurfaceCompliance(
  decls: readonly FieldSurfaceDecl[],
  eventTypeName: string
): void {
  const violations: string[] = [];

  for (const decl of decls) {
    for (const [surface, tier] of Object.entries(
      // decl carries surface→tier map via declaration — iterate
      // This is called from EventRegistryEntry loaders passing expanded decls
      (decl as unknown as { surfaces?: Partial<Record<DisplaySurface, PriorityTier>> }).surfaces ??
        {}
    )) {
      const violation = validateFieldSurface(
        decl.name,
        surface as DisplaySurface,
        tier,
        decl.carbonRelevant
      );
      if (violation) {
        violations.push(violation);
      }
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `[Event Registry] ${violations.length} compliance violation(s) in "${eventTypeName}":\n` +
        violations.map((v, i) => `  ${i + 1}. ${v}`).join('\n')
    );
  }
}

// ============================================================================
// Helpers
// ============================================================================

export function isConsumerSurface(surface: DisplaySurface): boolean {
  return DISPLAY_SURFACE_RULES[surface].isConsumerFacing;
}

export function isProducerSurface(surface: DisplaySurface): boolean {
  return !DISPLAY_SURFACE_RULES[surface].isConsumerFacing;
}

export function getSurfaceMaxFields(surface: DisplaySurface): number {
  return DISPLAY_SURFACE_RULES[surface].maxFields;
}

export function getSurfaceAllowedTiers(surface: DisplaySurface): readonly PriorityTier[] {
  return DISPLAY_SURFACE_RULES[surface].allowedTiers;
}
