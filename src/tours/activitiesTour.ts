import { TourDefinition } from './types';
import { registerTour } from './registry';

/**
 * Activities tour — the daily recordkeeping surface of the October pivot.
 *
 * This is where a grower spends their season: one entry here feeds both outputs (the OSP /
 * certifier packet and the buyer page). It had no tour at all until 2026-08-16 while the
 * checklist was already sending people here.
 */
const activitiesTour: TourDefinition = {
  id: 'activities-page',
  priority: 2,
  version: 1,
  trigger: { type: 'first-visit', page: '/activities' },
  steps: [
    {
      target: '[data-tour="activities-log"]',
      titleKey: 'tour.activities.step1.title',
      contentKey: 'tour.activities.step1.content',
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-tour="activities-views"]',
      titleKey: 'tour.activities.step2.title',
      contentKey: 'tour.activities.step2.content',
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-tour="activities-timeline"]',
      titleKey: 'tour.activities.step3.title',
      contentKey: 'tour.activities.step3.content',
      placement: 'top',
      disableBeacon: true
    }
  ]
};

registerTour(activitiesTour);

export default activitiesTour;
