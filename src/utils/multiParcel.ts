/**
 * One activity on several parcels (trazo-back `history/services/multi_target.py`): the per-parcel
 * card math and the request body.
 *
 * The server writes ONE RECORD PER PARCEL, linked by `application_group`, all or none. Which keys
 * are shared, which differ per parcel and which are refused comes from the spec
 * (`config/events/multiParcel.ts`, a checked copy of the server's file); this module only does the
 * arithmetic and builds the body from those rules.
 *
 * NEVER: invent a per-parcel number. A value is either typed by the grower or shown as a derivation
 * from facts they confirmed ("2 gal/ac × 12.4 ac = 24.8 gal"), and the grower can overwrite it.
 * Where the rate's unit does not match the field's unit, nothing is derived and the grower types it:
 * a conversion the grower never saw would be a number on a certifier record that nobody stated.
 */

import type { MultiParcelRules, PerParcelField } from '../config/events/multiParcel';
import { AREA_CONVERSION_FACTORS } from './areaUnits';

export const MAX_MULTI_PARCELS = 50;

/** A plan item, a crew note and a named season belong to ONE record. */
export const SINGLE_RECORD_KEYS = [
  'parcels',
  'history',
  'plan_item_id',
  'field_note',
  'field_note_proposal'
] as const;

export type BlockScope = 'all' | 'part';

export interface ParcelTarget {
  parcelId: number;
  name: string;
  /** `Parcel.area`, stored in hectares. */
  areaHa: number;
  /** Unset until the grower answers: a default of "whole block" would be a claim nobody made. */
  scope: BlockScope | null;
  /**
   * Area typed by the grower, in the form's area unit: the part treated when `scope === 'part'`,
   * or the block's size when `scope === 'all'` and the parcel has no size on record.
   */
  partArea: string;
  partDetail: string;
  /** The section / rows inside the parcel (`block_id`), when the type has sections. */
  section: string;
  /** What the grower typed per field key. Missing or empty means "use the derived value". */
  values: Record<string, string>;
}

export const newTarget = (parcel: {
  id: number;
  name: string;
  area?: number | string | null;
}): ParcelTarget => ({
  parcelId: parcel.id,
  name: parcel.name,
  areaHa: Number(parcel.area) || 0,
  scope: null,
  partArea: '',
  partDetail: '',
  section: '',
  values: {}
});

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
};

/** Hectares expressed in the form's area unit (`ha`, `acres`, `m2`). */
export const hectaresIn = (hectares: number, unit: string): number | null => {
  if (unit === 'ha') return hectares;
  if (unit === 'acres') return hectares * AREA_CONVERSION_FACTORS.HECTARES_TO_ACRES;
  if (unit === 'm2') return hectares * AREA_CONVERSION_FACTORS.HECTARES_TO_SQ_METERS;
  return null;
};

/** True when the parcel's size is on record, so "whole block" needs no number from the grower. */
export const hasRecordedSize = (target: ParcelTarget): boolean => target.areaHa > 0;

/** The area this target treated, in the form's area unit, or null when not yet answered. */
export const targetArea = (target: ParcelTarget, areaUnit: string): number | null => {
  if (target.scope === 'all') {
    if (!hasRecordedSize(target)) {
      // No size on record: the grower states the block's size, never a guess.
      const typed = toNumber(target.partArea);
      return typed !== null && typed > 0 ? typed : null;
    }
    const area = hectaresIn(target.areaHa, areaUnit);
    return area && area > 0 ? round(area, 2) : null;
  }
  if (target.scope === 'part') {
    const area = toNumber(target.partArea);
    return area !== null && area > 0 ? area : null;
  }
  return null;
};

/**
 * Rate unit → the product unit and area unit it is "per". Only the units the chemical form's
 * product-amount select offers are listed: quarts and pints per acre have no matching product
 * unit there, and plain "oz/ac" does not say fluid or weight, so none of them derives a total.
 */
const RATE_BASIS: Record<string, { product: string; area: 'acres' | 'ha' }> = {
  fl_oz_ac: { product: 'fl_oz', area: 'acres' },
  gal_ac: { product: 'gal', area: 'acres' },
  lb_ac: { product: 'lbs', area: 'acres' },
  mL_ha: { product: 'mL', area: 'ha' },
  L_ha: { product: 'L', area: 'ha' },
  kg_ha: { product: 'kg', area: 'ha' }
};

