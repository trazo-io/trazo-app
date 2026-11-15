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
    expect(row).toHaveTextContent('assigned your operation the renewal date January 1');
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
      "For a renewal on January 1, Oregon Tilth Certified Organic (OTCO)'s fee schedule asks for sales from Oct 1, 2025 to Sep 30, 2026."
    );
    expect(screen.getByTestId('agent-sheet-gross_sales')).not.toHaveTextContent('$');
    expect(screen.getByTestId('agent-sheet-sales_period')).toHaveTextContent(
      'For a renewal on January 1'
    );
  });

  it("names an April renewal's calendar-year figure as the agent's own months", () => {
    result = {
      data: {
        ...sheet,
        rows: [
          {
            step: '6',
            item: 'gross_sales',
            kind: 'value',
            value: '700.00',
            source: 'sales_records',
            extra: {
              period_start: '2025-01-01',
              period_end: '2025-12-31',
              period_stated: false,
              n_sales: 1,
              n_unpriced: 0,
              published_start: '2025-01-01',
              published_end: '2025-12-31',
              renewal_date: '04-01'
            }
          }
        ]
      }
    };
    renderSheet();
    const row = screen.getByTestId('agent-sheet-gross_sales');
    expect(row).toHaveTextContent(
      "$700.00 from 1 sale invoiced as organic, Jan 1, 2025 to Dec 31, 2025, the months Oregon Tilth Certified Organic (OTCO)'s fee schedule gives a renewal on April 1."
    );
    expect(row).not.toHaveTextContent('no sales period is set');
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

  const ccofSheet = {
    agent: 'ccof',
    agent_name: 'CCOF Certification Services, LLC',
    form: {
      title: 'Annual Renewal Contract',
      document_id: 'Annual Renewal Contract',
      revision: '',
      url: 'https://www.ccof.org/payments/',
      stem: 'Annual-Renewal-Contract'
    },
    forms: [
      {
        title: 'Annual Renewal Contract',
        document_id: 'Annual Renewal Contract',
        revision: '',
        url: 'https://www.ccof.org/payments/',
        stem: 'Annual-Renewal-Contract'
      },
      {
        title: 'Crop Update',
        document_id: 'ORGB88',
        revision: 'V2, R1, 12/03/2024',
        url: 'https://www.ccof.org/',
        stem: 'Crop-Update-ORGB88'
      }
    ],
    plan_version: 2,
    filing_id: 9,
    rows: [
      {
        step: '0',
        item: 'ccof_due',
        kind: 'note',
        value: null,
        source: '',
        extra: {
          due: '01-01',
          withdraw_by: '02-15',
          late_fee: '150',
          portal: 'MyCCOF',
          phone: '(831) 423-2263',
          online_url: 'https://www.ccof.org/renew'
        }
      },
      {
        step: '2',
        item: 'ccof_osp_update',
        kind: 'yours',
        value: null,
        source: '',
        extra: {
          has_filing: true,
          additions: 2,
          deletions: 1,
          application_info_changes: false,
          osp_update_email: 'inbox@ccof.org',
          portal: 'MyCCOF'
        }
      },
      {
        step: 'details',
        item: 'submitter_name',
        kind: 'value',
        value: 'Ana M. Diaz',
        source: 'filing',
        extra: {}
      },
      {
        step: 'terms',
        item: 'ccof_accept_terms',
        kind: 'yours',
        value: null,
        source: '',
        extra: {}
      },
      {
        step: 'orgb88',
        item: 'crop_update_parcels',
        kind: 'value',
        value: [
          {
            number: '#01',
            name: 'Home Ranch',
            acres: 12.4,
            planned: 'Honeycrisp 6.2 ac, Gala 6.2 ac',
            crops: []
          }
        ],
        source: 'parcels',
        extra: { excluded: [] }
      }
    ]
  };

  it("words CCOF's contract: its dates, the Step 2 election beside the year's filing, and the crop update", () => {
    result = { data: ccofSheet };
    renderSheet();
    expect(
      screen.getByText("CCOF Certification Services, LLC's renewal forms: what to copy")
    ).toBeInTheDocument();
    const due = screen.getByTestId('agent-sheet-ccof_due');
    expect(due).toHaveTextContent('by January 1');
    expect(due).toHaveTextContent('February 15 is the last day to withdraw');
    expect(due).toHaveTextContent('$150 late fee');
    const step2 = screen.getByTestId('agent-sheet-ccof_osp_update');
    expect(step2).toHaveTextContent('Yours to answer');
    expect(step2).toHaveTextContent('2 additions and 1 deletion.');
    expect(step2).toHaveTextContent('no update indicated as "no changes have occurred"');
    expect(screen.getByTestId('agent-sheet-ccof_accept_terms')).toHaveTextContent(
      'Signing your annual update in Trazo is not this acceptance.'
    );
    expect(screen.getByTestId('agent-sheet-crop_update_parcels')).toHaveTextContent(
      '#01 · Home Ranch · 12.4 ac · planned: Honeycrisp 6.2 ac, Gala 6.2 ac'
    );
    expect(screen.getByText('Crop Update (ORGB88), only if your crops change')).toBeInTheDocument();
  });

  // WSDA's fee form is not reproduced (overall review 2026-11, OV-PK-W01; WSDA, reply received by 2026-11-09: "Our
  // fee forms are updated regularly. Inputting it in your system would potentially cause an
  // operation to use an outdated form."): one row, no link, and no mailing box, payee or late fee
  // read from the old published copy (OV-PK-W17).
  const wsdaSheet = {
    agent: 'wsda',
    agent_name: 'Washington State Department of Agriculture',
    form: {
      title: 'Renewal Fee Form',
      document_id: 'AGR 2521',
      revision: '',
      url: '',
      stem: '2521-renewal-fee',
      sent_with_renewal: true,
      not_reproduced: true
    },
    forms: [
      {
        title: 'Renewal Fee Form',
        document_id: 'AGR 2521',
        revision: '',
        url: '',
        stem: '2521-renewal-fee',
        sent_with_renewal: true,
        not_reproduced: true
      },
      {
        title: 'Site Update Information',
        document_id: 'AGR 2516',
        revision: 'R 01/20',
        url: 'https://agr.wa.gov/',
        stem: '2516-site-update',
        sent_with_renewal: false,
        not_reproduced: false
      }
    ],
    plan_version: 2,
    filing_id: 9,
    rows: [
      {
        step: '0',
        item: 'wsda_due',
        kind: 'note',
        value: null,
        source: '',
        extra: { due: '03-01', email: 'organic@agr.wa.gov', phone: '(360) 902-1805' }
      },
      {
        step: '2521',
        item: 'wsda_fee_form',
        kind: 'yours',
        value: null,
        source: '',
        extra: { year: 2026, subtotal: '640.00', n_sales: 1, n_unpriced: 0 }
      }
    ]
  };

  it("sends the grower to WSDA's own fee form and gives Trazo's subtotal only as a cross-check", () => {
    result = { data: wsdaSheet };
    renderSheet();
    const fee = screen.getByTestId('agent-sheet-wsda_fee_form');
    expect(fee).toHaveTextContent('The copy the agent sent');
    expect(fee).toHaveTextContent('Yours to answer');
    expect(fee).not.toHaveTextContent('From Trazo');
    expect(fee).toHaveTextContent(
      'Use the fee form the agent sends with your renewal application. The agent updates it regularly and does not publish it'
    );
    expect(fee).toHaveTextContent(
      'For checking your own figures only: your sales records in Trazo show $640.00'
    );
    expect(fee).toHaveTextContent('This is not a fee figure.');
    expect(screen.getByTestId('agent-sheet-wsda_due')).toHaveTextContent(
      'Your renewal application is due by March 1.'
    );
    // Nothing read from the old published copy is left: no mailing box, payee, late fee or "by mail".
    const page = document.body.textContent || '';
    for (const gone of ['42591', 'payable to', 'late fee', 'by mail', 'Gross annual income']) {
      expect(page).not.toContain(gone);
    }
    // Named, never linked; a published form keeps its link.
    expect(screen.getByText(/AGR 2521; AGR 2516, R 01\/20/)).toBeInTheDocument();
    expect(
      screen.getByText(
        /AGR 2521 \(the agent sends it with your renewal application; not linked here\)/
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /AGR 2521/ })).toBeNull();
    expect(screen.getByRole('link', { name: 'AGR 2516' })).toBeInTheDocument();
  });

  it("speaks Spanish for WSDA's forms too", () => {
    result = { data: wsdaSheet };
    renderSheet('es-419', esLA);
    expect(screen.getByText('Formulario de tarifa de renovación (AGR 2521)')).toBeInTheDocument();
    expect(screen.getByTestId('agent-sheet-wsda_fee_form')).toHaveTextContent(
      'Usa el formulario de tarifa que el agente envía con tu solicitud de renovación.'
    );
    expect(screen.getByTestId('agent-sheet-wsda_fee_form')).toHaveTextContent(
      'No es una cifra de tarifa.'
    );
  });

  it('renders nothing for an agent without a copy sheet', () => {
    result = { isError: true };
    const { container } = renderSheet();
    expect(container.textContent).toBe('');
  });
});

