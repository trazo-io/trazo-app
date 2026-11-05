/**
 * Farm home: the seasons with no finish date yet, one row each, with the two things to do with
 * one: open it, or finish it. A season has to be finished before the certifier packet covers it,
 * so this is the list that moves the renewal forward (2026-11-05).
 *
 * Plain rows split by hairlines (StatusList). No colour: a season underway is a fact, not a
 * warning.
 */
import React from 'react';
import {
  Box,
  Flex,
  Heading,
  HStack,
  Icon,
  Link,
  Spinner,
  Text,
  VStack,
  useColorModeValue
} from '@chakra-ui/react';
import { FaSeedling } from 'react-icons/fa';
import { Link as RouterLink } from 'react-router-dom';
import { useIntl } from 'react-intl';

import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import { StatusList, TOUCH_TARGET } from 'components/Design/StandardComponents';
import { useGetFarmProductionsQuery } from 'store/api/historyApi';

interface Season {
  id: number;
  public_id?: string;
  name?: string;
  parcel?: string | null;
  parcel_id?: number | null;
  start_date?: string | null;
  finish_date?: string | null;
  events_count?: number;
  crop_type?: { name?: string } | null;
  product?: { name?: string } | string | null;
}

interface Props {
  farmId: number;
  /** Parcel name -> id, from the establishment already in the store. */
  parcels?: Array<{ id: number; name: string }>;
}

const rowLinkSx = { '@media (hover: hover)': { '&:hover': { textDecoration: 'underline' } } };

export default function SeasonsUnderwayCard({ farmId, parcels = [] }: Props) {
  const intl = useIntl();
  const titleColor = useColorModeValue('gray.700', 'gray.200');
  const iconColor = useColorModeValue('gray.600', 'gray.400');
  const muted = useColorModeValue('gray.500', 'gray.400');
  const { data, isLoading } = useGetFarmProductionsQuery(farmId, { skip: !farmId });

  const underway: Season[] = ((data as Season[]) || [])
    .filter((s) => !s.finish_date)
    .sort((a, b) => String(a.start_date ?? '').localeCompare(String(b.start_date ?? '')));
  const parcelIdByName = new Map(parcels.map((p) => [p.name, p.id]));

  const crop = (s: Season) =>
    s.crop_type?.name || (typeof s.product === 'string' ? s.product : s.product?.name) || null;

  return (
    <Card>
      <CardBody>
        <VStack align="stretch" spacing={2} w="100%">
          <HStack spacing={3} align="start">
            <Icon as={FaSeedling} color={iconColor} boxSize={5} mt={1} aria-hidden />
            <VStack align="start" spacing={0}>
              <Heading as="h3" size="sm" fontWeight="600" color={titleColor}>
                {intl.formatMessage({ id: 'farmHome.seasons.title' })}
              </Heading>
              <Text fontSize="xs" color={muted}>
                {intl.formatMessage({ id: 'farmHome.seasons.subtitle' })}
              </Text>
            </VStack>
          </HStack>

          {isLoading ? (
            <Flex justify="center" py={6}>
              <Spinner color="gray.400" />
            </Flex>
          ) : underway.length === 0 ? (
            <Text fontSize="sm" color={muted} py={2}>
              {intl.formatMessage({ id: 'farmHome.seasons.none' })}
            </Text>
          ) : (
            <StatusList testId="seasons-underway">
              {underway.map((s) => {
                const parcelId = s.parcel_id ?? (s.parcel ? parcelIdByName.get(s.parcel) : null);
                const base = parcelId
                  ? `/admin/dashboard/farm/${farmId}/parcel/${parcelId}/production/${s.id}`
                  : null;
                // Season names are often "Onions 2026 — Upper Terrace": say the parcel and crop
                // only when the name does not already.
                const named = (s.name || '').toLowerCase();
                const unless = (v: string | null | undefined) =>
                  v && !named.includes(v.toLowerCase()) ? v : null;
                const meta = [
                  unless(s.parcel),
                  unless(crop(s)),
                  s.start_date
                    ? intl.formatMessage(
                        { id: 'farmHome.seasons.started' },
                        {
                          date: intl.formatDate(s.start_date, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        }
                      )
                    : null,
                  intl.formatMessage(
                    { id: 'farmHome.seasons.activities' },
                    { count: s.events_count ?? 0 }
                  )
                ].filter(Boolean);
                return (
                  <Flex
                    key={s.id}
                    py={3}
                    gap={4}
                    justify="space-between"
                    align={{ base: 'flex-start', md: 'center' }}
                    direction={{ base: 'column', md: 'row' }}
                    data-testid="season-underway-row">
                    <Box minW={0}>
                      <Text fontSize="sm" fontWeight="semibold" color={titleColor}>
                        {s.name || intl.formatMessage({ id: 'farmHome.seasons.untitled' })}
                      </Text>
                      <Text fontSize="xs" color={muted}>
                        {meta.join(' · ')}
                      </Text>
                    </Box>
                    {base && (
                      <HStack spacing={5} flexShrink={0}>
                        <Link
                          as={RouterLink}
                          to={base}
                          fontSize="sm"
                          fontWeight="semibold"
                          color="green.700"
                          sx={rowLinkSx}
                          {...TOUCH_TARGET}>
                          {intl.formatMessage({ id: 'farmHome.seasons.open' })}
                        </Link>
                        <Link
                          as={RouterLink}
                          to={`${base}/finish`}
                          fontSize="sm"
                          fontWeight="semibold"
                          color="green.700"
                          sx={rowLinkSx}
                          {...TOUCH_TARGET}>
                          {intl.formatMessage({ id: 'farmHome.seasons.finish' })}{' '}
                          <span aria-hidden="true">→</span>
                        </Link>
                      </HStack>
                    )}
                  </Flex>
                );
              })}
            </StatusList>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
}
