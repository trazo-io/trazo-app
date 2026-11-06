import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { RootState } from 'store';
import { useTourStore } from '../store/tourStore';
import { useUserRole } from './useUserRole';
import { useGetProductionsByFarmQuery } from '../store/api/companyApi';
import { useGetOSPsQuery } from '../store/api/ospApi';
import { OSP_SECTION_KEYS } from '../types/osp';
import { ospFirstSectionWithoutTextPath } from '../views/Dashboard/OSP/ospLinks';
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
 * OFPP on file the dossier stamps itself "[DRAFT: documentation gaps listed]"
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

/**
 * Pilot checklist (Run 8b, finding 8b-02).
 *
 * A pilot's records are entered by Oscar under his own login from what the grower sends, so the
 * self-serve season walk-through (start, finish, share the QR code) is not what a pilot's setup
 * consists of. The required items are the data-backed ones a renewal needs, and each label says
 * what its completion condition in `resolveWriterCompletion` actually proves, nothing more:
 *
 *   add-parcel     any parcel on the company                  "A parcel is on file in Trazo"
 *   document-event a season on this farm with >= 1 event      "Season records are on file in Trazo"
 *   file-osp       status submitted/active, or all six        "The Organic System Plan in Trazo has
 *                  § 205.201(a) sections have text             text in all six § 205.201(a)
 *                  (sections_with_text, the OSP page's count)  sections, or has been submitted"
 *   upload-ofpp    ofpp_on_file or a plan uploaded            "A fraud prevention plan is on file"
 *
 * None of these shows that the grower reviewed anything, and no label or message says so. The
 * season walk-through items stay available under "Optional" and never count toward completion.
 */
export const PILOT_REQUIRED_ITEMS = [
  { id: 'add-parcel', dependsOn: undefined, labelKey: 'tour.checklist.pilot.parcel' },
  { id: 'document-event', dependsOn: 'add-parcel', labelKey: 'tour.checklist.pilot.records' },
  { id: 'file-osp', dependsOn: undefined, labelKey: 'tour.checklist.pilot.osp' },
  { id: 'upload-ofpp', dependsOn: undefined, labelKey: 'tour.checklist.pilot.ofpp' }
] as const;

export const PILOT_OPTIONAL_ITEMS = ['start-production', 'finish-production', 'share-qr'] as const;

/** Same expression as the farm dashboard (`views/Dashboard/Dashboard/index.tsx`). */
export function isPilotSubscription(subscription: any): boolean {
  return subscription?.plan?.slug === 'pilot' || subscription?.plan?.features?.is_pilot === true;
}

/**
 * Is this the account Trazo uses to set up a pilot farm, rather than the grower?
 *
 * The operator signs in to the grower's company to enter their records, so the pilot checklist
 * told the operator to "Send your existing records to Oscar" (pilot rehearsal 2026-10-17,
 * finding 7). Reads the membership flag (`WorksIn.is_setup_operator`, set by `provision_pilot` and
 * `add_pilot_operator`). Until 2026-10-18 this read the "(Trazo setup)" name suffix, which an
 * existing account attached as operator does not carry (review of back #176).
 */
export function isPilotSetupOperator(
  user: { companies?: { is_setup_operator?: boolean }[] } | null | undefined
) {
  return user?.companies?.[0]?.is_setup_operator === true;
}

