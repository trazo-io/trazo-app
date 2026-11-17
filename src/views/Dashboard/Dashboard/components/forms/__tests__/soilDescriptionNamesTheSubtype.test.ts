/**
 * A soil record saved with no observation is described by the subtype the grower picked.
 *
 * Found 2026-10-24 logging compost on two parcels: the fallback was "Soil Testing" for every
 * subtype, so an organic matter record was stored as "Soil management event: Soil Testing".
 * The labels are the backend's own (`SOIL_TYPE_CHOICES`), read from the sibling repo.
 *
 * trazo-back's `history/models.py` became the package `history/models/` (back #464); this guard
 * still read the single file and failed with "not found" on every PR (app #409 moved the others to
 * `historyModelsSource`, which reads either shape).
 */
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import { historyModelsSource } from '../../../../../../test-utils/backendHistoryModels';
import { SOIL_TYPE_LABELS, soilDescriptionFallback } from '../SoilManagementTab';

const BACKEND = join(__dirname, '../../../../../../../../trazo-back');

/** `SOIL_TYPE_CHOICES = [(CONSTANT, "Label"), ...]` resolved to `{ code: label }`. */
const backendLabels = (): Record<string, string> => {
  const src = historyModelsSource(BACKEND);
  const block = /SOIL_TYPE_CHOICES\s*=\s*\[([\s\S]*?)\n    \]/.exec(src);
  if (!block) throw new Error('could not find SOIL_TYPE_CHOICES in the history models');
  return Object.fromEntries(
    [...block[1].matchAll(/\(\s*([A-Z_]+)\s*,\s*"([^"]+)"\s*\)/g)].map(([, name, label]) => {
      const decl = new RegExp(`^\\s{4}${name}\\s*=\\s*"([A-Z]{2})"`, 'm').exec(src);
      if (!decl) throw new Error(`SOIL_TYPE_CHOICES names ${name}, which has no "XX" constant`);
      return [decl[1], label];
    })
  );
};

describe('soil description fallback', () => {
  it('names the subtype picked, not "Soil Testing"', () => {
    expect(soilDescriptionFallback({ type: 'OM', name: '' })).toBe(
      'Soil management event: Organic Matter Addition'
    );
    expect(soilDescriptionFallback({ type: 'TI' })).toBe('Soil management event: Tillage');
  });

  it("keeps the grower's own event name when there is one", () => {
    expect(soilDescriptionFallback({ type: 'OM', name: 'Spring compost' })).toBe(
      'Soil management event: Spring compost'
    );
  });

  it("uses the backend's label for every subtype", () => {
    const backend = backendLabels();
    expect(Object.keys(backend).length).toBeGreaterThan(8);
    expect(SOIL_TYPE_LABELS).toEqual(backend);
  });
});
