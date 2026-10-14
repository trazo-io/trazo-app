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

  it('the Production Photos gallery is fed by event photos, not the merged array', () => {
    // Third instance of one class: `completeData.images` is EVERY photo on the record — the
    // farm's establishment profile picture included — and it kept being handed to surfaces that
    // promise something narrower.
    //
    //   2026-08-30  the photo COUNT read "{n} Photos Across Farming Events" off it
    //   2026-09-01  the GALLERY titled "Production Photos" rendered it, so a lot with zero
    //               production photos showed a card containing the farm's profile shot — the
    //               same image already used as the page hero — and suppressed the honest
    //               "No photos for this batch" empty state that exists for exactly that case.
    const code = codeOf(read('views/Scan/ProductDetail/ProductDetail.tsx'));
    const galleryIdx = code.indexOf("id: 'consumer.detail.productionPhotos'");
    expect(galleryIdx, 'the gallery moved — this would pass vacuously').toBeGreaterThan(-1);

    const above = code.slice(Math.max(0, galleryIdx - 300), galleryIdx);
    expect(
      above,
      'the "Production Photos" gallery must not be fed `completeData.images` — that array ' +
        'carries the establishment profile photo, so the card promises production photos and ' +
        "delivers the farm's headshot"
    ).not.toMatch(/images=\{completeData\??\.images\}/);
    expect(above, 'the gallery should be fed photos derived from the season timeline').toMatch(
      /productionPhotos/
    );
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

/**
 * Run 8 (2026-10-05): every user-facing string that says "verified" is named here with the
 * reason it may. "Verified" belongs to a confirmed USDA Organic Integrity Database entry and,
 * negated, to statements that something was NOT independently checked. A fuzzy name match, an
 * OMRI, WSDA or National List hit, a grower-selected basis and a farmer-picked status are never
 * verifications. A new string that says "verified" fails here until someone decides it may.
 */
describe('every "verified" string is accounted for', () => {
  const VERIFIED = /\bverified\b|\bverificad[oa]s?\b/i;
  const ALLOWED: Record<string, string> = {
    'certification.badge.verified': 'rendered only for consumer_display_status verified_via_database',
    'certification.badge.verifiedShort': 'rendered only when a certification is verified_via_database',
    'consumer.organic.story.verifiedBadge': 'organic claim gated on the OID-sourced certificate',
    'consumer.certification.verifiedContinuousProof': 'organic claim gated on the OID-sourced certificate',
    'osp.claim.certifiedOrganic': 'organic claim status certified_organic, OID-gated server side',
    'consumer.education.topic2.section3.body': 'explains the rule itself',
    'consumer.trust.practicesTooltip': 'explains the rule itself',
    'consumer.trust.ftcDisclaimer': 'explains the rule itself',
    'consumer.claim.disclaimer.selfReported': 'negated: not independently verified',
    'consumer.trust.notIndependentlyVerified': 'negated',
    'osp.restriction.transcribedNote': 'negated',
    'enums.nitrogen_sources.unknown': 'negated: unknown / not verified',
    'events.chemical.nitrogenSource.unknown': 'negated: unknown / not verified',
    'certification.type.nonGmoProject': 'the certification programme is named "Non-GMO Project Verified"',
    'transparency.certNonGmo': 'the certification programme is named "Non-GMO Project Verified"',
    'events.production.fields.seedNonGmoStatus': 'who confirmed excluded methods: the operator names them',
    'events.amountDetermination.scaleVerified': 'a weigh ticket backs the number; the ticket is the evidence',
    'production.amountDeterminationHelp': 'a weigh ticket backs the number; the ticket is the evidence',
    'app.inspectedByHelp': 'the person who checked the cleaning, named by the operator',
    'transparency.breakdownPhotoCoverage': 'placeholder name only; the text reads "have photos"',
    'transparency.photoGapCategoryCoverage': 'placeholder name only; the text reads "have photos"',
    'auth.error.emailExists.unverified': 'email address verification, not a claim about farming',
    'auth.signup.toast.created.joinBody': 'email address verification, not a claim about farming',
    'auth.verifyEmail.success.joinTitle': 'email address verification, not a claim about farming',
    'auth.verifyEmail.success.joinBody': 'email address verification, not a claim about farming',
    'auth.verifyEmail.success.title': 'email address verification, not a claim about farming',
    'consumer.error.qrVerification.message': 'QR code integrity, not a claim about farming',
    'dashboard.welcomeVerifiedJoined': 'email address verification',
    'subscription.verificationFailed': 'payment subscription check',
    'commercial.verified': 'purchase reviews (Commercial dashboard), not a certification or input claim',
    'commercial.verifiedPurchase': 'purchase reviews (Commercial dashboard), not a certification or input claim',
    'app.verified': 'not rendered anywhere (no reference in src)',
    'carbon.verification.community_verified': 'not rendered anywhere (no reference in src)',
    'parcel.verifiedLabel': 'not rendered anywhere (no reference in src)'
  };

  for (const locale of ['en-US', 'es-419']) {
    it(`${locale}: no unlisted string says "verified"`, () => {
      const strings = JSON.parse(read(`i18n/lang/${locale}.json`)) as Record<string, string>;
      const saying = Object.keys(strings).filter((k) => VERIFIED.test(strings[k]));
      // Anti-vacuity: the gated badges are in the bundle and the pattern finds them.
      expect(saying).toContain('certification.badge.verified');
      expect(saying.filter((k) => !(k in ALLOWED))).toEqual([]);
    });
  }

  it('the strings a grower picks never call their own choice verified', () => {
    const en = JSON.parse(read('i18n/lang/en-US.json')) as Record<string, string>;
    for (const key of [
      'events.chemical.form.organicBasis',
      'events.chemical.form.organicBasisPlaceholder',
      'events.chemical.organicBasis.required',
      'events.business.options.verified'
    ]) {
      expect(en[key], key).not.toMatch(/\bverif/i);
    }
  });

  it('a farm-reported verification event never reads as verified on the buyer page', () => {
    const code = codeOf(read('utils/eventDescriptions.ts'));
    expect(code).not.toMatch(/'Verified'/);
    expect(code).toMatch(/as reported by the farm/);
  });
});

/**
 * Review of app #78: the "verified" sweep matched only the past participle, so the grower-picked
 * business type "Third-Party Verification Completed" and the photo hint "To verify this
 * activity, upload photos" passed it. A string the grower sees while logging names a
 * verification only as the farm's own report, a status word, or a negation.
 */
describe('grower-facing logging strings never present the farm\'s entry as a verification', () => {
  const STATUS_WORDS = new Set([
    'events.business.fields.verificationStatus',
    'events.business.help.statusOfVerificationForConsumerTransparency',
    'events.business.options.pendingVerification',
    'events.business.options.verificationFailed',
    'events.business.options.verificationInProgress',
    'events.business.options.verified'
  ]);
  const SAYS_WHOSE = /reported by the farm|informada por la finca|según lo informa la finca|not verified|could not verify|sin verificar|no se pudo verificar|verificable|verifiable|weigh ticket|ticket de pesaje|verified by|verificados por/i;

  for (const locale of ['en-US', 'es-419']) {
    it(`${locale}: every events.* string that mentions verification says whose it is`, () => {
      const strings = JSON.parse(read(`i18n/lang/${locale}.json`)) as Record<string, string>;
      const mentioning = Object.keys(strings).filter(
        (k) => k.startsWith('events.') && /verif/i.test(strings[k])
      );
      expect(mentioning.length).toBeGreaterThan(3); // anti-vacuity
      const unqualified = mentioning.filter((k) => !STATUS_WORDS.has(k) && !SAYS_WHOSE.test(strings[k]));
      expect(unqualified).toEqual([]);
    });
  }

  it('consumer education copy names no emission factor (app CLAUDE.md consumer language)', () => {
    for (const locale of ['en-US', 'es-419']) {
      const strings = JSON.parse(read(`i18n/lang/${locale}.json`)) as Record<string, string>;
      for (const key of ['consumer.education.topic2.section3.body', 'education.topicCarbonMethodologyDesc']) {
        expect(strings[key], `${locale} ${key}`).not.toMatch(/emission factor|factor(es)? de emisi[oó]n/i);
      }
    }
  });
});
