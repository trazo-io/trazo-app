import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import { useTourStore } from '../store/tourStore';
import { useGetProductionsByFarmQuery } from '../store/api/companyApi';
import { MilestoneDefinition } from '../tours/types';

/**
 * Milestone definitions — the aha moments that are actually DETECTABLE here.
 *
 * Was four. `first-scan` and `first-review` were removed 2026-08-16: both had
 * `achieved: false` hardcoded with an "Enhanced in Phase 7" comment, so neither had ever
 * fired, and `first-review` celebrated the consumer-review product that was retired
 * 2026-08-06 (§10.5, November demolition list) — a celebration for a flow with no writer.
 * Shipping copy for an event that cannot happen is worse than having no milestone: it
 * survives every audit because nothing ever renders it.
 *
 * `actionPath` carries a `:farmId` placeholder, resolved per-farm below. It used to be the
 * bare `/admin/dashboard` on all four, which after the October nav restructure dropped the
 * grower on the generic home instead of the surface the copy names.
 */
const MILESTONES: MilestoneDefinition[] = [
  {
    id: 'first-event',
    titleKeyEarly: 'tour.milestone.firstEvent.titleEarly',
    titleKeyLate: 'tour.milestone.firstEvent.titleLate',
    bodyKeyEarly: 'tour.milestone.firstEvent.bodyEarly',
    bodyKeyLate: 'tour.milestone.firstEvent.bodyLate',
    actionKey: 'tour.milestone.firstEvent.action',
    actionPath: '/admin/dashboard/farm/:farmId/activities',
    pattern: 'toast'
  },
  {
    id: 'first-finish',
    titleKeyEarly: 'tour.milestone.firstFinish.titleEarly',
    titleKeyLate: 'tour.milestone.firstFinish.titleLate',
    bodyKeyEarly: 'tour.milestone.firstFinish.bodyEarly',
    bodyKeyLate: 'tour.milestone.firstFinish.bodyLate',
    actionKey: 'tour.milestone.firstFinish.action',
    actionPath: '/admin/dashboard/farm/:farmId/buyer',
    pattern: 'modal',
    confetti: true
  }
];

type MilestoneId = (typeof MILESTONES)[number]['id'];

/** True once every milestone has been celebrated — nothing left to detect, so the productions
    request that feeds detection can be skipped (it fired on every admin page load before
    2026-09-06). */
export function allMilestonesCelebrated(celebrated: Record<string, string>): boolean {
  return MILESTONES.every((milestone) => !!celebrated[milestone.id]);
}

/**
 * Which milestones the farm's productions say are done.
 *
 * Reads `carbon/productions-flat/` rows — the same fields, from the same payload, that
 * `resolveWriterCompletion` uses for the onboarding checklist, so the two surfaces cannot
 * disagree about whether a farm has logged an activity.
 */
export function resolveAchievedMilestones(productions?: any[]): Record<MilestoneId, boolean> {
  const list = productions ?? [];
  return {
    'first-event': list.some((p) => (p?.events_count ?? 0) > 0),
    'first-finish': list.some((p) => !!p?.finish_date)
  };
}

/**
 * The one milestone to celebrate now, with its destination resolved — or null.
 *
 * Pure and exported so the rules can be pinned by tests: `suppressed` is the baseline (things
 * already true when this browser first saw the data, which are history and not events), and
 * only one celebration is offered at a time.
 */
export function pickCelebration({
  achieved,
  celebrated,
  suppressed,
  farmId
}: {
  achieved: Record<string, boolean>;
  celebrated: Record<string, string>;
  suppressed: Set<string>;
  farmId: string;
}): MilestoneDefinition | null {
  for (const milestone of MILESTONES) {
    if (suppressed.has(milestone.id)) continue;
    if (!achieved[milestone.id] || celebrated[milestone.id]) continue;
    return {
      ...milestone,
      // The modal navigates to `actionPath` verbatim, and a literal ":farmId" in the URL is a
      // 404 dressed as a celebration.
      actionPath: farmId ? milestone.actionPath.replace(':farmId', farmId) : '/admin/dashboard'
    };
  }
  return null;
}

/**
 * Watches Redux state for milestone triggers.
 * Returns the milestone to celebrate (if any) and methods to dismiss.
 */
