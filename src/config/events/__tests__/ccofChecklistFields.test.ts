/**
 * Render-proof for the fields added by the CCOF grower-checklist audit (2026-08-16).
 *
 * CCOF's *Recordkeeping Checklist for Organic Growers* has eight items. Three of them had no
 * expressible answer in Trazo:
 *
 *   item 1 — receipts for "fertilizer, compost, soil amendments, planting mixes".
 *            `ChemicalEvent` carried supplier / date / invoice / quantity / lot;
 *            `SoilManagementEvent` carried none of them, so the largest purchased input on a
 *            typical organic orchard had no paper trail.
 *   item 6 — "what you sent, where, when, and what you received as the outcome" for crop sent
 *            to another certified operation. `harvest_destination` had no handler option at
 *            all, so a grower would record the huller as a BUYER — a non-sale in the
 *            § 205.307 sales table.
 *
 * Two properties are pinned here, because a registry entry alone renders nothing (see
 * `eventDataNormalizer`'s own comment about hand-written copy lists) and because a field on
 * the wrong surface is a supply-chain leak:
 *
 *   1. each field resolves onto the producer surfaces it claims,
 *   2. NONE of them reaches `consumer_card` — what a farm paid, who it bought from, and what a
 *      packer returned are commercial data (same policy as ChemicalEvent.supplier_name, which
 *      the backend also strips from the public payload).
 */
import { describe, expect, it } from 'vitest';

import { getFieldsForSurface } from '../index';
import type { DisplaySurface, ResolvedFieldSet } from '../index';
import { HARVEST_DESTINATIONS } from '../enums';

const names = (set: ResolvedFieldSet) =>
  [...set.hero, ...set.immediate, ...set.secondary, ...set.details].map((f) => f.name);

const resolved = (
  type: 'production' | 'soil_management',
  subtype: string,
  surface: DisplaySurface,
  event: Record<string, unknown>
) => names(getFieldsForSurface(type, subtype as never, surface, event));

const AMENDMENT_PURCHASE_FIELDS = [
  'amendment_supplier_name',
  'amendment_purchase_date',
  'amendment_purchase_invoice',
  'amendment_quantity_purchased',
  'amendment_lot_number'
];

const HANDLER_FIELDS = [
  'sent_to_handler_date',
  'quantity_sent_to_handler',
  'quantity_returned_from_handler',
  'handler_document_reference'
];

describe('CCOF item 1 — amendment purchase traceability', () => {
  const event = {
    amendment_supplier_name: 'Central Valley Compost Supply',
    amendment_purchase_date: '2026-03-04',
    amendment_purchase_invoice: 'INV-20614',
    amendment_quantity_purchased: 12,
    amendment_quantity_purchased_unit: 'tons',
    amendment_lot_number: 'LOT-CVC-8841'
  };

  it.each(AMENDMENT_PURCHASE_FIELDS)('%s renders on the soil modal and form', (field) => {
    expect(resolved('soil_management', 'OM', 'modal', event)).toContain(field);
    expect(resolved('soil_management', 'OM', 'form', event)).toContain(field);
  });

  it.each(AMENDMENT_PURCHASE_FIELDS)('%s never reaches the consumer card', (field) => {
    expect(resolved('soil_management', 'OM', 'consumer_card', event)).not.toContain(field);
  });

  it('applies to every amendment subtype, not only organic-matter additions', () => {
    for (const subtype of ['PA', 'OM', 'CC', 'CO']) {
      expect(resolved('soil_management', subtype, 'form', event)).toContain(
        'amendment_supplier_name'
      );
    }
  });
});

describe('CCOF item 6 — off-farm handling round trip', () => {
  const sentToHandler = {
    harvest_destination: 'handler',
    sent_to_handler_date: '2026-10-02',
    quantity_sent_to_handler: 42000,
    handler_quantity_unit: 'lbs',
    quantity_returned_from_handler: 13400,
    handler_return_unit: 'lbs',
    handler_document_reference: 'PACKOUT-2026-114'
  };

  it('offers a handler destination at all — the option this whole record depends on', () => {
    expect(HARVEST_DESTINATIONS.map((o) => o.value)).toContain('handler');
  });

  it.each(HANDLER_FIELDS)('%s renders on the harvest modal and form', (field) => {
    expect(resolved('production', 'HA', 'modal', sentToHandler)).toContain(field);
    expect(resolved('production', 'HA', 'form', sentToHandler)).toContain(field);
  });

  it.each(HANDLER_FIELDS)('%s never reaches the consumer card', (field) => {
    expect(resolved('production', 'HA', 'consumer_card', sentToHandler)).not.toContain(field);
  });

  it('stays hidden when the lot did not go to a handler', () => {
    // Four permanently-blank inputs on every harvest is how a form teaches growers to skip a
    // section, so these are gated on the destination rather than on the subtype alone.
    const storedOnFarm = { ...sentToHandler, harvest_destination: 'stored' };
    const form = resolved('production', 'HA', 'form', storedOnFarm);
    for (const field of HANDLER_FIELDS) {
      expect(form).not.toContain(field);
    }
  });
});
