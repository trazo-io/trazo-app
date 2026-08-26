/**
 * Required markers must be honest — 2026-08-25 audit.
 *
 * Three failure shapes were live across the seven event forms:
 *  1. `required` props over `.optional()` schema keys (decorative asterisks) —
 *     production area/equipment fields, chemical & pest summary periods, RUP cert;
 *  2. `isRequired` props StandardField silently drops (11 sites) — every summary
 *     mode could save completely empty;
 *  3. schema-required fields with no visible error binding — blanking a unit made
 *     submit fail with no message anywhere.
 *
 * These are source-level pins: cheap, and they fail loudly when a shape returns.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const FORMS = join(__dirname, '..');
const read = (name: string) => readFileSync(join(FORMS, name), 'utf-8');

describe('required markers are honest', () => {
  it('no form uses the dead isRequired prop (StandardField only knows `required`)', () => {
    for (const file of [
      'ProductionTab.jsx',
      'ChemicalTab-ENHANCED.jsx',
      'SoilManagementTab.jsx',
      'PestManagementTab.jsx',
      'WeatherTab.jsx',
      'BusinessTab-SIMPLIFIED.jsx',
      'GeneralTab.jsx'
    ]) {
      expect(read(file), `${file} uses isRequired`).not.toContain('isRequired');
    }
  });

  it('ProductionTab summary modes and EM operation type are schema-enforced', () => {
    const src = read('ProductionTab.jsx');
    expect(src).toContain("req('equipment_operation_type'");
    expect(src).toContain("req('yield_total'");
    expect(src).toContain("req('pruning_passes'");
    expect(src).toContain("req('water_volume_total'");
  });

  it('ProductionTab area fields no longer carry a decorative asterisk', () => {
    const src = read('ProductionTab.jsx');
    expect(src).not.toMatch(/id: 'events\.common\.fields\.areaCovered' \}\)\}\n\s+required\b/);
  });

  it('ChemicalTab enforces RUP certification and summary periods in the schema', () => {
    const src = read('ChemicalTab-ENHANCED.jsx');
    expect(src).toContain("req('applicator_certification'");
    expect(src).toContain("req('nitrogen_total_kg'");
    expect(src).toContain("req('active_ingredient_total_kg'");
    // The units the superRefine requires must show their errors.
    expect(src).toContain('error={errors.volume_unit?.message}');
    expect(src).toContain('error={errors.area_unit?.message}');
  });

  it('GeneralTab contamination_source is enforced by zod, not a post-validation setError', () => {
    const src = read('GeneralTab.jsx');
    expect(src).toContain("path: ['contamination_source']");
    // The old manual guard (early return AFTER zod passed → wizard advanced) is gone.
    expect(src).not.toContain("type: 'manual',\n          message: 'Contamination source");
  });

  it('PestManagementTab scouting summary period is schema-enforced', () => {
    const src = read('PestManagementTab.jsx');
    expect(src).toContain("req('event_count', 'How many scouting trips");
  });

  it('shared_with_conventional is rendered outside EM, matching the all-subtype payload', () => {
    const src = read('ProductionTab.jsx');
    expect(src).toContain("{productionType !== 'EM' && (");
    expect(src).toContain('name="shared_with_conventional"');
  });

  it('Transport gets the haul distance field and quantity_returned follows RECORDS_HANDLER', () => {
    const src = read('ProductionTab.jsx');
    expect(src).toContain("{['HA', 'TP'].includes(productionType) && (");
    expect(src).toMatch(/quantity_returned_from_handler:\s*\n\s*RECORDS_HANDLER &&/);
  });
});
