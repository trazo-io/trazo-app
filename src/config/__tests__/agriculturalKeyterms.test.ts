/**
 * Deepgram refuses a request whose keyterms exceed 500 tokens in total.
 *
 * MEASURED 2026-09-01 from Deepgram's own request log, on a farmer's iPhone against production:
 *
 *   language=es-419, 123 keyterms, 2,641-character URL
 *   → "Bad Request: Keyterm limit exceeded. The maximum number of tokens across all keyterms
 *      is 500."
 *
 * Every Spanish voice session had been failing since keyterms were added — and the farmer was
 * told "the connection to the transcription service dropped", because that is what a 400 looks
 * like from inside a WebSocket. English fitted under the ceiling and worked, so the failure was
 * total in one language and invisible in the other.
 *
 * The builder's own comment already said "stay under ~500 tokens" and nothing checked it. This
 * is the check.
 */
import { describe, expect, it } from 'vitest';

import {
  KEYTERM_TOKEN_BUDGET,
  estimateKeytermTokens,
  getKeytermsForLanguage
} from '../agriculturalKeyterms';

const DEEPGRAM_HARD_LIMIT = 500;
const spend = (terms: string[]) => terms.reduce((n, t) => n + estimateKeytermTokens(t), 0);

describe('keyterms fit inside Deepgram’s budget', () => {
  it('the budget itself leaves headroom under the documented ceiling', () => {
    expect(KEYTERM_TOKEN_BUDGET).toBeLessThan(DEEPGRAM_HARD_LIMIT);
  });

  for (const language of ['en-US', 'es-419', 'es', 'pt-BR', 'fr-FR']) {
    it(`${language} stays within budget`, () => {
      const terms = getKeytermsForLanguage(language);
      expect(terms.length).toBeGreaterThan(10);
      expect(spend(terms)).toBeLessThanOrEqual(KEYTERM_TOKEN_BUDGET);
    });
  }

  it('the URL it produces is a sane length', () => {
    // The failing request was 2,641 characters. Long query strings are their own hazard on
    // mobile networks and proxies, quite apart from the token limit.
    const qs = getKeytermsForLanguage('es-419')
      .map((t) => `keyterm=${encodeURIComponent(t)}`)
      .join('&');
    expect(qs.length).toBeLessThan(2000);
  });

  it('a Spanish speaker keeps the Spanish terms when something has to go', () => {
    // If the cap has to drop terms, the English generics go before the words that language
    // actually needs boosted.
    const es = getKeytermsForLanguage('es-419');
    const spanishSurvivors = es.filter((t) => /fertilizante|riego|cosecha|plaga|hectárea/i.test(t));
    expect(spanishSurvivors.length).toBeGreaterThan(3);
  });

  it('keeps the product names every language shares', () => {
    // These are why keyterm boosting exists at all — "Kocide 3000-O" is spelled the same in
    // Spanish, and speech-to-text writes it as "Kocide three thousand dot o" without help.
    for (const language of ['en-US', 'es-419']) {
      const terms = getKeytermsForLanguage(language).map((t) => t.toLowerCase());
      expect(
        terms.some((t) => t.includes('kocide')),
        `${language} lost Kocide`
      ).toBe(true);
    }
  });

  it('the estimate is pessimistic, never optimistic', () => {
    // Overestimating costs a few keyterms; underestimating costs the whole request.
    expect(estimateKeytermTokens('urea')).toBeGreaterThanOrEqual(2);
    expect(estimateKeytermTokens('Bacillus thuringiensis')).toBeGreaterThan(6);
  });
});
