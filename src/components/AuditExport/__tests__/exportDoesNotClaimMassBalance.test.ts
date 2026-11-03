/**
 * The organic export's picker copy must describe what the PDF contains.
 *
 * The audit export's section is "Yield-to-Sales Reconciliation" and the PDF says in its own words
 * that it is not a period mass balance: there are no opening or closing inventories, only one
 * season's recorded harvest against its recorded sales (trazo-back
 * `history/services/audit_export_service.py`, section 13). Until 2026-11-03 the subtitle and the
 * guidance note above the download button still promised "mass balance", so the picker claimed a
 * reconciliation the document disclaims.
 *
 * Strings that describe what the CERTIFIER does with a grower's numbers ("your certifier reads it
 * for lot traceability and mass balance") are correct and are not covered here.
 */
import { describe, expect, it } from 'vitest';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';

const EN = enUS as Record<string, string>;
const ES = es419 as Record<string, string>;

const EXPORT_COPY = ['app.exportOrganicSubtitle', 'app.exportInfoOrganic'];

describe('organic export copy matches the PDF it describes', () => {
  it.each(EXPORT_COPY)('%s does not promise a mass balance', (key) => {
    expect(EN[key]).toBeTruthy();
    expect(ES[key]).toBeTruthy();
    expect(EN[key]).not.toMatch(/mass.?balance/i);
    expect(ES[key]).not.toMatch(/balance de masas?/i);
  });

  it('names what the section actually does', () => {
    expect(EN['app.exportOrganicSubtitle']).toMatch(/harvest against sales/);
    expect(ES['app.exportOrganicSubtitle']).toMatch(/cosecha contra ventas/);
    expect(EN['app.exportInfoOrganic']).toMatch(/harvest reconciled against sales/);
    expect(ES['app.exportInfoOrganic']).toMatch(/cosecha conciliada con las ventas/);
  });
});
