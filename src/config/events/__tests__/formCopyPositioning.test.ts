/**
 * Guard: event-form copy must not sell the retired transparency score, and must not tell a
 * farmer that a certifier-bound field exists for carbon or for shoppers.
 *
 * The producer-facing transparency score was retired as a surface, but seven variants of it
 * survived in `CarbonImpactPreview` — the sidebar that renders beside the record on EVERY
 * form — plus prose on the pest, business and production tabs. Separately, helper text framed
 * § 205.103(b)(2) fields as carbon inputs: "Select the type of chemical for accurate carbon
 * calculations", "Area needed for carbon calculation", "Fields marked * feed the emissions
 * calculation" (the asterisk means REQUIRED, which is the certifier record, so that one said
 * the opposite of the truth).
 *
 * Carbon wording is still fine where the field genuinely is carbon — "Fuel consumption for
 * carbon emission calculation" is accurate and stays. This asserts against the two specific
 * claims, not against the word "carbon".
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const DIRS = [
  join(__dirname, '../../../views/Dashboard/Dashboard/components/forms'),
  join(__dirname, '../../../components/Events')
];

/**
 * User-visible copy only. Comments are stripped from the whole file first — a line-by-line
 * heuristic missed continuation lines of block comments and wrapped ternaries beginning "? //",
 * and those false positives are worse than useless in a guard people are meant to trust.
 */
const copyLines = (): { file: string; line: number; text: string }[] => {
  const out: { file: string; line: number; text: string }[] = [];
  for (const dir of DIRS) {
    for (const file of readdirSync(dir).filter((f) => /\.(jsx|tsx)$/.test(f))) {
      const raw = readFileSync(join(dir, file), 'utf8');
      // Blank out comments while preserving newlines, so reported line numbers stay true.
      const stripped = raw
        .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
        .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
      stripped.split('\n').forEach((text, i) => out.push({ file, line: i + 1, text }));
    }
  }
  return out;
};

describe('event form copy positioning', () => {
  it('reads enough source to be non-vacuous', () => {
    expect(copyLines().length).toBeGreaterThan(2000);
  });

  it('never sells the retired transparency score or "the consumer story"', () => {
    const BANNED = /transparency score|consumer story|builds? consumer trust/i;
    const hits = copyLines().filter((l) => BANNED.test(l.text));
    expect(
      hits.map((h) => `${h.file}:${h.line} ${h.text.trim().slice(0, 90)}`),
      'the producer transparency score was retired as a surface'
    ).toEqual([]);
  });

  it('never frames a required field as existing for carbon or for shoppers', () => {
    // The asterisk means required, and required fields are the certifier record.
    const BANNED = [
      /fields? marked \*[^"']*emission/i,
      /for accurate carbon calculations/i,
      /needed for carbon calculation/i,
      /for carbon scoring/i,
      /for consumer transparency/i
    ];
    const hits = copyLines().filter((l) => BANNED.some((re) => re.test(l.text)));
    expect(
      hits.map((h) => `${h.file}:${h.line} ${h.text.trim().slice(0, 90)}`),
      'a certifier-bound field must not be explained as a carbon or shopper input'
    ).toEqual([]);
  });

  it('never gives carbon as the only reason to fill a field', () => {
    // "Used to calculate carbon efficiency per unit of production" sat on Quantity planted,
    // inside a section badged "Certifier record" — and quantity is referenced 81 times by the
    // packet builder, for lot traceability and mass balance. A farmer skimming help text learns
    // the field is for a number they were told is optional, and skips the one an inspector reads.
    // Carbon may be mentioned; it may not be the whole stated purpose.
    const en: Record<string, string> = JSON.parse(
      readFileSync(join(__dirname, '../../../i18n/lang/en-US.json'), 'utf8')
    );
    const CARBON_SOLE_PURPOSE =
      /^\s*(used\s+(only\s+)?(to|for)\s+(calculate\s+|estimate\s+)?carbon|only\s+used\s+for\s+carbon)/i;
    const offenders = Object.entries(en)
      .filter(([, v]) => typeof v === 'string' && CARBON_SOLE_PURPOSE.test(v))
      .map(([k, v]) => `${k} = ${v.slice(0, 70)}`);
    expect(
      offenders,
      `help text stating carbon as the sole purpose:\n  ${offenders.join('\n  ')}`
    ).toEqual([]);
  });
});
