/**
 * "Check before you save" shows the whole tank and every parcel's amount (walkthrough 2026-11-20, W2).
 *
 * The review read only the form's top-level values. A tank of Cyd-X, Entrust SC and JMS Stylet-Oil
 * on three blocks was confirmed on a screen that named Cyd-X alone, with no amount, under "This is
 * the record your certifier will read"; the save then wrote nine records, Entrust SC among them
 * with no organic basis, which the packet later printed as "organic status not recorded".
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';
import ActivityReview from '../ActivityReview';
import SprayReview from '../SprayReview';
import { newTankLine, tankReview, type TankReview } from '../../../config/events/tankMix';

const wrap = (ui: React.ReactElement, locale = 'en-US') =>
  render(
    <ChakraProvider>
      <IntlProvider
        locale={locale}
        messages={(locale === 'en-US' ? enUS : es419) as Record<string, string>}>
        {ui}
      </IntlProvider>
    </ChakraProvider>
  );

const lines = [
  {
    ...newTankLine('product', 'fl_oz'),
    commercial_name: 'Entrust SC',
    concentration: '22.5%',
    application_rate: '6',
    application_rate_unit: 'fl_oz_ac',
    rei_hours: '4',
    phi_days: '7',
    organic_approved: ''
  },
  {
    ...newTankLine('product', 'gal'),
    commercial_name: 'JMS Stylet-Oil',
    concentration_not_recorded: 'true',
    application_rate: '1',
    application_rate_unit: 'gal_ac',
    rei_hours: '4',
    phi_days: '0',
    organic_approved: 'omri_listed'
  }
];

// The amounts as `buildMultiTargetBody` makes them for 12.5, 8 and 21.6 acres.
const multiBody = {
  targets: [
    {
      parcel: 1,
      volume_applied: '37.5',
      [`tank_line_${lines[0].uid}_volume`]: '75',
      [`tank_line_${lines[1].uid}_volume`]: '12.5'
    },
    {
      parcel: 2,
      volume_applied: '24',
      [`tank_line_${lines[0].uid}_volume`]: '48',
      [`tank_line_${lines[1].uid}_volume`]: '8'
    },
    {
      parcel: 3,
      volume_applied: '64.8',
      [`tank_line_${lines[0].uid}_volume`]: '129.6',
      [`tank_line_${lines[1].uid}_volume`]: '21.6'
    }
  ]
};

const parcelNames = { 1: 'Block 1 Gala', 2: 'Block 2 Gala', 3: 'Block 3 Honeycrisp' };

const reviewOf = (review: TankReview, locale = 'en-US') =>
  wrap(
    <ActivityReview
      eventType={2}
      record={{ type: 'PE', commercial_name: 'Cyd-X', volume_unit: 'fl_oz' }}
      activityLabel="Input application"
      dateLabel="May 29, 2026, 7:00 AM"
      doneBy="Rafa"
      parcelsLabel="Block 1 Gala, Block 2 Gala, and Block 3 Honeycrisp"
      photoCount={0}
      onChange={vi.fn()}>
      <SprayReview review={review} firstName="Cyd-X" firstUnit="fl_oz" parcelNames={parcelNames} />
    </ActivityReview>,
    locale
  );

describe('the review of a tank on several parcels', () => {
  const review = tankReview({ lines, multiBody });

  it('names every product in the tank, not only the first', () => {
    reviewOf(review);
    const products = screen.getAllByTestId('spray-review-product');
    expect(products).toHaveLength(2);
    expect(within(products[0]).getByText('Entrust SC')).toBeInTheDocument();
    expect(within(products[0]).getByText('6 fl oz/ac')).toBeInTheDocument();
    expect(within(products[0]).getByText('22.5%')).toBeInTheDocument();
    expect(within(products[0]).getByText('7 days')).toBeInTheDocument();
    expect(within(products[1]).getByText('JMS Stylet-Oil')).toBeInTheDocument();
    expect(within(products[1]).getByText('Not on the source record')).toBeInTheDocument();
    expect(within(products[1]).getByText('OMRI Listed')).toBeInTheDocument();
  });

  it('says which product has no organic basis before it is saved', () => {
    reviewOf(review);
    const [entrust, stylet] = screen.getAllByTestId('spray-review-product');
    expect(within(entrust).getByTestId('spray-review-no-basis')).toHaveTextContent(
      'organic status not recorded'
    );
    expect(within(stylet).queryByTestId('spray-review-no-basis')).toBeNull();
  });

  it("lists each parcel's amount of each product, and how many records the save writes", () => {
    reviewOf(review);
    expect(
      screen.getByText('Cyd-X 37.5 fl oz · Entrust SC 75 fl oz · JMS Stylet-Oil 12.5 gal')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Cyd-X 64.8 fl oz · Entrust SC 129.6 fl oz · JMS Stylet-Oil 21.6 gal')
    ).toBeInTheDocument();
    expect(screen.getByText('Block 3 Honeycrisp')).toBeInTheDocument();
    expect(screen.getByTestId('spray-review-records')).toHaveTextContent(
      'Saves as 9 records, one per product and parcel'
    );
  });

  it('reads in Spanish', () => {
    reviewOf(review, 'es-419');
    expect(screen.getByText('Cantidad en cada parcela')).toBeInTheDocument();
    expect(screen.getByTestId('spray-review-records')).toHaveTextContent(
      'Se guarda como 9 registros, uno por producto y parcela'
    );
    expect(screen.getByText('No consta en el registro de origen')).toBeInTheDocument();
  });
});

describe('a review with nothing beyond the record', () => {
  it('a one-product spray on one parcel adds nothing to the review', () => {
    const { container } = wrap(
      <SprayReview
        review={tankReview({ lines: [], multiBody: null })}
        firstName="Cyd-X"
        firstUnit="fl_oz"
        parcelNames={{}}
      />
    );
    expect(container.textContent).toBe('');
  });

  it('one product on several parcels lists each parcel, one record each', () => {
    reviewOf(
      tankReview({
        lines: [],
        multiBody: {
          targets: [
            { parcel: 1, volume_applied: '37.5' },
            { parcel: 2, volume_applied: '24' }
          ]
        }
      })
    );
    expect(screen.queryAllByTestId('spray-review-product')).toHaveLength(0);
    expect(screen.getByText('Cyd-X 37.5 fl oz')).toBeInTheDocument();
    expect(screen.getByTestId('spray-review-records')).toHaveTextContent(
      'Saves as 2 records, one per parcel'
    );
  });
});
