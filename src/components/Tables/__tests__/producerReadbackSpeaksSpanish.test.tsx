/**
 * The producer's readback speaks the operator's language (Astra audit AC-09, AC-01, AC-10, AC-11).
 *
 * The audit ran the app in Spanish and found English on the producer detail and the timeline
 * card: "Additional Details", "Business Type", "7 hours", "Tucking". The consumer card had always
 * run registry values through `localizeFieldValue`; the producer surfaces never did, and the
 * timeline built its labels by de-camelCasing the i18n key instead of reading the message.
 *
 * Rendered, not grepped: a source check cannot tell whether the string reaches the screen.
 */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { getFieldsForSurface } from 'src/config/events';
import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';

const ES = es419 as unknown as Record<string, string>;
const EN = enUS as unknown as Record<string, string>;

let RegistryFieldRenderer: typeof import('../../Events/RegistryFieldRenderer').RegistryFieldRenderer;
let EnhancedTimelineRow: typeof import('../EnhancedTimelineRow').default;

beforeAll(async () => {
  // The timeline reads the flag at module load, so it has to be set before the import.
  vi.stubEnv('VITE_USE_FIELD_REGISTRY', 'true');
  ({ RegistryFieldRenderer } = await import('../../Events/RegistryFieldRenderer'));
  EnhancedTimelineRow = (await import('../EnhancedTimelineRow')).default;
});

const wrap = (locale: 'en-US' | 'es-419', ui: React.ReactElement) => (
  <ChakraProvider>
    <IntlProvider locale={locale} messages={(locale === 'es-419' ? ES : EN) as never}>
      <MemoryRouter>{ui}</MemoryRouter>
    </IntlProvider>
  </ChakraProvider>
);

/** Fields as the modal resolves them, with the same translate function `useEventFields` passes. */
const resolve = (
  eventType: number,
  subtype: string,
  surface: 'modal' | 'timeline',
  event: Record<string, unknown>,
  cat: Record<string, string>
) =>
  getFieldsForSurface(
    eventType as never,
    subtype as never,
    surface,
    { event_type: eventType, type: subtype, ...event } as never,
    (id: string) => cat[id] ?? null
  );

describe('RegistryFieldRenderer (the detail modal body) under es-419', () => {
  it('translates section titles and every value, with no English left over', () => {
    // Business: a labelled enum, a status, and a certification; weather: an hours duration.
    const business = resolve(
      7,
      'IN',
      'modal',
      {
        business_type: 'verification',
        verification_status: 'in_progress'
      },
      ES
    );
    // Force content into the lower tiers so both section headings render.
    const secondary = [
      {
        name: 'x',
        labelKey: 'events.business.fields.businessType',
        tier: 'secondary' as const,
        formattedValue: 'Third-Party Verification',
        rawValue: 'verification',
        isCarbonRelevant: false,
        requiresVerificationBadge: false
      }
    ];
    const details = [
      {
        name: 'y',
        labelKey: 'events.weather.fields.duration',
        tier: 'details' as const,
        formattedValue: '7 hours',
        rawValue: 7,
        isCarbonRelevant: false,
        requiresVerificationBadge: false
      }
    ];
    const fields = { ...business, secondary: [...business.secondary, ...secondary], details };
    const { container } = render(
      wrap('es-419', <RegistryFieldRenderer fields={fields as never} variant="modal" />)
    );
    const text = container.textContent ?? '';
    expect(text).not.toContain('Additional Details');
    expect(text).not.toContain('Technical Details');
    expect(text).not.toContain('Business Type');
    expect(text).not.toContain('hours');
    expect(text).not.toContain('Third-Party Verification');
    expect(text).toContain(ES['eventDetails.additionalDetails']);
    expect(text).toContain(ES['eventDetails.technicalDetails']);
    expect(text).toContain('Verificación de terceros');
    expect(text).toContain('7 horas');
  });

  it('the same fields stay English under en-US (the fix is locale-gated, not a rewrite)', () => {
    const fields = {
      hero: [],
      immediate: [],
      secondary: [
        {
          name: 'x',
          labelKey: 'events.weather.fields.duration',
          tier: 'secondary' as const,
          formattedValue: '7 hours',
          rawValue: 7,
          isCarbonRelevant: false,
          requiresVerificationBadge: false
        }
      ],
      details: []
    };
    const { container } = render(
      wrap('en-US', <RegistryFieldRenderer fields={fields as never} variant="modal" />)
    );
    expect(container.textContent).toContain('Additional Details');
    expect(container.textContent).toContain('7 hours');
  });

  it('a hailstorm duration reads in minutes, in Spanish', () => {
    const fields = resolve(0, 'HL', 'modal', { weather_type: 'HL', duration: '7' }, ES);
    const { container } = render(
      wrap('es-419', <RegistryFieldRenderer fields={fields as never} variant="modal" />)
    );
    expect(container.textContent).toContain('7 minutos');
    expect(container.textContent).not.toMatch(/hours|horas/);
  });
});

