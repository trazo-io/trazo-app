/**
 * One Spanish word for the grower's business: "empresa", never "compañía" (2026-11-10).
 *
 * es-419 said "empresa" in 96 strings and "compañía" in 39. The Edit company form (#348) and
 * sign-up ("Crear empresa nueva", "Unirme a una empresa") said "empresa"; Company Settings, its
 * tabs and the sidebar said "compañía" ("Config. de la compañía", "Miembros en esta compañía"), so
 * one screen called the same thing two names. "Empresa" is the usual word for a business in
 * Latin American Spanish. Both words are feminine, so every article and adjective kept agreeing.
 *
 * The listed exceptions name some OTHER company, never the grower's, each with its reason.
 */
import { describe, expect, it } from 'vitest';

import enUS from '../lang/en-US.json';
import es419 from '../lang/es-419.json';

const ALLOWED: Record<string, string> = {
  'parcel.pump.providerPlaceholder':
    'an electric utility ("compañía eléctrica"), not the grower\'s business'
};

// `\b` is ASCII-only in JS, so the accented í would defeat it: bound the word by letters instead.
const COMPANIA = /(?<!\p{L})compañías?(?!\p{L})/iu;

const es = es419 as Record<string, string>;
const en = enUS as Record<string, string>;

describe('Spanish names the business "empresa"', () => {
  it('no string says "compañía", except where listed with a reason', () => {
    const offenders = Object.entries(es)
      .filter(([key, value]) => !(key in ALLOWED) && COMPANIA.test(value))
      .map(([key, value]) => `${key}: ${value}`);
    expect(offenders).toEqual([]);
  });

  it('every listed exception still exists and still needs listing', () => {
    for (const key of Object.keys(ALLOWED)) {
      expect(es[key], key).toBeDefined();
      expect(COMPANIA.test(es[key]), key).toBe(true);
    }
  });

  it('the pattern catches the word it is meant to catch', () => {
    // A negative test must prove it can fail: the capitalised, plural and quoted forms all match,
    // and "acompaña" (accompanies) does not.
    for (const sample of ['Config. de la compañía', 'Compañía', 'compañías', '"compañía"']) {
      expect(COMPANIA.test(sample), sample).toBe(true);
    }
    expect(COMPANIA.test('Esta guía te acompaña')).toBe(false);
  });
});

describe('Settings > Team quotes the sign-up button it tells people to press', () => {
  // The instruction quoted "Unirse a compañía existente", a label sign-up never showed
  // (sign-up says "Unirme a una empresa").
  it.each([
    ['en-US', en],
    ['es-419', es]
  ])('%s', (_locale, messages) => {
    expect(messages['app.chooseJoinExistingCompany']).toContain(
      `"${messages['auth.signup.mode.joinCompany']}"`
    );
  });
});
