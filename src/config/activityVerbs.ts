/**
 * Activity verbs — the ONE farmer-language entry vocabulary (WS-4b).
 *
 * Every "log something" entry point (Activities page, parcel Add Event menu,
 * NewEvent's own chooser) renders THIS list, so the farmer sees the same verbs
 * everywhere. Verbs are a presentation layer over the unchanged backend event
 * models: eventType routes to the model, subtype (when a verb maps 1:1 to a
 * production subtype) pre-answers the type select inside the form.
 *
 * i18n: label = `activities.verb.${key}` in both catalogs.
 */

import {
  FaBorderAll,
  FaBoxOpen,
  FaBroom,
  FaBug,
  FaClipboardList,
  FaCloudRain,
  FaFileInvoiceDollar,
  FaFlask,
  FaLayerGroup,
  FaSearch,
  FaSeedling,
  FaTint,
  FaTractor,
  FaTruck
} from 'react-icons/fa';
import type { IconType } from 'react-icons';

export interface ActivityVerb {
  key: string;
  /** Backend event_type the verb routes to (0..7). */
  eventType: number;
  /** Production subtype pre-answered by the verb (only when unambiguous). */
  subtype?: string;
  icon: IconType;
  /** Chakra color family for tiles/menu accents. */
  color: string;
}

export const ACTIVITY_VERBS: ActivityVerb[] = [
  { key: 'planting', eventType: 1, subtype: 'PL', icon: FaSeedling, color: 'green' },
  { key: 'input_application', eventType: 2, icon: FaFlask, color: 'orange' },
  { key: 'irrigation', eventType: 1, subtype: 'IR', icon: FaTint, color: 'blue' },
  { key: 'field_work', eventType: 1, subtype: 'CU', icon: FaTractor, color: 'green' },
  { key: 'harvest', eventType: 1, subtype: 'HA', icon: FaBoxOpen, color: 'yellow' },
  { key: 'cleanout', eventType: 1, subtype: 'EM', icon: FaBroom, color: 'gray' },
  // Parity with the activities Quick Organics offers a crop operation. Each of these was
  // recordable only as a field on some other event, so a farmer told to "log a buffer use"
  // had nowhere to go — and the underlying record is not owned by the event it was buried in:
  // a load ships days after its harvest, buffer crop is disposed on its own schedule, and a
  // seed search precedes planting.
  { key: 'transport', eventType: 1, subtype: 'TP', icon: FaTruck, color: 'blue' },
  { key: 'buffer_use', eventType: 1, subtype: 'BU', icon: FaBorderAll, color: 'orange' },
  { key: 'seed_search', eventType: 1, subtype: 'SS', icon: FaSearch, color: 'green' },
  { key: 'soil', eventType: 5, icon: FaLayerGroup, color: 'yellow' },
  { key: 'pest', eventType: 6, icon: FaBug, color: 'red' },
  { key: 'weather', eventType: 0, icon: FaCloudRain, color: 'blue' },
  // Labelled "Certification & compliance", NOT "Sales & compliance".
  //
  // 🔴 2026-08-19: the tile said "Sales & compliance" and a grower who clicked it looking for
  // a sale found only BusinessEvent's certification / compliance / inspection types — there is
  // no sales field on this form at all. Sales are not a field activity: a sale is a
  // transaction against a LOT, not a dated practice on a parcel, and it carries a buyer name
  // that has no business on the consumer timeline. They already have an owner —
  // `SalesRecord` + SalesRecordsSection on the production page, which is what the packet's
  // mass-balance section reads. One editor per fact; do not add a second one here.
  { key: 'business', eventType: 7, icon: FaFileInvoiceDollar, color: 'teal' },
  // Escape hatch — GeneralEvent (type 3) has no natural verb; without this tile
  // the verb grid would strand every "other" activity the old category grid allowed.
  { key: 'other', eventType: 3, icon: FaClipboardList, color: 'gray' }
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
  }
  return ACTIVITY_VERBS.find((v) => v.eventType === eventType && !v.subtype);
};
