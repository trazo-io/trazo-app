/**
 * Several products from one tank (OV-RK-C04): the request the wizard sends.
 *
 * The server writes one full record per product and per parcel (trazo-back
 * `history/services/tank_mix.py`) and refuses a product's fact in the shared body, a parcel's
 * fact on a product line, and a pass's fuel on any line but the first. These pin the body the
 * wizard builds for one parcel and for several, against the split in the spec copy.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';

import { isCaCountyRestricted } from '../caRestrictedMaterials';
import { specRulesFor } from '../multiParcel';
import {
  TANK_MIX,
  buildTankMixBody,
  defaultTargetPest,
  describeSeveralRecordErrors,
  pruneTankCardValues,
  newTankLine,
  tankCardFields,
  tankLineIssues,
  tankLineRequest,
  tankReview,
  type TankLineForm
} from '../tankMix';
import { buildMultiTargetBody, newTarget } from '../../../utils/multiParcel';

const PER_TARGET = specRulesFor(2, null)!.perTargetKeys;

const kocide = (): TankLineForm => ({
  ...newTankLine('product', 'lbs'),
  type: 'FU',
  commercial_name: 'Kocide 3000-O',
  active_ingredient: 'Copper hydroxide',
  epa_registration_number: '91411-7',
  concentration: '30%',
  volume_numeric: '6',
  application_rate: '1.5',
  application_rate_unit: 'lb_ac',
  rei_hours: '48',
  phi_days: '0',
  organic_approved: 'omri_listed',
  target_pest_disease: 'Fire blight',
  application_purpose: 'disease_management',
  supplier_name: 'Wilbur-Ellis',
  purchase_date: '2026-04-20',
  purchase_invoice: 'INV-2',
  receipt_document: '17',
  chemical_lot_number: 'LOT-K9',
  quantity_purchased: '25',
  quantity_purchased_unit: 'lbs'
});

const dyneAmic = (): TankLineForm => ({
  ...newTankLine('adjuvant', 'fl_oz'),
  commercial_name: 'Dyne-Amic',
  concentration_not_recorded: 'true',
  volume_numeric: '8'
});

/** The single-parcel body the wizard builds today for product 1 (ChemicalTab onSubmit + NewEvent). */
const singleBody = () => ({
  event_type: 2,
  date: '2026-05-02T06:30',
  type: 'PE',
  commercial_name: 'Entrust SC',
  epa_registration_number: '62719-621',
  concentration: '22.5%',
  concentration_not_recorded: false,
  volume_applied: '24',
  volume_numeric: 24,
  volume_unit: 'fl_oz',
  area_treated: '4',
  area_numeric: 4,
  area_unit: 'acres',
  application_method: 'air_blast',
  way_of_application: 'air_blast',
  application_fuel_consumed: '3',
  application_fuel_type: 'diesel',
  application_fuel_unit: 'gal',
  rei_hours: 4,
  phi_days: 7,
  organic_approved: 'omri_listed',
  wind_from: 'NW',
  target_pest_disease: undefined,
  tank_mix_partners: [],
  tank_lines: [kocide(), dyneAmic()],
  parcels: [2],
  block_id: 'Row 4',
  extra_data: {
    volume_unit: 'fl_oz',
    area_unit: 'acres',
    active_ingredient: 'Spinosad',
    target_pest_disease: 'Codling moth',
    application_fuel_consumed: '3',
    application_fuel_type: 'diesel',
    application_fuel_unit: 'gal'
  }
});

describe('the split the wizard reads is the server spec', () => {
  it('names product keys, the per-parcel amount and the first-line fuel', () => {
    expect(TANK_MIX.minLines).toBe(2);
    expect(TANK_MIX.roles).toEqual(['product', 'adjuvant']);
    for (const key of ['commercial_name', 'epa_registration_number', 'rei_hours', 'phi_days']) {
      expect(TANK_MIX.perLine.has(key), key).toBe(true);
    }
    expect([...TANK_MIX.perLinePerTarget]).toEqual(['volume_applied', 'volume', 'volume_numeric']);
    expect(TANK_MIX.firstLineOnly.has('application_fuel_consumed')).toBe(true);
    // Each product's own target and purchase (OV-RK-C04): never once for the tank.
    for (const key of [
      'target_pest_disease',
      'application_purpose',
      'supplier_name',
      'purchase_date',
      'purchase_invoice',
      'receipt_document',
      'chemical_lot_number',
      'quantity_purchased',
      'quantity_purchased_unit'
    ]) {
      expect(TANK_MIX.perLine.has(key), key).toBe(true);
    }
    expect(TANK_MIX.perLineDefaultFromShared.has('target_pest_disease')).toBe(false);
    // A product key is never a parcel key: the server would refuse it in either place.
    for (const key of TANK_MIX.perLine) expect(PER_TARGET.has(key), key).toBe(false);
  });
});

