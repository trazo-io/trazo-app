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

const verbKeyForRow = (row: ActivityRow): string | null => {
  if (row.event_type === 1) {
    return PRODUCTION_SUBTYPE_VERB[row.subtype ?? ''] ?? 'field_work';
  }
  return EVENT_TYPE_VERB[row.event_type] ?? null;
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
