import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import { useTourStore } from '../store/tourStore';
import { MilestoneDefinition } from '../tours/types';

/**
 * Milestone definitions — 4 key aha moments.
 */
const MILESTONES: MilestoneDefinition[] = [
  {
    id: 'first-event',
    titleKeyEarly: 'tour.milestone.firstEvent.titleEarly',
    titleKeyLate: 'tour.milestone.firstEvent.titleLate',
    bodyKeyEarly: 'tour.milestone.firstEvent.bodyEarly',
    bodyKeyLate: 'tour.milestone.firstEvent.bodyLate',
    actionKey: 'tour.milestone.firstEvent.action',
    actionPath: '/admin/dashboard',
    pattern: 'toast'
  },
  {
    id: 'first-finish',
    titleKeyEarly: 'tour.milestone.firstFinish.titleEarly',
    titleKeyLate: 'tour.milestone.firstFinish.titleLate',
    bodyKeyEarly: 'tour.milestone.firstFinish.bodyEarly',
    bodyKeyLate: 'tour.milestone.firstFinish.bodyLate',
    actionKey: 'tour.milestone.firstFinish.action',
    actionPath: '/admin/dashboard',
    pattern: 'modal',
    confetti: true
  },
  {
    id: 'first-scan',
    titleKeyEarly: 'tour.milestone.firstScan.titleEarly',
    titleKeyLate: 'tour.milestone.firstScan.titleLate',
    bodyKeyEarly: 'tour.milestone.firstScan.bodyEarly',
    bodyKeyLate: 'tour.milestone.firstScan.bodyLate',
    actionKey: 'tour.milestone.firstScan.action',
    actionPath: '/admin/dashboard',
    pattern: 'toast'
  },
  {
    id: 'first-review',
    titleKeyEarly: 'tour.milestone.firstReview.titleEarly',
    titleKeyLate: 'tour.milestone.firstReview.titleLate',
    bodyKeyEarly: 'tour.milestone.firstReview.bodyEarly',
    bodyKeyLate: 'tour.milestone.firstReview.bodyLate',
    actionKey: 'tour.milestone.firstReview.action',
    actionPath: '/admin/dashboard',
    pattern: 'modal'
  }
];

/**
 * Watches Redux state for milestone triggers.
 * Returns the milestone to celebrate (if any) and methods to dismiss.
 */
export function useMilestones() {
  const celebratedMilestones = useTourStore((s) => s.celebratedMilestones);
  const celebrateMilestone = useTourStore((s) => s.celebrateMilestone);
  const [activeMilestone, setActiveMilestone] = useState<MilestoneDefinition | null>(null);

  // Company data for detecting milestones
  const company = useSelector((state: RootState) => state.company?.currentCompany);
  const establishments = company?.establishments || [];

  // Compute which milestones are now achieved
  const achieved = useMemo(() => {
    const allParcels = establishments.flatMap((e: any) => e.parcels || []);
    const allProductions = allParcels.flatMap((p: any) => p.productions || []);

    const hasEvents = allProductions.some(
      (prod: any) => prod.events && prod.events.length > 0
    );
    const hasFinished = allProductions.some(
      (prod: any) => prod.finish_date || prod.finishDate
    );
    // Scan and review detection would require API data — for now these are
    // triggered when the commercial dashboard shows scan/review data
    // This can be enhanced later with RTK Query subscriptions

    return {
      'first-event': hasEvents,
      'first-finish': hasFinished,
      'first-scan': false, // Enhanced in Phase 7 with API data
      'first-review': false // Enhanced in Phase 7 with API data
    };
  }, [establishments]);

  // Days since signup for time-aware copy
  const daysSinceSignup = useMemo(() => {
    const createdAt = company?.created_at || company?.date_joined;
    if (!createdAt) return 0;
    return Math.floor(
      (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
  }, [company]);

  // Check for new milestones to celebrate
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | null = null;

    for (const milestone of MILESTONES) {
      const isAchieved = achieved[milestone.id as keyof typeof achieved];
      const alreadyCelebrated = !!celebratedMilestones[milestone.id];

      if (isAchieved && !alreadyCelebrated) {
        timerId = setTimeout(() => {
          setActiveMilestone(milestone);
        }, 1000);
        break; // Only celebrate one milestone at a time
      }
    }

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [achieved, celebratedMilestones]);

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
