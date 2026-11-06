/**
 * Activity verbs — the ONE farmer-language entry vocabulary (WS-4b).
 *
 * Every "log something" entry point (Activities page, parcel Add Event menu,
 * NewEvent's own chooser) renders THIS list, so the farmer sees the same verbs
 * everywhere. Verbs are a presentation layer over the unchanged backend event
 * models: eventType routes to the model, subtype answers the model's own `type`.
 *
 * ⛔ ONE ask per fact. A tile that pins a subtype means the wizard NEVER shows a subtype
 * control again — the page title carries the answer. A family tile (`subtypeChoices`) asks
 * once more, in step 0, in this vocabulary. Re-adding a raw code select to the create path
 * re-creates the double-ask this replaced: until 2026-08-22 a farmer who tapped "Harvest"
 * was then shown "Production Type: Harvesting - Crop collection & transport" and could set
 * it to Seed Search while the page header still said "Log activity — Harvest".
 *
 * i18n: label = `activities.verb.${key}` in both catalogs. Subtype labels are NOT duplicated
 * here — they come from the display registry (config/events/productionEvent.ts `subtypes`),
 * so the grid, the chooser and the timeline all read one list.
 *
 * ⚠️ Number of tiles is a design constraint, not just a list length. VerbPickerGrid renders
 * every verb with no scroll-hidden subset; past ~18 the mobile modal stops being scannable
 * and the next subtype belongs under an existing family, not on a new tile.
 */

import { TYPE_ICON } from 'config/events/eventTypeAppearance';
import {
  FaBorderAll,
  FaBoxOpen,
  FaBroom,
  FaBug,
  FaClipboardList,
  FaCloudRain,
  FaCut,
  FaFileInvoiceDollar,
  FaFlask,
  FaLayerGroup,
  FaSearch,
  FaSeedling,
  FaSnowflake,
  FaSpa,
  FaTint,
  FaTractor,
  FaTruck
} from 'react-icons/fa';
import type { IconType } from 'react-icons';

/*
 * No `color` field, deliberately.
 *
 * Each verb used to carry one, and VerbPickerGrid rendered the tile glyph at
 * `${verb.color}.500` — seven hues across one 14-tile modal. MEASURED on white: green.500
 * 2.78, Chakra yellow.500 2.39, plus Chakra orange/blue/teal, which are not Trazo tokens at
 * all (the theme defines amber, not orange). Five of the fourteen failed the 3.0 floor, and
 * the SELECTED state put white on those same fills, so picking a verb made it the least
 * legible tile on screen.
 *
 * The hue encoded nothing: the label names the activity and the glyph distinguishes it.
 * Re-adding a per-verb colour re-creates the sticker sheet — style the tile in the component.
 */
export interface ActivityVerb {
  key: string;
  /** Backend event_type the verb routes to (0..7). */
  eventType: number;
  /**
   * Production subtype the verb answers with.
   *
   * For a 1:1 verb this IS the answer and nothing asks again. For a family verb (one that
   * covers several subtypes) it is the default the second-level chooser opens on.
   */
  subtype?: string;
  /**
   * The subtypes a FAMILY verb covers, `subtype` first when the tile carries one.
   *
   * ⚠️ `subtype` is OPTIONAL alongside this. A family whose codes only change which fields are
   * asked may pre-select one (production's do); a family whose codes change what the record
   * CLAIMS must not (chemical's do not — see `input_application`), because the pre-selection is
   * an answer the farmer never gave.
   *
   * Present only when one tile honestly stands for more than one record shape: "Field work"
   * is cultivation, thinning or mowing, and which one it was decides half the fields the next
   * step asks for. The farmer answers that in step 0 of the wizard (ActivitySubtypeChooser),
   * in this same vocabulary — NOT in ProductionTab's raw code select, which is the developer
   * vocabulary and used to ask the question a second time after a tile had already answered
   * it. That select is now gone from the wizard on BOTH paths: edit corrects the activity
   * through the same step-0 chooser, opt-in behind a "Not X?" link.
   *
   * Codes are validated against history/models.py PRODUCTION_EVENTS by
   * config/events/__tests__/productionSubtypeCoverage.test.ts, which also asserts every
   * production subtype is reachable from EXACTLY ONE tile. A subtype with no tile is
   * invisible: pruning — a WA apple grower's main winter activity — was reachable only by
   * opening a "Field work" record and re-answering a select.
   */
  subtypeChoices?: readonly string[];
  /**
   * Field values the tile's NAME already answers, seeded into the form the moment it is tapped.
   *
   * Not a prefill: a preset here must be part of the activity's identity, never a fact about
   * the operation (that is the template→record red line). "Cleanout" is the one case so far —
   * the tile routes to Equipment Maintenance (EM), whose form then asked "what kind of
   * equipment operation was this?" with Fuel Consumption listed first, and a farmer who tapped
   * Cleanout could file a fuel record. The cleaning fields (§ 205.272 log) render only under
   * `equipment_operation_type === 'CL'`, so the wrong answer also hid the whole point of the tile.
   */
  presetFields?: Readonly<Record<string, string>>;
  icon: IconType;
}

