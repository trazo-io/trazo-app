/**
 * One wording for a pick inside a raw-manure interval or a spray's PHI: the save toast, the
 * record's notice and the timeline row all read these (VID-03, 2026-11-16).
 */
import { describe, expect, it } from 'vitest';
import { createIntl } from 'react-intl';

import enUS from '../../i18n/lang/en-US.json';
import es419 from '../../i18n/lang/es-419.json';
import {
  harvestIntervalRowFlag,
  manureConflictLine,
  phiConflictLine
} from '../harvestIntervalConflicts';

const en = createIntl({ locale: 'en-US', messages: enUS as Record<string, string> });
const es = createIntl({ locale: 'es-419', messages: es419 as Record<string, string> });

const manure = {
  application_id: 1,
  pick_id: 2,
  applied: '2026-10-01',
  picked: '2026-11-10',
  days: 40,
  interval_days: 120
};

describe('conflict lines', () => {
  it('print dates in the reader’s locale, never as stored', () => {
    expect(manureConflictLine(manure, en)).toBe(
      'Raw manure applied Oct 1, 2026: picked Nov 10, 2026, 40 days after (interval 120 days)'
    );
    const spanish = manureConflictLine(manure, es);
    expect(spanish).toContain('1 oct 2026');
    expect(spanish).not.toContain('2026-10-01');
  });

  it('say how a manure record labels itself when it is read as raw anyway', () => {
    expect(manureConflictLine({ ...manure, recorded_as: 'composted' }, en)).toContain(
      'recorded as composted'
    );
    expect(manureConflictLine({ ...manure, recorded_as: 'raw' }, en)).not.toContain('recorded as');
  });

  it('name a spray with no product name in words, not a blank', () => {
    const line = phiConflictLine(
      {
        application_id: 1,
        pick_id: 2,
        product: '',
        applied: '2026-07-10',
        picked: '2026-07-12',
        days: 2,
        phi_days: '3'
      },
      en
    );
    expect(line).toBe(
      'A spray with no product name, applied Jul 10, 2026: picked Jul 12, 2026, 2 days after (PHI 3 days)'
    );
  });
});

describe('harvestIntervalRowFlag', () => {
  const picks = { manure: [5, 7], phi: [7, 9] };
  it('names the interval the pick is inside, both when it is inside both', () => {
    expect(harvestIntervalRowFlag(5, picks, en)).toBe(enUS['harvestInterval.row.manure']);
    expect(harvestIntervalRowFlag(9, picks, en)).toBe(enUS['harvestInterval.row.phi']);
    expect(harvestIntervalRowFlag(7, picks, en)).toBe(enUS['harvestInterval.row.both']);
  });

  it('is null for any other pick, or when the season sent no list', () => {
    expect(harvestIntervalRowFlag(6, picks, en)).toBeNull();
    expect(harvestIntervalRowFlag(5, null, en)).toBeNull();
    expect(harvestIntervalRowFlag(5, undefined, en)).toBeNull();
  });
});
