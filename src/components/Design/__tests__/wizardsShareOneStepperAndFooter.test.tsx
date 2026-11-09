/**
 * Every step-by-step form draws the same stepper and the same footer (2026-11-07).
 *
 * The activity wizard moved to a thin step bar and a one-primary footer (`WizardActions`) in
 * #305, while the farm, parcel, company and finish-season forms kept a card of numbered circles
 * and footers of their own (Cancel + Continue, "Back to Company Info", a full-width Continue on
 * a phone). Same app, two ways of saying where you are and how to go on. The circles are gone
 * from `StandardStepper`; these checks keep the footers from drifting back.
 *
 * Finishing a season also lost its confirm dialog: the form ends on a review step, like the
 * activity wizard, and only that step's button finishes.
 */
import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import theme from '../../../theme/theme';
import enUS from '../../../i18n/lang/en-US.json';
import SeasonFinishReview from '../../Forms/SeasonFinishReview';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf-8');

const WIZARDS = [
  'src/views/Dashboard/Dashboard/components/forms/NewEvent.jsx',
  'src/views/Dashboard/Dashboard/Company/AddCompany.jsx',
  'src/components/Forms/StandardParcelForm_Transparency.tsx',
  'src/components/Forms/StandardFarmForm.tsx',
  'src/components/Forms/StandardFinishProductionForm.tsx',
  // 2026-11-09: the OSP module questionnaire had a progress strip and a footer of its own.
  'src/views/Dashboard/OSP/OSPModuleWizard.tsx'
];

describe('one stepper, one footer', () => {
  it.each(WIZARDS)('%s uses WizardActions for every step footer', (file) => {
    const src = read(file);
    expect(src).toContain('<StandardStepper');
    expect(src).toMatch(/import WizardActions from '(components|\.\.)\/Design\/WizardActions'/);
    // A hand-built footer is a button wired straight to the step functions.
    expect(src).not.toMatch(/<StandardButton[^>]*onClick=\{(nextStep|previousStep)\}/);
    // No Cancel in a footer: the header Back names where it goes.
    expect(src).not.toMatch(/onClick=\{(onCancel|handleCancel)\}/);
  });

  it('the parcel application keeps its section tabs but shares the footer', () => {
    // Its sections are independent and each tab says whether that section still owes evidence,
    // so it is not a linear step bar. The footer is the shared one: it drew a greyed-out
    // "Previous step" on the first section (2026-11-09).
    const src = read('src/views/Dashboard/Parcel/ParcelApplicationWizard.tsx');
    expect(src).toContain('<StandardSectionTabs');
    expect(src).toMatch(/import WizardActions from 'components\/Design\/WizardActions'/);
    expect(src).toMatch(/onBack=\{clamped > 0 \?/);
    expect(src).not.toMatch(/isDisabled=\{clamped === 0\}/);
  });

  it('StandardStepper has one look: the variant prop is gone', () => {
    const src = read('src/components/Design/StandardComponents.tsx');
    expect(src).not.toMatch(/variant\?: 'card' \| 'bar'/);
    for (const file of WIZARDS) expect(read(file)).not.toMatch(/<StandardStepper[^/]*variant=/);
  });
});

describe('finish season ends on a review step, not a dialog', () => {
  const src = read('src/components/Forms/StandardFinishProductionForm.tsx');

  it('has no confirm dialog', () => {
    expect(src).not.toMatch(/AlertDialog|useDisclosure/);
  });

  it('renders the review as the last step, and only its button finishes', () => {
    expect(src).toMatch(/currentStep === 2 && \([\s\S]*?<SeasonFinishReview/);
    expect(src).toMatch(/onPrimary=\{handleFinish\}/);
    expect(src.match(/onPrimary=\{handleFinish\}/g)?.length).toBe(1);
    expect(src).not.toMatch(/handleFinish\(\)/); // never called from anywhere else
    // Enter in a field submits the <form>; that must never finish the season.
    const formTag = src.match(/<form\s+onSubmit=\{[\s\S]*?\}\}>/)?.[0] ?? '';
    expect(formTag).toContain('preventDefault');
    expect(formTag).not.toMatch(/handle|onSubmit\(/);
  });

  it('sends the publish choice only when finishing, never on an edit', () => {
    expect(src).toMatch(
      /onSubmitForm\(isEdit \? allFormData : \{ \.\.\.allFormData, published: publishBuyerPage \}\)/
    );
  });
});

describe('SeasonFinishReview', () => {
  const values = {
    amount: '40',
    unitLabel: 'Bins',
    lotId: 'CBF-26-BGA',
    finishDate: '2026-10-20T08:00',
    qualityGrade: '',
    harvestMethod: 'Manual Harvest',
    observation: ''
  };
  const renderReview = (isEdit: boolean) =>
    render(
      <IntlProvider locale="en-US" messages={enUS}>
        <ChakraProvider theme={theme}>
          <SeasonFinishReview
            values={values}
            photoCount={0}
            isEdit={isEdit}
            publish
            onPublishChange={() => {}}
            onChange={() => {}}
          />
        </ChakraProvider>
      </IntlProvider>
    );

  it('shows the record, what finishing locks, and the publish choice', () => {
    renderReview(false);
    expect(screen.getByText('40 Bins')).toBeInTheDocument();
    expect(screen.getByText('CBF-26-BGA')).toBeInTheDocument();
    expect(screen.getByText(enUS['finishProduction.confirm.lockEvents'])).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeChecked();
    // A blank optional field says so; it does not vanish.
    expect(screen.getByText(enUS['events.review.notGiven'])).toBeInTheDocument();
  });

  it('on an edit shows only the record: no locks, no publish choice', () => {
    renderReview(true);
    expect(screen.getByText('40 Bins')).toBeInTheDocument();
    expect(screen.queryByText(enUS['finishProduction.confirm.lockEvents'])).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});
