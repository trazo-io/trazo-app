/**
 * WS-4 template accelerator contract.
 *
 *   1. Every accelerator resolves to a real quickEventFields config whose
 *      subtype matches — a typo here would silently prefill nothing.
 *   2. Prefill values NEVER carry *_unit keys (tab US defaults must win —
 *      quickEventFields defaults are metric-leaning).
 *   3. Every nameKey exists in BOTH catalogs.
 */

import { describe, expect, it } from 'vitest';

import en from '../../../i18n/lang/en-US.json';
import es from '../../../i18n/lang/es-419.json';
import { getQuickEventFields } from '../../quickEventFields';
import {
  TEMPLATE_ACCELERATORS,
  templatePrefillValues,
  templatesForEventType
} from '../templateAccelerators';

describe('template accelerators', () => {
  it('every entry resolves to a real config with a matching subtype', () => {
    TEMPLATE_ACCELERATORS.forEach((tpl) => {
      const config = getQuickEventFields(tpl.id);
      expect(config, tpl.id).not.toBeNull();
      expect(config!.eventType, tpl.id).toBe(tpl.subtype);
    });
  });

  // Run 8b R4: a template no longer writes `type`. It is offered only on a record whose subtype
  // already equals its own (templateMatchesActivity.test.ts), so the activity is never re-answered.
  it('prefill never writes the subtype, and strips unit fields', () => {
    TEMPLATE_ACCELERATORS.forEach((tpl) => {
      const values = templatePrefillValues(tpl);
      expect(values, `${tpl.id} re-answers the activity`).not.toHaveProperty('type');
      Object.keys(values).forEach((k) => {
        expect(k.endsWith('_unit'), `${tpl.id} leaked ${k}`).toBe(false);
      });
    });
  });

  it('fertilization prefill carries chemical defaults', () => {
    const tpl = TEMPLATE_ACCELERATORS.find((t) => t.id === 'fertilization')!;
    const values = templatePrefillValues(tpl);
    expect(values).not.toHaveProperty('type');
    expect(Object.keys(values).length).toBeGreaterThan(0);
  });

  it('filters by backend event type', () => {
    expect(templatesForEventType(2).map((t) => t.id)).toContain('fertilization');
    expect(templatesForEventType(2).every((t) => t.backendEventType === 2)).toBe(true);
    expect(templatesForEventType(0)).toHaveLength(0);
  });

  it('name keys exist in both catalogs', () => {
    const enMap = en as Record<string, string>;
    const esMap = es as Record<string, string>;
    TEMPLATE_ACCELERATORS.forEach((tpl) => {
      expect(enMap[tpl.nameKey], tpl.nameKey).toBeTruthy();
      expect(esMap[tpl.nameKey], tpl.nameKey).toBeTruthy();
    });
  });
});
