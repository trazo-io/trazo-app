/**
 * Compliance guard — the "All inputs organic-approved" chip is an AFFIRMATIVE organic claim.
 *
 * WHY THIS EXISTS: the chip was computed as
 *   chapterEvents.every((e) => Boolean(e.organic_approved))
 * `organic_approved` is an enum STRING whose values include 'not_organic', and
 * `Boolean('not_organic') === true`. So a production whose inputs were ALL conventional
 * satisfied `every(...)` and the consumer page rendered "All Inputs Organic-Approved" —
 * while the certification block on the SAME page correctly read
 * "0 of 4 crop inputs are OMRI/National List–approved for organic use".
 *
 * Verified live on published production 1872735e (4 chemical events, all `not_organic`,
 * including a synthetic fungicide) before the fix.
 *
 * A platform-generated false environmental claim is an FTC 16 CFR 260.6 violation and the
 * self-created-label class banned by EU ECGT 2024/825. The classification therefore has
 * exactly one home: the backend `claim_resolver` (`ORGANIC_APPROVED_VALUES`), surfaced as
 * `standard_view.organic_summary`. The frontend must never re-derive it.
 *
 * See .claude/rules/compliance.md and .claude/rules/transparency-first.md.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const JOURNEY = join(
  __dirname,
  '..',
  'ProductDetail',
  'components',
  'UltraMobileProductionJourney.tsx'
);

/**
 * Strip block and line comments before scanning. The fix deliberately documents the old
 * broken predicate in a comment so it is never reintroduced — a naive scan would match
 * that prose and fail on the fixed file.
 */
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('organic input claim — chip must not be locally derived', () => {
  const source = stripComments(readFileSync(JOURNEY, 'utf8'));

  it('never reads the raw per-event `organic_approved` field', () => {
    // Deliberately absolute rather than pattern-matching the one broken predicate.
    // A regex targeting `Boolean(...)` or `every(...)` misses the bare form
    // `every((e) => e.organic_approved)` — which is the most likely way this gets
    // reintroduced. The durable rule is simply: this component does not classify
    // organic status, the backend does. `organic_approved_inputs` (a field of the
    // backend summary) is allowed via the negative lookahead.
    const rawFieldRefs = source
      .split('\n')
      .map((line, i) => [i + 1, line] as const)
      .filter(([, line]) => /organic_approved(?!_)/.test(line));

    expect(
      rawFieldRefs.map(([n, l]) => `${n}: ${l.trim()}`),
      'UltraMobileProductionJourney must not read the per-event `organic_approved` field. ' +
        "It is an enum string whose values include 'not_organic', so no truthiness or " +
        'equality check here can be trusted. Use `organicSummary.all_inputs_organic`, ' +
        'computed server-side by claim_resolver.'
    ).toEqual([]);
  });

  it('gates the chip on the backend-computed organic summary', () => {
    expect(
      /organicSummary\?\.all_inputs_organic\s*===\s*true/.test(source),
      'The chip must require `organicSummary.all_inputs_organic === true` — the same ' +
        'classification that drives the "{n} of {m} inputs approved" narrative.'
    ).toBe(true);
  });

  it('requires has_input_data, so a missing summary claims nothing', () => {
    // Absence of evidence is never a claim in either direction.
    // Pairs with feedback_attestation_absence_is_not_denial.
    expect(
      /organicSummary\?\.has_input_data\s*===\s*true/.test(source),
      'The chip must require `has_input_data === true` so an absent summary renders no chip ' +
        'rather than an unsupported claim.'
    ).toBe(true);
  });
});

describe('organic input claim — the classification semantics it depends on', () => {
  // Documents the exact values that made the old predicate wrong, so a future refactor
  // that reintroduces a local scan fails here with the reason spelled out.
  const APPROVED = ['omri_listed', 'wsda_listed', 'cdfa_oim_listed', 'national_list_allowed'];
  const NOT_APPROVED = ['not_organic'];

  it("'not_organic' is truthy — the reason a local scan cannot work", () => {
    for (const value of NOT_APPROVED) {
      expect(Boolean(value)).toBe(true); // truthy, yet NOT organic-approved
    }
  });

  it('approved values are also plain truthy strings, so truthiness cannot discriminate', () => {
    for (const value of APPROVED) {
      expect(Boolean(value)).toBe(true);
    }
    // Both sets are truthy => truthiness carries zero information about approval.
    expect(new Set([...APPROVED, ...NOT_APPROVED].map(Boolean))).toEqual(new Set([true]));
  });
});