describe('a product line', () => {
  it('asks what product 1 asks', () => {
    expect(tankLineIssues(newTankLine())).toEqual([
      'commercial_name',
      'concentration',
      'volume_numeric'
    ]);
    expect(tankLineIssues(kocide())).toEqual([]);
    expect(tankLineIssues(dyneAmic())).toEqual([]);
    expect(tankLineIssues({ ...kocide(), concentration_not_recorded: 'true' })).toEqual([
      'concentration_and_flag'
    ]);
    expect(tankLineIssues({ ...kocide(), application_rate_unit: '' })).toEqual(['rate_unit']);
    expect(tankLineIssues({ ...kocide(), rei_hours: '-4' })).toEqual(['rei_hours']);
    expect(tankLineIssues({ ...kocide(), volume_unit: '' })).toEqual(['volume_unit']);
  });

  it('with several parcels its amount is asked on the cards, not on the line', () => {
    expect(tankLineIssues({ ...kocide(), volume_numeric: '' }, { severalParcels: true })).toEqual(
      []
    );
    expect(tankLineIssues({ ...kocide(), volume_numeric: '' })).toEqual(['volume_numeric']);
  });

  it('sends its own facts, blanks left out, and the flag instead of a value', () => {
    expect(tankLineRequest(kocide())).toEqual({
      tank_mix_role: 'product',
      type: 'FU',
      commercial_name: 'Kocide 3000-O',
      active_ingredient: 'Copper hydroxide',
      epa_registration_number: '91411-7',
      concentration: '30%',
      volume_unit: 'lbs',
      application_rate: '1.5',
      application_rate_unit: 'lb_ac',
      rei_hours: '48',
      phi_days: '0',
      organic_approved: 'omri_listed',
      target_pest_disease: 'Fire blight',
      application_purpose: 'disease_management',
      supplier_name: 'Wilbur-Ellis',
      purchase_date: '2026-04-20',
      purchase_invoice: 'INV-2',
      receipt_document: '17',
      chemical_lot_number: 'LOT-K9',
      quantity_purchased: '25',
      quantity_purchased_unit: 'lbs',
      volume_applied: '6'
    });
    // An adjuvant keeps the spray's type, and "not on my record" is sent as the flag.
    expect(tankLineRequest({ ...dyneAmic(), type: 'FU' })).toEqual({
      tank_mix_role: 'adjuvant',
      commercial_name: 'Dyne-Amic',
      volume_unit: 'fl_oz',
      concentration_not_recorded: true,
      volume_applied: '8'
    });
    expect(tankLineRequest(kocide(), { severalParcels: true })).not.toHaveProperty(
      'volume_applied'
    );
  });

  it('sends a purchase unit only beside a quantity', () => {
    const noQuantity = tankLineRequest({ ...kocide(), quantity_purchased: '' });
    expect(noQuantity).not.toHaveProperty('quantity_purchased');
    expect(noQuantity).not.toHaveProperty('quantity_purchased_unit');
    expect(noQuantity.purchase_invoice).toBe('INV-2');
  });
});

describe('a new line’s target pest', () => {
  it('is product 1’s only when the grower typed it there', () => {
    expect(defaultTargetPest('Codling moth', true)).toBe('Codling moth');
    // Opened with it (voice, a template, a repeated record): not the grower's statement here.
    expect(defaultTargetPest('Codling moth', false)).toBe('');
    expect(defaultTargetPest('  ', true)).toBe('');
    expect(newTankLine('product', 'gal', { targetPest: 'Codling moth' }).target_pest_disease).toBe(
      'Codling moth'
    );
    expect(newTankLine().target_pest_disease).toBe('');
  });
});

