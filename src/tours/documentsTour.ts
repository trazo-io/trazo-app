import { TourDefinition } from './types';
import { registerTour } from './registry';

/**
 * Documents tour — the certificate / plan / export shelf.
 *
 * Anchored on the LIST container rather than the table, so the tour still has a target on a
 * farm with no documents yet (the empty state renders in the same Box).
 */
const documentsTour: TourDefinition = {
  id: 'documents-page',
  priority: 2,
  version: 1,
  trigger: { type: 'first-visit', page: '/documents' },
  steps: [
    {
      target: '[data-tour="documents-upload"]',
      titleKey: 'tour.documents.step1.title',
      contentKey: 'tour.documents.step1.content',
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-tour="documents-folders"]',
      titleKey: 'tour.documents.step2.title',
      contentKey: 'tour.documents.step2.content',
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-tour="documents-list"]',
      titleKey: 'tour.documents.step3.title',
      contentKey: 'tour.documents.step3.content',
      placement: 'top',
      disableBeacon: true
    }
  ]
};

registerTour(documentsTour);

export default documentsTour;
