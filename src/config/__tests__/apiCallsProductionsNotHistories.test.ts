/**
 * The app calls `productions/`, never `histories/` (2026-11-15).
 *
 * The backend model is `Production` (history 0264). The API served it as `histories/`; back #438
 * added `productions/` beside it, plus `current_production/` and `finish_production/` on parcels,
 * and this app moved every call over. A later backend PR deletes the old names. A call written
 * against an old name after this point would work until that PR deploys, then 404 in production
 * with nothing in CI to say why. This test is that signal.
 *
 * Comments are blanked first: notes that describe past incidents may still quote the old path.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '../..');

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '__tests__') continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(p) && !/\.(test|spec)\.[jt]sx?$/.test(p)) out.push(p);
  }
  return out;
};

/** Blank comments, keeping newlines so a hit reports its real line. */
const codeOf = (abs: string) =>
  readFileSync(abs, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^(\s*)\/\/.*$/gm, '$1');

const OLD_PATHS = [/(?<![A-Za-z_-])histories\//, /\/current_history\//, /\/finish_history\//];

describe('the app calls the API by the model name', () => {
  const files = walk(SRC);

  it('reads the source tree it is about', () => {
    expect(files.length).toBeGreaterThan(500);
    const backend = codeOf(join(SRC, 'config/backend.ts'));
    expect(backend).toContain('productions/');
    expect(backend).toContain('/current_production/');
    expect(backend).toContain('/finish_production/');
  });

  it('has no call left on histories/, current_history/ or finish_history/', () => {
    const hits: string[] = [];
    for (const file of files) {
      codeOf(file)
        .split('\n')
        .forEach((line, i) => {
          if (OLD_PATHS.some((re) => re.test(line))) {
            hits.push(`${relative(SRC, file)}:${i + 1}: ${line.trim()}`);
          }
        });
    }
    expect(hits).toEqual([]);
  });
});
