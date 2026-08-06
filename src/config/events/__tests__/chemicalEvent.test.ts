/**
 * Chemical Event Registry Tests — Phase 3 PoC.
 *
 * Validates all 4 subtype-conditional patterns and the complete
 * Chemical field inventory against the registry.
 */

import { describe, expect, it } from 'vitest';

// Import triggers registry initialization
import { getFieldNamesForSurface, getFieldsForSurface, getPhotoTier } from '../index';

// ============================================================================
// Test data: representative Chemical events per subtype
// ============================================================================

const fertilizerEvent = {
  event_type: 2,
  type: 'FE',
  commercial_name: 'SuperGrow NPK',
  chemical_subtype: 'synthetic_fertilizer',
  concentration: '10-10-10',
  nitrogen_percentage: 10,
  phosphorus_percentage: 10,
  potassium_percentage: 10,
  volume_applied: 400,
  volume_unit: 'L',
  area_treated: 5,
  area_unit: 'ha',
  application_method: 'broadcast',
  is_fertigation: false,
  organic_approved: 'not_organic',
  observation: 'Applied early morning',
  application_fuel_type: 'diesel',
  application_fuel_consumed: 3.5,
  application_fuel_unit: 'gal'
};

const pesticideEvent = {
  event_type: 2,
  type: 'PE',
  commercial_name: 'BugStop Pro',
  chemical_subtype: 'synthetic_pesticide',
  target_pest_disease: 'Aphids',
  restricted_use_pesticide: true,
  applicator_name: 'John Doe',
  applicator_certification: 'CA-12345',
  epa_registration_number: '12345-67',
  rei_hours: 24,
  phi_days: 7,
  volume_applied: 200,
  volume_unit: 'L',
  area_treated: 10,
  area_unit: 'acres',
  application_method: 'ground_spray',
  organic_approved: 'not_organic',
  observation: 'Targeted application'
};

const pesticideEventNonRUP = {
  ...pesticideEvent,
  restricted_use_pesticide: false,
  applicator_name: '',
  applicator_certification: ''
};

const fungicideEvent = {
  event_type: 2,
  type: 'FU',
  commercial_name: 'Copper Shield',
  chemical_subtype: 'copper_fungicide',
  target_pest_disease: 'Downy Mildew',
  volume_applied: 150,
  volume_unit: 'L',
  area_treated: 3,
  area_unit: 'ha',
  application_method: 'ground_spray',
  organic_approved: 'omri_listed',
  application_timing: 'pre_plant'
};

const herbicideEvent = {
  event_type: 2,
  type: 'HE',
  commercial_name: 'WeedClear',
  chemical_subtype: 'synthetic_herbicide',
  target_pest_disease: 'Broadleaf weeds',
  volume_applied: 300,
  volume_unit: 'gal',
  area_treated: 20,
  area_unit: 'acres',
  application_method: 'ground_spray'
};

// ============================================================================
// Pattern 1: Simple subtype gate (FE-only fields)
// ============================================================================

describe('Chemical: FE-only fields (Pattern 1: simple subtype gate)', () => {
  it('shows NPK fields on modal for FE', () => {
    const result = getFieldsForSurface('chemical', 'FE', 'modal', fertilizerEvent);
    const fieldNames = [
      ...result.hero,
      ...result.immediate,
      ...result.secondary,
      ...result.details
    ].map((f) => f.name);
    expect(fieldNames).toContain('nitrogen_percentage');
  });

  it('hides NPK fields on modal for PE', () => {
    const result = getFieldsForSurface('chemical', 'PE', 'modal', pesticideEvent);
    const fieldNames = [
      ...result.hero,
      ...result.immediate,
      ...result.secondary,
      ...result.details
    ].map((f) => f.name);
    expect(fieldNames).not.toContain('nitrogen_percentage');
    expect(fieldNames).not.toContain('phosphorus_percentage');
    expect(fieldNames).not.toContain('potassium_percentage');
  });

  it('formats NPK as N-P-K ratio via groupWith', () => {
    const result = getFieldsForSurface('chemical', 'FE', 'modal', fertilizerEvent);
    const npkField = [...result.hero, ...result.immediate].find(
      (f) => f.name === 'nitrogen_percentage'
    );
    expect(npkField).toBeDefined();
    expect(npkField?.formattedValue).toBe('10-10-10');
  });

  it('shows is_fertigation only for FE', () => {
    const feNames = getFieldNamesForSurface('chemical', 'FE', 'modal');
    const peNames = getFieldNamesForSurface('chemical', 'PE', 'modal');
    expect(feNames).toContain('is_fertigation');
    expect(peNames).not.toContain('is_fertigation');
  });
});

