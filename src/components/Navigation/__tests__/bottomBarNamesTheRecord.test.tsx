/**
 * The buyer page's bottom bar names what it scrolls to: the record and the farm.
 *
 * 2026-10-08 (Oscar: "a bit stale from the old buyer page version"). "Story" with a shield put
 * a verification mark on a self-reported record; "Impact" with a leaf gave carbon the hero
 * position the transparency-first rule keeps it out of. Red on the old bar.
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import { NavigationBottomBar } from '../NavigationBottomBar';
import en from '../../../i18n/lang/en-US.json';
import es from '../../../i18n/lang/es-419.json';

const renderBar = (locale: 'en-US' | 'es-419') =>
  render(
    <ChakraProvider>
      <IntlProvider
        locale={locale}
        messages={(locale === 'en-US' ? en : es) as Record<string, string>}>
        <NavigationBottomBar />
      </IntlProvider>
    </ChakraProvider>
  );

describe('the buyer page bottom bar', () => {
  it('offers Record and Farm, nothing else', () => {
    renderBar('en-US');
    const tabs = screen.getAllByRole('button').map((b) => b.textContent?.trim());
    expect(tabs).toEqual(['Record', 'Farm']);
    expect(screen.queryByText(/Story|Impact/)).toBeNull();
  });

  it('reads Registro and Finca in Spanish', () => {
    renderBar('es-419');
    const tabs = screen.getAllByRole('button').map((b) => b.textContent?.trim());
    expect(tabs).toEqual(['Registro', 'Finca']);
  });
});
