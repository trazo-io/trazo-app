/**
 * A record that is one product of a tank mix says so, in the detail and in the edit form, and
 * says where the pass's fuel is when it is on another line; any other record says nothing.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';

const detail = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock('store/api/historyApi', () => ({
  useGetEventQuery: () => ({ data: detail.data })
}));

import { TankMixNotice } from '../TankMixNotice';

const mount = (variant: 'detail' | 'edit', messages: Record<string, string> = enUS) =>
  render(
    <Provider
      store={configureStore({ reducer: { company: () => ({ currentCompany: { id: 1 } }) } })}>
      <ChakraProvider>
        <IntlProvider locale="en" messages={messages}>
          <TankMixNotice farmId="1" eventId="7" eventType={2} variant={variant} />
        </IntlProvider>
      </ChakraProvider>
    </Provider>
  );

const LINE_2 = {
  group: 'a1b2',
  line: 2,
  role: 'product',
  carries_pass: false,
  pass_line: 1,
  lines: [
    { id: 6, line: 1, role: 'product', commercial_name: 'Entrust SC' },
    { id: 8, line: 3, role: 'adjuvant', commercial_name: 'Dyne-Amic' }
  ]
};

describe('TankMixNotice', () => {
  it('names the tank’s other products on the record, adjuvants marked', () => {
    detail.data = { tank_mix: LINE_2 };
    mount('detail');
    expect(screen.getByText('One tank, 3 products')).toBeInTheDocument();
    expect(
      screen.getByText(/same tank as Entrust SC, Dyne-Amic \(adjuvant\)\. Each product is a record/)
    ).toBeInTheDocument();
    // The pass's fuel lives on line 1, and the record says so rather than looking fuel-less.
    expect(
      screen.getByText(/fuel of this pass is recorded on Entrust SC, line 1/)
    ).toBeInTheDocument();
  });

  it('says, when editing, that the change is this product’s only', () => {
    detail.data = { tank_mix: { ...LINE_2, line: 1, carries_pass: true, pass_line: 1 } };
    mount('edit');
    expect(screen.getByText(/changes this product's record only/)).toBeInTheDocument();
    expect(screen.queryByText(/fuel of this pass/)).toBeNull();
  });

  it('speaks Spanish', () => {
    detail.data = { tank_mix: LINE_2 };
    mount('detail', es419 as Record<string, string>);
    expect(screen.getByText('Un tanque, 3 productos')).toBeInTheDocument();
    expect(screen.getByText(/Dyne-Amic \(coadyuvante\)/)).toBeInTheDocument();
  });

  it('says nothing outside a tank', () => {
    detail.data = { tank_mix: null };
    const { container } = mount('detail');
    expect(container.textContent).toBe('');
  });
});
