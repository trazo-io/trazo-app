import { TourDefinition } from './types';
import { registerTour } from './registry';

/**
 * Buyer Page tour — the second output of "one entry, two outputs".
 *
 * Replaces the never-registered `commercial-dashboard` tour, whose page was folded to a
 * redirect in WS-7 and whose copy described scan-quality and review features that were
 * retired. Everything here points at controls that exist and data that is written.
 */
const buyerTour: TourDefinition = {
  id: 'buyer-page',
  priority: 2,
  version: 1,
  trigger: { type: 'first-visit', page: '/buyer' },
  steps: [
    {
      target: '[data-tour="buyer-stats"]',
      titleKey: 'tour.buyer.step1.title',
      contentKey: 'tour.buyer.step1.content',
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-tour="buyer-productions"]',
      titleKey: 'tour.buyer.step2.title',
      contentKey: 'tour.buyer.step2.content',
      placement: 'top',
      disableBeacon: true
    },
    {
      target: '[data-tour="buyer-requests"]',
      titleKey: 'tour.buyer.step3.title',
      contentKey: 'tour.buyer.step3.content',
      placement: 'top',
      disableBeacon: true
    }
  ]
};

registerTour(buyerTour);

export default buyerTour;
