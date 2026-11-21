/**
 * Naming the certifier on a parcel, and what the certificate card says (first-run audit, 2026-11-21).
 *
 * The parcel application's "Current/previous certifier" was a free-text box. A WSDA grower typed
 * "WSDA (Washington State Department of Agriculture)" and all three parcels fell out of WSDA's routing in the
 * packet. It now takes the agent picker the farm profile and the plan use. Her farm-profile certificate had no
 * number, and the card said "No organic certificate on your farm profile yet".
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider, createIntl } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../i18n/lang/en-US.json';
import esLA from '../../../../i18n/lang/es-419.json';
import type { ModuleQuestion } from 'config/osp/types';

const WSDA = 'Washington State Department of Agriculture';

vi.mock('store/api/certificationApi', () => ({
  useGetCertifyingAgentsQuery: () => ({
    data: [
      { slug: 'wsda', name: WSDA, short_name: 'WSDA', own_numbering: true, in_state_rank: 1 },
      { slug: 'ccof', name: 'CCOF', short_name: '', own_numbering: true, in_state_rank: null }
    ],
    isLoading: false,
    isError: false
  })
}));

const { QuestionField, certificateCardLine } = await import('../ParcelApplicationWizard');

const question = (key: string): ModuleQuestion => ({
  key,
  kind: 'text',
  label: { en: 'Current/previous certifier', es: 'Certificador actual/anterior' },
  coaching: null,
  options: [],
  required: false,
  visible_when: [],
  nop_cite: null,
  prefill: null,
  parcel_field: null,
  embed: null,
  placeholder: null,
  max_length: null
});

const renderField = (key: string, value: string | null) => {
  const onChange = vi.fn();
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <QuestionField
          question={question(key)}
          value={value}
          locale="en-US"
          canWrite
          onChange={onChange}
        />
      </IntlProvider>
    </ChakraProvider>
  );
  return onChange;
};

describe('the parcel certifier question', () => {
  it('offers the agent list and stores the name the packet resolves', () => {
    const onChange = renderField('prior_certifier_name', null);
    const select = screen.queryByRole('combobox', { name: 'Current/previous certifier' });
    expect(select).not.toBeNull();
    fireEvent.change(select as HTMLElement, { target: { value: WSDA } });
    expect(onChange).toHaveBeenCalledWith(WSDA);
  });

  it('leaves every other text question a text box', () => {
    renderField('certified_operation_name', null);
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('textbox')).not.toBeNull();
  });
});

describe('certificateCardLine', () => {
  const en = createIntl({ locale: 'en-US', messages: enUS as Record<string, string> });
  const es = createIntl({ locale: 'es-419', messages: esLA as Record<string, string> });
  const numbered = {
    number: 'WSDA-4821',
    agent: WSDA,
    effective: null,
    expiry: null,
    document_url: ''
  };

  it('names a certificate recorded without its number instead of denying it', () => {
    const line = certificateCardLine(en, { certificate: null, certificate_unnumbered_agent: WSDA });
    expect(line).toContain(`organic certificate from ${WSDA} without its number`);
    expect(line).not.toMatch(/No organic certificate/);
    expect(
      certificateCardLine(es, { certificate: null, certificate_unnumbered_agent: '' })
    ).toContain('certificado orgánico de tu certificador, pero sin número');
  });

  it('keeps the certificate of record and the plain absence', () => {
    expect(
      certificateCardLine(en, { certificate: numbered, certificate_unnumbered_agent: null })
    ).toBe(`WSDA-4821 — ${WSDA}`);
    expect(
      certificateCardLine(en, { certificate: null, certificate_unnumbered_agent: null })
    ).toMatch(/^No organic certificate on your farm profile yet/);
  });
});
