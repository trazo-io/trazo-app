import { useEffect, useMemo } from 'react';
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
 *                  § 205.201(a) sections have narrative        text in all six § 205.201(a)
 *                  (section_completion >= 1)                   sections, or has been submitted"
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
 * The last-name suffix every pilot operator account carries. Mirrors `SETUP_SUFFIX` in
 * trazo-back `subscriptions/pilot_operator.py`: `provision_pilot` and `add_pilot_operator` create
 * the operator as "<first> <last> (Trazo setup)" through `operator_last_name`, which always
 * appends it, so the audit trail names the setup account. Pinned by a parity test.
 */
export const PILOT_OPERATOR_LAST_NAME_SUFFIX = '(Trazo setup)';

/**
 * Is this the account Trazo uses to set up a pilot farm, rather than the grower?
 *
 * The operator signs in to the grower's company to enter their records, so the pilot checklist
 * told the operator to "Send your existing records to Oscar" (pilot rehearsal 2026-10-17,
 * finding 7). The payload carries no role or flag for this account; the suffix is the one
 * signal the backend always writes.
 */
export function isPilotSetupOperator(user: { last_name?: string | null } | null | undefined) {
  return (user?.last_name || '').trim().endsWith(PILOT_OPERATOR_LAST_NAME_SUFFIX);
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
  const hasOsp = ((osps as any[]) || []).some(
    (o: any) =>
      o?.status === 'submitted' || o?.status === 'active' || (o?.section_completion ?? 0) >= 1
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
  const { data: productions, isLoading: isLoadingProductions } = useGetProductionsByFarmQuery(
    { farmId: estIdNum },
    { skip: checklistSettled || !estIdNum || isNaN(estIdNum) }
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
      'file-osp': `${farmPath}/osp`,
      // The OFPP uploader is the "SOE Compliance" card on the farm profile.
      'upload-ofpp': `${farmPath}/profile`
    };
  }, [farmId, firstParcel]);

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
    if (variant === 'writer' && isPilot) {
      return PILOT_REQUIRED_ITEMS.map(({ id, dependsOn, labelKey }) => ({
        id,
        labelKey,
        linkTo: writerLinks[id],
        completed: writerCompletion[id] || false,
        dependsOn
      }));
    }
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
  }, [variant, isPilot, writerCompletion, writerLinks, viewerLinks, visitedPages]);

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