// `check-commercial` was here until 2026-08-11. The Commercial dashboard was cut in WS-7 and
// `/commercial` folded to a redirect to farm home, so the item sent a read-only user to a page
// that no longer exists and then marked itself complete for having visited the redirect target.
// Its value (QR scans, comments) moved to the Buyer Page.
const VIEWER_ITEMS = [
  'browse-parcels',
  'view-production',
  'check-buyer-page',
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

  // Count events directly. This used to read `transparency_score > 0` as a proxy — a live
  // dependency on the metric that was retired from every UI surface 2026-08-11 and is now a
  // backend-only KPI, and one the anti-gaming rules can legitimately hold at 0 for a season
  // that DOES have events. `events_count` is on the same `carbon/productions-flat/` payload.
  const hasEvents = productionList.some((p) => (p.events_count ?? 0) > 0);
  const hasFinished = productionList.some((p) => !!p.finish_date);
  const hasPublished = productionList.some((p) => p.published === true);

  // Certifier prerequisites, scoped to the farm being viewed (not "any farm"): the audit export
  // is generated per production, so a plan filed on a different farm does not unblock this
  // one's dossier.
  const currentEst = establishments.find((e: any) => e.id?.toString() === farmId);
  // "File your Organic System Plan" — filed, not merely STARTED. This was `osps.length > 0`,
  // so clicking "Start my OSP" (which POSTs an empty draft shell) ticked the item and moved the
  // checklist to 6 of 7 while the OSP had 0 of 19 modules answered and the readiness card on the
  // farm home still read "No Organic System Plan on file". Two surfaces, opposite claims, same
  // instant — and the one that congratulated the grower was the wrong one. An empty draft is
  // exactly what this item is asking them to go fill in.
  //
  // "Has text" is the OSP page's meaning: `sections_with_text`, the submit gate's rule. This read
  // `section_completion >= 1` until 2026-10-17, which counts any non-blank narrative, so one
  // character in each section ticked the item while the OSP page said "0 of 6 narrative sections
  // have text" and submit refused the plan. The fallback covers a backend that predates the field.
  const hasOsp = ((osps as any[]) || []).some(
    (o: any) =>
      o?.status === 'submitted' ||
      o?.status === 'active' ||
      (typeof o?.sections_with_text === 'number'
        ? o.sections_with_text >= OSP_SECTION_KEYS.length
        : (o?.section_completion ?? 0) >= 1)
  );
  // ofpp_on_file = clean upload OR completed OSP module G2.0 (one backend
  // truth); the raw upload flag alone left this item unchecked forever for
  // farmers who authored the plan in the module.
  const hasOfpp =
    currentEst?.ofpp_on_file === true || currentEst?.fraud_prevention_plan_uploaded === true;

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

/**
 * "{n} of 6 narrative sections have text" for the OSP item while it is open: the latest version's
 * count, in the OSP page's own words (`osp.completion.sectionsOfTotal`), so the two surfaces show
 * the same number. Null when there is no plan yet or the backend sends no count.
 */
export function resolveOspSectionDetail(osps?: any[]): ChecklistItem['detail'] | null {
  const latest = ((osps as any[]) || []).reduce(
    (best: any, o: any) =>
      !best || (o?.version_number ?? 0) > (best.version_number ?? 0) ? o : best,
    null
  );
  if (typeof latest?.sections_with_text !== 'number') return null;
  return {
    id: 'osp.completion.sectionsOfTotal',
    values: { complete: latest.sections_with_text, total: OSP_SECTION_KEYS.length }
  };
}

/**
 * What the completed pilot panel should do with the farm's activity count (2026-11-06): note
 * the count the first time setup is seen complete, then dismiss once one more activity exists.
 */
export function completedPilotPanelAction(args: {
  pilotStepsComplete: boolean;
  dismissed: boolean;
  loaded: boolean;
  baseline: number | null;
  activityCount: number;
}): 'set-baseline' | 'dismiss' | null {
  const { pilotStepsComplete, dismissed, loaded, baseline, activityCount } = args;
  if (!pilotStepsComplete || dismissed || !loaded) return null;
  if (baseline == null) return 'set-baseline';
  return activityCount > baseline ? 'dismiss' : null;
}

export function useOnboardingChecklist() {
  const { canWrite } = useUserRole();
  const checklistDismissed = useTourStore((s) => s.checklistDismissed);
  const checklistCompleted = useTourStore((s) => s.checklistCompleted);
  const markChecklistCompleted = useTourStore((s) => s.markChecklistCompleted);
  // Dismissed or already complete: the widget cannot render, so its two requests must not fire.
  // Before 2026-09-06 they did, on EVERY admin page load, for every established farm.
  const checklistSettled = checklistDismissed || checklistCompleted;
  const visitedPages = useTourStore((s) => s.visitedPages);
  const dismissChecklist = useTourStore((s) => s.dismissChecklist);

  const { farmId: urlFarmId } = useParams();

  const company = useSelector((state: RootState) => state.company?.currentCompany);
  const currentUser = useSelector((state: RootState) => (state as any).userState?.user);
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
  // A pilot whose steps are complete still shows "These setup steps are complete" until the
  // farm's first activity is logged (Oscar, 2026-11-06), so their seasons keep loading until
  // then. Once an activity is seen the panel dismisses itself (below) and the request stops.
  const pilotPlan = canWrite && isPilotSubscription(company?.subscription);
  const awaitingFirstActivity = pilotPlan && checklistCompleted && !checklistDismissed;
  const { data: productions, isLoading: isLoadingProductions } = useGetProductionsByFarmQuery(
    { farmId: estIdNum },
    { skip: (checklistSettled && !awaitingFirstActivity) || !estIdNum || isNaN(estIdNum) }
  );

  // OSP existence for the current farm. Same "completed only from real data" rule as the season
  // items — filing is detected, never inferred from a click. Skipped for read-only roles, whose
  // checklist is the viewer variant and never reads this: firing it anyway would be a request
  // per dashboard load for a result nothing consumes.
  // OSPScope declares both ids as strings (they are interpolated straight into the URL).
  const { data: osps } = useGetOSPsQuery(
    { companyId: String(company?.id ?? ''), farmId: String(estIdNum) },
    { skip: checklistSettled || !canWrite || !company?.id || !estIdNum || isNaN(estIdNum) }
  );

  // Detect writer item completion from REAL data
  const writerCompletion = useMemo(
    () => resolveWriterCompletion({ establishments, productions, osps, farmId }),
    [establishments, productions, osps, farmId]
  );

  const ospSectionDetail = useMemo(() => resolveOspSectionDetail(osps), [osps]);

  // Build dynamic links
  const writerLinks = useMemo(() => {
    const farmPath = farmId ? `/admin/dashboard/farm/${farmId}` : '/admin/dashboard';
    const parcelPath = firstParcel ? `${farmPath}/parcel/${firstParcel.id}` : farmPath;

    return {
      'add-parcel': `${farmPath}/parcel/add`,
      'start-production': firstParcel ? `${parcelPath}/production/add` : farmPath,
      'document-event': parcelPath,
      'finish-production': parcelPath,
      'share-qr': parcelPath,
      // A plan short of text opens on the section it is short of (the same count the item shows);
      // with no plan yet, the module list is where one starts.
      'file-osp': ospSectionDetail ? ospFirstSectionWithoutTextPath(farmPath) : `${farmPath}/osp`,
      // The OFPP uploader is the "SOE Compliance" card on the farm profile.
      'upload-ofpp': `${farmPath}/profile`
    };
  }, [farmId, firstParcel, ospSectionDetail]);

  const viewerLinks = useMemo(() => {
    const farmPath = farmId ? `/admin/dashboard/farm/${farmId}` : '/admin/dashboard';
    return {
      'browse-parcels': farmPath,
      'view-production': farmPath,
      'check-buyer-page': `${farmPath}/buyer`,
      'explore-education': '/admin/dashboard/education'
    };
  }, [farmId]);

  const variant: ChecklistVariant = canWrite ? 'writer' : 'viewer';
  // The pilot list replaces the writer list only. A read-only member keeps the viewer list.
  const isPilot = variant === 'writer' && isPilotSubscription(company?.subscription);

  const items: ChecklistItem[] = useMemo(() => {
    // Only an open item carries the count; a ticked one says nothing more.
    const withDetail = (item: ChecklistItem): ChecklistItem =>
      item.id === 'file-osp' && !item.completed && ospSectionDetail
        ? { ...item, detail: ospSectionDetail }
        : item;
    if (variant === 'writer' && isPilot) {
      return PILOT_REQUIRED_ITEMS.map(({ id, dependsOn, labelKey }) =>
        withDetail({
          id,
          labelKey,
          linkTo: writerLinks[id],
          completed: writerCompletion[id] || false,
          dependsOn
        })
      );
    }
    if (variant === 'writer') {
      return WRITER_ITEMS.map(({ id, dependsOn }, i) =>
        withDetail({
          id,
          labelKey: `tour.checklist.writer.item${i + 1}`,
          linkTo: writerLinks[id],
          completed: writerCompletion[id] || false,
          dependsOn
        })
      );
    }

    return VIEWER_ITEMS.map((id, i) => ({
      id,
      labelKey: `tour.checklist.viewer.item${i + 1}`,
      linkTo: viewerLinks[id],
      completed: !!visitedPages[id]
    }));
  }, [
    variant,
    isPilot,
    writerCompletion,
    writerLinks,
    viewerLinks,
    visitedPages,
    ospSectionDetail
  ]);

  // Shown under "Optional" for pilots; never counted. Labels and order as on the writer list.
  const optionalItems: ChecklistItem[] = useMemo(() => {
    if (!isPilot) return [];
    return PILOT_OPTIONAL_ITEMS.map((id) => {
      const index = WRITER_ITEMS.findIndex((item) => item.id === id);
      return {
        id,
        labelKey: `tour.checklist.writer.item${index + 1}`,
        linkTo: writerLinks[id],
        completed: writerCompletion[id] || false,
        dependsOn: WRITER_ITEMS[index].dependsOn
      };
    });
  }, [isPilot, writerCompletion, writerLinks]);

  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allComplete = completedCount === totalCount;

  // Remember completion so later loads skip the data requests entirely. Writer items are judged
  // from fetched data, so only a loaded answer may set the flag; viewer items come from visited
  // pages and need no data.
  useEffect(() => {
    if (!allComplete || checklistCompleted) return;
    if (variant === 'writer' && productions === undefined) return;
    markChecklistCompleted();
  }, [allComplete, checklistCompleted, variant, productions, markChecklistCompleted]);

  /**
   * ⚠️ THE 30-DAY EXPIRY IS NOT IN FORCE, and cannot be from here.
   *
   * Neither field exists on the payload: `RetrieveCompanySerializer` (company/serializers.py)
   * ships no `created_at` and no `date_joined`, which is exactly why tsc flagged both reads.
   * So `createdAt` is always undefined, the guard returns `true`, and the checklist's only
   * real exits are "all items complete" and "dismissed". Documented rather than removed
   * because the intended rule is sound — it needs a signup date on the API to work, and until
   * then pretending it fires would be worse than saying it does not.
   *
   * Same missing field, same day: `useMilestones` used to read it and treat "unknown" as
   * "signed up today".
   */
  const isNewEnough = useMemo(() => {
    const createdAt = (company as any)?.created_at || (company as any)?.date_joined;
    if (!createdAt) return true;
    const daysSince = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 30;
  }, [company]);

  // Don't show until: company + establishment exist, API data loaded, and company is new enough
  const hasCompany = !!company && !!company.id;
  const hasEstablishments = establishments.length > 0;
  // A pilot whose required items are done sees "These setup steps are complete" until they
  // dismiss it, instead of the panel vanishing. `markChecklistCompleted` still runs (above), so
  // later loads skip the data requests and show only that line; a self-serve writer's panel
  // still hides on completion as before.
  const pilotStepsComplete = isPilot && (allComplete || checklistCompleted);

  // The completed pilot panel stays until the farm logs its first activity AFTER setup, then
  // goes for good (Oscar, 2026-11-06: "hide it after the first activity"). Not "any activity":
  // logging records is one of the four required pilot steps, so every completed pilot already
  // has some, and the Run 8b sentence would never show. The count at completion is the
  // baseline; one more is the trigger. `dismissChecklist` is persisted.
  const activityCount = useMemo(
    () => ((productions as any[]) || []).reduce((n, p) => n + (p?.events_count ?? 0), 0),
    [productions]
  );
  // Per farm: activityCount comes from the routed farm's productions, so the baseline it is
  // compared against must be that farm's own (review of #297).
  const baseline = useTourStore((s) =>
    farmId ? s.checklistActivityBaselines?.[farmId] ?? null : null
  );
  const setBaseline = useTourStore((s) => s.setChecklistActivityBaseline);
  useEffect(() => {
    const action = completedPilotPanelAction({
      pilotStepsComplete,
      dismissed: checklistDismissed,
      loaded: !!farmId && !isLoadingProductions && !!productions,
      baseline,
      activityCount
    });
    if (action === 'set-baseline' && farmId) setBaseline(farmId, activityCount);
    if (action === 'dismiss') dismissChecklist();
  }, [
    pilotStepsComplete,
    checklistDismissed,
    isLoadingProductions,
    productions,
    activityCount,
    baseline,
    setBaseline,
    dismissChecklist,
    farmId
  ]);
  const isVisible =
    hasCompany &&
    hasEstablishments &&
    !checklistDismissed &&
    (pilotStepsComplete || (!checklistCompleted && !allComplete)) &&
    isNewEnough &&
    !isLoadingProductions;

  return {
    items,
    optionalItems,
    isPilot,
    isSetupOperator: isPilot && isPilotSetupOperator(currentUser),
    pilotStepsComplete,
    variant,
    completedCount,
    totalCount,
    progress,
    allComplete,
    isVisible,
    dismiss: dismissChecklist
  };
}
