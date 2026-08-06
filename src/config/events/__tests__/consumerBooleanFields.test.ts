/**
 * No boolean field may reach a consumer surface as a bare glyph.
 *
 * WHY (2026-08-02 sweep): `formatBoolean` renders "✓" / "✗". On a producer form that is fine
 * shorthand; to a shopper it is a symbol with no sentence attached, and twice it was actively
 * misleading:
 *
 *   "Action Threshold Met: ✗"      — actually good news (counts stayed under the treat level)
 *   "Is Contamination Incident: ✓" — a checkmark against the one fact where ✓ reads backwards
 *
 * So any field with `valueType: 'boolean'` that renders on `consumer_card` or
 * `consumer_timeline` must carry a `consumerFormatter` that returns words. The producer-facing
 * surfaces keep the glyph.
 */
import { describe, expect, it } from 'vitest';
import { getRegistryEntry } from '../index';

const TYPES = [
  { name: 'weather', code: 0 },
  { name: 'production', code: 1 },
  { name: 'chemical', code: 2 },
  { name: 'general', code: 3 },
  { name: 'equipment', code: 4 },
  { name: 'soil_management', code: 5 },
  { name: 'pest_management', code: 6 },
  { name: 'business', code: 7 }
];

describe('boolean fields on consumer surfaces', () => {
  const offenders: string[] = [];
  let inspected = 0;

  for (const { name, code } of TYPES) {
    const entry = getRegistryEntry(code as never) as unknown as
      | { fields?: Array<Record<string, unknown>> }
      | undefined;
    for (const f of entry?.fields ?? []) {
      const surfaces = (f.surfaces ?? {}) as Record<string, unknown>;
      if (!surfaces.consumer_card && !surfaces.consumer_timeline) continue;
      inspected++;
      if (f.valueType === 'boolean' && !f.consumerFormatter) {
        offenders.push(`${name}/${String(f.name)}`);
      }
    }
  }

  it('inspects a meaningful number of consumer fields (guards the harness)', () => {
    expect(inspected).toBeGreaterThan(40);
  });

  it('all carry a consumerFormatter that returns words, not a glyph', () => {
    expect(
      offenders,
      `\nThese render as "✓"/"✗" to a shopper. Add a consumerFormatter returning a sentence:\n  ${offenders.join(
        '\n  '
      )}\n`
    ).toEqual([]);
  });
});
