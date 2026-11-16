/**
 * The buyer page names what the farm did as practices, and counts them (2026-11-08).
 *
 * The producer app moved to season / activity; the page a shopper scans still said
 * "Production Journey", "20 events", "Show All Events", "Current Production". For a shopper
 * the words are "farming practices" (transparency-first.md: "12 agricultural practices
 * documented this season") and the "lot" the package came from.
 *
 * Two claims went with the words. The activity summary showed "62% With Photos", and the
 * documented pillar carried a completeness fraction ("12 of 13 expected") and an "exceeds the
 * baseline for this crop" verdict. compliance.md states documentation as counts, never a
 * percentage or a grade.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const SRC = join(process.cwd(), 'src');
const read = (f: string) => readFileSync(join(SRC, f), 'utf8');
const en: Record<string, string> = JSON.parse(read('i18n/lang/en-US.json'));
const es: Record<string, string> = JSON.parse(read('i18n/lang/es-419.json'));

const SCREENS = [
  'views/Scan/ProductDetail/ProductDetail.tsx',
  'views/Scan/ProductDetail/components/UltraMobileProductionJourney.tsx',
  'views/Scan/ProductDetail/components/ParcelModal.tsx',
  'views/Scan/ProductDetail/components/FarmModal.tsx',
  'views/Scan/ProductDetail/components/CompanyModal.tsx',
  'views/Scan/ProductDetail/components/HarvestInfoCard.tsx',
  'views/Scan/ProductDetail/components/ModernTrazoLoader.tsx',
  'components/QR/TrustSummaryHeader.tsx',
  'components/QR/CarbonHeroSection.tsx',
  'components/Events/ConsumerEventCard.tsx',
  'components/Events/EnhancedEventDetailModal.tsx'
];

// Where the word is the regulation's own. Each entry says why.
const KEEP: Record<string, string> = {
  'consumer.eventCard.organic.tooltipNationalList':
    '"organic crop production" is 7 CFR 205.601\'s own wording',
  'consumer.eventCard.organic.tooltipNationalListAllowedCondition':
    '"organic crop production" is 7 CFR 205.601\'s own wording',
  'consumer.eventCard.organic.tooltipWsda': '"organic production" is the WSDA programme\'s scope'
};

const EN_WORDS = /\b(productions?|events?)\b/i;
const ES_WORDS = /\b(producci(ó|o)n|producciones|eventos?)\b/i;

const keysOn = (file: string) =>
  [...read(file).matchAll(/['"`]([a-zA-Z]+(?:\.[a-zA-Z0-9_]+)+)['"`]/g)]
    .map((m) => m[1])
    .filter((k) => k in en);

describe('the buyer page says practices and lot', () => {
  it.each(SCREENS)('%s', (file) => {
    const keys = keysOn(file);
    expect(keys.length, 'read no message keys: this would pass vacuously').toBeGreaterThan(0);
    const wrong = keys
      .filter((k) => !(k in KEEP))
      .flatMap((k) => [
        ...(EN_WORDS.test(en[k]) ? [`en ${k}: ${en[k]}`] : []),
        ...(ES_WORDS.test(es[k] ?? '') ? [`es ${k}: ${es[k]}`] : [])
      ]);
    expect(wrong).toEqual([]);
  });
});

describe('documentation is a count, never a percentage or a grade', () => {
  it('the activity summary counts practices with photos', () => {
    const journey = read('views/Scan/ProductDetail/components/UltraMobileProductionJourney.tsx');
    expect(journey).not.toMatch(/photoPercent|\{withPhotos\}%|% of (events|practices)/);
    expect(en['consumer.journey.photoCoverageAria']).not.toMatch(/%|percent/);
  });

  it('the documented pillar has no fraction, expected count or baseline', () => {
    const header = read('components/QR/TrustSummaryHeader.tsx');
    expect(header).not.toMatch(/expectedEventsCount|eventsFraction|eventsExceeds/);
    const pillarCopy = Object.entries(en).filter(([k]) => k.startsWith('consumer.trust.'));
    expect(pillarCopy.filter(([, v]) => /baseline|exceeds| of \{expected\}/i.test(v))).toEqual([]);
  });
});
