/**
 * The parcel's Field history reads in the grower's language, and shows every input in full.
 *
 * Until 2026-11-07 its title, the orange "Required: 7 CFR 205.202" pill, "Add Year", the table
 * headers, the form labels and the method names were hardcoded English, so a Spanish dashboard
 * showed them in English. The Substances and Notes cells were truncated at 160px, which hid the
 * very inputs a certifier reads this table for ("Rexius compost 4 t/ac pre…").
 */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';

import es from 'i18n/lang/es-419.json';

const ENTRY = {
  id: 1,
  year: 2025,
  crop_grown: 'Zanahorias',
  cover_crop: 'Centeno',
  production_method: 'organic',
  substances_applied:
    'Rexius compost 4 t/ac pre-plant; feather meal 13-0-0 500 lb/ac; flame weeding pre-emergence',
  notes: 'Certified organic continuously since 2006'
};

vi.mock('store/api/productApi', () => ({
  useGetParcelCropHistoryQuery: () => ({
    data: [ENTRY],
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn()
  }),
  useCreateParcelCropHistoryMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteParcelCropHistoryMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateParcelCropHistoryMutation: () => [vi.fn(), { isLoading: false }]
}));

import FieldHistorySection from '../FieldHistorySection';

const renderEs = () =>
  render(
    <ChakraProvider>
      <IntlProvider locale="es-419" messages={es as Record<string, string>} onError={() => {}}>
        <FieldHistorySection parcelId={304} canWrite />
      </IntlProvider>
    </ChakraProvider>
  );

describe('Field history', () => {
  it('reads in Spanish, with no English left on the card', () => {
    const { container } = renderEs();
    expect(screen.getByText('Historial de la parcela')).toBeInTheDocument();
    expect(screen.getByText('Añadir año')).toBeInTheDocument();
    expect(screen.getByText('Orgánico')).toBeInTheDocument();
    const text = container.textContent || '';
    for (const english of [
      'Field History',
      'Required',
      'Add Year',
      'Substances Applied',
      'Organic',
      'cover:'
    ]) {
      expect(text, english).not.toContain(english);
    }
  });

  it('shows every input in full, not cut at 160px', () => {
    renderEs();
    const cell = screen.getByText(ENTRY.substances_applied);
    expect(cell).not.toHaveStyle({ textOverflow: 'ellipsis' });
    expect(cell).toHaveStyle({ whiteSpace: 'normal' });
  });
});
