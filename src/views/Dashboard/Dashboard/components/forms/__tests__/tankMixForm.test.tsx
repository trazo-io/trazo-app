/**
 * "Add a product to this tank" on the spray form (OV-RK-C04).
 *
 * A new spray adds products 2..N as lines, each with its own name, EPA number, amount or rate,
 * concentration or "not on my record", REI, PHI, organic basis and role; the old "tank-mix
 * adjuvants" block is gone from new records and stays on a record that already holds partners.
 * Each line answers what product 1 answers (the form's schema), and with several parcels its
 * amount moves to the parcel cards.
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider, createIntl } from 'react-intl';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import enUS from '../../../../../../i18n/lang/en-US.json';
import { baseApi } from 'store/api/baseApi';
import { newTankLine } from 'config/events/tankMix';
// @ts-expect-error ChemicalTab-ENHANCED is a .jsx module with no type declarations (same
// suppression as sprayFormFollowsFarmState, which mounts it the same way).
import ChemicalTab, { buildChemicalSchema } from '../ChemicalTab-ENHANCED';

afterEach(cleanup);

const messages = enUS as unknown as Record<string, string>;
const intl = createIntl({ locale: 'en', messages });

const store = () =>
  configureStore({
    reducer: {
      company: () => ({
        currentCompany: {
          id: 1,
          establishments: [{ id: 1, name: 'Test Orchard', state: 'WA', country: 'US' }]
        }
      }),
      [baseApi.reducerPath]: baseApi.reducer
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware)
  });

const SPRAY = {
  type: 'PE',
  commercial_name: 'Entrust SC',
  application_method: 'air_blast'
};

const mount = (props: Record<string, unknown> = {}, initial: Record<string, unknown> = {}) =>
  render(
    <Provider store={store()}>
      <MemoryRouter initialEntries={['/admin/dashboard/farm/1/parcel/2/event/add']}>
        <Routes>
          <Route
            path="/admin/dashboard/farm/:farmId/parcel/:parcelId/event/add"
            element={
              <ChakraProvider>
                <IntlProvider locale="en" messages={messages} onError={() => undefined}>
                  <ChemicalTab
                    initialValues={{ ...SPRAY, ...initial }}
                    hideActions
                    onSubmitHandler={() => undefined}
                    {...props}
                  />
                </IntlProvider>
              </ChakraProvider>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

const addButton = () => screen.findByRole('button', { name: 'Add a product to this tank' });

describe('the tank lines on a new spray', () => {
  it('adds a product line with its own fields, and removes it', async () => {
    const { container } = mount({ allowTankMix: true });
    fireEvent.click(await addButton());
    const line = await screen.findByTestId('tank-line-2');
    expect(within(line).getByText('Product 2 in the tank')).toBeInTheDocument();
    for (const key of [
      'role',
      'type',
      'commercial_name',
      'active_ingredient',
      'epa_registration_number',
      'concentration',
      'volume_numeric',
      'volume_unit',
      'application_rate',
      'application_rate_unit',
      'rei_hours',
      'phi_days',
      'organic_approved',
      'target_pest_disease',
      'application_purpose',
      // Purchase details, asked as product 1 asks them.
      'supplier_name',
      'purchase_date',
      'purchase_invoice',
      'chemical_lot_number',
      'quantity_purchased',
      'quantity_purchased_unit'
    ]) {
      expect(container.querySelector(`[name="tank_lines.0.${key}"]`), key).not.toBeNull();
    }
    expect(within(line).getByText('Not on my record')).toBeInTheDocument();

    fireEvent.click(await addButton());
    expect(await screen.findByTestId('tank-line-3')).toBeInTheDocument();

    fireEvent.click(within(line).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(screen.queryByTestId('tank-line-3')).toBeNull());
    expect(screen.getByTestId('tank-line-2')).toBeInTheDocument();
  });

  it('a name typed on a line reaches the wizard, as a new array each time', async () => {
    // Found rendering the tank mix at 375 px (2026-11-12): the per-parcel amount kept reading
    // "Product 2 applied" after the grower typed "Kocide 3000-O". The change check held the
    // tank-lines array react-hook-form mutates in place, so it compared the lines with themselves
    // and never handed the edit up; and the wizard memoises on that array's identity.
    const onDataChange = vi.fn();
    const { container } = mount({ allowTankMix: true, onDataChange });
    fireEvent.click(await addButton());
    await screen.findByTestId('tank-line-2');
    const name = container.querySelector(
      '[name="tank_lines.0.commercial_name"]'
    ) as HTMLInputElement;
    fireEvent.change(name, { target: { value: 'Kocide 3000-O' } });
    await waitFor(
      () => {
        const names = onDataChange.mock.calls.map(([v]) => v?.tank_lines?.[0]?.commercial_name);
        expect(names).toContain('Kocide 3000-O');
      },
      { timeout: 3000 }
    );
    fireEvent.change(name, { target: { value: 'Kocide 3000' } });
    await waitFor(
      () => {
        const names = onDataChange.mock.calls.map(([v]) => v?.tank_lines?.[0]?.commercial_name);
        expect(names[names.length - 1]).toBe('Kocide 3000');
      },
      { timeout: 3000 }
    );
    const sent = onDataChange.mock.calls.map(([v]) => v?.tank_lines).filter(Boolean);
    expect(sent[sent.length - 1]).not.toBe(sent[sent.length - 2]);
  });

  it('an adjuvant keeps the spray’s type, so the line asks none', async () => {
    const { container } = mount({ allowTankMix: true });
    fireEvent.click(await addButton());
    await screen.findByTestId('tank-line-2');
    fireEvent.change(container.querySelector('[name="tank_lines.0.role"]')!, {
      target: { value: 'adjuvant' }
    });
    await waitFor(() => expect(container.querySelector('[name="tank_lines.0.type"]')).toBeNull());
    expect(container.querySelector('[name="tank_lines.0.commercial_name"]')).not.toBeNull();
  });

  it('warns about a blank organic basis on every line, not only product 1', async () => {
    mount({ allowTankMix: true });
    const warning = /No organic basis chosen yet/;
    await waitFor(() => expect(screen.getAllByText(warning)).toHaveLength(1));
    fireEvent.click(await addButton());
    await waitFor(() => expect(screen.getAllByText(warning)).toHaveLength(2));
  });

  it('with several parcels the amount is asked on the cards', async () => {
    const { container } = mount({ allowTankMix: true, multiTarget: true });
    fireEvent.click(await addButton());
    await screen.findByTestId('tank-line-2');
    expect(container.querySelector('[name="tank_lines.0.volume_numeric"]')).toBeNull();
    expect(container.querySelector('[name="tank_lines.0.volume_unit"]')).not.toBeNull();
    expect(
      screen.getByText('The amount of this product is asked on each parcel below.')
    ).toBeInTheDocument();
  });

  it('the old adjuvant block is gone from a new spray', async () => {
    const { container } = mount({ allowTankMix: true });
    await addButton();
    expect(screen.queryByText('Tank-mix adjuvants / spreader-stickers')).toBeNull();
    expect(container.querySelector('[name^="tank_mix_partners"]')).toBeNull();
  });
});

describe('a line’s own target pest and purchase', () => {
  const pestOf = (container: HTMLElement, index: number) =>
    (
      container.querySelector(
        `[name="tank_lines.${index}.target_pest_disease"]`
      ) as HTMLInputElement
    ).value;

  it('a new line starts from the pest the grower typed for product 1, and keeps its own', async () => {
    const { container } = mount({ allowTankMix: true });
    await addButton();
    fireEvent.change(container.querySelector('[name="target_pest_disease"]')!, {
      target: { value: 'Codling moth' }
    });
    fireEvent.click(await addButton());
    await screen.findByTestId('tank-line-2');
    await waitFor(() => expect(pestOf(container, 0)).toBe('Codling moth'));
    // An editable default: changing the line leaves product 1 alone.
    fireEvent.change(container.querySelector('[name="tank_lines.0.target_pest_disease"]')!, {
      target: { value: 'Fire blight' }
    });
    await waitFor(() => expect(pestOf(container, 0)).toBe('Fire blight'));
    expect(
      (container.querySelector('[name="target_pest_disease"]') as HTMLInputElement).value
    ).toBe('Codling moth');
  });

  it('never copies a pest the grower did not type (one the form opened with)', async () => {
    const { container } = mount({ allowTankMix: true }, { target_pest_disease: 'Codling moth' });
    fireEvent.click(await addButton());
    await screen.findByTestId('tank-line-2');
    expect(
      (container.querySelector('[name="target_pest_disease"]') as HTMLInputElement).value
    ).toBe('Codling moth');
    expect(pestOf(container, 0)).toBe('');
  });

  it('asks the purchase in a collapsed "Purchase details", receipt picker included', async () => {
    const { container } = mount({ allowTankMix: true });
    fireEvent.click(await addButton());
    const line = await screen.findByTestId('tank-line-2');
    const toggle = within(line).getByRole('button', { name: /Purchase details/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(line).getByText('Supplier Name')).toBeInTheDocument();
    expect(within(line).getByText('Lot / Batch Number')).toBeInTheDocument();
    fireEvent.change(container.querySelector('[name="tank_lines.0.purchase_invoice"]')!, {
      target: { value: 'INV-2' }
    });
    await waitFor(() =>
      expect(
        (container.querySelector('[name="tank_lines.0.purchase_invoice"]') as HTMLInputElement)
          .value
      ).toBe('INV-2')
    );
  });
});

describe('a record that is not a new spray', () => {
  it('keeps showing the partners an old record holds, and offers no tank lines', async () => {
    const { container } = mount(
      {},
      {
        tank_mix_partners: [
          {
            commercial_name: 'Dyne-Amic',
            manufacturer: 'Helena',
            epa_registration_number: '',
            volume: '2',
            volume_unit: 'pt',
            organic_approved: false
          }
        ]
      }
    );
    await waitFor(() =>
      expect(container.querySelector('[name="tank_mix_partners.0.commercial_name"]')).not.toBeNull()
    );
    expect(
      (container.querySelector('[name="tank_mix_partners.0.commercial_name"]') as HTMLInputElement)
        .value
    ).toBe('Dyne-Amic');
    expect(screen.queryByRole('button', { name: 'Add a product to this tank' })).toBeNull();
  });

  it('hides the fuel input on a tank line whose pass is recorded on another line', async () => {
    const { container } = mount(
      {},
      { tank_mix: { line: 2, carries_pass: false, pass_line: 1, lines: [] } }
    );
    await waitFor(() =>
      expect(container.querySelector('select[name="application_fuel_type"]')).not.toBeNull()
    );
    expect(container.querySelector('[name="application_fuel_consumed"]')).toBeNull();
  });
});

describe('each line answers what product 1 answers', () => {
  const base = {
    type: 'PE',
    commercial_name: 'Entrust SC',
    concentration: '22.5%',
    volume_numeric: '24',
    volume_unit: 'fl_oz',
    area_numeric: '4',
    area_unit: 'acres',
    application_method: 'air_blast'
  };
  const issues = (lines: unknown[], multiTarget = false) => {
    const result = buildChemicalSchema(intl, { multiTarget }).safeParse({
      ...base,
      tank_lines: lines
    });
    return result.success
      ? []
      : result.error.issues
          .filter((issue: { path: (string | number)[] }) => issue.path[0] === 'tank_lines')
          .map((issue: { path: (string | number)[] }) => issue.path.join('.'));
  };

  it('a blank line is refused field by field, at the field', () => {
    expect(issues([newTankLine()]).sort()).toEqual(
      [
        'tank_lines.0.commercial_name',
        'tank_lines.0.concentration',
        'tank_lines.0.volume_numeric'
      ].sort()
    );
  });

  it('a filled line, or "not on my record", passes', () => {
    const filled = {
      ...newTankLine('adjuvant', 'fl_oz'),
      commercial_name: 'Dyne-Amic',
      concentration_not_recorded: 'true',
      volume_numeric: '8'
    };
    expect(issues([filled])).toEqual([]);
    expect(issues([{ ...filled, concentration: '90%' }])).toEqual(['tank_lines.0.concentration']);
  });

  it('with several parcels the line needs no amount', () => {
    const line = { ...newTankLine(), commercial_name: 'Kocide 3000-O', concentration: '30%' };
    expect(issues([line], true)).toEqual([]);
    expect(issues([line])).toEqual(['tank_lines.0.volume_numeric']);
  });
});
