/**
 * The organic bases a form OFFERS, held to one list on both sides (M7-I1, 2026-11-24).
 *
 * "Transitional - in certification process" was offered as the organic basis of an input on the
 * spray form, the soil amendment form, a tank's product lines and quick add. It describes the
 * FARM (an operation in its 36 months of conversion), not the input, so a grower on a
 * transitional farm picked it in good faith. Stored, `transitional` is a prohibited-substance
 * answer in trazo-back (`ORGANIC_PROHIBITED_VALUES`, on purpose), so one pick on a fish
 * fertilizer record moved a certified parcel's § 205.202(b) line from "No prohibited substance on
 * record in Trazo for the last 36 months" to "In transition, 964 days remaining".
 *
 * Four copies decide what a grower can pick, and each is checked here against the backend's
 * `ORGANIC_APPROVED_OFFERED` (common/field_registry.py): `ORGANIC_APPROVED_OFFERED` in enums.ts,
 * the spray form's and the soil form's hand-written <option> lists, and the tank line's
 * `ORGANIC_BASES`. Quick add (`ORGANIC_APPROVED_OPTIONS`, unmounted today) is held to the refused
 * list only. A refused value still renders on a record that already holds it.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';
import { ORGANIC_APPROVED_OPTIONS } from '../../eventFieldDefinitions';
import { ORGANIC_APPROVED_OFFERED, retiredOrganicApprovedLabelKey } from '../enums';

const SRC = join(__dirname, '../../..');
const BACKEND = join(SRC, '../../trazo-back/common/field_registry.py');
const FORMS = join(SRC, 'views/Dashboard/Dashboard/components/forms');

const read = (path: string) => readFileSync(path, 'utf8');

const backendRegistry = (): string => {
  try {
    return read(BACKEND);
  } catch {
    throw new Error(
      `Cannot read ${BACKEND}. This guard compares the forms' options against the backend's ` +
        `offered list, so it needs the trazo-back checkout beside trazo-app.`
    );
  }
};

/** The quoted codes of one `NAME = (...)` / `NAME = frozenset({...})` block in field_registry.py. */
const backendCodes = (name: string): string[] => {
  const src = backendRegistry();
  const start = src.indexOf(`\n${name} = `);
  expect(start, `${name} moved or was renamed in field_registry.py`).toBeGreaterThan(-1);
  const end = src.indexOf('\n\n', start + 1);
  return [...src.slice(start, end).matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
};

/** The <option value="..."> literals of a select's JSX, from `anchor` to its </StandardSelect>. */
const staticOptions = (file: string, anchor: string): string[] => {
  const src = read(join(FORMS, file));
  const start = src.indexOf(anchor);
  expect(start, `${file}: ${anchor} not found`).toBeGreaterThan(-1);
  const select = src
    .slice(start, src.indexOf('</StandardSelect>', start))
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  return [...select.matchAll(/<option value="([a-z_]+)">/g)].map((m) => m[1]);
};

const tankLineBases = (): string[] => {
  const src = read(join(SRC, 'components/Events/TankMixLines.tsx'));
  const start = src.indexOf('export const ORGANIC_BASES = [');
  expect(start, 'ORGANIC_BASES moved or was renamed').toBeGreaterThan(-1);
  const block = src.slice(start, src.indexOf('] as const;', start));
  return [...block.matchAll(/\['([a-z_]+)',/g)].map((m) => m[1]);
};

const OFFERED = backendCodes('ORGANIC_APPROVED_OFFERED');
const REFUSED = backendCodes('ORGANIC_APPROVED_REFUSED_ON_WRITE');

describe('the organic bases a form offers match the backend', () => {
  it('reads both backend lists', () => {
    expect(OFFERED.length, 'no offered bases parsed').toBeGreaterThan(3);
    expect(REFUSED).toContain('transitional');
    expect(
      OFFERED.filter((v) => REFUSED.includes(v)),
      'offered and refused at once'
    ).toEqual([]);
  });

  it('enums.ts offers exactly the backend list, in its order', () => {
    expect([...ORGANIC_APPROVED_OFFERED]).toEqual(OFFERED);
  });

  it.each([
    ['ChemicalTab-ENHANCED.jsx', 'name="organic_approved"'],
    ['SoilManagementTab.jsx', "{...register('amendment_organic_approved')}"]
  ])('%s renders an <option> for exactly the offered bases', (file, anchor) => {
    expect(staticOptions(file, anchor)).toEqual(OFFERED);
  });

  it('a tank line offers exactly the offered bases', () => {
    expect(tankLineBases()).toEqual(OFFERED);
  });

  it('quick add offers no refused value', () => {
    const values = ORGANIC_APPROVED_OPTIONS.map((o) => o.value);
    expect(values.filter((v) => REFUSED.includes(v))).toEqual([]);
  });
});

describe('a refused value still shows on a record that already holds it', () => {
  it.each(REFUSED)('%s renders as a retired option, labelled in both locales', (value) => {
    // The forms render this option only while it is the field's current value, so an edit form
    // opened on such a record shows the answer on file instead of the placeholder (which would
    // save '' and erase it).
    const key = retiredOrganicApprovedLabelKey(value);
    expect(key, `${value} has no retired label`).toBeTruthy();
    for (const [locale, messages] of [
      ['en-US', enUS],
      ['es-419', es419]
    ] as const) {
      const catalog = messages as Record<string, string>;
      expect(catalog[key as string], `${locale} ${key}`).toBeTruthy();
      expect(catalog['events.organicApproved.retiredOption'], locale).toContain('{label}');
    }
  });
});

describe('the server refusal is worded in both locales', () => {
  it('names the options a grower can pick instead', () => {
    const en = (enUS as Record<string, string>)['apiErrors.organicBasisTransitional'];
    const es = (es419 as Record<string, string>)['apiErrors.organicBasisTransitional'];
    expect(en).toContain(
      (enUS as Record<string, string>)['events.organicApproved.notOrganicOption']
    );
    expect(es).toContain(
      (es419 as Record<string, string>)['events.organicApproved.notOrganicOption']
    );
    expect(en).toContain('Not yet confirmed');
    expect(es).toContain('Sin confirmar todavía');
    for (const text of [en, es]) expect(text, 'no em dash in new copy').not.toContain('\u2014');
  });
});
