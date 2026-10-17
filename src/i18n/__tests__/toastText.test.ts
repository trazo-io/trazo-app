/**
 * Guard: toast text comes from the locale files, and no toast string carries an em dash.
 *
 * MEASURED 2026-10-17 against origin/main. 303 `toast({...})` calls; about 60 title/description
 * values were bare English literals (password reset, invitation setup, field history, QR
 * download, notifications), so a Spanish-speaking crew lead got English toasts. Fifteen
 * locale values used an em dash, and a dozen titles were button labels ("Save Changes") or
 * "Success" instead of what happened.
 *
 * Two rules, both mechanical:
 *
 *   1. A toast `title:` / `description:` is never a string or template literal of user text.
 *      Allowed: `intl.formatMessage(...)`, `t('key')`, variables, and calls that return text
 *      (`apiErrorMessage(err)`). A literal with no letters (`|| ''`) is allowed.
 *   2. No locale value reached from a toast contains "—". Use a colon or a full stop.
 *
 * Both rules are asserted over a counted population, so a regex that stops matching fails the
 * test instead of passing it vacuously.
 *
 * NO extension filter beyond js/jsx/ts/tsx: the tree is mixed jsx/tsx.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { describe, expect, it } from 'vitest';

import en from '../lang/en-US.json';
import es from '../lang/es-419.json';

const SRC = join(__dirname, '../..');

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '__tests__') continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|jsx|ts|js)$/.test(p)) out.push(p);
  }
  return out;
};

const rel = (p: string) => relative(SRC, p).split('\\').join('/');

// TODO(remove): dead files that the toast cleanup slice E deletes (nothing routes to or imports
// them). Delete this list together with the files.
const DEAD_FILES = [
  'components/Forms/StandardProductionForm.tsx',
  'components/Forms/StandardChemicalForm.tsx',
  'components/Forms/MultiStepForm.tsx',
  'views/Dashboard/Dashboard/components/forms/NewCompanyStandardized.tsx',
  'views/Dashboard/Dashboard/components/forms/NewCompany.jsx',
  'views/Dashboard/Dashboard/components/forms/CarbonReportTab.jsx',
  'views/Authentication/SignUp/ConsumerSignUp.tsx',
  'views/Dashboard/Dashboard/Production/UpdateProduction.tsx'
];

// TODO(remove): call sites slice E drops or rewrites. Each entry is `[file, text the offending
// expression contains]`; delete an entry when its toast is removed.
const PENDING_REMOVAL: Array<[string, string]> = [
  ['views/Authentication/Invitation/SetupPassword.tsx', 'Account created successfully!'],
  ['views/Authentication/Invitation/SetupPassword.tsx', 'Welcome to ${'],
  ['views/Authentication/Invitation/AcceptInvitation.tsx', 'Successfully'],
  ['views/Authentication/Invitation/AcceptInvitation.tsx', 'Welcome to ${'],
  ['views/Authentication/Invitation/AcceptInvitation.tsx', "You've been transferred"],
  ['views/Authentication/SignIn/ConsumerSignIn.tsx', 'Welcome back!'],
  ['views/Authentication/SignIn/ConsumerSignIn.tsx', 'Welcome to Trazo!'],
  ['views/Authentication/SignIn/ConsumerSignIn.tsx', 'You have successfully signed in.'],
  ['views/Authentication/SignIn/ConsumerSignIn.tsx', 'Your account has been created'],
  ['components/Upload/TrazoImageUpload.tsx', 'Upload successful'],
  ['views/Dashboard/Dashboard/Production/ProfileProduction.tsx', 'QR Code Ready'],
  ['views/Dashboard/Dashboard/Production/ProfileProduction.tsx', 'Download URL generated'],
  // NewEvent.jsx: `intl.formatMessage(...) || 'Success'` style fallbacks, all in slice E's rewrite.
  ['views/Dashboard/Dashboard/components/forms/NewEvent.jsx', '']
];

const TOAST_CALL = /\b(?:toast|showToast|toastFn)\s*\(\s*\{/g;
const MESSAGE_CALL = /^(?:intl\s*\.\s*)?formatMessage\s*\(|^t\s*\(/;

/** Index of the delimiter that closes the one opened at `open`, skipping strings. */
const balance = (s: string, open: number): number => {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (c === "'" || c === '"' || c === '`') {
      i = skipString(s, i);
      continue;
    }
    if (c === '{' || c === '(' || c === '[') depth++;
    else if (c === '}' || c === ')' || c === ']') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return s.length - 1;
};

/** Index of the closing quote of the string opened at `i` (template `${}` is balanced). */
const skipString = (s: string, i: number): number => {
  const q = s[i];
  for (let j = i + 1; j < s.length; j++) {
    if (s[j] === '\\') j++;
    else if (q === '`' && s[j] === '$' && s[j + 1] === '{') j = balance(s, j + 1);
    else if (s[j] === q) return j;
  }
  return s.length - 1;
};

/** Static (user-visible) text of every literal in `expr`, ignoring message-lookup calls. */
const literalText = (expr: string): string[] => {
  const found: string[] = [];
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (c === "'" || c === '"' || c === '`') {
      const end = skipString(expr, i);
      let body = expr.slice(i + 1, end);
      if (c === '`') {
        let out = '';
        for (let j = 0; j < body.length; j++) {
          if (body[j] === '$' && body[j + 1] === '{') j = balance(body, j + 1);
          else out += body[j];
        }
        body = out;
      }
      found.push(body.replace(/\\./g, ' '));
      i = end;
    } else if (/[A-Za-z_$]/.test(c) && !/[\w$.]/.test(expr[i - 1] ?? ' ')) {
      const m = MESSAGE_CALL.exec(expr.slice(i));
      if (m) i = balance(expr, i + m[0].length - 1);
    }
  }
  return found;
};

