import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TourStoreState } from '../tours/types';

/**
 * Tour state store — persisted to localStorage.
 * Follows the Zustand pattern from pointsStore.ts.
 *
 * Handles migration from old onboarding localStorage keys:
 * - trazo_onboarding_completed
 * - trazo_onboarding_skipped
 * - trazo_onboarding_completed_date
 */

// Migrate old onboarding state on first load
function migrateOldOnboardingState(): {
  completedTours: Record<string, { completedAt: string; version: number }>;
  skippedTours: Record<string, string>;
} {
  const completedTours: Record<string, { completedAt: string; version: number }> = {};
  const skippedTours: Record<string, string> = {};

  try {
    const oldCompleted = localStorage.getItem('trazo_onboarding_completed');
    const oldSkipped = localStorage.getItem('trazo_onboarding_skipped');
    const oldCompletedDate = localStorage.getItem('trazo_onboarding_completed_date');

    if (oldCompleted === 'true') {
      // Mark the old modal onboarding as completed so it doesn't re-show
      completedTours['legacy-onboarding'] = {
        completedAt: oldCompletedDate || new Date().toISOString(),
        version: 0
      };
    }

    if (oldSkipped === 'true') {
      skippedTours['legacy-onboarding'] = new Date().toISOString();
    }

    // Clean up old keys
    localStorage.removeItem('trazo_onboarding_completed');
    localStorage.removeItem('trazo_onboarding_skipped');
    localStorage.removeItem('trazo_onboarding_completed_date');
  } catch {
    // localStorage not available — no migration needed
  }

  return { completedTours, skippedTours };
}

const migrated = migrateOldOnboardingState();

export const useTourStore = create<TourStoreState>()(
  persist(
    (set) => ({
      // Initial state (includes migrated data)
      completedTours: migrated.completedTours,
      skippedTours: migrated.skippedTours,
      activeTourId: null,
      activeStepIndex: 0,
      checklistDismissed: false,
      checklistCompleted: false,
      checklistActivityBaselines: {},
      celebratedMilestones: {},
      visitedPages: {},
      restartRequested: false,
      restartRequestedAt: 0,

      // Actions
      startTour: (tourId: string) =>
        set({
          activeTourId: tourId,
          activeStepIndex: 0
        }),

      completeTour: (tourId: string, version: number) =>
        set((state) => ({
          activeTourId: null,
          activeStepIndex: 0,
          completedTours: {
            ...state.completedTours,
            [tourId]: { completedAt: new Date().toISOString(), version }
          }
        })),

      skipTour: (tourId: string) =>
        set((state) => ({
          activeTourId: null,
          activeStepIndex: 0,
          skippedTours: {
            ...state.skippedTours,
            [tourId]: new Date().toISOString()
          }
        })),

      /**
       * Stand the tour down without recording anything.
       *
       * Distinct from `skipTour` (the user said no — never offer it again) and
       * `completeTour` (they saw it). This is "we could not show it": every target was
       * missing from the DOM. Before this existed, TourProvider bailed out of that case
       * while leaving `activeTourId` set, so `useTour`'s `isBusy` check treated a tour that
       * was never drawn as one currently running, and no other tour could start for the rest
       * of the session.
       */
      endTour: () => set({ activeTourId: null, activeStepIndex: 0 }),

      setStepIndex: (index: number) => set({ activeStepIndex: index }),

      dismissChecklist: () => set({ checklistDismissed: true }),
      markChecklistCompleted: () => set({ checklistCompleted: true }),
      setChecklistActivityBaseline: (farmId: string, count: number) =>
        set((state) => ({
          checklistActivityBaselines: { ...state.checklistActivityBaselines, [farmId]: count }
        })),

      celebrateMilestone: (milestoneId: string) =>
        set((state) => ({
          celebratedMilestones: {
            ...state.celebratedMilestones,
            [milestoneId]: new Date().toISOString()
          }
        })),

      trackPageVisit: (pageKey: string) =>
        set((state) => ({
          visitedPages: {
            ...state.visitedPages,
            ...(state.visitedPages[pageKey] ? {} : { [pageKey]: new Date().toISOString() })
          }
        })),

      clearRestartFlag: () => set({ restartRequested: false }),

      resetAllTours: () =>
        set({
          completedTours: {},
          skippedTours: {},
          activeTourId: null,
          activeStepIndex: 0,
          checklistDismissed: false,
          checklistCompleted: false,
          checklistActivityBaselines: {},
          celebratedMilestones: {},
          visitedPages: {},
          restartRequested: true,
          restartRequestedAt: Date.now()
        })
    }),
    {
      name: 'trazo_tour_state',
      version: 1,
      // Review of app #80: a tour request is a moment, not a setting. Persisting it let a
      // request made on a page with no tour re-arm an auto-start on the next page that has one,
      // even after a reload. Requests live in memory only.
      partialize: (state) => {
        const { restartRequested: _r, restartRequestedAt: _t, ...rest } = state;
        return rest as typeof state;
      }
    }
  )
);
