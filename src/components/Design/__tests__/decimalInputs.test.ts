/**
 * Guard: a measurement field can have a decimal typed into it.
 *
 * MEASURED 2026-08-25 with REAL keystrokes (not synthetic events — see the note at the bottom):
 *
 *     farm "Total area (acres)"    typed 14.5 → stored 145      typed 86.9 → stored 869
 *     parcel "Area (acres)"        typed 14.5 → stored 145      → 58.68 ha instead of 5.87
 *
 * Ten times the real area, silently, on the two fields that feed the certifier packet, the
 * per-acre carbon maths and the consumer page. The decimal point was swallowed and the next
 * digit appended.
 *
 * ── The trap ─────────────────────────────────────────────────────────────────────────
 * TWO causes, and the obvious one is not the one that matters:
 *
 *   1. Chakra derives `precision` from `step`; `step` defaults to 1, so precision is 0 and the
 *      parser drops the ".".
 *   2. The real cause: the input is controlled by a NUMBER. Every keystroke round-trips through
 *      `onChange(number)` and returns as `value={86}`, so "86." is rewritten to "86" before a
 *      digit can follow it.
 *
 * The parcel field is the proof, and the reason this guard is about (2) rather than (1): it
 * ALREADY had `precision={2}` and still turned 14.5 into 145. Adding precision to the farm
 * field changed nothing either. Only holding the string fixes it.
 *
 * ── What is banned ───────────────────────────────────────────────────────────────────
 * Number-control is FINE for counts — plant counts, employee counts, years, whole-day
 * intervals — where a decimal would be wrong anyway. So the rule keys on the field's own
 * declared intent: if it asks for decimals (`precision`, or a fractional `step`) it must not
 * be number-controlled.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '../../..');

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '__tests__') continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|jsx)$/.test(p)) out.push(p);
  }
  return out;
};

/** Blank comments, keeping newlines — the notes above quote the props they ban. */
const codeOf = (abs: string) =>
  readFileSync(abs, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^(\s*)\/\/.*$/gm, '$1');

/** Reads a JSX opening tag whole, brace-balanced, so a multi-line prop value is not missed. */
const openingTagAt = (code: string, index: number, name: string) => {
  let i = index + name.length;
  let depth = 0;
  while (i < code.length) {
    const c = code[i];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0) break;
    i++;
  }
  return code.slice(index, i);
};

const FILES = walk(SRC);

/**
 * An onChange that throws the STRING away. Chakra hands `(valueAsString, valueAsNumber)`;
 * taking only the second — `(_, num)` — is what makes the field number-controlled.
 */
const DISCARDS_STRING = /onChange=\{\(\s*(_|_str|_s)\s*,/;

/** The field is asking for decimals. */
const wantsDecimals = (tag: string) =>
  /(?<![a-zA-Z])precision=/.test(tag) || /(?<![a-zA-Z])step=\{?["']?0?\.\d/.test(tag);

describe('decimal measurement fields', () => {
  it('has a corpus to check', () => {
    // Without this, every "no offenders" assertion below passes by finding nothing.
    expect(FILES.length).toBeGreaterThan(200);
    const users = FILES.filter((f) => /<StandardNumberInput\b/.test(readFileSync(f, 'utf8')));
    expect(users.length, 'nothing renders StandardNumberInput any more').toBeGreaterThan(3);
  });

  it('never number-controls a field that asks for decimals', () => {
    const offenders: { file: string; line: number; why: string }[] = [];
    for (const file of FILES) {
      const code = codeOf(file);
      for (const m of code.matchAll(/<StandardNumberInput\b/g)) {
        const tag = openingTagAt(code, m.index!, '<StandardNumberInput');
        if (!wantsDecimals(tag)) continue; // a counter — number-control is harmless
        if (!DISCARDS_STRING.test(tag)) continue;
        offenders.push({
          file: relative(SRC, file),
          line: code.slice(0, m.index).split('\n').length,
          why: tag.replace(/\s+/g, ' ').slice(0, 110)
        });
      }
    }
    expect(
      offenders,
      `This field asks for decimals and is controlled by a number, so the decimal point cannot ` +
        `be typed — MEASURED: 14.5 becomes 145. Use <StandardDecimalInput>, which holds the ` +
        `string. Adding \`precision\` does NOT fix it; the parcel field had it and still ` +
        `failed:\n${JSON.stringify(offenders, null, 2)}`
    ).toEqual([]);
  });

  it('keeps StandardDecimalInput holding the string', () => {
    /*
     * The whole point of the component. If it ever becomes number-controlled again it silently
     * reintroduces the bug at every call site at once.
     */
    const src = codeOf(join(SRC, 'components/Design/StandardComponents.tsx'));
    const i = src.indexOf('export const StandardDecimalInput');
    expect(i, 'StandardDecimalInput was removed or renamed').toBeGreaterThan(-1);
    const body = src.slice(i, src.indexOf('StandardDecimalInput.displayName'));

    expect(body, 'the string must be the state').toMatch(/React\.useState\(/);
    expect(body, 'the rendered value must be the text, not the number').toMatch(/value=\{text\}/);
    expect(body, 'onChange must receive the STRING from Chakra').toMatch(
      /onChange=\{\(valueAsString\)/
    );
    expect(
      body,
      'the re-sync must compare NUMBERS — comparing strings rewrites "86." to "86" mid-keystroke'
    ).toMatch(/const asNumber =/);
  });

  it('uses the decimal control for the known measurement fields', () => {
    /*
     * Named because these are the ones with a MEASURED failure behind them. The two unreachable
     * forms that used to be listed here (`StandardChemicalForm`, `StandardProductionForm`) were
     * deleted with their only caller, `UpdateProduction`, which was never routed.
     */
    const CASES: [string, string][] = [
      ['components/Forms/StandardFarmForm.tsx', 'name="totalAcreage"'],
      ['components/Forms/StandardParcelForm_Transparency.tsx', 'parcel.areaAcresPlaceholder']
    ];
    for (const [rel, marker] of CASES) {
      const code = codeOf(join(SRC, rel));
      const at = code.indexOf(marker);
      expect(at, `${rel}: "${marker}" moved — this would pass vacuously`).toBeGreaterThan(-1);
      /*
       * The control rendering that value. Anchored to the nearest ENCLOSING JSX tag rather
       * than a fixed character window — a window clipped `StandardDecimalInput` in half and
       * reported a false failure on a field that was already correct.
       */
      const tagStart = code.lastIndexOf('<Standard', at);
      const around = code.slice(tagStart === -1 ? Math.max(0, at - 900) : tagStart, at + 400);
      expect(
        around,
        `${rel}: the field around "${marker}" is a measurement and must use StandardDecimalInput`
      ).toContain('StandardDecimalInput');
    }
  });
});

/*
 * ⚠️ A note on how this was verified, because it nearly went the other way.
 *
 * The first reproduction drove the field by assigning `el.value = el.value + ch` and dispatching
 * `input`. That is NOT how a person types: it appends to whatever the component last rendered,
 * so it reported a failure even after a real fix and, worse, once reported a PASS ("14.5145")
 * that was only the decimal surviving in front of leftover text. Every measurement quoted above
 * comes from Playwright's `pressSequentially`, i.e. real key events.
 */
