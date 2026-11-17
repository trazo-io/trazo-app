/**
 * Overall review 2026-11, OV-PK-CIT15: five strings stated requirements the cited paragraphs do
 * not contain.
 *
 * - § 205.206(e) was said to require the pest to be identified. It applies when the practices in
 *   (a) to (d) are not enough, covers biological and botanical substances as well as National List
 *   ones, and asks that the plan documents the conditions for using them.
 * - § 205.206 was said to require "pest identification verification and action threshold
 *   rationale". No paragraph names either record.
 * - § 205.201(a)(2) was said to require proof that each substance is allowed. It asks for a list
 *   with composition, source, location and commercial availability.
 * - § 205.204 was said to require each planting to record its seed status. It is a practice
 *   standard with no recordkeeping clause.
 * - § 205.204(a)(1) was said to require three supplier searches. It names no number; the figure is
 *   NOP 5029 § 4.2.1 b.1, NOP guidance (its § 4.2 is "Recordkeeping for Organic Producers").
 *
 * An independent read added: the treated-seed reason named one of § 205.204(a)(2)'s two
 * conditions, and the threshold rationale help tied the rationale to § 205.206(e) in hard-coded
 * English.
 *
 * The backend half (the drift reasons it stores and prints) is pinned in trazo-back
 * certifications/tests/test_drift_detector_phase1.py.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { createIntl } from 'react-intl';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';

const LOCALES: Record<string, Record<string, string>> = {
  en: enUS as Record<string, string>,
  es: es419 as Record<string, string>
};

const KEYS = [
  'events.pest.help.pestSpecies',
  'events.pest.help.thresholdRationale',
  'drift.reason.seed_treated',
  'events.section.pest.identificationDescription',
  'events.chemical.organicBasis.required',
  'drift.reason.seed_cert_missing',
  'drift.reason.seed_search_incomplete'
];

describe('a cited paragraph is never said to require what it does not', () => {
  for (const [locale, strings] of Object.entries(LOCALES)) {
    it(`${locale}: each string exists and states no requirement`, () => {
      for (const key of KEYS) {
        expect(strings[key], `${locale} ${key} is missing`).toBeTruthy();
        expect(strings[key], `${locale} ${key}`).not.toMatch(/\brequire[sd]?\b|\bexigen?\b/i);
      }
    });
  }

  it('the supplier count is named as NOP guidance, in both languages', () => {
    expect(LOCALES.en['drift.reason.seed_search_incomplete']).toContain('NOP guidance (NOP 5029)');
    expect(LOCALES.es['drift.reason.seed_search_incomplete']).toContain('guía del NOP (NOP 5029)');
  });

  it('§ 205.204(a)(2) keeps both its conditions, and § 205.206(e) its (a) to (d)', () => {
    expect(LOCALES.en['drift.reason.seed_treated']).toContain(
      'untreated variety is not commercially available'
    );
    expect(LOCALES.es['drift.reason.seed_treated']).toContain(
      'sin tratar equivalente disponible comercialmente'
    );
    expect(LOCALES.en['events.pest.help.pestSpecies']).toContain('(a) to (d)');
    expect(LOCALES.es['events.pest.help.pestSpecies']).toContain('(a) a (d)');
    for (const strings of Object.values(LOCALES)) {
      expect(strings['drift.reason.seed_treated']).not.toContain('\u2014');
    }
  });

  it('the search count reads as a count, singular and plural', () => {
    const en = createIntl({ locale: 'en', messages: LOCALES.en });
    const es = createIntl({ locale: 'es', messages: LOCALES.es });
    const id = 'drift.reason.seed_search_incomplete';
    expect(en.formatMessage({ id }, { count: 1 })).toContain('with 1 supplier search recorded.');
    expect(en.formatMessage({ id }, { count: 2 })).toContain('with 2 supplier searches recorded.');
    expect(es.formatMessage({ id }, { count: 1 })).toContain(
      'con 1 búsqueda de proveedores registrada.'
    );
    expect(es.formatMessage({ id }, { count: 0 })).toContain(
      'con 0 búsquedas de proveedores registradas.'
    );
  });

  it('the pest form reads its citations from the locale files, not from hard-coded English', () => {
    const form = readFileSync(
      join(__dirname, '../../../views/Dashboard/Dashboard/components/forms/PestManagementTab.jsx'),
      'utf8'
    );
    // Anti-vacuity: the form still uses both keys.
    expect(form).toContain("'events.pest.help.pestSpecies'");
    expect(form).toContain("'events.section.pest.identificationDescription'");
    expect(form).toContain("'events.pest.help.thresholdRationale'");
    expect(form).not.toMatch(/requires the pest to be identified/);
    expect(form).not.toMatch(/Required documentation for NOP organic certification/);
    expect(form).not.toMatch(/helpText="[^"]*205\.206/);
  });
});
