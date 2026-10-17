/**
 * The crew channel names the languages it serves. Its parser reads English and Spanish and refuses
 * the rest, and a crew may speak Mixteco or Punjabi, so "their own language" promised something the
 * channel does not do (CLAUDE.md, input methods). Found 2026-10-17 on the Field Notes setup card
 * while filming the crew short.
 */
import { describe, expect, it } from 'vitest';

import en from '../lang/en-US.json';
import es from '../lang/es-419.json';

const OPEN_ENDED = [/own language/i, /any language/i, /propio idioma/i, /cualquier idioma/i];

describe('the crew channel says which languages it reads', () => {
  it.each([
    ['en-US', en as Record<string, string>],
    ['es-419', es as Record<string, string>]
  ])('%s field-notes copy never promises an open-ended language', (_locale, messages) => {
    const fieldNotes = Object.entries(messages).filter(([key]) => key.startsWith('fieldNotes.'));
    expect(fieldNotes.length).toBeGreaterThan(0);
    for (const [key, value] of fieldNotes) {
      for (const pattern of OPEN_ENDED) expect(`${key}: ${value}`).not.toMatch(pattern);
    }
  });

  it('the setup step names English and Spanish', () => {
    expect((en as Record<string, string>)['fieldNotes.channel.step3']).toContain(
      'English or Spanish'
    );
    expect((es as Record<string, string>)['fieldNotes.channel.step3']).toContain(
      'español o en inglés'
    );
  });
});
