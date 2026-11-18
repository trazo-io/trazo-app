/**
 * A pick that came sooner than an interval the records set: raw manure on the parcel
 * (`manure_check`, 7 CFR 205.203(c)(1)) or a spray's recorded PHI (`phi_check`).
 *
 * The server sends these on the save response, on the record's detail and, as pick ids, on the
 * parcel's current season (`harvest_interval_picks`). One wording for every place that prints a
 * conflict: the save toast, the record's notice and the timeline row (VID-03, recordkeeping
 * checklist run 2026-11-16: the toast was the only place, and it printed ISO dates).
 */
import type { IntlShape } from 'react-intl';

import { formatDateOnly } from 'utils/dateOnly';

export interface ManureConflict {
  application_id: number;
  pick_id: number;
  /** YYYY-MM-DD */
  applied: string;
  /** YYYY-MM-DD */
  picked: string;
  days: number;
  interval_days: number;
  /** How the manure record labels itself when it is read as raw anyway. */
  recorded_as?: 'raw' | 'composted' | 'processed_5006' | string;
}

export interface PhiConflict {
  application_id: number;
  pick_id: number;
  /** The farm's own name for the product, or "". */
  product: string;
  /** YYYY-MM-DD */
  applied: string;
  /** YYYY-MM-DD */
  picked: string;
  days: number;
  /** A decimal as a string: "3", "2.5". */
  phi_days: string;
}

/** Pick ids from the current-season payload, by kind. */
export interface HarvestIntervalPicks {
  manure: number[];
  phi: number[];
}

const day = (iso: string, intl: IntlShape) => formatDateOnly(iso, intl.locale) ?? iso;

export const manureConflictLine = (c: ManureConflict, intl: IntlShape): string =>
  intl.formatMessage(
    { id: 'app.manureConflictLine' },
    {
      applied: day(c.applied, intl),
      picked: day(c.picked, intl),
      days: c.days,
      interval: c.interval_days,
      recorded_as: c.recorded_as || 'raw'
    }
  );

export const phiConflictLine = (c: PhiConflict, intl: IntlShape): string =>
  intl.formatMessage(
    { id: 'app.phiConflictLine' },
    {
      product: c.product || intl.formatMessage({ id: 'app.phiConflictNoProduct' }),
      applied: day(c.applied, intl),
      picked: day(c.picked, intl),
      days: c.days,
      phi: c.phi_days
    }
  );

/** The timeline row's flag for one pick, or null when the pick is inside neither. */
export const harvestIntervalRowFlag = (
  pickId: number,
  picks: HarvestIntervalPicks | null | undefined,
  intl: IntlShape
): string | null => {
  if (!picks) return null;
  const manure = (picks.manure ?? []).includes(pickId);
  const phi = (picks.phi ?? []).includes(pickId);
  if (manure && phi) return intl.formatMessage({ id: 'harvestInterval.row.both' });
  if (manure) return intl.formatMessage({ id: 'harvestInterval.row.manure' });
  if (phi) return intl.formatMessage({ id: 'harvestInterval.row.phi' });
  return null;
};
