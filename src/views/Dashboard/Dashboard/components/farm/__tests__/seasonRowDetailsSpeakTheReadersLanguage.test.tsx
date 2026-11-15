/**
 * The detail under each season row on the farm-home readiness card, in the reader's language.
 *
 * Oscar, 2026-10-08, on the Spanish card: "there are some issues with translations". The row
 * names were Spanish; the sentences under them were the packet's English ("3/5 inputs have
 * supplier — fill before audit"). The server now sends each REVIEW/FAIL row's sentence as
 * `detail_code` + `params` (trazo-back `said(...)`), and the card writes it.
 *
 * Two halves:
 * - every `said("…")` code in trazo-back's audit_export_service.py has a sentence in both
 *   locales (reads the sibling checkout, like readinessMessages.test.ts);
 * - the card renders the Spanish sentence from the code and data, names fields and plan
 *   sections in Spanish, and falls back to the server's English for a code it does not know.
 * Red on main with AssertionError.
 */
import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { IntlProvider, createIntl } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';

import { seasonRowDetail } from '../../../../../../components/Certifications/seasonRowMessages';
import enUS from '../../../../../../i18n/lang/en-US.json';
import es419 from '../../../../../../i18n/lang/es-419.json';

const SERVICE = join(
  __dirname,
  '../../../../../../../../trazo-back/history/services/audit_export_service.py'
);

