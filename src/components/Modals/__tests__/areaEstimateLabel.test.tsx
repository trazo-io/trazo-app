/**
 * Astra activity-capture follow-up, 2026-10-28 (Part A).
 *
 * Resaving a pH or tillage record removed the false "From recorded inputs" badge, but the figure
 * (0.12 and 61 kg CO2e) came back with no word on where it comes from. The figure is a per-area
 * default (`verification_status: 'area_estimate'`), so the detail and the timeline now say so, in
 * neutral gray, and never beside the inputs badge. A hardcoded "No CO2 data" (once in the
 * old timeline row) read English under a Spanish UI and disagreed with "not estimated".
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import theme from '../../../theme/theme';
import enMessages from '../../../i18n/lang/en-US.json';
import esMessages from '../../../i18n/lang/es-419.json';
import { EventDetailsModal } from '../EventDetailsModal';
import {
  isNotEstimated,
  showsAreaEstimateLabel,
  showsInputsBadge
} from '../../../utils/carbonStatus';

vi.mock('store/api/historyApi', () => ({
  useDeleteEventMutation: () => [vi.fn(), { isLoading: false }],
  useGetEventQuery: () => ({ data: undefined })
}));
vi.mock('store/api/amendmentsApi', () => ({
  useGetEventAmendmentsQuery: () => ({ data: undefined, isLoading: false }),
  useAmendEventMutation: () => [vi.fn(), { isLoading: false }],
  useGetSeasonAmendmentsQuery: () => ({ data: undefined, isLoading: false }),
  useAmendSeasonMutation: () => [vi.fn(), { isLoading: false }]
}));
vi.mock('store/api/documentsApi', () => ({ useGetFarmDocumentsQuery: () => ({ data: [] }) }));
vi.mock('hooks/useUserRole', () => ({ useUserRole: () => ({ canWrite: true }) }));
vi.mock('store/api/crewNoteApi', () => ({
  useGetCrewNoteQuery: () => ({ data: { crew_note: null } })
}));
vi.mock('react-redux', () => ({
  useSelector: (fn: (s: unknown) => unknown) => fn({ company: { currentCompany: { id: 1 } } })
}));

const en = enMessages as Record<string, string>;
const es = esMessages as Record<string, string>;

const base = {
  id: 50,
  description: 'Worked the block.',
  date: '2026-10-25T00:00:00Z',
  created_by: 7
};

/** The audit's tillage record: 61 kg from a per-area default, no fuel entered. */
const TILLAGE_AREA_ESTIMATE = {
  ...base,
  type: 'TI',
  event_type: 5,
  carbon_data: {
    co2e: 61,
    calculation_method: 'area_default',
    verification_status: 'area_estimate',
    usda_factors_based: true,
    event_type: 'soilmanagement',
    timestamp: '2026-10-25T00:00:00Z'
  }
};

/** A figure computed from recorded inputs: gets the inputs badge, never the area label. */
const FROM_INPUTS = {
  ...base,
  id: 51,
  type: 'TI',
  event_type: 5,
  carbon_data: {
    co2e: 12.3,
    calculation_method: 'verified_usda_factors',
    verification_status: 'estimated',
    usda_factors_based: true,
    event_type: 'soilmanagement',
    timestamp: '2026-10-25T00:00:00Z'
  }
};

/** No carbon payload at all: the row used to print a hardcoded English "No CO2 data". */

function renderModal(event: Record<string, unknown>, locale = 'en-US', messages = en) {
  return render(
    <ChakraProvider theme={theme}>
      <IntlProvider locale={locale} messages={messages}>
        <MemoryRouter initialEntries={['/admin/dashboard/farm/1/parcel/2']}>
          <EventDetailsModal
            isOpen
            onClose={vi.fn()}
            event={event as never}
            members={[]}
            farmId="1"
            parcelId="2"
          />
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );
}

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: !/max-width/.test(query),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    })
  });
});

