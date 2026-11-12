/**
 * Several products sprayed from one tank (overall review 2026-11, OV-RK-C04 / OV-FJ-C10).
 *
 * The server writes ONE FULL RECORD per product line and per parcel, all or none, tied by
 * `tank_mix_group` (trazo-back `history/services/tank_mix.py`). What belongs to one product and
 * what is shared by the one pass comes from the `tank_mix` block of `multiParcelSpec.json`, the
 * checked copy of the server's spec, so the form and the server cannot disagree about it.
 *
 * Product 1 is the product the spray form already asks for. Products 2..N are `tank_lines` in the
 * form: each its own name, EPA number, amount or rate, concentration (or "not on my record"),
 * REI, PHI and organic basis. Adjuvants and spreader-stickers are lines too, with role
 * `adjuvant`, so each gets its own National List check and its own PUR row.
 *
 * NEVER: invent a per-product number. An amount on a parcel card is typed, or shown as rate ×
 * area from the rate the grower typed for that product (utils/multiParcel), never a share of the
 * tank.
 */
import spec from './multiParcelSpec.json';

interface RawTankMix {
  min_lines: number;
  max_lines: number;
  roles: string[];
  per_line: string[];
  per_line_default_from_shared: string[];
  per_line_per_target: string[];
  first_line_only: string[];
  refused: string[];
}

const RAW = (spec as unknown as { types: Record<string, { tank_mix?: RawTankMix }> }).types['2']
  .tank_mix as RawTankMix;

export const TANK_MIX = {
  minLines: RAW.min_lines,
  maxLines: RAW.max_lines,
  roles: RAW.roles,
  perLine: new Set(RAW.per_line),
  perLineDefaultFromShared: new Set(RAW.per_line_default_from_shared),
  perLinePerTarget: new Set(RAW.per_line_per_target),
  firstLineOnly: new Set(RAW.first_line_only),
  refused: new Set(RAW.refused)
} as const;

export type TankMixRole = 'product' | 'adjuvant';

/** One product of the tank after the first, as the form holds it (strings, like the rest). */
export interface TankLineForm {
  /**
   * Minted once per line and never reused. The parcel cards key this product's amount by it, so
   * removing another line can never hand this product someone else's typed amount.
   */
  uid: string;
  role: TankMixRole;
  /** FE / PE / FU / HE when it differs from the spray's; blank keeps the spray's own type. */
  type: string;
  commercial_name: string;
  active_ingredient: string;
  epa_registration_number: string;
  concentration: string;
  /** 'true' / 'false', like the form's other ticks. */
  concentration_not_recorded: string;
  /** The amount of this product when the tank covered ONE parcel; per parcel otherwise. */
  volume_numeric: string;
  volume_unit: string;
  application_rate: string;
  application_rate_unit: string;
  rei_hours: string;
  phi_days: string;
  organic_approved: string;
  omri_product: number | null;
  wsda_material: number | null;
  /** This product's own target: Kocide for fire blight, Entrust for codling moth, one tank. */
  target_pest_disease: string;
  application_purpose: string;
  /** The purchase this product came from: the same facts product 1's purchase section asks. */
  supplier_name: string;
  purchase_date: string;
  purchase_invoice: string;
  /** An uploaded receipt file's id (ReceiptDocumentSelect), '' for none. */
  receipt_document: string;
  chemical_lot_number: string;
  quantity_purchased: string;
  quantity_purchased_unit: string;
  /** 'true' / 'false': this product is a Restricted Use Pesticide (the applicator's number is owed). */
  restricted_use_pesticide: string;
  /** A California county-restricted material's permit, asked as product 1 asks it. */
  ca_dpr_permit_number: string;
  ca_dpr_permit_county: string;
  ca_dpr_permit_expires: string;
}

/** The product units a tank line offers: the spray form's, without a dispenser count (never mixed). */
export const TANK_LINE_VOLUME_UNITS: readonly string[] = [
  'L',
  'gal',
  'mL',
  'fl_oz',
  'oz_wt',
  'kg',
  'lbs'
];

let uidCounter = 0;
/** A line id unique in this page: random where the browser has it, a counter otherwise. */
export const newLineUid = (): string => {
  uidCounter += 1;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return `l${Date.now().toString(36)}${uidCounter}`;
};

const filled = (value: unknown) =>
  value !== undefined && value !== null && String(value).trim() !== '';
const nonNegative = (value: unknown) => !filled(value) || Number(value) >= 0;

/**
 * A new line's target pest: product 1's, as an editable default, only when the grower TYPED one
 * there in this form (`typedByGrower`). A value the form was opened with (a voice note, a template,
 * a repeated record) is not the grower's statement about this product, so it is never copied.
 */
