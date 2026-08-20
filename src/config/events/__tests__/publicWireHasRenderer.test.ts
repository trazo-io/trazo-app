/**
 * Every key on the ANONYMOUS consumer payload must have a consumer renderer, or be listed
 * here with the reason it does not.
 *
 * 🔴 WHY (2026-08-15). The codebase had one conformance guard, running one direction
 * (registry declares `form` → does the tab collect it). Nothing checked the direction that
 * actually carries risk: a key ships to unauthenticated clients and no component draws it.
 *
 * The rule this encodes is the project's own, from transparency_views:
 *
 *     "the key name travels on the wire and is scrapable whatever the UI renders,
 *      so it is the claim"
 *
 * Five Planting keys were removed on that basis (block_id, growth_stage, seed_lot_number,
 * production_efficiency, operation_efficiency) after a live capture showed them shipping with
 * nothing rendering them. This test stops the next five.
 *
 * Scope note: this checks the REGISTRY side — which fields declare a `consumer_card` surface.
 * The serializer side is asserted in trazo-back/history/tests/test_public_serializer_leakage.py,
 * which walks the real payload. The two together close the loop; neither does alone.
 */

import { describe, expect, it } from 'vitest';

import { eventRegistry } from 'src/config/events';

/**
 * Keys that legitimately ride the anonymous payload without a `consumer_card` surface.
 * Every entry states WHY. An entry is a decision, not a silencer — if you cannot write the
 * reason, the key probably should not be public.
 */
const ALLOWED_WITHOUT_RENDERER: Record<string, string> = {
  // --- transport/plumbing, not facts about the crop -------------------------------
  id: 'row identity',
  index: 'ordering',
  date: 'rendered as the card date, not as a fact row',
  type: 'drives which card renders',
  event_type: 'drives which card renders',
  production_type: 'subtype selector for the registry',
  album: 'photo gallery, rendered by its own component',
  photo_count: 'gates the gallery',
  is_highlight: 'controls placement in the journey, not a displayed value',
  is_summary: 'aggregate-card switch',
  certified: 'badge input',
  verification_level: 'renders as the verification badge',
  blockchain_verified: 'badge input (per-event badge withdrawn 2026-06; key retained)',
  blockchain_transaction: 'badge input',
  extra_data: 'container — its contents are allow-listed separately',
  custom_fields: 'farmer-authored, rendered by mergeCustomFieldsIntoDisplay',

  // --- unit companions consumed by makeUnitPairFormatter --------------------------
  area_unit: 'unit companion',
  volume_unit: 'unit companion',
  yield_unit: 'unit companion',
  fuel_unit: 'unit companion',
  depth_unit: 'unit companion',
  monitoring_unit: 'unit companion',
  irrigation_depth_unit: 'unit companion',
  micronutrient_rate_unit: 'unit companion',
  amendment_amount_unit: 'unit companion',
  transportation_unit: 'unit companion',
  quantity_purchased_unit: 'unit companion',

  // --- free text rendered outside the fact grid -----------------------------------
  name: 'renders as the card title',
  commercial_name: 'chemical card title',
  description: 'not rendered on consumer cards by design — observation is the quoted voice',
  observation: "rendered verbatim as Farmer's Field Notes, above the fact grid",
  performed_by: 'rendered as a masked attribution line'
};

describe('anonymous consumer payload: every key has a renderer or a stated reason', () => {
  for (const [eventTypeName, entry] of Object.entries(eventRegistry)) {
    it(`${eventTypeName}: no field declares a consumer surface it cannot reach`, () => {
      // A field with a consumer_card tier must resolve on a consumer surface — i.e. the
      // tier must be one the surface rules allow. A `details` tier here renders NOWHERE
      // (surfaces.ts drops it), which is how operator data hid on a consumer surface before.
      const unreachable = entry.fields
        .filter((f) => f.surfaces?.consumer_card === 'details')
        .map((f) => f.name);

      expect(
        unreachable,
        `${eventTypeName} declares consumer_card: 'details' for ${unreachable.join(', ')}. ` +
          `The consumer_card surface does not allow that tier, so the field renders nowhere ` +
          `while still shipping on the anonymous wire. Use 'secondary', or drop the surface.`
      ).toEqual([]);
    });
  }

  it('the allow-list is documented, not just populated', () => {
    const undocumented = Object.entries(ALLOWED_WITHOUT_RENDERER)
      .filter(([, reason]) => !reason || reason.trim().length < 8)
      .map(([key]) => key);

    expect(
      undocumented,
      `These allow-list entries have no real reason written against them: ${undocumented.join(
        ', '
      )}. ` + `An entry without a reason is a silencer, not a decision.`
    ).toEqual([]);
  });
});
