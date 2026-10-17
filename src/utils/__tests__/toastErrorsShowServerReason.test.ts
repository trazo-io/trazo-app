/**
 * Guard: an error toast must never build its text from `String(err)` or `err.data || ...`.
 *
 * An RTK Query error is `{ status, data }` where `data` is usually an OBJECT, so
 *   description: String(err?.data || err)
 * rendered the literal "[object Object]" to the farmer, and the `|| err?.message || err`
 * tail did the same for a transport failure. `utils/apiErrorMessage.ts` reads the message a
 * DRF error actually carries and returns null when there is none, so the caller falls back to
 * its own translated sentence:
 *
 *   description: apiErrorMessage(err) ?? intl.formatMessage({ id: 'app.errorTryAgain' })
 *
 * The scan carves every `toast({ ... })` call out of every .tsx/.jsx file (no single-extension
 * filter: this tree is mixed) and fails on the patterns above inside one. It also asserts that
 * it found toast calls at all, and that its own regex still flags a known-bad sample, so a
 * rename of `toast` or a broken pattern cannot turn it into a vacuous pass.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { describe, it, expect } from 'vitest';

const SRC = join(__dirname, '../..');

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '__tests__') continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|jsx)$/.test(p)) out.push(p);
  }
  return out;
};

/** Text of each `toast(...)` call, found by balancing parentheses from the opening one. */
const toastCalls = (src: string): string[] => {
  const calls: string[] = [];
  const re = /\btoast\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    let depth = 1;
    let i = m.index + m[0].length;
    while (i < src.length && depth > 0) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')') depth--;
      i++;
    }
    // Comments may legitimately say "never String(err)"; only code is scanned.
    calls.push(
      src
        .slice(m.index, i)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1')
    );
  }
  return calls;
};

/** `String(err`, `String(error`, `String((err as ...)`, and `err.data ||` / `error?.data ||`. */
const OFFENDER =
  /String\(\s*\(?\s*(?:err|error|e)\b|\b(?:err|error|e)\??\.data(?:\??\.\w+)*\s*\|\|/;

/**
 * Files allowed to keep a hand-rolled error message, each with a written reason. Empty since the
 * toast cleanup landed. Every entry must still offend (asserted below), so it can only shrink.
 */
const KNOWN_OFFENDERS: Record<string, string> = {};

const FILES = walk(SRC);
const rel = (p: string) => relative(SRC, p);

describe('error toasts show the server reason, never String(err)', () => {
  it('the pattern flags the known-bad shapes and spares the good one', () => {
    expect(OFFENDER.test('description: String(err?.data || err)')).toBe(true);
    expect(OFFENDER.test('description: String((err as { data?: unknown })?.data || err)')).toBe(
      true
    );
    expect(OFFENDER.test('description: String(err?.data?.error || err?.message || err)')).toBe(
      true
    );
    expect(OFFENDER.test("description: err?.data || 'x'")).toBe(true);
    expect(OFFENDER.test("description: error?.data?.detail || error?.data?.error || t('x')")).toBe(
      true
    );
    expect(
      OFFENDER.test("description: apiErrorMessage(err) ?? intl.formatMessage({ id: 'x' })")
    ).toBe(false);
  });

  it('scans a non-trivial number of toast calls', () => {
    const calls = FILES.flatMap((f) => toastCalls(readFileSync(f, 'utf8')));
    expect(FILES.length).toBeGreaterThan(100);
    expect(calls.length).toBeGreaterThan(100);
  });

  it('no toast builds its text from String(err) or err.data ||', () => {
    const offenders: string[] = [];
    const seen = new Set<string>();
    for (const f of FILES) {
      for (const call of toastCalls(readFileSync(f, 'utf8'))) {
        if (OFFENDER.test(call)) {
          if (rel(f) in KNOWN_OFFENDERS) {
            seen.add(rel(f));
            continue;
          }
          offenders.push(
            `${rel(f)}: ${call
              .split('\n')
              .find((l) => OFFENDER.test(l))
              ?.trim()}`
          );
        }
      }
    }
    expect(offenders).toEqual([]);
    // An entry that no longer offends must leave the list.
    expect([...seen].sort()).toEqual(Object.keys(KNOWN_OFFENDERS).sort());
  });
});
