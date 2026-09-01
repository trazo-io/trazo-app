/**
 * "Verified" is a claim about TRAZO, and the product publishes the rule it must follow.
 *
 * THE PUBLISHED PROMISE
 * ---------------------
 * `views/Scan/Methodology/index.tsx` is a public page on the consumer subdomain. It says, in
 * as many words:
 *
 *   "A USDA Organic certification shows 'Verified' only when we match the farm's certificate
 *    against the USDA Organic Integrity Database"
 *   "Certifications we cannot match against a public database are labeled 'Self-Reported'
 *    instead."
 *
 * The trust tooltip (`consumer.trust.practicesTooltip`) states the same rule. Two public
 * disclosures, one standard.
 *
 * WHAT WAS ACTUALLY HAPPENING
 * ---------------------------
 * Three surfaces painted "Verified" from `organic_claim.status === 'certified_organic'`, which
 * is a strictly weaker fact — it means an active `usda_organic` certificate ROW exists, and a
 * manual admin edit, a data import or a fixture can create one. Found 2026-08-30 on a live lot
 * whose own certifications carried `status: 'self_reported'` and `verification_source_url: null`
 * while the card above them read "USDA Certified Organic — Verified" and "Verified via USDA
 * Organic Integrity Database", three lines apart:
 *
 *   1. `ProductDetail.tsx` — the OID attribution line, gated only on a cert existing
 *   2. `OrganicClaimBadge.tsx` — the pill, gated on `status`
 *   3. `claim_resolver.py` — `evidence.source`, on the public payload
 *
 * `CertificationBadge.tsx` and `TrustSummaryHeader.tsx` had the correct gate the whole time,
 * which is what makes this the sibling-surface class rather than a design decision.
 *
 * NOTE ON DIRECTION — this is not "be maximally cautious"
 * ------------------------------------------------------
 * Trazo genuinely runs the match: `import_usda_organic_data` mirrors the USDA monthly INTEGRITY
 * export and `USDAOrganicVerifier` fuzzy-matches against it. The first attempt at the fix
 * over-corrected in the other direction, shipping a disclaimer that opened "Not verified by
 * Trazo against the USDA Organic Integrity Database" — which reads as "we don't do that" and
 * additionally implies a finding, when an unmatched name in a monthly snapshot is no evidence
 * against an operation. Both directions are failures. The rule is: say exactly what happened.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '../../..');

const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');

/** Strip comments so a rule quoted in prose is never mistaken for the code that enforces it. */
const codeOf = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('"Verified" requires a real Organic Integrity Database match', () => {
  it('the methodology page still makes the promise this guard enforces', () => {
    // Anti-vacuity, and the reason the rule is not negotiable: if this sentence is ever
    // rewritten, the guard below should be revisited deliberately rather than left enforcing a
    // standard the product no longer publishes.
    const page = read('views/Scan/Methodology/index.tsx');
    expect(page).toMatch(/shows\s+&ldquo;Verified&rdquo;\s+only when we match/);
    expect(page).toMatch(/cannot match against a public database are labeled/);
  });

  it('ProductDetail gates the OID attribution line on the match, not on a cert existing', () => {
    const code = codeOf(read('views/Scan/ProductDetail/ProductDetail.tsx'));
    const line = code.indexOf("id: 'certification.badge.verified'");
    expect(line, 'the OID attribution line moved — this would pass vacuously').toBeGreaterThan(-1);

    // The gate must appear in the JSX guarding that render, not merely somewhere in the file.
    const window = code.slice(Math.max(0, line - 400), line);
    expect(
      window,
      'the "Verified via USDA Organic Integrity Database" line must be gated on ' +
        "status === 'verified_via_database'"
    ).toContain('verified_via_database');
  });

  it('OrganicClaimBadge paints the pill from oid_matched, never from status alone', () => {
    const code = codeOf(read('components/Certifications/OrganicClaimBadge.tsx'));
    expect(code, 'the pill lost its oid_matched gate').toContain('oid_matched');
    expect(code).toContain('showsVerified');

    // The label is deliberately NOT demoted — the operation does hold a certificate. Only the
    // pill and its colour change. Pin that, so a future "simplification" cannot quietly turn an
    // unmatched-but-certified grower into a self-reported one on the headline.
    // The published word for an unmatched CERTIFICATION is "Self-Reported"
    // (/methodology + consumer.trust.ftcDisclaimer). "Farmer-reported" is the
    // practice-record vocabulary and must not leak onto a third party's certificate.
    expect(code).toContain('certification.badge.selfReportedShort');
    const labelUse = code.indexOf('localisedClaimLabel');
    expect(labelUse, 'the claim label is gone — the fix went too far').toBeGreaterThan(-1);
  });

  it('no consumer surface prints the OID string without checking a match', () => {
    // The string itself is the claim, wherever it is rendered. Every file that formats it must
    // also name the flag that substantiates it.
    const files = [
      'views/Scan/ProductDetail/ProductDetail.tsx',
      'components/Certifications/CertificationBadge.tsx'
    ];
    const unguarded = files.filter((rel) => {
      const code = codeOf(read(rel));
      if (!code.includes("id: 'certification.badge.verified'")) return false;
      return !code.includes('verified_via_database');
    });
    expect(
      unguarded,
      `these files print "Verified via USDA Organic Integrity Database" without ever consulting ` +
        `whether the match happened: ${JSON.stringify(unguarded)}`
    ).toEqual([]);
  });

  it('the photo count never claims field evidence the array cannot support', () => {
    // `completeData.images` is every photo on the record, the farm's establishment profile
    // picture included. It read "{count} Photos Across Farming Events" over "Visual evidence
    // from the field" — so a lot with one profile photo and no event photos rendered
    // "1 Photos Across Farming Events" with a green tick. Two defects in six words: a claim the
    // data does not support, and a plural agreement bug.
    const en = JSON.parse(read('i18n/lang/en-US.json'));
    const label = en['consumer.howGrown.photosIncluded'];
    expect(label).toBeTruthy();
    expect(label, 'the label must not claim the photos are attached to farming events').not.toMatch(
      /across farming events/i
    );
    expect(label, 'must pluralise — the count can legitimately be 1').toMatch(/plural,/);
    expect(
      en['consumer.howGrown.photosSubtitle'],
      'a farm profile picture is not field evidence for this lot'
    ).not.toMatch(/from the field/i);
  });

  it('both locales pluralise the photo count', () => {
    for (const loc of ['en-US', 'es-419']) {
      const bundle = JSON.parse(read(`i18n/lang/${loc}.json`));
      expect(bundle['consumer.howGrown.photosIncluded'], loc).toMatch(/plural,/);
    }
  });

  it('the disclaimer never claims Trazo does not check', () => {
    // The over-correction fence. Trazo does check; only THIS certificate went unmatched.
    const en = JSON.parse(read('i18n/lang/en-US.json'));
    const onFile = en['consumer.claim.disclaimer.certifiedOnFile'];
    expect(onFile, 'the unmatched-certificate disclaimer is missing').toBeTruthy();
    expect(onFile).not.toMatch(/not verified by trazo against/i);
    expect(onFile, 'an absent match must be stated as absent, not as a finding').toMatch(
      /not a finding/i
    );
  });
});
