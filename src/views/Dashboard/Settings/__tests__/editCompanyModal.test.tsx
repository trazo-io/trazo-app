/**
 * The Edit company form on Company Settings.
 *
 * Until 2026-11-09 it was written in Spanish literals, so an English-speaking company edited
 * itself in Spanish ("Editar Compañía", "Nombre de la Compañía", "Siguiente"). And Save could
 * do nothing at all: clearing "Number of employees" made the value NaN, the resolver refused
 * the form on the first step while the person stood on the last one, and no error showed.
 */
import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';

import enUS from '../../../../i18n/lang/en-US.json';
import es419 from '../../../../i18n/lang/es-419.json';
import theme from '../../../../theme/styles';
import EditCompanyModal, { PRIMARY_COMMODITIES } from '../EditCompanyModal';

const EN = enUS as Record<string, string>;
const ES = es419 as Record<string, string>;
const SOURCE = readFileSync(join(__dirname, '../EditCompanyModal.tsx'), 'utf8');
// The code without its comments, which quote the old Spanish on purpose.
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const COMPANY = {
  id: 7,
  name: 'Brandt Family Farms LLC',
  contact_email: 'office@calapooiabend.example',
  employee_count: 15,
  sustainability_commitment: 'regenerative'
};

const renderModal = (
  locale: 'en-US' | 'es-419',
  onSubmit = vi.fn(async (_data: Record<string, unknown>) => undefined),
  company: Record<string, unknown> = COMPANY
) => {
  render(
    <ChakraProvider theme={theme}>
      <IntlProvider locale={locale} messages={locale === 'en-US' ? EN : ES}>
        <EditCompanyModal isOpen onClose={vi.fn()} company={company} onSubmit={onSubmit} />
      </IntlProvider>
    </ChakraProvider>
  );
  return onSubmit;
};

const continueTimes = async (n: number) => {
  for (let i = 0; i < n; i += 1) {
    await userEvent.click(screen.getByRole('button', { name: /^(Continue|Continuar)$/ }));
  }
};

describe('Edit company speaks the reader’s language', () => {
  it('every catalogue key the form reads exists in both locales', () => {
    const ids = [...SOURCE.matchAll(/\bt\('([a-zA-Z0-9_.]+)'\)/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(30);
    const dynamic = [
      ...PRIMARY_COMMODITIES.map((v) => `company.commodity.${v}`),
      ...[
        'crop_production',
        'livestock',
        'dairy',
        'mixed_farming',
        'organic_farming',
        'greenhouse'
      ].map((v) => `company.industry.${v}`)
    ];
    for (const id of [...ids, ...dynamic]) {
      expect(EN[id], `en-US ${id}`).toBeTruthy();
      expect(ES[id], `es-419 ${id}`).toBeTruthy();
    }
  });

  it('holds no written-in words: labels, placeholders and options come from the catalogue', () => {
    // Facebook and Instagram are names, the same in every language.
    const literalProps = [...CODE.matchAll(/(label|placeholder|helpText|loadingText)="([^"]+)"/g)]
      .map((m) => m[2])
      .filter((v) => !['Facebook', 'Instagram'].includes(v));
    expect(literalProps).toEqual([]);
    // JSX text: a capitalised word run between a tag and its closing tag.
    expect(CODE).not.toMatch(/>\s*[A-ZÁÉÍÓÚ][a-záéíóúñ]+(\s[a-záéíóúñ]+)*\s*<\//);
    expect(CODE).not.toMatch(/Compañía|Seleccionar|Siguiente|Guardar|Frutas de|RFC/);
  });

  it('renders in English for an English reader and in Spanish for a Spanish one', () => {
    renderModal('en-US');
    expect(screen.getByText('Edit company')).toBeTruthy();
    expect(screen.getByText('Company name')).toBeTruthy();
    expect(screen.queryByText(/Compañía|Nombre/)).toBeNull();
  });

  it('renders the Spanish catalogue for es-419', () => {
    renderModal('es-419');
    expect(screen.getByText('Editar empresa')).toBeTruthy();
    expect(screen.getByText('Nombre de la empresa')).toBeTruthy();
    expect(screen.queryByText(/^(Edit company|Company name|Continue)$/)).toBeNull();
  });

  it('saves a company whose employee count is left blank (was NaN, refused silently)', async () => {
    const onSubmit = renderModal('en-US', undefined, { ...COMPANY, employee_count: null });
    await continueTimes(3);
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'Brandt Family Farms LLC',
      employee_count: null,
      sustainability_commitment: 'regenerative',
      country: 'US'
    });
  });

  it('clearing the employee count after it was set saves it as blank, not NaN', async () => {
    const onSubmit = renderModal('en-US');
    await userEvent.clear(screen.getByRole('spinbutton'));
    await continueTimes(3);
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ employee_count: null });
  });

  it('Continue stops on the step that holds the problem and says what it is', async () => {
    const onSubmit = renderModal('en-US');
    await userEvent.clear(screen.getByPlaceholderText(EN['company.form.name.placeholder']));
    await continueTimes(1);
    expect(await screen.findByText(EN['company.validation.name.required'])).toBeTruthy();
    // Still on the first step: its field is on screen, the next step's is not.
    expect(screen.getByPlaceholderText(EN['company.form.name.placeholder'])).toBeTruthy();
    expect(screen.queryByPlaceholderText(EN['company.form.address.placeholder'])).toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('has no Cancel button: the header close leaves, the footer only moves or saves', () => {
    renderModal('en-US');
    expect(screen.queryByRole('button', { name: /^(Cancel|Cancelar)$/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Previous step/ })).toBeNull();
  });
});
