/**
 * Which headline the voice/crew-note banner shows.
 *
 * Extracted from `NewEvent.jsx` because the choice is a truth table and the file it lived in has
 * no render harness, so the only available guard was a regex over its own source. Two defects got
 * through that way, both the same class: a rule written for the crew-note path while the pasted
 * and live-dictation paths kept the old behaviour.
 *
 *   1. "Nothing on this activity to fill from those words" rendered above a "Use South Block"
 *      button and a "Switch to Harvest" button. Both fill something, so the headline was false,
 *      not merely unhelpful, and a farmer who reads the first line and stops has been told the
 *      message was useless. Fixed for crew notes in app #158, still live on the other two.
 *   2. "From the crew message" over a pasted note or live dictation attributes the farmer's own
 *      words to somebody else, on a record that names an author (7 CFR 205.201(a)).
 *
 * The source therefore picks the wording and never the rule.
 */

/** Where the words came from. A crew note arrives seeded; live dictation never is. */
export type VoiceNoteSource = 'crew' | 'pasted' | 'voice';

export function voiceNoteSource({
  fromCrewNote,
  seeded
}: {
  fromCrewNote?: boolean | null;
  seeded?: boolean | null;
}): VoiceNoteSource {
  if (fromCrewNote) return 'crew';
  return seeded ? 'pasted' : 'voice';
}

const MANUAL_REVIEW: Record<VoiceNoteSource, string> = {
  crew: 'events.voice.crewNoteManualReviewHeadline',
  pasted: 'events.voice.pastedNoteManualReviewHeadline',
  voice: 'events.voice.voiceManualReviewHeadline'
};

/** Says where the words came from and nothing else, because something IS on offer. */
const PLAIN: Record<VoiceNoteSource, string> = {
  crew: 'events.voice.crewNoteHeadlinePlain',
  pasted: 'events.voice.pastedNoteHeadlinePlain',
  voice: 'events.voice.voiceHeadlinePlain'
};

const OFFERED: Record<VoiceNoteSource, string> = {
  crew: 'events.voice.crewNoteOffered',
  pasted: 'events.voice.pastedNoteOffered',
  voice: 'events.voice.applied'
};

const APPLIED: Record<VoiceNoteSource, string> = {
  crew: 'events.voice.crewNoteApplied',
  pasted: 'events.voice.pastedNoteApplied',
  voice: 'events.voice.applied'
};

export function voiceBannerHeadlineId({
  source,
  manualReview,
  filledCount,
  hasSuggestion,
  seeded,
  seededPending
}: {
  source: VoiceNoteSource;
  manualReview?: string | null;
  filledCount: number;
  hasSuggestion: boolean;
  seeded?: boolean | null;
  seededPending?: unknown;
}): string {
  // Manual review first: nothing was filled and nothing is offered, so neither "offered" nor
  // "filled" is true of it.
  if (manualReview) return MANUAL_REVIEW[source];
  // Nothing to fill, but there IS something to act on. Say where the words came from and let the
  // offer below speak for itself, instead of opening with a denial the buttons contradict.
  if (filledCount === 0 && hasSuggestion) return PLAIN[source];
  if (!seeded) return APPLIED.voice;
  return seededPending ? OFFERED[source] : APPLIED[source];
}
