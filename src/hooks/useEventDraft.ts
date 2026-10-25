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

/** One activity on several parcels: the parcels picked and what each parcel's card holds. */
export interface EventDraftMulti {
  parcelIds: number[];
  targets: unknown[];
}

export interface EventDraftPayload {
  activeEventType: number | null;
  eventFormData: Record<string, unknown>;
  photoCount: number;
  savedAt: string;
  /** Absent on a single-parcel draft, and on every draft written before this field existed. */
  multi?: EventDraftMulti;
  /**
   * Whether `eventFormData.date` is a day the operator set, or only the wizard's own default for
   * the moment the form was opened. A restore puts back the first and never the second: a default
   * restored days later would file the record under the day the draft was started, not the day
   * the work was done. Absent on drafts written before this field existed.
   */
  dateChosen?: boolean;
}

interface UseEventDraftOptions {
  /** Parcel the event belongs to — drafts never cross parcels. */
  parcelId?: string | number;
  /** Event being edited, if any. A create draft and an edit draft are different things. */
  eventId?: string | number | null;
  /**
   * A create flow that answers for something specific, e.g. `plan-41` for a season-plan item.
   * Its draft is kept apart from the parcel's plain create draft: a half-finished spray restored
   * into "Log this: Annual Structural Pruning" would be saved as the record that closes the
   * pruning item.
   */
  scope?: string | null;
  /**
   * Keys the wizard fills on its own, such as a verb tile's preset fields. They describe the
   * tile, not anything the farmer typed, so they do not make a form worth offering back.
   */
  ignoredKeys?: readonly string[];
  /** Turn persistence off entirely (e.g. while submitting). */
  enabled?: boolean;
}

const buildKey = ({ parcelId, eventId, scope }: UseEventDraftOptions) =>
  `${STORAGE_PREFIX}${parcelId}.${eventId ?? scope ?? 'new'}`;

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
 *
 * MEASURED in a browser 2026-10-25: tapping a tile alone stored `{type: "IR"}`, and opening the
 * details step stored the tab's own defaults (`reviewed: "false"`, an auto-generated `name`), so
 * the banner offered drafts nobody had typed. The activity a draft is for (`type`, `event_type`)
 * is context, not content; the content is what was entered for it.
 */
const IGNORED = new Set([
  'date',
  'album',
  'acceptedFiles',
  'custom_fields',
  'is_summary',
  'type',
  'event_type',
  // ProductionTab writes a name of its own until the farmer types one.
  'name'
]);

const hasMeaningfulContent = (
  formData: Record<string, unknown> | undefined,
  ignoredKeys: readonly string[] = []
): boolean => {
  if (!formData) return false;
  return Object.entries(formData).some(([key, value]) => {
    if (IGNORED.has(key) || ignoredKeys.includes(key)) return false;
    // Every `*_unit` select opens on a default (`area_unit: "acres"`, `irrigation_depth_unit`).
    if (key.endsWith('_unit')) return false;
    if (value == null) return false;
    // Checkbox-backed fields arrive as the STRING "false" from the tabs' forms.
    if (value === 'false') return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'boolean') return value;
    return true;
  });
};

export function useEventDraft({
  parcelId,
  eventId = null,
  scope = null,
  ignoredKeys,
  enabled = true
}: UseEventDraftOptions) {
  // Route params arrive undefined on the first render. Writing under an "unknown" key would
  // leave an orphan draft that then surfaces on an unrelated parcel, so stay off until we know
  // which parcel this belongs to.
  const isActive = enabled && parcelId != null && parcelId !== '';
  const key = buildKey({ parcelId, eventId, scope });

  const [availableDraft, setAvailableDraft] = useState<EventDraftPayload | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const timerRef = useRef<number | null>(null);
  // Read inside saveDraft without adding availableDraft to its deps (which would rebuild the
  // callback on every read and restart the debounce).
  const availableDraftRef = useRef<EventDraftPayload | null>(null);
  // Same reason: a caller passing an inline array must not restart the debounce on every render.
  const ignoredKeysRef = useRef<readonly string[]>(ignoredKeys ?? []);
  ignoredKeysRef.current = ignoredKeys ?? [];

  // Look for an existing draft once per target.
  useEffect(() => {
    if (!isActive) return;
    const existing = safeRead(key);
    availableDraftRef.current = existing;
    setAvailableDraft(existing);
    setDismissed(false);
  }, [key, isActive]);

  // The write still waiting out the debounce, if any. Leaving the wizard (Back, a nav link) inside
  // the debounce used to drop it, so the last two seconds of typing were the part never saved.
  const pendingWriteRef = useRef<(() => boolean) | null>(null);

  const cancelPendingWrite = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    pendingWriteRef.current = null;
  };

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      // Unmounting: write now, without state updates. clearDraft/discardDraft empty this first, so
      // a saved or discarded event cannot come back from here.
      pendingWriteRef.current?.();
    },
    []
  );

  const saveDraft = useCallback(
    (
      activeEventType: number | null,
      eventFormData: Record<string, unknown>,
      photoCount = 0,
      multi?: EventDraftMulti,
      dateChosen?: boolean
    ) => {
      if (!isActive) return;
      if (!hasMeaningfulContent(eventFormData, ignoredKeysRef.current)) return;

      // A draft is still on offer and the farmer has started typing instead of restoring it.
      // Taking that as "start fresh" and hiding the banner is the honest reading — the
      // alternative was to keep offering a draft that this very save has already overwritten,
      // so the Restore button would have returned the work they were looking at, not the work
      // they were trying to recover.
      setDismissed((wasDismissed) => wasDismissed || Boolean(availableDraftRef.current));

      if (timerRef.current) window.clearTimeout(timerRef.current);
      setIsSaving(true);
      const write = () => {
        // Strip the File objects: they cannot be serialised, and their bytes would blow the quota.
        const { acceptedFiles: _files, album: _album, ...serialisable } = eventFormData;
        return safeWrite(key, {
          activeEventType,
          eventFormData: serialisable,
          photoCount,
          savedAt: new Date().toISOString(),
          // Without it a restored multi-parcel draft came back on the origin parcel only, and the
          // per-parcel amounts the grower had typed were gone.
          ...(multi && multi.parcelIds.length > 0 ? { multi } : {}),
          ...(dateChosen != null ? { dateChosen } : {})
        });
      };
      pendingWriteRef.current = write;
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        pendingWriteRef.current = null;
        const ok = write();
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
    cancelPendingWrite();
    safeRemove(key);
    availableDraftRef.current = null;
    setAvailableDraft(null);
    setDismissed(true);
    setLastSaved(null);
  }, [key]);

  /** Call after a successful submit so the saved event does not leave a ghost behind. */
  const clearDraft = useCallback(() => {
    cancelPendingWrite();
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
