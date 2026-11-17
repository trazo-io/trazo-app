/**
 * On a plan written by substance, the drift row says how a brand-name finding clears
 * (overall review 2026-11, OV-MT-C06).
 *
 * A plan that lists "Copper hydroxide" and "Spinosad" flagged every spray logged as
 * "Kocide 3000-O" or "Entrust SC", and the row never said why or what to do. The detector
 * does not guess a brand's active ingredient; when the record has none, it sends the plan's
 * substances (`reason_params.planSubstances`) and the row tells the grower to type the
 * ingredient on the record, which is what the detector reads (back, same slice).
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';

import enUS from '../../../i18n/lang/en-US.json';
import esES from '../../../i18n/lang/es-419.json';
import DriftFindingsBanner from '../DriftFindingsBanner';
import type { DriftWarning } from 'types/standardizedEvents';

const finding = (
  reasonCode: string,
  params: Record<string, unknown>
): { id: number; date: string; drift_warning: DriftWarning } => ({
  id: 88,
  date: '2026-05-02T08:00:00Z',
  drift_warning: {
    detected_at: '2026-11-17T15:00:00Z',
    osp_id: 9,
    osp_version: 1,
    input_label: 'Kocide 3000-O',
    reason: "Input 'Kocide 3000-O' resolves to WSDA Materials List entry 'Kocide 3000-O'.",
    reason_code: reasonCode,
    reason_params: { input: 'Kocide 3000-O', resolvedName: 'Kocide 3000-O', ...params },
    provisional: false,
    resolved_via: 'wsda',
    resolved_id: 4,
    resolved_name: 'Kocide 3000-O',
    cfr_reference: '7 CFR 205.400(f)(2)'
  }
});

const wrap = (node: React.ReactNode, locale: 'en-US' | 'es-419' = 'en-US') =>
  render(
    <ChakraProvider>
      <IntlProvider locale={locale} messages={locale === 'en-US' ? enUS : esES}>
        <MemoryRouter>{node}</MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );

const SUBSTANCES = ['Copper hydroxide', 'Spinosad'];

describe('DriftFindingsBanner on a plan written by substance', () => {
  it("names the plan's substances and the field that clears the finding", () => {
    wrap(
      <DriftFindingsBanner
        events={[finding('name_wsda_not_in_osp', { planSubstances: SUBSTANCES })]}
      />
    );
    fireEvent.click(screen.getByText('Show details'));
    expect(
      screen.getByText(/Your plan lists Copper hydroxide, Spinosad by substance name/)
    ).toBeTruthy();
    expect(screen.getByText(/type it in the record's Active Ingredient field/)).toBeTruthy();
  });

  it('says it in Spanish on the Spanish dashboard', () => {
    wrap(
      <DriftFindingsBanner
        events={[finding('name_wsda_not_in_osp', { planSubstances: SUBSTANCES })]}
      />,
      'es-419'
    );
    fireEvent.click(screen.getByText(esES['drift.banner.show'] as string));
    expect(
      screen.getByText(/Tu plan nombra Copper hydroxide, Spinosad como sustancias/)
    ).toBeTruthy();
  });

  it('keeps the closest-listing sentence and adds the hint after it', () => {
    wrap(
      <DriftFindingsBanner
        events={[
          finding('unresolved', {
            possibleMatches: ['Kocide 3000-O Fungicide'],
            planSubstances: SUBSTANCES
          })
        ]}
      />
    );
    fireEvent.click(screen.getByText('Show details'));
    expect(
      screen.getByText(/Closest listing: Kocide 3000-O Fungicide.*Your plan lists Copper hydroxide/)
    ).toBeTruthy();
  });

  it('adds nothing when the detector sent no substances', () => {
    wrap(<DriftFindingsBanner events={[finding('name_wsda_not_in_osp', {})]} />);
    fireEvent.click(screen.getByText('Show details'));
    expect(screen.queryByText(/by substance name/)).toBeNull();
  });

  it("names the field by the form's own label, in both locales", () => {
    // The hint sends the grower to a field; a label that drifted from the form's would send
    // them looking for a field that is not there.
    expect(enUS['drift.reason.plan_lists_substances']).toContain(
      enUS['events.chemical.fields.activeIngredient']
    );
    expect(esES['drift.reason.plan_lists_substances']).toContain(
      esES['events.chemical.fields.activeIngredient']
    );
  });
});
