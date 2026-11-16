/**
 * Overall review 2026-11, OV-PK-CIT15: five strings stated requirements the cited paragraphs do
 * not contain.
 *
 * - § 205.206(e) was said to require the pest to be identified. It requires that prevention was not
 *   enough and that the plan documents the conditions for using the substance.
 * - § 205.206 was said to require "pest identification verification and action threshold
 *   rationale". No paragraph names either record.
 * - § 205.201(a)(2) was said to require proof that each substance is allowed. It asks for a list
 *   with composition, source, location and commercial availability.
 * - § 205.204 was said to require each planting to record its seed status. It is a practice
 *   standard with no recordkeeping clause.
 * - § 205.204(a)(1) was said to require three supplier searches. It names no number; the figure is
 *   NOP 5029 § 4.2 b.1, guidance, as the dossier's seed section already says.
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

  it('the supplier count is named as certifier guidance, in both languages', () => {
    expect(LOCALES.en['drift.reason.seed_search_incomplete']).toContain(
      'certifier guidance (NOP 5029)'
    );
    expect(LOCALES.es['drift.reason.seed_search_incomplete']).toContain(
      'guía para certificadoras (NOP 5029)'
    );
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
    expect(form).not.toMatch(/requires the pest to be identified/);
    expect(form).not.toMatch(/Required documentation for NOP organic certification/);
  });
});
