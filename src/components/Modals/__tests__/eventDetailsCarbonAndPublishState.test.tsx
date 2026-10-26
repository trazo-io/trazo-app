/**
 * Astra activity-capture audit, 2026-10-26.
 *
 * AC-14: a general activity said "No emissions are estimated for this activity", then showed
 * "0 kg CO2e" and a "Minimal" level under it. The zero was made up in the browser for weather,
 * general and business records, which have no carbon calculation at all. Unknown is not zero:
 * those records show the not-estimated caption and nothing else, while a zero the backend
 * actually computed still displays.
 *
 * AC-15: every public-eligible record on an UNPUBLISHED season said "This record appears on your
 * buyer page" while the season screen said scanners could not see it yet. The hint now says
 * "appears" only when the caller knows the season is published.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import theme from '../../../theme/theme';
import enMessages from '../../../i18n/lang/en-US.json';
import esMessages from '../../../i18n/lang/es-419.json';
import { EventDetailsModal } from '../EventDetailsModal';
import EnhancedTimelineRow from '../../Tables/EnhancedTimelineRow';

// Same API-boundary mocks as eventDetailsModalSurface.test.tsx: this suite is about what the
// carbon card and the visibility hint say, not about the modal's data hooks.
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
  id: 42,
  description: 'Walked the block after the storm.',
  date: '2026-10-25T00:00:00Z',
  created_by: 7
};

/** The audit's own record: "ASTRA Generic activity test", a general activity (type 3). */
const GENERAL = { ...base, type: 'event.general.other', event_type: 3 };
const WEATHER = { ...base, id: 43, type: 'FR', event_type: 0 };
const BUSINESS = { ...base, id: 44, type: 'CE', event_type: 7 };

/** A served not_estimated status: nothing recorded to count from. */
const SOIL_NOT_ESTIMATED = {
  ...base,
  id: 45,
  type: 'TI',
  event_type: 5,
  carbon_data: {
    co2e: null,
    calculation_method: 'not_estimated',
    verification_status: 'not_estimated',
    usda_factors_based: false
  }
};

/** A zero the backend computed and stored as an answer (a scouting walk, no fuel). */
const PEST_COMPUTED_ZERO = {
  ...base,
  id: 46,
  type: 'MO',
  pest_management_type: 'MO',
  event_type: 6,
  carbon_data: {
    co2e: 0,
    calculation_method: 'Trazo methodology',
    verification_status: 'verified_zero',
    usda_factors_based: false,
    event_type: 'pestmanagement',
    timestamp: '2026-10-25T00:00:00Z'
  }
};

/** A per-hectare figure: estimated from the recorded area, so no "from recorded inputs". */
const SOIL_AREA_ESTIMATE = {
  ...base,
  id: 47,
  type: 'TI',
  event_type: 5,
  carbon_data: {
    co2e: 61.2,
    calculation_method: 'USDA-ARS Soil Carbon Research 2025',
    verification_status: 'area_estimate',
    usda_factors_based: false,
    event_type: 'soilmanagement',
    timestamp: '2026-10-25T00:00:00Z'
  }
};

/** A certifier-only production subtype (buffer disposal): the hint branch never runs. */
const CERTIFIER_ONLY = { ...base, id: 48, type: 'BU', production_type: 'BU', event_type: 1 };

function renderModal({
  event,
  isSeasonPublished,
  locale = 'en-US',
  messages = en
}: {
  event: Record<string, unknown>;
  isSeasonPublished?: boolean;
  locale?: string;
  messages?: Record<string, string>;
}) {
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
            isSeasonPublished={isSeasonPublished}
          />
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );
}

function renderRow(event: Record<string, unknown>) {
  return render(
    <ChakraProvider theme={theme}>
      <IntlProvider locale="en-US" messages={en}>
        <MemoryRouter>
          <EnhancedTimelineRow
            logo={null}
            title="Activity"
            date="2026-10-25"
            color="gray"
            url=""
            event={event as never}
            members={[]}
          />
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );
}

