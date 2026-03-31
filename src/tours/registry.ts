import { TourDefinition } from './types';

/**
 * Central tour registry — maps tourId to TourDefinition.
 * Tour files register themselves by calling registerTour().
 */

const tourRegistry = new Map<string, TourDefinition>();

export function registerTour(tour: TourDefinition): void {
  tourRegistry.set(tour.id, tour);
}

export function getTour(tourId: string): TourDefinition | undefined {
  return tourRegistry.get(tourId);
}

export function getAllTours(): TourDefinition[] {
  return Array.from(tourRegistry.values());
}

/**
 * Get tours that should trigger for a given page path.
 * Returns tours sorted by priority (lower = higher priority).
 */
export function getToursForPage(page: string): TourDefinition[] {
  return getAllTours()
    .filter(
      (tour) =>
        tour.trigger.type === 'first-visit' && page.includes(tour.trigger.page)
    )
    .sort((a, b) => a.priority - b.priority);
}
