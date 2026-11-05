/**
 * A trace reads as rows, not a stack of boxes; and on the reviewer's link it grades nothing
 * (2026-11-04).
 *
 * Before: every missing link was a cream StandardAlert slab with an orange edge and its own
 * outline button, and every pick, input, sale, match and storage location a bordered box inside
 * its card. One random sale on the specimen farm rendered 20+ boxes. Oscar rejected that exact
 * slab ("the color", "the position of the buttons") and chose rows with hairlines and a tinted
 * status circle for the farm-home readiness card; this is the same call for the traceback.
 *
 * And the certifier's copy of the same chain carried warning amber (the gap slab, the "17 links
 * not recorded" pill, "not attached" chips). A certifier surface states what is missing; it does
 * not grade it (readinessIsNotAVerdict.test.tsx, #257).
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const code = (p: string) =>
  read(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

const LISTS = [
  'src/components/Traceback/TraceChain.tsx',
  'src/components/Traceback/OnHandByLocation.tsx',
  'src/views/Dashboard/Traceback/index.tsx',
  'src/views/CertifierReview/ReviewTraceback.tsx'
];
const CHAIN = code('src/components/Traceback/TraceChain.tsx');

describe('a trace is rows, not boxes', () => {
  it('reads the files (guards the guard)', () => {
    for (const f of LISTS) expect(code(f).length, f).toBeGreaterThan(2_000);
    expect(CHAIN).toMatch(/const gapsFor = /);
  });

  it('draws no bordered box per item in any traceback list', () => {
    for (const f of LISTS) {
      // An item box is a 1px border with a radius; cards come from StandardCard, rules from
      // TraceRows / StatusList.
      expect(code(f), f).not.toMatch(/borderWidth="1px"[\s\S]{0,80}borderRadius="md"/);
    }
    for (const f of LISTS.slice(1)) expect(code(f), f).toMatch(/<TraceRows>/);
    expect(CHAIN.match(/<TraceRows>/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
  });

  it('states each missing link as a StatusRow, not a warning slab', () => {
    expect(CHAIN).not.toMatch(/StandardAlert/);
    const gaps = CHAIN.slice(CHAIN.indexOf('const gapsFor = '), CHAIN.indexOf('const pickCard'));
    expect(gaps).toMatch(/<StatusList>/);
    expect(gaps).toMatch(/<StatusRow/);
    expect(gaps).toMatch(/testId="trace-gap"/);
  });

  it("grades nothing on the reviewer's link", () => {
    // Warning tone exists only where the operation can fix it (fixPath => forOperation).
    expect(CHAIN).toMatch(/tone=\{forOperation \? 'warn' : 'neutral'\}/);
    expect(CHAIN).toMatch(/variant=\{forOperation \? 'warning' : 'neutral'\}/);
    // Missing identifiers on the reviewer's input rows (only rendered there): neutral, always.
    const missing = CHAIN.slice(CHAIN.indexOf('missingOnRow(r).map('));
    expect(missing.slice(0, 400)).toMatch(/variant="neutral"/);
    expect(missing.slice(0, 400)).not.toMatch(/variant="warning"/);
  });
});