describe('the tank request on one parcel', () => {
  const body = buildTankMixBody({
    body: singleBody(),
    lines: [kocide(), dyneAmic()],
    tankId: 'tank-1',
    perTargetKeys: PER_TARGET,
    singleTarget: { parcel: 2, history: null }
  });

  it('has the tank id, three product lines and one target', () => {
    expect(body.tank_mix_group).toBe('tank-1');
    const products = body.products as Record<string, unknown>[];
    expect(products.map((p) => p.commercial_name)).toEqual([
      'Entrust SC',
      'Kocide 3000-O',
      'Dyne-Amic'
    ]);
    expect(products.map((p) => p.tank_mix_role)).toEqual(['product', 'product', 'adjuvant']);
    expect(body.targets).toEqual([
      {
        parcel: 2,
        area_treated: '4',
        area_numeric: 4,
        application_fuel_consumed: '3',
        block_id: 'Row 4'
      }
    ]);
  });

  it('moves product 1 out of the shared body, its amount onto its line', () => {
    const [first] = body.products as Record<string, unknown>[];
    expect(first).toMatchObject({
      commercial_name: 'Entrust SC',
      epa_registration_number: '62719-621',
      active_ingredient: 'Spinosad',
      volume_unit: 'fl_oz',
      volume_applied: '24',
      volume_numeric: 24,
      rei_hours: 4,
      phi_days: 7,
      organic_approved: 'omri_listed'
    });
    for (const key of TANK_MIX.perLine) {
      if (TANK_MIX.perLineDefaultFromShared.has(key)) continue;
      expect(body, key).not.toHaveProperty(key);
      expect(body.extra_data as object, key).not.toHaveProperty(key);
    }
    for (const key of PER_TARGET) {
      expect(body, key).not.toHaveProperty(key);
      expect(body.extra_data as object, key).not.toHaveProperty(key);
    }
  });

  it('keeps the pass shared and drops what a tank never sends', () => {
    expect(body).toMatchObject({
      type: 'PE',
      date: '2026-05-02T06:30',
      way_of_application: 'air_blast',
      application_fuel_type: 'diesel',
      wind_from: 'NW'
    });
    // The target pest is product 1's, not the tank's: it leaves extra_data for its line.
    expect(body.extra_data as object).not.toHaveProperty('target_pest_disease');
    expect((body.products as Record<string, unknown>[])[0].target_pest_disease).toBe(
      'Codling moth'
    );
    expect((body.products as Record<string, unknown>[])[1]).toMatchObject({
      target_pest_disease: 'Fire blight',
      purchase_invoice: 'INV-2',
      receipt_document: '17',
      chemical_lot_number: 'LOT-K9',
      quantity_purchased: '25',
      quantity_purchased_unit: 'lbs'
    });
    for (const key of ['tank_lines', 'tank_mix_partners', 'parcels', 'application_group']) {
      expect(body, key).not.toHaveProperty(key);
    }
  });

  it('names the season when the form does', () => {
    const named = buildTankMixBody({
      body: singleBody(),
      lines: [kocide()],
      tankId: 't',
      perTargetKeys: PER_TARGET,
      singleTarget: { parcel: 2, history: 41 }
    });
    expect((named.targets as Record<string, unknown>[])[0].history).toBe(41);
  });
});

