import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import enUS from '../lang/en-US.json';

/**
 * Used-key gate. parity.test.ts proves en-US ↔ es-419 *symmetry*, but it cannot
 * detect a key that is missing from BOTH catalogs — that key still ships and
 * renders its raw dotted id on screen (react-intl's default onError logs and
 * returns the id; there is no throw). That is exactly how the entire
 * `sales.records.*` Sales & Delivery section + `production.lotTag.*` button
 * leaked raw ids on the producer page (fixed 2026-06-27).
 *
 * This test statically scans src for `formatMessage({ id: '…' })` and
 * `<FormattedMessage id="…" />` calls that pass NO `defaultMessage`, and asserts
 * every such string-literal id exists in en-US.json. Dynamic ids (template
 * literals / variables) cannot be resolved statically and are skipped — pass a
 * `defaultMessage` on those for safety.
 *
 * BASELINE: 12 pre-existing violations are grandfathered below so this gate ships
 * without a big-bang cleanup. It RATCHETS — any NEW missing key fails the build.
 * Fix items off the baseline over time, then delete them from this list.
 */

// Pre-existing missing keys (debt to fix separately, then remove from here).
//
// EMPTY as of 2026-07. The last two entries were `app.sustainabilityScore` and
// `app.sustainableEstablishment` on PublicFarmProfile. The note here said they were left
// untranslated on purpose because translating them would render a self-created
// sustainability label on a consumer surface (EU ECGT 2024/825 / FTC 16 CFR 260.6), and
// that the section needed a compliance review rather than a translation.
//
// That review happened: `/farm/:farmId` is a public route, and the section was rendering a
// "Sustainability Score" heading over <CarbonScore>, which draws a 0-100 dial plus a letter
// grade (A+/A/B/C/D/F) and a verdict word. The whole block — plus an "Eco Score" stat tile
// and a "sustainable establishment" toast — was removed, and the guard in
// src/views/Scan/__tests__/noScoreOnConsumer.test.ts now bans the component and the label
// wording outright so it cannot come back. Leaving the strings untranslated was never a
// fix; it just made the claim monolingual.
const BASELINE = new Set<string>([]);

const SRC_DIR = join(process.cwd(), 'src');
const FORMAT_MESSAGE = /formatMessage\(\s*\{([\s\S]*?)\}/g;
const FORMATTED_MESSAGE = /<FormattedMessage\b([^>]*?)\/?>/g;
const ID_PROP = /\bid:\s*['"]([^'"]+)['"]/;
const ID_ATTR = /\bid=['"]([^'"]+)['"]/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === '__tests__' || entry === 'node_modules') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx|ts)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

function collectUsedKeys(): Map<string, Set<string>> {
  const used = new Map<string, Set<string>>();
  const add = (key: string, file: string) => {
    if (!used.has(key)) used.set(key, new Set());
    used.get(key)!.add(file);
  };
  for (const file of walk(SRC_DIR)) {
    const code = readFileSync(file, 'utf-8');
    for (const m of code.matchAll(FORMAT_MESSAGE)) {
      const body = m[1];
      if (body.includes('defaultMessage')) continue;
      const id = ID_PROP.exec(body);
      if (id) add(id[1], file);
    }
    for (const m of code.matchAll(FORMATTED_MESSAGE)) {
      const attrs = m[1];
      if (attrs.includes('defaultMessage')) continue;
      const id = ID_ATTR.exec(attrs);
      if (id) add(id[1], file);
    }
  }
  return used;
}

describe('i18n used-key gate', () => {
  const enKeys = new Set(Object.keys(enUS));
  const used = collectUsedKeys();

  it('every static-literal message id (without defaultMessage) exists in en-US.json', () => {
    const missing = [...used.keys()].filter((k) => !enKeys.has(k) && !BASELINE.has(k));
    const detail = missing
      .map((k) => `${k}  <-  ${[...(used.get(k) ?? [])].join(', ')}`)
      .join('\n');
    expect(
      missing,
      `NEW missing i18n keys (add to BOTH en-US.json and es-419.json, or pass defaultMessage):\n${detail}`
    ).toEqual([]);
  });

  it('baseline does not contain keys that are now defined (keep it tidy)', () => {
    const stale = [...BASELINE].filter((k) => enKeys.has(k));
    expect(
      stale,
      `baseline keys now exist — remove from BASELINE in used-keys.test.ts: ${stale.join(', ')}`
    ).toEqual([]);
  });
});