export const ACTIVITY_VERBS: ActivityVerb[] = [
  { key: 'planting', eventType: 1, subtype: 'PL', subtypeChoices: ['PL', 'TR'], icon: FaSeedling },
  /*
   * Chemical is the SECOND family verb (2026-09-01). "Input application" names no practice on
   * its own — a fertigation pass and a restricted-use spray are the same tile — and the four
   * codes decide which half of ChemicalTab's 45 fields the next step renders
   * (`visibleForSubtypes` in config/events/chemicalEvent.ts): FE brings NPK and fertigation,
   * PE/FU/HE bring target pest, REI/PHI, RUP and applicator certification. That is the same
   * criterion the production family verbs are hoisted on.
   *
   * ⛔ NO default `subtype`. `handleVerbSelect` seeds `verb.subtype` the instant the tile is
   * tapped, so a default here is an ANSWER the farmer never gave — and the wrong one is a
   * pesticide filed as a fertilizer, which changes what the certifier packet and the CA PUR
   * export assert. The production families can carry a default because their codes differ in
   * which fields are asked, not in what the record claims about a restricted substance.
   */
  {
    key: 'input_application',
    eventType: 2,
    subtypeChoices: ['FE', 'PE', 'FU', 'HE'],
    icon: FaFlask
  },
  { key: 'irrigation', eventType: 1, subtype: 'IR', icon: FaTint },
  {
    key: 'field_work',
    eventType: 1,
    subtype: 'CU',
    subtypeChoices: ['CU', 'TH', 'MO'],
    icon: FaTractor
  },
  // 2026-08-22: EIGHT of the sixteen production subtypes existed in the backend, in the
  // form's select and in the carbon pipeline, and in NO entry point — PR, TR, TH, PO, PH,
  // CM, FP, MO. The only way to reach a pruning record was to start a "Field work" one and
  // change a dropdown labelled "Pruning/Trimming - Plant maintenance", i.e. the tile grid
  // lied about what the farmer could log.
  //
  // Five joined an existing tile as a family choice (TR→planting, TH/MO→field_work,
  // PH→harvest, CM→pruning). Three earned their own, because no tile honestly covers them:
  // pruning (the main winter activity of the WA orchards this is sold to), pollination and
  // frost protection. Pruning and canopy management share one tile — the same crew, the same
  // pass, and NOP asks nothing that separates them.
  { key: 'pruning', eventType: 1, subtype: 'PR', subtypeChoices: ['PR', 'CM'], icon: FaCut },
  { key: 'harvest', eventType: 1, subtype: 'HA', subtypeChoices: ['HA', 'PH'], icon: FaBoxOpen },
  { key: 'pollination', eventType: 1, subtype: 'PO', icon: FaSpa },
  { key: 'frost_protection', eventType: 1, subtype: 'FP', icon: FaSnowflake },
  {
    key: 'cleanout',
    eventType: 1,
    subtype: 'EM',
    presetFields: { equipment_operation_type: 'CL' },
    icon: FaBroom
  },
  // Parity with the activities Quick Organics offers a crop operation. Each of these was
  // recordable only as a field on some other event, so a farmer told to "log a buffer use"
  // had nowhere to go — and the underlying record is not owned by the event it was buried in:
  // a load ships days after its harvest, buffer crop is disposed on its own schedule, and a
  // seed search precedes planting.
  { key: 'transport', eventType: 1, subtype: 'TP', icon: FaTruck },
  { key: 'buffer_use', eventType: 1, subtype: 'BU', icon: FaBorderAll },
  { key: 'seed_search', eventType: 1, subtype: 'SS', icon: FaSearch },
  { key: 'soil', eventType: 5, icon: FaLayerGroup },
  { key: 'pest', eventType: 6, icon: FaBug },
  { key: 'weather', eventType: 0, icon: FaCloudRain },
  // Labelled "Certification & compliance", NOT "Sales & compliance".
  //
  // 🔴 2026-08-19: the tile said "Sales & compliance" and a grower who clicked it looking for
  // a sale found only BusinessEvent's certification / compliance / inspection types — there is
  // no sales field on this form at all. Sales are not a field activity: a sale is a
  // transaction against a LOT, not a dated practice on a parcel, and it carries a buyer name
  // that has no business on the consumer timeline. They already have an owner —
  // `SalesRecord` + SalesRecordsSection on the production page, which is what the packet's
  // mass-balance section reads. One editor per fact; do not add a second one here.
  { key: 'business', eventType: 7, icon: FaFileInvoiceDollar },
  // Escape hatch — GeneralEvent (type 3) has no natural verb; without this tile
  // the verb grid would strand every "other" activity the old category grid allowed.
  { key: 'other', eventType: 3, icon: FaClipboardList }
];

