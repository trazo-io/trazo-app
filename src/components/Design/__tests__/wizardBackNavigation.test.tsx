/**
 * Regression guards for "which Back is which" in a multi-step form.
 *
 * The activity wizard had two buttons labelled "Back" (es: "Volver"). The one in the page
 * header LEFT the wizard for the parcel page; the one in the footer went back a step. A
 * farmer on step 2 who wanted step 1 clicked the header one (the footer is a long scroll
 * away on a chemical application) and was dropped on the parcel page.
 *
 * The fix has three parts, each guarded here:
 *   1. StandardPage takes a `backLabel` so a header Back can name where it goes.
 *   2. StandardStepper's finished steps are real buttons, so step 1 is reachable from the
 *      top of the page by mouse AND keyboard. A clickable <div> was mouse-only.
 *   3. The wizard itself uses both, and its footer says "Previous step", not "Back".
 */
import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
// Relative, not the `theme/*` tsconfig alias: vitest.config.ts does not map that one.
import theme from '../../../theme/theme';
import { StandardPage, StandardStepper } from '../StandardComponents';
import enUS from '../../../i18n/lang/en-US.json';

const renderUi = (ui: React.ReactElement) =>
  render(
    <IntlProvider locale="en-US" messages={enUS}>
      <ChakraProvider theme={theme}>{ui}</ChakraProvider>
    </IntlProvider>
  );

const STEPS = [{ title: 'Activity & date' }, { title: 'Activity details' }, { title: 'Photos' }];

describe('StandardPage: back label', () => {
  it('defaults to the bare "Back" every other page relies on', () => {
    renderUi(
      <StandardPage title="Settings" showBackButton onBack={() => {}}>
        body
      </StandardPage>
    );
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  it('renders `backLabel` instead, so the header can name its destination', () => {
    const onBack = vi.fn();
    renderUi(
      <StandardPage
        title="Log activity"
        showBackButton
        onBack={onBack}
        backLabel="Back to River Block">
        body
      </StandardPage>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Back to River Block' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
  });
});

describe('StandardStepper: finished steps are a way back', () => {
  it('makes only the steps BEHIND the current one buttons', () => {
    renderUi(
      <StandardStepper steps={STEPS} currentStep={1} allowStepClick onStepClick={() => {}} />
    );
    // A forward jump would skip the validation Continue runs; the current step goes nowhere.
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent('Activity & date');
    expect(buttons[0]).toHaveAttribute('type', 'button');
  });

  it('calls onStepClick with the index of the finished step', () => {
    const onStepClick = vi.fn();
    renderUi(
      <StandardStepper steps={STEPS} currentStep={2} allowStepClick onStepClick={onStepClick} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Activity details/ }));
    expect(onStepClick).toHaveBeenCalledWith(1);
  });

  it('marks the current step with aria-current, which colour alone does not convey', () => {
    const { container } = renderUi(<StandardStepper steps={STEPS} currentStep={1} />);
    const current = container.querySelector('[aria-current="step"]');
    expect(current).not.toBeNull();
    expect(current).toHaveTextContent('Activity details');
  });

  it('renders no buttons at all unless the caller opts in', () => {
    renderUi(<StandardStepper steps={STEPS} currentStep={2} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

describe('Activity wizard wiring', () => {
  // NewEvent.jsx pulls in the store, RTK Query and the router; rendering it for three
  // props is far heavier than the property being guarded. A source read is enough.
  const src = readFileSync(
    join(process.cwd(), 'src/views/Dashboard/Dashboard/components/forms/NewEvent.jsx'),
    'utf-8'
  );

  it('names the header destination on every StandardPage it renders', () => {
    const pages = src.match(/<StandardPage\b[\s\S]*?>/g) ?? [];
    expect(pages.length).toBeGreaterThan(0);
    for (const page of pages) {
      if (page.includes('showBackButton')) {
        expect(page).toContain('backLabel={backToParcelLabel}');
      }
    }
  });

  it('labels the footer control "Previous step", never the same "Back" as the header', () => {
    expect(src).not.toMatch(/id:\s*'common\.back'/);
    expect(src).toContain("id: 'events.wizard.previousStep'");
  });

  it('lets the stepper take the farmer back to a finished step', () => {
    expect(src).toMatch(/<StandardStepper[\s\S]*?allowStepClick[\s\S]*?onStepClick=\{goToStep\}/);
  });
});
