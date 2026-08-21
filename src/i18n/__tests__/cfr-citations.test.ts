/**
 * § 205.400(f) has two limbs and they are not interchangeable.
 *
 *   (f)(1) — application, including DRIFT, of a PROHIBITED SUBSTANCE
 *   (f)(2) — a CHANGE in the certified operation that may affect compliance
 *
 * Both carry the same "immediately notify the certifying agent" duty from the chapeau, so the
 * difference is what triggers them, never how urgent they are.
 *
 * The app cited (f)(1) for a change in four separate strings — the drift banner, both
 * approved-inputs strings, and (2026-08-21) a new education topic — while the backend had already
 * moved to (f)(2) for exactly this case (migration 0161 corrected 0155's help_text on
 * `drift_warning`: "treated as an operation change requiring certifier notification"). The UI was
 * telling farmers a different rule than the field they were looking at.
 *
 * This walks every user-facing string in both locales so the next one is caught wherever it lands.
 */
import { describe, expect, it } from 'vitest';

import enUS from '../lang/en-US.json';
import es419 from '../lang/es-419.json';

const LOCALES: Record<string, Record<string, string>> = { 'en-US': enUS, 'es-419': es419 };

/** Words that mean "a prohibited substance reached this ground", in either locale. */
const PROHIBITED_TRIGGER = /prohibited|drift|deriva|sustancia prohibida/i;
/** Words that mean "something about the operation changed", in either locale. */
const CHANGE_TRIGGER = /\bchange|cambio/i;

describe.each(Object.entries(LOCALES))('§ 205.400(f) citations — %s', (_locale, messages) => {
  const entries = Object.entries(messages).filter(([, v]) => typeof v === 'string');

  it('every (f)(1) citation is about a prohibited substance or drift', () => {
    const wrong = entries
      .filter(([, v]) => v.includes('205.400(f)(1)'))
      .filter(([, v]) => !PROHIBITED_TRIGGER.test(v))
      .map(([k]) => k);
    expect(wrong).toEqual([]);
  });

  it('no string cites (f)(1) for a change without also naming the prohibited-substance case', () => {
    // The failure shape: "Per 205.400(f)(1), you must notify your certifier of practice changes".
    const wrong = entries
      .filter(([, v]) => v.includes('205.400(f)(1)') && CHANGE_TRIGGER.test(v))
      .filter(([, v]) => !PROHIBITED_TRIGGER.test(v))
      .map(([k]) => k);
    expect(wrong).toEqual([]);
  });

  it('every (f)(2) citation is about a change', () => {
    const wrong = entries
      .filter(([, v]) => v.includes('205.400(f)(2)'))
      .filter(([, v]) => !CHANGE_TRIGGER.test(v))
      .map(([k]) => k);
    expect(wrong).toEqual([]);
  });

  it('does not describe (f)(2) as anything less urgent than immediate', () => {
    // The chapeau of § 205.400(f) says "Immediately notify" for BOTH limbs. "Prior notice",
    // "within 30 days" or "at renewal" would all understate the duty.
    const wrong = entries
      .filter(([, v]) => v.includes('205.400(f)(2)'))
      .filter(([, v]) => /prior notice|aviso previo|at renewal|en la renovaci/i.test(v))
      .map(([k]) => k);
    expect(wrong).toEqual([]);
  });

  it('is not vacuous — both limbs are actually cited somewhere', () => {
    expect(entries.filter(([, v]) => v.includes('205.400(f)(1)')).length).toBeGreaterThan(2);
    expect(entries.filter(([, v]) => v.includes('205.400(f)(2)')).length).toBeGreaterThan(2);
  });
});
