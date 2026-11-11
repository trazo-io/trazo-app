/**
 * Farm home: the farm's parcels, one row each (2026-11-06).
 *
 * Replaces CarouselHorizontal: 310px tiles in a horizontal scroller, each with a 120px image box
 * that showed a leaf placeholder when the parcel had no photo, all-caps "VIEW PARCEL" links, and a
 * green dot beside "Active" for a season underway. On a 20-parcel orchard the scroller showed four
 * and hid the rest. Rows show every parcel, same shape as the seasons and readiness cards above.
 *
 * Per row: name, acres and crop; the parcel application status (answers complete = green, in
 * progress = warning, not started = an action link), the evidence still outstanding (neutral, as
 * before: work remaining, not an error), "Season underway" as plain text, and Open. A photo shows
 * as a small thumbnail only when the parcel has one.
 */
import React, { useMemo } from 'react';
import {
  Badge,
  Box,
  Flex,
  Grid,
  Heading,
  HStack,
  Icon,
  Image,
  Link,
  Text,
  VStack,
  useColorModeValue,
  useDisclosure
} from '@chakra-ui/react';
import { FaMap, FaPlus, FaSeedling } from 'react-icons/fa';
import { Link as RouterLink } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import {
  StandardButton,
  StandardEmptyState,
  StatusList,
  TOUCH_TARGET
} from 'components/Design/StandardComponents';
import { QuickAddParcelModal } from 'components/Parcels/QuickAddParcelModal';
import { useBatchS3Images } from 'hooks/useBatchS3Images';
import { canCreateMore, getLimit } from 'utils/subscriptionLimits';

export interface FarmParcel {
  id: number;
  name: string;
  area?: number | string | null;
  product?: string | null;
  /** What the block grows, also between seasons (server: current, planned, product, latest). */
  crop_names?: string[];
  image?: string | null;
  application_status?: string;
  evidence_status?: string;
  evidence_missing?: unknown[];
  has_current_production?: boolean;
}

interface Props {
  farmId: number;
  parcels?: FarmParcel[];
}

const HA_TO_AC = 2.47105;
const linkSx = { '@media (hover: hover)': { '&:hover': { textDecoration: 'underline' } } };

