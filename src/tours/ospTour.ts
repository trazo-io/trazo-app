import { TourDefinition } from './types';
import { registerTour } from './registry';

/**
 * Organic System Plan tour — the flagship October artifact.
 *
 * Gated on an OSP existing (see the `useTour` call in OSPModuleListPage): before that the page
 * is a single "Start my OSP" card and every target below is absent, which would burn the tour's
 * one showing on a page that has nothing to point at.
 */
const ospTour: TourDefinition = {
  id: 'osp-modules',
  priority: 2,
  version: 1,
  trigger: { type: 'first-visit', page: '/osp' },
  steps: [
    {
      target: '[data-tour="osp-progress"]',
      titleKey: 'tour.osp.step1.title',
      contentKey: 'tour.osp.step1.content',
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-tour="osp-modules-grid"]',
      titleKey: 'tour.osp.step2.title',
      contentKey: 'tour.osp.step2.content',
      placement: 'top',
      disableBeacon: true
    },
    {
      target: '[data-tour="osp-parcel-applications"]',
      titleKey: 'tour.osp.step3.title',
      contentKey: 'tour.osp.step3.content',
      placement: 'top',
      disableBeacon: true
    },
    {
      target: '[data-tour="osp-packet"]',
      titleKey: 'tour.osp.step4.title',
      contentKey: 'tour.osp.step4.content',
      placement: 'bottom',
      disableBeacon: true
    }
  ]
};

registerTour(ospTour);

export default ospTour;
