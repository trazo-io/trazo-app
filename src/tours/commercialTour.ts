import { TourDefinition } from './types';
import { registerTour } from './registry';

/**
 * Commercial dashboard tour — shown on first visit.
 * Available to all roles. 5 steps including center intro.
 */
const commercialTour: TourDefinition = {
  id: 'commercial-dashboard',
  priority: 3,
  version: 3,
  trigger: { type: 'first-visit', page: '/commercial' },
  steps: [
    {
      target: '[data-tour="scan-analytics"]',
      titleKey: 'tour.commercial.step1.title',
      contentKey: 'tour.commercial.step1.content',
      placement: 'top',
      disableBeacon: true
    },
    {
      target: '[data-tour="scans-table"]',
      titleKey: 'tour.commercial.step2.title',
      contentKey: 'tour.commercial.step2.content',
      placement: 'top',
      disableBeacon: true
    },
    {
      target: '[data-tour="trend-charts"]',
      titleKey: 'tour.commercial.step3.title',
      contentKey: 'tour.commercial.step3.content',
      placement: 'top',
      disableBeacon: true
    },
    {
      target: '[data-tour="consumer-reviews"]',
      titleKey: 'tour.commercial.step4.title',
      contentKey: 'tour.commercial.step4.content',
      placement: 'top',
      disableBeacon: true
    }
  ]
};

registerTour(commercialTour);

export default commercialTour;
