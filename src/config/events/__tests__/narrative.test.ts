/**
 * Auto-narrative composer (WS-4) — title + summary lines for feed rows.
 *
 * Uses the REAL catalogs so a missing key fails here, not in production.
 */

import { describe, expect, it } from 'vitest';
import { createIntl, createIntlCache } from 'react-intl';

import en from '../../../i18n/lang/en-US.json';
import es from '../../../i18n/lang/es-419.json';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { activityLabel, activitySummary, activityTitle } from '../narrative';
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
      '4200 lbs — Verificado en báscula (ticket de pesaje) — Almacenado en la finca'
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

/**
 * The retired seven-family vocabulary must not reach a screen.
 *
 * The create path asks "What did you do?" and offers ACTIVITY verbs — Irrigation, Input
 * application, Pest & scouting. The producer timeline was rendering
 * `getEventConfig().category`, hardcoded English from the old family vocabulary, so a record
 * filed as Irrigation displayed as "Production Activity" and an OMRI-listed fish fertiliser
 * displayed as a "Chemical Application" on a certified-organic operation. Same record, two
 * identities — the defect already fixed once on the edit path.
 */
describe('surfaces render the activity verb, not the retired family name', () => {
  const RETIRED = [
    'Production Activity',
    'Chemical Application',
    'Soil Management',
    'Pest Management',
    'Weather Event',
    'Equipment Operation',
    'Business Activity',
    'Other Farm Activity'
  ];

  it('the activity timeline prints no retired family name', () => {
    // Was a check on `EnhancedTimelineRow`, deleted 2026-11-07 (no screen rendered it). Its
    // successor, the shared month timeline (parcel page, Activities, season page), takes the
    // record's own title, so the rule it must keep is: none of these words in its source.
    const code = readFileSync(
      join(__dirname, '../../../components/Events/ActivityTimeline.tsx'),
      'utf8'
    );
    for (const word of RETIRED) {
      expect(code, `"${word}" in the timeline`).not.toContain(`'${word}'`);
    }
    expect(code, 'eventConfig.category must not be rendered').not.toMatch(
      /\{\s*eventConfig\.category\s*\}/
    );
  });

  it('every retired family name has a verb key that supersedes it', () => {
    // Anti-vacuity: proves the replacement vocabulary actually resolves for each family.
    for (const [eventType, subtype] of [
      [1, 'IR'],
      [2, null],
      [5, null],
      [6, null],
      [0, null],
      [3, null],
      [7, null]
    ] as [number, string | null][]) {
      const label = activityLabel(eventType, subtype, intlEn);
      expect(label, `event_type ${eventType} produced no label`).toBeTruthy();
      expect(RETIRED, `event_type ${eventType} still says "${label}"`).not.toContain(label);
    }
  });

  it('subtypeOf has ONE definition — no surface may grow its own copy', () => {
    for (const rel of ['../../../components/Modals/EventDetailsModal.tsx']) {
      const code = readFileSync(join(__dirname, rel), 'utf8');
      // the inline `weather_type || production_type || …` chain is the shape that duplicated
      const copies = [...code.matchAll(/weather_type\s*\|\|[\s\S]{0,200}?business_event_type/g)];
      expect(copies.length, `${rel} re-implements subtypeOf`).toBe(0);
    }
  });
});
