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
import { unrenderedProductionKeys } from 'utils/productionPayloadGates';

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

describe('parcel form — no key the UI does not render', () => {
  /**
   * All four were hardcoded into AddParcel's payload with no control anywhere in the
   * transparency form's four steps:
   *
   *   certified / certification_type  existed only as `defaultValues` in
   *                                   StandardParcelForm_Transparency — absent from its zod
   *                                   schema AND its interface — so every create shipped
   *                                   `certified: false`. Certifications are structured
   *                                   records; a form that never asks must not assert one.
   *   transparency_ready              is NOT a model field — but this note's claim that the
   *                                   hardcoded `true` "was discarded on arrival" was WRONG
   *                                   (corrected 2026-09-09): CreateParcelSerializer declared
   *                                   it write-only and moved it into agricultural_details, so
   *                                   the client's self-assertion was stored. The serializer
   *                                   field and `Parcel.is_transparency_ready()` are now both
   *                                   gone — the score is retired as a CONCEPT.
   *   carbon_calculation_enabled      IS a real BooleanField, but the form derived it from
   *                                   whether two prose boxes were non-empty.
   *
   * Same class as `treated_lumber_present: 'false'` above.
   */
  const UNRENDERED = [
    'certified',
    'certification_type',
    'transparency_ready',
    'carbon_calculation_enabled'
  ];

  it('AddParcel payload writes none of them', () => {
    const source = read('views/Dashboard/Dashboard/Parcel/AddParcel.tsx');
    for (const key of UNRENDERED) {
      expect(writesKey(source, key), `AddParcel payload carries ${key}`).toBe(false);
    }
  });

  it('neither does the RTK layer underneath it', () => {
    // 🔴 2026-09-09: this suite only ever read AddParcel.tsx, so it passed for a year while
    // productApi.js appended `transparency_ready` to BOTH the create and the update FormData
    // whenever a caller happened to supply it. The form is not the only writer of a payload —
    // the endpoint that builds it is one too.
    const source = read('store/api/productApi.js');
    for (const key of UNRENDERED) {
      expect(writesKey(source, key), `productApi appends ${key}`).toBe(false);
    }
  });

  it('the transparency form declares no default for them either', () => {
    // Where they actually lived. Blocking only the payload would leave the seed in place for
    // the next caller to pick up.
    const source = read('components/Forms/StandardParcelForm_Transparency.tsx');
    for (const key of ['certified', 'certification_type']) {
      expect(writesKey(source, key), `transparency form defaults ${key}`).toBe(false);
    }
  });

  it('one free-text box is never fanned out into two agronomic facts', () => {
    /**
     * `sustainability_practices` was written to BOTH `carbon_sequestration_practices` and
     * `cover_crop_management`, so a farmer typing "we apply compost" was also recorded as
     * running a cover-crop programme — and product/models.py reads either key as independent
     * evidence for is_transparency_ready() and get_transparency_score(), counting one
     * sentence twice.
     *
     * Reads assignments only: the legacy keys are still READ on hydration for parcels saved
     * before the fix, which is correct and must keep working.
     */
    // Strip `//` lines first: the fix left the old assignments quoted verbatim in a comment
    // so the next reader can see what the bug looked like, and a raw scan matches those.
    const code = read('views/Dashboard/Dashboard/Parcel/AddParcel.tsx')
      .split('\n')
      .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
      .join('\n');
    for (const key of ['carbon_sequestration_practices', 'cover_crop_management']) {
      expect(
        new RegExp(`agriculturalDetails\\.${key}\\s*=`).test(code),
        `AddParcel writes agricultural_details.${key}`
      ).toBe(false);
    }
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

describe('production form — F9: the payload carries no key the subtype does not render', () => {
  /**
   * 🔴 F9, Calapooia Bend rehearsal (2026-08-21). `ProductionTab.onSubmit` builds
   * `{ ...data }` from react-hook-form's WHOLE `defaultValues` object — every key for every
   * subtype — and several of those defaults are non-empty literals (`|| 'gallons'`,
   * `|| 'lbs'`, `|| 'false'`). A pruning record created through the wizard therefore arrived
   * carrying `is_summary:'false'`, `yield_total_unit:'lbs'`, `water_volume_unit:'gallons'`
   * and `temperature_control:'false'`, plus a fuel/transport/irrigation unit for
   * measurements it never took.
   *
   * Not cosmetic: `ProductionEventSerializer.to_internal_value` lifts exactly those names out
   * of the top level and writes them into `extra_data`, so the phantoms landed on the record.
   * Nothing renders `extra_data` generically today — which is the only reason no output was
   * wrong — and that is one "show everything recorded" panel away from a pruning event
   * asserting temperature control in a certifier packet.
   *
   * These assertions run the REAL gate rather than scanning the source, because the fix is a
   * gate that must FIRE, not a key that must be absent — and this project's 2026-08 lesson is
   * that a test supplying its own vocabulary passes forever while the feature does nothing.
   */

  /** The payload F9 actually observed, as react-hook-form hands it to `onSubmit`. */
  const PRUNING_RECORD = {
    type: 'PR',
    name: 'Dormant pruning',
    is_summary: 'false',
    date_start: '',
    date_end: '',
    event_count: '',
    yield_total: '',
    yield_total_unit: 'lbs',
    water_volume_total: '',
    water_volume_unit: 'gallons',
    temperature_control: 'false',
    fuel_consumed: '',
    fuel_unit: 'gal',
    transportation_distance: '',
    transportation_unit: 'km',
    irrigation_depth: '',
    irrigation_depth_unit: 'inches'
  };

  const gated = (data: Record<string, unknown>) => ({ ...data, ...unrenderedProductionKeys(data) });

  it('drops every phantom the pruning record carried', () => {
    const payload = gated(PRUNING_RECORD);
    for (const key of [
      'yield_total_unit',
      'water_volume_unit',
      'temperature_control',
      'fuel_unit',
      'transportation_unit',
      'irrigation_depth_unit'
    ]) {
      expect(payload[key], `pruning record still posts ${key}`).toBeUndefined();
    }
  });

  it('PR keeps its own summary keys — it is one of the three subtypes with the toggle', () => {
    // HA, PR and IR render the aggregate/summary sections. Gating `is_summary` off PR would
    // be the opposite error: dropping a control the farmer CAN see.
    expect(gated(PRUNING_RECORD).is_summary).toBe('false');
    expect(gated({ ...PRUNING_RECORD, type: 'HA' }).is_summary).toBe('false');
    expect(gated({ ...PRUNING_RECORD, type: 'IR' }).is_summary).toBe('false');
  });

  it('a subtype with no summary mode posts no summary keys at all', () => {
    const planting = gated({ ...PRUNING_RECORD, type: 'PL' });
    for (const key of ['is_summary', 'date_start', 'date_end', 'event_count']) {
      expect(planting[key], `PL posts ${key}`).toBeUndefined();
    }
  });

  it('the subtype that owns a field still sends it', () => {
    // The gate must not become a blanket strip — HA owns the harvest totals, IR the water
    // totals, PH the temperature control.
    const harvest = gated({
      ...PRUNING_RECORD,
      type: 'HA',
      is_summary: 'true',
      yield_total: '118750'
    });
    expect(harvest.yield_total_unit).toBe('lbs');

    const irrigation = gated({
      ...PRUNING_RECORD,
      type: 'IR',
      is_summary: 'true',
      water_volume_total: '4200'
    });
    expect(irrigation.water_volume_unit).toBe('gallons');

    const postHarvest = gated({ ...PRUNING_RECORD, type: 'PH' });
    expect(postHarvest.temperature_control).toBe('false');
  });

  it('an ORDINARY harvest posts no aggregate keys — owning the subtype is not enough', () => {
    // `yield_total_unit` renders inside the Harvest SUMMARY section, so a plain pick never
    // sees it. Gating on `type === 'HA'` alone left every ordinary harvest posting
    // `yield_total_unit: 'lbs'` — the same phantom as the pruning record, on the one subtype
    // that looked correctly handled. `temperature_control` is the control case: the PH
    // section renders it whether or not summary mode is on.
    const plainHarvest = gated({ ...PRUNING_RECORD, type: 'HA', is_summary: 'false' });
    expect(plainHarvest.yield_total_unit).toBeUndefined();
    expect(plainHarvest.yield_total).toBeUndefined();
    // …but the toggle itself is still on screen for HA, so it still travels.
    expect(plainHarvest.is_summary).toBe('false');

    const plainIrrigation = gated({ ...PRUNING_RECORD, type: 'IR', is_summary: 'false' });
    expect(plainIrrigation.water_volume_unit).toBeUndefined();
  });

  it("reads the summary toggle's STRING, not just a boolean", () => {
    // The toggle stores 'true'/'false' as strings, and `'false'` is truthy in JS — the trap
    // the field's own defaultValue comment calls out by name.
    const stringTrue = gated({ ...PRUNING_RECORD, type: 'HA', is_summary: 'true' });
    const boolTrue = gated({ ...PRUNING_RECORD, type: 'HA', is_summary: true });
    expect(stringTrue.yield_total_unit).toBe('lbs');
    expect(boolTrue.yield_total_unit).toBe('lbs');
  });

  it('a unit travels exactly when its quantity does', () => {
    // `fuel_unit: 'gal'` on a record with no fuel reading names a unit for a measurement
    // nobody took. Same reasoning as the blank-`area_covered`/`area_unit` pair the amendment
    // service refuses to offer as a populated field.
    expect(gated({ type: 'EM', fuel_consumed: '', fuel_unit: 'gal' }).fuel_unit).toBeUndefined();
    expect(gated({ type: 'EM', fuel_consumed: '12.5', fuel_unit: 'gal' }).fuel_unit).toBe('gal');
    expect(
      gated({ type: 'TP', transportation_distance: '', transportation_unit: 'km' })
        .transportation_unit
    ).toBeUndefined();
    expect(
      gated({ type: 'TP', transportation_distance: '48', transportation_unit: 'km' })
        .transportation_unit
    ).toBe('km');
    expect(
      gated({ type: 'IR', irrigation_depth: '', irrigation_depth_unit: 'inches' })
        .irrigation_depth_unit
    ).toBeUndefined();
    expect(
      gated({ type: 'IR', irrigation_depth: '1.5', irrigation_depth_unit: 'inches' })
        .irrigation_depth_unit
    ).toBe('inches');
  });

  it('with several parcels a unit stays, because its amount is on the parcel cards', () => {
    // Blank amounts in the form are the normal case then; dropping the unit let the model
    // default (gal, inches) stand against figures entered in litres or centimetres.
    const blank = { type: 'IR', fuel_unit: 'L', irrigation_depth_unit: 'cm' };
    expect(unrenderedProductionKeys(blank)).toMatchObject({
      fuel_unit: undefined,
      irrigation_depth_unit: undefined
    });
    const kept = unrenderedProductionKeys(blank, { amountsPerParcel: true });
    expect(kept).not.toHaveProperty('fuel_unit');
    expect(kept).not.toHaveProperty('irrigation_depth_unit');
    // The depth unit is irrigation's only: pruning carries its default and never renders it.
    expect(
      unrenderedProductionKeys(
        { type: 'PR', fuel_unit: 'L', irrigation_depth_unit: 'inches' },
        { amountsPerParcel: true }
      )
    ).toEqual(expect.objectContaining({ irrigation_depth_unit: undefined }));
    // Only those two: a unit whose amount is never per parcel is still gated.
    expect(
      unrenderedProductionKeys(
        { type: 'IR', transportation_unit: 'km' },
        { amountsPerParcel: true }
      )
    ).toHaveProperty('transportation_unit', undefined);
  });

  it('the wizard actually calls the gate, and does not re-assert a gated key afterwards', () => {
    // The source check that the behavioural ones cannot make: a later `key: data.key` line in
    // the same object literal would put the phantom straight back, which is exactly how the
    // 2026-08-19 rehearsal found a narrow gate overwritten by a wider spread.
    const source = read('views/Dashboard/Dashboard/components/forms/ProductionTab.jsx');
    // `(data)` or `(data, { amountsPerParcel: multiTarget })`: the options only ever keep a unit.
    expect(
      /\.\.\.unrenderedProductionKeys\(data(?:, \{ amountsPerParcel: multiTarget \})?\)/.test(
        source
      )
    ).toBe(true);
    expect(
      /^\s*irrigation_depth_unit:\s*data\.irrigation_depth_unit\s*\|\|\s*undefined,/m.test(source),
      'irrigation_depth_unit is re-asserted after the gate'
    ).toBe(false);
  });
});

describe('socialAuth mutation — the Terms acceptance reaches the server', () => {
  // The builder rebuilds `body` field by field (no rest-spread), so a key the sign-up screens
  // add to the call is silently dropped unless it is listed here. `accept_terms` was, and every
  // Google/Facebook sign-up recorded no acceptance while the component tests (which mock the
  // hook) stayed green.
  it('lists accept_terms in the request body', () => {
    const source = read('store/api/authApi.js');
    const social = endpointSlice(source, 'socialAuth', 'userData');
    const body = social.slice(social.indexOf('body:'));
    expect(body.slice(0, body.indexOf('}')), 'socialAuth body').toMatch(/\baccept_terms\b/);
  });
});
