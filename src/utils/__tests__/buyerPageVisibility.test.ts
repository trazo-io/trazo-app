/**
 * Buyer-page visibility helpers — the producer-facing mirror of the consumer pipeline.
 *
 * 2026-08-25: a grower screenshotted a Seed Search "consumer card" from their own
 * ProfileProduction preview and asked whether shoppers see it. They never do — the
 * backend withholds BU/SS/EM/TP whole (claim_authority.py) — but nothing in the
 * producer UI said so. These helpers power the badges that now say it; the tests pin
 * them to the same three authorities the real pipeline uses.
 */
import { describe, expect, it } from 'vitest';
import {
  CONSUMER_WITHHELD_PRODUCTION_SUBTYPES,
  CERTIFIER_ONLY_EVENT_FIELDS,
  isEventOnBuyerPage,
  buyerPageWithheldReasonId
} from '../consumerDisplay';
import { buyerVisibleFieldNames } from '../buyerPageVisibility';

describe('event-level visibility', () => {
  it('withholds exactly the four certifier-only production subtypes', () => {
    expect(Object.keys(CONSUMER_WITHHELD_PRODUCTION_SUBTYPES).sort()).toEqual([
      'BU',
      'EM',
      'SS',
      'TP'
    ]);
  });

  it('a Seed Search production event is not on the buyer page, with a reason', () => {
    const event = { event_type: 1, production_type: 'SS' };
    expect(isEventOnBuyerPage(event)).toBe(false);
    expect(buyerPageWithheldReasonId(event)).toBe('events.certifierOnly.reason.SS');
  });

  it('normalizes case and whitespace like the backend gate does', () => {
    expect(isEventOnBuyerPage({ event_type: 1, production_type: ' ss ' })).toBe(false);
    expect(isEventOnBuyerPage({ event_type: '1', type: 'tp' })).toBe(false);
  });

  it('published production subtypes and every other family stay visible', () => {
    expect(isEventOnBuyerPage({ event_type: 1, production_type: 'HA' })).toBe(true);
    expect(isEventOnBuyerPage({ event_type: 2, type: 'chemical' })).toBe(true);
    expect(isEventOnBuyerPage({ event_type: 7, type: 'business' })).toBe(true);
    expect(buyerPageWithheldReasonId({ event_type: 1, production_type: 'HA' })).toBeNull();
  });
});

describe('field-level visibility (buyerVisibleFieldNames)', () => {
  it('the explicit eventType argument wins over a stale event_type on the object', () => {
    // Spread-order regression (2026-08-25): { event_type, ...event } let the raw
    // object's own stale value override the argument.
    const names = buyerVisibleFieldNames(1, 'SS', {
      event_type: 3, // stale/general — must NOT make an SS production event look published
      production_type: 'SS',
      seeds_source: 'local_supplier'
    });
    expect(names.size).toBe(0);
  });

  it('a withheld event exposes no fields at all', () => {
    const names = buyerVisibleFieldNames(1, 'SS', {
      production_type: 'SS',
      seeds_source: 'local_supplier'
    });
    expect(names.size).toBe(0);
  });

  it('a planting event exposes its consumer-card fields', () => {
    const names = buyerVisibleFieldNames(1, 'PL', {
      production_type: 'PL',
      seeds_source: 'local_supplier',
      area_covered: 2,
      yield_quantity: 100
    });
    expect(names.has('seeds_source')).toBe(true);
    expect(names.has('area_covered')).toBe(true);
  });

  it('never exposes a certifier-only field, whatever the registry says', () => {
    const names = buyerVisibleFieldNames(2, 'PE', {
      chemical_subtype: 'synthetic_pesticide',
      commercial_name: 'Example 2EC',
      rei_hours: 12,
      applicator_name: 'A. Person',
      area_treated: 3
    });
    for (const field of CERTIFIER_ONLY_EVENT_FIELDS) {
      expect(names.has(field), `${field} leaked into the buyer-visible set`).toBe(false);
    }
  });
});
