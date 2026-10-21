/**
 * One activity on several parcels: which types and subtypes may, and what each parcel's card asks.
 *
 * The rules are the SERVER's. `multiParcelSpec.json` is a verbatim copy of
 * `trazo-back/history/services/multi_target_spec.json`, which `history/services/multi_target.py`
 * loads to refuse a per-parcel field sent in the shared body. `multiParcelSpecParity.test.ts` reads
 * the sibling file and fails when the copy differs, so the wizard can never offer a type the server
 * refuses, or send shared a field the server wants per parcel.
 *
 * The server knows a type only once its spec entry exists. The wizard additionally needs the type's
 * form to support multi mode (hiding the per-parcel inputs), listed in `FORM_SUPPORTS_MULTI`; a type
 * the server accepts but whose form is not ready yet stays single-parcel here.
 */
import spec from './multiParcelSpec.json';

export interface PerParcelField {
  key: string;
  /** The form field holding this value's unit (`volume_unit`, `fuel_unit`...). */
  unit_key?: string;
  required: boolean;
  /** Suggest rate × area: never a value written unseen. */
  derive?: { rate_key: string; rate_unit_key: string };
}

interface RawUi {
  area_key: string | null;
  scope_keys?: string[];
  scope_keys_by_subtype?: Record<string, string[]>;
  fields: PerParcelField[];
  fields_by_subtype: Record<string, PerParcelField[]>;
}

interface RawType {
  label: string;
  subtypes: string[] | null;
  per_target: string[];
  per_target_by_subtype: Record<string, string[]>;
  either: string[];
  refused: string[];
  refused_extra_data: string[];
  ui: RawUi;
}

export const MULTI_PARCEL_SPEC = spec as unknown as {
  version: number;
  types: Record<string, RawType>;
};

/** Event types whose form can run in multi mode today. Extended as each tab gains it. */
export const FORM_SUPPORTS_MULTI: readonly number[] = [2];

/** What the wizard needs for one event type + subtype in multi mode. */
export interface MultiParcelRules {
  eventType: number;
  subtype: string | null;
  /** The per-parcel area field, or null when the type has no area per parcel (weather). */
  areaKey: string | null;
  /** Whole / part on each card (`applied_scope` + `applied_scope_detail`). */
  scope: boolean;
  /** Section chips on each card (`block_id`). */
  sections: boolean;
  /** One input per field on each card. */
  fields: PerParcelField[];
  /** Every key the form must not offer as a single value (per parcel, or refused). */
  hiddenKeys: Set<string>;
  /** Keys sent per parcel. */
  perTargetKeys: Set<string>;
  /** Keys that may be sent once shared or once per parcel. */
  eitherKeys: Set<string>;
  /** Keys refused in a multi-parcel save (top level). */
  refusedKeys: Set<string>;
  /** Keys refused inside `extra_data`. */
  refusedExtraDataKeys: Set<string>;
}

/**
 * The server's rules for this type and subtype, whether or not the form is ready: null when the
 * server refuses the combination. `subtype` may be unknown yet (null); a type with a subtype list
 * then has no rules until the subtype is chosen.
 */
export const specRulesFor = (
  eventType: number | null | undefined,
  subtype?: string | null
): MultiParcelRules | null => {
  if (eventType == null) return null;
  const raw = MULTI_PARCEL_SPEC.types[String(eventType)];
  if (!raw) return null;
  const code = subtype ?? null;
  if (raw.subtypes !== null && (code === null || !raw.subtypes.includes(code))) return null;

  const bySubtype = (code && raw.per_target_by_subtype[code]) || [];
  const perTargetKeys = new Set([...raw.per_target, ...bySubtype]);
  const scopeKeys = raw.ui.scope_keys ?? (code && raw.ui.scope_keys_by_subtype?.[code]) ?? [];
  const fields = [...raw.ui.fields, ...((code && raw.ui.fields_by_subtype[code]) || [])];
  return {
    eventType,
    subtype: code,
    areaKey: raw.ui.area_key,
    scope: scopeKeys.length > 0,
    sections: perTargetKeys.has('block_id'),
    fields,
    perTargetKeys,
    eitherKeys: new Set(raw.either),
    refusedKeys: new Set(raw.refused),
    // Same as the server's loader: a top-level refusal holds inside extra_data too.
    refusedExtraDataKeys: new Set([...raw.refused_extra_data, ...raw.refused]),
    // Every key that is per parcel for ANY subtype stays out of the shared body (the server
    // refuses it there), plus the refused ones.
    hiddenKeys: new Set([
      ...raw.per_target,
      ...Object.values(raw.per_target_by_subtype).flat(),
      ...raw.refused
    ])
  };
};

/** The rules the WIZARD uses: the server's, and only for a type whose form supports multi mode. */
export const multiParcelRulesFor = (
  eventType: number | null | undefined,
  subtype?: string | null
): MultiParcelRules | null =>
  eventType != null && FORM_SUPPORTS_MULTI.includes(eventType)
    ? specRulesFor(eventType, subtype)
    : null;

/** May this event type go multi-parcel for at least one subtype? (For the parcel picker on step 0.) */
export const eventTypeMayGoMulti = (eventType: number | null | undefined): boolean =>
  eventType != null &&
  FORM_SUPPORTS_MULTI.includes(eventType) &&
  !!MULTI_PARCEL_SPEC.types[String(eventType)];