beforeEach(() => {
  // ResponsiveModal reads matchMedia; desktop is enough here (layout has its own suite).
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

describe('AC-14: a record with no carbon calculation shows no figure', () => {
  it.each([
    ['general', GENERAL],
    ['weather', WEATHER],
    ['business', BUSINESS]
  ])('%s: the caption only, no "0 kg CO2e" and no level badge', (_name, event) => {
    renderModal({ event });

    expect(screen.getAllByText(en['event.recordValue.zeroEmissions'])).toHaveLength(1);
    expect(screen.queryByText('kg CO₂e')).toBeNull();
    expect(screen.queryByText(en['carbon.activityLevel.minimal'])).toBeNull();
    expect(screen.queryByText(en['eventDetails.noDirectEmissions'])).toBeNull();
    expect(screen.queryByText(en['carbon.badge.epaUsdaSourced'])).toBeNull();
  });

  it('in Spanish too: "No se estiman emisiones", never "Mínima"', () => {
    renderModal({ event: GENERAL, locale: 'es-419', messages: es });

    expect(screen.getAllByText(es['event.recordValue.zeroEmissions'])).toHaveLength(1);
    expect(screen.queryByText('kg CO₂e')).toBeNull();
    expect(screen.queryByText(es['carbon.activityLevel.minimal'])).toBeNull();
  });

  it('a served not_estimated status says what was missing, with no figure', () => {
    renderModal({ event: SOIL_NOT_ESTIMATED });

    expect(screen.getByText(en['carbon.notEstimated'])).toBeInTheDocument();
    expect(screen.queryByText('kg CO₂e')).toBeNull();
    expect(screen.queryByText(en['carbon.activityLevel.minimal'])).toBeNull();
  });

  it('zero is not missing: a computed zero still displays as a figure', () => {
    renderModal({ event: PEST_COMPUTED_ZERO });

    expect(screen.getByText('kg CO₂e')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    // ...and the screen does not also claim nothing was estimated above it.
    expect(screen.queryByText(en['event.recordValue.zeroEmissions'])).toBeNull();
  });

  it('a per-hectare figure displays, without the "from recorded inputs" badge', () => {
    renderModal({ event: SOIL_AREA_ESTIMATE });

    expect(screen.getByText('kg CO₂e')).toBeInTheDocument();
    expect(screen.queryByText(en['carbon.badge.epaUsdaSourced'])).toBeNull();
  });
});

describe('AC-14: the timeline row makes up no zero either', () => {
  it.each([
    ['general', GENERAL],
    ['weather', WEATHER],
    ['business', BUSINESS]
  ])('%s: the caption, no "kg CO2e"', (_name, event) => {
    renderRow(event);

    expect(screen.getByText(en['event.recordValue.zeroEmissions'])).toBeInTheDocument();
    expect(screen.queryByText(/kg CO₂e/)).toBeNull();
  });

  it('a computed zero still shows its figure', () => {
    renderRow(PEST_COMPUTED_ZERO);
    expect(screen.getByText(/^0 kg CO₂e$/)).toBeInTheDocument();
  });
});

describe('AC-15: the buyer-page hint follows the season publish state', () => {
  it('unpublished season: "will appear once the season is published"', () => {
    renderModal({ event: GENERAL, isSeasonPublished: false });

    expect(
      screen.getByText(en['producer.event.buyerPageFieldsHintUnpublished'])
    ).toBeInTheDocument();
    expect(screen.queryByText(en['producer.event.buyerPageFieldsHint'])).toBeNull();
  });

  it('publish state not known (the activity feed): the conditional wording', () => {
    renderModal({ event: GENERAL });

    expect(
      screen.getByText(en['producer.event.buyerPageFieldsHintUnpublished'])
    ).toBeInTheDocument();
    expect(screen.queryByText(en['producer.event.buyerPageFieldsHint'])).toBeNull();
  });

  it('published season: "appears on your buyer page"', () => {
    renderModal({ event: GENERAL, isSeasonPublished: true });

    expect(screen.getByText(en['producer.event.buyerPageFieldsHint'])).toBeInTheDocument();
    expect(screen.queryByText(en['producer.event.buyerPageFieldsHintUnpublished'])).toBeNull();
  });

  it('Spanish: "aparecerá ... cuando publiques la temporada", in tuteo', () => {
    renderModal({ event: GENERAL, isSeasonPublished: false, locale: 'es-419', messages: es });

    const hint = es['producer.event.buyerPageFieldsHintUnpublished'];
    expect(hint).toMatch(/aparecerá en tu página de comprador cuando publiques la temporada/);
    expect(screen.getByText(hint)).toBeInTheDocument();
  });

  it.each([true, false])(
    'certifier-only record (published=%s): the certifier notice, no hint',
    (pub) => {
      renderModal({ event: CERTIFIER_ONLY, isSeasonPublished: pub });

      expect(screen.getByText(en['events.certifierOnly.title'])).toBeInTheDocument();
      expect(screen.queryByText(en['producer.event.buyerPageFieldsHint'])).toBeNull();
      expect(screen.queryByText(en['producer.event.buyerPageFieldsHintUnpublished'])).toBeNull();
    }
  );
});
