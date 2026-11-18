/**
 * The Vision verdict on a record's photos shows on the record, from its detail (2026-11-17).
 * A clean photo, or a detail that has not loaded, says nothing.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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

import { PhotoFlagNotice } from '../PhotoFlagNotice';

const mount = (messages: Record<string, string> = enUS) =>
  render(
    <Provider
      store={configureStore({ reducer: { company: () => ({ currentCompany: { id: 1 } }) } })}>
      <ChakraProvider>
        <IntlProvider locale="en" messages={messages}>
          <PhotoFlagNotice farmId="1" eventId="7" eventType={2} />
        </IntlProvider>
      </ChakraProvider>
    </Provider>
  );

const en = enUS as Record<string, string>;
const es = es419 as Record<string, string>;

describe('PhotoFlagNotice', () => {
  it.each([
    ['stock_photo', 'event.photoFlag.stockPhoto'],
    ['ai_generated', 'event.photoFlag.aiGenerated'],
    ['not_agricultural', 'event.photoFlag.notAgricultural']
  ])('names a %s photo and what to do, as a warning row', (flag, key) => {
    detail.data = { photo_content_flag: flag };
    mount();
    expect(screen.getByTestId('record-notice-photo-flag')).toBeInTheDocument();
    expect(screen.getByText(en[key])).toBeInTheDocument();
    expect(screen.getByText(en['event.photoFlag.replaceWithFieldPhoto'])).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    cleanup();
  });

  it('speaks Spanish', () => {
    detail.data = { photo_content_flag: 'stock_photo' };
    mount(es);
    expect(screen.getByText(es['event.photoFlag.stockPhoto'])).toBeInTheDocument();
  });

  it.each([
    ['a clean photo', { photo_content_flag: null }],
    ['a detail not loaded yet', undefined],
    ['an unknown verdict', { photo_content_flag: 'blurry' }]
  ])('says nothing for %s', (_label, data) => {
    detail.data = data;
    const { container } = mount();
    expect(container.textContent).toBe('');
  });
});
