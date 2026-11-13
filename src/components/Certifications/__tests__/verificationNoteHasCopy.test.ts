/**
 * Every note the Organic Integrity Database check writes under a certificate has copy in both
 * locales (settings audit leftover, 2026-11-12: a Spanish reader saw "Found 504 organic operations
 * in Oregon but none matched 'Test' above 90% confidence").
 *
 * Reads the note codes and their placeholders from trazo-back
 * `certifications/verification_notes.py` in the sibling checkout, so a new note the app cannot word
 * fails here.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { createIntl } from 'react-intl';
import { describe, expect, it } from 'vitest';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';
import { verificationNoteText } from '../CertificationManager';

const NOTES = join(__dirname, '../../../../../trazo-back/certifications/verification_notes.py');

// `"code": "template"` or `"code": ( "part" "part" + _TAIL )` inside TEMPLATES.
const backendTemplates = (): Record<string, string[]> => {
  const source = readFileSync(NOTES, 'utf8');
  const body = source.slice(source.indexOf('TEMPLATES'), source.indexOf('_NUMERIC'));
  const out: Record<string, string[]> = {};
  for (const m of body.matchAll(/^\s{4}"([a-z_]+)": ([\s\S]*?)(?=^\s{4}"[a-z_]+": |^\})/gm)) {
    out[m[1]] = [...new Set([...m[2].matchAll(/\{([a-z_]+)\}/g)].map((p) => p[1]))];
  }
  return out;
};

const es = createIntl({ locale: 'es-419', messages: es419 as Record<string, string> });
const en = createIntl({ locale: 'en-US', messages: enUS as Record<string, string> });

describe('certificate verification notes', () => {
  const templates = backendTemplates();

  it('reads the backend templates', () => {
    // ANTI-VACUITY: the parse found the codes, including one with parameters.
    expect(Object.keys(templates).length).toBeGreaterThanOrEqual(8);
    expect(templates.no_match).toEqual(['count', 'state', 'name', 'threshold']);
  });

  it('has copy for every code in both locales, using only parameters the backend sends', () => {
    for (const [code, params] of Object.entries(templates)) {
      const id = `certification.verificationNote.${code}`;
      for (const [name, catalogue] of [
        ['en-US', enUS],
        ['es-419', es419]
      ] as const) {
        const copy = (catalogue as Record<string, string>)[id];
        expect(copy, `${name} ${id}`).toBeTruthy();
        const used = [...copy.matchAll(/\{([a-z_]+)[},]/g)].map((p) => p[1]);
        for (const p of used) expect(params, `${name} ${id} uses {${p}}`).toContain(p);
      }
    }
  });

  it('words a stored note in Spanish, and keeps text no template wrote', () => {
    const cert = {
      verification_notes:
        "Found 504 organic operations in Oregon but none matched 'Test' above 90% confidence",
      verification_note_code: 'no_match',
      verification_note_params: { count: 504, state: 'Oregon', name: 'Test', threshold: 90 }
    };
    const text = verificationNoteText(es, cert);
    expect(text).toContain('504');
    expect(text).toContain('«Test»');
    expect(text).not.toMatch(/Found|none matched/);
    expect(verificationNoteText(en, cert)).toContain('none matches');
    expect(
      verificationNoteText(es, {
        verification_notes: 'Checked by hand',
        verification_note_code: null
      })
    ).toBe('Checked by hand');
  });
});
