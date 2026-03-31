import { TourDefinition } from './types';
import { registerTour } from './registry';

/**
 * Production creation tour — shown when user creates their first production.
 * Only for writers (Admin/Manager). 4 steps including center intro.
 */
const productionTour: TourDefinition = {
  id: 'production-first',
  priority: 2,
  version: 2,
  trigger: { type: 'first-visit', page: 'production/add' },
  steps: [
    {
      target: '[data-tour="crop-selector"]',
      titleKey: 'tour.production.step1.title',
      contentKey: 'tour.production.step1.content',
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-tour="template-events"]',
      titleKey: 'tour.production.step2.title',
      contentKey: 'tour.production.step2.content',
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-tour="transparency-score-preview"]',
      titleKey: 'tour.production.step3.title',
      contentKey: 'tour.production.step3.content',
      placement: 'top',
      disableBeacon: true
    }
  ]
};

registerTour(productionTour);

export default productionTour;
