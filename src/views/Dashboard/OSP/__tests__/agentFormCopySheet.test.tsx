/**
 * The copy sheet for the agent's renewal form names what to copy and never answers for the grower.
 *
 * Rows come from the server as keys; this component words them. Pinned here: a "yours" row shows
 * no value, every status chip is the same neutral grey (a chip says who answers, not how well),
 * the sales figure says it is not the fee figure, and nothing renders for an agent without a sheet.
 */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';

import enUS from 'i18n/lang/en-US.json';
import esLA from 'i18n/lang/es-419.json';

const sheet = {
  agent: 'otco',
  agent_name: 'Oregon Tilth Certified Organic (OTCO)',
  form: {
    title: 'Organic System Plan Update Application & Agreement',
    document_id: 'OSP Update Form',
    revision: 'Rev. 2024/09/20',
    url: 'https://tilth.org/help-center/renewals/'
  },
  plan_version: 4,
  filing_id: 4,
  rows: [
    {
      step: '1',
      item: 'business_name',
      kind: 'value',
      value: 'Brandt Family Farms LLC',
      source: 'company',
      extra: {}
    },
    {
      step: '1',
      item: 'client_id',
      kind: 'not_recorded',
      value: null,
      source: '',
      extra: {
        where: 'agent_certificate_and_letters',
        edit: { target: 'establishment', field: 'certifier_client_id', agent: 'otco' }
      }
    },
    {
      step: '1',
      item: 'contact_email',
      kind: 'value',
      value: 'laurel@calapooiabend.example',
      source: 'establishment',
      extra: {}
    },
    {
      step: '1',
      item: 'public_email',
      kind: 'yours',
      value: null,
      source: '',
      extra: { same_as_above: true }
    },
    {
      step: '4',
      item: 'submit_changes_early',
      kind: 'note',
      value: null,
      source: '',
      extra: { osp_portal_url: 'https://myotco.org/Login.aspx' }
    },
    { step: '2', item: 'continue_or_withdraw', kind: 'yours', value: null, source: '', extra: {} },
    {
      step: '4',
      item: 'osp_changes',
      kind: 'value',
      value: [
        { label: 'C5 Crop Pest, Weed & Disease Management', files: ['modules/G5_0.pdf'] },
        { label: 'C11 Crop Materials List', files: ['modules/materials_application.pdf'] }
      ],
      source: 'plan',
      extra: { prior_version: 3, new_version: 4 }
    },
    {
      step: '6',
      item: 'gross_sales',
      kind: 'value',
      value: '2000.00',
      source: 'sales_records',
      extra: {
        period_start: '2025-10-01',
        period_end: '2026-09-30',
        period_stated: true,
        n_sales: 1,
        n_unpriced: 0
      }
    }
  ]
};

let result: { data?: unknown; isError?: boolean } = { data: sheet };
vi.mock('store/api/ospApi', () => ({
  useGetAgentFormSheetQuery: () => result
}));

const editFarm = vi.fn((_args: Record<string, unknown>) => ({ unwrap: () => Promise.resolve({}) }));
vi.mock('store/api/companyApi', () => ({
  useEditFarmMutation: () => [editFarm, { isLoading: false }],
  useUpdateCompanyMutation: () => [vi.fn(), { isLoading: false }]
}));

let role = { canWrite: true, canManageCompany: true };
vi.mock('hooks/useUserRole', () => ({ useUserRole: () => role }));

import AgentFormCopySheet from '../AgentFormCopySheet';

const renderSheet = (locale = 'en-US', messages: Record<string, string> = enUS) =>
  render(
    <ChakraProvider>
      <IntlProvider locale={locale} messages={messages}>
        <AgentFormCopySheet companyId="1" farmId="2" ospId={4} />
      </IntlProvider>
    </ChakraProvider>
  );