describe('the tank request on several parcels', () => {
  const rules = specRulesFor(2, null)!;
  const lines = [kocide(), dyneAmic()];
  const cards = tankCardFields(lines);
  const cardRules = { ...rules, fields: [...rules.fields, ...cards.fields] };
  const form = {
    volume_unit: 'fl_oz',
    area_unit: 'acres',
    application_rate: '6',
    application_rate_unit: 'fl_oz_ac',
    application_fuel_unit: 'gal',
    ...cards.form
  };
  const north = {
    ...newTarget({ id: 2, name: 'North', area: 0 }),
    scope: 'part' as const,
    partArea: '4'
  };
  const south = {
    ...newTarget({ id: 3, name: 'South', area: 0 }),
    scope: 'part' as const,
    partArea: '6',
    // The grower typed this one; the rest derive from each product's rate.
    // Keyed by the line's own field (its id), never by its position in the tank.
    values: { [cards.fields[1].key]: '12' }
  };
  const multi = buildMultiTargetBody(
    { ...singleBody(), application_rate: '6', application_rate_unit: 'fl_oz_ac' },
    [north, south],
    cardRules,
    form,
    'unused'
  );
  const body = buildTankMixBody({
    body: multi,
    lines,
    tankId: 'tank-2',
    perTargetKeys: PER_TARGET
  });

  it('carries each product amount inside each parcel, in line order', () => {
    expect(body.targets).toEqual([
      {
        parcel: 2,
        area_treated: '4',
        applied_scope: 'part',
        products: [{ volume_applied: '24' }, { volume_applied: '6' }, {}]
      },
      {
        parcel: 3,
        area_treated: '6',
        applied_scope: 'part',
        products: [{ volume_applied: '36' }, { volume_applied: '9' }, { volume_applied: '12' }]
      }
    ]);
  });

  it("each parcel's own start and stop ride on its target, for every line written there", () => {
    const timed = buildTankMixBody({
      body: buildMultiTargetBody(
        {
          ...singleBody(),
          application_rate: '6',
          application_rate_unit: 'fl_oz_ac',
          application_start: '2026-05-02T06:00'
        },
        [
          {
            ...north,
            times: { application_start: '2026-05-02T06:00', application_end: '2026-05-02T07:00' }
          },
          { ...south, times: { application_start: '2026-05-02T07:15' } }
        ],
        cardRules,
        form,
        'unused',
        { timesPerParcel: true }
      ),
      lines,
      tankId: 'tank-3',
      perTargetKeys: PER_TARGET
    });
    expect(timed).not.toHaveProperty('application_start');
    const [n, s] = timed.targets as Record<string, unknown>[];
    expect(n).toMatchObject({
      application_start: '2026-05-02T06:00',
      application_end: '2026-05-02T07:00'
    });
    expect(s.application_start).toBe('2026-05-02T07:15');
    expect(s).not.toHaveProperty('application_end');
    for (const line of timed.products as Record<string, unknown>[]) {
      expect(line).not.toHaveProperty('application_start');
    }
  });

  it('sends no amount on a line and no group of its own', () => {
    for (const line of body.products as Record<string, unknown>[]) {
      expect(line).not.toHaveProperty('volume_applied');
      expect(line).not.toHaveProperty('volume_numeric');
    }
    expect(body).not.toHaveProperty('application_group');
    expect(body.tank_mix_group).toBe('tank-2');
    expect((body.products as Record<string, unknown>[])[0].volume_unit).toBe('fl_oz');
  });

  it('labels each product amount on the cards, in both languages', () => {
    expect(cards.fields.map((f) => f.labelId)).toEqual([
      'events.multiParcel.field.tankLine',
      'events.multiParcel.field.tankLine'
    ]);
    expect(cards.fields[0].labelValues).toEqual({ product: 'Kocide 3000-O' });
    expect(tankCardFields([newTankLine()]).fields[0].labelId).toBe(
      'events.multiParcel.field.tankLineUnnamed'
    );
    for (const id of [
      'events.multiParcel.field.tankLine',
      'events.multiParcel.field.tankLineUnnamed'
    ]) {
      expect((enUS as Record<string, string>)[id], id).toBeTruthy();
      expect((es419 as Record<string, string>)[id], id).toBeTruthy();
    }
  });
});

