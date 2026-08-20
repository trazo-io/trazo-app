/**
 * Every event family renders something a shopper can read, and nothing they should not.
 *
 * WHY. "The registry declares a consumer_card surface" and "the card renders it" are different
 * claims, and this codebase has been bitten by the gap between them before — which is why
 * formRenderConformance and consumerCopySuppression both render the real component rather than
 * inspecting config. The consumer surface was verified this session at the PAYLOAD level (which
 * fields leave the server) but never at the RENDER level for the ordinary families, so
 * "each activity is shown correctly to a consumer" was an unverified claim.
 *
 * Two assertions per family, and the second matters more:
 *   1. the card produces real content, not an empty shell;
 *   2. it contains no operator-only data — the `details` tier was removed from consumer
 *      surfaces on 2026-07-31 because it held EPA registration numbers, buffer distances,
 *      internal block IDs and per-event fuel figures.
 *
 * A shopper seeing nothing is a wasted QR scan. A shopper seeing an EPA registration number is
 * a disclosure problem. This file is the floor under both.
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import { ConsumerEventCard } from '../ConsumerEventCard';
import enUS from '../../../i18n/lang/en-US.json';

const renderCard = (event: Record<string, unknown>) =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <ConsumerEventCard event={event as never} isLast />
      </IntlProvider>
    </ChakraProvider>
  );

/** One realistic event per family, shaped as the anonymous payload delivers them. */
const FAMILIES: Array<{ name: string; event: Record<string, unknown> }> = [
  {
    name: 'weather',
    event: { event_type: 0, type: 'FR', date: '2026-03-02T06:00:00Z', description: 'Frost night' }
  },
  {
    name: 'production / harvest',
    event: {
      event_type: 1,
      type: 'HA',
      production_type: 'HA',
      date: '2026-10-22T08:00:00Z',
      description: 'First shake',
      yield_quantity: 1200,
      yield_unit: 'kg'
    }
  },
  {
    name: 'chemical',
    event: {
      event_type: 2,
      type: 'FE',
      chemical_type: 'FE',
      date: '2026-05-11T07:00:00Z',
      description: 'Compost tea application',
      commercial_name: 'Compost tea'
    }
  },
  {
    name: 'general',
    event: { event_type: 3, date: '2026-06-01T09:00:00Z', description: 'Fence repair', activity_type: 'maintenance' }
  },
  {
    name: 'soil',
    event: {
      event_type: 5,
      type: 'ST',
      soil_management_type: 'ST',
      date: '2026-02-14T09:00:00Z',
      description: 'Soil test'
    }
  },
  {
    name: 'pest',
    event: {
      event_type: 6,
      type: 'SC',
      pest_management_type: 'SC',
      date: '2026-07-03T06:30:00Z',
      description: 'Scouting pass'
    }
  },
  {
    name: 'business',
    event: {
      event_type: 7,
      type: 'CE',
      business_type: 'certification',
      date: '2026-01-15T09:00:00Z',
      description: 'Certification renewal'
    }
  }
];

/** Labels that belong to the operator, never to a shopper. */
const OPERATOR_ONLY = [
  'EPA Registration',
  'Buffer Zone',
  'Block / Section',
  'Fuel Consumed',
  'Equipment Hours',
  'Applicator Certification',
  'Restricted Use'
];

describe('consumer card: every family renders', () => {
  for (const { name, event } of FAMILIES) {
    it(`${name}: produces readable content`, () => {
      const { container } = renderCard(event);
      const text = (container.textContent || '').trim();
      expect(
        text.length,
        `the ${name} card rendered an empty shell — a shopper scanning this sees nothing`
      ).toBeGreaterThan(20);
    });

    it(`${name}: shows no operator-only data`, () => {
      const { container } = renderCard(event);
      const text = container.textContent || '';
      const leaked = OPERATOR_ONLY.filter((label) => text.includes(label));
      expect(
        leaked,
        `the ${name} card exposed operator-only fields to a shopper: ${leaked.join(', ')}`
      ).toEqual([]);
    });
  }
});
