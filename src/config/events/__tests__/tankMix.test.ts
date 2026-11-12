/**
 * Several products from one tank (OV-RK-C04): the request the wizard sends.
 *
 * The server writes one full record per product and per parcel (trazo-back
 * `history/services/tank_mix.py`) and refuses a product's fact in the shared body, a parcel's
 * fact on a product line, and a pass's fuel on any line but the first. These pin the body the
 * wizard builds for one parcel and for several, against the split in the spec copy.
 */
import { describe, expect, it } from 'vitest';
import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';

import { specRulesFor } from '../multiParcel';
import {
  TANK_MIX,
  buildTankMixBody,
  defaultTargetPest,
  newTankLine,
  tankCardFieldKey,
  tankCardFields,
  tankLineIssues,
  tankLineRequest,
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
    values: { [tankCardFieldKey(3)]: '12' }
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
