// @vitest-environment jsdom
/**
 * Run 8 (R8-25, Astra 2026-10-05): tours started themselves 5 s after a page loaded, which on the
 * production page arrived while the grower was typing and dismissing it lost the crop search. A
 * tour now runs only after the grower asks for one.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTour } from '../useTour';
import { useTourStore } from '../../store/tourStore';
import { registerTour } from '../../tours/registry';

const TOUR_ID = 'r8-test-tour';

describe('a tour starts only when the grower asks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    registerTour({ id: TOUR_ID, version: 1, trigger: { type: 'first-visit', page: '/x' }, steps: [] } as any);
    useTourStore.setState({
      activeTourId: null,
      completedTours: {},
      skippedTours: {},
      restartRequested: false
    } as any);
  });
  afterEach(() => vi.useRealTimers());

  it('does not start on a first visit by itself', () => {
    renderHook(() => useTour(TOUR_ID));
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(useTourStore.getState().activeTourId).toBeNull();
  });

  it('starts after "Take the tour" is pressed', () => {
    useTourStore.setState({ restartRequested: true } as any);
    renderHook(() => useTour(TOUR_ID));
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(useTourStore.getState().activeTourId).toBe(TOUR_ID);
  });
});
