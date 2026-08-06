/**
 * D9 — draft persistence for the event wizard.
 *
 * The wizard holds a whole event in React state across three steps. A refresh, a phone locking,
 * a tab closing, or an accidental Back throws all of it away — and the events that take longest
 * to fill in (a chemical application with EPA numbers off the label, a lab analysis) are exactly
 * the ones a farmer least wants to type twice.
 *
 * Deliberate limits, both of which the UI states rather than hides:
 *
 *  - PHOTOS ARE NOT RESTORED. File objects cannot be serialised to localStorage, and writing
 *    image data there would blow the ~5 MB quota on the first photo. The draft records how many
 *    were attached so the restore banner can say they need re-attaching. Silently restoring a
 *    form that looks complete but has lost its photo evidence would be worse than not restoring.
 *
 *  - DRAFTS ARE SCOPED per parcel and per create/edit target. A draft started on one parcel must
 *    never surface on another, and a half-finished new event must never overwrite the form of an
 *    event being edited.
 *
 * Drafts expire after 7 days so a forgotten one cannot resurface a season later next to a date
 * that no longer means anything.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_PREFIX = 'trazo.eventDraft.';
const DEBOUNCE_MS = 2000;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface EventDraftPayload {
  activeEventType: number | null;
  eventFormData: Record<string, unknown>;
  photoCount: number;
  savedAt: string;
}

interface UseEventDraftOptions {
  /** Parcel the event belongs to — drafts never cross parcels. */
  parcelId?: string | number;
  /** Event being edited, if any. A create draft and an edit draft are different things. */
  eventId?: string | number | null;
  /** Turn persistence off entirely (e.g. while submitting). */
  enabled?: boolean;
}

const buildKey = ({ parcelId, eventId }: UseEventDraftOptions) =>
  `${STORAGE_PREFIX}${parcelId}.${eventId ?? 'new'}`;

/** localStorage throws in private mode and when the quota is exceeded; never take the app down. */
const safeRead = (key: string): EventDraftPayload | null => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EventDraftPayload;
    if (!parsed?.savedAt) return null;
    if (Date.now() - new Date(parsed.savedAt).getTime() > MAX_AGE_MS) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const safeWrite = (key: string, payload: EventDraftPayload): boolean => {
  try {
    window.localStorage.setItem(key, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
};

const safeRemove = (key: string) => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* nothing to clean up */
  }
};

/**
 * A draft is only worth offering if the farmer actually entered something. Without this, merely
 * opening the wizard would arm a "restore draft?" banner on the next visit — training people to
 * dismiss a prompt that never carries anything.
 */
const hasMeaningfulContent = (formData: Record<string, unknown> | undefined): boolean => {
  if (!formData) return false;
  const IGNORED = new Set([
    'date',
    'album',
    'acceptedFiles',
    'custom_fields',
    'area_unit',
    'fuel_unit',
    'volume_unit',
    'depth_unit',
    'yield_unit',
    'amendment_unit',
    'micronutrient_rate_unit',
    'is_summary'
  ]);
  return Object.entries(formData).some(([key, value]) => {
    if (IGNORED.has(key)) return false;
    if (value == null) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'boolean') return value;
    return true;
  });
};

export function useEventDraft({ parcelId, eventId = null, enabled = true }: UseEventDraftOptions) {
  // Route params arrive undefined on the first render. Writing under an "unknown" key would
  // leave an orphan draft that then surfaces on an unrelated parcel, so stay off until we know
  // which parcel this belongs to.
  const isActive = enabled && parcelId != null && parcelId !== '';
  const key = buildKey({ parcelId, eventId });

  const [availableDraft, setAvailableDraft] = useState<EventDraftPayload | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const timerRef = useRef<number | null>(null);
  // Read inside saveDraft without adding availableDraft to its deps (which would rebuild the
  // callback on every read and restart the debounce).
  const availableDraftRef = useRef<EventDraftPayload | null>(null);

  // Look for an existing draft once per target.
  useEffect(() => {
    if (!isActive) return;
    const existing = safeRead(key);
    availableDraftRef.current = existing;
    setAvailableDraft(existing);
    setDismissed(false);
  }, [key, isActive]);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    []
  );

  const saveDraft = useCallback(
    (activeEventType: number | null, eventFormData: Record<string, unknown>, photoCount = 0) => {
      if (!isActive) return;
      if (!hasMeaningfulContent(eventFormData)) return;

      // A draft is still on offer and the farmer has started typing instead of restoring it.
      // Taking that as "start fresh" and hiding the banner is the honest reading — the
      // alternative was to keep offering a draft that this very save has already overwritten,
      // so the Restore button would have returned the work they were looking at, not the work
      // they were trying to recover.
      setDismissed((wasDismissed) => wasDismissed || Boolean(availableDraftRef.current));

      if (timerRef.current) window.clearTimeout(timerRef.current);
      setIsSaving(true);
      timerRef.current = window.setTimeout(() => {
        // Strip the File objects: they cannot be serialised, and their bytes would blow the quota.
        const { acceptedFiles: _files, album: _album, ...serialisable } = eventFormData;
        const ok = safeWrite(key, {
          activeEventType,
          eventFormData: serialisable,
          photoCount,
          savedAt: new Date().toISOString()
        });
        setIsSaving(false);
        // Only claim it was saved if it was. A "Draft saved" line over a failed write (private
        // mode, quota) is the kind of false reassurance that costs someone their work.
        if (ok) setLastSaved(new Date());
      }, DEBOUNCE_MS);
    },
    [key, isActive]
  );

  const restoreDraft = useCallback((): EventDraftPayload | null => {
    const draft = safeRead(key);
    availableDraftRef.current = null;
    setDismissed(true);
    return draft;
  }, [key]);

  const discardDraft = useCallback(() => {
    safeRemove(key);
    availableDraftRef.current = null;
    setAvailableDraft(null);
    setDismissed(true);
    setLastSaved(null);
  }, [key]);

  /** Call after a successful submit so the saved event does not leave a ghost behind. */
  const clearDraft = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    safeRemove(key);
    availableDraftRef.current = null;
    setAvailableDraft(null);
    setLastSaved(null);
    setIsSaving(false);
  }, [key]);

  return {
    hasDraft: Boolean(availableDraft) && !dismissed,
    draftSavedAt: availableDraft?.savedAt ? new Date(availableDraft.savedAt) : null,
    draftPhotoCount: availableDraft?.photoCount ?? 0,
    lastSaved,
    isSaving,
    saveDraft,
    restoreDraft,
    discardDraft,
    clearDraft
  };
}
