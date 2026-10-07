/**
 * The farm card's season row is said in the reader's language (recordkeeping review F-01).
 *
 * The 375 px Spanish pass found the row raw: "Inputs not matched to the plan's approved
 * inputs (§ 205.400(f)(2))" and "12 input record(s) not matched … see Inputs Not Matched to
 * the Plan's Approved Inputs section" inside a Spanish page. The certifier page already named
 * rows by `row_key`; the card did not, and the detail carried no data to write from.
 */
import { describe, expect, it } from 'vitest';
import { createIntl, createIntlCache } from 'react-intl';

import enUS from '../../../../../../i18n/lang/en-US.json';
import esES from '../../../../../../i18n/lang/es-419.json';
import { readinessFindingDetail, readinessFindingLabel } from '../CertifierReadinessCard';

const cache = createIntlCache();
const intlFor = (locale: 'en-US' | 'es-419') =>
  createIntl({ locale, messages: locale === 'en-US' ? enUS : esES }, cache);

const finding = {
  label: "Inputs not confirmed against the plan's inputs list (§ 205.400(f)(2))",
  row_key: 'inputs_not_confirmed_against_the_plan_s_inputs_list',
  detail:
    "12 input record(s) not confirmed against the plan's inputs list — see Inputs Not Confirmed Against the Plan's Inputs List section",
  params: { count: 12 }
};

describe('readiness finding in the reader language', () => {
  it('names the row and writes the count in Spanish', () => {
    const intl = intlFor('es-419');
    expect(readinessFindingLabel(intl, finding)).toBe(
      'Insumos sin confirmar contra la lista de insumos del plan; una adición real es un cambio que se notifica (§ 205.400(f)(2))'
    );
    const detail = readinessFindingDetail(intl, finding);
    expect(detail).toContain('12 registros de insumo sin confirmar');
    expect(detail).not.toContain('Inputs Not Confirmed');
  });

  it('pluralises in English and points at the identity panel', () => {
    const intl = intlFor('en-US');
    expect(readinessFindingDetail(intl, { ...finding, params: { count: 1 } })).toContain(
      '1 input record not confirmed'
    );
    expect(readinessFindingDetail(intl, finding)).toContain('Logged names not on the plan');
  });

  it('falls back to the server text for a row with no catalogue entry or no data', () => {
    const intl = intlFor('es-419');
    const other = {
      label: 'Compost (§ 205.203(c)(2))',
      row_key: 'no_such_row',
      detail: 'raw detail',
      params: null
    };
    expect(readinessFindingLabel(intl, other)).toBe('Compost (§ 205.203(c)(2))');
    expect(readinessFindingDetail(intl, other)).toBe('raw detail');
    expect(readinessFindingDetail(intl, { ...finding, params: null })).toBe(finding.detail);
  });
});
