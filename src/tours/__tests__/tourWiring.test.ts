/**
 * Tour wiring guard — the four ways the product tour silently stopped matching the product.
 *
 * WHY THIS EXISTS. Audited 2026-08-16, the tour system had drifted a whole pivot behind the
 * app, and every failure was silent by construction:
 *
 *  1. `Commercial/index.tsx` called `useTour('commercial-dashboard')` — an id that was never
 *     registered. `useTour` looks the id up, gets `undefined`, and returns quietly. Nothing
 *     logged, nothing rendered, for months, on a view that had itself been unrouted.
 *  2. Three welcome tours pointed at "your transparency insights and commercial dashboard"
 *     from the sidebar step. Both pages had been deleted; the copy had not.
 *  3. `tour.transparency.*` and `tour.commercial.*` — 16 strings in both locales for pages
 *     that no longer existed, one of them still publishing the retired producer score's
 *     category weights. The i18n `used-keys` test only catches MISSING keys, never orphans.
 *  4. `tour.farmProfile.*` was the mirror image: copy and both `data-tour` anchors shipped,
 *     with no TourDefinition to drive them, so the tour simply never ran.
 *
 * None of that is caught by tsc, by the build, or by rendering a page — a tour step whose
 * target is absent is DESIGNED to be dropped silently (TourProvider filters to visible
 * targets), which is right at runtime and lethal for maintenance. So it is checked here.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { SRC, collectSourceFiles, stripComments } from '../../test-utils/importGraph';
import { getAllTours, getTour } from '../registry';
// Registers every tour definition as a side effect. Importing the barrel is deliberate:
// a tour file that nobody imports is a tour that never runs, and this makes that visible.
import '../index';

import enMessages from '../../i18n/lang/en-US.json';
import esMessages from '../../i18n/lang/es-419.json';

const SOURCES = collectSourceFiles(SRC);
/**
 * Comments are stripped before anything is matched. Two reasons, both learned here: the note
 * left in the orphaned Commercial view explaining why its `useTour('commercial-dashboard')`
 * call was removed matched as if the call were still there, and `data-tour="transparency-summary"`
 * sits inside a commented-out JSX block on the farm home — an anchor that does not render must
 * not count as one that does.
 */
const READ = new Map<string, string>(
  SOURCES.map((f) => [f, stripComments(readFileSync(f, 'utf8'))])
);
const rel = (f: string) => relative(SRC, f);

