/**
 * Mutation-payload tripwires for the silent-clobber class.
 *
 * Four data-wipe bugs (2026-08-09/10) shared one shape: a mutation or form
 * payload sent keys its UI never rendered — a hardcoded default
 * (`conservation_practices: JSON.stringify([])`, `treated_lumber_present:
 * 'false'`) or a destructive filter (buffer rows without an adjoining-land
 * use) — and every save silently overwrote another editor's data.
 *
 * These tests read the source files as text and fail loudly if a forbidden
 * key reappears as a PAYLOAD WRITE (`formData.append('key'` / `key:` in an
 * object literal). Comment mentions are fine — the incident docs live in
 * those files on purpose. The rule is written in `.claude/rules/frontend.md`
 * ("a mutation sends ONLY fields its form renders"). If you are here because
 * this test failed: either your form now genuinely renders + owns the field
 * (then move ownership deliberately and update BOTH this test and the
 * canonical editor), or you just reintroduced the clobber.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(resolve(__dirname, '../../../..', 'src', rel), 'utf8');

/** A payload WRITE of `key`: formData.append('key'…) or an object-literal
 *  `key:` at line start (allowing indentation), excluding comment lines. */
const writesKey = (source: string, key: string): boolean => {
  const lines = source.split('\n').filter((l) => {
    const t = l.trim();
    return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
  });
  const code = lines.join('\n');
  if (code.includes(`formData.append('${key}'`)) return true;
  return new RegExp(`^\\s*${key}\\s*:`, 'm').test(code);
};

/** Slice a named RTK endpoint's builder out of productApi.js so createParcel
 *  (which legitimately sends defaults for a brand-new row) doesn't trip the
 *  updateParcel assertions. */
const endpointSlice = (source: string, name: string, nextName: string) => {
  const start = source.indexOf(`${name}:`);
  const end = source.indexOf(`${nextName}:`);
  expect(start, `endpoint ${name} not found`).toBeGreaterThan(-1);
  expect(end, `endpoint ${nextName} not found`).toBeGreaterThan(start);
  return source.slice(start, end);
};

const WIZARD_OWNED = [
  'buffer_zones',
  'apn',
  'section_township_range',
  'date_began_managing',
  'treated_lumber_present',
  'treated_lumber_description',
  'treated_lumber_install_date',
  'container_production'
];

describe('updateParcel mutation — §205.202 facts belong to the Parcel Application wizard', () => {
  it('sends none of the wizard-owned keys', () => {
    const source = read('store/api/productApi.js');
    const update = endpointSlice(source, 'updateParcel', 'updateParcelCompliance');
    for (const key of WIZARD_OWNED) {
      expect(writesKey(update, key), `updateParcel appends ${key}`).toBe(false);
    }
  });
});

describe('parcel edit form — no destructive buffer filter, no wizard-owned keys', () => {
  it('AddParcel payload carries no §205.202 keys', () => {
    const source = read('views/Dashboard/Dashboard/Parcel/AddParcel.tsx');
    for (const key of WIZARD_OWNED.filter((k) => k !== 'container_production')) {
      expect(writesKey(source, key), `AddParcel payload carries ${key}`).toBe(false);
    }
    expect(source.includes('adjoining_land_use && b.adjoining_land_use.trim()')).toBe(false);
  });
});

describe('farm form — June-era and wiped fields stay out of the payload', () => {
  it('AddFarm payload never writes the wiped/legacy keys', () => {
    const source = read('views/Dashboard/Dashboard/Farm/AddFarm.tsx');
    for (const key of ['conservation_practices', 'sustainability_practices', 'certifications']) {
      expect(writesKey(source, key), `AddFarm payload carries ${key}`).toBe(false);
    }
  });
});

describe('parcel compliance card mutation — pump-plant only', () => {
  it('updateParcelCompliance sends no §205.202 keys', () => {
    const source = read('store/api/productApi.js');
    const slice = endpointSlice(source, 'updateParcelCompliance', 'getParcelCropHistory');
    for (const key of WIZARD_OWNED) {
      expect(writesKey(slice, key), `updateParcelCompliance carries ${key}`).toBe(false);
    }
  });
});
