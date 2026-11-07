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
 *   3. Every multi-step form uses both: the header names its destination ("Back to River
 *      Block") and the footer says "Previous step". The same two Backs were on the parcel,
 *      farm, finish-production, company and parcel-application forms, most of which have no
 *      draft, so the wrong one threw the form away.
 */
import React from 'react';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { createIntl, IntlProvider } from 'react-intl';
// Relative, not the `theme/*` tsconfig alias: vitest.config.ts does not map that one.
import theme from '../../../theme/theme';
import { StandardPage, StandardStepper } from '../StandardComponents';
import enUS from '../../../i18n/lang/en-US.json';
import { backToLabel } from '../../../utils/backToLabel';
import { useFurthestStep } from '../../../hooks/useFurthestStep';

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

describe('backToLabel', () => {
  const intl = createIntl({ locale: 'en-US', messages: enUS });

  it('names the destination when its name is known', () => {
    expect(backToLabel(intl, 'River Block', 'common.backToParcel')).toBe('Back to River Block');
  });

  it('falls back to the generic place while the name loads', () => {
    expect(backToLabel(intl, undefined, 'common.backToParcel')).toBe('Back to parcel');
    expect(backToLabel(intl, '', 'common.backToFarm')).toBe('Back to farm');
  });
});

describe('useFurthestStep', () => {
  it('grows with the current step and never shrinks when going back', () => {
    const { result, rerender } = renderHook(({ step }) => useFurthestStep(step), {
      initialProps: { step: 0 }
    });
    rerender({ step: 1 });
    rerender({ step: 2 });
    rerender({ step: 0 });
    expect(result.current).toBe(2);
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

  it('puts only phrasing content inside a step button (no <div> or <p>)', () => {
    renderUi(
      <StandardStepper
        steps={[{ title: 'Activity & date', description: 'What you did' }, ...STEPS.slice(1)]}
        currentStep={2}
        allowStepClick
        onStepClick={() => {}}
      />
    );
    for (const button of screen.getAllByRole('button')) {
      expect(button.querySelectorAll('div, p, h1, h2, h3, h4, h5, h6')).toHaveLength(0);
    }
  });

  it('offers the NEXT step forward once it has been reached, and nothing further', () => {
    const onStepClick = vi.fn();
    renderUi(
      <StandardStepper
        steps={[...STEPS, { title: 'Review' }]}
        currentStep={0}
        furthestStep={3}
        allowStepClick
        onStepClick={onStepClick}
      />
    );
    // Step 2 is one Continue away, so its validation runs; steps 3 and 4 would skip step 2's.
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    expect(onStepClick).toHaveBeenCalledWith(1);
  });

  it('keeps forward steps closed until they have been reached', () => {
    renderUi(
      <StandardStepper
        steps={STEPS}
        currentStep={0}
        furthestStep={0}
        allowStepClick
        onStepClick={() => {}}
      />
    );
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('renders no buttons at all unless the caller opts in', () => {
    renderUi(<StandardStepper steps={STEPS} currentStep={2} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

// Every multi-step form, and where its header Back is labelled. `header` is the file whose
// <StandardPage showBackButton> must carry a backLabel: the form itself when it computes the
// label, or the shared form component that forwards one from its caller. `null` = the header
// is already unambiguous (the OSP wizard's footer said "Previous step" before this guard).
const WIZARDS: { file: string; header: 'own' | 'forwarded' | null }[] = [
  { file: 'src/views/Dashboard/Dashboard/components/forms/NewEvent.jsx', header: 'own' },
  { file: 'src/views/Dashboard/Parcel/ParcelApplicationWizard.tsx', header: 'own' },
  { file: 'src/views/Dashboard/Dashboard/Company/AddCompany.jsx', header: 'own' },
  { file: 'src/components/Forms/StandardParcelForm_Transparency.tsx', header: 'forwarded' },
  { file: 'src/components/Forms/StandardFarmForm.tsx', header: 'forwarded' },
  { file: 'src/components/Forms/StandardFinishProductionForm.tsx', header: 'forwarded' },
  { file: 'src/views/Dashboard/OSP/OSPModuleWizard.tsx', header: null }
];

// The pages that render a 'forwarded' form, each of which must pass the label down.
const FORM_CALLERS: { file: string; form: string }[] = [
  {
    file: 'src/views/Dashboard/Dashboard/Parcel/AddParcel.tsx',
    form: 'StandardParcelFormTransparency'
  },
  { file: 'src/views/Dashboard/Dashboard/Farm/AddFarm.tsx', form: 'StandardFarmForm' },
  {
    file: 'src/views/Dashboard/Dashboard/Production/FinishProduction.tsx',
    form: 'StandardFinishProductionForm'
  }
];

// Rendering these pulls in the store, RTK Query and the router; a source read is enough for
// what is guarded here, which is which label each control is given.
const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf-8');
// The opening tag of each <StandardPage>. Arrows are masked first: an `onBack={() => …}`
// prop holds a `>` that would otherwise end the tag before the props after it.
const standardPageTags = (src: string) =>
  src.replace(/=>/g, '=~').match(/<StandardPage\b[\s\S]*?>/g) ?? [];

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry === '__tests__' || entry === 'node_modules') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(jsx|tsx)$/.test(entry)) out.push(full);
  }
  return out;
};

describe('Multi-step forms: the two Backs never share a label', () => {
  it.each(WIZARDS.map((w) => [w.file, w]))(
    '%s: the previous-step control says "Previous step", not "Back"',
    (_file, { file }) => {
      const src = read(file);
      expect(src).not.toMatch(/['"]common\.back['"]/);
      expect(src).toContain("'common.previousStep'");
    }
  );

  it.each(WIZARDS.filter((w) => w.header).map((w) => [w.file, w]))(
    '%s: the header Back names its destination',
    (_file, { file, header }) => {
      const pages = standardPageTags(read(file)).filter((tag) => tag.includes('showBackButton'));
      expect(pages.length).toBeGreaterThan(0);
      for (const page of pages) {
        expect(page).toMatch(header === 'forwarded' ? /backLabel=\{backLabel\}/ : /backLabel=/);
      }
    }
  );

  it.each(FORM_CALLERS.map((c) => [c.file, c]))(
    '%s passes a backLabel to the form and to its loading page',
    (_file, { file, form }) => {
      const src = read(file);
      expect(src).toMatch(new RegExp(`<${form}\\b[\\s\\S]*?backLabel=\\{backLabel\\}`));
      for (const page of standardPageTags(src)) {
        if (page.includes('showBackButton')) expect(page).toContain('backLabel={backLabel}');
      }
    }
  );

  it('lists every form that renders a StandardStepper', () => {
    // A new stepped form gets the same two Backs by default. Add it to WIZARDS above.
    const listed = new Set(WIZARDS.map((w) => w.file));
    const steppers = walk(join(process.cwd(), 'src'))
      .filter((f) => readFileSync(f, 'utf-8').includes('<StandardStepper'))
      .map((f) => f.slice(process.cwd().length + 1));
    expect(steppers.length).toBeGreaterThan(0);
    expect(steppers.filter((f) => !listed.has(f))).toEqual([]);
  });

  it('lets every stepper return to a step already visited, through its own Continue', () => {
    // Reported 2026-10-19: back on step 1 after visiting step 2, step 2 was not clickable.
    const steppers = WIZARDS.map((w) => w.file).filter((f) => read(f).includes('<StandardStepper'));
    expect(steppers.length).toBe(5);
    for (const file of steppers) {
      const tag = read(file).match(/<StandardStepper\b[\s\S]*?\/>/)?.[0] ?? '';
      expect(tag, file).toContain('furthestStep={furthestStep}');
      // Forward must not be a bare setter: that skips the step's validation.
      expect(tag, file).not.toMatch(/onStepClick=\{\(?step\)? => setCurrentStep\(step\)\}/);
      expect(tag, file).not.toMatch(/onStepClick=\{set(Active|Current)Step\}/);
    }
    // The finish-production form gated Continue only with `disabled`, which stops nothing but
    // the button; its stepper click reached nextStep unchecked (review on #156).
    const finish = read('src/components/Forms/StandardFinishProductionForm.tsx');
    expect(finish).toMatch(
      /const nextStep = \(\) => \{[\s\S]*?if \(currentStep === 0 && !isStep0Valid\) return;/
    );
    const newEvent = read(WIZARDS[0].file);
    expect(newEvent).toMatch(/onStepClick=\{handleStepClick\}/);
    expect(newEvent).toMatch(/basicMethods\.handleSubmit\(onSubmitBasic\)\(\)/);
    // `onPrimary` since the step footers became WizardActions (2026-11-07).
    expect(newEvent).toMatch(/on(Click|Primary)=\{continueFromDetails\}/);
  });
});
