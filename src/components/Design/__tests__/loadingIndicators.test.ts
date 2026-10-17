/**
 * Guards for loading indicators — the two defects found on the Select Your Plan screen
 * (2026-08-31), both of which were invisible to every existing test because a loading state
 * renders no assertable content by definition.
 *
 * DEFECT 1 — a retry control nested inside the loading branch.
 *
 *   {loading ? (
 *     <VStack>
 *       <CircularProgress isIndeterminate />
 *       <Text>Loading plans…</Text>
 *       <StandardButton onClick={refetch} isLoading={loading}>Refresh Pricing</StandardButton>
 *     </VStack>                          ^^^^^^^^^^^^^^^^^^^ unconditionally true HERE
 *
 * `isLoading` is being read as "reflect the page's state", but inside the consequent of
 * `loading ? …` that variable can only ever be `true`. Chakra answers `isLoading` with no
 * `loadingText` by swapping the children out for a spinner AND setting `disabled`, so the
 * screen showed a big spinner, its caption, and beneath it a SECOND spinner sitting in an
 * empty outline box that could never be clicked. Two indicators for one wait, and the retry
 * affordance was destroyed by the very prop meant to decorate it.
 *
 * Retry belongs to the FAILED state, never the in-flight one. The generalised rule: a control
 * rendered only while `X` is true must not also be driven by `X`.
 *
 * DEFECT 2 — `green.500` on a progress indicator.
 *
 * MEASURED: `green.500` #4CAF50 on white is 2.78:1. A spinner is a graphical object carrying
 * the whole meaning of the screen while it turns, so WCAG 1.4.11 asks it for 3.0:1 — it fails
 * the NON-TEXT floor, not merely the 4.5 text one. `.claude/rules/frontend.md` states this
 * ("green.500 is never under white content"), and `StandardPageLoading` / `StandardSpinner`
 * — the components every page is told to reuse — were both shipping it. Several pages that
 * hand-rolled their own loader in `green.700` were more accessible than the shared component.
 *
 * ⚠️ Scope note: this is about the STEP on an indeterminate progress indicator, not about
 * green anywhere. `green.500` remains correct as a decorative fill or tint.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { describe, it, expect } from 'vitest';

const SRC = join(__dirname, '../../..');

// ⚠️ NO extension filter beyond jsx/tsx: trazo-app is a MIXED jsx/tsx tree and a tsx-only
// sweep has produced false "clean" results here before.
const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '__tests__') continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|jsx)$/.test(p)) out.push(p);
  }
  return out;
};

const FILES = walk(SRC);
const rel = (p: string) => relative(SRC, p);

/**
 * Return the substring of `src` that balances the delimiter opened at `openIdx`.
 * Used to carve the consequent out of `{cond ? ( … ) : …}` without a full JSX parse.
 */
const balancedSlice = (src: string, openIdx: number, open: string, close: string): string => {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    if (src[i] === open) depth++;
    else if (src[i] === close) {
      depth--;
      if (depth === 0) return src.slice(openIdx + 1, i);
    }
  }
  // Unbalanced (should not happen in code that compiles) — return the rest so the
  // guard errs toward reporting rather than silently passing.
  return src.slice(openIdx + 1);
};

