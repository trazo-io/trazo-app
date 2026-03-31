import { TourDefinition } from './types';
import { registerTour } from './registry';

/**
 * Transparency dashboard tour — shown on first visit.
 * Available to all roles. 5 steps including center intro.
 * Focuses on the transparency score system and how to improve it.
 */
const transparencyTour: TourDefinition = {
  id: 'transparency-dashboard',
  priority: 3,
  version: 1,
  trigger: { type: 'first-visit', page: '/transparency' },
  steps: [
    {
      target: '[data-tour="transparency-stats"]',
      titleKey: 'tour.transparency.step1.title',
      contentKey: 'tour.transparency.step1.content',
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-tour="category-breakdown"]',
      titleKey: 'tour.transparency.step2.title',
      contentKey: 'tour.transparency.step2.content',
      placement: 'top',
      disableBeacon: true
    },
    {
      target: '[data-tour="improvement-roadmap"]',
      titleKey: 'tour.transparency.step3.title',
      contentKey: 'tour.transparency.step3.content',
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-tour="productions-list"]',
      titleKey: 'tour.transparency.step4.title',
      contentKey: 'tour.transparency.step4.content',
      placement: 'top',
      disableBeacon: true
    }
  ]
};

registerTour(transparencyTour);

export default transparencyTour;