// ============================================================================
// Pattern 2: Multi-subtype gate (PE, FU, HE fields)
// ============================================================================

describe('Chemical: Pest/disease fields (Pattern 2: multi-subtype gate)', () => {
  it('shows target_pest_disease for PE, FU, HE but not FE', () => {
    const peNames = getFieldNamesForSurface('chemical', 'PE', 'modal');
    const fuNames = getFieldNamesForSurface('chemical', 'FU', 'modal');
    const heNames = getFieldNamesForSurface('chemical', 'HE', 'modal');
    const feNames = getFieldNamesForSurface('chemical', 'FE', 'modal');

    expect(peNames).toContain('target_pest_disease');
    expect(fuNames).toContain('target_pest_disease');
    expect(heNames).toContain('target_pest_disease');
    expect(feNames).not.toContain('target_pest_disease');
  });

  it('shows application_timing for all chemical subtypes', () => {
    // FE included intentionally (chemicalEvent.ts): pre_plant / at_plant /
    // side_dress are valid fertilizer timings captured by the form.
    const peNames = getFieldNamesForSurface('chemical', 'PE', 'modal');
    const feNames = getFieldNamesForSurface('chemical', 'FE', 'modal');
    expect(peNames).toContain('application_timing');
    expect(feNames).toContain('application_timing');
  });

  it('shows restricted_use_pesticide for PE, FU, HE', () => {
    const peNames = getFieldNamesForSurface('chemical', 'PE', 'modal');
    const feNames = getFieldNamesForSurface('chemical', 'FE', 'modal');
    expect(peNames).toContain('restricted_use_pesticide');
    expect(feNames).not.toContain('restricted_use_pesticide');
  });
});

// ============================================================================
// Applicator tracking (NOP 7 CFR 205.103 — unconditional visibility)
// ============================================================================

describe('Chemical: Applicator tracking (NOP traceability)', () => {
  it('shows applicator fields when data is present (RUP=true)', () => {
    const result = getFieldsForSurface('chemical', 'PE', 'modal', pesticideEvent);
    const allNames = [
      ...result.hero,
      ...result.immediate,
      ...result.secondary,
      ...result.details
    ].map((f) => f.name);
    expect(allNames).toContain('applicator_name');
    expect(allNames).toContain('applicator_certification');
  });

  it('still surfaces applicator data on non-RUP organic applications', () => {
    // NOP 7 CFR 205.103 requires applicator traceability for ALL organic chemical
    // applications, not just restricted-use products. Populated applicator fields
    // must appear in the modal regardless of RUP status.
    const organicWithApplicator = {
      ...pesticideEventNonRUP,
      applicator_name: 'Miguel Ramirez',
      applicator_certification: 'CA QAL-4287'
    };
    const result = getFieldsForSurface('chemical', 'PE', 'modal', organicWithApplicator);
    const allNames = [
      ...result.hero,
      ...result.immediate,
      ...result.secondary,
      ...result.details
    ].map((f) => f.name);
    expect(allNames).toContain('applicator_name');
    expect(allNames).toContain('applicator_certification');
  });

  it('hides applicator fields when no data is entered (regardless of RUP)', () => {
    // Resolver skips fields whose formatted value is null/empty, so empty
    // applicator data stays out of the display — independent of RUP status.
    const result = getFieldsForSurface('chemical', 'PE', 'modal', pesticideEventNonRUP);
    const allNames = [
      ...result.hero,
      ...result.immediate,
      ...result.secondary,
      ...result.details
    ].map((f) => f.name);
    expect(allNames).not.toContain('applicator_name');
    expect(allNames).not.toContain('applicator_certification');
  });

  it('always shows REI/PHI (subtype-gated, not RUP-gated)', () => {
    const rup = getFieldsForSurface('chemical', 'PE', 'modal', pesticideEvent);
    const nonRup = getFieldsForSurface('chemical', 'PE', 'modal', pesticideEventNonRUP);
    const rupNames = [...rup.hero, ...rup.immediate, ...rup.secondary, ...rup.details].map(
      (f) => f.name
    );
    const nonRupNames = [
      ...nonRup.hero,
      ...nonRup.immediate,
      ...nonRup.secondary,
      ...nonRup.details
    ].map((f) => f.name);
    expect(rupNames).toContain('rei_hours');
    expect(rupNames).toContain('phi_days');
    expect(nonRupNames).toContain('rei_hours');
    expect(nonRupNames).toContain('phi_days');
  });
});

