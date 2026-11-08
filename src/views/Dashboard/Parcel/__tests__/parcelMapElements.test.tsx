/**
 * The Parcel Application asks which elements the operator's map shows (backend
 * `map_elements_shown`, content 2026.11.23): a checkbox group, the first one on the parcel
 * page. Until then the parcel wizard had no checkbox control and would have rendered the
 * question as a text box.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../i18n/lang/en-US.json';
import { QuestionField } from '../ParcelApplicationWizard';
import type { AnswerValue, ModuleQuestion } from 'config/osp/types';

const QUESTION: ModuleQuestion = {
  key: 'map_elements_shown',
  kind: 'checkbox_group',
  label: { en: 'Which of these does your parcel map show?', es: '¿Cuáles?' },
  coaching: null,
  options: [
    {
      value: 'north_arrow',
      label: { en: 'A north arrow', es: 'Una flecha norte' },
      exclusive: false
    },
    {
      value: 'boundaries',
      label: { en: "The parcel's boundaries", es: 'Los límites de la parcela' },
      exclusive: false
    }
  ],
  required: false,
  visible_when: [],
  nop_cite: '§ 205.202',
  prefill: null,
  parcel_field: null,
  embed: null,
  placeholder: null,
  max_length: null
};

const renderField = (value: AnswerValue, canWrite = true, locale = 'en-US') => {
  const onChange = vi.fn();
  render(
    <ChakraProvider>
      <IntlProvider
        locale={locale}
        messages={enUS as Record<string, string>}
        onError={() => undefined}>
        <QuestionField
          question={QUESTION}
          value={value}
          locale={locale}
          canWrite={canWrite}
          onChange={onChange}
        />
      </IntlProvider>
    </ChakraProvider>
  );
  return onChange;
};

describe('Parcel Application: what the map shows', () => {
  it('renders each element as a checkbox, ticked as stored', () => {
    renderField(['boundaries']);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(2);
    const group = screen.getByTestId('parcel-q-map_elements_shown');
    expect(within(group).getByLabelText("The parcel's boundaries")).toBeChecked();
    expect(within(group).getByLabelText('A north arrow')).not.toBeChecked();
  });

  it('adds a ticked element to the stored list', () => {
    const onChange = renderField(['boundaries']);
    fireEvent.click(screen.getByLabelText('A north arrow'));
    expect(onChange).toHaveBeenCalledWith(['boundaries', 'north_arrow']);
  });

  it('clears the answer when the last element is unticked, rather than storing an empty list', () => {
    const onChange = renderField(['boundaries']);
    fireEvent.click(screen.getByLabelText("The parcel's boundaries"));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('cannot be changed by a reader without write access', () => {
    renderField([], false);
    expect(screen.getByLabelText('A north arrow')).toBeDisabled();
  });

  it('labels the elements in Spanish for a Spanish reader', () => {
    renderField([], true, 'es-419');
    expect(screen.getByLabelText('Una flecha norte')).toBeInTheDocument();
  });
});
