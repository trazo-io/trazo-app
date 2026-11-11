/**
 * An input saved with no organic basis is warned about at entry, never blocked.
 *
 * Overall review 2026-11, OV-FJ-C21, seen in a browser: a spray saved right after the input
 * lookup had shown matching OMRI and WSDA listings, with the basis left empty, raised nothing,
 * then printed in the packet as "organic status not recorded" and turned a long-certified
 * block's status line into "Not established from records in Trazo". The field is required only
 * on farms whose farming method says organic, so every other farm saved in silence.
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { useForm } from 'react-hook-form';

import enUS from '../../../../../../i18n/lang/en-US.json';
// @ts-expect-error a .jsx module with no type declarations.
import OrganicBasisBlankNotice from '../OrganicBasisBlankNotice';

const WARNING = (enUS as Record<string, string>)['events.chemical.organicBasis.blankWarning'];

const Form = ({ initial }: { initial: string }) => {
  const { control, register } = useForm({ defaultValues: { organic_approved: initial } });
  return (
    <>
      <select aria-label="basis" {...register('organic_approved')}>
        <option value="">—</option>
        <option value="omri_listed">OMRI</option>
      </select>
      <OrganicBasisBlankNotice
        control={control}
        messageId="events.chemical.organicBasis.blankWarning"
      />
    </>
  );
};

const mount = (initial: string) =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en" messages={enUS as Record<string, string>} onError={() => {}}>
        <Form initial={initial} />
      </IntlProvider>
    </ChakraProvider>
  );

describe('OrganicBasisBlankNotice', () => {
  it('says what a blank basis will do to the packet', () => {
    mount('');
    expect(screen.getByText(WARNING)).toBeTruthy();
    expect(WARNING).toMatch(/organic status not recorded/);
    expect(WARNING).toMatch(/You can save without one/);
  });

  it('goes away once a basis is chosen', () => {
    mount('');
    fireEvent.change(screen.getByLabelText('basis'), { target: { value: 'omri_listed' } });
    expect(screen.queryByText(WARNING)).toBeNull();
  });

  it('stays away on a record that already has one', () => {
    mount('omri_listed');
    expect(screen.queryByText(WARNING)).toBeNull();
  });
});

describe('ChemicalTab wiring', () => {
  it('never shows the "you can save without one" warning where the basis is required', async () => {
    // Review of trazo-app #359: on a farm whose farming method says organic, the save is refused
    // with its own error, so the warning must not show beside it.
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(resolve(__dirname, '../ChemicalTab-ENHANCED.jsx'), 'utf-8');
    expect(source).toMatch(/chemicalType && !requiresOrganicBasis && \(\s*<OrganicBasisBlankNotice/);
  });
});
