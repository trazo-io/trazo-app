/**
 * `chemicalFormOptions.ts` says what the input-application form says (2026-11-08).
 *
 * The carbon box names an application method and a product type with these tables. The form
 * writes its method and product-type options inline in JSX, so this test reads the form and
 * compares every (product type, code, label) it offers. If someone adds or rewords an option
 * in the form, the box would otherwise keep the old wording beside the new select.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  CHEMICAL_METHOD_KEYS,
  CHEMICAL_SPRAY_METHOD_KEYS,
  CHEMICAL_SUBTYPE_KEYS
} from '../chemicalFormOptions';

const FORM = readFileSync(
  join(process.cwd(), 'src/views/Dashboard/Dashboard/components/forms/ChemicalTab-ENHANCED.jsx'),
  'utf8'
);

/** value="x" followed (before the next option) by the label key it renders. */
const pairs = (block: string, prefix: string) =>
  Object.fromEntries(
    [
      ...block.matchAll(
        new RegExp(
          `<option value="([a-z_]+)">[\\s\\S]*?'(${prefix.replace(/\./g, '\\.')}[A-Za-z]+)'`,
          'g'
        )
      )
    ].map((m) => [m[1], m[2]])
  );

/**
 * The JSX from a group's opening condition to the next group's. Not to `)}`: every
 * `intl.formatMessage({ ... })}` inside the group ends that way too.
 */
const OPENERS = /\{chemicalType === '|\{!chemicalType && \(|\{\['PE', 'HE', 'FU'\]\.includes/g;
const group = (block: string, opener: string) => {
  const at = block.indexOf(opener);
  expect(at, `the form no longer has the group ${opener}`).toBeGreaterThan(-1);
  OPENERS.lastIndex = at + 1;
  const next = OPENERS.exec(block);
  return block.slice(at, next ? next.index : block.length);
};

describe('application methods match the form, per product type', () => {
  const start = FORM.indexOf("'events.chemical.methods.placeholder'");
  const methods = FORM.slice(start, FORM.indexOf('</StandardSelect>', start));
  const P = 'events.chemical.methods.';

  it.each(['FE', 'PE', 'HE', 'FU'])('%s', (type) => {
    expect(pairs(group(methods, `{chemicalType === '${type}' && (`), P)).toEqual(
      CHEMICAL_METHOD_KEYS[type]
    );
  });

  it('before a product type is chosen', () => {
    expect(pairs(group(methods, '{!chemicalType && ('), P)).toEqual(CHEMICAL_METHOD_KEYS['']);
  });

  it('the spray-only methods', () => {
    expect(pairs(group(methods, "{['PE', 'HE', 'FU'].includes(chemicalType) && ("), P)).toEqual(
      CHEMICAL_SPRAY_METHOD_KEYS
    );
  });
});

describe('product types and fuel', () => {
  it('product subtypes match the form', () => {
    const found = pairs(FORM, 'events.chemical.subtypeOptions.');
    expect(Object.keys(found).length).toBeGreaterThanOrEqual(13);
    expect(found).toEqual(CHEMICAL_SUBTYPE_KEYS);
  });

  it('the form takes its fuel list from the shared module, not a copy', () => {
    expect(FORM).toContain(
      "import { CHEMICAL_FUEL_TYPES } from 'config/events/chemicalFormOptions'"
    );
    expect(FORM).not.toMatch(/labelKey: 'events\.chemical\.fuelTypes\./);
  });
});
