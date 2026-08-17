/**
 * Tour initialization — import this file to register all tour definitions.
 * Import once in the app entry point (e.g., TourProvider or Admin layout).
 */

// Welcome tours (one per scenario)
import './welcomeTourFresh';
import './welcomeTourInvited';
import './welcomeTourViewer';

// Feature discovery tours — one per October-pivot destination in the sidebar
import './parcelTour';
import './productionTour';
import './activitiesTour';
import './ospTour';
import './documentsTour';
import './buyerTour';
import './farmProfileTour';

// Re-export registry utilities
export { getTour, getAllTours, getToursForPage } from './registry';
