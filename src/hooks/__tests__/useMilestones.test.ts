/**
 * Milestone rules.
 *
 * WHY: this layer shipped in March and had NEVER fired once. Two of its four milestones were
 * hardcoded `achieved: false`, and the other two walked
 * `establishments[].parcels[].productions[]` — a path that does not exist in the payload
 * (`ParcelBasicSerializer` has no `productions` field), so they were false too. It was rewired
 * to the productions query on 2026-08-16, which turns a layer nobody could see into one every
 * grower will, and that is exactly when the rules need pinning.
 *
 * The baseline rule is the subtle one: because nothing ever fired, every existing account has
 * an empty `celebratedMilestones`, so a farm with twenty seasons on file would be congratulated
 * on its "first" activity the next time it logged in.
 */
import { describe, it, expect } from 'vitest';

import { resolveAchievedMilestones, pickCelebration } from '../useMilestones';

const none = new Set<string>();

describe('resolveAchievedMilestones', () => {
  it('is all-false while the query has not resolved', () => {
    expect(resolveAchievedMilestones(undefined)).toEqual({
      'first-event': false,
      'first-finish': false
    });
  });

  it('reads events_count and finish_date, not a score', () => {
    expect(resolveAchievedMilestones([{ events_count: 0, finish_date: null }])).toEqual({
      'first-event': false,
      'first-finish': false
    });
    expect(resolveAchievedMilestones([{ events_count: 3, finish_date: null }])).toEqual({
      'first-event': true,
      'first-finish': false
    });
    expect(
      resolveAchievedMilestones([
        { events_count: 0, finish_date: null },
        { events_count: 2, finish_date: '2026-07-01' }
      ])
    ).toEqual({ 'first-event': true, 'first-finish': true });
  });

  it('survives rows missing the fields entirely', () => {
    expect(resolveAchievedMilestones([{}, null as any])).toEqual({
      'first-event': false,
      'first-finish': false
    });
  });
});

describe('pickCelebration', () => {
  const achievedBoth = { 'first-event': true, 'first-finish': true };

  it('returns nothing when nothing is achieved', () => {
    expect(
      pickCelebration({
        achieved: { 'first-event': false, 'first-finish': false },
        celebrated: {},
        suppressed: none,
        farmId: '154'
      })
    ).toBeNull();
  });

  it('offers one milestone at a time, in definition order', () => {
    const first = pickCelebration({
      achieved: achievedBoth,
      celebrated: {},
      suppressed: none,
      farmId: '154'
    });
    expect(first?.id).toBe('first-event');

    const second = pickCelebration({
      achieved: achievedBoth,
      celebrated: { 'first-event': '2026-08-16T00:00:00.000Z' },
      suppressed: none,
      farmId: '154'
    });
    expect(second?.id).toBe('first-finish');
  });

  it('never re-celebrates what is already recorded', () => {
    expect(
      pickCelebration({
        achieved: achievedBoth,
        celebrated: {
          'first-event': '2026-08-16T00:00:00.000Z',
          'first-finish': '2026-08-16T00:00:00.000Z'
        },
        suppressed: none,
        farmId: '154'
      })
    ).toBeNull();
  });

  it('suppresses the baseline — history is not a milestone', () => {
    // The established-farm case: both were already true the first time this browser saw the
    // data. Without this the grower gets a toast and a confetti modal about work from months ago.
    expect(
      pickCelebration({
        achieved: achievedBoth,
        celebrated: {},
        suppressed: new Set(['first-event', 'first-finish']),
        farmId: '154'
      })
    ).toBeNull();
  });

  it('still fires for a transition that happens after the baseline', () => {
    // Baseline caught "first activity"; the grower then finishes the season in-session.
    const next = pickCelebration({
      achieved: achievedBoth,
      celebrated: { 'first-event': '2026-08-16T00:00:00.000Z' },
      suppressed: new Set(['first-event']),
      farmId: '154'
    });
    expect(next?.id).toBe('first-finish');
  });

  it('resolves :farmId into the action path', () => {
    const next = pickCelebration({
      achieved: achievedBoth,
      celebrated: {},
      suppressed: none,
      farmId: '154'
    });
    expect(next?.actionPath).toBe('/admin/dashboard/farm/154/activities');
    expect(next?.actionPath).not.toContain(':farmId');
  });

  it('falls back to the dashboard rather than routing to a literal ":farmId"', () => {
    const next = pickCelebration({
      achieved: achievedBoth,
      celebrated: {},
      suppressed: none,
      farmId: ''
    });
    expect(next?.actionPath).toBe('/admin/dashboard');
  });

  it('leaves the shared definition untouched (resolution must not mutate it)', () => {
    pickCelebration({ achieved: achievedBoth, celebrated: {}, suppressed: none, farmId: '154' });
    const again = pickCelebration({
      achieved: achievedBoth,
      celebrated: {},
      suppressed: none,
      farmId: '999'
    });
    expect(again?.actionPath).toBe('/admin/dashboard/farm/999/activities');
  });
});