export const verbForKey = (key: string | null | undefined): ActivityVerb | undefined =>
  ACTIVITY_VERBS.find((v) => v.key === key);

/**
 * The verb a season-plan item should open the wizard on.
 *
 * A plan item carries the catalogue's `event_type` and (usually) a production subtype, so
 * "Log this" can land the farmer on the right form with the chooser already answered — the
 * same preset path a verb tile uses. Exact subtype match first, so "Winter Pruning" opens
 * on pruning rather than on the first production verb in the list.
 *
 * Returns undefined when nothing matches; the caller then falls back to the verb grid
 * rather than guessing, because guessing the wrong subtype puts the farmer in a form whose
 * fields do not describe what they did.
 */
export const verbForEvent = (
  eventType: number | null | undefined,
  subtype?: string | null
): ActivityVerb | undefined => {
  if (eventType == null) return undefined;
  if (subtype) {
    const exact = ACTIVITY_VERBS.find((v) => v.eventType === eventType && v.subtype === subtype);
    if (exact) return exact;
    // A family verb owns its non-default subtypes too. Without this, "Log this" on a planned
    // Transplanting or Canopy Management found no verb and dropped the farmer back on the
    // grid — the exact behaviour the plan-item preset exists to avoid.
    const family = ACTIVITY_VERBS.find(
      (v) => v.eventType === eventType && v.subtypeChoices?.includes(subtype)
    );
    if (family) return family;
  }
  return ACTIVITY_VERBS.find((v) => v.eventType === eventType && !v.subtype);
};

/**
 * Subtypes a verb can still resolve to once picked — `[]` when the tile already answered.
 *
 * The wizard asks the second-level question only when this is non-empty, which is the whole
 * anti-double-ask rule in one place: a tile that pins its subtype is never asked again, and
 * the page title (`activities.logTitle`) is the only place that name appears.
 */
export const subtypeChoicesFor = (verb: ActivityVerb | undefined): readonly string[] =>
  verb?.subtypeChoices && verb.subtypeChoices.length > 1 ? verb.subtypeChoices : [];

/**
 * Event types whose subtype is asked in STEP 0 rather than inside their own tab.
 *
 * A type earns a place here on two conditions, both of them:
 *   1. Its verb tile cannot name the practice — "Field work" is three record shapes,
 *      "Input application" is four.
 *   2. The subtype gates which fields the next step renders, so answering it late means the
 *      farmer meets a form that changes shape under them.
 *
 * Production (1) and Chemical (2) qualify. Soil, pest, weather, business and general do NOT:
 * their tiles name the practice and their tabs are small, so their single in-tab select is
 * already one ask in the right place. ⛔ Adding a type here is only half the change — its tab
 * must also stop rendering its own `type` control, or the result is the double-ask this whole
 * mechanism was built to remove (see config/events/__tests__/subtypeAskedOnce.test.tsx).
 */
export const HOISTED_SUBTYPE_EVENT_TYPES: readonly number[] = [1, 2];

export interface SubtypeQuestionInput {
  /** Editing a saved record rather than creating one. */
  isEdit: boolean;
  /**
   * Edit only: the farmer explicitly asked to correct the activity.
   *
   * Edit IS a correction surface — a mis-tapped tile has to be fixable — but the correction is
   * OPT-IN. Opening every edit on a sixteen-tile grid taxes the farmer who came to fix a date,
   * and it is also the wrong default to show beside a header that already names the record.
   */
  isCorrecting?: boolean;
  /** Backend event_type currently in force, or null before anything is chosen. */
  eventType: number | null | undefined;
  /** The verb the farmer picked, if any. `undefined` means the grid is still asking. */
  verb: ActivityVerb | undefined;
  /** True when the wizard was opened from a season-plan item (`?plan_item=`). */
  fromPlanItem: boolean;
  /** The fetched plan item — `undefined`/`null` while the request is still in flight. */
  planItem: { event_subtype?: string | null } | null | undefined;
  /** True when the wizard was opened from "Log this again" (`?repeat=`). */
  fromRepeat?: boolean;
  /**
   * The subtype already on the source record — repeat only, `undefined` until it loads.
   *
   * Repeat's answer comes from the farmer's OWN previous row, which is at least as precise as
   * any tile, so nothing is asked once it is known.
   */
  knownSubtype?: string | null;
  /**
   * Every subtype the display registry knows FOR `eventType`, for the fallback branches.
   *
   * Per-type, not production's list: the fallback is what gets asked when nothing upstream
   * answered, and offering sixteen production codes on a chemical record would be worse than
   * asking nothing.
   */
  allSubtypesForType: readonly string[];
}

