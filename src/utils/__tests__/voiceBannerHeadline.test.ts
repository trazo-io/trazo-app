/**
 * The banner headline, as a truth table.
 *
 * These replace two regex-over-source guards in `crewNoteOfferIsFiltered.test.ts`. A regex could
 * only say the crew-note branch existed; it could not say the pasted-note and live-dictation
 * branches had the same rule, and both defects this file pins were exactly that asymmetry.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from 'vitest';

import {
  voiceBannerHeadlineId,
  voiceNoteSource,
  type VoiceNoteSource
} from '../voiceBannerHeadline';

const EN = JSON.parse(
  readFileSync(join(__dirname, '../../i18n/lang/en-US.json'), 'utf8')
) as Record<string, string>;
const ES = JSON.parse(
  readFileSync(join(__dirname, '../../i18n/lang/es-419.json'), 'utf8')
) as Record<string, string>;

const SOURCES: VoiceNoteSource[] = ['crew', 'pasted', 'voice'];

describe('where the words came from', () => {
  it('reads the crew note, the pasted note and live dictation apart', () => {
    expect(voiceNoteSource({ fromCrewNote: true, seeded: true })).toBe('crew');
    expect(voiceNoteSource({ fromCrewNote: false, seeded: true })).toBe('pasted');
    expect(voiceNoteSource({ fromCrewNote: false, seeded: false })).toBe('voice');
    // A crew note is a crew note whatever else is set: it arrived through WhatsApp.
    expect(voiceNoteSource({ fromCrewNote: true, seeded: false })).toBe('crew');
    expect(voiceNoteSource({})).toBe('voice');
  });
});

describe('the headline never claims nothing while something is on offer', () => {
  // THE DEFECT, MEASURED 2026-10-19 on a Spanish screen: "Nothing on this activity to fill from
  // those words" rendered above a "Use South Block" button and a "Switch to Harvest" button. Both
  // fill something, so the first line was false, and a farmer who reads it and stops has been
  // told the message was useless.
  for (const source of SOURCES) {
    it(`holds for ${source}`, () => {
      const id = voiceBannerHeadlineId({
        source,
        filledCount: 0,
        hasSuggestion: true,
        seeded: source !== 'voice',
        seededPending: true
      });
      expect(EN[id], `${id} is not in en-US`).toBeTruthy();
      expect(EN[id]).not.toMatch(/nothing on this activity/i);
      expect(ES[id]).not.toMatch(/no hay campos que completar/i);
    });
  }

  it('still says so when there is genuinely nothing to act on', () => {
    // The denial is correct when it IS the whole truth, so this is not "delete the zero case".
    for (const source of SOURCES) {
      const id = voiceBannerHeadlineId({
        source,
        filledCount: 0,
        hasSuggestion: false,
        seeded: source !== 'voice',
        seededPending: true
      });
      expect(EN[id]).toMatch(/nothing on this activity/i);
    }
  });
});

describe('the headline never attributes the words to the wrong person', () => {
  // A record names an author (7 CFR 205.201(a)). "From the crew message" over something the
  // farmer pasted or dictated says a different person said it.
  const CREW = /crew message|cuadrilla/i;

  it('only a crew note is headlined as one', () => {
    const cases = [
      { filledCount: 0, hasSuggestion: true, seededPending: true },
      { filledCount: 2, hasSuggestion: false, seededPending: true },
      { filledCount: 2, hasSuggestion: false, seededPending: false },
      { filledCount: 0, hasSuggestion: false, seededPending: true },
      { manualReview: 'mixed', filledCount: 0, hasSuggestion: false },
      { manualReview: 'unreadable', filledCount: 0, hasSuggestion: true }
    ];
    for (const base of cases) {
      for (const source of SOURCES) {
        const id = voiceBannerHeadlineId({ ...base, source, seeded: source !== 'voice' });
        expect(EN[id], `${id} is not in en-US`).toBeTruthy();
        expect(ES[id], `${id} is not in es-419`).toBeTruthy();
        if (source === 'crew') continue;
        expect(EN[id], `${source} headlined as a crew message: ${id}`).not.toMatch(CREW);
        expect(ES[id], `${source} headlined as a crew message: ${id}`).not.toMatch(CREW);
      }
    }
  });

  it('manual review keeps its own headline and never reads as a success', () => {
    for (const source of SOURCES) {
      const id = voiceBannerHeadlineId({
        source,
        manualReview: 'all',
        filledCount: 0,
        hasSuggestion: true,
        seeded: source !== 'voice',
        seededPending: true
      });
      expect(EN[id]).toMatch(/needs a person to read it/i);
      // Manual review outranks the plain headline: nothing is offered on that path at all.
      expect(id).not.toBe('events.voice.crewNoteHeadlinePlain');
    }
  });
});

describe('the ordinary cases are unchanged', () => {
  it('counts what was filled, and what is waiting to be', () => {
    expect(
      voiceBannerHeadlineId({
        source: 'crew',
        filledCount: 2,
        hasSuggestion: false,
        seeded: true,
        seededPending: true
      })
    ).toBe('events.voice.crewNoteOffered');
    expect(
      voiceBannerHeadlineId({
        source: 'crew',
        filledCount: 2,
        hasSuggestion: false,
        seeded: true,
        seededPending: null
      })
    ).toBe('events.voice.crewNoteApplied');
    expect(
      voiceBannerHeadlineId({
        source: 'pasted',
        filledCount: 1,
        hasSuggestion: true,
        seeded: true,
        seededPending: true
      })
    ).toBe('events.voice.pastedNoteOffered');
    expect(
      voiceBannerHeadlineId({
        source: 'voice',
        filledCount: 3,
        hasSuggestion: false,
        seeded: false
      })
    ).toBe('events.voice.applied');
  });
});
