/**
 * "Third-party verification" (stored as the Inspection subtype, IN) stays offered and points an
 * ORGANIC certifier's inspection at the record built for it.
 *
 * Decision 2026-11-09: IN is not retired. A GlobalG.A.P., food safety or kosher audit has no
 * other home, while an organic certifier's inspection belongs on the certifier inspections card,
 * which holds the 7 CFR 205.662 notices, the operation's response and the resolution letter. So
 * the form keeps saving IN and says where the organic one goes.
 */
import React, { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import baseApi from 'store/api/baseApi';
import enUS from '../../../../../../i18n/lang/en-US.json';
import esLA from '../../../../../../i18n/lang/es-419.json';
import { ospCertifierInspectionsPath } from '../../../../OSP/ospLinks';

// @ts-expect-error BusinessTab-SIMPLIFIED is a .jsx module with no type declarations.
import BusinessTab from '../BusinessTab-SIMPLIFIED';

afterEach(cleanup);

const store = () =>
  configureStore({
    reducer: {
      company: () => ({
        currentCompany: { id: 1, establishments: [{ id: 7, name: 'Farm', state: 'WA' }] }
      }),
      [baseApi.reducerPath]: baseApi.reducer
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware)
  });

type Handle = { submitForm: () => Promise<void> };

const mount = (locale: 'en' | 'es-419', { inFarmRoute = true } = {}) => {
  const ref = createRef<Handle>();
  const onSubmitHandler = vi.fn();
  const messages = (locale === 'en' ? enUS : esLA) as Record<string, string>;
  const tab = <BusinessTab ref={ref} hideActions onSubmitHandler={onSubmitHandler} />;
  const { container } = render(
    <Provider store={store()}>
      <MemoryRouter
        initialEntries={[
          inFarmRoute ? '/admin/dashboard/farm/7/parcel/3/event/add' : '/elsewhere'
        ]}>
        <ChakraProvider>
          <IntlProvider locale={locale} messages={messages} onError={() => {}}>
            <Routes>
              <Route path="/admin/dashboard/farm/:farmId/*" element={tab} />
              <Route path="*" element={tab} />
            </Routes>
          </IntlProvider>
        </ChakraProvider>
      </MemoryRouter>
    </Provider>
  );
  const select = (name: string) =>
    container.querySelector(`select[name="${name}"]`) as HTMLSelectElement;
  return { ref, onSubmitHandler, select, container, messages };
};

const choose = async (el: HTMLSelectElement, value: string) => {
  await act(async () => {
    fireEvent.change(el, { target: { value } });
  });
};

const pointerTitle = (messages: Record<string, string>) =>
  messages['events.business.help.organicInspectionPointer.title'];

describe('organic inspection pointer on the Business event form', () => {
  it('shows for a third-party verification and links to the inspections card in a new tab', async () => {
    const { select, container, messages } = mount('en');
    expect(container.textContent).not.toContain(pointerTitle(messages));
    await choose(select('business_type'), 'verification');
    expect(container.textContent).toContain(pointerTitle(messages));
    const link = container.querySelector(
      '[data-testid="organic-inspection-pointer-link"]'
    ) as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe(ospCertifierInspectionsPath('7'));
    expect(link.getAttribute('href')).toBe(
      '/admin/dashboard/farm/7/osp/narratives?section=certifier-inspections'
    );
    // The wizard holds its draft in memory: leaving the page would drop it.
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('does not show for any other activity', async () => {
    const { select, container, messages } = mount('en');
    for (const activity of [
      'certification',
      'sustainability_audit',
      'transparency',
      'compliance'
    ]) {
      await choose(select('business_type'), activity);
      expect(container.textContent, activity).not.toContain(pointerTitle(messages));
    }
  });

  it('speaks Spanish on a Spanish form', async () => {
    const { select, container, messages } = mount('es-419');
    await choose(select('business_type'), 'verification');
    expect(container.textContent).toContain(pointerTitle(messages));
    expect(container.textContent).toContain(
      messages['events.business.help.organicInspectionPointer.link']
    );
  });

  it('keeps the words and drops the link where the URL names no farm', async () => {
    const { select, container, messages } = mount('en', { inFarmRoute: false });
    await choose(select('business_type'), 'verification');
    expect(container.textContent).toContain(pointerTitle(messages));
    expect(container.querySelector('[data-testid="organic-inspection-pointer-link"]')).toBeNull();
  });

  it('still saves a third-party verification as the Inspection subtype', async () => {
    const { ref, select, onSubmitHandler } = mount('en');
    await choose(select('business_type'), 'verification');
    await act(async () => {
      await ref.current!.submitForm();
    });
    expect(onSubmitHandler).toHaveBeenCalledTimes(1);
    expect(onSubmitHandler.mock.calls[0][0].type).toBe('IN');
  });
});
