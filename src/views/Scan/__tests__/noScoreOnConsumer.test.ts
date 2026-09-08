/**
 * Compliance guard — no self-assigned sustainability grade on any consumer surface.
 *
 * The transparency/carbon score is a PRODUCER-dashboard KPI. Rendering it, or any verdict,
 * badge, letter grade or colour scale derived from it, on a public page is the self-created
 * sustainability-label class banned by EU ECGT Directive 2024/825 (live 2026-09-27) and an
 * FTC 16 CFR 260.4 general-benefit risk. See .claude/rules/transparency-first.md and
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
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// The graph walk is shared with the producer guard (`views/Dashboard/__tests__`). Keeping ONE
// copy is deliberate — see that module's header.
import {
  SRC,
  collectSourceFiles,
  reachableFrom,
  stripComments
} from '../../../test-utils/importGraph';

/**
 * Authenticated consumer surfaces — routed under the `consumer.*` subdomain (see App.tsx's
 * `AdminConsumerLayout`: impact / journey / education / profile / settings).
 *
 * 🔴 These live under `src/views/Dashboard/`, which the producer-reachability subtraction
 * below treats as "the producer tree". For as long as that subtraction ran unqualified, every
 * authenticated consumer screen was subtracted out and NEVER SCANNED — which is how
 * ImpactDashboard shipped a hero metric card literally labelled "Avg Transparency Score", and
 * CarbonJourney shipped a green/blue/gray tier badge, past a green guard (2026-08-06).
 *
 * This is the third time one root cause produced a consumer claim leak: a login does not make
 * a consumer claim safe. The A+–F carbon grade survived two earlier sweeps for the same reason
 * (its endpoints were IsAuthenticated, so the anonymous-surface sweep never saw them).
 * Being behind auth changes who reads the claim, not whether ECGT 2024/825 covers it.
 */
const CONSUMER_DASHBOARD_ROOTS = [
  join(SRC, 'views', 'Dashboard', 'ImpactDashboard'),
  join(SRC, 'views', 'Dashboard', 'CarbonJourney'),
  join(SRC, 'views', 'Dashboard', 'EducationDashboard'),
  join(SRC, 'views', 'Dashboard', 'ConsumerProfile'),
  join(SRC, 'views', 'Consumer')
];

/**
 * Entry points that render to a consumer surface.
 * `views/Scan/**` is the public/anonymous route tree; `components/QR/**` is its component
 * library; `CONSUMER_DASHBOARD_ROOTS` are the logged-in shopper screens.
 */
const CONSUMER_ROOTS = [
  join(SRC, 'views', 'Scan'),
  join(SRC, 'components', 'QR'),
  ...CONSUMER_DASHBOARD_ROOTS
];

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

  // The producer tree is views/Dashboard MINUS the consumer screens that happen to live inside
  // it. Seeding those as producer roots is what made them invisible — they would reach
  // themselves, land in `producer`, and get subtracted from their own scan.
  const consumerDashboardFiles = new Set(CONSUMER_DASHBOARD_ROOTS.flatMap(collectSourceFiles));
  const producerRoots = collectSourceFiles(join(SRC, 'views', 'Dashboard')).filter(
    (f) => !consumerDashboardFiles.has(f)
  );
  const producer = reachableFrom(producerRoots);
  const scanned = [...consumer].filter((f) => !producer.has(f));

  // A consumer screen is scanned unconditionally. Even if some producer screen transitively
  // imports one, the file still renders to a shopper, and the subtraction must never be able
  // to drop it.
  for (const abs of consumerDashboardFiles) {
    if (!scanned.includes(abs)) scanned.push(abs);
  }

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
    // "Transparency Score" was absent from this list for as long as the guard only saw
    // ANONYMOUS pages, where the label never appears. Once the authenticated consumer
    // dashboards came into scope it turned out ImpactDashboard renders it as a hero metric.
    // The score is a producer KPI; naming it to a shopper is the label ECGT 2024/825 bans.
    name: 'rendered transparency-score label',
    pattern: /["'`][^"'`\n]*\bTransparency\s+Score\b/i,
    reason:
      'the transparency score is a PRODUCER-dashboard KPI — showing a shopper a number Trazo ' +
      'assigned to a farm is a self-created sustainability label (ECGT 2024/825)'
  },
  {
    // The ladder shape again, but keyed on the OUTPUT rather than the threshold operator.
    // CarbonJourney derived high/medium/low from an event COUNT (so the `score >= NN` rule
    // above never matched) and rendered it as a green/blue/gray badge — a wordless grade.
    name: 'transparency tier ladder',
    pattern: /transparencyLevel|transparency_score_avg/,
    reason:
      'bucketing a farm into high/medium/low grades it, even when the only output is a badge ' +
      'colour; consumer surfaces show counts and facts, never a derived tier'
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
