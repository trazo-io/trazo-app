import { describe, expect, it } from 'vitest';
import {
  maskPerformerName,
  withUSUnits,
  formatHarvestQuantity,
  toConsumerVisibleEvent,
  CERTIFIER_ONLY_EVENT_FIELDS
} from '../consumerDisplay';

describe('maskPerformerName', () => {
  it('masks a full name to initials', () => {
    expect(maskPerformerName('Ana Torres')).toBe('Farm team (A.T.)');
  });

  it('masks a single-word name to one initial', () => {
    expect(maskPerformerName('Roberto')).toBe('Farm team (R.)');
  });

  it('is idempotent on server-masked values', () => {
    // The backend (PublicHistorySerializer._public_performer) masks
    // server-side since Phase 3 — re-masking must not garble initials.
    expect(maskPerformerName('Farm team (A.T.)')).toBe('Farm team (A.T.)');
    expect(maskPerformerName('Farm team')).toBe('Farm team');
  });

  it('falls back to plain label for empty-ish input', () => {
    expect(maskPerformerName('   ')).toBe('Farm team');
  });
});

/**
 * withUSUnits multiplies numbers that are shown to shoppers and wholesale buyers as
 * measurement claims (treated area, distances). It shipped with ZERO test coverage, and in
 * 2026-07 it faithfully converted a mislabelled backend value into a 2.47x overstatement of
 * pesticide-treated area on the public page ("210 acres (85 ha)" for an 85-acre application).
 */
describe('withUSUnits', () => {
  it('converts hectares to acres, keeping the original for accuracy', () => {
    expect(withUSUnits('20 ha')).toBe('49 acres (20 ha)');
  });

  it('converts cm, km and m', () => {
    expect(withUSUnits('30 cm')).toBe('12 in (30 cm)');
    expect(withUSUnits('85 km')).toBe('53 mi (85 km)');
    expect(withUSUnits('10 m')).toBe('33 ft (10 m)');
  });

  it('leaves values that are already in US units untouched', () => {
    // The acres path is why the 2026-07 bug was one-directional: a correctly-labelled
    // "85 acres" passes straight through, so only mislabelled metric inflated.
    expect(withUSUnits('85 acres')).toBe('85 acres');
    expect(withUSUnits('1,200 lbs')).toBe('1,200 lbs');
  });

  it('is idempotent — re-running must not double-convert', () => {
    // Previously "49 acres (20 ha)" re-matched the trailing "20 ha" and produced
    // "49 acres (49 acres (20 ha))".
    const once = withUSUnits('20 ha');
    expect(withUSUnits(once)).toBe(once);
    expect(withUSUnits('12 in (30 cm)')).toBe('12 in (30 cm)');
  });

  it('does not convert when the unit token is part of a larger expression', () => {
    // "m" followed by a superscript still satisfies a word boundary, so "5 m³" used to
    // become "16 ft (5 m³)".
    expect(withUSUnits('5 m³')).toBe('5 m³');
    expect(withUSUnits('10 m/s')).toBe('10 m/s');
    expect(withUSUnits('200 m2')).toBe('200 m2');
  });

  it('leaves metric alone for non-English audiences', () => {
    // A Spanish-locale shopper has a reference frame for hectares and none for acres.
    expect(withUSUnits('20 ha', 'es-419')).toBe('20 ha');
    expect(withUSUnits('30 cm', 'es')).toBe('30 cm');
    expect(withUSUnits('20 ha', 'en-US')).toBe('49 acres (20 ha)');
    // No locale supplied => legacy behaviour preserved for older call sites.
    expect(withUSUnits('20 ha')).toBe('49 acres (20 ha)');
  });

  it('passes through non-numeric and empty input safely', () => {
    expect(withUSUnits('')).toBe('');
    expect(withUSUnits(null)).toBe('');
    expect(withUSUnits(undefined)).toBe('');
    expect(withUSUnits('Ground Spray')).toBe('Ground Spray');
  });

  it('handles comma decimal separators', () => {
    expect(withUSUnits('1,5 ha')).toBe('3.7 acres (1,5 ha)');
  });
});

