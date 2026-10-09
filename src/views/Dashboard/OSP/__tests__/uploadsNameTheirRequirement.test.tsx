/**
 * A file uploaded under an attachment question is linked to THAT question, and files uploaded to
 * the section before questions were named are shown apart, as not counting.
 *
 * OSP alignment audit 2026-10, T19: uploads were linked to a module only, so the certifier
 * packet could not tell a label sample from a soil test in the same section, and the label
 * question could never close. The server now counts only a file whose `requirement` is the
 * question; this is the side of the card that sends it.
 */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';

import enUS from 'i18n/lang/en-US.json';

const upload = vi.fn((_args: Record<string, unknown>) => ({ unwrap: () => Promise.resolve({}) }));
const queries: Record<string, unknown>[] = [];

vi.mock('store/api/documentsApi', () => ({
  useGetFarmDocumentsQuery: (args: Record<string, unknown>) => {
    queries.push(args);
    if (args.requirement)
      return { data: [{ id: 1, title: 'Clamshell label', requirement: args.requirement }] };
    return {
      data: [
        { id: 1, title: 'Clamshell label', requirement: 'g7_0_labeling.label_files_upload' },
        { id: 2, title: 'Old soil test', requirement: '' }
      ]
    };
  },
  useUploadFarmDocumentMutation: () => [upload, { isLoading: false }]
}));

import { ModuleUploadField } from '../OSPModuleWizard';

const renderField = () =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <ModuleUploadField
          companyId="1"
          farmId="2"
          moduleKey="g7_0_labeling"
          questionKey="label_files_upload"
          isReadOnly={false}
        />
      </IntlProvider>
    </ChakraProvider>
  );

describe('uploads name the question they answer', () => {
  it('sends the requirement with the file', async () => {
    upload.mockClear();
    const { container } = renderField();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'label.pdf')] } });
    await waitFor(() => expect(upload).toHaveBeenCalled());
    expect(upload.mock.calls[0]?.[0]).toMatchObject({
      linkedSection: 'g7_0_labeling',
      requirement: 'g7_0_labeling.label_files_upload'
    });
  });

  it('lists the question own files by requirement and the section-only files apart', () => {
    renderField();
    expect(queries.some((q) => q.requirement === 'g7_0_labeling.label_files_upload')).toBe(true);
    expect(screen.getByText('Clamshell label')).toBeInTheDocument();
    expect(screen.getByText('Old soil test')).toBeInTheDocument();
    expect(screen.getByText(/does not count these as this attachment/)).toBeInTheDocument();
  });
});
