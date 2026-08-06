/**
 * The consumer card has NO `details` tier. This guards the 2026-07-31 IA change.
 *
 * WHY: `details` rendered inside a second, collapsed-by-default "Technical Details (N)"
 * accordion — two taps from a collapsed card. A shopper has 20-40 seconds and one question
 * ("is this worth the money / is it what it claims?"), so essentially nobody opened it.
 * What it did do was concentrate liability: 64 field declarations lived there, including EPA
 * registration numbers, buffer distances, internal block IDs, raw CFR citations, internal SOP
 * codes and per-event fuel figures. Two taps deep is not disclosure — it is somewhere for
 * operator data to hide on a consumer surface.
 *
 * WHY A TEST AND NOT THE BUILD: `surfaces.ts` exports `assertFieldSurfaceCompliance()`, but
 * nothing calls it — it is dead code, so there is no build-time enforcement. The real
 * enforcement is `resolver.ts` (`if (!tier || !surfaceRule.allowedTiers.includes(tier)) continue`),
 * which SILENTLY skips a field whose tier is not allowed. Silence is the problem: a
 * `consumer_card: 'details'` added tomorrow would render nowhere while reading, in the
 * registry, as though it appears on the consumer card. This test makes that loud.
 *
 * Fields a shopper genuinely needs were re-homed to `secondary` (one tap, "Additional
 * Information"). Everything else keeps `modal`/`form` for the producer, and the certifier PDF
 * reads the event models directly — so nothing was lost for audit or compliance.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Import from the barrel so the registry self-initialises (resolver throws otherwise).
import { DISPLAY_SURFACE_RULES, getFieldsForSurface } from '../index';

const EVENTS_DIR = join(__dirname, '..');

const REGISTRY_FILES = readdirSync(EVENTS_DIR).filter(
  (f) => f.endsWith('Event.ts') // chemicalEvent.ts, productionEvent.ts, ...
);

describe('consumer_card tier policy', () => {
  it('has registry files to check (guards against a silent glob regression)', () => {
    expect(REGISTRY_FILES.length).toBeGreaterThanOrEqual(8);
  });

  it('does not allow the details tier', () => {
    expect(
      DISPLAY_SURFACE_RULES.consumer_card.allowedTiers,
      'Re-adding `details` to consumer_card resurrects ~64 operator-only field declarations ' +
        'two taps deep on the shopper surface. See the note in surfaces.ts.'
    ).not.toContain('details');
  });

  it('keeps the tiers a shopper actually reads', () => {
    const tiers = DISPLAY_SURFACE_RULES.consumer_card.allowedTiers;
    expect(tiers).toContain('hero');
    expect(tiers).toContain('immediate');
    expect(tiers).toContain('secondary');
  });

  it('caps consumer-card density for a 20-40 second read', () => {
    // Was 30. A shopper scanning a QR code in a shop is not reading 30 fields.
    expect(DISPLAY_SURFACE_RULES.consumer_card.maxFields).toBeLessThanOrEqual(12);
  });

  for (const file of REGISTRY_FILES) {
    it(`${file} declares no consumer_card: 'details'`, () => {
      const source = readFileSync(join(EVENTS_DIR, file), 'utf8');
      // Strip comments so the explanatory notes that quote the old pattern don't self-trip.
      const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

      const offenders = code
        .split('\n')
        .map((line, i) => [i + 1, line] as const)
        .filter(([, line]) => /consumer_card:\s*'details'/.test(line))
        .map(([n, line]) => `${n}: ${line.trim()}`);

      expect(
        offenders,
        `${file} declares consumer_card: 'details', which resolver.ts silently drops — ` +
          "the field will render NOWHERE. Use 'secondary' if a shopper needs it, or omit " +
          'consumer_card entirely so it stays producer/certifier-only.'
      ).toEqual([]);
    });
  }
});

describe('consumer_card tier policy — the fields that were re-homed', () => {
  // A spot-check that the split went the intended way, so a future bulk edit that
  // "cleans up" the registry cannot quietly drop the consumer-relevant ones too.
  it('kept third-party lab evidence visible to shoppers', () => {
    const result = getFieldsForSurface(5, 'ST' as any, 'consumer_card', {
      type: 'ST',
      lab_name: 'A&L Western Laboratories',
      lab_report_date: '2026-07-18'
    } as Record<string, unknown>);
    const names = [...result.hero, ...result.immediate, ...result.secondary, ...result.details].map(
      (f) => f.name
    );
    // An independent lab is real third-party evidence — one of the few things a shopper
    // can actually weigh. It must not have been swept out with the operator data.
    expect(names).toContain('lab_name');
  });

  it('kept the organic-integrity signal visible to shoppers', () => {
    const result = getFieldsForSurface(1, 'EM' as any, 'consumer_card', {
      type: 'EM',
      equipment_operation_type: 'CL',
      shared_with_conventional: true
    } as Record<string, unknown>);
    const names = [...result.hero, ...result.immediate, ...result.secondary, ...result.details].map(
      (f) => f.name
    );
    // "This equipment was shared with a conventional operation, and here is the cleaning
    // evidence" is a positive integrity disclosure, not operator noise.
    expect(names).toContain('shared_with_conventional');
  });
});
