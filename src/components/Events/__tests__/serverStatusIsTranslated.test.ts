/**
 * Every server-resolved input status must have a translation key on the card.
 *
 * `ConsumerEventCard` renders the organic chip from `serverStatusKey[serverInput.status]`, and
 * an UNMAPPED status falls through to `serverInput.label` — which is the backend's English.
 * The comment above that map records the incident: until 2026-08-09 the label was rendered
 * directly and "the one string a shopper reads to judge an input was the only untranslated
 * thing on the card."
 *
 * 🔴 2026-09-02 — it reopened. Adding `wsda_listed` as a server status (WSDA Materials List
 * became attachable) without adding its key here put "WSDA Listed" on the Spanish buyer page
 * in English, on the chip that names a third party. Nothing failed: the i18n parity and
 * used-keys gates both passed, because the NEW KEY EXISTED IN BOTH LOCALES AND SIMPLY HAD NO
 * READER — and English on an English page looks correct.
 *
 * So the invariant is pinned as source text: the map's coverage, and both locales carrying
 * every key it points at.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';

const cardSource = readFileSync(resolve(__dirname, '../ConsumerEventCard.tsx'), 'utf8');

/** The `{ status: 'i18n.key' }` object literal assigned to `serverStatusKey`. */
const statusMap = (): Record<string, string> => {
  const start = cardSource.indexOf('const serverStatusKey = serverInput?.status');
  expect(start, 'serverStatusKey lookup not found — did the chip stop reading it?').toBeGreaterThan(
    -1
  );
  const block = cardSource.slice(start, cardSource.indexOf('[serverInput.status]', start));
  const pairs = [...block.matchAll(/^\s*([a-z_]+):\s*\n?\s*'([^']+)'/gm)];
  return Object.fromEntries(pairs.map((m) => [m[1], m[2]]));
};

/**
 * Statuses `history/services/claim_resolver.resolve_input_status()` can emit. Mirrored by hand
 * because it lives in the other repo — if the backend gains a status, add it here and to the
 * card's map in the same change. `conventional_documented` and `unclassified` are deliberately
 * absent: the card renders those through a different branch, not the organic chip.
 */
const SERVER_STATUSES = [
  'omri_listed',
  'wsda_listed',
  'national_list_allowed',
  'national_list_allowed_condition',
  'national_list_conditional',
  'organic_approved'
];

describe('ConsumerEventCard — a server status never reaches a shopper untranslated', () => {
  it('maps every status the resolver can emit', () => {
    const mapped = Object.keys(statusMap());
    const missing = SERVER_STATUSES.filter((s) => !mapped.includes(s));
    expect(
      missing,
      `Unmapped server status: the chip would fall through to serverInput.label, which is the ` +
        `backend's English. Add an i18n key to serverStatusKey in ConsumerEventCard.tsx.`
    ).toEqual([]);
  });

  it('points only at keys that exist in BOTH locales', () => {
    const en = enUS as Record<string, string>;
    const es = es419 as Record<string, string>;
    const broken = Object.entries(statusMap()).filter(([, key]) => !en[key] || !es[key]);
    expect(
      broken.map(([status, key]) => `${status} -> ${key}`),
      'a mapped key is missing from a locale — the chip renders a raw id or falls back'
    ).toEqual([]);
  });

  it('never points two statuses at one key — the tiers must stay distinguishable', () => {
    // OMRI and WSDA are different organisations making different determinations; National
    // List is a regulatory citation, not a listing. Collapsing any of them onto one string
    // would speak one body's name over another's evidence.
    const keys = Object.values(statusMap());
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives the WSDA chip its own words, not OMRI’s', () => {
    const en = enUS as Record<string, string>;
    const wsdaKey = statusMap().wsda_listed;
    expect(en[wsdaKey]).toBeTruthy();
    expect(en[wsdaKey]).not.toMatch(/OMRI/i);
    expect(en[wsdaKey]).toMatch(/WSDA/);
  });
});
