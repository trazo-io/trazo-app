/**
 * One list of chemical-subtype labels, reachable from every path that renders one.
 *
 * 🔴 2026-09-02. `chemicalEvent.ts` declared `enumSource: 'chemical_subtypes_by_main_type'`
 * and ENUM_OPTIONS had no such key. `enumSource` was typed `string`, so it compiled;
 * `getEnumLabel` returned null and the resolver fell through to its de-underscore-and-
 * capitalise fallback. Nothing failed — the consumer card just printed "Copper Fungicide"
 * where the authored label said "Copper-Based Fungicide". And because `FIELD_VALUE_ES` is an
 * EXACT-STRING map keyed to the authored labels, that one-word difference meant SIX of the
 * thirteen values rendered in English on the Spanish consumer card:
 *
 *   slow_release_fertilizer · organic_pesticide · organic_herbicide
 *   organic_fungicide · copper_fungicide · sulfur_fungicide
 *
 * Three label maps existed for one field (ENUM_OPTIONS, fieldDisplayUtils VALUE_MAPPINGS,
 * fieldValues.es) and the display path read the one that was empty. `enumSource` is now typed
 * `EnumSourceKey`, so a dangling key is a compile error — this file pins the other half: that
 * the maps AGREE, since drift between them is silent in exactly the same way.
 */
import { describe, expect, it } from 'vitest';

import { CHEMICAL_SUBTYPES, ENUM_OPTIONS } from '../enums';
import { chemicalEventRegistry } from '../chemicalEvent';
import { getFieldsForSurface } from '../index';
import { getReadableFieldValue, localizeFieldValue } from 'utils/fieldDisplayUtils';
import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';

const EN = enUS as unknown as Record<string, string>;
const ES = es419 as unknown as Record<string, string>;

/** What a consumer card actually prints, through the real resolver. */
const rendered = (value: string, catalog: Record<string, string>): string | null => {
  const set = getFieldsForSurface(
    2,
    'FE',
    'consumer_card',
    { event_type: 2, type: 'FE', chemical_subtype: value, commercial_name: 'X' } as never,
    (key: string) => catalog[key] ?? key
  );
  const field = [...set.hero, ...set.immediate, ...set.secondary].find(
    (f) => f.name === 'chemical_subtype'
  );
  return field ? String(field.formattedValue) : null;
};

describe('chemical_subtype labels', () => {
  it('is not vacuous — the enum is registered and populated', () => {
    expect(CHEMICAL_SUBTYPES.length).toBe(13);
    expect(ENUM_OPTIONS.chemical_subtypes).toBe(CHEMICAL_SUBTYPES);
  });

  it('the field points at the registered key — not a name nothing defines', () => {
    const field = chemicalEventRegistry.fields.find((f) => f.name === 'chemical_subtype');
    expect(field, 'chemical_subtype left the registry').toBeTruthy();
    expect(field?.enumSource).toBe('chemical_subtypes');
    expect(
      ENUM_OPTIONS[field?.enumSource as keyof typeof ENUM_OPTIONS],
      'enumSource names a key ENUM_OPTIONS does not define — the exact 2026-09-02 defect'
    ).toBeTruthy();
  });

  it('every value carries a label in BOTH locales', () => {
    for (const opt of CHEMICAL_SUBTYPES) {
      expect(EN, `en-US missing ${opt.labelKey}`).toHaveProperty(opt.labelKey);
      expect(ES, `es-419 missing ${opt.labelKey}`).toHaveProperty(opt.labelKey);
      expect(ES[opt.labelKey], `${opt.labelKey} is still English`).not.toBe(EN[opt.labelKey]);
    }
  });

  it('the consumer card renders the authored label, never a capitalised slug', () => {
    for (const opt of CHEMICAL_SUBTYPES) {
      expect(rendered(opt.value, EN), opt.value).toBe(EN[opt.labelKey]);
      // The slug fallback is what the bug produced. Naming it keeps the assertion honest for
      // the values where the two happen to coincide ("Synthetic Fertilizer").
      const slug = opt.value
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      if (EN[opt.labelKey] !== slug) {
        expect(rendered(opt.value, EN), `${opt.value} fell back to the slug`).not.toBe(slug);
      }
    }
  });

  it('the Spanish consumer card is Spanish — all thirteen', () => {
    for (const opt of CHEMICAL_SUBTYPES) {
      const es = rendered(opt.value, ES);
      expect(es, opt.value).toBe(ES[opt.labelKey]);
      expect(es, `${opt.value} leaked English`).not.toBe(EN[opt.labelKey]);
    }
  });

  /*
   * The other two maps still have live readers — `getReadableFieldValue` feeds
   * EnhancedEventDetailModal's hand-rolled row, and `localizeFieldValue` post-processes the
   * consumer card. They are no longer the source of truth, but they must not CONTRADICT it:
   * the ES map is keyed by the English string, so an EN label change silently un-translates
   * the value. That is precisely how six of these broke.
   */
  it('the detail modal map agrees with the registry', () => {
    for (const opt of CHEMICAL_SUBTYPES) {
      expect(getReadableFieldValue('chemical_subtype', opt.value), opt.value).toBe(
        EN[opt.labelKey]
      );
    }
  });

  it('the exact-string ES map still matches the English the registry now emits', () => {
    for (const opt of CHEMICAL_SUBTYPES) {
      expect(localizeFieldValue(EN[opt.labelKey], 'es-419'), opt.value).toBe(ES[opt.labelKey]);
    }
  });
});

describe('no enumSource names a key ENUM_OPTIONS does not define', () => {
  /*
   * `compost_methods` was the second dangling key found in the same sweep. It was harmless in
   * DISPLAY — the field also declares a bespoke `formatter`, which the resolver prefers — but
   * `getEnumOptions` returns [] for it, so a registry-driven form would have rendered an EMPTY
   * select. Typing `enumSource` catches new ones at compile time; this catches the case where
   * someone widens the type again.
   */
  it('holds across every event registry', async () => {
    const mods = await Promise.all([
      import('../chemicalEvent'),
      import('../soilEvent'),
      import('../productionEvent'),
      import('../pestEvent'),
      import('../weatherEvent'),
      import('../businessEvent'),
      import('../generalEvent'),
      import('../equipmentEvent')
    ]);
    const registries = mods.map((m) =>
      Object.values(m).find((v: never) => (v as never)?.['fields'])
    );
    // A `.find` that misses returns undefined, and a loop over nothing passes. Pin the shape
    // before trusting the sweep — the whole point of this file is defects that pass silently.
    expect(registries.length).toBe(8);
    expect(registries.every(Boolean), 'a registry export was not found by shape').toBe(true);
    let checked = 0;
    for (const reg of registries) {
      for (const field of (reg as { fields: { name: string; enumSource?: string }[] }).fields) {
        if (!field.enumSource) continue;
        checked++;
        expect(
          ENUM_OPTIONS[field.enumSource as keyof typeof ENUM_OPTIONS],
          `${field.name} → '${field.enumSource}' is not an ENUM_OPTIONS key`
        ).toBeTruthy();
      }
    }
    expect(checked, 'the sweep found no enumSource at all — it is testing nothing').toBeGreaterThan(
      20
    );
  });
});
