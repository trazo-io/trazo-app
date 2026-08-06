/**
 * Every user-visible photo-guidance string must have an es-419 translation.
 *
 * The guidance lives in a large hand-authored data structure and is localised at render time by
 * exact string. That mapping is invisible to the compiler and to the i18n parity gate (which
 * only checks the JSON message catalogues), so nothing stops someone adding an English tip
 * upstream and shipping a half-Spanish guidance box.
 *
 * This test walks the ACTUAL exported recommendations rather than a copied list, so a new event
 * type, subtype, example or tip fails here until it is translated.
 */

import { describe, expect, it } from 'vitest';

import { PHOTO_GUIDANCE_ES, localizePhotoGuidance } from '../photoGuidance.es';
import {
  getEnhancedPhotoRecommendations,
  getPhotoGuidanceParts,
  getPhotoRecommendations
} from '../verificationTierHelpers';

// history/constants.py event types.
const EVENT_TYPES = [0, 1, 2, 3, 4, 5, 6, 7];
// ProductionEvent subtypes with dedicated guidance.
const PRODUCTION_SUBTYPES = ['PL', 'HA', 'IR', 'PR', 'TR', 'EM'];

const collectStrings = (): string[] => {
  const out: string[] = [];
  for (const t of EVENT_TYPES) {
    const rec = getPhotoRecommendations(t);
    if (!rec) continue;
    out.push(rec.eventType, ...rec.examples, ...(rec.tips ?? []));
    out.push(rec.toAchieveTier.photo_documented, rec.toAchieveTier.photo_verified);
  }
  for (const code of PRODUCTION_SUBTYPES) {
    const rec = getEnhancedPhotoRecommendations(1, code) as {
      subtypeName?: string;
      guidanceText?: string;
      examples?: string[];
      tips?: string[];
    } | null;
    if (!rec || !('subtypeName' in rec)) continue;
    if (rec.subtypeName) out.push(rec.subtypeName);
    if (rec.guidanceText) out.push(rec.guidanceText);
    out.push(...(rec.examples ?? []), ...(rec.tips ?? []));
  }
  return [...new Set(out.filter(Boolean))];
};

describe('photo guidance is fully translated', () => {
  it('has an es-419 entry for every string the box can render', () => {
    const missing = collectStrings().filter((s) => !PHOTO_GUIDANCE_ES[s]);
    expect(missing, `untranslated photo-guidance strings:\n${missing.join('\n')}`).toEqual([]);
  });

  it('translates rather than echoing the English', () => {
    const sample = 'Frost damage on crops or plants';
    expect(localizePhotoGuidance(sample, 'es-419')).not.toBe(sample);
    expect(localizePhotoGuidance(sample, 'es-419')).toBe('Daño por helada en cultivos o plantas');
  });

  it('leaves other locales untouched', () => {
    const sample = 'Frost damage on crops or plants';
    expect(localizePhotoGuidance(sample, 'en-US')).toBe(sample);
  });

  it('degrades to English for an unknown string instead of breaking', () => {
    expect(localizePhotoGuidance('A tip added later', 'es-419')).toBe('A tip added later');
  });

  it('exposes the guidance sentence as parts so it can be composed per locale', () => {
    // Assembling it with template literals upstream is what made it untranslatable.
    const none = getPhotoGuidanceParts(1, 0);
    expect(none?.stage).toBe(0);
    expect(none?.examples.length).toBeGreaterThan(0);

    const one = getPhotoGuidanceParts(1, 1);
    expect(one?.stage).toBe(1);
    expect(one?.tierText).toBeTruthy();

    expect(getPhotoGuidanceParts(1, 5)?.stage).toBe(2);
  });

  it('carries no internal developer notes', () => {
    // "Note: EQ is legacy code, new events use EM" was sitting in a tips array, so a farmer
    // photographing a repair was shown an internal code note as photography advice.
    const leaked = collectStrings().filter((s) => /legacy code|TODO|FIXME|deprecated/i.test(s));
    expect(leaked, `developer notes in farmer-facing guidance:\n${leaked.join('\n')}`).toEqual([]);
  });
});
