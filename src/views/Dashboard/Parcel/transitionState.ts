/**
 * Which § 205.202(b) state the parcel's transition card shows, from `/transition-status/`.
 *
 * Stated from the record, never a determination (OSP alignment audit 2026-10, T21):
 *  - eligible        nothing prohibited on record (the badge says exactly that, in grey);
 *  - inTransition    a clock is running: a completion date with days still to go;
 *  - notEstablished  no clock, but inputs with no organic status block a clean statement;
 *  - unknown         nothing to say yet.
 * `is_eligible === false` alone used to mean "In transition", including the case with no clock.
 */
export type TransitionState = 'eligible' | 'inTransition' | 'notEstablished' | 'unknown';

export interface TransitionPayload {
  is_eligible?: boolean;
  transition_complete_date?: string | null;
  days_remaining?: number | null;
  unclassified?: unknown[];
}

export const transitionState = (data: TransitionPayload | null | undefined): TransitionState => {
  if (!data) return 'unknown';
  if (data.is_eligible === true) return 'eligible';
  if (data.is_eligible !== false) return 'unknown';
  const clock =
    Boolean(data.transition_complete_date) &&
    typeof data.days_remaining === 'number' &&
    data.days_remaining > 0;
  if (clock) return 'inTransition';
  if ((data.unclassified ?? []).length > 0) return 'notEstablished';
  return 'unknown';
};
