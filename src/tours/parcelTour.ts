import { TourDefinition } from './types';
import { registerTour } from './registry';

/**
 * Parcel dashboard tour — shown on first visit to any parcel page.
 * Only for writers (Admin/Manager). Shows the production workflow.
 * 4 steps: current production → events timeline → add event → productions history.
 */
const parcelTour: TourDefinition = {
  id: 'parcel-dashboard',
  priority: 2,
  version: 2,
  trigger: { type: 'first-visit', page: '/parcel/' },
  steps: [
    {
      target: '[data-tour="current-production"]',
      titleKey: 'tour.parcel.step1.title',
      contentKey: 'tour.parcel.step1.content',
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-tour="events-timeline"]',
      titleKey: 'tour.parcel.step2.title',
      contentKey: 'tour.parcel.step2.content',
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-tour="add-event-actions"]',
      titleKey: 'tour.parcel.step3.title',
      contentKey: 'tour.parcel.step3.content',
      placement: 'top',
      disableBeacon: true
    },
    {
      target: '[data-tour="productions-history"]',
      titleKey: 'tour.parcel.step4.title',
      contentKey: 'tour.parcel.step4.content',
      placement: 'bottom',
      disableBeacon: true
    }
  ]
};

registerTour(parcelTour);

export default parcelTour;
