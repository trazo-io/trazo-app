/**
 * The detail sentence of a SEASON readiness row, in the reader's language.
 *
 * The server keeps the packet's English sentence in `detail` (a US certifier reads it) and
 * sends, beside it, `detail_code` and `params`: the sentence code and its data (numbers, dates,
 * keys and the farm's own names). This file turns keys into words and lists into the locale's
 * list; the sentence itself lives in `certifierReadiness.detail.<code>`. Oscar, 2026-10-08: the
 * Spanish card printed "3/5 inputs have supplier — fill before audit".
 *
 * Every `said("…")` code in trazo-back's `audit_export_service.py` needs a sentence in both locales; the
 * guard `seasonRowCodesHaveSentences.test.ts` reads that file and fails on a code with no
 * sentence in either locale.
 */
import type { IntlShape } from 'react-intl';

import { joinList } from './readinessMessages';

const asCount = (value: unknown): number => (typeof value === 'number' && value > 0 ? value : 0);
const asStrings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

const has = (intl: IntlShape, id: string) =>
  Boolean((intl.messages as Record<string, unknown>)[id]);

/** A key the catalogue names, or the key itself read as words when it does not (yet). */
const named = (intl: IntlShape, prefix: string, key: string) =>
  has(intl, `${prefix}.${key}`)
    ? intl.formatMessage({ id: `${prefix}.${key}` })
    : key.replace(/_/g, ' ');

function ospStatus(intl: IntlShape, status: string, approved: unknown): string {
  if (status === 'active') {
    return typeof approved === 'string' && approved
      ? intl.formatMessage({ id: 'certifierReadiness.ospActiveApproved' }, { date: approved })
      : intl.formatMessage({ id: 'certifierReadiness.ospActiveNoDate' });
  }
  return has(intl, `osp.status.${status}`)
    ? intl.formatMessage({ id: `osp.status.${status}` })
    : status;
}

/** Message values per code. Only codes whose params need words or a list are listed. */
function valuesFor(
  intl: IntlShape,
  code: string,
  params: Record<string, unknown>
): Record<string, string | number> {
  switch (code) {
    case 'organic_system_plan.sections': {
      const thin = asStrings(params.thin);
      const unreferenced = asCount(params.unreferenced);
      return {
        version: String(params.version ?? ''),
        status: ospStatus(intl, String(params.status ?? ''), params.approved),
        met: asCount(params.met),
        total: asCount(params.total),
        thin: thin.length
          ? intl.formatMessage(
              { id: 'certifierReadiness.ospThin' },
              {
                sections: joinList(
                  intl,
                  thin.map((key) => named(intl, 'certifierReadiness.ospSection', key)),
                  0
                )
              }
            )
          : '',
        gap: unreferenced
          ? intl.formatMessage({ id: 'certifierReadiness.ospGap' }, { count: unreferenced })
          : ''
      };
    }
    case 'input_traceability.supplier_variants':
      return {
        names: joinList(
          intl,
          asStrings(params.names).map((name) => `"${name}"`),
          0
        ),
        more: asCount(params.more_groups)
      };
    case 'record_completeness_chemical.fields_missing': {
      const fields = Array.isArray(params.fields) ? params.fields : [];
      return {
        incomplete: asCount(params.incomplete),
        total: asCount(params.total),
        unconfirmed: asCount(params.unconfirmed),
        fields: joinList(
          intl,
          fields
            .filter(
              (f): f is { field: string; count: number } =>
                typeof f === 'object' &&
                f !== null &&
                typeof (f as { field?: unknown }).field === 'string'
            )
            .map(
              (f) => `${named(intl, 'certifierReadiness.field', f.field)} (${asCount(f.count)})`
            ),
          0
        )
      };
    }
    case 'compost.fields_missing': {
      const parts = (['cn', 'method', 'temperature'] as const)
        .filter((key) => asCount(params[key]) > 0)
        .map((key) =>
          intl.formatMessage(
            { id: `certifierReadiness.compostPart.${key}` },
            { count: asCount(params[key]) }
          )
        );
      return { parts: joinList(intl, parts, 0) };
    }
    case 'national_list_conditions.records': {
      // Each part carries its own parenthetical citation, so the parts are joined with semicolons
      // (as the packet's English is) rather than a conjunction that would run the citations together.
      const parts = (
        [
          'calcium_soil',
          'calcium_method_unknown',
          'micronutrient_no_result',
          'micronutrient_purpose',
          'magnesium_no_soil_result'
        ] as const
      )
        .filter((key) => asCount(params[key]) > 0)
        .map((key) =>
          intl.formatMessage(
            { id: `certifierReadiness.nationalListPart.${key}` },
            { count: asCount(params[key]) }
          )
        );
      return { parts: parts.join('; ') };
    }
    case 'pre_harvest_intervals.inside': {
      // A spray logged with no product name arrives as "" (the server sends no English phrase);
      // the reader's language says it had none (review of back #301).
      const values: Record<string, string | number> = {};
      for (const [name, value] of Object.entries(params)) {
        if (typeof value === 'number' || typeof value === 'string') values[name] = value;
      }
      if (!values.product) {
        values.product = intl.formatMessage({ id: 'certifierReadiness.phiNoProduct' });
      }
      return values;
    }
    default: {
      // Numbers stay numbers (plural rules read them); dates and names pass through as written.
      const values: Record<string, string | number> = {};
      for (const [name, value] of Object.entries(params)) {
        if (typeof value === 'number' || typeof value === 'string') values[name] = value;
      }
      return values;
    }
  }
}

/**
 * The row's detail in the reader's language, or the server's English detail when the row
 * carries no code (an older backend) or the catalogue has no sentence for it.
 */
export function seasonRowDetail(
  intl: IntlShape,
  finding: {
    detail: string;
    row_key?: string | null;
    detail_code?: string | null;
    params?: Record<string, unknown> | null;
  }
): string {
  // Rows served before 2026-10-08 carried params with no code, keyed by the row (F-01).
  const code = finding.detail_code || (finding.params ? finding.row_key : null);
  const id = code ? `certifierReadiness.detail.${code}` : '';
  if (!id || !has(intl, id)) return finding.detail;
  return intl.formatMessage(
    { id, defaultMessage: finding.detail },
    valuesFor(intl, code as string, finding.params ?? {})
  );
}
