/**
 * Phase 1 privacy + formatting helper tests for the consumer QR page.
 */
import { describe, it, expect } from 'vitest';
import {
  maskPerformerName,
  formatHarvestQuantity,
  formatHarvestDate,
  formatDateRangeForConsumer
} from '../../../utils/consumerDisplay';

describe('maskPerformerName (worker privacy on public page)', () => {
  it('masks a full name to farm team + initials', () => {
    expect(maskPerformerName('Ana Torres')).toBe('Farm team (A.T.)');
  });

  it('masks a single name', () => {
    expect(maskPerformerName('Ana')).toBe('Farm team (A.)');
  });

  it('uses only the first two name parts', () => {
    expect(maskPerformerName('Carlos Mendoza Rivera')).toBe('Farm team (C.M.)');
  });

  it('handles empty/whitespace input safely', () => {
    expect(maskPerformerName('   ')).toBe('Farm team');
  });
});

describe('formatHarvestDate (local-safe harvest date)', () => {
  it('parses date-only strings as LOCAL dates — no UTC previous-day shift', () => {
    // new Date('2026-03-18') is UTC midnight, which renders as Mar 17 in any
    // timezone west of UTC. The helper must always render Mar 18.
    expect(formatHarvestDate('2026-03-18')).toBe('Mar 18, 2026');
  });

  it('prints a stored timestamp as the day the record names, in every viewer zone', () => {
    // Stored UTC wall clocks. An early-morning record printed in the viewer's zone read the day
    // before anywhere in the Americas (Aug 7 06:00Z showed "Aug 6, 2025" on the buyer page).
    expect(formatHarvestDate('2026-03-18T12:00:00Z')).toBe('Mar 18, 2026');
    expect(formatHarvestDate('2025-08-07T06:00:00Z')).toBe('Aug 7, 2025');
    expect(formatHarvestDate('2025-08-07T23:30:00Z')).toBe('Aug 7, 2025');
    expect(formatHarvestDate('2025-08-07T06:00:00Z', 'es-419')).toMatch(/^7 ago/);
  });

  it('prints a range of stored timestamps as the recorded days, year from the same clock', () => {
    expect(formatDateRangeForConsumer('2025-09-29T06:00:00Z', '2025-10-03T06:00:00Z')).toBe(
      'Sep 29 – Oct 3, 2025'
    );
    // 00:30Z on Jan 1 is still Dec 31 in the Americas; the year must come from UTC too.
    expect(formatDateRangeForConsumer('2025-12-30T06:00:00Z', '2026-01-01T00:30:00Z')).toBe(
      'Dec 30, 2025 – Jan 1, 2026'
    );
  });

  it('returns null for missing or invalid input', () => {
    expect(formatHarvestDate(undefined)).toBeNull();
    expect(formatHarvestDate(null)).toBeNull();
    expect(formatHarvestDate('not-a-date')).toBeNull();
  });
});

describe('formatHarvestQuantity (consumer-readable batch quantity)', () => {
  // 2026-08-01: this helper became locale-aware. The batch header was reading "135 TONNES"
  // on the same page where the harvest card said "50 tons (45,000 kg)" — two units for one
  // crop, a screen apart. Metric readers keep metric; English readers get tons/pounds. The
  // no-locale default converts, matching withUSUnits, so legacy call sites do not silently
  // show a US audience metric.
  it('rolls large kg quantities up to tonnes for metric readers', () => {
    expect(formatHarvestQuantity(560000, 'kg', 'es-419')).toEqual({
      value: '560',
      unit: 'tonnes'
    });
  });

  it('keeps one decimal for small tonne values', () => {
    expect(formatHarvestQuantity(12500, 'kg', 'es-419')).toEqual({ value: '12.5', unit: 'tonnes' });
  });

  it('leaves small kg quantities untouched for metric readers', () => {
    expect(formatHarvestQuantity(500, 'kg', 'es-419')).toEqual({ value: '500', unit: 'kg' });
  });

  it('defaults to US units when no locale is supplied', () => {
    expect(formatHarvestQuantity(560000, 'kg')).toEqual({ value: '617', unit: 'tons' });
  });

  it('leaves non-kg units untouched', () => {
    expect(formatHarvestQuantity(2000, 'lbs')).toEqual({ value: '2,000', unit: 'lbs' });
  });
});
