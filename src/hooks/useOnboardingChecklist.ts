import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { RootState } from 'store';
import { useTourStore } from '../store/tourStore';
import { useUserRole } from './useUserRole';
import { useGetProductionsByFarmQuery } from '../store/api/companyApi';
import { useGetOSPsQuery } from '../store/api/ospApi';
import { ChecklistItem, ChecklistVariant } from '../tours/types';

/**
 * Onboarding checklist hook.
 * Writer (7-item) or Viewer (4-item) based on role.
 *
 * Writer item completion is detected from REAL DATA:
 * - Parcels: Redux state (company.establishments[].parcels)
 * - Productions: Redux state (has_current_production flag)
 * - Events/Finish/Published: RTK Query (useGetProductionsByFarmQuery)
 * - OSP: RTK Query (useGetOSPsQuery); OFPP: the establishment's fraud_prevention_plan_uploaded
 *
 * Items are NEVER marked complete on click — only when the action is actually done.
 * Clicking an item navigates to the relevant page.
 */

/**
 * Writer checklist.
 *
 * `dependsOn` is declared per item rather than chained to the previous one. The season items
 * are genuinely sequential (you cannot log an event before starting a production), but the two
 * certifier items are not: an Organic System Plan and a Fraud Prevention Plan can — and under
 * § 205.201 should — be filed before a single event is logged. Chaining them behind "Share your
 * QR code" would have hidden them behind the whole season.
 *
 * They are on this list because the audit export refuses to be submitted without them: with no
 * OFPP on file the dossier stamps itself "[NON-COMPLIANT DOSSIER — DO NOT SUBMIT TO CERTIFIER]"
 * and page 1 reports the OSP as a GAP. Before this, a farmer could finish all five season items,
 * see "You're all set!", and still hold a packet their certifier will not accept — with nothing
 * anywhere in the product telling them why.
 */
export const WRITER_ITEMS = [
  { id: 'add-parcel', dependsOn: undefined },
  { id: 'start-production', dependsOn: 'add-parcel' },
  { id: 'document-event', dependsOn: 'start-production' },
  { id: 'finish-production', dependsOn: 'document-event' },
  { id: 'share-qr', dependsOn: 'finish-production' },
  { id: 'file-osp', dependsOn: undefined },
  { id: 'upload-ofpp', dependsOn: undefined }
] as const;

const VIEWER_ITEMS = [
  'browse-parcels',
  'view-production',
  'check-commercial',
  'explore-education'
] as const;

/**
 * Which writer checklist items are done, computed from real data only.
 *
 * Exported and pure so the completion rules can be pinned by tests without standing up
 * Redux + RTK Query: these booleans decide whether a grower is told their certifier packet
 * is incomplete, so a silent regression here is the kind that only surfaces at an inspection.
 */
export function resolveWriterCompletion({
  establishments = [],
  productions,
  osps,
  farmId
}: {
  establishments?: any[];
  productions?: any[];
  osps?: any[];
  farmId?: string;
}): Record<string, boolean> {
  const hasParcels = establishments.some((e: any) => e.parcels && e.parcels.length > 0);

  const allParcels = establishments.flatMap((e: any) => e.parcels || []);
  const productionList = (productions as any[]) || [];
  const hasProductions =
    allParcels.some((p: any) => p.has_current_production === true) || productionList.length > 0;

  // transparency_score > 0 implies events exist (the score is calculated from events)
  const hasEvents = productionList.some((p) => p.transparency_score > 0);
  const hasFinished = productionList.some((p) => !!p.finish_date);
  const hasPublished = productionList.some((p) => p.published === true);

  // Certifier prerequisites, scoped to the farm being viewed (not "any farm"): the audit export
  // is generated per production, so a plan filed on a different farm does not unblock this
  // one's dossier.
  const currentEst = establishments.find((e: any) => e.id?.toString() === farmId);
  const hasOsp = ((osps as any[]) || []).length > 0;
  const hasOfpp = currentEst?.fraud_prevention_plan_uploaded === true;

  return {
    'add-parcel': hasParcels,
    'start-production': hasProductions,
    'document-event': hasEvents,
    'finish-production': hasFinished,
    'share-qr': hasPublished,
    'file-osp': hasOsp,
    'upload-ofpp': hasOfpp
  };
}

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

  // OSP existence for the current farm. Same "completed only from real data" rule as the season
  // items — filing is detected, never inferred from a click. Skipped for read-only roles, whose
  // checklist is the viewer variant and never reads this: firing it anyway would be a request
  // per dashboard load for a result nothing consumes.
  // OSPScope declares both ids as strings (they are interpolated straight into the URL).
  const { data: osps } = useGetOSPsQuery(
    { companyId: String(company?.id ?? ''), farmId: String(estIdNum) },
    { skip: !canWrite || !company?.id || !estIdNum || isNaN(estIdNum) }
  );

  // Detect writer item completion from REAL data
  const writerCompletion = useMemo(
    () => resolveWriterCompletion({ establishments, productions, osps, farmId }),
    [establishments, productions, osps, farmId]
  );

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
      'share-qr': parcelPath,
      'file-osp': `${farmPath}/osp`,
      // The OFPP uploader is the "SOE Compliance" card on the farm profile.
      'upload-ofpp': `${farmPath}/profile`
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
      return WRITER_ITEMS.map(({ id, dependsOn }, i) => ({
        id,
        labelKey: `tour.checklist.writer.item${i + 1}`,
        linkTo: writerLinks[id],
        completed: writerCompletion[id] || false,
        dependsOn
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