/** Every `useTour('some-id')` call site in the app. */
function tourCallSites(): { id: string; file: string }[] {
  const out: { id: string; file: string }[] = [];
  for (const [file, text] of READ) {
    if (file.endsWith(join('hooks', 'useTour.ts'))) continue;
    for (const m of text.matchAll(/useTour\(\s*['"]([^'"]+)['"]/g)) {
      out.push({ id: m[1], file });
    }
  }
  return out;
}

/** Every `data-tour="x"` attribute rendered anywhere in the app. */
function renderedAnchors(): Map<string, string> {
  const out = new Map<string, string>();
  for (const [file, text] of READ) {
    if (file.includes(join('src', 'tours'))) continue; // definitions, not anchors
    for (const m of text.matchAll(/data-tour=["']([^"']+)["']/g)) {
      if (!out.has(m[1])) out.set(m[1], file);
    }
  }
  return out;
}

describe('tour wiring', () => {
  it('every useTour() id resolves to a registered tour', () => {
    const unknown = tourCallSites()
      .filter(({ id }) => !getTour(id))
      .map(({ id, file }) => `${rel(file)} → useTour('${id}')`);

    // This is the `commercial-dashboard` failure. A hook that no-ops on a typo is a hook that
    // will keep no-opping until someone reads the registry by hand.
    expect(unknown).toEqual([]);
  });

  it('every registered tour is started by some page', () => {
    /**
     * A tour counts as started if its id reaches `useTour` — directly, or as the string
     * literal a page passes through a variable. The welcome tours take the second route:
     * `useTourScenario()` picks between 'welcome-fresh' / 'welcome-invited' / 'welcome-viewer'
     * and the farm home calls `useTour(welcomeTourId)`. Matching only the literal argument
     * would report all three as orphans.
     */
    const started = new Set(tourCallSites().map((c) => c.id));
    const referenced = new Set<string>();
    for (const [file, text] of READ) {
      if (file.includes(join('src', 'tours'))) continue;
      // Only files that are part of the tour plumbing count. Scanning every file in `src` for
      // any quoted hyphenated string (the first version of this) would let an unrelated
      // constant somewhere in the app vouch for a tour nothing starts — the guard would then
      // pass on precisely the wiring it exists to check.
      if (!text.includes('useTour')) continue;
      for (const m of text.matchAll(/['"]([a-z0-9-]+)['"]/g)) referenced.add(m[1]);
    }
    const orphanTours = getAllTours()
      .map((t) => t.id)
      .filter((id) => !started.has(id) && !referenced.has(id));

    // The `farm-profile` failure in reverse: a definition nothing calls is dead weight that
    // still reads, in the registry, as covered.
    expect(orphanTours).toEqual([]);
  });

  it('every tour step targets a data-tour attribute that exists in the app', () => {
    const anchors = renderedAnchors();
    const missing: string[] = [];

    for (const tour of getAllTours()) {
      for (const step of tour.steps) {
        const name = step.target.match(/\[data-tour=["']([^"']+)["']\]/)?.[1];
        if (!name) {
          missing.push(`${tour.id}: target "${step.target}" is not a [data-tour=...] selector`);
          continue;
        }
        if (!anchors.has(name)) missing.push(`${tour.id}: no data-tour="${name}" in src`);
      }
    }

    expect(missing).toEqual([]);
  });

  it('every tour step title/content key exists in BOTH locales', () => {
    const en = enMessages as Record<string, string>;
    const es = esMessages as Record<string, string>;
    const missing: string[] = [];

    for (const tour of getAllTours()) {
      for (const step of tour.steps) {
        for (const key of [step.titleKey, step.contentKey]) {
          if (!en[key]) missing.push(`en-US missing ${key} (${tour.id})`);
          if (!es[key]) missing.push(`es-419 missing ${key} (${tour.id})`);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it('no orphaned tour.* strings — copy for a surface that no longer exists', () => {
    /**
     * Referenced either as a literal (`'tour.osp.step1.title'`) or as the static prefix of a
     * template literal (`` `tour.checklist.writer.item${i + 1}` ``), which is how the
     * checklist builds its labels. Both forms are collected from source rather than listed
     * here: a hand-maintained allowlist would be the same class of thing this guard exists
     * to catch.
     */
    const literals = new Set<string>();
    const prefixes: string[] = [];
    for (const text of READ.values()) {
      for (const m of text.matchAll(/['"`](tour\.[A-Za-z0-9_.]+)['"`]/g)) literals.add(m[1]);
      for (const m of text.matchAll(/`(tour\.[A-Za-z0-9_.]*)\$\{/g)) prefixes.push(m[1]);
    }

    const orphans = Object.keys(enMessages as Record<string, string>)
      .filter((k) => k.startsWith('tour.'))
      .filter((k) => !literals.has(k))
      .filter((k) => !prefixes.some((p) => k.startsWith(p)));

    expect(orphans).toEqual([]);
  });

  it('locales agree on which tour.* keys exist', () => {
    const enKeys = Object.keys(enMessages as Record<string, string>).filter((k) =>
      k.startsWith('tour.')
    );
    const esKeys = Object.keys(esMessages as Record<string, string>).filter((k) =>
      k.startsWith('tour.')
    );
    expect(esKeys.sort()).toEqual(enKeys.sort());
  });

  it('tour ids are unique and every tour has at least one step', () => {
    const tours = getAllTours();
    const ids = tours.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(tours.filter((t) => t.steps.length === 0).map((t) => t.id)).toEqual([]);
  });
});
