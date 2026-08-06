/**
 * Producers and shoppers get DIFFERENT words for the same field. Both must keep working.
 *
 * `labelKey` alone forced one audience to lose. "Target Pest / Disease" is exactly right on
 * the spray form — it is the grower's and the certifier's vocabulary, and it is what the CA
 * PUR record calls it — and near-meaningless to someone holding a bag of avocados. Rewriting
 * the shared label to suit the shopper would have quietly degraded the form the farmer fills
 * in every week.
 *
 * So `FieldConfig` gained `consumerLabelKey` (label) and `consumerFormatter` (value), applied
 * by the resolver when `surfaceRule.isConsumerFacing`. This test pins both directions: the
 * shopper wording appears on consumer surfaces, and the producer wording survives on the form
 * and modal. Without it, a future "let's simplify to one label" refactor silently damages one
 * of the two audiences, and whichever one is not being looked at that day loses.
 *
 * The `grade_b` case is the reason this matters beyond tidiness: "Grade B" is a size and
 * appearance sorting class, but on a consumer card it reads as "this food is second-rate" —
 * untrue, and damaging to the farmer whose page it is.
 */
import { describe, it, expect } from 'vitest';

import { getFieldsForSurface } from '../index';
import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';

const CONSUMER_KEYS = [
  'events.consumer.fields.targetPestDisease',
  'events.consumer.fields.activeIngredient',
  'events.consumer.fields.organicApproved',
  'events.consumer.fields.brixLevel',
  'events.consumer.fields.harvestQuality'
];

const chemicalEvent = {
  event_type: 2,
  type: 'FU',
  chemical_type: 'FU',
  commercial_name: 'Kocide 3000',
  active_ingredient: 'Copper Hydroxide',
  target_pest_disease: 'Anthracnose',
  organic_approved: 'omri_listed'
} as Record<string, unknown>;

const harvestEvent = {
  event_type: 1,
  type: 'HA',
  production_type: 'HA',
  harvest_quality_grade: 'grade_b',
  brix_level: 12.5,
  yield_quantity: 5080
} as Record<string, unknown>;

const labelsFor = (
  type: number,
  subtype: string,
  surface: 'consumer_card' | 'modal' | 'form',
  event: Record<string, unknown>
) => {
  const r = getFieldsForSurface(type as never, subtype as never, surface as never, event);
  return [...r.hero, ...r.immediate, ...r.secondary, ...r.details];
};

describe('consumer label overrides are wired end to end', () => {
  it('every consumer override key exists in BOTH locales', () => {
    // A missing key renders the raw dotted id on the card.
    for (const key of CONSUMER_KEYS) {
      expect((enUS as Record<string, string>)[key], `${key} missing from en-US`).toBeTruthy();
      expect((es419 as Record<string, string>)[key], `${key} missing from es-419`).toBeTruthy();
    }
  });

  it('consumer card uses the shopper label', () => {
    const byName = Object.fromEntries(
      labelsFor(2, 'FU', 'consumer_card', chemicalEvent).map((f) => [f.name, f.labelKey])
    );
    expect(byName.target_pest_disease).toBe('events.consumer.fields.targetPestDisease');
    expect(byName.active_ingredient).toBe('events.consumer.fields.activeIngredient');
    expect(byName.organic_approved).toBe('events.consumer.fields.organicApproved');
  });

  it('producer surfaces keep the precise agronomic label', () => {
    for (const surface of ['modal', 'form'] as const) {
      const byName = Object.fromEntries(
        labelsFor(2, 'FU', surface, chemicalEvent).map((f) => [f.name, f.labelKey])
      );
      expect(byName.target_pest_disease, `${surface} must keep the grower/certifier wording`).toBe(
        'events.chemical.fields.targetPestDisease'
      );
      expect(byName.active_ingredient).toBe('events.chemical.fields.activeIngredient');
    }
  });
});

describe('harvest grade is re-voiced for shoppers but not for producers', () => {
  it('consumer card explains what "Grade B" actually means', () => {
    const field = labelsFor(1, 'HA', 'consumer_card', harvestEvent).find(
      (f) => f.name === 'harvest_quality_grade'
    );
    expect(field).toBeDefined();
    expect(field?.labelKey).toBe('events.consumer.fields.harvestQuality');
    // The whole point: never a bare "Grade B" on a consumer surface.
    expect(field?.formattedValue).not.toBe('Grade B');
    expect(field?.formattedValue).toMatch(/juice or processing/i);
    expect(field?.formattedValue).toMatch(/same quality inside/i);
  });

  it('producer surfaces keep the trade term', () => {
    const field = labelsFor(1, 'HA', 'modal', harvestEvent).find(
      (f) => f.name === 'harvest_quality_grade'
    );
    expect(field).toBeDefined();
    expect(field?.labelKey).toBe('events.production.fields.harvestQuality');
    // "Grade B" is precise and correct for a grower and a buyer.
    expect(field?.formattedValue).toBe('Grade B');
  });
});
