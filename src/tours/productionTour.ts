import { TourDefinition } from './types';
import { registerTour } from './registry';

/**
 * Production creation tour — shown to a writer starting their first season. 2 steps.
 *
 * It declared THREE until 2026-08-16. The third pointed at the "Pre-configured Events" list,
 * which only renders once a template has been applied — so on arrival the tour ran with two of
 * its three targets and then marked itself complete (measured live: "Step 1 of 2"), and that
 * step was never shown again on that browser. Gating the whole tour on the list existing was
 * worse: it delayed the crop and template steps until after the farmer had already used both.
 *
 * A tour step has to point at something that is on screen at the moment the tour runs. These
 * two are; the events list explains itself with the helper note rendered inside it.
 *
 * (The third step's anchor was also still named `transparency-score-preview` — a leftover from
 * the producer score retired 2026-08-11.)
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
    }
  ]
};

registerTour(productionTour);

export default productionTour;
