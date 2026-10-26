/**
 * A verification record opens in a state it can be saved in, and its status error speaks the
 * form's language (Astra activity-capture audit AC-13, 2026-10-26).
 *
 * The form defaulted every record to "pending", the schema refuses "pending" for a verification
 * (mirroring history/serializers.py), and the refusal was an English string at module scope. So
 * a Spanish grower who picked "verification" and pressed Continue was blocked in English by a
 * value they never chose. The activity names also presumed the result ("Sustainability
 * Assessment Passed", "Evaluación de sostenibilidad aprobada") while the form still accepted
 * "Verification Failed" for them.
 */
import React, { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';

import baseApi from 'store/api/baseApi';
import enUS from '../../../../../../i18n/lang/en-US.json';
import esLA from '../../../../../../i18n/lang/es-419.json';

// @ts-expect-error BusinessTab-SIMPLIFIED is a .jsx module with no type declarations.
import BusinessTab from '../BusinessTab-SIMPLIFIED';

afterEach(cleanup);

const store = () =>
  configureStore({
    reducer: {
      company: () => ({
        currentCompany: { id: 1, establishments: [{ id: 1, name: 'Farm', state: 'WA' }] }
      }),
      [baseApi.reducerPath]: baseApi.reducer
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware)
  });

type Handle = { submitForm: () => Promise<void> };

const mount = (locale: 'en' | 'es-419') => {
  const ref = createRef<Handle>();
  const onSubmitHandler = vi.fn();
  const messages = (locale === 'en' ? enUS : esLA) as Record<string, string>;
  const { container } = render(
    <Provider store={store()}>
      <MemoryRouter>
        <ChakraProvider>
          <IntlProvider locale={locale} messages={messages} onError={() => {}}>
            <BusinessTab ref={ref} hideActions onSubmitHandler={onSubmitHandler} />
          </IntlProvider>
        </ChakraProvider>
      </MemoryRouter>
    </Provider>
  );
  const select = (name: string) =>
    container.querySelector(`select[name="${name}"]`) as HTMLSelectElement;
  return { ref, onSubmitHandler, select, container };
};

const submit = async (ref: React.RefObject<Handle>) => {
  let errors: Record<string, { message?: string }> | null = null;
  await act(async () => {
    try {
      await ref.current!.submitForm();
    } catch (e) {
      errors = e as Record<string, { message?: string }>;
    }
  });
  return errors as Record<string, { message?: string }> | null;
};

const choose = async (el: HTMLSelectElement, value: string) => {
  await act(async () => {
    fireEvent.change(el, { target: { value } });
  });
};

describe('verification status', () => {
  it('a new verification record saves without the farmer touching the status', async () => {
    const { ref, onSubmitHandler, select } = mount('en');
    await choose(select('business_type'), 'verification');
    expect(select('verification_status').value).toBe('in_progress');
    const errors = await submit(ref);
    expect(errors).toBeNull();
    expect(onSubmitHandler).toHaveBeenCalledTimes(1);
    expect(onSubmitHandler.mock.calls[0][0].verification_status).toBe('in_progress');
  });

  it('other activities keep the backend default', async () => {
    const { select } = mount('en');
    await choose(select('business_type'), 'compliance');
    expect(select('verification_status').value).toBe('pending');
  });

  it('a status the farmer chose is never overwritten by the activity', async () => {
    const { select } = mount('en');
    await choose(select('business_type'), 'compliance');
    await choose(select('verification_status'), 'failed');
    await choose(select('business_type'), 'verification');
    expect(select('verification_status').value).toBe('failed');
  });

  it('a pending verification is refused in Spanish on a Spanish form', async () => {
    const { ref, onSubmitHandler, select } = mount('es-419');
    await choose(select('business_type'), 'verification');
    await choose(select('verification_status'), 'pending');
    const errors = await submit(ref);
    expect(onSubmitHandler).not.toHaveBeenCalled();
    const message = errors?.verification_status?.message;
    expect(message).toBe(
      (esLA as Record<string, string>)['events.business.validation.verificationNeedsStatus']
    );
    expect(message).not.toMatch(/definitive|verified/i);
  });
});

describe('activity names do not presume the result', () => {
  const KEYS = [
    'events.business.options.certificationAchievementOrganicFairTradeEtc',
    'events.business.options.sustainabilityAssessmentPassed',
    'events.business.options.regulatoryComplianceAchieved',
    'events.business.options.thirdPartyVerificationCompleted'
  ];
  const PRESUMES = /passed|achieved|achievement|completed|aprobad|logrado|obtenida|completad/i;

  for (const [locale, catalog] of [
    ['en-US', enUS],
    ['es-419', esLA]
  ] as const) {
    it(`${locale} activity options name the activity, not its outcome`, () => {
      const cat = catalog as Record<string, string>;
      for (const key of KEYS) {
        expect(cat[key], key).toBeTruthy();
        expect(cat[key], key).not.toMatch(PRESUMES);
      }
    });
  }

  it('the rendered option list carries the neutral names', () => {
    const { select } = mount('es-419');
    const labels = [...select('business_type').options].map((o) => o.textContent);
    expect(labels).toContain('Evaluación de sostenibilidad');
    expect(labels).toContain('Cumplimiento regulatorio');
  });
});
