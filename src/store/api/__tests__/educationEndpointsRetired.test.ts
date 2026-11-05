/**
 * The carbon/education/* client stays deleted (2026-11-05).
 *
 * trazo-back deleted those five routes and the service behind them: they served any signed-in
 * account "Why USDA-Based Calculations Are More Trustworthy" with invented study counts, a stale
 * 0.39 grid factor and "carbon footprint" copy (guard there:
 * carbon/tests/test_retired_claim_routes_stay_retired.py). Here, their hooks and the three
 * components that called them (CarbonImpactVisualizer, TrustComparisonWidget, the shared
 * EducationModal) were mounted nowhere: the shopper page renders its own static modal. Along with
 * them went ModernSidebar, exported and never imported, carrying a "+100 pts" badge.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vitest';

const SRC = resolve(process.cwd(), 'src');
const files = (dir: string, out: string[] = []): string[] => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(e) && !/__tests__|\.test\./.test(p)) out.push(p);
  }
  return out;
};
const ALL = files(SRC).map((f) => [f, readFileSync(f, 'utf8')] as const);

describe('carbon/education client stays deleted', () => {
  it('reads the source (guards the guard)', () => {
    expect(ALL.length).toBeGreaterThan(500);
  });

  it('calls no carbon/education/* route', () => {
    const hits = ALL.filter(([, s]) => /carbon\/education\//.test(s)).map(([f]) => f);
    expect(hits).toEqual([]);
  });

  it.each([
    'components/Education/CarbonImpactVisualizer.tsx',
    'components/Education/TrustComparisonWidget.tsx',
    'components/Education/EducationModal.tsx',
    'views/Scan/ProductDetail/components/ModernSidebar.tsx'
  ])('%s stays deleted', (f) => {
    expect(existsSync(join(SRC, f))).toBe(false);
  });
});