describe('the agent-form copy sheet', () => {
  it("gives the values Trazo holds and says plainly what is the grower's", () => {
    result = { data: sheet };
    renderSheet();
    expect(
      screen.getByText("Oregon Tilth Certified Organic (OTCO)'s renewal form: what to copy")
    ).toBeInTheDocument();
    expect(screen.getByTestId('agent-sheet-business_name')).toHaveTextContent(
      'Brandt Family Farms LLC'
    );
    expect(screen.getByTestId('agent-sheet-client_id')).toHaveTextContent(
      'not your certificate number'
    );
    const election = screen.getByTestId('agent-sheet-continue_or_withdraw');
    expect(election).toHaveTextContent('Yours to answer');
    expect(election).toHaveTextContent('Answer it on the form.');
  });

  it("lists the changed sections by the agent's form codes", () => {
    result = { data: sheet };
    renderSheet();
    const changes = screen.getByTestId('agent-sheet-osp_changes');
    expect(changes).toHaveTextContent('C5 Crop Pest, Weed & Disease Management');
    expect(changes).toHaveTextContent('C11 Crop Materials List');
    expect(changes).toHaveTextContent('between plan v3 and v4');
  });

  it('gives the sales figure as a starting point over the stated period, with a singular sale', () => {
    result = { data: sheet };
    renderSheet();
    const sales = screen.getByTestId('agent-sheet-gross_sales');
    expect(sales).toHaveTextContent(
      '$2,000.00 from 1 sale invoiced as organic, Oct 1, 2025 to Sep 30, 2026.'
    );
    expect(sales).toHaveTextContent('not the fee figure');
  });

  it('colours every status chip the same neutral grey', () => {
    result = { data: sheet };
    const { container } = renderSheet();
    const chips = Array.from(container.querySelectorAll('.chakra-badge'));
    expect(chips.length).toBe(sheet.rows.length);
    const colours = new Set(chips.map((chip) => getComputedStyle(chip).color));
    expect(colours.size).toBe(1);
  });

  it('speaks Spanish from the es-419 file', () => {
    result = { data: sheet };
    renderSheet('es-419', esLA);
    expect(screen.getByText('Paso 1')).toBeInTheDocument();
    expect(screen.getByTestId('agent-sheet-continue_or_withdraw')).toHaveTextContent(
      'Lo respondes tú'
    );
  });

  it('lets the grower add the Client ID once, saved with the agent that issued it', async () => {
    result = { data: sheet };
    role = { canWrite: true, canManageCompany: true };
    editFarm.mockClear();
    renderSheet();
    const row = screen.getByTestId('agent-sheet-client_id');
    expect(row).toHaveTextContent('not your certificate number');
    fireEvent.click(within(row).getByRole('button', { name: 'Add it to Trazo' }));
    fireEvent.change(within(row).getByLabelText('Value'), { target: { value: 'OT-4471' } });
    fireEvent.click(within(row).getByRole('button', { name: 'Save' }));
    await Promise.resolve();
    expect(editFarm).toHaveBeenCalledWith({
      companyId: '1',
      farmId: '2',
      establishmentData: { certifier_client_id: 'OT-4471', certifier_client_id_agent: 'otco' }
    });
  });

  it('offers no edit to a viewer', () => {
    result = { data: sheet };
    role = { canWrite: false, canManageCompany: false };
    renderSheet();
    expect(screen.queryByRole('button', { name: 'Add it to Trazo' })).toBeNull();
    role = { canWrite: true, canManageCompany: true };
  });

  it('names a form instruction as the form\'s, and offers "same as above" with the value', () => {
    result = { data: sheet };
    renderSheet();
    expect(screen.getByTestId('agent-sheet-submit_changes_early')).toHaveTextContent(
      'From the form'
    );
    expect(screen.getByTestId('agent-sheet-public_email')).toHaveTextContent(
      'only if it should be laurel@calapooiabend.example'
    );
  });

  it('says when new land is not compared, and asks the grower to list it', () => {
    result = {
      data: {
        ...sheet,
        rows: [
          {
            step: '4',
            item: 'new_land',
            kind: 'not_recorded',
            value: null,
            source: '',
            extra: { reason: 'no_new_version' }
          }
        ]
      }
    };
    renderSheet();
    expect(screen.getByTestId('agent-sheet-new_land')).toHaveTextContent('list any land you added');
  });

  it('gives no sales figure for a calendar year that is not over', () => {
    result = {
      data: {
        ...sheet,
        rows: [
          {
            step: '6',
            item: 'gross_sales',
            kind: 'not_recorded',
            value: null,
            source: 'sales_records',
            extra: {
              period_start: '2026-01-01',
              period_end: '2026-12-31',
              period_stated: false,
              n_sales: 7,
              n_unpriced: 0,
              reason: 'period_not_over'
            }
          }
        ]
      }
    };
    renderSheet();
    const row = screen.getByTestId('agent-sheet-gross_sales');
    expect(row).toHaveTextContent('Calendar 2026 is not over yet');
    expect(row).not.toHaveTextContent('No sale invoiced');
  });

  const renewalRow = (kind: 'value' | 'not_recorded', value: string | null) => ({
    step: '0',
    item: 'renewal_deadline',
    kind,
    value,
    source: kind === 'value' ? 'establishment' : '',
    extra: {
      renewal_dates: ['01-01', '04-01'],
      edit: {
        target: 'establishment',
        field: 'certifier_renewal_date',
        agent: 'otco',
        options: ['01-01', '04-01']
      }
    }
  });

  it("records the agent's renewal date as a choice of its two, saved with the agent", async () => {
    result = { data: { ...sheet, rows: [renewalRow('not_recorded', null)] } };
    role = { canWrite: true, canManageCompany: true };
    editFarm.mockClear();
    renderSheet();
    const row = screen.getByTestId('agent-sheet-renewal_deadline');
    fireEvent.click(within(row).getByRole('button', { name: 'Add it to Trazo' }));
    const select = within(row).getByLabelText('Value');
    expect(Array.from(select.querySelectorAll('option')).map((o) => o.textContent)).toEqual([
      'Choose',
      'January 1',
      'April 1'
    ]);
    fireEvent.change(select, { target: { value: '04-01' } });
    fireEvent.click(within(row).getByRole('button', { name: 'Save' }));
    await Promise.resolve();
    expect(editFarm).toHaveBeenCalledWith({
      companyId: '1',
      farmId: '2',
      establishmentData: { certifier_renewal_date: '04-01', certifier_renewal_date_agent: 'otco' }
    });
  });

  it('gives a recorded renewal date with a way to change it', () => {
    result = { data: { ...sheet, rows: [renewalRow('value', '01-01')] } };
    renderSheet();
    const row = screen.getByTestId('agent-sheet-renewal_deadline');
    expect(row).toHaveTextContent('assigned your operation a January 1 renewal date');
    expect(within(row).getByRole('button', { name: 'Change' })).toBeInTheDocument();
  });

  it("asks for the period before any figure, naming the agent's own months for the date", () => {
    result = {
      data: {
        ...sheet,
        rows: [
          {
            step: '6',
            item: 'gross_sales',
            kind: 'not_recorded',
            value: null,
            source: 'sales_records',
            extra: {
              reason: 'period_not_stated',
              published_start: '2025-10-01',
              published_end: '2026-09-30',
              renewal_date: '01-01'
            }
          },
          {
            step: '6',
            item: 'sales_period',
            kind: 'not_recorded',
            value: null,
            source: '',
            extra: {
              where: 'annual_update',
              published_start: '2025-10-01',
              published_end: '2026-09-30',
              renewal_date: '01-01'
            }
          }
        ]
      }
    };
    renderSheet();
    expect(screen.getByTestId('agent-sheet-gross_sales')).toHaveTextContent(
      "For a January 1 renewal, Oregon Tilth Certified Organic (OTCO)'s fee schedule asks for sales from Oct 1, 2025 to Sep 30, 2026."
    );
    expect(screen.getByTestId('agent-sheet-gross_sales')).not.toHaveTextContent('$');
    expect(screen.getByTestId('agent-sheet-sales_period')).toHaveTextContent(
      'For a January 1 renewal'
    );
  });

  it('without a recorded date, says what each of the two dates asks for', () => {
    result = {
      data: {
        ...sheet,
        rows: [
          {
            step: '6',
            item: 'gross_sales',
            kind: 'not_recorded',
            value: null,
            source: 'sales_records',
            extra: { reason: 'period_not_stated' }
          }
        ]
      }
    };
    renderSheet();
    expect(screen.getByTestId('agent-sheet-gross_sales')).toHaveTextContent(
      'October to September for a January 1 renewal'
    );
  });

  it('renders nothing for an agent without a copy sheet', () => {
    result = { isError: true };
    const { container } = renderSheet();
    expect(container.textContent).toBe('');
  });
});
