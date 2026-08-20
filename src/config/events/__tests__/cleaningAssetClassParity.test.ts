/**
 * The cleanout asset-class vocabulary lives in THREE places and must not drift.
 *
 *   1. `common/field_registry.py` → `CLEANING_ASSET_CLASS` (the model's choices)
 *   2. `src/config/events/enums.ts` → `CLEANING_ASSET_CLASSES`
 *   3. the hardcoded `<option>` list in `ProductionTab.jsx`
 *
 * MEASURED 2026-08-19: three classes were added to (1) with a migration, and the farmer could
 * not select any of them — the form still rendered the original four. The migration was real,
 * the column accepted the values, the certifier packet knew their labels, and the only thing
 * missing was the half a farmer touches. A backend-only change looks complete from every angle
 * except the one that matters.
 *
 * § 205.272 turns on WHICH surface the organic product touched, so a missing class is not a
 * cosmetic gap: a packing-line cleanout filed as generic "equipment" misstates the record.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { CLEANING_ASSET_CLASSES } from '../enums';

const BACKEND = join(__dirname, '../../../../../trazo-back/common/field_registry.py');
const TAB = join(__dirname, '../../../views/Dashboard/Dashboard/components/forms/ProductionTab.jsx');

const backendValues = (): string[] => {
  let src: string;
  try {
    src = readFileSync(BACKEND, 'utf8');
  } catch {
    throw new Error(
      `Cannot read ${BACKEND}. This guard compares the form's options against the model's ` +
        `choices, so it needs the trazo-back checkout beside trazo-app.`
    );
  }
  const start = src.indexOf('CLEANING_ASSET_CLASS = [');
  expect(start, 'CLEANING_ASSET_CLASS moved or was renamed').toBeGreaterThan(-1);
  const block = src.slice(start, src.indexOf(']', start));
  return [...block.matchAll(/\(\s*"([a-z_]+)"/g)].map((m) => m[1]);
};

describe('cleanout asset classes agree across all three copies', () => {
  it('enums.ts matches the model choices exactly', () => {
    const backend = backendValues().sort();
    const frontend = CLEANING_ASSET_CLASSES.map((c) => c.value).sort();
    expect(backend.length, 'no backend choices parsed').toBeGreaterThan(3);
    expect(frontend, 'enums.ts has drifted from the model').toEqual(backend);
  });

  it('the form renders an <option> for every class', () => {
    // The copy that actually decides what a farmer can pick.
    const src = readFileSync(TAB, 'utf8');
    const rendered = new Set(
      [...src.matchAll(/<option value="([a-z_]+)">/g)].map((m) => m[1])
    );
    const missing = CLEANING_ASSET_CLASSES.map((c) => c.value).filter((v) => !rendered.has(v));
    expect(
      missing,
      `these asset classes exist in the model and the enum but have no <option>, so no farmer ` +
        `can choose them:\n  ${missing.join('\n  ')}`
    ).toEqual([]);
  });

  it('every class has a label in both locales', () => {
    const en = JSON.parse(readFileSync(join(__dirname, '../../../i18n/lang/en-US.json'), 'utf8'));
    const es = JSON.parse(readFileSync(join(__dirname, '../../../i18n/lang/es-419.json'), 'utf8'));
    const missing = CLEANING_ASSET_CLASSES.filter((c) => !en[c.labelKey] || !es[c.labelKey]).map(
      (c) => c.labelKey
    );
    expect(missing, `label keys missing: ${missing.join(', ')}`).toEqual([]);
  });
});
