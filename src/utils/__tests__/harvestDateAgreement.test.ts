/**
 * Every surface that prints a harvest date must print the SAME one.
 *
 * `harvestDateProvenance.test.ts` (2026-08-20) proves `resolveHarvestDates` prefers the harvest
 * records over the season-close date, and it does. The defect found on 2026-09-16 was not in the
 * resolver: `ProductDetail` called it for the hero and the HARVEST pillar, and then passed
 * `completeData.finish_date` straight to the parcel card, which labels it "HARVEST DATE".
 *
 * So one page carried both answers at once:
 *
 *   blueberry lot CBF-26-RB   top: Jul 20 - Aug 7, 2026     parcel card: Aug 12, 2026
 *   carrot lot    CBF-25-BGA  top: Sep 8 - Sep 19, 2025     parcel card: Sep 30, 2025
 *
 * Agreement is therefore the property under test, not any one component. These cases model the
 * exact shapes `ProductDetail` derives, so a future caller that reaches past the resolver again
 * fails here rather than on a buyer's phone.
 */

import { describe, expect, it } from 'vitest';

import { resolveHarvestDates, resolveProductionDisplayDates } from '../consumerDisplay';

/**
 * What each of the three surfaces is handed, from the ONE derivation `ProductDetail` calls.
 *
 * ⛔ This must stay a thin wrapper over `resolveProductionDisplayDates` and never re-implement
 * the rule. An earlier cut of this file copied the derivation inline, which would have passed
 * forever no matter what the page actually did — the exact shape of test that let the original
 * defect ship.
 */
function deriveDisplayDates(
  timeline: Array<{ production_type?: string; type?: string; date?: string | null }>,
  seasonClosedDate: string | null
) {
  const d = resolveProductionDisplayDates(timeline, seasonClosedDate);
  // ⛔ 2026-09-24 — the gate is applied ONCE, exactly as `ProductDetail` applies it.
  //
  // This helper used to hand the hero and the pillar `d.harvestDate` ungated and gate only the
  // parcel card, mirroring the component at the time. That was the bug, not the contract: both
  // of those surfaces label the value "Harvested {date}", so a lot with no harvest record
  // showed the season-close date under a harvest label while the card below showed the same
  // date under "SEASON CLOSED". All eight cases passed while the defect was live, because the
  // model encoded it. Model the RULE, never the current call sites.
  const harvestDate = d.harvestFromRecords ? d.harvestDate : undefined;
  const harvestDateStart = d.harvestFromRecords ? d.harvestDateStart : undefined;
  return {
    hero: { harvestDate, harvestDateStart },
    pillar: { harvestDate, harvestDateStart },
    parcelCard: { harvestDate, harvestDateStart, seasonClosedDate: d.seasonClosedDate },
    plantingDate: d.plantingDate
  };
}

