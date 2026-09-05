/**
 * Both halves of the readiness wire contract, and the sentences they produce.
 *
 * 🌐 2026-09-02. The farm dashboard rendered "TODA LA OPERACIÓN" over "2 logged product(s) are
 * not on your materials list" — the server's English, on a Spanish screen. `readinessMessages.ts`
 * is the fix; this is what stops it coming back.
 *
 * The failure this guards is not a broken build. It is a NEW readiness check, added months from
 * now in `operation_readiness_service.py`, that ships a sentence no message id covers — which
 * renders perfectly in English and reaches a Spanish-speaking farmer untranslated, exactly as the
 * original did. Nothing about that looks wrong from either side alone, so the check has to cross
 * the boundary and read the Python.
 *
 * ⚠️ Parity between the two BUNDLES (same keys, same ICU arguments) is already
 * `i18n/__tests__/parity.test.ts`'s job and is deliberately not repeated here. What is here is
 * what that test cannot see: whether the codes match the server's, and whether the sentences
 * actually come out right once the values are put in.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { createIntl, createIntlCache, type IntlShape } from 'react-intl';
import { describe, expect, it } from 'vitest';

import en from '../../../i18n/lang/en-US.json';
import es from '../../../i18n/lang/es-419.json';
import type { ReadinessItem } from '../../../store/api/certifierLinkApi';
import {
  ATTESTATION_CLAUSE_CODES,
  READINESS_CODES_NOT_RENDERED,
  READINESS_MESSAGE_CODES,
  resolveReadinessItem
} from '../readinessMessages';

const SERVICE = join(
  __dirname,
  '../../../../../trazo-back/history/services/operation_readiness_service.py'
);

const service = ((): string => {
  try {
    return readFileSync(SERVICE, 'utf8');
  } catch {
    throw new Error(
      `Cannot read ${SERVICE}. This guard compares the client's message codes against the ` +
        `service that emits them, so it needs the trazo-back checkout beside trazo-app.`
    );
  }
})();

/** Pull a tuple of string literals out of the Python source by its constant name. */
const pyTuple = (name: string): string[] => {
  const block = new RegExp(`^${name} = \\(([\\s\\S]*?)^\\)`, 'm').exec(service);
  expect(block, `${name} not found in operation_readiness_service.py`).toBeTruthy();
  return [...(block as RegExpExecArray)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
};

const cache = createIntlCache();
const intlEn = createIntl({ locale: 'en-US', messages: en as Record<string, string> }, cache);
const intlEs = createIntl({ locale: 'es-419', messages: es as Record<string, string> }, cache);

const item = (over: Partial<ReadinessItem>): ReadinessItem => ({
  key: 'x',
  status: 'warning',
  title: 'SERVER TITLE',
  detail: 'SERVER DETAIL',
  fix: 'SERVER FIX',
  ...over
});

describe('readiness codes match the service that emits them', () => {
  it('every server code is either translated here or explicitly not rendered', () => {
    const accounted = new Set<string>([
      ...READINESS_MESSAGE_CODES,
      ...READINESS_CODES_NOT_RENDERED
    ]);
    const unaccounted = pyTuple('READINESS_CODES').filter((code) => !accounted.has(code));
    expect(
      unaccounted,
      'these codes exist server-side and would reach a Spanish farmer in English — ' +
        'give each one messages in READINESS_MESSAGE_CODES, or list it in ' +
        'READINESS_CODES_NOT_RENDERED with a reason'
    ).toEqual([]);
  });

  it('no code here is unknown to the service', () => {
    const server = new Set(pyTuple('READINESS_CODES'));
    const orphans = [...READINESS_MESSAGE_CODES, ...READINESS_CODES_NOT_RENDERED].filter(
      (code) => !server.has(code)
    );
    expect(orphans, 'dead codes: nothing emits these, so their messages can never render').toEqual(
      []
    );
  });

  it('the attestation clause codes agree', () => {
    expect([...ATTESTATION_CLAUSE_CODES].sort()).toEqual(
      pyTuple('ATTESTATION_CLAUSE_CODES').sort()
    );
  });
});

describe('every renderable code has words in both locales', () => {
  const bundles: Array<[string, Record<string, string>]> = [
    ['en-US', en as Record<string, string>],
    ['es-419', es as Record<string, string>]
  ];

  it.each(bundles)('%s carries a title, detail and fix for each code', (_locale, messages) => {
    const missing: string[] = [];
    for (const code of READINESS_MESSAGE_CODES) {
      for (const field of ['title', 'detail', 'fix']) {
        const id = `readinessItem.${code}.${field}`;
        if (!messages[id]) missing.push(id);
      }
    }
    expect(missing).toEqual([]);
  });

  it.each(bundles)('%s carries every attestation clause', (_locale, messages) => {
    const missing = ATTESTATION_CLAUSE_CODES.map((c) => `readinessItem.clause.${c}`).filter(
      (id) => !messages[id]
    );
    expect(missing).toEqual([]);
  });

  it('no Spanish string is just the English one pasted over', () => {
    // The cheapest way to "add a translation" is to copy the English line. It passes locale
    // parity and the ICU argument check, and it is exactly the bug being fixed here.
    const identical = READINESS_MESSAGE_CODES.flatMap((code) =>
      ['title', 'detail', 'fix']
        .map((field) => `readinessItem.${code}.${field}`)
        .filter((id) => (en as Record<string, string>)[id] === (es as Record<string, string>)[id])
    );
    expect(identical).toEqual([]);
  });
});

describe('the sentences come out right', () => {
  const unmatched = item({
    key: 'unmatched_materials',
    code: 'unmatched_materials.unlisted',
    params: { count: 2, products: ['Kocide 3000-O', 'Entrust SC'], overflow: 0 }
  });

  it('names the products the records show, in Spanish', () => {
    const words = resolveReadinessItem(unmatched, intlEs);
    expect(words.untranslated).toBe(false);
    expect(words.title).toContain('2');
    expect(words.title).not.toContain('logged product');
    expect(words.detail).toContain('Kocide 3000-O');
    expect(words.detail).toContain('Entrust SC');
  });

  it('joins the overflow in the viewer own locale, not in English', () => {
    const many = item({
      code: 'unmatched_materials.unlisted',
      params: { count: 8, products: ['A', 'B', 'C', 'D', 'E'], overflow: 3 }
    });
    expect(resolveReadinessItem(many, intlEn).detail).toContain('3 more');
    const spanish = resolveReadinessItem(many, intlEs).detail;
    expect(spanish).toContain('3 más');
    // "and" would mean an English conjunction was baked into a value server-side — the exact
    // thing `params.products` being a LIST exists to prevent.
    expect(spanish).not.toMatch(/\band\b/);
  });

  it('reads the plural of one product correctly', () => {
    const one = item({
      code: 'unmatched_materials.unlisted',
      params: { count: 1, products: ['Entrust SC'], overflow: 0 }
    });
    expect(resolveReadinessItem(one, intlEn).title).toBe(
      '1 logged product is not on your materials list'
    );
  });

  const handler = (stale: string[], undated: string[]): ReadinessItem =>
    item({
      code: 'handler_certificates.attention',
      params: {
        count: stale.length + undated.length,
        stale,
        stale_overflow: 0,
        undated,
        undated_overflow: 0
      }
    });

  it.each([
    ['both problems', ['Cold Co'], ['Pack Co']],
    ['expired only', ['Cold Co'], []],
    ['undated only', [], ['Pack Co']]
  ])(
    'the handler sentence holds together with %s',
    (_label, stale: string[], undated: string[]) => {
      for (const intl of [intlEn, intlEs] as IntlShape[]) {
        const detail = resolveReadinessItem(handler(stale, undated), intl).detail;
        for (const name of [...stale, ...undated]) expect(detail).toContain(name);
        // A nested plural that leaves its separator behind prints "— ; no certificate…".
        expect(detail).not.toMatch(/—\s*;/);
        expect(detail).not.toMatch(/;\s*\./);
        expect(detail.trim()).toMatch(/\.$/);
      }
    }
  );

  it('lists the attestations a reviewer will cross-check', () => {
    const attestation = item({
      code: 'attestation_support.unsupported',
      params: { clauses: ['materials_list_empty', 'supplier_list_empty'] }
    });
    const detail = resolveReadinessItem(attestation, intlEs).detail;
    expect(detail).toContain('Solicitud de Materiales');
    expect(detail).toContain('Lista de Proveedores');
    // Each clause is a full sentence carrying its own comma, so they are separated by a
    // SEMICOLON. Joined with a conjunction the boundaries disappeared into comma soup:
    // "…on the approved list, G3.0b attests that planting stock suppliers…".
    expect(detail).toContain('; G3.0b');
  });

  it('quotes the suspicious filename', () => {
    const suspicious = item({
      code: 'ofpp.suspicious_document',
      status: 'blocker',
      params: { filename: 'factura-2026.pdf' }
    });
    expect(resolveReadinessItem(suspicious, intlEs).detail).toContain('factura-2026.pdf');
  });

  it('counts the OSP sections that have content', () => {
    const osp = item({ code: 'osp.not_submitted', params: { filled: 4, total: 6 } });
    const detail = resolveReadinessItem(osp, intlEs).detail;
    expect(detail).toContain('4');
    expect(detail).toContain('6');
  });
});

describe('a code this file has not learned degrades to the truth', () => {
  it('falls back to the server sentence for an unknown code', () => {
    const words = resolveReadinessItem(item({ code: 'brand.new.check' }), intlEs);
    expect(words).toMatchObject({
      title: 'SERVER TITLE',
      detail: 'SERVER DETAIL',
      fix: 'SERVER FIX',
      untranslated: true
    });
  });

  it('falls back when the server sends no code at all', () => {
    // An older backend, or a cached response minted before the codes shipped.
    const words = resolveReadinessItem(item({}), intlEn);
    expect(words.title).toBe('SERVER TITLE');
    expect(words.untranslated).toBe(true);
  });

  it('never invents a detail or a fix the server did not send', () => {
    const bare = item({ code: 'records.none', status: 'blocker', detail: '', fix: '' });
    const words = resolveReadinessItem(bare, intlEs);
    expect(words.title).not.toBe('SERVER TITLE');
    expect(words.detail).toBe('');
    expect(words.fix).toBe('');
  });
});
