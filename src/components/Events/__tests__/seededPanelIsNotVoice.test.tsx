/**
 * The panel says what it is actually reading.
 *
 * 🔴 MEASURED 2026-10-20 on a WhatsApp TEXT message: the panel was headed "Voice entry" and its
 * progress line read "Analyzing your voice input…". Nobody spoke. A crew member typed, and the
 * person reading it is the operator. The subtitle was worse than cosmetic: "Describe the activity
 * and we'll fill in what we can" instructs somebody who has nothing left to describe.
 *
 * A crew note may itself have arrived as an audio note, and the wording still holds: what reaches
 * this panel is its TRANSCRIPT, and what the panel does is read it.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from 'vitest';

const SRC = readFileSync(join(__dirname, '../VoiceEventCapture.tsx'), 'utf8');
const EN = JSON.parse(
  readFileSync(join(__dirname, '../../../i18n/lang/en-US.json'), 'utf8')
) as Record<string, string>;
const ES = JSON.parse(
  readFileSync(join(__dirname, '../../../i18n/lang/es-419.json'), 'utf8')
) as Record<string, string>;

const SOURCES = ['voice', 'crewNote', 'pastedNote'];

describe('the seeded panel is not a voice panel', () => {
  it('derives one source from the seed it was given', () => {
    expect(SRC).toMatch(
      /const seedSource = seedTranscript \? \(seedNoteId \? 'crewNote' : 'pastedNote'\) : 'voice'/
    );
  });

  it('heads the panel, the subtitle and the progress line by that source', () => {
    for (const base of ['voice.title', 'voice.subtitle', 'voice.stage.analyzing']) {
      expect(SRC, `${base} is still hardcoded`).not.toContain(`id: '${base}'`);
      expect(SRC).toContain(`\`${base}.\${seedSource}\``);
      for (const source of SOURCES) {
        expect(EN[`${base}.${source}`], `${base}.${source} missing in en-US`).toBeTruthy();
        expect(ES[`${base}.${source}`], `${base}.${source} missing in es-419`).toBeTruthy();
      }
    }
  });

  it('never calls a typed message voice, in either language', () => {
    for (const base of ['voice.title', 'voice.subtitle', 'voice.stage.analyzing']) {
      for (const source of ['crewNote', 'pastedNote']) {
        expect(EN[`${base}.${source}`]).not.toMatch(/voice|speak|spoke|said/i);
        expect(ES[`${base}.${source}`]).not.toMatch(/voz|habl/i);
      }
    }
  });

  it('does not ask a reader to describe something that was already said', () => {
    // The subtitle is instructions. On a seeded panel the words are already in, so instructions
    // addressed to the speaker are addressed to the wrong person.
    expect(EN['voice.subtitle.crewNote']).not.toMatch(/describe/i);
    expect(EN['voice.subtitle.pastedNote']).not.toMatch(/describe/i);
    expect(ES['voice.subtitle.crewNote']).not.toMatch(/describe/i);
    // ...and still promises the review that makes it a suggestion rather than a record.
    for (const source of SOURCES) {
      expect(EN[`voice.subtitle.${source}`]).toMatch(/review every field before saving/i);
      expect(ES[`voice.subtitle.${source}`]).toMatch(/revisas cada campo antes de guardar/i);
    }
  });

  it('leaves no unsourced copy behind to drift back in', () => {
    for (const base of ['voice.title', 'voice.subtitle', 'voice.stage.analyzing']) {
      expect(EN[base], `${base} still exists and can be used again`).toBeUndefined();
      expect(ES[base]).toBeUndefined();
    }
  });
});
