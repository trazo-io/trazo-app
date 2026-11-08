/**
 * Livestock on the parcel application (backend content 2026.11.24). The question asked whether
 * livestock are KEPT; CCOF ORGB49 §C and WSDA AGR 2121 E 12 also ask about pasture and grazing.
 * The kept-only "No" is retired: shown only while it is the stored answer, never offered again,
 * and the wider "No: not used for livestock" replaces it. Until then the parcel wizard's radio
 * rendered every option, retired ones included.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../i18n/lang/en-US.json';
import esLA from '../../../../i18n/lang/es-419.json';
import { QuestionField } from '../ParcelApplicationWizard';
import type { AnswerValue, ModuleQuestion } from 'config/osp/types';

const NONE = 'No: not used for livestock (none kept, pastured or grazed)';
const KEPT_ONLY = 'No livestock kept';

const QUESTION: ModuleQuestion = {
  key: 'livestock_present',
  kind: 'radio',
  label: { en: 'Is livestock kept, pastured or grazed on this parcel?', es: '¿Ganado?' },
  coaching: null,
  options: [
    { value: 'none', label: { en: NONE, es: 'No' }, exclusive: false },
    { value: 'yes', label: { en: 'Yes', es: 'Sí' }, exclusive: false },
    { value: 'no', label: { en: KEPT_ONLY, es: 'No se mantiene' }, exclusive: false, retired: true }
  ],
  required: false,
  visible_when: [],
  nop_cite: null,
  prefill: null,
  parcel_field: null,
  embed: null,
  placeholder: null,
  max_length: null
};

const renderField = (value: AnswerValue) => {
  const onChange = vi.fn();
  render(
    <ChakraProvider>
      <IntlProvider
        locale="en-US"
        messages={enUS as Record<string, string>}
        onError={() => undefined}>
        <QuestionField
          question={QUESTION}
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

describe('Parcel Application: a retired radio option', () => {
  it('is not offered to a parcel that has not chosen it', () => {
    renderField(null);
    expect(screen.queryByLabelText(KEPT_ONLY)).toBeNull();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.queryByTestId('parcel-q-retired-livestock_present')).toBeNull();
  });

  it('says why the section stays open while the retired answer is stored', () => {
    renderField('no');
    expect(screen.queryByTestId('parcel-q-retired-livestock_present')).not.toBeNull();
    expect(screen.getByTestId('parcel-q-retired-livestock_present')).toHaveTextContent(
      'Earlier answer. This question now asks more'
    );
  });

  it('still reads as given where it is the stored answer, and cannot be picked again', () => {
    renderField('no');
    expect(screen.getByLabelText(KEPT_ONLY)).toBeChecked();
    expect(screen.getByLabelText(KEPT_ONLY)).toBeDisabled();
  });

  it('lets the parcel move to the current answer', () => {
    const onChange = renderField('no');
    fireEvent.click(screen.getByLabelText(NONE));
    expect(onChange).toHaveBeenCalledWith('none');
  });

  it('names the livestock check in both languages', () => {
    expect((enUS as Record<string, string>)['parcelApp.missing.livestock']).toMatch(/pastured/);
    expect((esLA as Record<string, string>)['parcelApp.missing.livestock']).toMatch(/apacienta/);
    expect((esLA as Record<string, string>)['parcelApp.missing.livestock']).not.toMatch(/alimenta/);
  });
});
