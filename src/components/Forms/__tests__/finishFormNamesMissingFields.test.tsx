/**
 * A disabled Continue must say what is still needed.
 *
 * 🔴 The 2026-09-06 audit left this unresolved: "Season close … Test form values entered;
 * Continue remained disabled; session reset before cause resolved."
 *
 * REPRODUCED in a browser 2026-09-08. The cause is `finish_date`, a `datetime-local` input: a
 * browser reports an EMPTY value until BOTH halves are complete. A farmer who types the date and
 * tabs away sees "09/08/2026" sitting in the field while `value === ''` — every field looks
 * filled, Continue stays disabled, and nothing on screen said which one was the problem.
 *
 * The input type is deliberately NOT changed here: that would alter what `History.finish_date`
 * stores and is held for the operation-timezone decision (D11). What this pins is that the form
 * names the missing field instead of leaving the farmer to guess.
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import theme from '../../../theme/theme';
import enMessages from '../../../i18n/lang/en-US.json';
import { baseApi } from 'store/api/baseApi';
import { StandardFinishProductionForm } from '../StandardFinishProductionForm';

// The form calls `useDefaultUnits`, which reads `company.currentCompany.establishments` — a
// store without it throws during mount rather than rendering, so the harness needs both the
// company slice and the RTK Query reducer/middleware.
const testStore = () =>
  configureStore({
    reducer: {
      company: () => ({
        currentCompany: {
          id: 1,
          establishments: [{ id: 1, name: 'Test Farm', state: 'OR', country: 'US' }]
        }
      }),
      [baseApi.reducerPath]: baseApi.reducer
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware)
  });

const renderForm = (initialData: Record<string, unknown> = {}) =>
  render(
    <Provider store={testStore()}>
      <ChakraProvider theme={theme}>
        <IntlProvider locale="en-US" messages={enMessages as any} onError={() => undefined}>
          <StandardFinishProductionForm
            onSubmit={() => undefined}
            onCancel={() => undefined}
            initialData={initialData as never}
          />
        </IntlProvider>
      </ChakraProvider>
    </Provider>
  );

describe('the finish form says why Continue is disabled', () => {
  it('names every required field that is still empty', () => {
    renderForm();
    const hint = screen.getByText(/Still needed:/i);
    expect(hint.textContent).toContain(enMessages['app.productionAmount']);
    expect(hint.textContent).toContain(enMessages['app.lotNumber']);
    expect(hint.textContent).toContain(enMessages['app.finishDate']);
  });

  it('names ONLY the finish date when everything else is supplied', () => {
    // The reproduction: the datetime-local half-filled case reaches the form as an empty
    // string, so this is exactly the state the auditor was stuck in.
    renderForm({
      production_amount: '1200',
      production_unit: 'lb',
      lot_id: 'LOT-1',
      finish_date: ''
    });
    const hint = screen.getByText(/Still needed:/i);
    expect(hint.textContent).toContain(enMessages['app.finishDate']);
    expect(hint.textContent).not.toContain(enMessages['app.lotNumber']);
  });

  it('shows no hint once every required field is supplied', () => {
    renderForm({
      production_amount: '1200',
      production_unit: 'lb',
      lot_id: 'LOT-1',
      finish_date: '2026-09-08T10:30'
    });
    expect(screen.queryByText(/Still needed:/i)).toBeNull();
  });

  it('treats whitespace as empty', () => {
    renderForm({
      production_amount: '1200',
      production_unit: 'lb',
      lot_id: '   ',
      finish_date: '2026-09-08T10:30'
    });
    expect(screen.getByText(/Still needed:/i).textContent).toContain(enMessages['app.lotNumber']);
  });
});
