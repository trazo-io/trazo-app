/**
 * The calculator's notes reach the carbon box in the reader's language (2026-11-09).
 *
 * The backend explains a factor in an English sentence (`breakdown.note`), and the box printed
 * it as sent: "Organic pesticide (neem, pyrethrin) uses lower emission factor than synthetic
 * pesticides" under Spanish labels. It now also sends a `note_code`, and the box words the code
 * from `carbonPreview.note.<code>`.
 *
 * Parity: this reads the codes from the sibling trazo-back checkout (CI checks out trazo-back
 * main beside trazo-app), so a code the backend adds without copy here fails.
 */
import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import theme from '../../../theme/theme';
import enUS from '../../../i18n/lang/en-US.json';
import esUY from '../../../i18n/lang/es-419.json';
import { CarbonImpactPreview } from '../CarbonImpactPreview';

const en = enUS as Record<string, string>;
const es = esUY as Record<string, string>;
const BACK = join(__dirname, '../../../../../trazo-back/carbon');

const backendCodes = () =>
  ['services/verified_emission_factors.py', 'views.py']
    .flatMap((f) => [
      ...readFileSync(join(BACK, f), 'utf8').matchAll(/"note_code":\s*"([a-z_]+)"/g)
    ])
    .map((m) => m[1]);

describe('every note the calculator can send has copy', () => {
  it('in both locales', () => {
    const codes = backendCodes();
    // Nine product notes and the aggregate one. Fewer means the backend lost codes, or this is
    // reading a trazo-back from before they existed.
    expect(codes.length, 'read no note_code from trazo-back').toBeGreaterThanOrEqual(10);
    // Built in carbon/views.py, not in the service: named so a read of only one file fails.
    expect(codes).toContain('aggregate_applications');
    const missing = codes.filter(
      (c) => !en[`carbonPreview.note.${c}`] || !es[`carbonPreview.note.${c}`]
    );
    expect(missing).toEqual([]);
  });
});

describe('no string anywhere calls the estimate "direct operational"', () => {
  // compliance.md lists "direct on-farm emissions only" as unsafe: the estimate includes the
  // manufacturing of the fertilizer and chemicals the farm buys. The carbon box's basis line
  // and the farm carbon card still said it on 2026-11-09, after the help center had stopped.
  it('in either locale', () => {
    const DIRECT = /direct[- ]operational|operativas? directas?|operacional(es)? directas?/i;
    const offenders = [
      ...Object.entries(en).filter(([, v]) => DIRECT.test(v)),
      ...Object.entries(es).filter(([, v]) => DIRECT.test(v))
    ].map(([k]) => k);
    expect(offenders).toEqual([]);
  });

  it('the basis line for an input names its sources instead of "no published factor"', () => {
    expect(en['carbon.basis.inputFactors']).toMatch(/EPA/);
    expect(en['carbon.basis.inputFactors']).toMatch(/Trazo estimates/);
    expect(es['carbon.basis.inputFactors']).toMatch(/estimaciones de Trazo/);
  });
});

const show = (messages: Record<string, string>, locale: string, breakdown: object) => {
  render(
    <IntlProvider locale={locale} messages={messages}>
      <ChakraProvider theme={theme}>
        <CarbonImpactPreview
          eventType="Chemical"
          formData={{ type: 'PE' }}
          calculation={{ co2e: 2, calculation_method: 'chemical', breakdown } as never}
        />
      </ChakraProvider>
    </IntlProvider>
  );
  fireEvent.click(screen.getByText(messages['carbon.details.show']));
};

afterEach(cleanup);

describe('the box words the note by its code', () => {
  const organic = {
    pesticide_subtype: 'organic',
    chemical_subtype_used: 'organic_pesticide',
    active_ingredient_percentage: 25,
    note: 'Organic pesticide (neem, pyrethrin) uses lower emission factor than synthetic pesticides',
    note_code: 'organic_pesticide'
  };

  it('in Spanish, with no English left', () => {
    show(es, 'es-419', organic);
    expect(screen.getByText(es['carbonPreview.note.organic_pesticide'])).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/uses lower emission factor/);
  });

  it('an aggregate note carries its count and active ingredient', () => {
    show(es, 'es-419', {
      ...organic,
      note: 'Aggregate of 3 Pesticide applications. Total active ingredient: 1.5 kg.',
      note_code: 'aggregate_applications',
      aggregate_application_count: 3,
      active_ingredient_kg: 1.5
    });
    expect(
      screen.getByText(
        /Resumen de 3 aplicaciones\. Ingrediente activo total: 1,5 kg\.|Resumen de 3 aplicaciones\. Ingrediente activo total: 1\.5 kg\./
      )
    ).toBeInTheDocument();
  });

  it('a response from before the code existed still shows its note', () => {
    const { note_code: _ignored, ...legacy } = organic;
    show(en, 'en-US', legacy);
    expect(screen.getByText(organic.note)).toBeInTheDocument();
  });
});
