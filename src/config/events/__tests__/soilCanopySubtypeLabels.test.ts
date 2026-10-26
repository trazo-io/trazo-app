/**
 * Readback names the thing the grower picked (Astra audit AC-11, 2026-10-26).
 *
 * Four defects, one shape: the detail view printed a word the form never offered.
 *   - Canopy "tying" is "Amarre" on the form and "Tucking" on the Spanish detail, because the
 *     operation had no enumSource and the exact-string ES map said "Acomodo de brotes".
 *   - pH adjustment (PA) read "Soil Amendment" on the detail while Edit said "pH Adjustment".
 *   - Cultivation and orchard-floor (CU/MO) read only "Production": nothing named the operation.
 *   - A seed-search row dropped the supplier's reply that the form shows beside the supplier.
 *
 * Modelled on chemicalSubtypeLabels.test.ts: the label maps must AGREE, since drift between
 * them is silent.
 */
import { describe, expect, it } from 'vitest';

import { CANOPY_OPERATIONS, ENUM_OPTIONS, PRODUCTION_SUBTYPES } from '../enums';
import { formatSeedSearchAttempts } from '../formatters';
import { getFieldsForSurface } from '../index';
import { productionEventRegistry } from '../productionEvent';
import { getReadableFieldValue, localizeFieldValue } from 'utils/fieldDisplayUtils';
import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';

const EN = enUS as unknown as Record<string, string>;
const ES = es419 as unknown as Record<string, string>;
const tr = (cat: Record<string, string>) => (key: string) => cat[key] ?? null;

const row = (
  eventType: 1 | 5,
  subtype: string,
  event: Record<string, unknown>,
  field: string,
  cat?: Record<string, string>
) => {
  const set = getFieldsForSurface(
    eventType,
    subtype as never,
    'modal',
    { event_type: eventType, type: subtype, ...event } as never,
    cat ? tr(cat) : undefined
  );
  return [...set.hero, ...set.immediate, ...set.secondary, ...set.details].find(
    (f) => f.name === field
  );
};

describe('canopy_operation', () => {
  it('is not vacuous: seven values, registered, and the field points at them', () => {
    expect(CANOPY_OPERATIONS.length).toBe(7);
    expect(ENUM_OPTIONS.canopy_operations).toBe(CANOPY_OPERATIONS);
    const field = productionEventRegistry.fields.find((f) => f.name === 'canopy_operation');
    expect(field?.enumSource).toBe('canopy_operations');
  });

  it('every value carries a label in both locales, and Spanish is not English', () => {
    for (const opt of CANOPY_OPERATIONS) {
      expect(EN, opt.labelKey).toHaveProperty(opt.labelKey);
      expect(ES, opt.labelKey).toHaveProperty(opt.labelKey);
      if (opt.value !== 'pruning' && opt.value !== 'hedging') {
        expect(ES[opt.labelKey], `${opt.value} is still English`).not.toBe(EN[opt.labelKey]);
      }
    }
  });

  it('the Spanish detail shows exactly the label the form shows (tucking is Amarre)', () => {
    for (const opt of CANOPY_OPERATIONS) {
      const es = row(1, 'CM', { canopy_operation: opt.value }, 'canopy_operation', ES);
      expect(es?.formattedValue, opt.value).toBe(ES[opt.labelKey]);
    }
    expect(ES['production.canopy.tucking']).toBe('Amarre');
  });

  it('the English detail shows the English form label', () => {
    for (const opt of CANOPY_OPERATIONS) {
      const en = row(1, 'CM', { canopy_operation: opt.value }, 'canopy_operation', EN);
      expect(en?.formattedValue, opt.value).toBe(EN[opt.labelKey]);
    }
  });

  it('a surface with no translate function (consumer fallback) still says Amarre for tucking', () => {
    // The exact-string ES map was keyed "Tucking" -> "Acomodo de brotes", a third word for the
    // operation the form calls Amarre. Surfaces that do pass translate never reach it.
    const bare = row(1, 'CM', { canopy_operation: 'tucking' }, 'canopy_operation');
    expect(bare?.formattedValue).toBe('Tucking');
    expect(localizeFieldValue(bare?.formattedValue, 'es-419')).toBe(
      ES['production.canopy.tucking']
    );
  });

  it('the hand-rolled detail map agrees with the catalogue', () => {
    for (const opt of CANOPY_OPERATIONS) {
      expect(getReadableFieldValue('canopy_operation', opt.value), opt.value).toBe(
        EN[opt.labelKey]
      );
    }
  });
});

describe('soil pH adjustment (PA)', () => {
  it('the subtype row says pH Adjustment, in both languages', () => {
    const en = row(5, 'PA', { soil_management_type: 'PA' }, 'soil_management_type', EN);
    expect(en?.formattedValue).toBe(EN['events.soil.subtypes.phAdjustment']);
    expect(en?.formattedValue).toBe('pH Adjustment');
    // The registry emits English; the producer surfaces localize it.
    expect(localizeFieldValue(en?.formattedValue, 'es-419')).toBe(
      ES['events.soil.subtypes.phAdjustment']
    );
  });

  it('the legacy event-name key that the form maps to PA no longer says Soil Amendment', () => {
    expect(EN['event.soil.amendment']).toBe('pH Adjustment');
    expect(ES['event.soil.amendment']).toBe(ES['events.soil.subtypes.phAdjustment']);
  });
});

describe('production subtype row (CU, MO and the other generic-verb subtypes)', () => {
  it('lists every registry subtype once, with the key the registry already uses', () => {
    const subtypes = productionEventRegistry.subtypes;
    expect(PRODUCTION_SUBTYPES.map((o) => o.value).sort()).toEqual(
      subtypes.map((s) => s.code).sort()
    );
    for (const s of subtypes) {
      expect(PRODUCTION_SUBTYPES.find((o) => o.value === s.code)?.labelKey).toBe(s.labelKey);
    }
  });

  it.each([
    ['CU', 'Cultivation', 'Cultivo'],
    ['MO', 'Mowing / Orchard-Floor', null]
  ])('%s names its operation in the detail view', (code, enLabel) => {
    const en = row(1, code, { production_type: code }, 'production_type', EN);
    expect(en?.formattedValue).toBe(enLabel);
    const es = row(1, code, { production_type: code }, 'production_type', ES);
    expect(es?.formattedValue).toBe(
      ES[`events.production.subtypes.${code === 'CU' ? 'cultivation' : 'mowing'}`]
    );
    expect(es?.formattedValue).not.toBe(enLabel);
    expect(ES['events.production.fields.activityType']).toBeTruthy();
  });

  it('is withheld where the title already names the operation', () => {
    for (const code of ['PL', 'TR', 'IR', 'HA', 'PH', 'EM']) {
      expect(row(1, code, { production_type: code }, 'production_type', EN), code).toBeUndefined();
    }
  });
});

describe('seed search attempts keep the supplier reply', () => {
  const fmt = (v: unknown) => formatSeedSearchAttempts(v, {} as never);

  it('prints the result beside the supplier', () => {
    expect(
      fmt([
        { supplier_name: 'Johnny', date_contacted: '2026-03-01', result: 'not available organic' },
        { supplier_name: 'High Mowing', result: '' },
        { supplier: 'Old Key Seeds', result: 'quantity too small' }
      ])
    ).toBe(
      '3 contacted: Johnny (not available organic), High Mowing, Old Key Seeds (quantity too small)'
    );
  });

  it('is unchanged when no result was typed', () => {
    expect(fmt([{ supplier_name: 'Johnny' }])).toBe('1 contacted: Johnny');
  });
});