// ============================================================================
// Surface-specific field selection
// ============================================================================

describe('Chemical: Surface-specific field sets', () => {
  it('timeline shows exactly 3 fields (hero + immediate)', () => {
    const result = getFieldsForSurface('chemical', 'FE', 'timeline', fertilizerEvent);
    const total = result.hero.length + result.immediate.length;
    expect(total).toBe(3);
    expect(result.hero[0].name).toBe('commercial_name');
  });

  it('keeps per-event carbon fields off the consumer card entirely', () => {
    // Was: "consumer_card places carbon fields in details tier". The `details` tier was
    // REMOVED from consumer_card on 2026-07-31 — it rendered inside a second, collapsed
    // accordion two taps deep, which is where operator data hid rather than where carbon
    // got disclosed. Litres of diesel per spray is not a shopper's question; the page has a
    // dedicated Environmental Impact section for the production's carbon story.
    // The FTC constraint is unchanged and now absolute: never in hero, and now nowhere else
    // on this surface either.
    const result = getFieldsForSurface('chemical', 'FE', 'consumer_card', fertilizerEvent);
    const allNames = [
      ...result.hero,
      ...result.immediate,
      ...result.secondary,
      ...result.details
    ].map((f) => f.name);
    expect(allNames).not.toContain('application_fuel_type');
    expect(allNames).not.toContain('application_fuel_consumed');
    expect(result.details).toHaveLength(0);
  });

  it('still resolves carbon fields for the producer modal', () => {
    const result = getFieldsForSurface('chemical', 'FE', 'modal', fertilizerEvent);
    const names = [...result.hero, ...result.immediate, ...result.secondary, ...result.details].map(
      (f) => f.name
    );
    expect(names).toContain('application_fuel_type');
    expect(names).toContain('application_fuel_consumed');
  });

  it('modal shows all tiers', () => {
    const result = getFieldsForSurface('chemical', 'PE', 'modal', pesticideEvent);
    expect(result.hero.length).toBeGreaterThan(0);
    expect(result.immediate.length).toBeGreaterThan(0);
    expect(result.secondary.length).toBeGreaterThan(0);
  });

  it('form shows NPK as separate fields for FE', () => {
    const names = getFieldNamesForSurface('chemical', 'FE', 'form');
    expect(names).toContain('nitrogen_percentage');
    expect(names).toContain('phosphorus_percentage');
    expect(names).toContain('potassium_percentage');
  });
});

// ============================================================================
// FTC compliance
// ============================================================================

describe('Chemical: FTC compliance (carbon not in consumer hero)', () => {
  it('application_fuel fields NOT at hero/immediate on consumer surfaces', () => {
    const result = getFieldsForSurface('chemical', 'FE', 'consumer_card', fertilizerEvent);
    const heroImmediate = [...result.hero, ...result.immediate];
    const carbonFields = heroImmediate.filter((f) => f.isCarbonRelevant);
    expect(carbonFields).toHaveLength(0);
  });
});

// ============================================================================
// Photo tier
// ============================================================================

describe('Chemical: Photo tiers', () => {
  it('all subtypes are essential photo tier', () => {
    expect(getPhotoTier('chemical', 'FE')).toBe('essential');
    expect(getPhotoTier('chemical', 'PE')).toBe('essential');
    expect(getPhotoTier('chemical', 'FU')).toBe('essential');
    expect(getPhotoTier('chemical', 'HE')).toBe('essential');
  });
});

// ============================================================================
// Verification badges
// ============================================================================

