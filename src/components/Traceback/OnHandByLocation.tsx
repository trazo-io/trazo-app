/**
 * Recorded harvested minus recorded sold, per storage location, for the traced season.
 *
 * Backend: history/services/storage_on_hand.py. A number on screen is a claim, so:
 * - It is labelled "recorded harvested minus recorded sold", never "inventory" or "on hand": nobody
 *   counted the cooler, and losses, culls and repacks are not recorded.
 * - A location whose records mix units, or carry no quantity or no unit, shows no number, only
 *   why (the server's code, translated here).
 * - A sale that names picks in several locations, or names no pick, is subtracted from none and
 *   listed apart with the locations it names. The records do not say how a load split.
 * - Counts only. No total across locations, no percentage, no grade.
 */
import React from 'react';
import { Box, Text, VStack } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import { StandardCard, StatusList } from 'components/Design/StandardComponents';

export type OnHandLocation = {
  location: string;
  location_recorded: boolean;
  pick_count: number;
  sale_count: number;
  harvested: string;
  packed_out: string;
  sold: string;
  difference: string;
  not_computed: boolean;
  not_computed_code: string;
  units: string[];
  sold_not_organic_count: number;
  sold_not_organic: string;
};

export type OnHandSale = {
  sale_id: number;
  date: string;
  buyer: string;
  quantity: string;
  invoice: string;
  reason: 'names_no_pick' | 'several_locations';
  locations: string[];
};

export type OnHand = {
  locations: OnHandLocation[];
  unallocated_sales: OnHandSale[];
  season_open: boolean;
};

const Line = ({ label, value }: { label: string; value?: string }) =>
  value ? (
    <Text fontSize="sm">
      <Text as="span" color="gray.600">
        {label}:{' '}
      </Text>
      {value}
    </Text>
  ) : null;

export const OnHandByLocation = ({ onHand }: { onHand: OnHand }) => {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);
  const place = (location: string) => location || t('traceback.onHand.notRecorded');
  const units = (list: string[]) => list.map((u) => u || t('traceback.onHand.noUnit')).join(', ');

  return (
    <StandardCard title={t('traceback.onHand.title')} subtitle={t('traceback.onHand.subtitle')}>
      {onHand.season_open && (
        <Text fontSize="sm" mb={2} color="gray.600">
          {t('traceback.balance.seasonOpen')}
        </Text>
      )}
      {onHand.locations.length === 0 ? (
        <Text fontSize="sm">{t('traceback.picks.none')}</Text>
      ) : (
        <StatusList>
          {onHand.locations.map((row) => (
            <Box key={row.location || '__not_recorded__'} py={3} data-testid="on-hand-location">
              <Text fontWeight="semibold">{place(row.location)}</Text>
              <Text fontSize="sm" color="gray.600">
                {[
                  t('traceback.onHand.picks', { count: row.pick_count }),
                  t('traceback.onHand.sales', { count: row.sale_count })
                ].join(' · ')}
              </Text>
              {row.not_computed ? (
                <Text fontSize="sm" mt={1}>
                  {t(`traceback.onHand.notComputed.${row.not_computed_code}`, {
                    units: units(row.units)
                  })}
                </Text>
              ) : (
                <Box mt={1}>
                  <Line label={t('traceback.onHand.harvested')} value={row.harvested} />
                  <Line label={t('traceback.balance.packedOut')} value={row.packed_out} />
                  <Line label={t('traceback.onHand.sold')} value={row.sold} />
                  <Line label={t('traceback.onHand.difference')} value={row.difference} />
                </Box>
              )}
              {row.sold_not_organic_count > 0 && (
                <Text fontSize="sm" mt={1} color="gray.600">
                  {row.sold_not_organic
                    ? t('traceback.balance.soldNotOrganic', {
                        quantity: row.sold_not_organic,
                        count: row.sold_not_organic_count
                      })
                    : t('traceback.balance.soldNotOrganicCount', {
                        count: row.sold_not_organic_count
                      })}
                </Text>
              )}
            </Box>
          ))}
        </StatusList>
      )}
      {onHand.unallocated_sales.length > 0 && (
        <Box mt={4}>
          <Text fontWeight="semibold" fontSize="sm" mb={2}>
            {t('traceback.onHand.unallocatedTitle')}
          </Text>
          <VStack align="stretch" spacing={1} data-testid="on-hand-unallocated">
            {onHand.unallocated_sales.map((s) => (
              <Text key={s.sale_id} fontSize="sm">
                {[s.date, s.buyer, s.quantity, s.invoice].filter(Boolean).join(' · ')}
                {': '}
                {t(`traceback.onHand.unallocated.${s.reason}`, {
                  locations: s.locations.map(place).join(', ')
                })}
              </Text>
            ))}
          </VStack>
        </Box>
      )}
    </StandardCard>
  );
};

export default OnHandByLocation;
