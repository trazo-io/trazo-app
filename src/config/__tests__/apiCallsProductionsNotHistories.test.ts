/**
 * The app calls `productions/`, never `histories/` (2026-11-15).
 *
 * The backend model is `Production` (history 0264). The API served it as `histories/`; back #438
 * added `productions/` beside it, plus `current_production/` and `finish_production/` on parcels,
 * and this app moved every call over. A later backend PR deletes the old names. A call written
 * against an old name after this point would work until that PR deploys, then 404 in production
 * with nothing in CI to say why. This test is that signal.
 *
 * It parses each file with the TypeScript compiler and reads only string and template literals,
 * where a URL has to live. Comments are never literals, so notes about past incidents may keep
 * quoting the old path. An earlier version stripped comments with a regex instead, and the `/*`
 * inside `accept = 'image/*'` opened a fake comment that hid over 400 lines of real code.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

import ts from 'typescript';
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

/** `.js` files in this app may hold JSX, so they parse as JSX. */
const kindOf = (path: string) =>
  path.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : path.endsWith('.ts')
    ? ts.ScriptKind.TS
    : ts.ScriptKind.JSX;

type Literal = { line: number; text: string };

/** Every string literal and every piece of every template literal, with its line. */
const literalsOf = (path: string, source: string): Literal[] => {
  const sf = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, kindOf(path));
  const out: Literal[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isStringLiteralLike(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
      out.push({ line: line + 1, text: node.text });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
};

/**
 * An old route name as a whole path segment: at the start of the literal or after a `/` (and any
 * line break a template wraps at), and at its end or before `/`, `?` or `#`. That covers
 * `histories/1/`, `histories?establishment=`, a bare `'histories'` concatenated with `'/'`, and
 * a relative `'current_history/'`.
 */
const OLD_SEGMENT = /(?:^|\/)\s*(?:histories|current_history|finish_history)(?=$|[/?#])/;
const NEW_SEGMENT = /(?:^|\/)productions(?=$|[/?#])/;

const oldCallsIn = (path: string, source: string) =>
  literalsOf(path, source)
    .filter(({ text }) => OLD_SEGMENT.test(text))
    .map(({ line, text }) => `${path}:${line}: ${JSON.stringify(text)}`);

describe('the detector', () => {
  it('finds the old names in literals and nowhere else', () => {
    const source = [
      "const accept = 'image/*';",
      'fetch(`${API}/histories/${id}/`);',
      'const list = `${ROOT}histories?establishment=${id}`;',
      "const joined = 'histories' + '/' + id;",
      "const rel = 'current_history/';",
      'const multi = `${ROOT}companies/${c}/parcels/${p}/',
      'finish_history/`;',
      '// a note may still say histories/ or current_history/',
      '/* or finish_history/ */',
      'const ok = `${ROOT}productions/${id}/current_production/`;',
      "const words = 'production histories';",
      "const key = 'current_history_id';",
      'const end = 1; // */'
    ].join('\n');
    expect(oldCallsIn('fixture.tsx', source).map((hit) => hit.split(':')[1])).toEqual([
      '2',
      '3',
      '4',
      '5',
      '6'
    ]);
  });
});

describe('the app calls the API by the model name', () => {
  const files = walk(SRC).map((abs) => ({
    rel: relative(SRC, abs),
    source: readFileSync(abs, 'utf8')
  }));

  it('reads the source tree it is about', () => {
    expect(files.length).toBeGreaterThan(500);
    const backend = literalsOf(
      'config/backend.ts',
      readFileSync(join(SRC, 'config/backend.ts'), 'utf8')
    )
      .map(({ text }) => text)
      .join('\n');
    expect(backend).toContain('productions/');
    expect(backend).toContain('/current_production/');
    expect(backend).toContain('/finish_production/');
    // The new name is read as a literal at the call sites that build it outside backend.ts
    // (the export modals, the lot tag, the season plan, amendments). Under 10 would mean the
    // parse is missing code again.
    const filesBuildingNewName = files.filter(({ rel, source }) =>
      literalsOf(rel, source).some(({ text }) => NEW_SEGMENT.test(text))
    );
    expect(filesBuildingNewName.length).toBeGreaterThanOrEqual(10);
  }, 60_000);

  it('has no call left on histories/, current_history/ or finish_history/', () => {
    const hits = files.flatMap(({ rel, source }) => oldCallsIn(rel, source));
    expect(hits).toEqual([]);
  }, 60_000);
});