/** Top-level `title` / `description` expressions of one toast object literal. */
const textProps = (obj: string): Array<{ name: string; expr: string }> => {
  const inner = obj.slice(1, -1);
  const props: string[] = [];
  let cur = '';
  let depth = 0;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (c === "'" || c === '"' || c === '`') {
      const end = skipString(inner, i);
      cur += inner.slice(i, end + 1);
      i = end;
      continue;
    }
    if (c === '{' || c === '(' || c === '[') depth++;
    if (c === '}' || c === ')' || c === ']') depth--;
    if (c === ',' && depth === 0) {
      props.push(cur);
      cur = '';
    } else cur += c;
  }
  props.push(cur);
  const out: Array<{ name: string; expr: string }> = [];
  for (const p of props) {
    const m = /^\s*(title|description)\s*:\s*([\s\S]*)$/.exec(p);
    if (m) out.push({ name: m[1], expr: m[2].trim() });
  }
  return out;
};

interface ToastCall {
  file: string;
  line: number;
  body: string;
  props: Array<{ name: string; expr: string }>;
}

const FILES = walk(SRC)
  .map((p) => ({ file: rel(p), text: readFileSync(p, 'utf8') }))
  .filter((f) => !DEAD_FILES.includes(f.file));

const CALLS: ToastCall[] = [];
for (const { file, text } of FILES) {
  for (const m of text.matchAll(TOAST_CALL)) {
    const open = m.index! + m[0].length - 1;
    const body = text.slice(open, balance(text, open) + 1);
    CALLS.push({
      file,
      line: text.slice(0, m.index).split('\n').length,
      body,
      props: textProps(body)
    });
  }
}

const isExempt = (file: string, expr: string) =>
  PENDING_REMOVAL.some(([f, needle]) => f === file && expr.includes(needle));

describe('toast text comes from the locale files', () => {
  it('scans a meaningful number of toast calls (no vacuous pass)', () => {
    expect(CALLS.length).toBeGreaterThanOrEqual(250);
    expect(CALLS.reduce((n, c) => n + c.props.length, 0)).toBeGreaterThanOrEqual(400);
  });

  it('no toast title or description is a literal of user text', () => {
    const offenders: string[] = [];
    for (const c of CALLS) {
      for (const p of c.props) {
        if (isExempt(c.file, p.expr)) continue;
        if (literalText(p.expr).some((t) => /[A-Za-z]{2}/.test(t))) {
          offenders.push(
            `${c.file}:${c.line} ${p.name}: ${p.expr.replace(/\s+/g, ' ').slice(0, 90)}`
          );
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('every pending-removal exemption still matches a call (stale entries fail)', () => {
    const stale = PENDING_REMOVAL.filter(
      ([f, needle]) =>
        !CALLS.some((c) => c.file === f && c.props.some((p) => p.expr.includes(needle)))
    );
    expect(stale).toEqual([]);
  });

  it('the literal detector flags the shapes it exists for', () => {
    const flagged = (e: string) => literalText(e).some((t) => /[A-Za-z]{2}/.test(t));
    expect(flagged("'Saved'")).toBe(true);
    expect(flagged('`Welcome to ${name}`')).toBe(true);
    expect(flagged("err?.data?.error || 'Please try again'")).toBe(true);
    expect(flagged("intl.formatMessage({ id: 'a.b', defaultMessage: 'Saved' })")).toBe(false);
    expect(flagged("t('a.b')")).toBe(false);
    expect(flagged("`${payload.detail || ''}\\n${labels}`")).toBe(false);
    expect(flagged('apiErrorMessage(err)')).toBe(false);
  });
});

describe('toast locale values carry no em dash', () => {
  const KEY = /['"]([a-zA-Z][\w]*(?:\.[\w-]+)+)['"]/g;
  const enMap = en as Record<string, string>;
  const esMap = es as Record<string, string>;

  // Keys that reach a toast through a variable, so the call body holds no key literal.
  // production.cover.cleared: ProfileProduction passes it to persistCover(), which toasts it.
  const INDIRECT = ['production.cover.cleared'];
  // The milestone toast (MilestoneCelebration) reads these from the table in useMilestones.
  const milestones = readFileSync(join(SRC, 'hooks/useMilestones.ts'), 'utf8');
  const MILESTONE_KEYS = [...milestones.matchAll(KEY)]
    .map((m) => m[1])
    .filter((k) => k.startsWith('tour.milestone.'));

  const keys = new Set<string>([...INDIRECT, ...MILESTONE_KEYS]);
  for (const c of CALLS) for (const m of c.body.matchAll(KEY)) keys.add(m[1]);
  const used = [...keys].filter((k) => k in enMap);

  it('resolves a meaningful number of toast keys (no vacuous pass)', () => {
    expect(used.length).toBeGreaterThanOrEqual(200);
    expect(MILESTONE_KEYS.length).toBeGreaterThanOrEqual(4);
    expect(used).toContain('production.cover.cleared');
  });

  it('en-US and es-419 values reached from a toast contain no em dash', () => {
    const bad = used.flatMap((k) =>
      [
        ['en-US', enMap[k]],
        ['es-419', esMap[k]]
      ]
        .filter(([, v]) => typeof v === 'string' && v.includes('\u2014'))
        .map(([l]) => `${l} ${k}`)
    );
    expect(bad).toEqual([]);
  });
});
