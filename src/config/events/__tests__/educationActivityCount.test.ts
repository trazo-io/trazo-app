/**
 * The education topic "The N Activities You Can Log" carries a literal count in
 * both locales. That number has drifted twice already (it said "fourteen" while
 * the picker offered 17), because nothing compared the copy to the registry.
 *
 * This test derives N from ACTIVITY_VERBS — the single authority the picker
 * renders — and fails when either locale's title stops matching it, or when any
 * education string re-introduces a hardcoded activity count in prose (the drift
 * vector: "fourteen activities", "none of the thirteen above").
 */
import { describe, expect, it } from 'vitest';
import { ACTIVITY_VERBS } from 'config/activityVerbs';
import enUS from 'i18n/lang/en-US.json';
import es419 from 'i18n/lang/es-419.json';

const COUNT = ACTIVITY_VERBS.length;

describe('education activity count tracks ACTIVITY_VERBS', () => {
  it('both locale titles carry the registry count', () => {
    expect((enUS as Record<string, string>)['education.topicFarmEventsTitle']).toContain(
      String(COUNT)
    );
    expect((es419 as Record<string, string>)['education.topicFarmEventsTitle']).toContain(
      String(COUNT)
    );
  });

  it('no education prose hardcodes a spelled-out activity count', () => {
    const spelled =
      /\b(thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|trece|catorce|quince|diecis[eé]is|diecisiete|dieciocho)\b[^.]{0,40}\b(activit|actividad)/i;
    for (const dict of [enUS, es419] as Record<string, string>[]) {
      for (const [key, value] of Object.entries(dict)) {
        if (!key.startsWith('education.')) continue;
        expect(value, `${key} hardcodes an activity count`).not.toMatch(spelled);
      }
    }
  });
});
