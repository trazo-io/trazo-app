import { TourDefinition } from './types';
import { registerTour } from './registry';

/**
 * Scenario B: Invited writer — Admin/Manager joining existing company with data.
 * 3 steps. Orientation to the hierarchy: Farms → Parcels → Navigation.
 */
const welcomeTourInvited: TourDefinition = {
  id: 'welcome-invited',
  scenario: 'invited-writer',
  priority: 1,
  version: 2,
  trigger: { type: 'first-visit', page: '/admin/dashboard' },
  steps: [
    {
      target: '[data-tour="farm-carousel"]',
      titleKey: 'tour.welcomeInvited.step1.title',
      contentKey: 'tour.welcomeInvited.step1.content',
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-tour="parcels-carousel"]',
      titleKey: 'tour.welcomeInvited.step2.title',
      contentKey: 'tour.welcomeInvited.step2.content',
      placement: 'top',
      disableBeacon: true
    },
    {
      target: '[data-tour="sidebar-nav"]',
      titleKey: 'tour.welcomeInvited.step3.title',
      contentKey: 'tour.welcomeInvited.step3.content',
      placement: 'bottom',
      disableBeacon: true
    }
  ]
};

registerTour(welcomeTourInvited);

export default welcomeTourInvited;