describe('showsAreaEstimateLabel', () => {
  const cases = [
    { co2e: 61, verification_status: 'area_estimate', usda_factors_based: true },
    { co2e: 61, verification_status: 'area_estimate', usda_factors_used: true },
    { co2e: 12.3, verification_status: 'estimated', usda_factors_based: true },
    { co2e: 0, verification_status: 'area_estimate', usda_factors_based: true },
    { co2e: null, verification_status: 'area_estimate' },
    { co2e: null, calculation_method: 'not_estimated', verification_status: 'area_estimate' },
    { co2e: 5, verification_status: 'area_estimate', not_estimated: true }
  ];

  it('is true only for a positive area-estimate figure', () => {
    expect(showsAreaEstimateLabel(cases[0])).toBe(true);
    expect(showsAreaEstimateLabel(cases[1])).toBe(true);
    expect(showsAreaEstimateLabel(cases[2])).toBe(false);
    expect(showsAreaEstimateLabel(cases[3])).toBe(false);
    expect(showsAreaEstimateLabel(cases[4])).toBe(false);
    expect(showsAreaEstimateLabel(cases[5])).toBe(false);
    expect(showsAreaEstimateLabel(cases[6])).toBe(false);
    expect(showsAreaEstimateLabel(null)).toBe(false);
    expect(showsAreaEstimateLabel(undefined)).toBe(false);
  });

  it('is never true together with the inputs badge, for any served shape', () => {
    for (const c of cases) {
      expect(showsAreaEstimateLabel(c) && showsInputsBadge(c), JSON.stringify(c)).toBe(false);
    }
    // And a not-estimated status carries neither label.
    for (const c of cases.filter((x) => isNotEstimated(x))) {
      expect(showsAreaEstimateLabel(c) || showsInputsBadge(c)).toBe(false);
    }
  });
});

describe('detail modal: an area estimate says where the figure comes from', () => {
  it('en: the chip and the caption show, and the inputs badge does not', () => {
    renderModal(TILLAGE_AREA_ESTIMATE);

    expect(screen.getByText(en['carbon.badge.areaEstimate'])).toBeInTheDocument();
    expect(screen.getByText(en['carbon.badge.areaEstimateCaption'])).toBeInTheDocument();
    expect(screen.queryByText(en['carbon.badge.epaUsdaSourced'])).toBeNull();
  });

  it('es-419: the same, in Spanish', () => {
    renderModal(TILLAGE_AREA_ESTIMATE, 'es-419', es);

    expect(screen.getByText(es['carbon.badge.areaEstimate'])).toBeInTheDocument();
    expect(screen.getByText(es['carbon.badge.areaEstimateCaption'])).toBeInTheDocument();
    expect(screen.queryByText(es['carbon.badge.epaUsdaSourced'])).toBeNull();
  });

  it('a figure from recorded inputs gets the inputs badge and no area label', () => {
    renderModal(FROM_INPUTS);

    expect(screen.getByText(en['carbon.badge.epaUsdaSourced'])).toBeInTheDocument();
    expect(screen.queryByText(en['carbon.badge.areaEstimate'])).toBeNull();
    expect(screen.queryByText(en['carbon.badge.areaEstimateCaption'])).toBeNull();
  });
});

// The timeline row these cases also rendered (`EnhancedTimelineRow`) was deleted 2026-11-07: no
// screen used it once the parcel page and Activities moved to the shared month timeline, whose
// rows carry no carbon figure. Its two source guards still apply, so they read what remains.
describe('the area chip and the missing figure, wherever a carbon figure is shown', () => {
  it('the detail modal draws the area chip neutral, never green or a colour scheme', () => {
    const code = readFileSync(
      resolve(process.cwd(), 'src/components/Modals/EventDetailsModal.tsx'),
      'utf8'
    );
    const at = code.indexOf("'carbon.badge.areaEstimate'");
    const open = code.lastIndexOf('<Badge', at);
    expect(at).toBeGreaterThan(-1);
    const tag = code.slice(open, at);
    expect(tag).toMatch(/variant="neutral"/);
    expect(tag).not.toMatch(/green|colorScheme/);
  });

  it('no source file hardcodes "No CO2 data": a missing figure reads "not estimated"', () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) return entry.name === '__tests__' ? [] : walk(full);
        return /\.(tsx?|jsx?)$/.test(entry.name) ? [full] : [];
      });
    const offenders = walk(resolve(process.cwd(), 'src')).filter((file) =>
      /No CO₂ data/.test(readFileSync(file, 'utf8'))
    );
    expect(offenders).toEqual([]);
  });
});
