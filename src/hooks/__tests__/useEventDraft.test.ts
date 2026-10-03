// @vitest-environment jsdom
/**
 * D9 — the draft must be scoped, honest and disposable.
 *
 * The failure modes that matter are not "does it save" but the ones that would cost a farmer
 * data or trust: a draft from one parcel surfacing on another, a restore banner armed by merely
 * opening the wizard, a "Draft saved" line over a write that silently failed, and a draft that
 * outlives the event it became and invites a duplicate.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useEventDraft } from '../useEventDraft';

const FILLED = { commercial_name: 'Zinc Sulfate 36%', area_numeric: '44.5' };

describe('useEventDraft', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const flushDebounce = () =>
    act(() => {
      vi.advanceTimersByTime(2500);
    });

  it('persists a filled form after the debounce', () => {
    const { result } = renderHook(() => useEventDraft({ parcelId: 231 }));
    act(() => result.current.saveDraft(2, FILLED, 0));
    expect(result.current.lastSaved).toBeNull(); // not yet — still debouncing
    flushDebounce();
    expect(result.current.lastSaved).toBeInstanceOf(Date);
  });

  it('refuses to store an empty form', () => {
    // Otherwise merely opening the wizard arms a restore banner that carries nothing, and people
    // learn to dismiss the prompt without reading it.
    const { result } = renderHook(() => useEventDraft({ parcelId: 231 }));
    act(() => result.current.saveDraft(2, { area_unit: 'acres', date: '2026-05-01' }, 0));
    flushDebounce();
    expect(result.current.lastSaved).toBeNull();
    expect(window.localStorage.length).toBe(0);
  });

  it('never offers one parcel a draft started on another', () => {
    const a = renderHook(() => useEventDraft({ parcelId: 231 }));
    act(() => a.result.current.saveDraft(2, FILLED, 0));
    flushDebounce();

    const b = renderHook(() => useEventDraft({ parcelId: 999 }));
    expect(b.result.current.hasDraft).toBe(false);
  });

  it('keeps a create draft away from an edit of an existing event', () => {
    const create = renderHook(() => useEventDraft({ parcelId: 231, eventId: null }));
    act(() => create.result.current.saveDraft(2, FILLED, 0));
    flushDebounce();

    const edit = renderHook(() => useEventDraft({ parcelId: 231, eventId: 996 }));
    expect(edit.result.current.hasDraft).toBe(false);
  });

  it('records the photo count but not the files', () => {
    // File objects cannot be serialised and their bytes would blow the quota, so the draft
    // carries the count only — which is what lets the restore banner say to re-attach them.
    const { result } = renderHook(() => useEventDraft({ parcelId: 231 }));
    act(() =>
      result.current.saveDraft(2, { ...FILLED, acceptedFiles: [{}, {}], album: { images: [] } }, 2)
    );
    flushDebounce();

    const stored = JSON.parse(window.localStorage.getItem(window.localStorage.key(0)!)!);
    expect(stored.photoCount).toBe(2);
    expect(stored.eventFormData.acceptedFiles).toBeUndefined();
    expect(stored.eventFormData.album).toBeUndefined();
    expect(stored.eventFormData.commercial_name).toBe('Zinc Sulfate 36%');
  });

  it('offers a saved draft to the next visit and returns it on restore', () => {
    const first = renderHook(() => useEventDraft({ parcelId: 231 }));
    act(() => first.result.current.saveDraft(2, FILLED, 0));
    flushDebounce();

    const second = renderHook(() => useEventDraft({ parcelId: 231 }));
    expect(second.result.current.hasDraft).toBe(true);
    let restored: unknown;
    act(() => {
      restored = second.result.current.restoreDraft();
    });
    expect(
      (restored as { eventFormData: Record<string, unknown> }).eventFormData.commercial_name
    ).toBe('Zinc Sulfate 36%');
  });

  it('discard removes it for good', () => {
    const first = renderHook(() => useEventDraft({ parcelId: 231 }));
    act(() => first.result.current.saveDraft(2, FILLED, 0));
    flushDebounce();

    const second = renderHook(() => useEventDraft({ parcelId: 231 }));
    act(() => second.result.current.discardDraft());
    expect(second.result.current.hasDraft).toBe(false);
    expect(renderHook(() => useEventDraft({ parcelId: 231 })).result.current.hasDraft).toBe(false);
  });

  it('clearing after a successful save leaves no ghost to duplicate', () => {
    const first = renderHook(() => useEventDraft({ parcelId: 231 }));
    act(() => first.result.current.saveDraft(2, FILLED, 0));
    flushDebounce();
    act(() => first.result.current.clearDraft());

    expect(renderHook(() => useEventDraft({ parcelId: 231 })).result.current.hasDraft).toBe(false);
  });

  it('ignores a draft older than a week', () => {
    const stale = {
      activeEventType: 2,
      eventFormData: FILLED,
      photoCount: 0,
      savedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    };
    window.localStorage.setItem('trazo.eventDraft.231.new', JSON.stringify(stale));
    expect(renderHook(() => useEventDraft({ parcelId: 231 })).result.current.hasDraft).toBe(false);
  });

  it('survives unusable storage instead of taking the wizard down', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const { result } = renderHook(() => useEventDraft({ parcelId: 231 }));
    expect(() => {
      act(() => result.current.saveDraft(2, FILLED, 0));
      flushDebounce();
    }).not.toThrow();
    // And it must not claim a save that did not happen.
    expect(result.current.lastSaved).toBeNull();
    spy.mockRestore();
  });

  it('does nothing at all when disabled', () => {
    const { result } = renderHook(() => useEventDraft({ parcelId: 231, enabled: false }));
    act(() => result.current.saveDraft(2, FILLED, 0));
    flushDebounce();
    expect(window.localStorage.length).toBe(0);
  });

  it('stops offering a draft once the farmer starts typing instead of restoring it', () => {
    // The banner must not keep pointing at work this very autosave has already overwritten.
    const first = renderHook(() => useEventDraft({ parcelId: 231 }));
    act(() => first.result.current.saveDraft(2, FILLED, 0));
    flushDebounce();

    const second = renderHook(() => useEventDraft({ parcelId: 231 }));
    expect(second.result.current.hasDraft).toBe(true);

    act(() => second.result.current.saveDraft(2, { commercial_name: 'Something else' }, 0));
    expect(second.result.current.hasDraft).toBe(false);
  });

  it('stays off until the parcel is known', () => {
    // Route params are undefined on first render; writing under an "unknown" key would leave an
    // orphan draft that later surfaces on an unrelated parcel.
    const { result } = renderHook(() => useEventDraft({ parcelId: undefined }));
    act(() => result.current.saveDraft(2, FILLED, 0));
    flushDebounce();
    expect(window.localStorage.length).toBe(0);
    expect(result.current.hasDraft).toBe(false);
  });
});
