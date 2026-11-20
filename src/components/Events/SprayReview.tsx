/**
 * The part of "Check before you save" a spray needs beyond product 1's own fields: the other
 * products in the tank and, on several parcels, each product's amount on each parcel, with the
 * number of records the save writes (walkthrough 2026-11-20, W2).
 *
 * The review showed only product 1. A three-product tank on three blocks was confirmed on a screen
 * that named one product and no amount, under "This is the record your certifier will read", and
 * the save wrote nine records. The values come from `tankReview` (config/events/tankMix), built by
 * the save's own builders, so this list is what is sent.
 */
import React from 'react';
import { useIntl } from 'react-intl';
import { Box, Text } from '@chakra-ui/react';
import { FaFlask, FaLeaf, FaMapMarkerAlt, FaRulerHorizontal, FaShieldAlt } from 'react-icons/fa';

import { FieldList, InfoRow } from 'components/Design/ProfileField';
import { ORGANIC_BASES } from 'components/Events/TankMixLines';
import { APPLICATION_RATE_UNIT_SYMBOLS } from 'config/events/enums';
import { UNIT_CODE_SYMBOLS } from 'config/events/formatters';
import type { TankReview } from 'config/events/tankMix';

interface Props {
  review: TankReview;
  /** Product 1's name and unit, as the spray form holds them. */
  firstName: string;
  firstUnit: string;
  /** Parcel id to its name, for the per-parcel list. */
  parcelNames: Record<number, string>;
}

const unitSymbol = (code: string) => UNIT_CODE_SYMBOLS[code] ?? code;

export default function SprayReview({ review, firstName, firstUnit, parcelNames }: Props) {
  const intl = useIntl();
  const { products, parcels, records } = review;
  if (products.length === 0 && parcels.length === 0) return null;

  const basisLabel = (code: string) => {
    const match = ORGANIC_BASES.find(([value]) => value === code);
    return match ? intl.formatMessage({ id: match[1] }) : code;
  };
  const productName = (index: number) =>
    (index === 0 ? firstName : products[index - 1]?.name) ||
    intl.formatMessage({ id: 'events.chemical.tankMix.lineLabel' }, { n: index + 1 });
  const productUnit = (index: number) =>
    unitSymbol(index === 0 ? firstUnit : products[index - 1]?.unit || '');
  const notGiven = intl.formatMessage({ id: 'events.review.notGiven' });

  return (
    <Box data-testid="spray-review">
      {products.length > 0 && (
        <Box mt={4}>
          <Text fontSize="sm" fontWeight="semibold" color="gray.800" mb={1}>
            {intl.formatMessage({ id: 'events.chemical.tankMix.title' })}
          </Text>
          <Text fontSize="sm" color="gray.600" mb={2}>
            {intl.formatMessage({ id: 'events.chemical.tankMix.firstLineNote' })}
          </Text>
          {products.map((product) => (
            <Box key={product.number} mb={3} data-testid="spray-review-product">
              <Text fontSize="sm" fontWeight="medium" color="gray.700">
                {intl.formatMessage(
                  { id: 'events.chemical.tankMix.lineLabel' },
                  { n: product.number }
                )}
              </Text>
              <FieldList>
                <InfoRow
                  icon={FaFlask}
                  layout="inline"
                  label={intl.formatMessage({ id: 'events.chemical.form.commercialName' })}
                  value={product.name || notGiven}
                />
                {product.role === 'adjuvant' && (
                  <InfoRow
                    icon={FaFlask}
                    layout="inline"
                    label={intl.formatMessage({ id: 'events.chemical.tankMix.role' })}
                    value={intl.formatMessage({ id: 'events.chemical.tankMix.roleAdjuvant' })}
                  />
                )}
                {product.amount && (
                  <InfoRow
                    icon={FaRulerHorizontal}
                    layout="inline"
                    label={intl.formatMessage({ id: 'app.volumeApplied' })}
                    value={`${product.amount} ${unitSymbol(product.unit)}`}
                  />
                )}
                {product.rate && (
                  <InfoRow
                    icon={FaRulerHorizontal}
                    layout="inline"
                    label={intl.formatMessage({ id: 'app.applicationRate' })}
                    value={`${product.rate} ${
                      APPLICATION_RATE_UNIT_SYMBOLS[product.rateUnit] ?? product.rateUnit
                    }`}
                  />
                )}
                <InfoRow
                  icon={FaFlask}
                  layout="inline"
                  label={intl.formatMessage({ id: 'app.concentration' })}
                  value={
                    product.concentrationNotRecorded
                      ? intl.formatMessage({ id: 'events.review.tank.notOnRecord' })
                      : product.concentration || notGiven
                  }
                />
                {product.rei && (
                  <InfoRow
                    icon={FaShieldAlt}
                    layout="inline"
                    label={intl.formatMessage({ id: 'events.chemical.form.reiHours' })}
                    value={intl.formatMessage(
                      { id: 'events.review.tank.hours' },
                      { n: Number(product.rei) }
                    )}
                  />
                )}
                {product.phi && (
                  <InfoRow
                    icon={FaShieldAlt}
                    layout="inline"
                    label={intl.formatMessage({ id: 'events.chemical.form.phiDays' })}
                    value={intl.formatMessage(
                      { id: 'events.review.tank.days' },
                      { n: Number(product.phi) }
                    )}
                  />
                )}
                <InfoRow
                  icon={FaLeaf}
                  layout="inline"
                  label={intl.formatMessage({ id: 'app.organicApproved' })}
                  value={
                    product.basis ? (
                      basisLabel(product.basis)
                    ) : (
                      <Text as="span" color="orange.700" data-testid="spray-review-no-basis">
                        {intl.formatMessage({ id: 'events.review.tank.noBasis' })}
                      </Text>
                    )
                  }
                />
              </FieldList>
            </Box>
          ))}
        </Box>
      )}

      {parcels.length > 0 && (
        <Box mt={4}>
          <Text fontSize="sm" fontWeight="semibold" color="gray.800" mb={1}>
            {intl.formatMessage({ id: 'events.review.tank.perParcel' })}
          </Text>
          <FieldList>
            {parcels.map((parcel) => (
              <InfoRow
                key={parcel.parcelId}
                icon={FaMapMarkerAlt}
                layout="inline"
                label={parcelNames[parcel.parcelId] ?? String(parcel.parcelId)}
                value={parcel.amounts
                  .map(
                    (amount, index) =>
                      `${productName(index)} ${
                        amount ? `${amount} ${productUnit(index)}`.trim() : notGiven
                      }`
                  )
                  .join(' · ')}
              />
            ))}
          </FieldList>
        </Box>
      )}

      <Text fontSize="sm" color="gray.700" mt={3} data-testid="spray-review-records">
        {intl.formatMessage(
          {
            id:
              products.length > 0
                ? 'events.review.tank.records'
                : 'events.review.tank.recordsPerParcel'
          },
          { count: records }
        )}
      </Text>
    </Box>
  );
}
