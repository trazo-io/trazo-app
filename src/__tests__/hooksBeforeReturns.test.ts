/**
 * No React hook may sit below a conditional return, anywhere in the app.
 *
 * WHY THIS IS A REPO-WIDE GUARD AND NOT A LINT SUGGESTION
 * ------------------------------------------------------
 * Violating this does not warn — it destroys the page. React counts hooks per render, so a
 * render that takes an early branch registers fewer of them and the next render tears the
 * subtree down: "Rendered fewer hooks than expected", surfaced to the operator as the error
 * boundary's "We hit a snag loading this page".
 *
 * Three instances were live on 2026-08-31, none of them caught by clicking through the app:
 *
 *   AddParcel           a useEffect below the `isLoadingParcel` guard. Crashed every COLD load
 *                       of /farm/:id/parcel/:id/change — a refresh while editing, a bookmark, a
 *                       new tab. In-app navigation never showed it because RTK already had the
 *                       parcel cached, so the guard never fired.
 *   DashboardView       an early return that also performed `window.location.href = …` DURING
 *                       RENDER, above eight hooks. Any company without a subscription flipped
 *                       the condition as `activeCompany` resolved, and the whole dashboard was
 *                       replaced by the error boundary.
 *   EducationalTooltip  four useColorModeValue calls below an `if (!config)` guard, so a known
 *                       term rendered five hooks and an unknown one rendered one.
 *
 * The shared shape is a condition that is FALSE on first render and TRUE later (or the reverse)
 * as async state resolves. That is the normal life of every page in this app, which is why
 * "it works when I click to it" is not evidence.
 *
 * WHY STATIC
 * ----------
 * Reproducing any of these needs a query to report one state on one render and another on the
 * next, with router, store and cache in play. The rule is visible in the source; reading it is
 * cheaper and harder to fake than staging the race.
 *
 * ⚠️ THE SCANNER ITSELF WAS WRONG THREE TIMES BEFORE IT WAS RIGHT.
 * Each mistake produced confident false positives, so each fix is pinned by a test below:
 *
 *   1. FILE-scoped, not COMPONENT-scoped. It flagged OSPModuleWizard, where the guard was in
 *      `QuestionField` and the "offending" hooks were in `AnswerRow` — a different component in
 *      the same file.
 *   2. Comment stripping DELETED lines, so every reported line number was shifted. That
 *      invented a finding in Commercial/index.tsx that did not exist.
 *   3. Custom hooks were not treated as scope boundaries. `useTypeAwareFields` starts with a
 *      lowercase "u", so its useCallbacks were attributed to the component declared above it.
 *
 * A guard that cries wolf gets deleted, so the scanner's own correctness is part of the test.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { globSync } from 'glob';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '..');

/**
 * Blank comments IN PLACE. Deleting them shifts every subsequent line number, which is how
 * mistake (2) above produced a finding in a file that had none.
 */
export const blankComments = (source: string): string[] => {
  const out: string[] = [];
  let inBlock = false;
  for (const line of source.split('\n')) {
    if (inBlock) {
      out.push('');
      if (line.includes('*/')) inBlock = false;
      continue;
    }
    const trimmed = line.trim();
    if (trimmed.startsWith('/*')) {
      if (!line.includes('*/')) inBlock = true;
      out.push('');
      continue;
    }
    if (trimmed.startsWith('//')) {
      out.push('');
      continue;
    }
    out.push(line);
  }
  return out;
};

/**
 * A top-level scope boundary: a component (Uppercase) OR a custom hook (use + Uppercase).
 * Omitting custom hooks was mistake (3) — their bodies got attributed to the component above.
 */
