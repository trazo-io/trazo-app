/**
 * Buyer-facing CTAs belong to the CONSUMER audience only.
 *
 * WHY (2026-08-15): the producer's Production Profile
 * (/admin/dashboard/farm/:farmId/parcel/:parcelId/production/:productionId) mounts
 * UltraMobileProductionJourney as a preview of the consumer journey. It rendered
 * BOTH buyer surfaces to the farmer:
 *
 *   1. "Buyer or retailer? See the full sourcing record & request documents →"
 *   2. The BuyerDocRequestCTA card — "Request supplier documentation for this lot"
 *
 * The card's only gate was a PUBLIC-UUID shape test on the route param, written on
 * the belief that the dashboard route carries the internal numeric id. It does not:
 * HistoryCard navigates with `production.public_id`, so the regex passed and the farm
 * was offered a form for requesting documentation from itself.
 *
 * Shape is not audience. The gate is now the explicit `audience` prop, and this suite
 * pins it with the REAL producer URL — a UUID on the dashboard route — so a future
 * change cannot reintroduce the leak by tightening the regex instead.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { UltraMobileProductionJourney } from '../ProductDetail/components/UltraMobileProductionJourney';
import enMessages from '../../../i18n/lang/en-US.json';
import esMessages from '../../../i18n/lang/es-419.json';

// The gallery pulls presigned URLs through redux; this suite is about which CTAs
// render, not image loading.
vi.mock('components/ImageGallery/StandardImageGallery', () => ({
  StandardImageGallery: () => <div data-testid="gallery" />,
  default: () => <div data-testid="gallery" />
}));

// BuyerDocRequestCTA calls an RTK Query mutation hook, which needs a store. Stub the
// hook rather than stand one up — this suite asserts WHICH CTAs mount, not what the
// request does. The card's own copy is left real, so the consumer assertion below
// still reads the shipped strings.
vi.mock('store/api/transparencyQrApi', () => ({
  useCreateBuyerDocRequestMutation: () => [vi.fn(), { isLoading: false }]
}));

/** The exact id shape the PRODUCER route actually carries — a public UUID. */
const PUBLIC_UUID = '027804d7-17ba-468a-a210-e1279e92e165';

const EVENTS = [
  {
    id: '1',
    type: 'harvest',
    event_type: 1,
    production_type: 'HA',
    description: 'Harvest pass 2 - peak season',
    date: '2026-05-25T08:00:00Z',
    certified: false,
    observation: 'Excellent oil content 22-24%, premium export grade'
  },
  {
    id: '2',
    type: 'soil_management',
    event_type: 5,
    soil_management_type: 'ST',
    description: 'Soil test',
    date: '2026-03-02T08:00:00Z',
    certified: false
  }
] as never;

const PRODUCER_PATH = '/admin/dashboard/farm/:farmId/parcel/:parcelId/production/:productionId';
const PRODUCER_URL = `/admin/dashboard/farm/128/parcel/229/production/${PUBLIC_UUID}`;

function renderJourney({
  audience,
  path,
  url,
  locale = 'en-US'
}: {
  audience: 'consumer' | 'producer';
  path: string;
  url: string;
  locale?: 'en-US' | 'es-419';
}) {
  const messages = (locale === 'es-419' ? esMessages : enMessages) as Record<string, string>;
  return render(
    <ChakraProvider>
      {/* onError swallowed: react-intl logs for unrelated keys other components in the
          tree may miss. The es-419 assertions below are the real key-coverage check. */}
      <IntlProvider locale={locale} messages={messages} onError={() => undefined}>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route
              path={path}
              element={<UltraMobileProductionJourney events={EVENTS} audience={audience} />}
            />
          </Routes>
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );
}

describe('buyer CTAs are gated on audience, not on id shape', () => {
  it('CONSUMER product page shows both buyer surfaces', async () => {
    renderJourney({
      audience: 'consumer',
      path: '/production/:productionId',
      url: `/production/${PUBLIC_UUID}`
    });

    // Surface 1 — the story-view entry link.
    expect(
      screen.getByText(/Buyer or retailer\? See the full sourcing record/i)
    ).toBeInTheDocument();

    // Surface 2 — the lazy-loaded doc-request card.
    await waitFor(() =>
      expect(screen.getByText(/Request supplier documentation for this lot/i)).toBeInTheDocument()
    );
  });

  it('PRODUCER Production Profile shows neither, despite the route carrying a public UUID', async () => {
    renderJourney({ audience: 'producer', path: PRODUCER_PATH, url: PRODUCER_URL });

    // Positive control FIRST: a negative assertion is worthless unless we prove the
    // journey actually rendered. If this fails, the two absences below mean nothing.
    expect(screen.getByText(/View the full record/i)).toBeInTheDocument();

    expect(screen.queryByText(/Buyer or retailer/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Request supplier documentation/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Request documentation/i })
    ).not.toBeInTheDocument();

    // The lazy chunk resolves a tick later; make sure it does not appear afterwards.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText(/Buyer or retailer/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Request supplier documentation/i)).not.toBeInTheDocument();
  });
});

/**
 * BuyerDocRequestCTA was hardcoded English until 2026-08-15 — it sat directly under an
 * already-translated entry link, so a Spanish reader got a Spanish invitation followed by
 * an English form.
 *
 * A key-parity check over the JSON files cannot catch the failure that matters here: if a
 * `formatMessage` id is typo'd, both locale files still contain the key, and react-intl
 * silently falls back to the English `defaultMessage`. Only a RENDER in es-419 proves the
 * ids in the component actually resolve.
 */
describe('BuyerDocRequestCTA is localised, not hardcoded English', () => {
  it('renders Spanish copy for the card, the button and the form labels', async () => {
    renderJourney({
      audience: 'consumer',
      path: '/production/:productionId',
      url: `/production/${PUBLIC_UUID}`,
      locale: 'es-419'
    });

    // Card copy. Anchored: the already-translated entry link starts with the same
    // question, so an unanchored match hits both and is ambiguous.
    await waitFor(() => expect(screen.getByText(/^¿Comprador o minorista\?$/)).toBeInTheDocument());
    expect(
      screen.getByText(/Solicita la documentación del proveedor para este lote/)
    ).toBeInTheDocument();

    // The CTA button opens the form; both must be Spanish.
    const cta = screen.getByRole('button', { name: /Solicitar documentación/ });
    expect(cta).toBeInTheDocument();

    // The English defaultMessage must be absent — its presence means an id did not resolve.
    expect(
      screen.queryByText(/Request supplier documentation for this lot/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Request documentation$/i })
    ).not.toBeInTheDocument();
  });

  it('keeps the Spanish free of verification claims (compliance)', () => {
    const UNSAFE = /verificad|certificado por|garantiza/i;
    const buyerDocKeys = Object.keys(esMessages as Record<string, string>).filter((k) =>
      k.startsWith('consumer.buyerDoc.')
    );

    // Positive control: prove we actually read the keys, so the loop below is not vacuous.
    expect(buyerDocKeys.length).toBeGreaterThanOrEqual(17);

    for (const key of buyerDocKeys) {
      expect((esMessages as Record<string, string>)[key]).not.toMatch(UNSAFE);
    }
  });
});
