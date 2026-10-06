import { useEffect, useCallback } from 'react';
import { useTourStore } from '../store/tourStore';
import { getTour } from '../tours/registry';

/**
 * Hook for page-level tour connection.
 * Call from a page component to auto-start a tour on first visit.
 *
 * Usage:
 *   useTour('welcome-fresh'); // Auto-starts if not completed/skipped
 *
 * Or for manual control:
 *   const { start, isActive } = useTour('production-tour', { autoStart: false });
 */
/** How long a "Take the tour" request stays valid (review of app #80). */
export const TOUR_REQUEST_WINDOW_MS = 15_000;

interface UseTourOptions {
  /** Whether to auto-start the tour (default: true) */
  autoStart?: boolean;
  /** Delay in ms before auto-starting (default: 3000 for welcome, 1500 for others) */
  delay?: number;
  /** Only start if this condition is true */
  enabled?: boolean;
}

export function useTour(tourId: string, options: UseTourOptions = {}) {
  const { autoStart = true, delay, enabled = true } = options;

  const activeTourId = useTourStore((s) => s.activeTourId);
  const completedTours = useTourStore((s) => s.completedTours);
  const skippedTours = useTourStore((s) => s.skippedTours);
  const startTour = useTourStore((s) => s.startTour);
  const restartRequested = useTourStore((s) => s.restartRequested);

  const tour = getTour(tourId);
  const isActive = activeTourId === tourId;

  // Check if this tour is already done
  const isDone =
    !!skippedTours[tourId] ||
    (!!completedTours[tourId] && tour ? completedTours[tourId].version >= tour.version : false);

  // Check if another tour is already running
  const isBusy = !!activeTourId && activeTourId !== tourId;

  const start = useCallback(() => {
    if (!isDone && !isBusy && tour) {
      startTour(tourId);
    }
  }, [isDone, isBusy, tour, tourId, startTour]);

  // Start on request only.
  //
  // Run 8 (R8-25, Astra 2026-10-05): tours used to start by themselves 5 s after a page loaded.
  // By then the grower was already typing, so the overlay arrived mid-task and, on the production
  // page, dismissing it threw away the crop search in progress. A tour now runs only after the
  // grower asks for one ("Take the tour" in the settings drawer sets `restartRequested`); the
  // page that asked then starts its tour.
  useEffect(() => {
    if (!autoStart || !enabled || isDone || isBusy || !tour) return;
    if (!restartRequested) return;
    // Review of app #80: only a request made just now. "Take the tour" on a page with no tour
    // must not start one minutes later on whichever page the grower opens next.
    if (Date.now() - (useTourStore.getState().restartRequestedAt || 0) > TOUR_REQUEST_WINDOW_MS) {
      useTourStore.getState().clearRestartFlag();
      return;
    }

    // The page is already loaded when the grower asks; a short beat lets the layout settle.
    const actualDelay = delay ?? 500;

    const timer = setTimeout(() => {
      // Re-check conditions after delay (component may have unmounted or state changed)
      const store = useTourStore.getState();
      const isCompleted =
        store.completedTours[tourId] &&
        store.completedTours[tourId].version >= (tour?.version ?? 0);
      const isSkipped = !!store.skippedTours[tourId];

      if (isCompleted || isSkipped) return;

      // Clear restart flag and start (Driver.js handles scrolling natively)
      if (useTourStore.getState().restartRequested) {
        useTourStore.getState().clearRestartFlag();
      }
      startTour(tourId);
    }, actualDelay);

    return () => clearTimeout(timer);
  }, [autoStart, enabled, isDone, isBusy, tour, tourId, delay, startTour, restartRequested]);

  return {
    start,
    isActive,
    isDone,
    isBusy,
    tour
  };
}
