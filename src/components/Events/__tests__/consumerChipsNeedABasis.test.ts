/**
 * A chip on the consumer page must have a basis a shopper could check (2026-11-04).
 *
 * Two "trust indicators" rendered on every consumer event card, and neither had one:
 *   - "USDA Standards" (blue check), keyed on `usda_factors_used`: a CARBON flag meaning the
 *     emission maths used USDA/EPA factors. On a farming activity it read as "this practice meets
 *     a USDA standard" (compliance.md bans "USDA Verified" and a blanket "EPA/USDA-sourced").
 *   - "Modern Farming", awarded when the equipment NAME the farmer typed said "modern",
 *     "precision" or "professional". A name is not a basis (Run 8b, 8b-06).
 * And the electricity-source chip turned GREEN with a wind glyph for solar and wind: a
 * self-reported input painted as an environmental benefit. A self-created label can be a colour.
 *
 * noConsumerVirtueLabel.test.ts reads WORDING ("transparent farmers"); none of these said a
 * virtue adjective, which is how they survived it. This guard reads the mechanism instead.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vitest';

const SRC = resolve(__dirname, '..', '..', '..');
const CONSUMER_PATHS = [
  'views/Scan',
  'components/QR',
  'components/Events/ConsumerEventCard.tsx'
].map((p) => join(SRC, p));
const walk = (path: string, out: string[] = []): string[] => {
  if (statSync(path).isFile()) {
    if (/\.(ts|tsx|js|jsx)$/.test(path) && !/\.test\.|__tests__/.test(path)) out.push(path);
    return out;
  }
  for (const entry of readdirSync(path)) walk(join(path, entry), out);
  return out;
};
const CONSUMER_SOURCE = CONSUMER_PATHS.flatMap((p) => walk(p))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');
const CARD = readFileSync(join(SRC, 'components/Events/ConsumerEventCard.tsx'), 'utf8');
const CARD_CODE = CARD.replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\/.*$/gm, '');

describe('consumer chips need a basis', () => {
  it('reads the consumer surface (guards the guard)', () => {
    expect(CONSUMER_SOURCE.length).toBeGreaterThan(50_000);
    expect(CARD_CODE).toContain('ELECTRICITY_SOURCE_KEYS');
  });

  it('renders neither unbasised trust indicator to a shopper', () => {
    for (const key of [
      'consumer.eventCard.trust.usdaStandards',
      'consumer.eventCard.trust.modernFarming'
    ]) {
      expect(
        CONSUMER_SOURCE.includes(`'${key}'`) || CONSUMER_SOURCE.includes(`"${key}"`),
        key
      ).toBe(false);
    }
    expect(CARD_CODE).not.toMatch(/getEventTrustIndicators/);
    // The carbon flag is not a farming-practice fact; no consumer chip may key on it.
    expect(CARD_CODE).not.toMatch(/usda_factors_used\s*\)/);
  });

  it('never colours the electricity source by which source it is', () => {
    expect(CARD_CODE).not.toMatch(/['"]solar['"]\s*\|\|/);
    expect(CARD_CODE).not.toMatch(/colorScheme=\{\s*isSustainable/);
    expect(CARD_CODE).not.toMatch(/FaWind/);
  });
});
