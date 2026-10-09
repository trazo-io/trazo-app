/**
 * The Parcel Application's transition card states what the records show, never a determination.
 *
 * `is_eligible` from `/transition-status/` is true by ABSENCE of a prohibited record: a parcel
 * with three documented clean years and a parcel with no history at all both return it. The card
 * rendered that as a green "Eligible — 36-month window cleared" badge, the same self-assigned
 * call the packet printed (OSP alignment audit 2026-10, T21). Eligibility under § 205.202(b) is
 * the certifying agent's determination.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

import { transitionState } from '../transitionState';

import enUS from '../../../../i18n/lang/en-US.json';
import es419 from '../../../../i18n/lang/es-419.json';

const KEY = 'parcelApp.transition.status.eligible';
const source = readFileSync(resolve(__dirname, '../ParcelApplicationWizard.tsx'), 'utf8');

describe('transition card badge', () => {
  it('states the record in both locales, not eligibility', () => {
    const en = (enUS as Record<string, string>)[KEY];
    const es = (es419 as Record<string, string>)[KEY];
    expect(en).toBe('No prohibited input on record');
    expect(es).toBe('Sin insumos prohibidos registrados');
    for (const value of [en, es]) {
      expect(value).not.toMatch(/eligib|elegib|cleared|cumplida/i);
    }
  });

  it('does not colour the record as a pass', () => {
    // A green badge over "no record" is the grade moved into the palette.
    const card = source.slice(
      source.indexOf('const TransitionCard'),
      source.indexOf('const BufferEditor')
    );
    expect(card).toContain("variant={eligible ? 'neutral' : 'warning'}");
    expect(card).not.toMatch(/eligible \? 'green\.|eligible \? 'brand'/);
  });

  it('says In transition only while a clock is running', () => {
    // An input with no organic status blocks the record but starts no clock (audit T21). The
    // card used to say "In transition" for it, from `is_eligible === false` alone.
    expect(
      transitionState({
        is_eligible: false,
        transition_complete_date: null,
        days_remaining: 0,
        unclassified: [{}]
      })
    ).toBe('notEstablished');
    expect(
      transitionState({
        is_eligible: false,
        transition_complete_date: '2027-05-01',
        days_remaining: 210
      })
    ).toBe('inTransition');
    expect(
      transitionState({
        is_eligible: false,
        transition_complete_date: '2025-01-01',
        days_remaining: 0,
        unclassified: [{}]
      })
    ).toBe('notEstablished');
    expect(transitionState({ is_eligible: true })).toBe('eligible');
    for (const state of ['eligible', 'inTransition', 'notEstablished', 'unknown']) {
      expect((enUS as Record<string, string>)[`parcelApp.transition.status.${state}`]).toBeTruthy();
      expect(
        (es419 as Record<string, string>)[`parcelApp.transition.status.${state}`]
      ).toBeTruthy();
    }
  });

  it('reads the clock from the date when no day count is sent', () => {
    // Review of app #60: a completion date ahead with `days_remaining` null fell through to
    // "unknown", while the server had marked the parcel as still in transition.
    const ahead = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
    const past = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
    expect(
      transitionState({ is_eligible: false, transition_complete_date: ahead, days_remaining: null })
    ).toBe('inTransition');
    expect(
      transitionState({ is_eligible: false, transition_complete_date: past, days_remaining: null })
    ).toBe('unknown');
  });

  it('shows a recorded completion date whatever the badge says', () => {
    // A date on record is a fact; it was hidden unless the badge said "In transition".
    const card = source.slice(
      source.indexOf('const TransitionCard'),
      source.indexOf('const BufferEditor')
    );
    expect(card).toContain('{completeDate ? (');
    expect(card).not.toContain('inTransition && completeDate');
  });
});