export const defaultTargetPest = (line1Value: unknown, typedByGrower: boolean): string =>
  typedByGrower && filled(line1Value) ? String(line1Value).trim() : '';

export const newTankLine = (
  role: TankMixRole = 'product',
  volumeUnit = 'gal',
  { targetPest = '' }: { targetPest?: string } = {}
): TankLineForm => {
  // Product 1's unit seeds the line only when a line can hold it: never a dispenser count, which
  // the line's unit select does not offer and the form would then show as blank.
  const unit = TANK_LINE_VOLUME_UNITS.includes(volumeUnit) ? volumeUnit : 'gal';
  return {
    uid: newLineUid(),
    role,
    type: '',
    commercial_name: '',
    active_ingredient: '',
    epa_registration_number: '',
    concentration: '',
    concentration_not_recorded: 'false',
    volume_numeric: '',
    volume_unit: unit,
    application_rate: '',
    application_rate_unit: '',
    rei_hours: '',
    phi_days: '',
    organic_approved: '',
    omri_product: null,
    wsda_material: null,
    target_pest_disease: targetPest,
    application_purpose: '',
    supplier_name: '',
    purchase_date: '',
    purchase_invoice: '',
    receipt_document: '',
    chemical_lot_number: '',
    quantity_purchased: '',
    quantity_purchased_unit: unit,
    restricted_use_pesticide: 'false',
    ca_dpr_permit_number: '',
    ca_dpr_permit_county: '',
    ca_dpr_permit_expires: ''
  };
};

export type TankLineIssue =
  | 'commercial_name'
  | 'concentration'
  | 'concentration_and_flag'
  | 'volume_numeric'
  | 'volume_unit'
  | 'rate_unit'
  | 'rei_hours'
  | 'phi_days';

/**
 * What a product line still needs before it can be saved. The same rules the form applies to
 * product 1, per line: a name, the concentration or "not on my record" (never both), the unit,
 * and, with one parcel, the amount (several parcels ask the amount per parcel card).
 */
export const tankLineIssues = (
  line: Partial<TankLineForm>,
  { severalParcels = false }: { severalParcels?: boolean } = {}
): TankLineIssue[] => {
  const issues: TankLineIssue[] = [];
  if (!filled(line.commercial_name) || String(line.commercial_name).trim().length < 2) {
    issues.push('commercial_name');
  }
  const notOnRecord = line.concentration_not_recorded === 'true';
  if (notOnRecord && filled(line.concentration)) issues.push('concentration_and_flag');
  else if (!notOnRecord && !filled(line.concentration)) issues.push('concentration');
  if (!filled(line.volume_unit)) issues.push('volume_unit');
  if (!severalParcels && !(Number(line.volume_numeric) > 0)) issues.push('volume_numeric');
  if (filled(line.application_rate) && !filled(line.application_rate_unit))
    issues.push('rate_unit');
  if (!nonNegative(line.rei_hours)) issues.push('rei_hours');
  if (!nonNegative(line.phi_days)) issues.push('phi_days');
  return issues;
};

/** The request fields of one form line: its own facts only, blanks left out. */
export const tankLineRequest = (
  line: Partial<TankLineForm>,
  { severalParcels = false }: { severalParcels?: boolean } = {}
): Record<string, unknown> => {
  const out: Record<string, unknown> = {
    tank_mix_role: line.role === 'adjuvant' ? 'adjuvant' : 'product'
  };
  const text = (key: keyof TankLineForm) => {
    if (filled(line[key])) out[key] = String(line[key]).trim();
  };
  // An adjuvant is recorded under the spray's type; a product may name its own.
  if (line.role !== 'adjuvant') text('type');
  text('commercial_name');
  text('active_ingredient');
  text('epa_registration_number');
  text('volume_unit');
  text('organic_approved');
  if (line.concentration_not_recorded === 'true') {
    out.concentration_not_recorded = true;
  } else {
    text('concentration');
  }
  // The rate travels with its unit, or not at all (the form's rule for product 1).
  if (filled(line.application_rate) && filled(line.application_rate_unit)) {
    out.application_rate = String(line.application_rate).trim();
    out.application_rate_unit = String(line.application_rate_unit);
  }
  text('rei_hours');
  text('phi_days');
  text('target_pest_disease');
  text('application_purpose');
  // The purchase, field by field as product 1 sends it; the unit only beside a quantity.
  text('supplier_name');
  text('purchase_date');
  text('purchase_invoice');
  text('receipt_document');
  text('chemical_lot_number');
  if (filled(line.quantity_purchased)) {
    out.quantity_purchased = String(line.quantity_purchased).trim();
    if (filled(line.quantity_purchased_unit)) {
      out.quantity_purchased_unit = String(line.quantity_purchased_unit);
    }
  }
  // Restricted Use and the CA county permit are this product's own facts (each line its record).
  if (line.restricted_use_pesticide === 'true') out.restricted_use_pesticide = true;
  text('ca_dpr_permit_number');
  text('ca_dpr_permit_county');
  text('ca_dpr_permit_expires');
  if (typeof line.omri_product === 'number') out.omri_product = line.omri_product;
  if (typeof line.wsda_material === 'number') out.wsda_material = line.wsda_material;
  if (!severalParcels && filled(line.volume_numeric)) {
    out.volume_applied = String(line.volume_numeric).trim();
  }
  return out;
};