const serverCodes = (): string[] => {
  let source: string;
  try {
    source = readFileSync(SERVICE, 'utf8');
  } catch {
    throw new Error(
      `Cannot read ${SERVICE}. This guard compares the card's sentences against the service ` +
        `that emits the codes, so it needs the trazo-back checkout beside trazo-app.`
    );
  }
  // Every call must parse, or the guard says so: a code the pattern skipped would otherwise pass
  // as "no missing sentence" (review of app #105). `def said(` and a `said(` quoted in a comment are not calls.
  const calls = [...source.matchAll(/(?<!def |`)\bsaid\(/g)].length;
  const codes = [...source.matchAll(/(?<!def |`)\bsaid\(\s*['"]([A-Za-z0-9_.]+)['"]/g)].map(
    (m) => m[1]
  );
  if (codes.length !== calls) {
    throw new Error(
      `${
        calls - codes.length
      } said(...) call(s) in audit_export_service.py have a first argument ` +
        `this guard cannot read; pass the code as a string literal.`
    );
  }
  return [...new Set(codes)];
};

const findings = [
  {
    label: 'Input traceability (§ 205.103)',
    row_key: 'input_traceability',
    status: 'FAIL',
    detail: '3/5 inputs have supplier — fill before audit',
    detail_code: 'input_traceability.supplier_missing',
    params: { recorded: 3, total: 5 },
    section_hint: null
  },
  {
    label: 'Record completeness — chemical (§ 205.103(b)(2))',
    row_key: 'record_completeness_chemical',
    status: 'FAIL',
    detail: '2/5 chemical records missing required fields — target pest or disease (2)',
    detail_code: 'record_completeness_chemical.fields_missing',
    params: {
      incomplete: 2,
      total: 5,
      fields: [{ field: 'target_pest_or_disease', count: 2 }],
      unconfirmed: 2
    },
    section_hint: null
  },
  {
    label: 'Organic System Plan (§ 205.201)',
    row_key: 'organic_system_plan',
    status: 'REVIEW',
    detail: 'v4 Draft — 4 of 6 sections above the narrative floor',
    detail_code: 'organic_system_plan.sections',
    params: {
      version: 4,
      status: 'draft',
      approved: null,
      met: 4,
      total: 6,
      thin: ['monitoring_plan', 'commingling_barriers'],
      unreferenced: 0
    },
    section_hint: null
  },
  {
    label: 'National List conditions (§ 205.601(j)(6), (j)(7); § 205.602(c))',
    row_key: 'national_list_conditions',
    status: 'REVIEW',
    detail:
      '1 calcium chloride record(s) applied to the soil (§ 205.602(c) allows a foliar spray only); 2 micronutrient application(s) with no soil or tissue result on file on or before the date',
    detail_code: 'national_list_conditions.records',
    params: {
      calcium_soil: 1,
      calcium_method_unknown: 0,
      micronutrient_no_result: 2,
      micronutrient_no_value: 0,
      micronutrient_purpose: 0,
      magnesium_no_soil_result: 0
    },
    section_hint: 'Input Material Application Records section'
  },
  {
    label: 'Something new (§ 205.999)',
    row_key: 'something_new',
    status: 'REVIEW',
    detail: 'A sentence the catalogue has not learned yet',
    detail_code: 'something_new.unheard',
    params: { count: 1 },
    section_hint: null
  }
];

// The card reads the company for the plan's access notice (Run 8b). No company loaded here, so
// no notice: these tests are about the findings.
vi.mock('react-redux', () => ({
  useSelector: (fn: (s: unknown) => unknown) => fn({ company: { currentCompany: null } })
}));

vi.mock('store/api/dashboardMetricsApi', () => ({
  useGetCertifierReadinessQuery: () => ({
    data: {
      establishment_id: 2,
      production: {
        id: 23,
        name: 'Liberty 2026',
        finish_date: null,
        is_finished: false,
        parcel_id: 12
      },
      findings,
      outstanding_count: findings.length,
      checked_count: 16
    },
    isLoading: false,
    isUninitialized: false,
    isError: false
  })
}));

vi.mock('store/api/certifierLinkApi', () => ({
  useGetOperationReadinessQuery: () => ({
    data: { applicable: true, blockers: [], warnings: [], checked_items: [] },
    isLoading: false,
    isUninitialized: false
  })
}));

const { default: CertifierReadinessCard } = await import('../CertifierReadinessCard');

function cardText(locale: string, messages: Record<string, string>) {
  const { container, unmount } = render(
    <MemoryRouter>
      <ChakraProvider>
        <IntlProvider locale={locale} messages={messages}>
          <CertifierReadinessCard companyId={1} farmId={2} />
        </IntlProvider>
      </ChakraProvider>
    </MemoryRouter>
  );
  const text = container.textContent || '';
  unmount();
  return text;
}

describe('season row details speak the reader language', () => {
  it('has a sentence in both locales for every code the server says', () => {
    const codes = serverCodes();
    expect(codes.length).toBeGreaterThanOrEqual(30);
    const en = enUS as Record<string, string>;
    const es = es419 as Record<string, string>;
    const missing = codes.filter(
      (code) => !en[`certifierReadiness.detail.${code}`] || !es[`certifierReadiness.detail.${code}`]
    );
    expect(missing).toEqual([]);
  });

  it('writes the Spanish sentence from the code and the data', () => {
    const text = cardText('es-419', es419 as Record<string, string>);
    expect(text).toContain(
      '3 de 5 registros de insumos indican el proveedor. Agrega los que faltan antes de la auditoría.'
    );
    expect(text).toContain(
      'A 2 de 5 registros de aplicación les faltan campos obligatorios: plaga o enfermedad objetivo (2); 2 tienen una base orgánica aún sin confirmar.'
    );
    expect(text).toContain(
      'Plan v4, Borrador: 4 de 6 secciones superan el mínimo de narrativa; por debajo del mínimo: Plan de monitoreo (a)(3) y Barreras contra la mezcla (a)(5).'
    );
    // Only the counts above zero are said, each with its own citation, joined by semicolons.
    expect(text).toContain(
      'Condiciones de la Lista Nacional (§ 205.601(j)(6), (j)(7); § 205.602(c))'
    );
    expect(text).toContain(
      '1 registro de cloruro de calcio aplicado al suelo (§ 205.602(c) solo lo permite como aspersión foliar); 2 aplicaciones de micronutrientes sin un resultado de suelo o tejido registrado en la fecha de la aplicación o antes. Abre cada registro para revisarlo frente a la condición.'
    );
    expect(text).not.toContain('sulfato de magnesio');
    expect(text).not.toContain('fill before audit');
    // A code the catalogue does not know keeps the server's true English sentence.
    expect(text).toContain('A sentence the catalogue has not learned yet');
  });

  it('says the orchard read rows in Spanish: bought compost, no sale, a plan written in Trazo', () => {
    // Orchard specimen read (2026-11-15): these rows were new and printed the English detail on
    // the Spanish card.
    const intl = createIntl({ locale: 'es-419', messages: es419 as Record<string, string> });
    const say = (detail_code: string, params: Record<string, unknown>) =>
      seasonRowDetail(intl, { detail: 'english fallback', detail_code, params });
    expect(say('compost.supplier_documents_missing', { count: 1 })).toBe(
      '1 registro de compost comprado no tiene en archivo la documentación del proceso del proveedor (C:N, temperaturas, volteos). Pídesela al proveedor antes de la inspección.'
    );
    expect(say('compost.fields_missing', { cn: 1, method: 0, temperature: 0, purchased: 2 })).toBe(
      'Falta en los registros de compost: C:N en 1 registro. Agrégalo antes de la inspección. Compost comprado: no hay en archivo la documentación del proceso del proveedor para 2 registros.'
    );
    expect(say('compost.fields_missing', { cn: 1, method: 0, temperature: 0 })).toBe(
      'Falta en los registros de compost: C:N en 1 registro. Agrégalo antes de la inspección.'
    );
    expect(say('sales_documentation.no_sale', {})).toBe(
      'No hay una venta registrada para este lote.'
    );
    expect(say('ofpp.written_in_trazo', { date: '2026-11-15' })).toBe(
      'Redactado en Trazo el 2026-11-15 (módulo G2.0 del OSP).'
    );
  });

  it('writes the English card from the same catalogue', () => {
    const text = cardText('en-US', enUS as Record<string, string>);
    expect(text).toContain(
      '3 of 5 input records name a supplier. Add the missing suppliers before the audit.'
    );
  });
});
