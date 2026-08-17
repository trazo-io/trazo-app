/**
 * `BUFFER_ENTERS_COMMERCE` decides whether the § 205.202(c) proof fields appear — on the
 * form, in the registry, and in the submitted payload.
 *
 * It is a SUBSTRING match, which is the fragile half of a two-writer pair: the backend
 * decides the same question with an exact frozenset
 * (`ProductionEvent.BUFFER_DISPOSITIONS_ENTERING_COMMERCE`). Substring matching is
 * deliberate — the registry runs AFTER the normalizer has swapped the raw enum for its
 * display label (see `feedback_visiblewhen_post_normalizer`), so this has to accept both
 * spellings. The cost is that it can drift from the backend's exact set without anything
 * failing, in either direction:
 *
 *   too narrow -> the evidence fields never render, and the grower is never asked for the
 *                 delivery tags a certifier will want
 *   too broad  -> Trazo demands paperwork the regulation does not require
 *
 * So both spellings of all seven dispositions are pinned here, verbatim from the Django
 * choices. Change the enum and this test is the thing that tells you.
 */

import { describe, it, expect } from 'vitest';
import { BUFFER_ENTERS_COMMERCE } from '../productionEvent';

// value -> display label, copied from history.models ProductionEvent.buffer_disposition
const DISPOSITIONS: ReadonlyArray<readonly [string, string, boolean]> = [
  ['not_harvested', 'Buffer rows not harvested / excluded', false],
  ['left_in_field', 'Harvested and left in the field', false],
  ['sold_conventional', 'Sold as conventional', true],
  ['fed_nonorganic_livestock', 'Fed to non-organic livestock', true],
  ['disposed', 'Disposed of', false],
  ['given_away', 'Given away', true],
  ['harvested_conventional', 'Harvested separately — sold or used as conventional', true]
];

describe('BUFFER_ENTERS_COMMERCE', () => {
  it.each(DISPOSITIONS)('classifies the raw enum %s correctly', (value, _label, expected) => {
    expect(BUFFER_ENTERS_COMMERCE(value)).toBe(expected);
  });

  it.each(DISPOSITIONS)(
    'classifies the display label of %s the same way',
    (_value, label, expected) => {
      expect(BUFFER_ENTERS_COMMERCE(label)).toBe(expected);
    }
  );

  it('treats an unanswered disposition as owing nothing', () => {
    // NULL means the question was never asked, not that the crop entered commerce.
    for (const empty of [undefined, null, '']) {
      expect(BUFFER_ENTERS_COMMERCE(empty)).toBe(false);
    }
  });

  it('does not match "disposed" on the substring "sold"', () => {
    // The one genuinely close call in the set: d-i-s-p-o-s-e-d contains "sose", not "sold".
    // A sloppier predicate would demand nonorganic sales records for a crop sent to compost.
    expect(BUFFER_ENTERS_COMMERCE('disposed')).toBe(false);
    expect(BUFFER_ENTERS_COMMERCE('Disposed of')).toBe(false);
  });
});