/** `area` (in `areaUnit`) converted to the rate's area basis. */
const areaInBasis = (area: number, areaUnit: string, basis: 'acres' | 'ha'): number | null => {
  if (areaUnit === basis) return area;
  const hectares =
    areaUnit === 'ha'
      ? area
      : areaUnit === 'acres'
      ? area * AREA_CONVERSION_FACTORS.ACRES_TO_HECTARES
      : areaUnit === 'm2'
      ? area * AREA_CONVERSION_FACTORS.SQ_METERS_TO_HECTARES
      : null;
  if (hectares === null) return null;
  return basis === 'ha' ? hectares : hectares * AREA_CONVERSION_FACTORS.HECTARES_TO_ACRES;
};

/** The form's values the cards read (units, the label rate): the shared half of the activity. */
export type SharedForm = Record<string, unknown>;

const AREA_UNIT_DEFAULT = 'acres';
export const areaUnitOf = (form: SharedForm): string =>
  (typeof form.area_unit === 'string' && form.area_unit) || AREA_UNIT_DEFAULT;

/** The unit a field's value is in, read from the shared form (`volume_unit`, `fuel_unit`...). */
export const unitOf = (field: PerParcelField, form: SharedForm): string =>
  (field.unit_key &&
    typeof form[field.unit_key] === 'string' &&
    (form[field.unit_key] as string)) ||
  '';

/** Rate × area, when the field derives from a rate whose units line up. Null otherwise. */
export const derivedValue = (
  target: ParcelTarget,
  field: PerParcelField,
  form: SharedForm
): number | null => {
  if (!field.derive) return null;
  const rate = toNumber(form[field.derive.rate_key]);
  const basis = RATE_BASIS[String(form[field.derive.rate_unit_key] ?? '')];
  const areaUnit = areaUnitOf(form);
  const area = targetArea(target, areaUnit);
  if (
    rate === null ||
    rate <= 0 ||
    !basis ||
    basis.product !== unitOf(field, form) ||
    area === null
  )
    return null;
  const inBasis = areaInBasis(area, areaUnit, basis.area);
  return inBasis === null ? null : round(rate * inBasis, 3);
};

/** The value that will be saved for a field: what the grower typed, else the derived value. */
export const fieldValue = (
  target: ParcelTarget,
  field: PerParcelField,
  form: SharedForm
): number | null => {
  const typed = (target.values[field.key] ?? '').trim();
  if (typed !== '') {
    const n = toNumber(typed);
    return n !== null && n >= 0 ? n : null;
  }
  return derivedValue(target, field, form);
};

export type TargetIssue = 'scope' | 'area' | `field:${string}`;

/** What is still missing before this target can be saved, in the order the card asks. */
export const targetIssues = (
  target: ParcelTarget,
  rules: MultiParcelRules,
  form: SharedForm
): TargetIssue[] => {
  const issues: TargetIssue[] = [];
  if (rules.areaKey) {
    if (target.scope === null) return ['scope'];
    if (targetArea(target, areaUnitOf(form)) === null) issues.push('area');
  }
  for (const field of rules.fields) {
    if (!field.required) continue;
    const value = fieldValue(target, field, form);
    if (value === null || value <= 0) issues.push(`field:${field.key}`);
  }
  return issues;
};

/**
 * The request body for a multi-parcel save, from the single-parcel body the wizard already builds.
 *
 * Every per-parcel, refused and single-record key is removed from the shared body, at the top level
 * and inside `extra_data` (several tabs mirror fields there), and each target carries its own area,
 * scope, section and field values.
 */
export const buildMultiTargetBody = (
  singleBody: Record<string, unknown>,
  targets: ParcelTarget[],
  rules: MultiParcelRules,
  form: SharedForm,
  applicationGroup: string
): Record<string, unknown> => {
  const shared: Record<string, unknown> = { ...singleBody };
  const stripFromShared = new Set([...rules.hiddenKeys, ...SINGLE_RECORD_KEYS]);
  stripFromShared.forEach((key) => {
    delete shared[key];
  });
  if (shared.extra_data && typeof shared.extra_data === 'object') {
    const extra = { ...(shared.extra_data as Record<string, unknown>) };
    new Set([...rules.hiddenKeys, ...rules.refusedExtraDataKeys]).forEach((key) => {
      delete extra[key];
    });
    shared.extra_data = extra;
  }

  const areaUnit = areaUnitOf(form);
  return {
    ...shared,
    application_group: applicationGroup,
    targets: targets.map((target) => {
      const body: Record<string, unknown> = { parcel: target.parcelId };
      if (rules.areaKey) {
        const area = targetArea(target, areaUnit);
        if (area !== null) body[rules.areaKey] = String(area);
      }
      if (rules.scope && target.scope) {
        body.applied_scope = target.scope;
        if (target.scope === 'part' && target.partDetail.trim()) {
          body.applied_scope_detail = target.partDetail.trim();
        }
      }
      if (rules.sections && target.section.trim()) body.block_id = target.section.trim();
      for (const field of rules.fields) {
        const value = fieldValue(target, field, form);
        if (value !== null) body[field.key] = String(value);
      }
      return body;
    })
  };
};