/**
 * What the wizard must still ask about the subtype — `[]` when the answer is already in.
 *
 * Pure, and exported, because this is the part that got it wrong twice while it lived inline
 * in NewEvent: once showing a sixteen-button chooser UNDERNEATH the verb grid (a `?event_type=1`
 * link with no `verb=` — an old bookmark), and once letting a plan item with no subtype fall
 * through to ProductionTab's silent `'PL'` default. Both are branch bugs in five lines of
 * conditionals, invisible on the happy path. See __tests__/subtypeQuestion.test.ts.
 */
export const subtypeQuestionFor = ({
  isEdit,
  isCorrecting = false,
  eventType,
  verb,
  fromPlanItem,
  planItem,
  fromRepeat = false,
  knownSubtype,
  allSubtypesForType
}: SubtypeQuestionInput): readonly string[] => {
  // Only a HOISTED type has a step-0 subtype question; every other tab asks its own subtype
  // exactly once, inside itself, so there is nothing to hoist. True on the edit path too.
  if (!HOISTED_SUBTYPE_EVENT_TYPES.includes(eventType as number)) return [];

  /*
   * EDIT asks the same question, in the same place, in the same words.
   *
   * It used to be asked somewhere else entirely: ProductionTab kept its raw `type` select on
   * the edit path (`hideSubtypeSelect={!isEdit}`), so one record had TWO activity surfaces —
   * step 0 stating "Seed search" beside a notice that the record type was fixed, and step 2
   * offering a sixteen-option select labelled "Production type" that changed it. The notice
   * and the select contradicted each other, and "Production type" is the developer's word for
   * a fact the farmer answered by tapping a tile.
   *
   * All sixteen, not the family: on the create path the tile constrains the question, but a
   * farmer correcting a saved record may have tapped the wrong tile outright — Seed search
   * when they meant Harvest — and both live under the same event_type.
   */
  if (isEdit) return isCorrecting ? allSubtypesForType : [];

  if (fromRepeat) {
    // 🔴 2026-08-27: "Log this again" carries `?repeat=` and `event_type=` but no `verb=`, so
    // this fell through to the no-verb branch and the farmer was asked to re-pick the activity
    // they had just pressed the button on. The record names it; asking again is the wizard
    // doubting a fact it read.
    //
    // The fallback is the same silent-'PL' guard the plan branch carries: a source row with no
    // subtype must produce a QUESTION, never ProductionTab's default. It should be unreachable
    // (`type` is required on the model) and it is also what renders if the loading gate above
    // this ever regresses, which is the safer of the two failures.
    return knownSubtype ? [] : allSubtypesForType;
  }

  if (fromPlanItem) {
    // Still in flight, or one that already names the practice — nothing to ask.
    if (!planItem || planItem.event_subtype) return [];
    // A plan item with no subtype would otherwise be saved as the tab's 'PL' default.
    return allSubtypesForType;
  }

  // No verb means the GRID is on screen asking "What did you do?". Asking "which one exactly"
  // underneath it is two questions about one fact, and the second would be answered against a
  // verb the farmer has not chosen yet.
  if (!verb) return [];

  const fromVerb = subtypeChoicesFor(verb);
  if (fromVerb.length) return fromVerb;
  // The tile pinned it. The page title is the only place that answer is shown.
  if (verb.subtype) return [];
  // A hoisted verb that pins nothing and offers no family — same silent-'PL' hazard as the
  // plan branch. (Chemical's tile pins nothing DELIBERATELY, but it does offer a family, so it
  // returns above; this stays the fallback for a verb added with neither.)
  return allSubtypesForType;
};

/**
 * The icon an activity shows everywhere it is listed: its "Log activity" tile's icon (a drop for
 * Irrigation, a box for Harvest), falling back to the category's glyph for a record no tile
 * covers. Rows, calendar chips and the Activities filter use it, so the farmer sees the same
 * icon for the same activity on every screen (2026-11-06).
 */
export const iconForActivity = (eventType: number, subtype?: string | null): IconType =>
  verbForEvent(eventType, subtype)?.icon ?? TYPE_ICON[eventType] ?? TYPE_ICON[3];

/** Does a feed row belong to this verb? Event type, and the verb's subtype(s) when it has them. */
export const activityMatchesVerb = (
  verb: ActivityVerb,
  eventType: number,
  subtype?: string | null
): boolean => {
  if (verb.eventType !== eventType) return false;
  const codes = [verb.subtype, ...(verb.subtypeChoices ?? [])].filter(Boolean);
  return codes.length === 0 || codes.includes(subtype ?? '');
};
