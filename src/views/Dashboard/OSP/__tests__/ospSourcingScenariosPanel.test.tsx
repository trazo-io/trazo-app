/**
 * G8.0 §D, CCOF G8.0 D1's supply-chain scenarios (2026-11-19).
 *
 * The panel shows what the plan's answers in G3.0, G3.0b, G6.5, G6.1, G6.2 and G7.0 say, from the
 * server; it asks nothing. Three states: a module not answered yet reads "Not answered yet" and
 * names where to answer it, never "No". A failed load is never an empty list.
 */
import React from 'react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../i18n/lang/en-US.json';
import es419 from '../../../../i18n/lang/es-419.json';
import OSPSourcingScenariosPanel from '../OSPSourcingScenariosPanel';

let query: Record<string, unknown> = {};

vi.mock('store/api/ospApi', () => ({
  useGetOSPSourcingScenariosQuery: () => query
}));

const row = (key: string, state: string, answered_in: string[], en: string, es: string) => ({
  key,
  state,
  answered_in,
  unanswered_in: state === 'not_stated' ? answered_in : [],
  label: { en, es }
});

const SEED = row(
  'organic_seed_or_stock',
  'no',
  ['G3.0', 'G3.0b'],
  'Buys certified organic seed, annual seedlings or planting stock',
  'Compra semilla, plántulas anuales o material de plantación orgánicos certificados'
);
const RESALE = row(
  'organic_product_for_resale',
  'yes',
  ['G6.5'],
  'Sources certified organic crops or products for resale or distribution',
  'Adquiere cultivos o productos orgánicos certificados para revender o distribuir'
);
const HANDLED = row(
  'crop_to_another_operation',
  'no',
  ['G6.1', 'G6.2'],
  'Sends certified organic crops to another operation for storage, handling or processing',
  'Envía cultivos orgánicos certificados a otra operación para almacenarlos, manejarlos o procesarlos'
);
const BRAND = row(
  'packs_for_brand_owners',
  'not_stated',
  ['G7.0'],
  'Packs into brands or labels owned by other operations',
  'Empaca bajo marcas o etiquetas de otras operaciones'
);

const renderPanel = (locale = 'en-US') =>
  render(
    <ChakraProvider>
      <IntlProvider
        locale={locale}
        messages={(locale === 'en-US' ? enUS : es419) as Record<string, string>}>
        <OSPSourcingScenariosPanel companyId="3" farmId="1" ospId={9} />
      </IntlProvider>
    </ChakraProvider>
  );

describe('OSPSourcingScenariosPanel', () => {
  beforeEach(() => {
    query = {
      data: { scenarios: [SEED, RESALE, HANDLED, BRAND], section_b: null },
      isLoading: false,
      isError: false
    };
  });

  it('shows each scenario with its state and the modules it comes from', () => {
    renderPanel();
    const rows = screen.getAllByTestId('sourcing-scenario-row');
    expect(rows).toHaveLength(4);
    expect(rows[0].textContent).toContain(SEED.label.en);
    expect(rows[0].textContent).toContain('No');
    expect(rows[0].textContent).toContain('From your answers in G3.0 and G3.0b');
    expect(rows[1].textContent).toContain('Yes');
    expect(rows[1].textContent).toContain('From your answers in G6.5');
  });

  it('a module not answered yet is "Not answered yet" with where to answer it, never No', () => {
    renderPanel();
    const brand = screen.getAllByTestId('sourcing-scenario-row')[3];
    expect(brand.textContent).toContain('Not answered yet');
    expect(brand.textContent).toContain('Answer it in G7.0 and it shows here.');
    expect(brand.textContent).not.toMatch(/\bNo\b/);
    expect(screen.queryByTestId('sourcing-none-apply')).toBeNull();
  });

  it('says none applies only when all four read No', () => {
    query = {
      data: {
        scenarios: [SEED, { ...RESALE, state: 'no' }, HANDLED, { ...BRAND, state: 'no' }],
        section_b: null
      },
      isLoading: false,
      isError: false
    };
    renderPanel();
    expect(screen.getByTestId('sourcing-none-apply').textContent).toBe(
      'None of these applies, as your plan states it.'
    );
  });

  it('reads in the reader’s language', () => {
    renderPanel('es-419');
    const rows = screen.getAllByTestId('sourcing-scenario-row');
    expect(rows[1].textContent).toContain(RESALE.label.es);
    expect(rows[1].textContent).toContain('Sí');
    expect(rows[3].textContent).toContain('Sin responder');
  });

  it('names only the module still open, not every module the scenario reads', () => {
    query = {
      data: {
        scenarios: [{ ...HANDLED, state: 'not_stated', unanswered_in: ['G6.2'] }],
        section_b: null
      },
      isLoading: false,
      isError: false
    };
    renderPanel();
    expect(screen.getByTestId('sourcing-scenario-row').textContent).toContain(
      'Answer it in G6.2 and it shows here.'
    );
  });

  it('shows the section B disagreement the packet flags for review', () => {
    query = {
      data: { scenarios: [SEED, RESALE, HANDLED, BRAND], section_b: 'says_none' },
      isLoading: false,
      isError: false
    };
    renderPanel();
    const row = screen.getByTestId('sourcing-section-b-row');
    expect(row.textContent).toContain('Two answers disagree');
    expect(row.textContent).toContain('says you source no organic agricultural products');
  });

  it('shows no disagreement row when section B agrees', () => {
    renderPanel();
    expect(screen.queryByTestId('sourcing-section-b-row')).toBeNull();
  });

  it('a stated fact wears the neutral badge, never the success green (review of app #440)', () => {
    const code = readFileSync(
      resolve(process.cwd(), 'src/views/Dashboard/OSP/OSPSourcingScenariosPanel.tsx'),
      'utf8'
    );
    expect(code).toMatch(/variant=\{open \? 'warning' : 'neutral'\}/);
    expect(code).not.toMatch(/variant="subtle"|'subtle'|colorScheme="green"/);
  });

  it('a failed load says so instead of showing an empty list', () => {
    query = { data: undefined, isLoading: false, isError: true };
    renderPanel();
    expect(screen.getByText(/could not be loaded/)).toBeTruthy();
    expect(screen.queryByTestId('sourcing-scenario-row')).toBeNull();
  });
});