describe('review of app #380', () => {
  it('a removed product takes its parcel amounts with it, and never hands them to another', () => {
    // 4. Amounts keyed by the line's id: removing Kocide leaves Dyne-Amic's 8, not Kocide's 6.
    const lines = [kocide(), dyneAmic()];
    const rules = specRulesFor(2, null)!;
    const before = tankCardFields(lines);
    const [kocideKey, dyneKey] = before.fields.map((f) => f.key);
    const target = {
      ...newTarget({ id: 2, name: 'North', area: 0 }),
      scope: 'part' as const,
      partArea: '4',
      values: { [kocideKey]: '6', [dyneKey]: '8' }
    };
    const remaining = [lines[1]];
    const [pruned] = pruneTankCardValues([target], remaining);
    expect(pruned.values).toEqual({ [dyneKey]: '8' });
    const after = tankCardFields(remaining);
    expect(after.fields[0].key).toBe(dyneKey);
    const multi = buildMultiTargetBody(
      { ...singleBody(), application_rate: '6', application_rate_unit: 'fl_oz_ac' },
      [pruned],
      { ...rules, fields: [...rules.fields, ...after.fields] },
      {
        volume_unit: 'fl_oz',
        area_unit: 'acres',
        application_rate: '6',
        application_rate_unit: 'fl_oz_ac',
        ...after.form
      },
      'unused'
    );
    const body = buildTankMixBody({
      body: multi,
      lines: remaining,
      tankId: 't',
      perTargetKeys: PER_TARGET
    });
    expect((body.targets as Record<string, unknown>[])[0].products).toEqual([
      { volume_applied: '24' },
      { volume_applied: '8' }
    ]);
    // Nothing to prune: the same array comes back, so the form does not re-render for nothing.
    const unchanged = [target];
    expect(pruneTankCardValues(unchanged, lines)).toBe(unchanged);
  });

  it('each line carries its own Restricted Use flag and CA permit to its record', () => {
    // 5.
    const line = {
      ...kocide(),
      restricted_use_pesticide: 'true',
      ca_dpr_permit_number: 'SD-2026-00147',
      ca_dpr_permit_county: 'San Diego',
      ca_dpr_permit_expires: '2026-12-31'
    };
    expect(tankLineRequest(line)).toMatchObject({
      restricted_use_pesticide: true,
      ca_dpr_permit_number: 'SD-2026-00147',
      ca_dpr_permit_county: 'San Diego',
      ca_dpr_permit_expires: '2026-12-31'
    });
    expect(tankLineRequest(kocide())).not.toHaveProperty('restricted_use_pesticide');
    expect(isCaCountyRestricted('Kocide 3000-O')).toBe(true);
    expect(isCaCountyRestricted('Dyne-Amic')).toBe(false);
  });

  it('a new line never seeds a unit its select does not offer', () => {
    // 7. A dispenser count is product 1's alone; a line falls back to gallons.
    expect(newTankLine('product', 'dispensers').volume_unit).toBe('gal');
    expect(newTankLine('product', 'dispensers').quantity_purchased_unit).toBe('gal');
    expect(newTankLine('product', 'oz').volume_unit).toBe('gal');
    expect(newTankLine('product', 'fl_oz').volume_unit).toBe('fl_oz');
    expect(newTankLine().uid).not.toBe(newTankLine().uid);
  });

  it('says every refusal: the product line and the parcel, named, never a raw id', () => {
    // 8.
    const text = describeSeveralRecordErrors(
      {
        products: { '2': { rei_hours: ['REI cannot be negative'] } },
        targets: { '12': ['No open production'] }
      },
      {
        includeTargets: true,
        lineText: (line, message) => `Product ${line}: ${message}`,
        nameOf: (key) => (key === '12' ? 'North Block' : null)
      }
    );
    expect(text).toBe('Product 2: REI cannot be negative; North Block: No open production');
    const unnamed = describeSeveralRecordErrors(
      { targets: { '99': ['No open production'] } },
      { includeTargets: true, lineText: (l, m) => m, nameOf: () => null }
    );
    expect(unnamed).toBe('No open production');
    expect(unnamed).not.toContain('99');
  });

  it('never prints a coded refusal as words, and words it when it can', () => {
    // Review of app #438: a multi-parcel save nests the serializer body, error_codes included,
    // under each place, and the flattened toast read "..., manure_below_floor, Lettuce, 120".
    const body = {
      targets: {
        '12': {
          manure_harvest_interval: ['Lettuce: the edible part touches the soil ...'],
          error_codes: {
            manure_harvest_interval: { code: 'manure_below_floor', crop: 'Lettuce', days: '120' }
          }
        }
      }
    };
    const opts = {
      includeTargets: true,
      lineText: (l: string, m: string) => m,
      nameOf: () => 'North Block'
    };
    const english = describeSeveralRecordErrors(body, opts);
    expect(english).toBe('North Block: Lettuce: the edible part touches the soil ...');
    const worded = describeSeveralRecordErrors(body, {
      ...opts,
      translate: (id, v) => `${id}|${v.crop}|${v.days}`
    });
    expect(worded).toBe('North Block: apiErrors.manureBelowFloor|Lettuce|120');
  });

  it('words a closed season under a place with the date in the reader’s format', () => {
    // The 403 sentence of one place rides as `{detail, error_codes}` inside `targets` (2026-11-21).
    const body = {
      targets: {
        '12': {
          detail:
            'This production was finished on 2026-10-01, so its season is a closed record. ...',
          error_codes: { detail: { code: 'season_closed', finish_date: '2026-10-01' } }
        }
      }
    };
    const worded = describeSeveralRecordErrors(body, {
      includeTargets: true,
      lineText: (l: string, m: string) => m,
      nameOf: () => 'North Block',
      translate: (id, v) => `${id}|${v.finish_date}`,
      formatDate: (iso) => `<${iso}>`
    });
    expect(worded).toBe('North Block: apiErrors.seasonClosed|<2026-10-01>');
  });

  it('the wizard joins both and names the single-parcel tank’s parcel', () => {
    const src = readFileSync(
      join(__dirname, '../../../views/Dashboard/Dashboard/components/forms/NewEvent.jsx'),
      'utf8'
    );
    expect(src).toContain('describeSeveralRecordErrors(error?.data');
    expect(src).toContain('includeTargets: multiActive || tankRequested');
    expect(src).toContain('farmParcels.find((p) => String(p.id) === parcel)?.name');
    expect(src).toContain('setMultiTargets((prev) => pruneTankCardValues(prev, tankLines))');
  });
});

