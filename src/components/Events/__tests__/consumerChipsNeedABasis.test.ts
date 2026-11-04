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
const stripComments = (code: string) =>
  code
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
const CARD_CODE = stripComments(
  readFileSync(join(SRC, 'components/Events/ConsumerEventCard.tsx'), 'utf8')
);
// Every non-test source file, so a verbatim restoration of the deleted helper is caught
// wherever it lands (it lived in utils/eventDescriptions.ts, outside the consumer paths).
const ALL_SOURCE = walk(SRC)
  .map((f) => stripComments(readFileSync(f, 'utf8')))
  .join('\n');

// The electricity chip, from where it reads the source to the end of its render block.
const ELECTRICITY_BLOCK = (() => {
  const start = CARD_CODE.indexOf('const elecSrc');
  const end = CARD_CODE.indexOf('})()}', start);
  return start === -1 || end === -1 ? '' : CARD_CODE.slice(start, end);
})();

describe('consumer chips need a basis', () => {
  it('reads the consumer surface (guards the guard)', () => {
    expect(CONSUMER_SOURCE.length).toBeGreaterThan(50_000);
    expect(ALL_SOURCE.length).toBeGreaterThan(CONSUMER_SOURCE.length);
    expect(ELECTRICITY_BLOCK).toContain('ELECTRICITY_SOURCE_KEYS[elecSrc]');
    expect(ELECTRICITY_BLOCK).toMatch(/<Badge/);
  });

  it('renders neither unbasised trust indicator to a shopper', () => {
    for (const key of [
      'consumer.eventCard.trust.usdaStandards',
      'consumer.eventCard.trust.modernFarming'
    ]) {
      expect(ALL_SOURCE.includes(`'${key}'`) || ALL_SOURCE.includes(`"${key}"`), key).toBe(false);
    }
    expect(ALL_SOURCE).not.toMatch(/getEventTrustIndicators/);
    // The carbon flag is not a farming-practice fact. The card may carry it in its props type
    // (the journey still passes it through) but must never READ it: any use beyond the type
    // field, in a condition, a ternary or `&&`, is a chip keyed on it.
    const reads = CARD_CODE.replace(/usda_factors_used\?\s*:\s*boolean\s*;/g, '');
    expect(reads).not.toMatch(/usda_factors_used/);
  });

  it('never colours or decorates the electricity source by which source it is', () => {
    // One chip, neutral, whatever the source.
    expect(ELECTRICITY_BLOCK.match(/<Badge\b/g)).toHaveLength(1);
    expect(ELECTRICITY_BLOCK).toMatch(/<Badge\s+variant="neutral"/);
    // No colour prop at all, computed or literal: neutral is the only paint.
    expect(ELECTRICITY_BLOCK).not.toMatch(/\b(colorScheme|bg|bgColor|background|color)=/);
    // The icon is fixed, never picked per source.
    for (const m of ELECTRICITY_BLOCK.matchAll(/\bas=\{([^}]*)\}/g)) {
      expect(m[1].trim(), 'icon must be a single static component').toMatch(/^\w+$/);
    }
    // The source is used to LABEL the chip (key lookup / raw fallback), never to branch on.
    expect(ELECTRICITY_BLOCK).not.toMatch(/elecSrc\s*[!=]==?|[!=]==?\s*elecSrc/);
    expect(ELECTRICITY_BLOCK).not.toMatch(/\.includes\(\s*elecSrc|switch\s*\(\s*elecSrc/);
  });
});
