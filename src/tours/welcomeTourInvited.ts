import { TourDefinition } from './types';
import { registerTour } from './registry';

/**
 * Scenario B: Invited writer — Admin/Manager joining existing company with data.
 * 4 steps: Farms → what is open before the certifier packet → Parcels → Navigation.
 * Version 3 — see the note in welcomeTourFresh.
 */
const welcomeTourInvited: TourDefinition = {
  id: 'welcome-invited',
  scenario: 'invited-writer',
  priority: 1,
  version: 3,
  trigger: { type: 'first-visit', page: '/admin/dashboard' },
  steps: [
    {
      target: '[data-tour="farm-home-header"]',
      titleKey: 'tour.welcomeInvited.step1.title',
      contentKey: 'tour.welcomeInvited.step1.content',
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-tour="certifier-readiness"]',
      titleKey: 'tour.welcomeInvited.step2.title',
      contentKey: 'tour.welcomeInvited.step2.content',
      placement: 'top',
      disableBeacon: true
    },
    {
      target: '[data-tour="parcels-carousel"]',
      titleKey: 'tour.welcomeInvited.step3.title',
      contentKey: 'tour.welcomeInvited.step3.content',
      placement: 'top',
      disableBeacon: true
    },
    {
      target: '[data-tour="sidebar-nav"]',
      titleKey: 'tour.welcomeInvited.step4.title',
      contentKey: 'tour.welcomeInvited.step4.content',
      placement: 'bottom',
      disableBeacon: true
    }
  ]
};

registerTour(welcomeTourInvited);

export default welcomeTourInvited;