describe('what the review step shows of a tank (walkthrough 2026-11-20, W2)', () => {
  // The review read only the form's top-level values: a three-product tank on two blocks was
  // confirmed on a screen naming one product and no amount, and the save wrote six records.
  const rules = specRulesFor(2, null)!;
  const lines = [kocide(), { ...dyneAmic(), organic_approved: '' }];
  const cards = tankCardFields(lines);
  const cardRules = { ...rules, fields: [...rules.fields, ...cards.fields] };
  const form = {
    volume_unit: 'fl_oz',
    area_unit: 'acres',
    application_rate: '6',
    application_rate_unit: 'fl_oz_ac',
    application_fuel_unit: 'gal',
    ...cards.form
  };
  const north = {
    ...newTarget({ id: 2, name: 'North', area: 0 }),
    scope: 'part' as const,
    partArea: '4'
  };
  const south = {
    ...newTarget({ id: 3, name: 'South', area: 0 }),
    scope: 'part' as const,
    partArea: '6',
    values: { [cards.fields[1].key]: '12' }
  };
  const multi = buildMultiTargetBody({}, [north, south], cardRules, form, 'review');

  it('names every product after the first with the facts its record will hold', () => {
    const { products } = tankReview({ lines, multiBody: multi });
    expect(products.map((p) => [p.number, p.role, p.name])).toEqual([
      [2, 'product', 'Kocide 3000-O'],
      [3, 'adjuvant', 'Dyne-Amic']
    ]);
    expect(products[0]).toMatchObject({
      rate: '1.5',
      rateUnit: 'lb_ac',
      concentration: '30%',
      concentrationNotRecorded: false,
      rei: '48',
      phi: '0',
      basis: 'omri_listed',
      // Several parcels: the amount is each parcel's, never one figure for the tank.
      amount: ''
    });
    expect(products[1]).toMatchObject({ concentrationNotRecorded: true, basis: '' });
  });

  it("lists each parcel's amounts as the save sends them, product 1 first", () => {
    const review = tankReview({ lines, multiBody: multi });
    const sent = buildTankMixBody({ body: multi, lines, tankId: 't', perTargetKeys: PER_TARGET });
    expect(review.parcels).toEqual([
      { parcelId: 2, amounts: ['24', '6', ''] },
      { parcelId: 3, amounts: ['36', '9', '12'] }
    ]);
    // The same numbers the request carries, parcel by parcel and line by line.
    (sent.targets as { products: { volume_applied?: string }[] }[]).forEach((target, i) => {
      expect(target.products.map((p) => p.volume_applied ?? '')).toEqual(review.parcels[i].amounts);
    });
    expect(review.records).toBe(6);
  });

  it('on one parcel, each product carries its own amount and the records are one per product', () => {
    const review = tankReview({ lines, multiBody: null });
    expect(review.parcels).toEqual([]);
    expect(review.products.map((p) => [p.amount, p.unit])).toEqual([
      ['6', 'lbs'],
      ['8', 'fl_oz']
    ]);
    expect(review.records).toBe(3);
  });

  it('a spray of one product on several parcels still lists each parcel', () => {
    const plain = buildMultiTargetBody({}, [north, south], rules, form, 'review');
    const review = tankReview({ lines: [], multiBody: plain });
    expect(review.products).toEqual([]);
    expect(review.parcels).toEqual([
      { parcelId: 2, amounts: ['24'] },
      { parcelId: 3, amounts: ['36'] }
    ]);
    expect(review.records).toBe(2);
  });
});