/** A UUID for `application_group`, minted once per wizard session. */
export const newApplicationGroup = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    return crypto.randomUUID();
  // RFC 4122 v4 from Math.random: only reached where crypto.randomUUID is missing (old browsers).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

function round(value: number, places: number): number {
  const f = 10 ** places;
  return Math.round(value * f) / f;
}

/** A parcel as the farm payload serves it, enough to say whether it may join a group. */
export interface JoinableParcel {
  id: number | string;
  name: string;
  open_season_count?: number | null;
}

/**
 * May this parcel join a multi-parcel record? Exactly one open production, the rule the server
 * holds a group to. `open_season_count` null means "not counted": it joins and the server decides.
 * The same rule `disabledReasonFor` (ParcelPicker) shows as a reason.
 */
export const parcelMayJoin = (parcel: JoinableParcel): boolean =>
  parcel.open_season_count == null || parcel.open_season_count === 1;

/**
 * The parcels a restored draft may put back: still on this farm and still able to join. A draft
 * can be days old, and a parcel whose season closed since would come back ticked AND locked (the
 * picker greys it from live data), with no way to untick it. Those come back as `droppedNames`.
 */
export const restorableDraftParcels = (
  draftIds: Array<number | string>,
  parcels: JoinableParcel[]
): { ids: number[]; droppedNames: string[] } => {
  const byId = new Map(parcels.map((p) => [Number(p.id), p]));
  const onFarm = draftIds.map(Number).filter((id) => byId.has(id));
  return {
    ids: onFarm.filter((id) => parcelMayJoin(byId.get(id)!)),
    droppedNames: onFarm
      .filter((id) => !parcelMayJoin(byId.get(id)!))
      .map((id) => byId.get(id)!.name)
  };
};

/** What to do with `&also=` once the form knows enough: wait, or seed these ids with a notice. */
export type AlsoSeed =
  | { kind: 'wait' }
  | { kind: 'done'; ids: number[]; notice?: { id: string; values: Record<string, string> } };

/**
 * The parcels the Activities page passed in `&also=`, checked against what the form now knows.
 * Ids that are not on this farm, or are the form's own parcel, are ignored (a hand-edited link).
 * A parcel joins only when `parcelMayJoin` says so. Everything left out is NAMED in the notice,
 * never dropped silently.
 */
export const planAlsoSeed = ({
  also,
  routeId,
  parcels,
  eligible,
  singleActivity,
  routeCannotShare
}: {
  also: string | null;
  routeId: number;
  parcels: JoinableParcel[];
  /** The form can take several parcels for this activity right now. */
  eligible: boolean;
  /** Settled: this activity is logged one parcel at a time. */
  singleActivity: boolean;
  /** Settled: the form's own parcel has no open production, so it cannot share a record. */
  routeCannotShare: boolean;
}): AlsoSeed => {
  const byId = new Map(parcels.map((p) => [Number(p.id), p]));
  const wanted = [...new Set((also ?? '').split(',').map(Number))].filter(
    (id) => Number.isInteger(id) && id !== routeId && byId.has(id)
  );
  if (wanted.length === 0) return { kind: 'done', ids: [] };
  const names = (ids: number[]) => ids.map((id) => byId.get(id)!.name).join(', ');

  if (eligible) {
    const joins = (id: number) => parcelMayJoin(byId.get(id)!);
    const ids = wanted.filter(joins);
    const dropped = wanted.filter((id) => !joins(id));
    return dropped.length > 0
      ? {
          kind: 'done',
          ids,
          notice: { id: 'events.multiParcel.alsoDropped', values: { names: names(dropped) } }
        }
      : { kind: 'done', ids };
  }
  if (singleActivity) {
    return {
      kind: 'done',
      ids: [],
      notice: {
        id: 'events.multiParcel.alsoSingleOnly',
        values: { name: byId.get(routeId)?.name ?? '' }
      }
    };
  }
  if (routeCannotShare) {
    // The blocker is the form's OWN parcel, so the notice names it; the others are fine.
    return {
      kind: 'done',
      ids: [],
      notice: {
        id: 'events.multiParcel.alsoRouteNoSeason',
        values: { name: byId.get(routeId)?.name ?? '', names: names(wanted) }
      }
    };
  }
  return { kind: 'wait' };
};