describe('withUSUnits — mass and volume (added 2026-08-01)', () => {
  /**
   * The live avocado page showed "Yield: 45,000 kg" to a US shopper. Area already converted
   * ("37 acres (15 ha)") so the omission read as an oversight, not a choice.
   */
  it('rolls a large kg harvest to tons, because nobody pictures 45,000 kg', () => {
    expect(withUSUnits('45,000 kg', 'en-US')).toBe('50 tons (45,000 kg)');
  });

  it('uses pounds below the ton threshold', () => {
    expect(withUSUnits('200 kg', 'en-US')).toBe('441 lb (200 kg)');
  });

  it('converts tonnes and litres', () => {
    expect(withUSUnits('12 tonnes', 'en-US')).toBe('13 tons (12 tonnes)');
    expect(withUSUnits('13.25 L', 'en-US')).toBe('3.5 gal (13.25 L)');
  });

  /**
   * THE bug this parser exists for: `parseFloat('45,000')` is 45. Before grouped-number
   * support, a 45-tonne harvest would have converted as 45 kg — a 1000x understatement
   * rendered with total confidence.
   */
  it('reads grouped thousands, not a decimal comma', () => {
    expect(withUSUnits('45,000 kg', 'en-US')).toContain('50 tons');
    // …while a genuine decimal comma still parses as a fraction.
    expect(withUSUnits('2,5 ha', 'en-US')).toBe('6.2 acres (2,5 ha)');
  });

  it('leaves metric readers alone', () => {
    expect(withUSUnits('45,000 kg', 'es-419')).toBe('45,000 kg');
  });

  it('does not double-convert its own output', () => {
    const once = withUSUnits('45,000 kg', 'en-US');
    expect(withUSUnits(once, 'en-US')).toBe(once);
  });
});

describe('formatHarvestQuantity — locale (added 2026-08-01)', () => {
  /**
   * The batch header read "135 TONNES" on the same page where the harvest event card said
   * "50 tons (45,000 kg)". Two units for one crop, a screen apart.
   */
  it('gives English readers short tons for a big harvest', () => {
    expect(formatHarvestQuantity(135000, 'kg', 'en-US')).toEqual({ value: '149', unit: 'tons' });
  });

  it('keeps metric for Spanish readers', () => {
    expect(formatHarvestQuantity(135000, 'kg', 'es-419')).toEqual({ value: '135', unit: 'tonnes' });
  });

  it('uses pounds for a small English harvest', () => {
    expect(formatHarvestQuantity(500, 'kg', 'en-US')).toEqual({ value: '1,102', unit: 'lb' });
  });

  it('converts a tonne-denominated amount too', () => {
    expect(formatHarvestQuantity(135, 'tonnes', 'en-US')).toEqual({ value: '149', unit: 'tons' });
  });
});

/**
 * The strip itself, not just the list.
 *
 * `history/tests/test_certifier_only_list_parity.py` proves the backend tuple and this
 * mirror agree — it parses the array as TEXT and compares names. It cannot prove
 * `toConsumerVisibleEvent` actually removes them, so a key could sit in the list while the
 * function that reads it drifted, and the parity test would still be green.
 *
 * That matters here because this function backs one specific promise: EventPreviewModal is
 * headed "How consumers will see this event" and renders raw wizard form data. Anything it
 * leaves in is a field the grower believes shoppers receive.
 */
describe('toConsumerVisibleEvent', () => {
  it('strips photo_content_flag — moderation state about the farmer', () => {
    // Added to the mirror 2026-08-17. The backend stripped it from the public payload on
    // 2026-08-03 and the mirror was missed; the parity test had been failing ever since.
    // Showing Trazo's own anti-gaming verdict inside a preview labelled "how consumers will
    // see this" tells a grower that shoppers are being shown an accusation against them.
    const stripped = toConsumerVisibleEvent({
      description: 'Compost application',
      photo_content_flag: 'ai_generated'
    });
    expect(stripped).not.toHaveProperty('photo_content_flag');
    expect(stripped.description).toBe('Compost application');
  });

  it('removes every field the mirror declares', () => {
    const event = Object.fromEntries(
      CERTIFIER_ONLY_EVENT_FIELDS.map((field) => [field, 'present'])
    );
    const stripped = toConsumerVisibleEvent({ ...event, description: 'kept' });
    for (const field of CERTIFIER_ONLY_EVENT_FIELDS) {
      expect(stripped, `${field} survived the strip`).not.toHaveProperty(field);
    }
    expect(stripped.description).toBe('kept');
  });

  it('does not mutate the event it was given', () => {
    // The producer's own detail modal renders `photo_content_flag` as a "replace with a field
    // photo" warning, reading the same event object. A mutating strip would erase the warning
    // from the surface that is supposed to show it.
    const original = { description: 'Spray', rei_hours: 12, photo_content_flag: 'stock_photo' };
    toConsumerVisibleEvent(original);
    expect(original.rei_hours).toBe(12);
    expect(original.photo_content_flag).toBe('stock_photo');
  });

  it('passes through non-objects untouched', () => {
    expect(toConsumerVisibleEvent(null as never)).toBeNull();
  });
});