describe('harvest date agreement across displays', () => {
  it('gives the hero, the pillar and the parcel card the same multi-pass range', () => {
    // The audited blueberry lot: picks on Jul 20 and Aug 7, season closed Aug 12.
    const timeline = [
      { production_type: 'HA', date: '2026-07-20T15:00:00+00:00' },
      { production_type: 'HA', date: '2026-08-07T15:00:00+00:00' }
    ];
    const d = deriveDisplayDates(timeline, '2026-08-12T17:00:00+00:00');

    expect(d.parcelCard.harvestDate).toBe(d.hero.harvestDate);
    expect(d.parcelCard.harvestDateStart).toBe(d.hero.harvestDateStart);
    expect(d.hero.harvestDate).toBe(d.pillar.harvestDate);
    // ⛔ The regression: the close date must never arrive as a harvest date.
    expect(d.parcelCard.harvestDate).not.toBe('2026-08-12T17:00:00+00:00');
    expect(d.parcelCard.seasonClosedDate).toBe('2026-08-12T17:00:00+00:00');
  });

  it('agrees on a single-pass harvest and prints no range', () => {
    const timeline = [{ production_type: 'HA', date: '2025-09-30T15:00:00+00:00' }];
    const d = deriveDisplayDates(timeline, '2025-10-04T17:00:00+00:00');

    expect(d.parcelCard.harvestDate).toBe(d.hero.harvestDate);
    expect(d.hero.harvestDateStart).toBeUndefined();
    expect(d.parcelCard.harvestDateStart).toBeUndefined();
  });

  it('suppresses the season-close row when close and last harvest are the same instant', () => {
    const sameDay = '2025-09-30T15:00:00+00:00';
    const d = deriveDisplayDates([{ production_type: 'HA', date: sameDay }], sameDay);

    expect(d.parcelCard.harvestDate).toBe(sameDay);
    // One date, one row. Printing it twice under two labels is noise that reads as a discrepancy.
    expect(d.parcelCard.seasonClosedDate).toBeUndefined();
  });

  it('shows no harvest date on ANY surface for a lot with no harvest record', () => {
    // ⛔ The resolver falls back to the close date here. Every surface that labels its value
    // "Harvested" must refuse that fallback — the hero and the pillar included, not just the
    // parcel card. This assertion is what makes the gate's placement observable.
    const d = deriveDisplayDates(
      [{ production_type: 'PR', date: '2025-03-28T07:00:00+00:00' }],
      '2025-10-04T17:00:00+00:00'
    );

    expect(d.hero.harvestDate).toBeUndefined();
    expect(d.pillar.harvestDate).toBeUndefined();
    expect(d.parcelCard.harvestDate).toBeUndefined();
    // The date is not lost, it is relabelled.
    expect(d.parcelCard.seasonClosedDate).toBe('2025-10-04T17:00:00+00:00');
  });

  it('suppresses the season-close row when close and last harvest fall on the same LOCAL day', () => {
    // `History.finish_date` and `CommonEvent.date` are both DateTimeFields, so a lot closed the
    // afternoon it was picked has two timestamps hours apart. An instant comparison could never
    // suppress the row and it printed on every lot; the comparison is per calendar day, in the
    // same frame the reader sees, exactly as `resolveHarvestDates` compares.
    const picked = new Date(2025, 8, 30, 9, 0, 0).toISOString();
    const closed = new Date(2025, 8, 30, 17, 30, 0).toISOString();
    const d = deriveDisplayDates([{ production_type: 'HA', date: picked }], closed);

    expect(d.parcelCard.harvestDate).toBe(picked);
    expect(d.parcelCard.seasonClosedDate).toBeUndefined();
  });

  it('finds the planting record when production_type is an empty string', () => {
    // The API emits `production_type: ""` for an event whose `type` is unset, and `??` only
    // falls back on null/undefined — so the harvest filter matched such a row while the
    // planting derivation silently missed it.
    const d = deriveDisplayDates(
      [
        { production_type: '', type: 'PL', date: '2025-04-02T15:00:00+00:00' },
        { production_type: 'HA', date: '2025-09-30T15:00:00+00:00' }
      ],
      null
    );
    expect(d.plantingDate).toBe('2025-04-02T15:00:00+00:00');
  });

  it('reports no dates at all when the lot has neither a harvest record nor a close date', () => {
    const d = deriveDisplayDates([], null);
    expect(d.parcelCard.harvestDate).toBeUndefined();
    expect(d.parcelCard.seasonClosedDate).toBeUndefined();
    expect(d.hero.harvestDate).toBeUndefined();
  });
});

describe('harvest date boundaries', () => {
  it('does not invent a range from two passes on the same recorded day', () => {
    // Stored timestamps are UTC wall clocks (ADR 011): "06:00Z" is the 06:00 the farmer entered.
    // Both picks print as Aug 7, so the comparison, taken in the same frame as the render, must
    // not print "Aug 7 - Aug 8" for one day. (Until 2026-11-11 these were built from the
    // viewer's local clock, the model the consumer page no longer renders in.)
    const morning = '2026-08-07T06:00:00Z';
    const evening = '2026-08-07T21:00:00Z';
    const result = resolveHarvestDates(
      [
        { production_type: 'HA', date: morning },
        { production_type: 'HA', date: evening }
      ],
      null
    );

    expect(result.isRange).toBe(false);
    expect(result.fromRecords).toBe(true);
  });

  it('does report a range for passes on adjacent recorded days', () => {
    const lateNight = '2026-08-07T23:30:00Z';
    const nextMorning = '2026-08-08T00:30:00Z';
    const result = resolveHarvestDates(
      [
        { production_type: 'HA', date: lateNight },
        { production_type: 'HA', date: nextMorning }
      ],
      null
    );

    expect(result.isRange).toBe(true);
    expect(result.first).toBe(lateNight);
    expect(result.last).toBe(nextMorning);
  });

  it('marks the provenance of every answer it returns', () => {
    expect(resolveHarvestDates([{ type: 'HA', date: '2026-08-07T15:00:00Z' }], null).fromRecords).toBe(
      true
    );
    expect(resolveHarvestDates([], '2026-08-12T17:00:00Z').fromRecords).toBe(false);
    expect(resolveHarvestDates([], null).fromRecords).toBe(false);
  });
});