const DECL = /^(?:export\s+)?(?:default\s+)?(?:const|function)\s+((?:[A-Z]|use[A-Z])\w*)\s*[:=(]/;
const DEFAULT_FN = /^export\s+default\s+function\s+(\w+)\s*\(/;
/** A hook call at component-body indentation. */
const HOOK = /^\s{2}(?:const\s+.*=\s*)?use[A-Z]\w*\s*[(<]/;

interface Violation {
  file: string;
  scope: string;
  guardLine: number;
  hooks: string[];
}

export const scanFile = (relPath: string, source: string): Violation[] => {
  const lines = blankComments(source);
  const decls: Array<[number, string]> = [];
  lines.forEach((line, i) => {
    const m = DECL.exec(line) ?? DEFAULT_FN.exec(line);
    if (m) decls.push([i, m[1]]);
  });

  const violations: Violation[] = [];
  decls.forEach(([start, name], idx) => {
    const end = idx + 1 < decls.length ? decls[idx + 1][0] : lines.length;
    const body = lines.slice(start, end);
    if (!body.some((l) => HOOK.test(l))) return; // not a hook-using scope

    // First conditional return inside THIS scope: a `return` nested in a body-level `if`.
    let guard = -1;
    for (let i = 0; i < body.length && guard === -1; i += 1) {
      if (!/^\s{2}if\s*\(/.test(body[i])) continue;
      for (let j = i + 1; j < Math.min(i + 16, body.length); j += 1) {
        if (/^\s{4}return\b/.test(body[j])) {
          guard = j;
          break;
        }
        if (/^\s{2}\}/.test(body[j])) break;
      }
    }
    if (guard === -1) return;

    const hooks = body
      .slice(guard + 1)
      .map((line, i) => ({ line, n: start + guard + 2 + i }))
      .filter(({ line }) => HOOK.test(line))
      .map(({ line, n }) => `line ${n}: ${line.trim()}`);

    if (hooks.length) {
      violations.push({ file: relPath, scope: name, guardLine: start + guard + 1, hooks });
    }
  });
  return violations;
};

const FILES = globSync('**/*.{tsx,jsx}', { cwd: SRC, ignore: ['**/__tests__/**'] });

describe('every React hook is called before any conditional return', () => {
  it('scans a meaningful portion of the app', () => {
    // Anti-vacuity. A glob that silently matches nothing, or a HOOK regex that stops matching
    // after a formatting change, would make this whole file pass while checking zero code.
    expect(FILES.length).toBeGreaterThan(200);
    // Split first: HOOK is ^-anchored and carries no /m flag, so testing it against a whole
    // multi-line file only ever matches at offset 0. This assertion caught exactly that.
    const withHooks = FILES.filter((f) =>
      readFileSync(join(SRC, f), 'utf8')
        .split('\n')
        .some((line) => HOOK.test(line))
    );
    expect(withHooks.length, 'the hook matcher found nothing — it has drifted').toBeGreaterThan(
      100
    );
  });

  it('finds conditional returns where they exist', () => {
    // The other half of anti-vacuity: if the GUARD matcher stopped matching, every file would
    // report "no early return" and the suite would pass without examining anything.
    const anyGuard = FILES.some((f) => {
      const lines = blankComments(readFileSync(join(SRC, f), 'utf8'));
      return lines.some(
        (l, i) =>
          /^\s{2}if\s*\(/.test(l) &&
          lines.slice(i + 1, i + 16).some((n) => /^\s{4}return\b/.test(n))
      );
    });
    expect(anyGuard, 'the conditional-return matcher found none anywhere — it has drifted').toBe(
      true
    );
  });

  it('reports no hook below a conditional return', () => {
    const violations = FILES.flatMap((f) => scanFile(f, readFileSync(join(SRC, f), 'utf8')));
    const report = violations
      .map(
        (v) =>
          `\n  ${v.file} -> ${v.scope}()  guard at line ${v.guardLine}\n    ${v.hooks.join(
            '\n    '
          )}`
      )
      .join('');
    expect(
      violations,
      `hooks below a conditional return:${report}\n\n` +
        'React counts hooks per render. A render that takes the early branch registers fewer ' +
        'of them, and the next render tears the tree down ("Rendered fewer hooks than ' +
        'expected"). Move every hook above every return.'
    ).toEqual([]);
  });
});

describe('the scanner itself', () => {
  // Each case is a mistake this scanner actually made. Without these, a future "simplification"
  // reintroduces confident false positives and the guard gets switched off.

  it('is component-scoped, not file-scoped', () => {
    const source = [
      'const Inner = ({ x }: P) => {',
      '  const a = useMemo(() => x, [x]);',
      '  if (!x) {',
      '    return null;',
      '  }',
      '  return <div>{a}</div>;',
      '};',
      '',
      'const Outer = () => {',
      '  const b = useIntl();',
      '  return <Inner x={b} />;',
      '};'
    ].join('\n');
    expect(scanFile('f.tsx', source)).toEqual([]);
  });

  it('treats a custom hook as its own scope', () => {
    const source = [
      'const Widget = () => {',
      '  const a = useIntl();',
      '  if (!a) {',
      '    return null;',
      '  }',
      '  return <div />;',
      '};',
      '',
      'export const useThing = (id: string) => {',
      '  const cb = useCallback(() => id, [id]);',
      '  return cb;',
      '};'
    ].join('\n');
    expect(scanFile('f.tsx', source)).toEqual([]);
  });

  it('keeps line numbers true when comments precede the hook', () => {
    const source = [
      'const Widget = () => {',
      '  const a = useIntl();',
      '  if (!a) {',
      '    return null;',
      '  }',
      '  // a comment',
      '  /* and a',
      '     block one */',
      '  const b = useToast();',
      '  return <div />;',
      '};'
    ].join('\n');
    const [v] = scanFile('f.tsx', source);
    expect(v.hooks[0]).toContain('line 9');
  });

  it('does catch the real thing', () => {
    const source = [
      'const Widget = () => {',
      '  const a = useIntl();',
      '  if (!a) {',
      '    return null;',
      '  }',
      '  const b = useToast();',
      '  return <div />;',
      '};'
    ].join('\n');
    const [v] = scanFile('f.tsx', source);
    expect(v.scope).toBe('Widget');
    expect(v.hooks).toHaveLength(1);
  });
});