describe('a first plan version in Trazo, the certifier holding the plan filed before Trazo', () => {
  // Overall review 2026-11 (OV-PK-C01 / O02): there is nothing Trazo can compare against, and the
  // rows say so instead of asking for a new plan version that would not help.
  it('says why Step 4 and new land have no list, and leaves them to the grower', () => {
    result = {
      data: {
        ...sheet,
        rows: [
          {
            step: '4',
            item: 'osp_changes',
            kind: 'yours',
            value: null,
            source: '',
            extra: { state: 'first_version', prior_version: 1, new_version: null }
          },
          {
            step: '4',
            item: 'new_land',
            kind: 'not_recorded',
            value: null,
            source: '',
            extra: { reason: 'first_version' }
          }
        ]
      }
    };
    renderSheet();
    expect(screen.getByTestId('agent-sheet-osp_changes')).toHaveTextContent(
      'Your certifier holds the plan you filed before Trazo, and Trazo has no copy of it'
    );
    const land = screen.getByTestId('agent-sheet-new_land');
    expect(land).toHaveTextContent('cannot tell which land is new to it');
    expect(land).not.toHaveTextContent('creates a new plan version');
  });

  it("puts CCOF's Step 2 counts against the plan CCOF holds", () => {
    result = {
      data: {
        ...sheet,
        rows: [
          {
            step: '2',
            item: 'ccof_osp_update',
            kind: 'yours',
            value: null,
            source: '',
            extra: {
              has_filing: true,
              first_version: true,
              additions: 1,
              deletions: 0,
              application_info_changes: false,
              osp_update_email: 'inbox@ccof.org',
              portal: 'MyCCOF'
            }
          }
        ]
      }
    };
    renderSheet();
    expect(screen.getByTestId('agent-sheet-ccof_osp_update')).toHaveTextContent(
      'the changes in your update are your own account against that plan'
    );
  });
});

