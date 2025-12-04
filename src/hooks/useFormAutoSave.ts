/**
 * Sprint 3 Epic 3.3: Form Auto-Save Hook
 * Automatically saves form data to localStorage every 30 seconds
 * Provides draft restoration and management functionality
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';

interface UseFormAutoSaveOptions {
  /** Unique key for localStorage storage */
  storageKey: string;
  /** Auto-save interval in milliseconds (default: 30000 = 30 seconds) */
  interval?: number;
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
  /** Callback when draft is saved */
  onSave?: (data: Record<string, unknown>) => void;
  /** Callback when draft is restored */
  onRestore?: (data: Record<string, unknown>) => void;
  /** Callback when draft is cleared */
  onClear?: () => void;
}

interface UseFormAutoSaveReturn {
  /** Whether there's a saved draft available */
  hasDraft: boolean;
  /** Timestamp of last save */
  lastSaved: Date | null;
  /** Whether currently saving */
  isSaving: boolean;
  /** Manually save the current form data */
  saveDraft: () => void;
  /** Restore the saved draft to the form */
  restoreDraft: () => void;
  /** Clear the saved draft */
  clearDraft: () => void;
  /** Discard draft and continue with current values */
  discardDraft: () => void;
}

const STORAGE_PREFIX = 'trazo_form_draft_';

export function useFormAutoSave<T extends Record<string, unknown>>(
  methods: UseFormReturn<T>,
  options: UseFormAutoSaveOptions
): UseFormAutoSaveReturn {
  const {
    storageKey,
    interval = 30000, // 30 seconds default
    enabled = true,
    onSave,
    onRestore,
    onClear
  } = options;

  const fullStorageKey = `${STORAGE_PREFIX}${storageKey}`;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Check for existing draft on mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(fullStorageKey);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.data && parsed.timestamp) {
          setHasDraft(true);
          setLastSaved(new Date(parsed.timestamp));
        }
      }
    } catch (error) {
      console.error('[useFormAutoSave]: Error checking for draft:', error);
    }
  }, [fullStorageKey]);

  // Save draft to localStorage
  const saveDraft = useCallback(() => {
    if (!enabled) return;

    try {
      setIsSaving(true);
      const currentValues = methods.getValues();

      // Only save if there's meaningful data
      const hasData = Object.values(currentValues).some(
        (value) => value !== '' && value !== null && value !== undefined
      );

      if (hasData) {
        const dataToSave = {
          data: currentValues,
          timestamp: new Date().toISOString(),
          version: '1.0'
        };

        localStorage.setItem(fullStorageKey, JSON.stringify(dataToSave));
        setLastSaved(new Date());
        setHasDraft(true);

        if (onSave) {
          onSave(currentValues as Record<string, unknown>);
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('[useFormAutoSave]: Draft saved at', new Date().toLocaleTimeString());
        }
      }
    } catch (error) {
      console.error('[useFormAutoSave]: Error saving draft:', error);
    } finally {
      setIsSaving(false);
    }
  }, [enabled, fullStorageKey, methods, onSave]);

  // Restore draft from localStorage
  const restoreDraft = useCallback(() => {
    try {
      const savedData = localStorage.getItem(fullStorageKey);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.data) {
          methods.reset(parsed.data);

          if (onRestore) {
            onRestore(parsed.data);
          }

          if (process.env.NODE_ENV === 'development') {
            console.log('[useFormAutoSave]: Draft restored from', parsed.timestamp);
          }
        }
      }
    } catch (error) {
      console.error('[useFormAutoSave]: Error restoring draft:', error);
    }
  }, [fullStorageKey, methods, onRestore]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(fullStorageKey);
      setHasDraft(false);
      setLastSaved(null);

      if (onClear) {
        onClear();
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[useFormAutoSave]: Draft cleared');
      }
    } catch (error) {
      console.error('[useFormAutoSave]: Error clearing draft:', error);
    }
  }, [fullStorageKey, onClear]);

  // Discard draft (same as clear, but without callback)
  const discardDraft = useCallback(() => {
    try {
      localStorage.removeItem(fullStorageKey);
      setHasDraft(false);
      setLastSaved(null);
    } catch (error) {
      console.error('[useFormAutoSave]: Error discarding draft:', error);
    }
  }, [fullStorageKey]);

  // Set up auto-save interval
  useEffect(() => {
    if (enabled && interval > 0) {
      intervalRef.current = setInterval(saveDraft, interval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [enabled, interval, saveDraft]);

  // Save on unmount if enabled
  useEffect(() => {
    return () => {
      if (enabled) {
        // Final save before unmount
        try {
          const currentValues = methods.getValues();
          const hasData = Object.values(currentValues).some(
            (value) => value !== '' && value !== null && value !== undefined
          );

          if (hasData) {
            const dataToSave = {
              data: currentValues,
              timestamp: new Date().toISOString(),
              version: '1.0'
            };
            localStorage.setItem(fullStorageKey, JSON.stringify(dataToSave));
          }
        } catch (error) {
          console.error('[useFormAutoSave]: Error saving on unmount:', error);
        }
      }
    };
  }, [enabled, fullStorageKey, methods]);

  return {
    hasDraft,
    lastSaved,
    isSaving,
    saveDraft,
    restoreDraft,
    clearDraft,
    discardDraft
  };
}

/**
 * Utility to clear all form drafts (for use during logout or cleanup)
 */
export function clearAllFormDrafts(): void {
  try {
    const keys = Object.keys(localStorage).filter((key) => key.startsWith(STORAGE_PREFIX));
    keys.forEach((key) => localStorage.removeItem(key));

    if (process.env.NODE_ENV === 'development') {
      console.log('[useFormAutoSave]: Cleared all form drafts:', keys.length);
    }
  } catch (error) {
    console.error('[useFormAutoSave]: Error clearing all drafts:', error);
  }
}

export default useFormAutoSave;
