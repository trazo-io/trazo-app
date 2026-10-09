/**
 * ONE place turns an operation-readiness item into the words a farmer reads.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * 2026-09-02 — WHY THIS FILE EXISTS. Read before adding a case.
 *
 * The farm dashboard rendered the heading "TODA LA OPERACIÓN" directly above the item
 * "2 logged product(s) are not on your materials list" — English prose on a Spanish screen,
 * in an app whose own rule is that every user-facing string goes through `intl.formatMessage`
 * with a key in BOTH locales. The sentence came from `operation_readiness_service.py`, and as
 * `authErrors.ts` puts it: a server that returns prose has effectively opted the client out of
 * translation.
 *
 * Settled the same way auth was. The API now returns a stable `code` and the machine-readable
 * `params` beside the English sentence, and this module is the only thing that reads them.
 *
 * ⚠️ THE ENGLISH SENTENCE IS NOT DEAD. `item.title`/`detail`/`fix` stay on the wire because:
 *   1. `OperationAuditExportService` prints them into a document written FOR a US certifying
 *      agent, which is an English artifact on purpose, and
 *   2. they are the fallback here for a code this file has not learned yet. A code that falls
 *      through degrades to an English sentence that is at least TRUE, never to a blank row.
 *
 * ⚠️ LISTS ARE JOINED HERE, NOT ON THE SERVER. The server sends `products: ["Kocide 3000-O",
 * "Entrust SC"]` and `overflow: 3`, never "Kocide 3000-O, Entrust SC, and 3 more" — an English
 * conjunction baked into a value cannot be taken apart again, and es-419 needs "y 3 más".
 * `Intl.ListFormat` does the joining in the viewer's own locale.
 *
 * Coverage is deliberately the BLOCKER and WARNING codes — the only ones any surface renders
 * (`CertifierReadinessCard`, `OperationReadinessPanel` and `CertifierLinkCard`'s error toast
 * all list `blockers` + `warnings`). The `ok` / `not_applicable` codes are named in
 * `READINESS_CODES_NOT_RENDERED` rather than left unlisted, so a NEW code landing in neither
 * bucket fails `readinessMessages.test.ts` instead of quietly reaching a farmer in English.
 */
import type { IntlShape } from 'react-intl';

import type { ReadinessItem } from 'store/api/certifierLinkApi';

/** Codes with a sentence here. The wire contract with `READINESS_CODES` in the service. */
export const READINESS_MESSAGE_CODES = [
  'check_unavailable',
  'ofpp.missing',
  'ofpp.suspicious_document',
  'osp.none',
  'osp.no_content',
  'osp.not_submitted',
  'attestation_support.unsupported',
  'unmatched_materials.unlisted',
  'parcel_maps.missing',
  'handler_certificates.attention',
  'records.none'
] as const;

/**
 * Registered server-side, never rendered: `status: 'ok'` items live only in `checked_items`,
 * which no surface lists. Translating them would be eleven pairs of strings for rows that
 * cannot appear. If a surface starts rendering them, move the code up and write its messages
 * — until then the fallback prints the server's true English sentence.
 */
export const READINESS_CODES_NOT_RENDERED = [
  'ofpp.ok_module',
  'ofpp.ok',
  'osp.ok',
  'attestation_support.ok',
  'unmatched_materials.ok',
  'unmatched_materials.not_applicable',
  'parcel_maps.ok',
  'parcel_maps.not_applicable',
  'handler_certificates.ok',
  'handler_certificates.not_applicable',
  'records.ok'
] as const;

/** Clause codes inside `attestation_support.unsupported`'s `params.clauses`. */
export const ATTESTATION_CLAUSE_CODES = [
  'materials_list_empty',
  'supplier_list_empty',
  'search_records_disowned'
] as const;

export interface ResolvedReadinessItem {
  title: string;
  detail: string;
  fix: string;
  /** True when the code was unknown and the server's English sentence is showing. */
  untranslated: boolean;
}

const asStrings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

const asCount = (value: unknown): number => (typeof value === 'number' && value > 0 ? value : 0);