describe("the grower's own statement of what changed against the plan the certifier holds", () => {
  it('lists the stated sections as the update states them, not as a comparison', () => {
    result = {
      data: {
        ...sheet,
        rows: [
          {
            step: '4',
            item: 'osp_changes',
            kind: 'value',
            value: [{ label: 'C5 Pest, Disease & Weed Management', files: ['modules/G5_0.pdf'] }],
            source: 'filing',
            extra: { stated: true, prior_version: 1 }
          }
        ]
      }
    };
    renderSheet();
    const changes = screen.getByTestId('agent-sheet-osp_changes');
    expect(changes).toHaveTextContent(
      'Sections your annual update states changed against the plan your certifier holds.'
    );
    expect(changes).toHaveTextContent('C5 Pest, Disease & Weed Management');
    expect(changes).not.toHaveTextContent('Answers changed between plan');
  });

  it('says the update states nothing changed', () => {
    result = {
      data: {
        ...sheet,
        rows: [
          {
            step: '4',
            item: 'osp_changes',
            kind: 'value',
            value: [],
            source: 'filing',
            extra: { stated: true, prior_version: 1 }
          }
        ]
      }
    };
    renderSheet();
    expect(screen.getByTestId('agent-sheet-osp_changes')).toHaveTextContent(
      'Your annual update states that nothing changed against the plan your certifier holds.'
    );
  });
});
