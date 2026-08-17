/**
 * Auto-narrative composer (WS-4) — title + summary lines for feed rows.
 *
 * Uses the REAL catalogs so a missing key fails here, not in production.
 */

import { describe, expect, it } from 'vitest';
import { createIntl, createIntlCache } from 'react-intl';

import en from '../../../i18n/lang/en-US.json';
import es from '../../../i18n/lang/es-419.json';
import { activitySummary, activityTitle } from '../narrative';
import type { ActivityRow } from 'store/api/activityFeedApi';

const cache = createIntlCache();
const intlEn = createIntl({ locale: 'en-US', messages: en as Record<string, string> }, cache);
const intlEs = createIntl({ locale: 'es-419', messages: es as Record<string, string> }, cache);

const row = (over: Partial<ActivityRow>): ActivityRow => ({
  event_type: 1,
  event_id: 1,
  subtype: null,
  name: null,
  date: '2026-08-05',
  description: '',
  parcel_id: 1,
  parcel_name: 'Block A',
  history_id: 1,
  performed_by: '',
  ...over
});

describe('activityTitle', () => {
  it('maps production subtypes to verb labels', () => {
    expect(activityTitle(row({ subtype: 'HA' }), intlEn)).toBe('Harvest');
    expect(activityTitle(row({ subtype: 'IR' }), intlEn)).toBe('Irrigation');
    expect(activityTitle(row({ subtype: 'EM' }), intlEn)).toBe('Equipment cleanout');
    // Unknown production subtype falls back to field work, not a raw code
    expect(activityTitle(row({ subtype: 'ZZ' }), intlEn)).toBe('Field work');
  });

  it('maps non-production event types to verbs, localized', () => {
    expect(activityTitle(row({ event_type: 2 }), intlEn)).toBe('Input application');
    expect(activityTitle(row({ event_type: 3 }), intlEn)).toBe('Other activity');
    expect(activityTitle(row({ event_type: 2 }), intlEs)).toBe('Aplicación de insumo');
  });
});

describe('activitySummary', () => {
  it('composes harvest summary from detail values', () => {
    const r = row({
      subtype: 'HA',
      detail: {
        yield_quantity: '4200',
        yield_unit: 'lbs',
        amount_determination: 'scale_verified',
        harvest_destination: 'stored'
      }
    });
    expect(activitySummary(r, intlEn)).toBe(
      '4200 lbs — Scale-verified (weigh ticket) — Stored on farm'
    );
    expect(activitySummary(r, intlEs)).toBe(
      '4200 lbs — Verificado en báscula (ticket de pesaje) — Almacenado en el campo'
    );
  });

  it('composes chemical summary with part-of-planting detail text', () => {
    const r = row({
      event_type: 2,
      subtype: 'PE',
      detail: {
        commercial_name: 'Entrust SC',
        applied_scope: 'part',
        applied_scope_detail: 'Rows 1-12'
      }
    });
    expect(activitySummary(r, intlEn)).toBe('Entrust SC — Rows 1-12');
  });

  it('falls back to the scope label when part has no detail text', () => {
    const r = row({
      event_type: 2,
      subtype: 'PE',
      detail: { commercial_name: 'Entrust SC', applied_scope: 'part' }
    });
    expect(activitySummary(r, intlEn)).toBe('Entrust SC — Part of planting');
  });

  it('returns null when there is nothing to say', () => {
    expect(activitySummary(row({ subtype: 'IR' }), intlEn)).toBeNull();
    expect(activitySummary(row({ subtype: 'HA', detail: {} }), intlEn)).toBeNull();
  });
});
