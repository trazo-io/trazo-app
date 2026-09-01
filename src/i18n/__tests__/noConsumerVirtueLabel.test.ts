/**
 * ⛔ A consumer surface may state FACTS about a farm. It may not award the farm an ADJECTIVE.
 *
 * `transparency-first.md`, Trazo Test #5: "Does any consumer-facing surface show a self-assigned
 * sustainability grade/score? → Must be NO." That rule retired `<TransparencyScore score={95} />`
 * and `<Badge>Fully Documented</Badge>` from the QR page in the 2026-06 claim-safety pivot.
 *
 * What it did NOT catch is the same claim written as prose. A grade with the number filed off is
 * still a grade: "Meet Your Transparent Farmers" is Trazo telling a shopper that this producer is
 * transparent — a trader-created sustainability qualifier, which is the class EU ECGT 2024/825
 * (live 2026-09-27) bans outright and which FTC 16 CFR 260.4 treats as an unqualified general
 * environmental benefit claim.
 *
 * 🔴 2026-09-01 — it was live. `consumer.detail.meetFarmers` ("Meet Your Transparent Farmers") and
 * `consumer.detail.documentedFarm` ("Documented Farm", one word from the retired badge) rendered
 * in `ProductDetail.tsx` farm-section, in BOTH locales. The June audit
 * (`documentation/audits/CONSUMER_PAGE_COMPLIANCE_2026-06.md:104`) had batched the heading as
 * "neutral / structural — no compliance concern", reading it as a nav label rather than a claim.
 * Worse, `farm-section` renders OUTSIDE the timeline branch, so a batch with zero events printed
 * "Meet Your Transparent Farmers" directly beneath "This farm hasn't published growing details
 * for this batch yet."
 *
 * SCOPE — consumer surfaces only. The producer dashboard is the transparency score's legitimate
 * home (`transparency-first.md`, "Two homes for the score"), so a farmer-facing string may say
 * whatever it likes. This guard reads only what a shopper can see.
 *
 * NOT BANNED: "verified" and "certified". Those are governed by `verification-language-guide` /
 * `compliance.md` and are CORRECT on a USDA Organic Integrity Database match — `OrganicClaimBadge`
 * renders "Verified" for exactly that. A virtue adjective is a different offence from an
 * overstated verification, and conflating them would make this guard unrunnable.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vitest';

import enUS from '../lang/en-US.json';
import es419 from '../lang/es-419.json';

const SRC = resolve(__dirname, '..', '..');

/** Every file that renders to an anonymous shopper or a buyer on the QR page. */
const CONSUMER_PATHS = [
  'views/Scan',
  'components/QR',
  'components/BuyerDocRequest',
  'components/Events/ConsumerEventCard.tsx',
  'components/Footer/ConsumerFooter.tsx',
  'components/Navigation/NavigationBottomBar.tsx',
  'components/Certifications/OrganicClaimBadge.tsx'
].map((p) => join(SRC, p));

const walk = (path: string, out: string[] = []): string[] => {
  if (statSync(path).isFile()) {
    if (/\.(ts|tsx|js|jsx)$/.test(path) && !/\.test\.|__tests__/.test(path)) out.push(path);
    return out;
  }
  for (const entry of readdirSync(path)) walk(join(path, entry), out);
  return out;
};

const CONSUMER_FILES = CONSUMER_PATHS.flatMap((p) => walk(p));
const CONSUMER_SOURCE = CONSUMER_FILES.map((f) => readFileSync(f, 'utf8')).join('\n');

/** Quoted, so `consumer.detail.meetFarmers` is not "rendered" because `…meetFarmersSubtitle` is. */
const isRenderedToConsumer = (key: string) =>
  CONSUMER_SOURCE.includes(`'${key}'`) ||
  CONSUMER_SOURCE.includes(`"${key}"`) ||
  CONSUMER_SOURCE.includes(`\`${key}\``);

/**
 * A virtue adjective bound to the producer noun, in either word order, in either language.
 * `documented` is in the list because "Documented Farm" is the retired "Fully Documented" badge
 * with the qualifier dropped — it grades the FARM. Note this does not touch "24 practices
 * documented", which grades nothing: there, `documented` is not bound to a producer noun.
 */
