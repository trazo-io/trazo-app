import { TourDefinition } from './types';
import { registerTour } from './registry';

/**
 * Farm profile tour — shown on first visit to any farm profile page.
 * Only for writers (Admin/Manager). Highlights certification and SOE compliance sections.
 * 2 steps: certifications → SOE compliance.
 */
const farmProfileTour: TourDefinition = {
  id: 'farm-profile',
  priority: 3,
  version: 1,
  trigger: { type: 'first-visit', page: '/farm/' },
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
