/**
 * Compliance guard — no self-assigned sustainability grade on any consumer surface.
 *
 * The transparency/carbon score is a PRODUCER-dashboard KPI. Rendering it, or any verdict,
 * badge, letter grade or colour scale derived from it, on a public page is the self-created
 * sustainability-label class banned by EU ECGT Directive 2024/825 (live 2026-09-27) and an
 * FTC 16 CFR 260.6 general-benefit risk. See .claude/rules/transparency-first.md and
 * .claude/rules/compliance.md.
 *
 * WHY THIS WALKS THE IMPORT GRAPH: the first version of this guard scanned two fixed
 * directories (`views/Scan`, `components/QR`). It then MISSED two live leaks that lived one
 * import away in `src/components/` — `<CarbonScore>` (a 0-100 dial plus an A+/A/B/C/D/F
 * letter grade) rendered by PublicFarmProfile, and `ConsumerSustainabilityInfo`'s
 * score-tiered verdict ladder ("Excellent Choice", "lower carbon footprint than average").
 * A directory allowlist can only ever catch what someone remembered to list, so the file set
 * is now derived from what the consumer routes actually import, transitively.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const SRC = join(__dirname, '..', '..', '..');

/**
 * Entry points that render to a consumer (QR / public-link) surface.
 * `views/Scan/**` is the public route tree; `components/QR/**` is its component library.
 */
const CONSUMER_ROOTS = [join(SRC, 'views', 'Scan'), join(SRC, 'components', 'QR')];

/**
 * Consumer-facing components that the producer dashboard ALSO imports, so the
 * producer-reachability subtraction would otherwise drop them from the scan.
 * Paths are relative to src/ and are asserted to exist, so a rename fails loudly instead of
 * quietly reducing coverage.
 */
const ALWAYS_SCAN = [
  join('components', 'Events', 'ConsumerEventCard.tsx'),
  join('views', 'Scan', 'ProductDetail', 'components', 'UltraMobileProductionJourney.tsx')
];

const SOURCE_EXT = /\.(ts|tsx)$/;

function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      out.push(...collectSourceFiles(full));
    } else if (SOURCE_EXT.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Resolve an import specifier to a file inside src, or null if it is external. */
function resolveImport(specifier: string, fromFile: string): string | null {
  // Path aliases configured in vitest.config.ts / tsconfig.
  const aliases: Record<string, string> = {
    '@/': join(SRC, ''),
    'components/': join(SRC, 'components'),
    'views/': join(SRC, 'views'),
    'utils/': join(SRC, 'utils'),
    'hooks/': join(SRC, 'hooks'),
    'store/': join(SRC, 'store'),
    'config/': join(SRC, 'config')
  };

  let base: string | null = null;
  if (specifier.startsWith('.')) {
    base = resolve(dirname(fromFile), specifier);
  } else if (specifier.startsWith('src/')) {
    base = join(SRC, specifier.slice('src/'.length));
  } else {
    for (const [prefix, target] of Object.entries(aliases)) {
      if (specifier.startsWith(prefix)) {
        base = join(target, specifier.slice(prefix.length));
        break;
      }
    }
  }
  if (!base) return null; // node_modules / bare package

  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, 'index.ts'),
    join(base, 'index.tsx')
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** Every src file reachable from `roots`, following imports transitively. */
function reachableFrom(roots: string[]): Set<string> {
  const seen = new Set<string>();
  const queue = roots.flatMap(collectSourceFiles);
  // `import x from '…'`, `import '…'`, and `import('…')`.
  const importPattern = /(?:from\s*|import\s*\(?\s*)['"]([^'"]+)['"]/g;

  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);

    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(importPattern)) {
      const target = resolveImport(match[1], file);
      // Only follow into the app's own component/util layers; the store and generated API
      // types carry no rendered copy and would balloon the graph.
      if (target && !seen.has(target) && SOURCE_EXT.test(target)) queue.push(target);
    }
  }
  return seen;
}

/**
 * Files that render ONLY on a consumer surface.
 *
 * Reachability alone is too broad: a shared design-system component or a barrel export
 * (`components/Design/index.ts`) is imported by both trees, and score code inside a
 * producer component is legitimate — the score IS a producer KPI. So subtract everything
 * the dashboard can also reach, leaving the files that exist solely to render public pages.
 * Both of the live leaks this guard was rewritten for (PublicFarmProfile's <CarbonScore>
 * and ConsumerSustainabilityInfo's verdict ladder) sat in consumer-exclusive files.
 */
function consumerOnlyFiles(): string[] {
  const consumer = reachableFrom(CONSUMER_ROOTS);
  const producer = reachableFrom([join(SRC, 'views', 'Dashboard')]);
  const scanned = [...consumer].filter((f) => !producer.has(f));

  // ...plus files whose PRIMARY job is rendering consumer copy even though the dashboard
  // also imports them. Without this the subtraction above silently excluded
  // ConsumerEventCard — the single most important consumer component — because the producer
  // event form previews it through EventPreviewModal. Precision must not cost coverage of
  // the file the whole QR page is made of.
  for (const relPath of ALWAYS_SCAN) {
    const abs = join(SRC, relPath);
    if (!existsSync(abs)) throw new Error(`ALWAYS_SCAN path no longer exists: ${relPath}`);
    if (!scanned.includes(abs)) scanned.push(abs);
  }
  return scanned;
}