export default function FarmParcelsCard({ farmId, parcels = [] }: Props) {
  const intl = useIntl();
  const quickAdd = useDisclosure();
  const titleColor = useColorModeValue('gray.700', 'gray.200');
  const iconColor = useColorModeValue('gray.600', 'gray.400');
  // gray.600, not gray.500: acres and crop are read on a phone outdoors, at 12px.
  const muted = useColorModeValue('gray.600', 'gray.400');
  const company = useSelector((state: any) => state.company?.currentCompany);

  // Same gate the "+ New" tile used (utils/subscriptionLimits): a button the server would refuse
  // is a dead end of its own. Legacy plans carried a company-wide cap instead of a per-farm one.
  const canCreateParcel = useMemo(() => {
    if (!company || !farmId) return false;
    if (getLimit(company, 'max_parcels_per_establishment') !== undefined) {
      return canCreateMore(company, 'max_parcels_per_establishment', parcels.length);
    }
    const total = (company.establishments || []).reduce(
      (sum: number, est: { parcels?: unknown[] }) => sum + (est.parcels?.length || 0),
      0
    );
    return canCreateMore(company, 'max_parcels', total);
  }, [company, farmId, parcels.length]);

  const imageUrls = useMemo(
    () => parcels.map((p) => p.image).filter((u): u is string => Boolean(u)),
    [parcels]
  );
  const { presignedUrls } = useBatchS3Images({
    s3Urls: imageUrls,
    enabled: imageUrls.length > 0
  });
  const photoFor = (p: FarmParcel) => {
    if (!p.image) return null;
    if (presignedUrls[p.image]) return presignedUrls[p.image];
    return /^https?:\/\//.test(p.image) ? p.image : null;
  };

  const acres = (area: FarmParcel['area']) =>
    area != null && area !== '' && !Number.isNaN(Number(area)) ? Number(area) * HA_TO_AC : null;
  const totalAcres = parcels.reduce((sum, p) => sum + (acres(p.area) ?? 0), 0);

  const base = `/admin/dashboard/farm/${farmId}/parcel`;

  return (
    <Card>
      <CardBody>
        <VStack align="stretch" spacing={2} w="100%">
          <Flex justify="space-between" align="flex-start" gap={3}>
            <HStack spacing={3} align="start" minW={0}>
              <Icon as={FaMap} color={iconColor} boxSize={5} mt={1} aria-hidden />
              <VStack align="start" spacing={0} minW={0}>
                <Heading as="h3" size="sm" fontWeight="600" color={titleColor}>
                  {intl.formatMessage({ id: 'app.parcels' })}
                </Heading>
                {parcels.length > 0 && (
                  <Text fontSize="xs" color={muted}>
                    {intl.formatMessage(
                      { id: 'farmHome.parcels.summary' },
                      {
                        count: parcels.length,
                        acres: intl.formatNumber(totalAcres, { maximumFractionDigits: 1 })
                      }
                    )}
                  </Text>
                )}
              </VStack>
            </HStack>
            {canCreateParcel && parcels.length > 0 && (
              <StandardButton
                variant="outline"
                size="sm"
                leftIcon={<FaPlus aria-hidden />}
                onClick={quickAdd.onOpen}>
                {intl.formatMessage({ id: 'farmHome.parcels.new' })}
              </StandardButton>
            )}
          </Flex>

          {parcels.length === 0 ? (
            <StandardEmptyState
              icon={FaSeedling}
              title={intl.formatMessage({ id: 'app.noParcelsYet' })}
              description={intl.formatMessage({ id: 'app.noParcelsYetDescription' })}
              action={
                canCreateParcel ? (
                  <StandardButton leftIcon={<FaPlus />} onClick={quickAdd.onOpen}>
                    {intl.formatMessage({ id: 'app.addFirstParcel' })}
                  </StandardButton>
                ) : undefined
              }
            />
          ) : (
            <StatusList testId="farm-parcels">
              {parcels.map((p) => {
                const photo = photoFor(p);
                const ac = acres(p.area);
                const meta = [
                  ac != null
                    ? intl.formatMessage({ id: 'parcel.card.acres' }, { count: ac.toFixed(1) })
                    : null,
                  // `crop_names`, not `product`: `product` is the CURRENT season's crop, so a
                  // block whose season had just finished printed acres and no crop (2026-11-11).
                  p.crop_names?.length
                    ? new Intl.ListFormat(intl.locale, { style: 'long', type: 'conjunction' }).format(
                        p.crop_names
                      )
                    : p.product || null
                ].filter(Boolean);
                const missing = (p.evidence_missing || []).length;
                return (
                  // A three-column grid from md: name | status | Open. The status column starts at
                  // the same x on every row, so the statuses read down as a column instead of
                  // floating at the far right of a 1,400px row, ~1,000px from the parcel they
                  // describe (wide-screen review, 2026-11-06). On a phone: name and Open on one
                  // line, statuses under the name.
                  <Grid
                    key={p.id}
                    py={3}
                    columnGap={6}
                    rowGap={1.5}
                    alignItems="center"
                    templateColumns={{
                      base: 'minmax(0, 1fr) auto',
                      md: 'minmax(180px, 320px) minmax(0, 1fr) auto'
                    }}
                    templateAreas={{
                      base: '"name open" "status open"',
                      md: '"name status open"'
                    }}
                    data-testid="farm-parcel-row">
                    <HStack gridArea="name" spacing={3} minW={0} align="center">
                      {photo && (
                        <Image
                          src={photo}
                          alt=""
                          boxSize="40px"
                          borderRadius="md"
                          objectFit="cover"
                          flexShrink={0}
                        />
                      )}
                      <Box minW={0}>
                        <Text fontSize="sm" fontWeight="semibold" color={titleColor} noOfLines={1}>
                          {p.name}
                        </Text>
                        {meta.length > 0 && (
                          <Text fontSize="xs" color={muted}>
                            {meta.join(' · ')}
                          </Text>
                        )}
                      </Box>
                    </HStack>

                    <HStack gridArea="status" spacing={3} flexWrap="wrap" rowGap={1} minW={0}>
                      {p.application_status === 'complete' && (
                        // Done is quiet (green tint), the work left is what draws the eye. A solid
                        // green "done" chip was the loudest thing on every row next to a pale
                        // orange "in progress": the attention pointed at the wrong rows.
                        <Badge variant="subtle" colorScheme="green" fontSize="11px">
                          {intl.formatMessage({ id: 'parcel.card.appAnswersComplete' })}
                        </Badge>
                      )}
                      {/* The evidence half, always with the answers half when outstanding: a ✓
                          on the answers alone is the badge that printed above "[REVIEW] no
                          operator map attached" in the certifier packet. */}
                      {p.application_status === 'complete' &&
                        p.evidence_status === 'outstanding' && (
                          <Badge variant="neutral" fontSize="11px">
                            {intl.formatMessage(
                              { id: 'parcel.card.evidenceOutstanding' },
                              { count: missing || 1 }
                            )}
                          </Badge>
                        )}
                      {p.application_status === 'in_progress' && (
                        <Badge variant="warning" fontSize="11px">
                          {intl.formatMessage({ id: 'parcel.card.appInProgress' })}
                        </Badge>
                      )}
                      {p.application_status === 'not_started' && (
                        <Link
                          as={RouterLink}
                          to={`${base}/${p.id}/application`}
                          fontSize="xs"
                          fontWeight="semibold"
                          color="green.700"
                          sx={linkSx}
                          {...TOUCH_TARGET}>
                          {intl.formatMessage({ id: 'farmHome.parcels.startApplication' })}
                        </Link>
                      )}
                      {/* A fact, not a verdict: plain text, no green dot (2026-11-06). */}
                      {p.has_current_production && (
                        <Text fontSize="xs" color={muted}>
                          {intl.formatMessage({ id: 'farmHome.parcels.seasonUnderway' })}
                        </Text>
                      )}
                    </HStack>

                    <Link
                      gridArea="open"
                      justifySelf="end"
                      as={RouterLink}
                      to={`${base}/${p.id}`}
                      fontSize="sm"
                      fontWeight="semibold"
                      color="green.700"
                      flexShrink={0}
                      sx={linkSx}
                      aria-label={intl.formatMessage(
                        { id: 'farmHome.parcels.openLabel' },
                        { name: p.name }
                      )}
                      {...TOUCH_TARGET}>
                      {intl.formatMessage({ id: 'farmHome.seasons.open' })}
                    </Link>
                  </Grid>
                );
              })}
            </StatusList>
          )}
        </VStack>
      </CardBody>

      {company?.id && farmId && (
        <QuickAddParcelModal
          isOpen={quickAdd.isOpen}
          onClose={quickAdd.onClose}
          companyId={company.id}
          farmId={String(farmId)}
        />
      )}
    </Card>
  );
}
