#!/usr/bin/env node
/**
 * Lint gate — fails on NEW lint errors, tolerates the existing backlog.
 *
 * Why this exists (2026-08-12): `npm run lint` was `eslint .` and reported ONE error, so CI
 * recorded "frontend lint ... clean". Both halves of that were false.
 *
 *   1. ESLint 8's `eslint .` defaults to `--ext .js`. It linted 18 of 521 source files.
 *      The 46 .jsx, 224 .ts and 234 .tsx files were never visited.
 *   2. There was no TypeScript parser configured, so once `--ext` was added all 458 TS
 *      files failed with "Parsing error: The keyword 'interface' is reserved" — a parse
 *      error yields zero rule coverage for that file while still exiting the run.
 *
 * Fixing both took the honest count from 1 to 4,133. Same failure mode as the typecheck
 * gate before it: a green gate that checks almost nothing is worse than no gate, because
 * it is quoted as evidence.
 *
 * So: freeze per-file counts, fail when a file gets WORSE or a clean file starts erroring,
 * and let the backlog shrink. ~71% of the backlog is `prettier/prettier` and clears with
 * `--fix`; that is a mechanical sweep for its own commit, not something to bury here.
 *
 *   npm run lint          # gate — CI-safe
 *   npm run lint:baseline # after fixing errors, re-freeze
 *   npm run lint:fix      # prettier/autofixable pass
 *
 * Two known follow-ups, deliberately NOT done here — both would move the baseline and
 * deserve their own commit:
 *
 *   1. `eslint-plugin-react-hooks` is referenced by config but not installed, so ~20 errors
 *      read "Definition for rule 'react-hooks/exhaustive-deps' was not found". Those are
 *      config noise, not code defects — and installing it would also switch on genuine
 *      hook-dependency checking on a React codebase that has never had it.
 *   2. RESOLVED 2026-08-12 — recorded here because the wrong diagnosis is tempting. The
 *      prettier CLI and `eslint-plugin-prettier@3.4.1` appeared to disagree (the CLI split a
 *      line, the plugin demanded it joined). It was NOT a version skew: both resolve the same
 *      prettier 2.8.8 install. The cause was `.prettierrc`'s `jsxBracketSameLine`, deprecated
 *      in prettier 2.4 — the CLI warns and DROPS it, while the plugin passes the raw config
 *      into format() where it is still honoured. Renamed to `bracketSameLine`, which 2.4+ and
 *      3.x both support. Note `.claude/hooks/format.sh` sends prettier's stderr to /dev/null,
 *      which is why the deprecation warning went unseen.
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const BASELINE = join(here, 'lint-baseline.json');
const shouldUpdate = process.argv.includes('--update');

/** Run ESLint over every source extension and bucket error counts by file.
 *  ESLint exits non-zero when there are errors, which is expected — read stdout regardless. */
function collectErrors() {
  let output = '';
  try {
    output = execSync('npx eslint . --ext .js,.jsx,.ts,.tsx -f json', {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024
    });
  } catch (err) {
    output = `${err.stdout || ''}`;
  }

  let results;
  try {
    results = JSON.parse(output);
  } catch {
    console.error('Could not parse ESLint JSON output. Run `npx eslint . --ext .js,.jsx,.ts,.tsx` directly.');
    process.exit(1);
  }

  const counts = {};
  const parseErrors = [];
  for (const r of results) {
    const file = relative(root, r.filePath);
    if (r.errorCount > 0) counts[file] = r.errorCount;
    for (const m of r.messages) {
      // A parse error means this file got NO rule coverage at all — the precise blindness
      // that hid 4,132 errors behind a passing gate. Never baseline-able.
      if (m.severity === 2 && m.ruleId === null && /Parsing error/.test(m.message || '')) {
        parseErrors.push(`${file}:${m.line} ${m.message}`);
      }
    }
  }
  return { counts, parseErrors, total: Object.values(counts).reduce((a, b) => a + b, 0) };
}

const { counts, parseErrors, total } = collectErrors();

if (shouldUpdate) {
  writeFileSync(BASELINE, `${JSON.stringify({ total, counts }, null, 2)}\n`);
  console.log(`Lint baseline updated: ${total} errors across ${Object.keys(counts).length} files.`);
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  console.error(`No baseline at ${BASELINE}. Run: npm run lint:baseline`);
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
const failures = [];

if (parseErrors.length > 0) {
  failures.push(
    `${parseErrors.length} parse error(s) — these files get NO rule coverage:\n` +
      parseErrors.slice(0, 20).map((l) => `    ${l}`).join('\n')
  );
}

for (const [file, count] of Object.entries(counts)) {
  const allowed = baseline.counts[file] ?? 0;
  if (count > allowed) {
    failures.push(`${file}: ${count} errors (baseline ${allowed}) — ${count - allowed} new`);
  }
}

if (failures.length > 0) {
  console.error('Lint gate FAILED\n');
  failures.forEach((f) => console.error(`  ${f}`));
  console.error(`\nTotal: ${total} (baseline ${baseline.total})`);
  console.error('Fix the new errors. Do not run lint:baseline to silence them.');
  process.exit(1);
}

const improved = baseline.total - total;
console.log(`Lint gate PASSED — ${total} known errors, 0 new, 0 parse errors.`);
if (improved > 0) {
  console.log(`${improved} fewer than baseline. Run "npm run lint:baseline" to lock the gain in.`);
}