describe('canopy and cultivation detail under es-419', () => {
  it('canopy tying reads Amarre, not Tucking', () => {
    const fields = resolve(
      1,
      'CM',
      'modal',
      { production_type: 'CM', canopy_operation: 'tucking' },
      ES
    );
    const { container } = render(
      wrap('es-419', <RegistryFieldRenderer fields={fields as never} variant="modal" />)
    );
    expect(container.textContent).toContain('Amarre');
    expect(container.textContent).not.toContain('Tucking');
  });

  it('a cultivation record names its operation instead of only "Production"', () => {
    const fields = resolve(1, 'CU', 'modal', { production_type: 'CU' }, ES);
    const { container } = render(
      wrap('es-419', <RegistryFieldRenderer fields={fields as never} variant="modal" />)
    );
    expect(container.textContent).toContain(ES['events.production.subtypes.cultivation']);
  });
});

describe('EnhancedTimelineRow card under es-419', () => {
  const baseEvent = {
    id: 1,
    event_type: 7,
    type: 'IN',
    name: 'ASTRA business',
    date: '2026-10-19T16:20:00Z',
    description: 'ASTRA business test',
    business_type: 'verification',
    verification_status: 'in_progress',
    extra_data: {}
  };

  const renderRow = (locale: 'en-US' | 'es-419', event: Record<string, unknown>) =>
    render(
      wrap(
        locale,
        <EnhancedTimelineRow
          logo={null}
          title="t"
          date="2026-10-19"
          color="green"
          url="/"
          event={event as never}
          members={[]}
        />
      )
    );

  it('labels come from the authored message and values are localized', () => {
    const { container } = renderRow('es-419', baseEvent);
    const text = container.textContent ?? '';
    expect(text, 'de-camelCased key leaked').not.toContain('Business Type');
    expect(text).not.toContain('Verification In Progress');
    expect(text).toContain(ES['events.business.fields.businessType']);
    expect(text).toContain('Verificación en curso');
  });

  it('English stays English', () => {
    const { container } = renderRow('en-US', baseEvent);
    expect(container.textContent).toContain(EN['events.business.fields.businessType']);
    expect(container.textContent).toContain('Verification In Progress');
  });

  it('a hail card reads minutes, a storm card hours, and units ride with the numbers', () => {
    const hail = renderRow('es-419', {
      id: 2,
      event_type: 0,
      type: 'HL',
      weather_type: 'HL',
      name: 'ASTRA hail',
      date: '2026-10-19T16:20:00Z',
      description: 'hail',
      duration: '7',
      extra_data: {}
    });
    expect(hail.container.textContent).toContain('7 minutos');
    expect(hail.container.textContent).not.toMatch(/7 hours|7 horas/);
    hail.unmount();

    const storm = renderRow('es-419', {
      id: 3,
      event_type: 0,
      type: 'TS',
      weather_type: 'TS',
      name: 'ASTRA storm',
      date: '2026-10-19T16:20:00Z',
      description: 'storm',
      wind_speed: '60',
      precipitation_amount: '20',
      duration: '7',
      extra_data: {}
    });
    const text = storm.container.textContent ?? '';
    expect(text).toContain('60 km/h');
    expect(text).toContain('20 mm');
  });
});
