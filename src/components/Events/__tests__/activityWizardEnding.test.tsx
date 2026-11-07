/**
 * How the activity wizard ends (2026-11-07): a photo step that never grades the upload, then a
 * review of the record with a way back to each part of it.
 *
 * The photo box used to say "Add another photo from a different angle for stronger
 * verification" after one photo and "Excellent documentation for this activity!" after two:
 * text from the retired per-event verification tiers. A record carries no grade. It also told
 * a cultivation pass to photograph seeding equipment, because any production subtype without
 * its own entry fell back to the planting-and-harvest list.
 */
import React from 'react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';

import enUS from '../../../i18n/lang/en-US.json';
import { PhotoRecommendationsBox } from '../PhotoRecommendationsBox';
import ActivityReview from '../ActivityReview';

const wrap = (ui: React.ReactElement) =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        {ui}
      </IntlProvider>
    </ChakraProvider>
  );

describe('photo step guidance', () => {
  it('says what to photograph before the first photo', () => {
    wrap(<PhotoRecommendationsBox activeEventType={1} photoCount={0} subtype="CU" />);
    expect(screen.getByText('What to photograph')).toBeInTheDocument();
  });

  it('a production pass with no entry of its own gets no planting or harvest examples', () => {
    const { container } = wrap(
      <PhotoRecommendationsBox activeEventType={1} photoCount={0} subtype="CU" />
    );
    expect(container.textContent).not.toMatch(/Planting|Harvesting|seeding/i);
  });

  it.each([1, 2, 5])('says nothing once %i photo(s) are added: it never grades them', (n) => {
    const { container } = wrap(
      <PhotoRecommendationsBox activeEventType={2} photoCount={n} subtype={undefined} />
    );
    expect(container.textContent).toBe('');
  });

  it('no message it can show carries verification or a verdict', () => {
    for (const type of [0, 1, 2, 3, 5, 6, 7]) {
      const { container, unmount } = wrap(
        <PhotoRecommendationsBox activeEventType={type} photoCount={0} />
      );
      expect(container.textContent).not.toMatch(/verif|excellent|stronger/i);
      unmount();
    }
  });
});

describe('review before save', () => {
  const props = {
    eventType: 1,
    record: {
      type: 'CU',
      name: 'Cultivation',
      observation: 'Second pass between the rows.',
      private_note: 'Neighbour asked about the dust.'
    },
    activityLabel: 'Field work',
    dateLabel: 'Nov 7, 2026, 9:00 AM',
    doneBy: 'Luis',
    parcelsLabel: 'Bottom Ground A',
    photoCount: 0
  };

  it('shows what was entered, notes included', () => {
    wrap(<ActivityReview {...props} onChange={vi.fn()} />);
    for (const text of [
      'Field work',
      'Nov 7, 2026, 9:00 AM',
      'Luis',
      'Bottom Ground A',
      'Cultivation',
      'Second pass between the rows.',
      'Neighbour asked about the dust.'
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByText('No photos attached.')).toBeInTheDocument();
  });

  it('each part has a way back to the step that holds it', () => {
    const onChange = vi.fn();
    wrap(<ActivityReview {...props} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Change: Activity and date' }));
    fireEvent.click(screen.getByRole('button', { name: 'Change: Details' }));
    expect(onChange.mock.calls).toEqual([[0], [1]]);
  });

  it('says so when Done by was left empty, instead of a blank row', () => {
    wrap(<ActivityReview {...props} doneBy="" onChange={vi.fn()} />);
    expect(screen.getByText('Not given')).toBeInTheDocument();
  });
});

describe('review of a spray (2026-11-07)', () => {
  // The values the wizard holds for an input application, as the details step leaves them:
  // an untouched optional input is '' (buffer_zone_meters here), not null.
  const spray = {
    eventType: 2,
    record: {
      type: 'PE',
      chemical_subtype: 'biological_pesticide',
      commercial_name: 'AgriPhage-Fire Blight',
      target_pest_disease: 'Fire blight',
      volume_numeric: '7',
      volume_unit: 'gal',
      area_numeric: '28.4',
      area_unit: 'acres',
      supplier_name: 'Sample Basin Ag Supply, Yakima WA',
      buffer_zone_meters: ''
    },
    activityLabel: 'Input application',
    dateLabel: 'Apr 22, 2026, 6:30 AM',
    doneBy: '',
    parcelsLabel: 'Ridge Block',
    photoCount: 0
  };

  it('names the product: the first thing a certifier reads on a spray record', () => {
    wrap(<ActivityReview {...spray} onChange={vi.fn()} />);
    expect(screen.getByText('AgriPhage-Fire Blight')).toBeInTheDocument();
    expect(screen.getByText('Fire blight')).toBeInTheDocument();
  });

  it('draws the details as rows, not the grey boxes of the detail view', () => {
    // Read from source: an inline row and a box both hold label and value in one parent, so
    // the DOM cannot tell them apart. The box layout is `<RegistryFieldRenderer>`.
    const src = readFileSync(resolve(__dirname, '../ActivityReview.tsx'), 'utf8');
    expect(src).not.toMatch(/<RegistryFieldRenderer/);
    expect(src).toMatch(/<RegistryRows/);
  });

  it('an empty optional field prints nothing, not its bare unit', () => {
    const { container } = wrap(<ActivityReview {...spray} onChange={vi.fn()} />);
    expect(container.textContent).not.toMatch(/Buffer Zone/);
  });
});
