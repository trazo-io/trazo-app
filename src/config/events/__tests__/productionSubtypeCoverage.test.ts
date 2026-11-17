/**
 * One production subtype list, four places that used to keep their own copy.
 *
 * MEASURED 2026-08-22, before this guard existed:
 *
 *   history/models.py PRODUCTION_EVENTS      16 codes
 *   ProductionTab.jsx <option> block         16 codes, English-only, hand-written
 *   ProductionTab.jsx PRODUCTION_TYPE_NAMES  16 codes
 *   config/events/productionEvent.ts         13 codes   ← TP, BU, SS never arrived
 *   config/activityVerbs.ts (entry grid)      8 codes   ← PR, TR, TH, PO, PH, CM, FP, MO
 *                                                          unreachable from any entry point
 *
 * Both gaps were silent. A Transport row fell through `getPhotoTier` to the type-level
 * default instead of its own tier, and `getSubtypes(1)` — which the form's own chooser now
 * renders from — did not list it. Pruning, the main winter activity of the orchard operations
 * this product is sold to, had no tile at all: the only way to reach it was to open a "Field
 * work" record and change a dropdown.
 *
 * Neither is the kind of thing a render test finds, because nothing throws — a missing
 * subtype just renders one fewer option, and a missing tile renders a grid that looks
 * complete. So this asserts the sets against each other, with the BACKEND as the authority.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import { historyModelsSource } from '../../../test-utils/backendHistoryModels';
import { ACTIVITY_VERBS } from '../../activityVerbs';
import { getSubtypes } from '../index';
import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';

const REPO_ROOT = join(__dirname, '../../../../..');
const BACKEND = join(REPO_ROOT, 'trazo-back');
const PRODUCTION_TAB = join(
  __dirname,
  '../../../views/Dashboard/Dashboard/components/forms/ProductionTab.jsx'
);

/** Codes in `PRODUCTION_EVENTS = ( … )` — the authority both front-end lists answer to. */
const backendSubtypes = (): string[] => {
  const src = historyModelsSource(BACKEND);
  const block = /PRODUCTION_EVENTS\s*=\s*\(([\s\S]*?)\n    \)/.exec(src);
  if (!block) throw new Error('could not find PRODUCTION_EVENTS in the history models');
  // Entries are `(CONSTANT, "Label")`; the code itself is on the constant's own assignment.
  const constants = [...block[1].matchAll(/\(\s*([A-Z_]+)\s*,/g)].map((m) => m[1]);
  return constants.map((name) => {
    const decl = new RegExp(`^\\s{4}${name}\\s*=\\s*"([A-Z]{2})"`, 'm').exec(src);
    if (!decl) throw new Error(`PRODUCTION_EVENTS names ${name}, which has no "XX" constant`);
    return decl[1];
  });
};

const enMessages = enUS as unknown as Record<string, string>;
const esMessages = es419 as unknown as Record<string, string>;

describe('production subtypes: backend, registry and entry grid agree', () => {
  it('reads a real backend list (guard is not vacuous)', () => {
    // historyModelsSource throws when the checkout is missing: every assertion below would
    // otherwise pass by comparing nothing.
    expect(backendSubtypes().length).toBeGreaterThan(10);
  });

  it('the display registry lists exactly the backend subtypes', () => {
    const backend = [...backendSubtypes()].sort();
    const registry: string[] = getSubtypes(1)
      .map((s) => s.code as string)
      .sort();
    expect(
      registry,
      `missing from config/events/productionEvent.ts: ${
        backend.filter((c) => !registry.includes(c)).join(', ') || '(none)'
      } · not in the backend: ${
        registry.filter((c) => !backend.includes(c)).join(', ') || '(none)'
      }`
    ).toEqual(backend);
  });

  it('every subtype is reachable from exactly one activity tile', () => {
    const reachable = new Map<string, string[]>();
    for (const verb of ACTIVITY_VERBS) {
      if (verb.eventType !== 1) continue;
      const codes = new Set<string>([...(verb.subtypeChoices ?? [])]);
      if (verb.subtype) codes.add(verb.subtype);
      for (const code of codes) {
        reachable.set(code, [...(reachable.get(code) ?? []), verb.key]);
      }
    }

    const backend = backendSubtypes();
    const unreachable = backend.filter((c) => !reachable.has(c));
    expect(
      unreachable,
      `no activity tile leads to these subtypes, so a farmer cannot log them at all: ` +
        `${unreachable.join(', ')}. Add them to an existing verb's subtypeChoices, or give ` +
        `them a tile — see the tile-count note in config/activityVerbs.ts.`
    ).toEqual([]);

    const ambiguous = [...reachable.entries()].filter(([, verbs]) => verbs.length > 1);
    expect(
      ambiguous.map(([code, verbs]) => `${code}: ${verbs.join(' + ')}`),
      'two tiles claiming one subtype means the same record has two names in the entry ' +
        'vocabulary, and verbForEvent() has to guess which one titles the page'
    ).toEqual([]);
  });

  it('no tile points at a subtype the backend does not have', () => {
    const backend = new Set(backendSubtypes());
    const bogus: string[] = [];
    for (const verb of ACTIVITY_VERBS) {
      if (verb.eventType !== 1) continue;
      for (const code of [verb.subtype, ...(verb.subtypeChoices ?? [])]) {
        if (code && !backend.has(code)) bogus.push(`${verb.key} → ${code}`);
      }
    }
    expect(bogus, 'a tile that posts an unknown code fails at the serializer, not here').toEqual(
      []
    );
  });

  it('a family verb opens on one of its own choices', () => {
    const wrong = ACTIVITY_VERBS.filter(
      (v) => v.subtypeChoices?.length && v.subtype && !v.subtypeChoices.includes(v.subtype)
    ).map((v) => v.key);
    expect(
      wrong,
      'the default the second-level chooser opens on must be one of the options it shows'
    ).toEqual([]);
  });

  it('a family verb offers more than one choice', () => {
    // `subtypeChoicesFor` returns [] for a single-element list, so the chooser never renders
    // and the verb silently posts its `subtype`. The reachability test above would still
    // count the odd one out as reachable — this is the hole in that count.
    const degenerate = ACTIVITY_VERBS.filter((v) => v.subtypeChoices?.length === 1).map(
      (v) => `${v.key} → ${v.subtypeChoices?.[0]}`
    );
    expect(
      degenerate,
      'a one-element subtypeChoices asks nothing and posts the verb default — either add the ' +
        'other subtypes it covers, or drop subtypeChoices and let `subtype` pin it'
    ).toEqual([]);
  });

  it('every subtype label exists in both catalogs', () => {
    const missing: string[] = [];
    for (const { code, labelKey } of getSubtypes(1)) {
      if (!enMessages[labelKey]) missing.push(`en-US ${code} (${labelKey})`);
      if (!esMessages[labelKey]) missing.push(`es-419 ${code} (${labelKey})`);
    }
    expect(
      missing,
      'ActivitySubtypeChooser and the edit-mode select both render these through ' +
        'intl.formatMessage; a missing key renders the raw key at a farmer'
    ).toEqual([]);
  });

  it('every activity tile is labelled in both catalogs', () => {
    const missing: string[] = [];
    for (const verb of ACTIVITY_VERBS) {
      const key = `activities.verb.${verb.key}`;
      if (!enMessages[key]) missing.push(`en-US ${key}`);
      if (!esMessages[key]) missing.push(`es-419 ${key}`);
    }
    expect(missing).toEqual([]);
  });

  it('the production form no longer hand-writes the subtype list', () => {
    const src = readFileSync(PRODUCTION_TAB, 'utf8');
    const hardcoded = [...src.matchAll(/<option value="([A-Z]{2})">/g)].map((m) => m[1]);
    expect(
      hardcoded,
      'a hand-written <option> block is how the list drifted the first time: it was ' +
        'English-only, it duplicated the registry, and nothing failed when the backend grew ' +
        'three codes past it. Render PRODUCTION_SUBTYPE_OPTIONS instead.'
    ).toEqual([]);
  });

  it('the auto-named-event map covers every subtype', () => {
    const src = readFileSync(PRODUCTION_TAB, 'utf8');
    const block = /const PRODUCTION_TYPE_NAMES = \{([\s\S]*?)\n\};/.exec(src);
    expect(
      block,
      'PRODUCTION_TYPE_NAMES not found — update this guard, do not drop it'
    ).not.toBeNull();
    const named = [...block![1].matchAll(/^\s*([A-Z]{2}):/gm)].map((m) => m[1]);
    const missing = backendSubtypes().filter((c) => !named.includes(c));
    expect(
      missing,
      `these subtypes auto-generate an EMPTY event name, which lands on the certifier ` +
        `packet as a blank row label: ${missing.join(', ')}`
    ).toEqual([]);
  });
});
