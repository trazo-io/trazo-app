/**
 * A facility's product rows (2026-11-08): CCOF G6.1 C2 and OTCO C7 7.10-2 columns.
 *
 * Nothing is defaulted (an empty column is "Not stated"), the ingredient statement is asked of a
 * multi-ingredient product only, and a save that fails after the upload reuses the uploaded file on
 * retry instead of uploading it twice.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../../i18n/lang/en-US.json';
import FacilityProductRows from '../FacilityProductRows';

const add = vi.fn();
const update = vi.fn();
const remove = vi.fn();
const upload = vi.fn();
vi.mock('store/api/facilityProductApi', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useAddFacilityProductMutation: () => [
      (...a: unknown[]) => ({ unwrap: () => add(...a) }),
      { isLoading: false }
    ],
    useUpdateFacilityProductMutation: () => [
      (...a: unknown[]) => ({ unwrap: () => update(...a) }),
      { isLoading: false }
    ],
    useDeleteFacilityProductMutation: () => [
      (...a: unknown[]) => ({ unwrap: () => remove(...a) }),
      { isLoading: false }
    ]
  };
});
vi.mock('store/api/documentsApi', () => ({
  useUploadFarmDocumentMutation: () => [
    (...a: unknown[]) => ({ unwrap: () => upload(...a) }),
    { isLoading: false }
  ]
}));

const product = (over: Record<string, unknown> = {}) => ({
  id: 9,
  public_id: 'p',
  facility: 4,
  category: 'Almond butter',
  detail: '',
  packaging_form: '',
  label_claim: '',
  brand_name: '',
  multi_ingredient: '',
  ingredient_statement_document: null,
  ingredient_statement_document_title: null,
  ...over
});

const renderIt = (products: Record<string, unknown>[] = []) =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <FacilityProductRows
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          facility={{ id: 4, name: 'ABC Hulling', products } as any}
          companyId="3"
          farmId="1"
        />
      </IntlProvider>
    </ChakraProvider>
  );

describe('FacilityProductRows', () => {
  beforeEach(() => {
    [add, update, remove, upload].forEach((f) => f.mockReset());
    add.mockResolvedValue({});
    upload.mockResolvedValue({ id: 77 });
  });

  it('prints an empty column as not stated, never as a default', () => {
    renderIt([product()]);
    expect(
      screen.getByText(
        'Packaging form: Not stated · Organic label claim: Not stated · Label or brand name: Not stated · Ingredients: Not stated'
      )
    ).toBeTruthy();
  });

  it('flags a multi-ingredient product with no statement', () => {
    renderIt([product({ multi_ingredient: 'yes' })]);
    expect(screen.getByText('No statement')).toBeTruthy();
  });

  it('adds a row with only the columns the operator picked', async () => {
    renderIt();
    fireEvent.click(screen.getByText('Add a product'));
    fireEvent.change(screen.getByPlaceholderText('e.g. Almonds'), { target: { value: 'Almonds' } });
    fireEvent.click(screen.getByText('Save product'));
    await waitFor(() => expect(add).toHaveBeenCalledTimes(1));
    expect(add.mock.calls[0][0].data).toEqual({
      facility: 4,
      category: 'Almonds',
      detail: '',
      packaging_form: '',
      label_claim: '',
      brand_name: '',
      multi_ingredient: ''
    });
    expect(upload).not.toHaveBeenCalled();
  });

  it('asks for the statement only for a multi-ingredient product, and uploads it once across retries', async () => {
    renderIt();
    fireEvent.click(screen.getByText('Add a product'));
    expect(screen.queryByText("Manufacturer's ingredient statement")).toBeNull();
    fireEvent.change(screen.getByPlaceholderText('e.g. Almonds'), {
      target: { value: 'Almond butter' }
    });
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    fireEvent.change(selects[selects.length - 1], { target: { value: 'yes' } });
    expect(screen.getByText("Manufacturer's ingredient statement")).toBeTruthy();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['%PDF'], 'statement.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });
    add.mockRejectedValueOnce({ status: 500 });
    fireEvent.click(screen.getByText('Save product'));
    await waitFor(() => expect(add).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByText('Save product'));
    await waitFor(() => expect(add).toHaveBeenCalledTimes(2));
    expect(upload).toHaveBeenCalledTimes(1);
    expect(add.mock.calls[1][0].data.ingredient_statement_document).toBe(77);
  });
});