export function useMilestones() {
  const celebratedMilestones = useTourStore((s) => s.celebratedMilestones);
  const celebrateMilestone = useTourStore((s) => s.celebrateMilestone);
  const allCelebrated = useMemo(
    () => allMilestonesCelebrated(celebratedMilestones),
    [celebratedMilestones]
  );
  const [activeMilestone, setActiveMilestone] = useState<MilestoneDefinition | null>(null);

  // Company data for detecting milestones
  const company = useSelector((state: RootState) => state.company?.currentCompany);
  const establishments = company?.establishments || [];

  /**
   * The farm these milestones are about, and the one their action button opens. Redux holds
   * the company's establishments; the first is the same fallback the onboarding checklist uses
   * when there is no `:farmId` in the URL (this hook runs in the Admin LAYOUT, which sits above
   * the `:farmId` route segment, so `useParams` would not see it either).
   */
  const farmId = useMemo(() => establishments[0]?.id?.toString() ?? '', [establishments]);

  /**
   * Productions for that farm — the same `carbon/productions-flat/` query the onboarding
   * checklist runs, with the same args, so RTK Query serves both from one request.
   *
   * ⚠️ THIS USED TO READ REDUX AND COULD NEVER FIRE. It walked
   * `establishments[].parcels[].productions[]` — but establishments are serialised with
   * `ParcelBasicSerializer` (product/serializers.py), whose field list has **no `productions`
   * key at all**. So `allProductions` was always `[]`, `hasEvents`/`hasFinished` were always
   * false, and the entire milestone layer was as dead as the two milestones deleted on
   * 2026-08-16 for being hardcoded `false` — it just took reading the serializer to see it.
   * `events_count` / `finish_date` are the same fields `resolveWriterCompletion` uses.
   */
  const farmIdNum = farmId ? Number(farmId) : 0;
  const { data: productions } = useGetProductionsByFarmQuery(
    { farmId: farmIdNum },
    { skip: allCelebrated || !farmIdNum || Number.isNaN(farmIdNum) }
  );

  // Compute which milestones are now achieved
  const achieved = useMemo(
    () => resolveAchievedMilestones(productions as any[] | undefined),
    [productions]
  );

  /**
   * Days since signup, or null when the client cannot know.
   *
   * Nothing in the company payload carries a signup date — `RetrieveCompanySerializer` has no
   * `created_at`/`date_joined` (which is also why tsc flags those two property reads). This
   * used to fall back to `0`, i.e. "signed up today", so a farm with twenty seasons on file was
   * told "Your transparency journey has begun" the first time it logged anything. Unknown now
   * means unknown, and the copy falls to the neutral later-stage wording rather than claiming
   * something about the account that we did not measure.
   */
  const daysSinceSignup = useMemo<number | null>(() => {
    const createdAt = (company as any)?.created_at || (company as any)?.date_joined;
    if (!createdAt) return null;
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  }, [company]);

  /**
   * Milestones that were ALREADY true the first time this browser saw the data are recorded
   * silently, never celebrated.
   *
   * This layer had never fired, so every existing account has an empty `celebratedMilestones`.
   * Without a baseline, wiring it up would greet a pilot farm with twenty seasons on file with
   * a toast and a confetti modal about its "first" activity — celebrating history it logged
   * months ago. A milestone is a transition, so only a transition observed while the app is
   * open counts; anything already done when we arrive is just the starting state.
   */
  const baselineTaken = useRef(false);
  const baselineIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (baselineTaken.current || productions === undefined) return;
    baselineTaken.current = true;

    for (const milestone of MILESTONES) {
      if (achieved[milestone.id as keyof typeof achieved] && !celebratedMilestones[milestone.id]) {
        // Recorded in a ref as well as the store: both effects run in the same commit, so the
        // transition effect below would otherwise still see the pre-update `celebratedMilestones`
        // and schedule a celebration for history. Its 1s timer would be cleared by the next
        // render — correct by accident, and only for as long as that delay exists.
        baselineIds.current.add(milestone.id);
        celebrateMilestone(milestone.id);
      }
    }
    // Runs once, on the first render that has real data. `achieved`/`celebratedMilestones` are
    // read at that instant on purpose — later changes are transitions, which is the other
    // effect's job.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productions]);

  // Check for new milestones to celebrate
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | null = null;
    // Nothing can be a transition until we know where we started.
    if (!baselineTaken.current) return;

    const next = pickCelebration({
      achieved,
      celebrated: celebratedMilestones,
      suppressed: baselineIds.current,
      farmId
    });

    if (next) {
      timerId = setTimeout(() => setActiveMilestone(next), 1000);
    }

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [achieved, celebratedMilestones, farmId]);

  const dismissMilestone = useCallback(() => {
    if (activeMilestone) {
      celebrateMilestone(activeMilestone.id);
      setActiveMilestone(null);
    }
  }, [activeMilestone, celebrateMilestone]);

  return {
    activeMilestone,
    daysSinceSignup,
    dismissMilestone
  };
}
