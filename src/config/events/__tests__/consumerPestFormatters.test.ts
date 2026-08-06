/**
 * Consumer formatters for pest fields.
 *
 * Both exist because of what the live page actually rendered (2026-08-02):
 *
 *   "What it protects against: Citrus leafminer (Phyllocnistis citrella)"
 *   "Pest Species: Persea mite (Oligonychus perseae), Avocado thrips (Scirtothrips perseae)"
 *   "Action Threshold Met: ✗"
 *
 * The Latin belongs in the certifier PDF, not on a shopper's phone; and the ✗ was hiding good
 * news (counts stayed under the level that would justify treating) behind a glyph.
 */
import { describe, expect, it } from 'vitest';
import { stripScientificName, formatConsumerActionThreshold } from '../formatters';

describe('stripScientificName', () => {
  it('drops a trailing binomial and keeps the common name', () => {
    expect(stripScientificName('Citrus leafminer (Phyllocnistis citrella)')).toBe(
      'Citrus leafminer'
    );
  });

  it('handles a list of pests', () => {
    expect(
      stripScientificName(
        'Persea mite (Oligonychus perseae), Avocado thrips (Scirtothrips perseae)'
      )
    ).toBe('Persea mite, Avocado thrips');
  });

  it('leaves a value that is only Latin alone — there is no common name to fall back to', () => {
    expect(stripScientificName('Phytophthora cinnamomi root rot')).toBe(
      'Phytophthora cinnamomi root rot'
    );
  });

  it('leaves a parenthetical the farmer wrote for a human', () => {
    // Not a binomial: lowercase first word, or more than two words.
    expect(stripScientificName('Anthracnose (post-harvest)')).toBe('Anthracnose (post-harvest)');
    expect(stripScientificName('Navel orangeworm (2nd flight)')).toBe(
      'Navel orangeworm (2nd flight)'
    );
  });

  it('never strips a value down to nothing', () => {
    // If the Latin IS the whole value, keeping it beats rendering an empty cell.
    expect(stripScientificName('(Amyelois transitella)')).toBe('(Amyelois transitella)');
  });

  it('ignores non-strings', () => {
    expect(stripScientificName(null)).toBeNull();
    expect(stripScientificName(42)).toBeNull();
  });
});

describe('formatConsumerActionThreshold', () => {
  const call = (v: unknown) => formatConsumerActionThreshold(v as never, {} as never, {} as never);

  it('says in words that counts stayed below the treatment level', () => {
    expect(call(false)).toMatch(/^No, counts stayed below/);
  });

  it('says in words that counts reached it', () => {
    expect(call(true)).toMatch(/^Yes, counts reached/);
  });

  it('accepts the string forms the payload can carry', () => {
    expect(call('true')).toMatch(/^Yes/);
    expect(call('Yes')).toMatch(/^Yes/);
    expect(call('false')).toMatch(/^No/);
  });

  it('renders nothing when the farmer never answered — absence is not a "No"', () => {
    // feedback_attestation_absence_is_not_denial: an unanswered field must not become a verdict.
    expect(call(null)).toBeNull();
    expect(call(undefined)).toBeNull();
    expect(call('')).toBeNull();
  });
});
