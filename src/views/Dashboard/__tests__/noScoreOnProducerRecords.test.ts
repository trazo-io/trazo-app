/**
 * Retirement guard — the transparency score has no producer UI home.
 *
 * WHY THIS EXISTS. The score was removed from producer surfaces SIX times between 2026-08-02 and
 * 2026-08-11: A–F letter grades, then tier badges and the carbon-score fallback, then the farm
 * home, then the parcel profile badge, then the Production quick-stats, and finally the parcel
 * card's "avg score" plus its per-season "%" block. Each pass believed the job was done.
 *
 * The reason it kept coming back is worth stating plainly, because it is not "someone forgot".
 * Every one of those removals justified itself in a code comment with some version of "the score
 * keeps one home, on the transparency page" — and that page WAS NEVER ROUTED.
 * `farm/:farmId/transparency` has always been a redirect back to the farm home. So each pass
 * moved the score to a destination that did not exist, the next pass found it somewhere new, and
 * a live dead-end button ("View Transparency Details") shipped in the middle of it. The page and
 * its component were deleted 2026-08-11.
 *
 * WHAT IS AND IS NOT BANNED. `transparency_score` is still a legitimate backend field: it ships
 * in the parcel-histories payload, `TransparencyCalculator` still computes it, and
 * `SmartUsageCard.getSmartInsights()` still reads it as a GATE on engagement nudges. None of that
 * is a claim. What is banned is RENDERING it — a number, a percentage, a grade, a tier, a
 * threshold-derived colour — on the producer record screens. Banning the identifier outright
 * would fight a field the product still maintains, and a guard that fights its own codebase gets
 * deleted.
 *
 * WHY NOT A COMPLIANCE ARGUMENT. ECGT 2024/825 and FTC 16 CFR 260.6 target CONSUMER claims;
 * `noScoreOnConsumer.test.ts` is the guard for that and it deliberately subtracts the producer
 * tree, on the correct reasoning that the score IS a producer KPI. This guard encodes a
 * different, product decision: under the October recordkeeping pivot a grower's screens answer
 * "am I ready for my renewal inspection", and a self-authored grade on their own season answers
 * nothing. If that decision is ever reversed, update this file deliberately — which is the whole
 * point of writing it down.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { SRC, reachableFrom, stripComments } from '../../../test-utils/importGraph';

/**
 * The producer RECORD surfaces: the parcel page (which carried the last live score), the parcel
 * profile, and the production screens. Scoped narrowly on purpose — this is not "no score
 * anywhere in the producer tree", which would be a different and much larger claim.
 */
const RECORD_ROOTS = [
  join(SRC, 'views', 'Dashboard', 'Parcel'),
  join(SRC, 'views', 'Dashboard', 'Dashboard', 'Parcel'),
  join(SRC, 'views', 'Dashboard', 'Dashboard', 'Production')
];

/**
 * Reachable-from-consumer files are excluded: they are already policed, more strictly, by
 * `views/Scan/__tests__/noScoreOnConsumer.test.ts`. Without this the walk drags the entire QR
 * component library in through the production screens' preview imports, and any finding here
 * would be a duplicate report against a file this guard has no authority over.
 */
const CONSUMER_ROOTS = [
  join(SRC, 'views', 'Scan'),
  join(SRC, 'components', 'QR'),
  join(SRC, 'views', 'Dashboard', 'ImpactDashboard'),
  join(SRC, 'views', 'Dashboard', 'CarbonJourney'),
  join(SRC, 'views', 'Dashboard', 'EducationDashboard'),
  join(SRC, 'views', 'Dashboard', 'ConsumerProfile'),
  join(SRC, 'views', 'Consumer')
];

/** The file that carried the score longest — the anchor for the vacuity check below. */
const ANCHOR = join('views', 'Dashboard', 'Parcel', 'components', 'HistoryCard.jsx');

