/**
 * `formatTemperature` produced "111°C" on a live walnut card — 232°F — because it DEFAULTED to
 * Celsius when `temperature_unit` was unset, and the value was Fahrenheit. The card's own title
 * said "Heat wave - 5 days over 105 F". A physically impossible number costs more trust than a
 * missing one: once a shopper sees it, every other figure on the page is suspect.
 */
import { describe, expect, it } from 'vitest';
import { formatTemperature } from '../formatters';

const en = { locale: 'en-US' } as never;
const es = { locale: 'es-419' } as never;
const call = (v: unknown, event: Record<string, unknown> = {}, intl = en) =>
  formatTemperature(v as never, event as never, intl);

describe('formatTemperature', () => {
  it('honours an explicit Fahrenheit unit', () => {
    expect(call(111, { temperature_unit: 'F' })).toBe('111°F (44°C)');
  });

  it('honours an explicit Celsius unit', () => {
    expect(call(42, { temperature_unit: 'C' })).toBe('108°F (42°C)');
  });

  it('infers Fahrenheit from magnitude when the unit is missing — THE regression', () => {
    // 111 cannot be Celsius: the hottest air temperature ever recorded is 56.7°C.
    expect(call(111)).toBe('111°F (44°C)');
    expect(call(111)).not.toContain('111°C');
  });

  it('infers Celsius from magnitude when the unit is missing', () => {
    expect(call(42)).toBe('108°F (42°C)');
  });

  it('handles a frost reading with no unit', () => {
    expect(call(-2)).toBe('28°F (-2°C)');
  });

  it('gives metric readers their own scale first', () => {
    expect(call(111, {}, es)).toBe('44°C (111°F)');
  });

  it('parses numeric strings', () => {
    expect(call('105', { temperature_unit: 'F' })).toBe('105°F (41°C)');
  });

  it('renders nothing for absent or unparseable values', () => {
    expect(call(null)).toBeNull();
    expect(call('')).toBeNull();
    expect(call('warm')).toBeNull();
  });
});