describe('loading indicators', () => {
  it('never drives a control with the same flag that gates its branch', () => {
    const offenders: string[] = [];

    for (const file of FILES) {
      const src = readFileSync(file, 'utf8');

      // Both gate shapes, with a CONDITION that may be compound:
      //   `{loading ? (`            `{isEdit && isLoadingParcel ? (`
      //   `if (loading) return (`   `if (isEdit && isLoadingParcel) { return (`
      const gates = [
        { re: /\{([^?{}()]{1,120}?)\?\s*\(/g, kind: 'branch' },
        { re: /if\s*\(([^()]{1,120}?)\)\s*\{?\s*return\s*\(/g, kind: 'early return' }
      ];

      for (const { re, kind } of gates) {
        let m: RegExpExecArray | null;
        while ((m = re.exec(src))) {
          const cond = m[1].trim();
          // `{!loading ? (` gates the LOADED branch — not this defect. Only a condition
          // whose truthiness MEANS "in flight" can render a permanently-loading control.
          if (cond.startsWith('!') || !/\b(?:is)?[Ll]oading|[Ff]etching|[Pp]ending\b/.test(cond)) continue;
          const openIdx = m.index + m[0].length - 1;
          const body = balancedSlice(src, openIdx, '(', ')');
          const line = src.slice(0, openIdx).split('\n').length;

          // A literal `true` is the same defect wearing a different hat — AddParcel spelled
          // it `isLoading={true}` rather than naming the flag, which is why the first cut of
          // this guard walked straight past it.
          if (/\bis(?:Loading|Disabled)=\{\s*true\s*\}/.test(body)) {
            offenders.push(`${rel(file)}:${line} — ${kind} gated on \`${cond}\` hardcodes is*={true}`);
            continue;
          }
          // …or it names one of the identifiers the gate itself tests.
          for (const flag of cond.match(/[A-Za-z_$][\w$]*/g) ?? []) {
            const selfDriven = new RegExp(`\\bis(?:Loading|Disabled)=\\{\\s*${flag}\\s*\\}`);
            if (selfDriven.test(body)) {
              offenders.push(`${rel(file)}:${line} — ${kind} gated on \`${cond}\` also passes is*={${flag}}`);
              break;
            }
          }
        }
      }
    }

    expect(offenders, `A control that only renders while a flag is true must not also be driven by that flag — \`isLoading\` there is permanently on, which hides the label and disables the control. Move retry into the error branch.\n${offenders.join('\n')}`).toEqual([]);
  });

  it('never tints a progress indicator with green.500 (2.78:1, under the 3.0 non-text floor)', () => {
    const offenders: string[] = [];

    for (const file of FILES) {
      const src = readFileSync(file, 'utf8');
      // Every identifier in this file that is DECLARED as green.500, so a spinner tinted
      // through a variable is caught too. `.claude/rules/frontend.md`: grep the DECLARATION,
      // not the call site — ModernVerifyEmail hid a page-level <Spinner> behind
      // `const primaryColor = userType === 'producer' ? 'green.500' : …`.
      const green500Vars = new Set(
        [...src.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=[^;\n]*['"]green\.500['"]/g)].map(
          (d) => d[1]
        )
      );

      // `[\s\S]` not `[^>]`: these tags are routinely written across several lines, with the
      // colour prop nowhere near the `<`. A single-line pattern reported them clean.
      const tags = /<(CircularProgress|Spinner|Progress)\b[\s\S]*?\/?>/g;
      let m: RegExpExecArray | null;
      while ((m = tags.exec(src))) {
        const tag = m[0];
        const line = src.slice(0, m.index).split('\n').length;
        const colorProp = /\b(?:color|emptyColor|trackColor|colorScheme)=(?:['"]([^'"]+)['"]|\{\s*([A-Za-z_$][\w$]*)\s*\})/g;
        let c: RegExpExecArray | null;
        while ((c = colorProp.exec(tag))) {
          const [, literal, ident] = c;
          if (literal === 'green.500') {
            offenders.push(`${rel(file)}:${line} — <${m[1]}> on green.500`);
          } else if (ident && green500Vars.has(ident)) {
            offenders.push(`${rel(file)}:${line} — <${m[1]}> on \`${ident}\`, declared green.500`);
          }
        }
      }
    }

    expect(offenders, `A spinner carries the whole meaning of the screen while it turns, so it owes WCAG 1.4.11 its 3.0:1. green.500 measures 2.78:1 on white. Use green.700 (5.13:1).\n${offenders.join('\n')}`).toEqual([]);
  });

  it('keeps the shared loaders on green.700 and announced', () => {
    const src = readFileSync(join(SRC, 'components/Design/StandardComponents.tsx'), 'utf8');
    for (const name of ['StandardPageLoading', 'StandardSpinner']) {
      const start = src.indexOf(`export const ${name} =`);
      expect(start, `${name} is the loader every page is told to reuse — it must exist`).toBeGreaterThan(-1);
      const body = src.slice(start, src.indexOf('\n);', start));
      expect(body, `${name} must use green.700`).toContain('green.700');
      expect(body, `${name} must not use green.500`).not.toContain('green.500');
      // A bare turning ring is announced as nothing; "blank" and "working" must not be
      // indistinguishable to a screen reader.
      expect(body, `${name} must expose a live region`).toContain('role="status"');
    }
  });

  /**
   * DEFECT 3 — the generic "Loading..." line rendered as bare text (Field notes, 2026-10-17).
   *
   * Three loading branches on Field notes and one in Settings printed `app.loading` inside a
   * plain <Text>: no spinner, and no `role="status"`, so a screen reader announced nothing
   * while the page waited. The shared loaders above already solve both; the text was a
   * hand-rolled copy of them that dropped the half you cannot see.
   *
   * The rule: the generic `app.loading` key reaches the screen only as the `label` of
   * `StandardSpinner` or `StandardPageLoading`. Screen-specific keys (`finishProduction.loading`,
   * a button's `loadingText`) are not covered here.
   */
  it('renders the generic app.loading text only through a shared loader', () => {
    const offenders: string[] = [];
    let seen = 0;

    for (const file of FILES) {
      const src = readFileSync(file, 'utf8');
      const uses = /['"]app\.loading['"]/g;
      let m: RegExpExecArray | null;
      while ((m = uses.exec(src))) {
        seen++;
        const line = src.slice(0, m.index).split('\n').length;
        // The nearest tag opened before the key is the one it renders inside.
        const before = src.slice(0, m.index);
        const tag = /<([A-Za-z][\w.]*)\b[^<]*$/.exec(before);
        const ok =
          tag !== null &&
          /^Standard(?:Spinner|PageLoading)$/.test(tag[1]) &&
          /\blabel=\{[^}]*$/.test(tag[0]);
        if (!ok) offenders.push(`${rel(file)}:${line} — app.loading inside <${tag?.[1] ?? '?'}>`);
      }
    }

    // A negative assertion must prove it read something: if the key were renamed, an empty
    // sweep would report every screen clean.
    expect(seen, 'no use of app.loading found; the guard is reading nothing').toBeGreaterThan(0);
    expect(
      offenders,
      `Bare loading text has no spinner and no live region, so a screen reader announces nothing. Use <StandardSpinner label={...} /> (inside a card or section) or <StandardPageLoading label={...} /> (whole page).\n${offenders.join(
        '\n'
      )}`
    ).toEqual([]);
  });
});