/**
 * Strip comments so the explanatory notes left at each removal site — which necessarily
 * quote the banned strings — do not trip the guard.
 */
function stripComments(source: string): string {
  return (
    source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Line comments, including TRAILING ones. The `[^:]` guard keeps `https://` intact —
      // an earlier version only stripped comments at line start, so a trailing
      // "// 100% trust" note was reported as a rendered "/100" grade.
      .replace(/(^|[^:])\/\/.*$/gm, '$1')
  );
}

const BANNED = [
  {
    // Only DISPLAYED "/100" is banned — a JSX interpolation followed by it ({score}/100) or
    // a string literal containing it. Bare `x / 100` arithmetic is legitimate percentage
    // maths and must not trip the guard.
    name: 'rendered "n/100" transparency grade',
    pattern: /\}\s*\/\s*100\b|["'`][^"'`\n]*\/\s*100\b/,
    reason: 'a 0-100 grade is a self-created sustainability label (ECGT 2024/825)'
  },
  {
    name: 'self-created verification badge',
    pattern: /Trazo\s+(Verified|Certified)|Certified\s+by\s+Trazo/i,
    reason: 'compliance.md: "Certified by Trazo" is an UNSAFE claim — Trazo certifies nothing'
  },
  {
    name: 'self-graded completeness verdict',
    pattern: /Fully\s+Documented|100%\s*Transparen/i,
    reason: "a verdict on the farmer's own documentation is a self-assigned grade"
  },
  {
    name: 'graded-score component',
    pattern: /<CarbonScore[\s/>]/,
    reason:
      'CarbonScore renders a letter grade and verdict — a self-created sustainability label. ' +
      'Consumer surfaces show documented facts, not grades'
  },
  {
    name: 'self-assigned sustainability label',
    pattern: /Sustainab(le|ility)\s+(Score|Establishment|Rating|Grade)/i,
    reason:
      'naming the farm or its score "sustainable" is an unqualified general-environmental-' +
      'benefit claim (FTC 16 CFR 260.4) with no third-party basis'
  },
  {
    name: 'eco/green score label',
    pattern: /\b(Eco|Green|Carbon)\s+Score\b/i,
    reason: 'a self-computed environmental grade, whatever it is called, is the banned label class'
  },
  {
    // The ladder shape itself, independent of wording: comparing a score against a
    // hardcoded threshold to pick a verdict, colour or badge. This is what
    // ConsumerSustainabilityInfo and CarbonHeroSection both did.
    name: 'score-threshold verdict ladder',
    pattern: /\b(carbonScore|transparencyScore|score)\s*>=\s*\d{2}/,
    reason:
      'branching on a score threshold grades the farm even when the output is only a colour; ' +
      'consumer surfaces must not derive verdicts from a self-reported score'
  },
  {
    name: 'unsubstantiated comparative claim',
    pattern: /(lower|better|higher)\s+(than\s+)?(average|most|other)\b/i,
    reason:
      'a comparative environmental claim must state its basis and substantiate it ' +
      '(FTC 16 CFR 260.4(c)); Trazo has no benchmark to compare against'
  }
];

describe('consumer surfaces carry no self-assigned sustainability grade', () => {
  const files = consumerOnlyFiles();

  it('reaches beyond the consumer route directories into imported components', () => {
    // Guards against the resolver silently breaking and shrinking the scanned set to the
    // two seed directories — which is how the original version of this guard missed two
    // live leaks. Anchored on ConsumerEventCard: it lives in src/components/ (outside the
    // seed dirs), renders on the consumer QR page, and is not reachable from the dashboard,
    // so it can only appear here if the import walk and the producer subtraction both work.
    // A deliberate FLOOR, not the exact count — the consumer-exclusive set legitimately
    // shrinks when a page is retired (deleting the orphaned /farm/:farmId route took it from
    // 20 to 19). Its only job is to fail loudly if the import walk collapses to nothing,
    // which would make every rule below silently vacuous.
    expect(files.length).toBeGreaterThan(10);
    // CarbonImpactExplainer proves the walk left the seed directories: it lives in
    // src/components/Education/, is reached only by an import from the consumer page, and
    // renders carbon copy — exactly the class this guard exists to police.
    expect(
      files.some((f) => f.includes(join('components', 'Education', 'CarbonImpactExplainer')))
    ).toBe(true);
    // And the always-scan additions must actually be in the set.
    expect(files.some((f) => f.endsWith(join('Events', 'ConsumerEventCard.tsx')))).toBe(true);
  });

  for (const rule of BANNED) {
    it(`has no ${rule.name}`, () => {
      const offenders = files
        .filter((file) => rule.pattern.test(stripComments(readFileSync(file, 'utf8'))))
        .map((file) => relative(SRC, file))
        .sort();

      expect(offenders, `${offenders.join(', ')} — ${rule.reason}`).toEqual([]);
    });
  }
});