function recordSurfaceFiles(): string[] {
  const consumer = reachableFrom(CONSUMER_ROOTS);
  return [...reachableFrom(RECORD_ROOTS)].filter((f) => !consumer.has(f));
}

const BANNED = [
  {
    // The label itself, in a string literal — the exact text that stood at
    // HistoryCard.jsx's per-season block until 2026-08-11.
    name: 'rendered transparency-score label',
    pattern: /["'`][^"'`\n]*\bTransparency\s+Score\b/i,
    reason:
      'the score is a backend KPI with no producer screen; a grower asks "am I ready for my ' +
      'inspection", which a self-authored grade does not answer'
  },
  {
    // A score interpolated into JSX and suffixed — `{transparencyScore}%`, the shape the
    // per-season block used after "/100" was taken off it in an earlier pass. Each pass made
    // the grade quieter rather than removing it; this rule keys on the shape, not the volume.
    name: 'score interpolated into rendered output',
    pattern: /\{[^{}\n]*\b[Ss]core\b[^{}\n]*\}\s*(%|\/\s*100)/,
    reason: 'rendering the number IS the grade, whatever punctuation follows it'
  },
  {
    // `{productionStats.avgScore !== null ? … : '--'}` — the aggregate stat, and the shape any
    // reintroduction of it would take.
    name: 'average-score stat',
    pattern: /\bavgScore\b|\baverageScore\b|\bscoreAvg\b/,
    reason:
      'the parcel card averaged the STORED transparency_score column while the farm dashboard ' +
      'recomputed it live — two sources for one number, free to disagree, and they did'
  },
  {
    // Sorting or filtering by a value the screen does not show. Removing the display while
    // leaving "Score: High to Low" in the sort menu ordered the list by an invisible ranking
    // key; that exact defect was fixed here once already, on 2026-08-04.
    name: 'sort or filter by score',
    pattern: /['"]scoreHigh['"]|['"]scoreLow['"]|\bsortableScore\b/,
    reason: 'ordering a list by a number the list does not display looks arbitrary to the user'
  },
  {
    name: 'score-threshold verdict ladder',
    pattern: /\b(transparencyScore|carbonScore|score)\s*>=\s*\d{2}/,
    reason: 'branching on a score threshold grades the season even when the only output is a colour'
  },
  {
    // The tier ladder by name. "Excellent Documentation" was the letter grade spelled out; it
    // came off farm home 2026-08-04 and must not reappear on a record screen.
    name: 'documentation tier verdict',
    pattern: /["'`][^"'`\n]*\b(Excellent|Fully)\s+Documen/i,
    reason: "a verdict on the grower's own records is a self-assigned grade, quietly worded"
  },
  {
    // i18n indirection: the strings above can be reintroduced through a message id without any
    // of the literal patterns matching. The eight score keys deleted 2026-08-11 all had ids of
    // this shape (`parcel.avgScore`, `parcel.transparencyScoreLabel`, `parcel.scoreLabel`).
    name: 'score message id',
    pattern: /id:\s*['"][\w.]*[Ss]core(Label|Avg|High|Low)?['"]/,
    reason:
      'a deleted locale key can be re-added and rendered without any literal string appearing ' +
      'in the component — the guard has to see through formatMessage'
  }
];

describe('producer record surfaces render no transparency score', () => {
  const files = recordSurfaceFiles();

  it('walks the import graph and includes .jsx sources', () => {
    // VACUITY CHECK. Two ways this guard could pass while covering nothing: the walk collapses,
    // or the extension filter drops .jsx. The second is not hypothetical — the shared walk was
    // ts/tsx-only until 2026-08-11, and the file this guard exists for is a .jsx file, so an
    // unmodified copy of the consumer guard would have scanned zero of the relevant code and
    // reported green forever.
    expect(existsSync(join(SRC, ANCHOR))).toBe(true);
    expect(files.some((f) => f.endsWith(ANCHOR))).toBe(true);
    expect(files.length).toBeGreaterThan(10);
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
