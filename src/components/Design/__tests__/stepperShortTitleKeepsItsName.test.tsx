/**
 * A step's short title is what a phone shows; its accessible name stays the full title.
 *
 * The Operation module's five-step bar shows bare page letters on a phone ("A B D E Review", app #385). Before
 * this, the full title was `display: none` below md and the step had no other name, so a screen reader on a phone
 * announced "D, button" (review of app #385). jsdom matches no media query, so it renders the phone layout.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
// Relative, not the `theme/*` tsconfig alias: vitest.config.ts does not map that one.
import theme from '../../../theme/theme';
import { StandardStepper } from '../StandardComponents';
import enUS from '../../../i18n/lang/en-US.json';

const STEPS = [
  { title: 'A. Contract on file', shortTitle: 'A' },
  { title: 'D. Legal entity and addresses', shortTitle: 'D' },
  { title: 'E. Standards and regulatory agencies', shortTitle: 'E' }
];

describe('a stepper step with a short title', () => {
  it('is named by its full title, not by the letter a phone shows', () => {
    render(
      <IntlProvider locale="en-US" messages={enUS}>
        <ChakraProvider theme={theme}>
          <StandardStepper steps={STEPS} currentStep={2} allowStepClick onStepClick={vi.fn()} />
        </ChakraProvider>
      </IntlProvider>
    );
    expect(screen.queryByRole('button', { name: 'D. Legal entity and addresses' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'D' })).toBeNull();
  });
});
