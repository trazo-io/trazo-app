/**
 * Run 8 (R8-04, Astra 2026-10-05): a cleanout saved with no fuel read 129 kg CO2e with an
 * "EPA/USDA" badge while its edit preview read 0. Unknown is not zero (Oscar's amendment): a
 * record with nothing to count from shows "Not estimated", and the provenance badge belongs only
 * to a figure computed from recorded inputs.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import enUS from '../../i18n/lang/en-US.json';
import es419 from '../../i18n/lang/es-419.json';
import { isNotEstimated, showsInputsBadge } from '../carbonStatus';

const src = (rel: string) => readFileSync(resolve(process.cwd(), 'src', rel), 'utf8');

describe('reading a served carbon figure', () => {
  it('treats the saved status and the preview flag as not estimated', () => {
    expect(isNotEstimated({ co2e: null, calculation_method: 'not_estimated' })).toBe(true);
    expect(
      isNotEstimated({
        co2e: null,
        not_estimated: true,
        calculation_method: 'optimized_v2_not_estimated'
      })
    ).toBe(true);
    expect(
      isNotEstimated({ co2e: 0, calculation_method: 'zero_emission_biological_service' })
    ).toBe(false);
    expect(isNotEstimated({ co2e: 12.3, calculation_method: 'verified_usda_factors' })).toBe(false);
  });

  it('badges only a positive figure from recorded inputs', () => {
    expect(showsInputsBadge({ co2e: 12.3, usda_factors_based: true })).toBe(true);
    expect(
      showsInputsBadge({
        co2e: 129,
        usda_factors_based: true,
        verification_status: 'area_estimate'
      })
    ).toBe(false);
    expect(showsInputsBadge({ co2e: 0, usda_factors_based: true })).toBe(false);
    expect(showsInputsBadge({ co2e: null, usda_factors_based: true })).toBe(false);
    expect(
      showsInputsBadge({ co2e: null, calculation_method: 'not_estimated', usda_factors_used: true })
    ).toBe(false);
  });
});

describe('every carbon surface uses the same rule', () => {
  it.each([
    'components/Tables/EnhancedTimelineRow.tsx',
    'components/Modals/EventDetailsModal.tsx',
    'components/Events/EnhancedEventDetailModal.tsx',
    'components/Events/CarbonImpactPreview.tsx'
  ])('%s renders "not estimated" through the shared helper', (file) => {
    const code = src(file);
    expect(code).toMatch(/isNotEstimated\(/);
    expect(code).toMatch(/'carbon\.notEstimated'/);
  });

  it('no surface gates the badge on the bare flag any more', () => {
    for (const file of [
      'components/Tables/EnhancedTimelineRow.tsx',
      'components/Modals/EventDetailsModal.tsx',
      'components/Events/EnhancedEventDetailModal.tsx'
    ]) {
      const code = src(file);
      expect(code, file).toMatch(/showsInputsBadge\(/);
      expect(code, file).not.toMatch(/\{\(?carbonData\.usda_factors_based \|\|/);
      expect(code, file).not.toMatch(/\{event\.carbon_data\.usda_factors_used && \(/);
    }
  });
});

describe('the badge names no agency for the whole figure', () => {
  it.each([
    ['en-US', enUS],
    ['es-419', es419]
  ])('%s', (_l, cat) => {
    const c = cat as Record<string, string>;
    for (const key of ['carbon.badge.epaUsdaSourced', 'carbon.badge.epaUsdaTooltip']) {
      expect(c[key], key).not.toMatch(/EPA\s*\/\s*USDA/);
    }
    expect(c['carbon.notEstimated']).toBeTruthy();
    expect(c['carbon.notEstimatedHint']).toBeTruthy();
  });
});

describe('review of app #83', () => {
  it('the QR loader carries no standalone source or "Sustainable" claim', () => {
    const loader = src('views/Scan/ProductDetail/components/ModernTrazoLoader.tsx');
    expect(loader).not.toMatch(/carbon\.badge\.epaUsdaSourced|usdaBadge\.epaUsdaSourced/);
    expect(loader).not.toMatch(/>\s*Sustainable\s*</);
    expect(loader).toMatch(/consumer\.loader\.growerRecords/);
  });

  it('the not-estimated sentence wraps on a phone instead of spilling past the card', () => {
    const row = src('components/Tables/EnhancedTimelineRow.tsx');
    const at = row.indexOf("'carbon.notEstimated'");
    const open = row.lastIndexOf('<Text', at);
    expect(at).toBeGreaterThan(-1);
    expect(row.slice(open, at)).not.toMatch(/nowrap/);
  });
});
