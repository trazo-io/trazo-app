/**
 * Tour initialization — import this file to register all tour definitions.
 * Import once in the app entry point (e.g., TourProvider or Admin layout).
 */

// Welcome tours (one per scenario)
import './welcomeTourFresh';
import './welcomeTourInvited';
import './welcomeTourViewer';

// Feature discovery tours
import './farmProfileTour';
import './parcelTour';
import './productionTour';
import './commercialTour';
import './transparencyTour';

// Re-export registry utilities
export { getTour, getAllTours, getToursForPage } from './registry';
