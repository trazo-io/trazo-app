/**
 * Product Tour System - Type Definitions
 *
 * Supports 4 first-login scenarios:
 * A: Fresh signup (Admin, empty company)
 * B: Invited writer (Admin/Manager, existing data)
 * C: Invited viewer (read-only)
 * D: Code join (always Viewer)
 */

// Tour scenario detection
export type TourScenario = 'fresh-signup' | 'invited-writer' | 'viewer';

// Tour step definition — all text via i18n keys
export interface TourStep {
  /** CSS selector using data-tour attribute, e.g. [data-tour="smart-usage-card"] */
  target: string;
  /** react-intl message ID for step title */
  titleKey: string;
  /** react-intl message ID for step content */
  contentKey: string;
  /** Tooltip placement relative to target */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  /** Allow clicking the highlighted element */
  spotlightClicks?: boolean;
  /** Skip the beacon, show tooltip directly */
  disableBeacon?: boolean;
  /** Only show this step if user has specific roles */
  requiredRoles?: UserRole[];
}

export type UserRole = 'admin' | 'manager' | 'viewer';

// Tour trigger conditions
export type TourTrigger =
  | { type: 'first-visit'; page: string }
  | { type: 'first-action'; action: string }
  | { type: 'manual' };

// Complete tour definition
export interface TourDefinition {
  /** Unique tour identifier */
  id: string;
  /** Ordered list of steps */
  steps: TourStep[];
  /** When this tour should auto-trigger */
  trigger: TourTrigger;
  /** Which scenario this tour belongs to */
  scenario?: TourScenario;
  /** Lower number = higher priority when multiple tours could trigger */
  priority: number;
  /** Increment to re-show an updated tour to users who completed a previous version */
  version: number;
}

// Onboarding checklist item
export interface ChecklistItem {
  id: string;
  /** react-intl message ID for item label */
  labelKey: string;
  /** Navigation path when item is clicked */
  linkTo: string;
  /** Whether this item is completed */
  completed: boolean;
  /** ISO date string when completed */
  completedAt?: string;
  /** ID of checklist item that must be completed first (for writer checklist) */
  dependsOn?: string;
}

export type ChecklistVariant = 'writer' | 'viewer';

// Milestone celebration
export interface MilestoneDefinition {
  id: string;
  /** react-intl key for title (day 1-7 variant) */
  titleKeyEarly: string;
  /** react-intl key for title (week 2+ variant) */
  titleKeyLate: string;
  /** react-intl key for body text (day 1-7) */
  bodyKeyEarly: string;
  /** react-intl key for body text (week 2+) */
  bodyKeyLate: string;
  /** react-intl key for primary action button */
  actionKey: string;
  /** Navigation path for primary action */
  actionPath: string;
  /** 'modal' for big wins, 'toast' for smaller ones */
  pattern: 'modal' | 'toast';
  /** Use confetti animation */
  confetti?: boolean;
}

// Zustand store state
export interface TourStoreState {
  // Tour completion tracking
  completedTours: Record<string, { completedAt: string; version: number }>;
  skippedTours: Record<string, string>; // tourId -> skippedAt ISO

  // Active tour state
  activeTourId: string | null;
  activeStepIndex: number;

  // Checklist state
  checklistDismissed: boolean;

  // Milestone celebration tracking
  celebratedMilestones: Record<string, string>; // milestoneId -> celebratedAt ISO

  // Viewer page visit tracking (for viewer checklist)
  visitedPages: Record<string, string>; // pageKey -> visitedAt ISO

  // Restart flag (fast-start after Settings > Restart)
  restartRequested: boolean;

  // Actions
  startTour: (tourId: string) => void;
  completeTour: (tourId: string, version: number) => void;
  skipTour: (tourId: string) => void;
  setStepIndex: (index: number) => void;
  dismissChecklist: () => void;
  celebrateMilestone: (milestoneId: string) => void;
  trackPageVisit: (pageKey: string) => void;
  clearRestartFlag: () => void;
  resetAllTours: () => void;
}