describe('Chemical: Verification badges on consumer surfaces', () => {
  it('organic_approved has verification badge on consumer_card', () => {
    const result = getFieldsForSurface('chemical', 'FE', 'consumer_card', fertilizerEvent);
    const organic = [
      ...result.hero,
      ...result.immediate,
      ...result.secondary,
      ...result.details
    ].find((f) => f.name === 'organic_approved');
    expect(organic).toBeDefined();
    expect(organic?.requiresVerificationBadge).toBe(true);
  });

  it('REI/PHI still resolve for the producer after leaving the consumer card', () => {
    // The resolved `requiresVerificationBadge` is ANDed with the surface rule
    // (resolver.ts:229 — `field.requiresVerificationBadge && surfaceRule.requiresVerificationBadges`),
    // and `modal.requiresVerificationBadges` is false, so the flag is correctly false here.
    // Badges are a CONSUMER-surface concern; what matters on the producer surface is that
    // the fields are still captured and displayed at all.
    const result = getFieldsForSurface('chemical', 'PE', 'modal', pesticideEvent);
    const all = [...result.hero, ...result.immediate, ...result.secondary, ...result.details];
    expect(all.find((f) => f.name === 'phi_days')).toBeDefined();
    expect(all.find((f) => f.name === 'rei_hours')).toBeDefined();
  });
});

// ============================================================================
// Worker-protection / enforcement data must not reach a consumer surface
// ============================================================================

describe('Chemical: worker-safety and enforcement fields are certifier-only', () => {
  /**
   * INTENT REVERSAL, 2026-07-31 (Oscar's call during the consumer editorial review).
   *
   * This suite previously asserted that `phi_days` RESOLVED on `consumer_card`. That was a
   * deliberate choice at the time, so it is worth recording why it changed rather than
   * silently deleting the assertion.
   *
   * REI/PHI protect the workers who re-enter a treated field; applicator name/certification
   * and the EPA registration number identify a person and a regulated product to an
   * inspector; buffer distance is drift management; "restricted use" is a purchasing
   * licence class. None of them describe what is on the food a shopper is holding, and
   * several actively imply a consumer hazard they do not describe.
   *
   * The server already stripped all of them from the anonymous payload, so the registry
   * declarations never reached a real shopper. What they DID reach:
   *   - EventPreviewModal, which renders this card from unstripped form data under
   *     "How consumers will see this event" — showing growers fields consumers never saw;
   *   - the owner's own view of their QR page, which skips the strip.
   * Both lied to the farmer about their own product page, which is the opposite of the
   * point. See newCertifierFields.render.test.ts for the same pattern.
   *
   * Every field remains on modal + form and in the certifier NOP PDF.
   */
  const CERTIFIER_ONLY = [
    'rei_hours',
    'phi_days',
    'applicator_name',
    'applicator_certification',
    'epa_registration_number',
    'buffer_zone_meters',
    'restricted_use_pesticide'
  ];

  for (const subtype of ['PE', 'FU', 'HE'] as const) {
    it(`does not surface worker-safety/enforcement fields on consumer_card (${subtype})`, () => {
      const result = getFieldsForSurface('chemical', subtype, 'consumer_card', {
        ...pesticideEvent,
        restricted_use_pesticide: true,
        applicator_name: 'Ana Torres',
        applicator_certification: 'CA QAL-4287',
        epa_registration_number: '62719-621',
        rei_hours: 48,
        phi_days: 14,
        buffer_zone_meters: 30
      });
      const names = [
        ...result.hero,
        ...result.immediate,
        ...result.secondary,
        ...result.details
      ].map((f) => f.name);

      const leaked = CERTIFIER_ONLY.filter((n) => names.includes(n));
      expect(
        leaked,
        `worker-safety/enforcement fields reached the consumer card: ${leaked.join(', ')}`
      ).toEqual([]);
    });
  }

  it('still resolves them on the producer modal surface', () => {
    const result = getFieldsForSurface('chemical', 'PE', 'modal', {
      ...pesticideEvent,
      restricted_use_pesticide: true,
      applicator_name: 'Ana Torres',
      rei_hours: 48,
      phi_days: 14
    });
    const names = [...result.hero, ...result.immediate, ...result.secondary, ...result.details].map(
      (f) => f.name
    );
    for (const field of ['rei_hours', 'phi_days', 'applicator_name']) {
      expect(names, `${field} must remain available to the producer`).toContain(field);
    }
  });

  it('keeps the consumer-relevant chemical facts', () => {
    // Guard against over-removal: what was applied, to what, and whether it is
    // organic-approved is exactly what a shopper came for.
    const result = getFieldsForSurface('chemical', 'PE', 'consumer_card', pesticideEvent);
    const names = [...result.hero, ...result.immediate, ...result.secondary, ...result.details].map(
      (f) => f.name
    );
    expect(names).toContain('commercial_name');
    expect(names).toContain('organic_approved');
    expect(names).toContain('target_pest_disease');
  });
});
