import { TourDefinition } from './types';
import { registerTour } from './registry';

/**
 * Farm profile tour — certifications + SOE / fraud-prevention plan.
 *
 * The `tour.farmProfile.*` copy and both `data-tour` anchors had existed since the tour system
 * shipped, with no TourDefinition to drive them: the checklist's "Upload your Fraud Prevention
 * Plan" item sent growers to this page cold. Registered 2026-08-16.
 */
const farmProfileTour: TourDefinition = {
  id: 'farm-profile',
  priority: 2,
  version: 1,
  trigger: { type: 'first-visit', page: '/profile' },
  steps: [
    {
      target: '[data-tour="farm-certifications"]',
      titleKey: 'tour.farmProfile.step1.title',
      contentKey: 'tour.farmProfile.step1.content',
      placement: 'top',
      disableBeacon: true
    },
    {
      target: '[data-tour="farm-soe-compliance"]',
      titleKey: 'tour.farmProfile.step2.title',
      contentKey: 'tour.farmProfile.step2.content',
      placement: 'top',
      disableBeacon: true
    }
  ]
};

registerTour(farmProfileTour);

export default farmProfileTour;
