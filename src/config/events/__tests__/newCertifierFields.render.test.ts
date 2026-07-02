/**
 * Render-proof for the 2026-06 NOP fields added to the registry: they resolve onto
 * the producer surfaces (modal/form) and are NEVER on the consumer_card surface
 * (certifier-only). Importing from '../index' loads the real event registry.
 */
import { describe, expect, it } from 'vitest';

import { getFieldsForSurface } from '../index';
import type { DisplaySurface, ResolvedFieldSet } from '../index';

const names = (set: ResolvedFieldSet) =>
  [...set.hero, ...set.immediate, ...set.secondary, ...set.details].map((f) => f.name);

const resolved = (
  type: 'chemical' | 'production' | 'soil_management',
  subtype: string,
  surface: DisplaySurface,
  event: Record<string, unknown>
) => names(getFieldsForSurface(type, subtype as never, surface, event));

describe('New certifier-only NOP fields render on producer surfaces only', () => {
  it('chemical_lot_number: on chemical modal + form, NOT consumer_card', () => {
    const ev = { chemical_lot_number: 'LOT-ENT-4471' };
    expect(resolved('chemical', 'PE', 'modal', ev)).toContain('chemical_lot_number');
    expect(resolved('chemical', 'PE', 'form', ev)).toContain('chemical_lot_number');
    expect(resolved('chemical', 'PE', 'consumer_card', ev)).not.toContain('chemical_lot_number');
  });

  it('water_test_date + water_test_lab: on IR modal + form, NOT consumer_card', () => {
    const ev = { water_test_date: '2026-06-01', water_test_lab: 'BlueWater Labs' };
    const modal = resolved('production', 'IR', 'modal', ev);
    const form = resolved('production', 'IR', 'form', ev);
    const consumer = resolved('production', 'IR', 'consumer_card', ev);
    expect(modal).toContain('water_test_date');
    expect(modal).toContain('water_test_lab');
    expect(form).toContain('water_test_date');
    expect(form).toContain('water_test_lab');
    expect(consumer).not.toContain('water_test_date');
    expect(consumer).not.toContain('water_test_lab');
  });

  it('seed_search_attempts: on PL form, NOT consumer_card', () => {
    const ev = { seed_search_attempts: [{ supplier: 'A' }] };
    expect(resolved('production', 'PL', 'form', ev)).toContain('seed_search_attempts');
    expect(resolved('production', 'PL', 'consumer_card', ev)).not.toContain('seed_search_attempts');
  });

  it('amendment_product_name + amendment_manufacturer: on soil OM modal + form, NOT consumer_card', () => {
    const ev = { amendment_product_name: 'Malibu Compost', amendment_manufacturer: 'Malibu' };
    const modal = resolved('soil_management', 'OM', 'modal', ev);
    const form = resolved('soil_management', 'OM', 'form', ev);
    const consumer = resolved('soil_management', 'OM', 'consumer_card', ev);
    expect(modal).toContain('amendment_product_name');
    expect(modal).toContain('amendment_manufacturer');
    expect(form).toContain('amendment_product_name');
    expect(consumer).not.toContain('amendment_product_name');
    expect(consumer).not.toContain('amendment_manufacturer');
  });
});
