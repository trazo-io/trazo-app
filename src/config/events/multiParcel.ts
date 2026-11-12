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
  /** Subtypes whose form asks no area (pollination, nesting structures): no area per parcel. */
  no_area_subtypes?: string[];
}

interface RawType {
  label: string;
  subtypes: string[] | null;
  per_target: string[];
  per_target_by_subtype: Record<string, string[]>;
  either: string[];
  refused: string[];
  refused_extra_data: string[];
  /** A shared key refused only when it holds one of these values (a tank-total carrier volume). */
  refused_values?: Record<string, string[]>;
  ui: RawUi;
}

export const MULTI_PARCEL_SPEC = spec as unknown as {
  version: number;
  types: Record<string, RawType>;
};

/** Event types whose form can run in multi mode today. Extended as each tab gains it. */
export const FORM_SUPPORTS_MULTI: readonly number[] = [2, 1, 5, 6, 3, 0];

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
  /**
   * Values a shared key may not take in a multi-parcel save (`carrier_volume_unit: gal_total`):
   * the form does not offer them, because the server would refuse a value copied onto every parcel.
   */
  refusedValues: Record<string, Set<string>>;
  /**
   * Units of this activity's per-parcel amounts that the server takes per parcel (`either`):
   * they leave the shared body and travel beside each amount. Listed from the spec, not from
   * `fields`, so a field the form drops (no fuel on an electric pump) still takes its unit out
   * of the shared body rather than leaving a unit with no amount.
   */
  perParcelUnitKeys: Set<string>;
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
    areaKey: code && raw.ui.no_area_subtypes?.includes(code) ? null : raw.ui.area_key,
    scope: scopeKeys.length > 0,
    sections: perTargetKeys.has('block_id'),
    fields,
    perTargetKeys,
    eitherKeys: new Set(raw.either),
    perParcelUnitKeys: new Set(
      fields
        .map((field) => field.unit_key)
        .filter((key): key is string => !!key && raw.either.includes(key))
    ),
    refusedKeys: new Set(raw.refused),
    // Same as the server's loader: a top-level refusal holds inside extra_data too.
    refusedExtraDataKeys: new Set([...raw.refused_extra_data, ...raw.refused]),
    refusedValues: Object.fromEntries(
      Object.entries(raw.refused_values ?? {}).map(([key, values]) => [key, new Set(values)])
    ),
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

/**
 * May an activity tile be logged on several parcels at once? Read before the form opens (the
 * Activities page asks for parcels first, then the activity), so it answers per TILE:
 * - its type must be one the form supports in multi mode;
 * - a tile that pins its subtypes (harvest = HA/PH) needs at least one of them in the spec;
 * - a tile whose subtype is asked later in the form (soil, pest) stays offered, and the form
 *   pauses the extra parcels if a single-parcel subtype is then chosen.
 */
export const verbMayGoMulti = (verb: {
  eventType: number;
  subtype?: string;
  subtypeChoices?: readonly string[];
}): boolean => {
  if (!eventTypeMayGoMulti(verb.eventType)) return false;
  const allowed = MULTI_PARCEL_SPEC.types[String(verb.eventType)].subtypes;
  if (allowed === null) return true;
  const codes = verb.subtypeChoices ?? (verb.subtype ? [verb.subtype] : null);
  return codes === null || codes.some((code) => allowed.includes(code));
};