/** The card label of one product's amount: its name when it has one, its number otherwise. */
export const tankCardLabel = (
  name: unknown,
  lineNumber: number
): { labelId: string; labelValues: Record<string, string | number> } => {
  const product = String(name ?? '').trim();
  return product
    ? { labelId: 'events.multiParcel.field.tankLine', labelValues: { product } }
    : { labelId: 'events.multiParcel.field.tankLineUnnamed', labelValues: { n: lineNumber } };
};

/** A line's key: its minted id (a line without one, from an older draft, keys by position). */
const lineKey = (line: Partial<TankLineForm>, index: number) => line.uid || `n${index + 2}`;

/** The per-parcel card field of one product line, keyed by the line's id, never its position. */
export const tankCardFieldKey = (key: string) => `tank_line_${key}_volume`;
const rateKey = (key: string) => `tank_line_${key}_rate`;
const rateUnitKey = (key: string) => `tank_line_${key}_rate_unit`;
const unitKey = (key: string) => `tank_line_${key}_volume_unit`;
const TANK_CARD_KEY = /^tank_line_.+_volume$/;

/**
 * The parcel cards' values with every removed line's amount taken out. A removed product's typed
 * amount must not stay behind on the cards, where it could be read as another product's.
 * Returns the same array when nothing changed.
 */
export const pruneTankCardValues = <T extends { values: Record<string, string> }>(
  targets: T[],
  lines: Partial<TankLineForm>[]
): T[] => {
  const live = new Set(lines.map((line, index) => tankCardFieldKey(lineKey(line, index))));
  let changed = false;
  const next = targets.map((target) => {
    const stale = Object.keys(target.values).filter(
      (key) => TANK_CARD_KEY.test(key) && !live.has(key)
    );
    if (stale.length === 0) return target;
    changed = true;
    const values = { ...target.values };
    stale.forEach((key) => delete values[key]);
    return { ...target, values };
  });
  return changed ? next : targets;
};

/**
 * The card fields and the shared-form values that let the parcel cards ask, and derive, each
 * product's amount on each parcel: one field per line, unit and rate read from that line.
 */
export const tankCardFields = (lines: Partial<TankLineForm>[]) => ({
  fields: lines.map((line, index) => ({
    key: tankCardFieldKey(lineKey(line, index)),
    unit_key: unitKey(lineKey(line, index)),
    required: true,
    derive: {
      rate_key: rateKey(lineKey(line, index)),
      rate_unit_key: rateUnitKey(lineKey(line, index))
    },
    ...tankCardLabel(line.commercial_name, index + 2)
  })),
  form: Object.fromEntries(
    lines.flatMap((line, index) => [
      [rateKey(lineKey(line, index)), line.application_rate ?? ''],
      [rateUnitKey(lineKey(line, index)), line.application_rate_unit ?? ''],
      [unitKey(lineKey(line, index)), line.volume_unit ?? '']
    ])
  ) as Record<string, unknown>
});

/** Keys of a target that belong to the multi-parcel spec, minus the amount (which is per line). */
const AMOUNT_KEYS = ['volume_applied', 'volume', 'volume_numeric'];

/**
 * The tank request, from the body the wizard already built.
 *
 * `body` is either the single-parcel body (the form's values plus `parcels`) or the multi-parcel
 * body `buildMultiTargetBody` made (shared values plus `targets`, each carrying product 1's amount
 * as `volume_applied` and product N's as `tank_line_N_volume`). Product 1's own facts leave the
 * shared body for `products[0]`; every per-parcel fact goes to the target(s); the pass's facts
 * stay shared.
 */
