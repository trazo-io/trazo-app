/**
 * A soil-management subtype default may set a UNIT; it may never set a MEASUREMENT.
 *
 * Found 2026-08-21 on the Calapooia Bend rehearsal: picking "pH Adjustment" prefilled a 20 cm
 * working depth and "Soil Testing" 30 cm. The farmer never typed either, both reached the record,
 * and the sulfur she described as "not incorporated" printed as incorporated to 20 cm. The LA
 * subtype had already been fixed the same way for leaf samples; this pins the rule for all of them.
 */
import { describe, expect, it } from 'vitest';

import { SOIL_MEASUREMENT_FIELDS, getSoilManagementDefaults } from '../SoilManagementTab';

const SUBTYPES = ['ST', 'PA', 'CC', 'OM', 'TI', 'CO', 'GR', 'HD', 'NS', 'LA'];

describe('soil subtype defaults', () => {
  it('lists depth among the fields a subtype switch must not fill', () => {
    expect(SOIL_MEASUREMENT_FIELDS).toEqual(
      expect.arrayContaining([
        'area_covered',
        'soil_ph',
        'organic_matter_percentage',
        'soil_texture',
        'depth'
      ])
    );
  });

  it.each(SUBTYPES)('%s carries no measurement value', (subtype) => {
    const d = getSoilManagementDefaults(subtype) as Record<string, unknown>;
    for (const field of SOIL_MEASUREMENT_FIELDS) {
      const v = d[field];
      expect(v === undefined || v === '', `${subtype}.${field} = ${String(v)}`).toBe(true);
    }
  });
});
