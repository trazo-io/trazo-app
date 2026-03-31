import { TourDefinition } from './types';
import { registerTour } from './registry';

/**
 * Scenario A: Fresh signup — Admin with empty company.
 * 3 steps. User already has establishment, needs to understand dashboard and add a parcel.
 */
const welcomeTourFresh: TourDefinition = {
  id: 'welcome-fresh',
  scenario: 'fresh-signup',
  priority: 1,
  version: 2,
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
      target: '[data-tour="parcels-carousel"]',
      titleKey: 'tour.welcomeFresh.step2.title',
      contentKey: 'tour.welcomeFresh.step2.content',
      placement: 'top',
      disableBeacon: true
    },
    {
      target: '[data-tour="sidebar-nav"]',
      titleKey: 'tour.welcomeFresh.step3.title',
      contentKey: 'tour.welcomeFresh.step3.content',
      placement: 'bottom',
      disableBeacon: true
    }
  ]
};

registerTour(welcomeTourFresh);

export default welcomeTourFresh;