export const buildTankMixBody = ({
  body,
  lines,
  tankId,
  perTargetKeys,
  singleTarget
}: {
  body: Record<string, unknown>;
  lines: Partial<TankLineForm>[];
  tankId: string;
  /** Every key the server takes per parcel for a spray (the spec's `per_target`). */
  perTargetKeys: Set<string>;
  /** One parcel: its id, and the season when the form names one. */
  singleTarget?: { parcel: number; history?: number | string | null };
}): Record<string, unknown> => {
  const shared: Record<string, unknown> = { ...body };
  const extra: Record<string, unknown> =
    shared.extra_data && typeof shared.extra_data === 'object'
      ? { ...(shared.extra_data as Record<string, unknown>) }
      : {};
  for (const key of [
    'tank_lines',
    'tank_mix_partners',
    'application_group',
    'parcels',
    'history',
    'plan_item_id',
    'field_note',
    'field_note_proposal'
  ]) {
    delete shared[key];
  }
  const severalParcels = !singleTarget;

  // Product 1: its own facts, from the top level first, then from extra_data (the form mirrors
  // the active ingredient and the unit there).
  const first: Record<string, unknown> = { tank_mix_role: 'product' };
  TANK_MIX.perLine.forEach((key) => {
    if (TANK_MIX.perLineDefaultFromShared.has(key)) return;
    const value = filled(shared[key]) ? shared[key] : extra[key];
    if (filled(value) || value === true || typeof value === 'number') first[key] = value;
    delete shared[key];
    delete extra[key];
  });
  if (first.concentration_not_recorded === false) delete first.concentration_not_recorded;

  const target: Record<string, unknown> = {};
  perTargetKeys.forEach((key) => {
    const value = shared[key];
    delete shared[key];
    delete extra[key];
    if (AMOUNT_KEYS.includes(key)) {
      if (!severalParcels && filled(value)) first[key] = value;
      return;
    }
    if (!severalParcels && filled(value)) target[key] = value;
  });
  shared.extra_data = extra;

  const others = lines.map((line) => tankLineRequest(line, { severalParcels }));
  const products = [first, ...others];

  let targets: Record<string, unknown>[];
  if (singleTarget) {
    targets = [
      {
        parcel: singleTarget.parcel,
        ...(singleTarget.history != null && singleTarget.history !== ''
          ? { history: singleTarget.history }
          : {}),
        ...target
      }
    ];
  } else {
    targets = ((body.targets as Record<string, unknown>[]) || []).map((raw) => {
      const t: Record<string, unknown> = { ...raw };
      const amounts: Record<string, unknown>[] = [{}];
      AMOUNT_KEYS.forEach((key) => {
        if (filled(t[key])) amounts[0].volume_applied = t[key];
        delete t[key];
      });
      lines.forEach((line, index) => {
        const key = tankCardFieldKey(lineKey(line, index));
        amounts.push(filled(t[key]) ? { volume_applied: t[key] } : {});
        delete t[key];
        delete t[unitKey(lineKey(line, index))];
      });
      t.products = amounts;
      return t;
    });
    delete shared.targets;
  }

  return { ...shared, tank_mix_group: tankId, products, targets };
};

/** A server refusal's detail as one sentence: lists and objects flattened in order. */
const flattenDetail = (detail: unknown): string =>
  Array.isArray(detail)
    ? detail.map(flattenDetail).join(', ')
    : detail && typeof detail === 'object'
    ? Object.values(detail as Record<string, unknown>)
        .map(flattenDetail)
        .join(', ')
    : String(detail);

/**
 * Everything a several-record refusal says, line by line and place by place, joined.
 *
 * A tank's server answer can carry both `products` (a line's fault, `{"2": ...}`) and `targets`
 * (a place's fault, keyed `<parcel>` or `<parcel>/<block>`); neither may hide the other. A target
 * is named by `nameOf` (a parcel name, with its block), and when no name is known the message
 * stands alone rather than showing a raw id.
 */
export const describeSeveralRecordErrors = (
  data: unknown,
  {
    includeTargets,
    lineText,
    nameOf,
    targetText = (name, message) => `${name}: ${message}`
  }: {
    includeTargets: boolean;
    lineText: (line: string, message: string) => string;
    nameOf: (key: string) => string | null;
    targetText?: (name: string, message: string) => string;
  }
): string => {
  const body = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const parts: string[] = [];
  const perLine = body.products;
  if (Array.isArray(perLine)) parts.push(flattenDetail(perLine));
  else if (perLine && typeof perLine === 'object') {
    Object.entries(perLine as Record<string, unknown>).forEach(([line, detail]) =>
      parts.push(lineText(line, flattenDetail(detail)))
    );
  }
  const perTarget = body.targets;
  if (includeTargets && perTarget && typeof perTarget === 'object' && !Array.isArray(perTarget)) {
    Object.entries(perTarget as Record<string, unknown>).forEach(([key, detail]) => {
      const name = nameOf(key);
      const message = flattenDetail(detail);
      parts.push(name ? targetText(name, message) : message);
    });
  }
  return parts.join('; ');
};
