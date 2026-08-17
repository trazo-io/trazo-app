import { TourDefinition } from './types';
import { registerTour } from './registry';

/**
 * Scenario A: Fresh signup — Admin with empty company.
 *
 * 4 steps, in the order the farm home renders them: farms → what is still open before the
 * certifier packet → parcels → the destinations in the nav. Version 3 (was 2) because the
 * certifier-readiness step is new and the sidebar step used to name a "commercial dashboard"
 * and a transparency page — everyone who saw v2 was pointed at two destinations that had
 * already been deleted.
 *
 * Step keys are numbered in the order they are SHOWN. Worth keeping that way: the readiness
 * step first shipped as `step4` inserted second, so the keys ran 1, 4, 2, 3 down the screen.
 */
const welcomeTourFresh: TourDefinition = {
  id: 'welcome-fresh',
  scenario: 'fresh-signup',
  priority: 1,
  version: 3,
  trigger: { type: 'first-visit', page: '/admin/dashboard' },
  steps: [
    {
      target: '[data-tour="farm-carousel"]',
      titleKey: 'tour.welcomeFresh.step1.title',
      contentKey: 'tour.welcomeFresh.step1.content',
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-tour="certifier-readiness"]',
      titleKey: 'tour.welcomeFresh.step2.title',
      contentKey: 'tour.welcomeFresh.step2.content',
      placement: 'top',
      disableBeacon: true
    },
    {
      target: '[data-tour="parcels-carousel"]',
      titleKey: 'tour.welcomeFresh.step3.title',
      contentKey: 'tour.welcomeFresh.step3.content',
      placement: 'top',
      disableBeacon: true
    },
    {
      target: '[data-tour="sidebar-nav"]',
      titleKey: 'tour.welcomeFresh.step4.title',
      contentKey: 'tour.welcomeFresh.step4.content',
      placement: 'bottom',
      disableBeacon: true
    }
  ]
};

registerTour(welcomeTourFresh);

export default welcomeTourFresh;