/**
 * "A, B and 3 more" / "A, B y 3 más".
 *
 * The overflow is appended as one more list ITEM rather than as a suffix, so the locale's own
 * conjunction and comma rules apply to it too. `Intl.ListFormat` is unavailable in a few older
 * WebViews; the comma join is a legible degradation, not a crash.
 */
export const joinList = (intl: IntlShape, items: string[], overflow: number): string => {
  const parts = [...items];
  if (overflow > 0) {
    parts.push(intl.formatMessage({ id: 'readinessItem.andMore' }, { count: overflow }));
  }
  try {
    return new Intl.ListFormat(intl.locale, { style: 'long', type: 'conjunction' }).format(parts);
  } catch {
    return parts.join(', ');
  }
};

/** Message values per code. Everything here is DATA the server sent — never a sentence. */
const valuesFor = (intl: IntlShape, code: string, params: Record<string, unknown>) => {
  switch (code) {
    case 'check_unavailable':
      return { check: String(params.check ?? '') };
    case 'ofpp.suspicious_document':
      return { filename: String(params.filename ?? '') };
    case 'osp.not_submitted':
      return { filled: asCount(params.filled), total: asCount(params.total) };
    case 'attestation_support.unsupported':
      return {
        // SEMICOLONS, not `joinList`. Each clause is a full "X attests …, but Y" sentence with
        // its own internal comma, so a conjunction join produced one comma soup in which the
        // clause boundaries vanished: "…are entered, but no materials are on the approved list,
        // G3.0b attests that planting stock suppliers…". The server's English used "; " for
        // exactly this reason. A semicolon is punctuation rather than a word, so it needs no
        // translation — which is why this is the one list here that does not go through
        // `Intl.ListFormat`.
        clauses: asStrings(params.clauses)
          .map((clause) => intl.formatMessage({ id: `readinessItem.clause.${clause}` }))
          .join('; ')
      };
    case 'unmatched_materials.unlisted':
      return {
        count: asCount(params.count),
        products: joinList(intl, asStrings(params.products), asCount(params.overflow))
      };
    case 'parcel_maps.missing':
      return {
        count: asCount(params.count),
        parcels: joinList(intl, asStrings(params.parcels), asCount(params.overflow))
      };
    case 'handler_certificates.attention':
      return {
        count: asCount(params.count),
        // Two independent problems under one count. Both lists are passed, and the message
        // selects on their sizes — "expired" and "never dated" are not the same ask, and a
        // sentence naming a facility under the wrong one would be a false statement.
        staleCount: asStrings(params.stale).length + asCount(params.stale_overflow),
        stale: joinList(intl, asStrings(params.stale), asCount(params.stale_overflow)),
        undatedCount: asStrings(params.undated).length + asCount(params.undated_overflow),
        undated: joinList(intl, asStrings(params.undated), asCount(params.undated_overflow))
      };
    default:
      return {};
  }
};

const KNOWN = new Set<string>(READINESS_MESSAGE_CODES);

/**
 * The words for one readiness item, in the viewer's locale.
 *
 * Falls back to the server's English `title`/`detail`/`fix` — never to a blank row — when the
 * code is missing (an older backend) or unknown to this file.
 */
export const resolveReadinessItem = (
  item: ReadinessItem,
  intl: IntlShape
): ResolvedReadinessItem => {
  const code = item.code;
  if (!code || !KNOWN.has(code)) {
    return { title: item.title, detail: item.detail, fix: item.fix, untranslated: true };
  }

  const values = valuesFor(intl, code, item.params ?? {});
  // `defaultMessage` is deliberately the SERVER's sentence: if a message id somehow goes
  // missing from the bundle, react-intl renders the true English line rather than the raw id.
  return {
    title: intl.formatMessage(
      { id: `readinessItem.${code}.title`, defaultMessage: item.title },
      values
    ),
    detail: item.detail
      ? intl.formatMessage(
          { id: `readinessItem.${code}.detail`, defaultMessage: item.detail },
          values
        )
      : '',
    fix: item.fix
      ? intl.formatMessage({ id: `readinessItem.${code}.fix`, defaultMessage: item.fix }, values)
      : '',
    untranslated: false
  };
};
