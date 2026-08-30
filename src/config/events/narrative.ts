/**
 * Activity narrative composer (WS-4 auto-narrative).
 *
 * Turns a lightweight activity-feed row into a localized title + summary line:
 *
 *   title:   the farmer-language verb ("Harvest", "Input application")
 *   summary: structured values joined with " — "
 *            ("4200 lbs — Scale-verified (weigh ticket) — Stored on farm")
 *
 * The backend ships VALUES only (history/services/activity_detail.py); wording
 * and locale live here, through the same i18n keys the forms use — so the feed,
 * the form, and the modal can never disagree on a label.
 */

import type { IntlShape } from 'react-intl';

import type { ActivityRow } from 'store/api/activityFeedApi';

/** Production subtypes → verb keys (display only — entry mapping lives in activityVerbs). */
const PRODUCTION_SUBTYPE_VERB: Record<string, string> = {
  PL: 'planting',
  TR: 'planting',
  IR: 'irrigation',
  HA: 'harvest',
  PH: 'harvest',
  EM: 'cleanout',
  CU: 'field_work',
  PR: 'field_work',
  MO: 'field_work',
  TH: 'field_work',
  CM: 'field_work',
  PO: 'field_work',
  FP: 'field_work'
};

const EVENT_TYPE_VERB: Record<number, string> = {
  0: 'weather',
  2: 'input_application',
  3: 'other',
  5: 'soil',
  6: 'pest',
  7: 'business'
};

/**
 * (event_type, subtype) → verb key. Takes the two values rather than a row so the detail
 * modal, which holds a full event and not an `ActivityRow`, can ask the same question.
 */
export const verbKeyFor = (eventType: number, subtype?: string | null): string | null => {
  if (eventType === 1) {
    return PRODUCTION_SUBTYPE_VERB[subtype ?? ''] ?? 'field_work';
  }
  return EVENT_TYPE_VERB[eventType] ?? null;
};

const verbKeyForRow = (row: ActivityRow): string | null => verbKeyFor(row.event_type, row.subtype);

/**
 * The per-family subtype code, wherever this event happens to carry it.
 *
 * Lives here because three surfaces needed it and each had grown its own copy: the detail
 * modal, and TWICE inside EnhancedTimelineRow (once for the field registry, once for the
 * label). Same shape as the organic-allowlist duplication — N copies drift into M answers.
 *
 * ⚠️ Order matters, and `type` is LAST on purpose: on several families `type` holds a message
 * id rather than a subtype code, so it is only a fallback for rows that carry nothing else.
 */
export const subtypeOf = (event: Record<string, unknown>): string | undefined =>
  (event.weather_type ||
    event.production_type ||
    event.chemical_type ||
    event.soil_management_type ||
    event.pest_management_type ||
    event.business_event_type ||
    event.type) as string | undefined;

/**
 * The farmer-language ACTIVITY label for an event — "Irrigation", "Input application",
 * "Pest & scouting" — i.e. the same words the "What did you do?" picker offers.
 *
 * Use this for any chip or badge that names what an event IS. The retired seven-family
 * vocabulary ("Production Activity", "Chemical Application", "Soil Management") must not be
 * rendered: a record the grower filed as Irrigation was displaying as "Production Activity",
 * so one record had two identities depending on which screen you opened — the same defect
 * already fixed on the edit path.
 *
 * Falls back to `activities.type.${eventType}` only where no verb exists (event_type 4,
 * Equipment), which keeps the string translated either way.
 */
export const activityLabel = (
  eventType: number,
  subtype: string | null | undefined,
  intl: IntlShape
): string => {
  const verb = verbKeyFor(eventType, subtype);
  return verb
    ? intl.formatMessage({ id: `activities.verb.${verb}` })
    : intl.formatMessage({ id: `activities.type.${eventType}` });
};

/**
 * Localized farmer-language title for an event.
 *
 * ⛔ NEVER falls back to the description. That fallback is what put a five-line paragraph —
 * "Hull split at 15%. NOW egg-trap catch rose to 22 over the prior week, above the
 * hull-split treatment threshold for the block." — in the detail modal's H1, verbatim
 * duplicating the Field Notes card directly beneath it and eating half a phone screen
 * (2026-08-16). A title names the KIND of thing; the description is the thing itself.
 *
 * `name` is honoured first because a farmer who typed one meant it.
 */
export const eventTitle = (
  eventType: number,
  subtype: string | null | undefined,
  name: string | null | undefined,
  intl: IntlShape
): string => {
  if (name) return name;
  const verb = verbKeyFor(eventType, subtype);
  if (verb) return intl.formatMessage({ id: `activities.verb.${verb}` });
  return intl.formatMessage({ id: `activities.type.${eventType}` });
};

/** Localized farmer-language title for a feed row. */
export const activityTitle = (row: ActivityRow, intl: IntlShape): string => {
  const verb = verbKeyForRow(row);
  if (verb) return intl.formatMessage({ id: `activities.verb.${verb}` });
  return row.name || intl.formatMessage({ id: `activities.type.${row.event_type}` });
};

const enumLabel = (intl: IntlShape, key: string | undefined, map: Record<string, string>) =>
  key && map[key] ? intl.formatMessage({ id: map[key] }) : null;

const AMOUNT_DETERMINATION_KEYS: Record<string, string> = {
  estimated: 'events.amountDetermination.estimated',
  scale_verified: 'events.amountDetermination.scaleVerified'
};

const HARVEST_DESTINATION_KEYS: Record<string, string> = {
  stored: 'events.harvestDestination.stored',
  sold_direct: 'events.harvestDestination.soldDirect',
  livestock_feed: 'events.harvestDestination.livestockFeed',
  other: 'events.harvestDestination.other'
};

/**
 * Localized summary line composed from the row's structured detail values.
 * Returns null when the row carries nothing worth saying — callers fall back
 * to the farmer's own description.
 */
export const activitySummary = (row: ActivityRow, intl: IntlShape): string | null => {
  const d = row.detail ?? {};
  const parts: Array<string | null> = [];

  if (row.event_type === 2) {
    parts.push((d.commercial_name as string) ?? null);
    if (d.applied_scope === 'part') {
      parts.push(
        (d.applied_scope_detail as string) || intl.formatMessage({ id: 'events.appliedScope.part' })
      );
    } else if (d.applied_scope === 'all') {
      parts.push(intl.formatMessage({ id: 'events.appliedScope.all' }));
    }
  } else if (row.event_type === 1 && (row.subtype === 'HA' || row.subtype === 'PH')) {
    if (d.yield_quantity) {
      parts.push([d.yield_quantity, d.yield_unit].filter(Boolean).join(' '));
    }
    parts.push(enumLabel(intl, d.amount_determination as string, AMOUNT_DETERMINATION_KEYS));
    parts.push(enumLabel(intl, d.harvest_destination as string, HARVEST_DESTINATION_KEYS));
  } else if (row.event_type === 1 && row.subtype === 'EM') {
    parts.push((d.cleaning_method as string) ?? null);
  }

  const line = parts.filter(Boolean).join(' — ');
  return line || null;
};
