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

import { clearAllEventDrafts, useEventDraft } from '../useEventDraft';

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

  it('brings back the parcels picked for one activity on several parcels, and their cards', () => {
    const multi = {
      parcelIds: [12, 13],
      targets: [{ parcelId: 12, scope: 'all', values: { volume_applied: '20' } }]
    };
    const first = renderHook(() => useEventDraft({ parcelId: 231 }));
    act(() => first.result.current.saveDraft(2, FILLED, 0, multi));
    flushDebounce();

    const second = renderHook(() => useEventDraft({ parcelId: 231 }));
    let restored: { multi?: unknown } | null = null;
    act(() => {
      restored = second.result.current.restoreDraft();
    });
    expect(restored!.multi).toEqual(multi);
  });

  it('a single-parcel draft carries no multi block', () => {
    const first = renderHook(() => useEventDraft({ parcelId: 232 }));
    act(() => first.result.current.saveDraft(2, FILLED, 0, { parcelIds: [], targets: [] }));
    flushDebounce();
    const second = renderHook(() => useEventDraft({ parcelId: 232 }));
    let restored: { multi?: unknown } | null = null;
    act(() => {
      restored = second.result.current.restoreDraft();
    });
    expect(restored).not.toHaveProperty('multi');
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

  // MEASURED in a browser 2026-10-25: a tile tap alone stored `{type: "IR"}`, and the details
  // step's own defaults stored the rest, so the banner offered drafts nobody had typed.
  it('a picked activity and the form defaults alone are not a draft', () => {
    const { result } = renderHook(() =>
      useEventDraft({ parcelId: 231, ignoredKeys: ['equipment_operation_type'] })
    );
    act(() =>
      result.current.saveDraft(
        1,
        {
          type: 'IR',
          event_type: 1,
          name: 'Irrigation',
          irrigation_depth_unit: 'inches',
          reviewed: 'false',
          temperature_control: 'false',
          equipment_operation_type: 'CL',
          performed_by: '',
          seed_search_attempts: []
        },
        0
      )
    );
    flushDebounce();
    expect(window.localStorage.length).toBe(0);
  });

  it('does not hide an offered draft because the wizard prefilled a tile', () => {
    // A `?verb=` link seeds `type` on mount. Taking that as "the farmer started over" hid the
    // banner and, two seconds later, overwrote the draft it was offering.
    const first = renderHook(() => useEventDraft({ parcelId: 231 }));
    act(() => first.result.current.saveDraft(2, FILLED, 0));
    flushDebounce();

    const second = renderHook(() => useEventDraft({ parcelId: 231 }));
    act(() => second.result.current.saveDraft(1, { type: 'PL' }, 0));
    flushDebounce();
    expect(second.result.current.hasDraft).toBe(true);
    const stored = JSON.parse(window.localStorage.getItem('trazo.eventDraft.231.new')!);
    expect(stored.eventFormData.commercial_name).toBe('Zinc Sulfate 36%');
  });

  it('a step-0 name is content worth keeping', () => {
    const { result } = renderHook(() => useEventDraft({ parcelId: 231 }));
    act(() => result.current.saveDraft(1, { type: 'IR', performed_by: 'Juan' }, 0));
    flushDebounce();
    expect(window.localStorage.length).toBe(1);
  });

  it('keeps a season-plan item draft apart from the parcel draft', () => {
    // A spray restored into "Log this: Annual Structural Pruning" would be saved as the record
    // that closes the pruning item.
    const plain = renderHook(() => useEventDraft({ parcelId: 231 }));
    act(() => plain.result.current.saveDraft(2, FILLED, 0));
    flushDebounce();

    const plan = renderHook(() => useEventDraft({ parcelId: 231, scope: 'plan-41' }));
    expect(plan.result.current.hasDraft).toBe(false);
    act(() => plan.result.current.saveDraft(1, { type: 'PR', pruning_passes: '2' }, 0));
    flushDebounce();

    expect(renderHook(() => useEventDraft({ parcelId: 231 })).result.current.hasDraft).toBe(true);
    expect(
      renderHook(() => useEventDraft({ parcelId: 231, scope: 'plan-41' })).result.current.hasDraft
    ).toBe(true);
    expect(window.localStorage.getItem('trazo.eventDraft.231.plan-41')).not.toBeNull();
  });

  it('records whether the date was set by the operator', () => {
    const { result } = renderHook(() => useEventDraft({ parcelId: 231 }));
    act(() =>
      result.current.saveDraft(2, { ...FILLED, date: '2026-10-22T07:00' }, 0, undefined, {
        dateChosen: true,
        verbKey: 'input_application'
      })
    );
    flushDebounce();
    let restored: { dateChosen?: boolean } | null = null;
    act(() => {
      restored = result.current.restoreDraft();
    });
    expect(restored!.dateChosen).toBe(true);
    expect((restored as { verbKey?: string } | null)!.verbKey).toBe('input_application');
  });

  it('writes the last edit when the wizard closes inside the debounce', () => {
    const { result, unmount } = renderHook(() => useEventDraft({ parcelId: 231 }));
    act(() => result.current.saveDraft(2, FILLED, 0));
    unmount();
    expect(window.localStorage.getItem('trazo.eventDraft.231.new')).not.toBeNull();
  });

  it('a saved or discarded event does not come back when the wizard closes', () => {
    const saved = renderHook(() => useEventDraft({ parcelId: 231 }));
    act(() => saved.result.current.saveDraft(2, FILLED, 0));
    act(() => saved.result.current.clearDraft());
    saved.unmount();
    expect(window.localStorage.length).toBe(0);

    const discarded = renderHook(() => useEventDraft({ parcelId: 232 }));
    act(() => discarded.result.current.saveDraft(2, FILLED, 0));
    act(() => discarded.result.current.discardDraft());
    discarded.unmount();
    flushDebounce();
    expect(window.localStorage.length).toBe(0);
  });

  it('sign-out removes every draft and keeps other storage', () => {
    window.localStorage.setItem('trazo.eventDraft.231.new', '{"savedAt":"2026-10-25T10:00:00Z"}');
    window.localStorage.setItem(
      'trazo.eventDraft.232.plan-9',
      '{"savedAt":"2026-10-25T10:00:00Z"}'
    );
    window.localStorage.setItem('trazo_pending_auth_action', 'keep');
    clearAllEventDrafts();
    expect(window.localStorage.getItem('trazo.eventDraft.231.new')).toBeNull();
    expect(window.localStorage.getItem('trazo.eventDraft.232.plan-9')).toBeNull();
    expect(window.localStorage.getItem('trazo.eventDraftEpoch')).toBe('1');
    expect(window.localStorage.getItem('trazo_pending_auth_action')).toBe('keep');
  });

  it('a wizard open during sign-out cannot write its draft back', () => {
    // The navbar sign-out runs while the wizard is still mounted; navigating away unmounts it,
    // and the unmount flush would otherwise put the draft straight back.
    const flushed = renderHook(() => useEventDraft({ parcelId: 231 }));
    act(() => flushed.result.current.saveDraft(2, FILLED, 0));
    clearAllEventDrafts();
    flushed.unmount();
    expect(window.localStorage.getItem('trazo.eventDraft.231.new')).toBeNull();

    const debounced = renderHook(() => useEventDraft({ parcelId: 232 }));
    act(() => debounced.result.current.saveDraft(2, FILLED, 0));
    clearAllEventDrafts();
    flushDebounce();
    act(() => debounced.result.current.saveDraft(2, { ...FILLED, area_numeric: '50' }, 0));
    flushDebounce();
    expect(window.localStorage.getItem('trazo.eventDraft.232.new')).toBeNull();
    expect(debounced.result.current.lastSaved).toBeNull();
  });

  it('the next sign-in can save drafts again', () => {
    clearAllEventDrafts();
    const { result } = renderHook(() => useEventDraft({ parcelId: 231 }));
    act(() => result.current.saveDraft(2, FILLED, 0));
    flushDebounce();
    expect(window.localStorage.getItem('trazo.eventDraft.231.new')).not.toBeNull();
  });

  it('a sign-out in another tab also stops this tab writing the draft back', () => {
    // Tabs share localStorage but not module state. Another tab's clearAllEventDrafts shows up
    // here only as the storage it changed, so simulate exactly that.
    const { result, unmount } = renderHook(() => useEventDraft({ parcelId: 231 }));
    act(() => result.current.saveDraft(2, FILLED, 0));
    window.localStorage.removeItem('trazo.eventDraft.231.new');
    window.localStorage.setItem('trazo.eventDraftEpoch', '7');
    unmount();
    expect(window.localStorage.getItem('trazo.eventDraft.231.new')).toBeNull();
  });
});