const PRODUCER_EN = 'farm|farms|farmer|farmers|producer|producers|grower|growers|ranch|orchard|operation|operations';
const VIRTUE_EN = 'transparent|sustainable|responsible|eco-friendly|eco friendly|ethical|trusted|trustworthy|conscientious|documented|traceable';
const PRODUCER_ES = 'finca|fincas|granja|granjas|agricultor|agricultores|productor|productores|productora|productoras|huerta|huertas';
const VIRTUE_ES =
  'transparente|transparentes|sostenible|sostenibles|sustentable|sustentables|responsable|responsables|[ée]tico|[ée]ticos|[ée]tica|[ée]ticas|documentada|documentadas|documentado|documentados|trazable|trazables';

const VIRTUE_LABEL: RegExp[] = [
  // EN adjective → noun: "Transparent Farmers", "Documented Farm", "Sustainable Growers"
  new RegExp(`\\b(${VIRTUE_EN})\\s+(${PRODUCER_EN})\\b`, 'i'),
  // ES noun → adjective: "agricultores transparentes", "finca documentada"
  new RegExp(`\\b(${PRODUCER_ES})\\s+(${VIRTUE_ES})\\b`, 'i'),
  // Badge-verdict form, no noun needed: "Fully Documented", "Totalmente transparente"
  new RegExp(
    `\\b(fully|highly|completely|100%|totalmente|completamente|altamente)\\s+(${VIRTUE_EN}|${VIRTUE_ES})\\b`,
    'i'
  )
];

const offends = (value: string) => VIRTUE_LABEL.some((re) => re.test(value));

describe('no self-assigned virtue label on a consumer surface', () => {
  it('finds the consumer surface (guards the guard)', () => {
    // Without this, every assertion below passes vacuously the moment the walk breaks.
    expect(CONSUMER_FILES.length).toBeGreaterThan(10);
    expect(CONSUMER_SOURCE.length).toBeGreaterThan(50_000);
    expect(isRenderedToConsumer('consumer.detail.meetFarmers')).toBe(true);
  });

  it('the pattern catches the strings that were actually live (guards the guard)', () => {
    for (const historical of [
      'Meet Your Transparent Farmers',
      'Documented Farm',
      'Fully Documented',
      'Conoce a tus agricultores transparentes',
      'Finca documentada'
    ]) {
      expect(offends(historical), `${historical} must be caught`).toBe(true);
    }
  });

  it('the pattern leaves factual and verification copy alone (guards the guard)', () => {
    for (const legitimate of [
      '24 practices documented',
      'Verified via USDA Organic Integrity Database',
      'USDA Organic',
      'Self-Reported',
      'The Farm Behind This Lot',
      'La finca detrás de este lote',
      'Prácticas documentadas: 24'
    ]) {
      expect(offends(legitimate), `${legitimate} must NOT be caught`).toBe(false);
    }
  });

  for (const [locale, catalogue] of [
    ['en-US', enUS],
    ['es-419', es419]
  ] as const) {
    it(`${locale}: no consumer-rendered string grades the farm`, () => {
      const offenders = Object.entries(catalogue as Record<string, string>)
        .filter(([, value]) => typeof value === 'string' && offends(value))
        .filter(([key]) => isRenderedToConsumer(key))
        .map(([key, value]) => `${key} = ${value}`);

      expect(
        offenders,
        'A shopper gets facts about the farm, never an adjective awarded to it (ECGT 2024/825, FTC 16 CFR 260.4)'
      ).toEqual([]);
    });
  }

  /**
   * The catalogue is not the only leak path. `app.noTimelineData` shipped as a raw key because it
   * was missing from `en-US.json` — react-intl returns the id, and the `defaultMessage` never
   * renders. The inverse is just as reachable: a claim written ONLY as a defaultMessage, on a key
   * absent from both catalogues, displays to nobody in production but is one merge from doing so.
   */
  it('no consumer defaultMessage grades the farm', () => {
    const literals = [...CONSUMER_SOURCE.matchAll(/defaultMessage:\s*(['"`])([\s\S]*?)\1/g)].map(
      (m) => m[2]
    );

    expect(literals.length, 'no defaultMessage literals found — the scan broke').toBeGreaterThan(50);
    expect(literals.filter(offends)).toEqual([]);
  });
});
