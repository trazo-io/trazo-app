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
  FaBoxOpen,
  FaBroom,
  FaBug,
  FaClipboardList,
  FaCloudRain,
  FaFileInvoiceDollar,
  FaFlask,
  FaLayerGroup,
  FaSeedling,
  FaTint,
  FaTractor
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
  { key: 'soil', eventType: 5, icon: FaLayerGroup, color: 'yellow' },
  { key: 'pest', eventType: 6, icon: FaBug, color: 'red' },
  { key: 'weather', eventType: 0, icon: FaCloudRain, color: 'blue' },
  { key: 'business', eventType: 7, icon: FaFileInvoiceDollar, color: 'teal' },
  // Escape hatch — GeneralEvent (type 3) has no natural verb; without this tile
  // the verb grid would strand every "other" activity the old category grid allowed.
  { key: 'other', eventType: 3, icon: FaClipboardList, color: 'gray' }
];

export const verbForKey = (key: string | null | undefined): ActivityVerb | undefined =>
  ACTIVITY_VERBS.find((v) => v.key === key);
