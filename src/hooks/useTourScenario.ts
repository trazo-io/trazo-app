import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { useUserRole } from './useUserRole';
import { TourScenario } from '../tours/types';
import { RootState } from 'store';

/**
 * Detects which tour scenario applies to the current user.
 *
 * Scenarios:
 * A (fresh-signup): canWrite + no parcels → new Admin with empty company
 * B (invited-writer): canWrite + (isCompanyJoin || hasParcels) → invited Admin/Manager
 * C/D (viewer): isViewer → read-only user
 *
 * Returns the scenario and the appropriate welcome tour ID.
 */
export function useTourScenario(): {
  scenario: TourScenario;
  welcomeTourId: string;
} {
  const { canWrite, isViewer } = useUserRole();
  const location = useLocation();

  const establishments = useSelector(
    (state: RootState) => state.company?.currentCompany?.establishments
  );

  const searchParams = new URLSearchParams(location.search);
  const isCompanyJoin = searchParams.get('company_join') === 'true';

  const hasParcels = useMemo(() => {
    if (!establishments || establishments.length === 0) return false;
    return establishments.some((e: any) => e.parcels && e.parcels.length > 0);
  }, [establishments]);

  const scenario: TourScenario = useMemo(() => {
    if (isViewer) return 'viewer';
    if (canWrite && (isCompanyJoin || hasParcels)) return 'invited-writer';
    return 'fresh-signup';
  }, [isViewer, canWrite, isCompanyJoin, hasParcels]);

  const welcomeTourId = useMemo(() => {
    switch (scenario) {
      case 'viewer':
        return 'welcome-viewer';
      case 'invited-writer':
        return 'welcome-invited';
      case 'fresh-signup':
      default:
        return 'welcome-fresh';
    }
  }, [scenario]);

  return { scenario, welcomeTourId };
}
