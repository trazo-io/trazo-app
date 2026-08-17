import { TourDefinition } from './types';
import { registerTour } from './registry';

/**
 * Scenario C/D: Viewer — read-only user (invited or code-join).
 * 4 steps focused on browsing: Farms → renewal readiness → Parcels → Navigation.
 * No creation CTAs. Version 3 — see the note in welcomeTourFresh.
 */
const welcomeTourViewer: TourDefinition = {
  id: 'welcome-viewer',
  scenario: 'viewer',
  priority: 1,
  version: 3,
  trigger: { type: 'first-visit', page: '/admin/dashboard' },
  steps: [
    {
      target: '[data-tour="farm-carousel"]',
      titleKey: 'tour.welcomeViewer.step1.title',
      contentKey: 'tour.welcomeViewer.step1.content',
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-tour="certifier-readiness"]',
      titleKey: 'tour.welcomeViewer.step2.title',
      contentKey: 'tour.welcomeViewer.step2.content',
      placement: 'top',
      disableBeacon: true
    },
    {
      target: '[data-tour="parcels-carousel"]',
      titleKey: 'tour.welcomeViewer.step3.title',
      contentKey: 'tour.welcomeViewer.step3.content',
      placement: 'top',
      disableBeacon: true
    },
    {
      target: '[data-tour="sidebar-nav"]',
      titleKey: 'tour.welcomeViewer.step4.title',
      contentKey: 'tour.welcomeViewer.step4.content',
      placement: 'bottom',
      disableBeacon: true
    }
  ]
};

registerTour(welcomeTourViewer);

export default welcomeTourViewer;
