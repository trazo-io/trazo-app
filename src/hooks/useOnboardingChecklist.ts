import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { RootState } from 'store';
import { useTourStore } from '../store/tourStore';
import { useUserRole } from './useUserRole';
import { useGetProductionsByFarmQuery } from '../store/api/companyApi';
import { ChecklistItem, ChecklistVariant } from '../tours/types';

/**
 * Onboarding checklist hook.
 * Writer (5-item) or Viewer (4-item) based on role.
 *
 * Writer item completion is detected from REAL DATA:
 * - Parcels: Redux state (company.establishments[].parcels)
 * - Productions: Redux state (has_current_production flag)
 * - Events/Finish/Published: RTK Query (useGetProductionsByEstablishmentQuery)
 *
 * Items are NEVER marked complete on click — only when the action is actually done.
 * Clicking an item navigates to the relevant page.
 */

const WRITER_ITEMS = [
  'add-parcel',
  'start-production',
  'document-event',
  'finish-production',
  'share-qr'
] as const;

const VIEWER_ITEMS = [
  'browse-parcels',
  'view-production',
  'check-commercial',
  'explore-education'
] as const;

export function useOnboardingChecklist() {
  const { canWrite } = useUserRole();
  const checklistDismissed = useTourStore((s) => s.checklistDismissed);
  const visitedPages = useTourStore((s) => s.visitedPages);
  const dismissChecklist = useTourStore((s) => s.dismissChecklist);

  const { farmId: urlFarmId } = useParams();

  const company = useSelector((state: RootState) => state.company?.currentCompany);
  const establishments = company?.establishments || [];

  // Resolve current farm ID
  const farmId = useMemo(() => {
    if (urlFarmId) return urlFarmId;
    return establishments[0]?.id?.toString() || '';
  }, [urlFarmId, establishments]);

  // Get first parcel of current farm
  const firstParcel = useMemo(() => {
    const est = establishments.find((e: any) => e.id?.toString() === farmId);
    return (est?.parcels || [])[0] || null;
  }, [establishments, farmId]);

  // Fetch productions for the current farm (RTK Query)
  const estIdNum = farmId ? Number(farmId) : 0;
  const { data: productions, isLoading: isLoadingProductions } = useGetProductionsByFarmQuery(
    { farmId: estIdNum },
    { skip: !estIdNum || isNaN(estIdNum) }
  );

  // Detect writer item completion from REAL data
  const writerCompletion = useMemo(() => {
    const hasParcels = establishments.some(
      (e: any) => e.parcels && e.parcels.length > 0
    );

    const allParcels = establishments.flatMap((e: any) => e.parcels || []);
    const hasProductions = allParcels.some(
      (p: any) => p.has_current_production === true
    ) || (productions && productions.length > 0);

    // From RTK Query production data
    // transparency_score > 0 implies events exist (score is calculated from events)
    const productionList = (productions as any[]) || [];
    const hasEvents = productionList.some((p) => p.transparency_score > 0);
    const hasFinished = productionList.some((p) => !!p.finish_date);
    const hasPublished = productionList.some((p) => p.published === true);

    return {
      'add-parcel': hasParcels,
      'start-production': hasProductions,
      'document-event': hasEvents,
      'finish-production': hasFinished,
      'share-qr': hasPublished
    };
  }, [establishments, productions]);

  // Build dynamic links
  const writerLinks = useMemo(() => {
    const farmPath = farmId
      ? `/admin/dashboard/farm/${farmId}`
      : '/admin/dashboard';
    const parcelPath = firstParcel
      ? `${farmPath}/parcel/${firstParcel.id}`
      : farmPath;

    return {
      'add-parcel': `${farmPath}/parcel/add`,
      'start-production': firstParcel
        ? `${parcelPath}/production/add`
        : farmPath,
      'document-event': parcelPath,
      'finish-production': parcelPath,
      'share-qr': parcelPath
    };
  }, [farmId, firstParcel]);

  const viewerLinks = useMemo(() => {
    const farmPath = farmId
      ? `/admin/dashboard/farm/${farmId}`
      : '/admin/dashboard';
    return {
      'browse-parcels': farmPath,
      'view-production': farmPath,
      'check-commercial': `${farmPath}/commercial`,
      'explore-education': '/admin/dashboard/education'
    };
  }, [farmId]);

  const variant: ChecklistVariant = canWrite ? 'writer' : 'viewer';

  const items: ChecklistItem[] = useMemo(() => {
    if (variant === 'writer') {
      return WRITER_ITEMS.map((id, i) => ({
        id,
        labelKey: `tour.checklist.writer.item${i + 1}`,
        linkTo: writerLinks[id],
        completed: writerCompletion[id] || false,
        dependsOn: i > 0 ? WRITER_ITEMS[i - 1] : undefined
      }));
    }

    return VIEWER_ITEMS.map((id, i) => ({
      id,
      labelKey: `tour.checklist.viewer.item${i + 1}`,
      linkTo: viewerLinks[id],
      completed: !!visitedPages[id]
    }));
  }, [variant, writerCompletion, writerLinks, viewerLinks, visitedPages]);

  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allComplete = completedCount === totalCount;

  const isNewEnough = useMemo(() => {
    const createdAt = company?.created_at || company?.date_joined;
    if (!createdAt) return true;
    const daysSince =
      (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 30;
  }, [company]);

  // Don't show until: company + establishment exist, API data loaded, and company is new enough
  const hasCompany = !!company && !!company.id;
  const hasEstablishments = establishments.length > 0;
  const isVisible = hasCompany && hasEstablishments && !checklistDismissed && !allComplete && isNewEnough && !isLoadingProductions;

  return {
    items,
    variant,
    completedCount,
    totalCount,
    progress,
    allComplete,
    isVisible,
    dismiss: dismissChecklist
  };
}
