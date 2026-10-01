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
import type { TransitionStatus } from 'store/api/parcelApplicationApi';

export type TransitionState = 'eligible' | 'inTransition' | 'notEstablished' | 'unknown';

export type TransitionPayload = Pick<
  TransitionStatus,
  'is_eligible' | 'transition_complete_date' | 'days_remaining' | 'unclassified'
>;

export const transitionState = (data: TransitionPayload | null | undefined): TransitionState => {
  if (!data) return 'unknown';
  if (data.is_eligible === true) return 'eligible';
  if (data.is_eligible !== false) return 'unknown';
  // A completion date still ahead. `days_remaining` decides when the server sends it; without it,
  // the date itself does (review of app #60: a date with no day count fell through to "unknown").
  const date = data.transition_complete_date;
  const clock =
    Boolean(date) &&
    (typeof data.days_remaining === 'number'
      ? data.days_remaining > 0
      : new Date(`${date}T00:00:00`) > new Date());
  if (clock) return 'inTransition';
  if ((data.unclassified ?? []).length > 0) return 'notEstablished';
  return 'unknown';
};
