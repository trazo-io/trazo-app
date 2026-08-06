#!/usr/bin/env node
/**
 * Typecheck gate — fails on NEW type errors, tolerates the existing backlog.
 *
 * Why a baseline instead of a plain `tsc --noEmit`:
 *
 * This codebase is mid-migration from JS to TS and carries ~1,289 pre-existing
 * errors (mostly TS2339 property-on-any, TS7006 implicit-any params, TS7016
 * untyped .js imports). A plain `tsc` gate would be red on every run, so nobody
 * could use it — which is exactly how the codebase ended up with TWO
 * parse-broken files sitting in main. While `SignUpConsumer.tsx` and
 * `authApi.test.ts` could not be parsed, tsc reported only those 10 errors and
 * silently typechecked NOTHING else. `npm run build` stayed green throughout,
 * because Vite/esbuild strips types without checking them.
 *
 * Three real bugs were hiding behind that (2026-08-04): duplicate reducer keys
 * registering the same RTK Query middleware three times, and a duplicate `px`
 * prop that silently dropped mobile padding.
 *
 * So: freeze the current per-file counts, fail when a file gets WORSE or a new
 * file starts erroring, and let the backlog shrink over time.
 *
 *   npm run typecheck          # gate — CI-safe
 *   npm run typecheck:update   # after fixing errors, re-freeze the baseline
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const BASELINE = join(here, 'typecheck-baseline.json');
const shouldUpdate = process.argv.includes('--update');

/** Run tsc and bucket error counts by file. tsc exits non-zero when there are
 *  errors, which is expected — read stdout regardless. */
function collectErrors() {
  let output = '';
  try {
    output = execSync('npx tsc --noEmit', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    output = `${err.stdout || ''}${err.stderr || ''}`;
  }

  const counts = {};
  const structural = [];
  for (const line of output.split('\n')) {
    const match = /^(.+?)\((\d+),(\d+)\): error (TS\d+):/.exec(line);
    if (!match) continue;
    const [, file, , , code] = match;
    counts[file] = (counts[file] || 0) + 1;
    // TS1xxx = syntax, TS17xxx = JSX structure. These are never acceptable:
    // a single one blinds tsc to the rest of the codebase.
    if (/^TS1\d{3}$/.test(code) || /^TS17\d{3}$/.test(code)) {
      structural.push(line.trim());
    }
  }
  return { counts, structural, total: Object.values(counts).reduce((a, b) => a + b, 0) };
}

const { counts, structural, total } = collectErrors();

if (shouldUpdate) {
  writeFileSync(BASELINE, `${JSON.stringify({ total, counts }, null, 2)}\n`);
  console.log(`Baseline updated: ${total} errors across ${Object.keys(counts).length} files.`);
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  console.error(`No baseline at ${BASELINE}. Run: npm run typecheck:update`);
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
const failures = [];

// A syntax/JSX error is fatal regardless of baseline — it suppresses checking
// everywhere else, which is the failure mode this gate exists to prevent.
if (structural.length > 0) {
  failures.push(
    `${structural.length} syntax/JSX error(s) — these stop tsc from checking the rest of the codebase:\n` +
      structural.map((l) => `    ${l}`).join('\n')
  );
}

for (const [file, count] of Object.entries(counts)) {
  const allowed = baseline.counts[file] ?? 0;
  if (count > allowed) {
    failures.push(`${file}: ${count} errors (baseline ${allowed}) — ${count - allowed} new`);
  }
}

if (failures.length > 0) {
  console.error('Typecheck gate FAILED\n');
  failures.forEach((f) => console.error(`  ${f}`));
  console.error(`\nTotal: ${total} (baseline ${baseline.total})`);
  console.error('Fix the new errors. Do not run typecheck:update to silence them.');
  process.exit(1);
}

const improved = baseline.total - total;
console.log(`Typecheck gate PASSED — ${total} known errors, 0 new.`);
if (improved > 0) {
  console.log(`${improved} fewer than baseline. Run "npm run typecheck:update" to lock the gain in.`);
}
