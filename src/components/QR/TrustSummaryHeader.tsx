/**
 * TrustSummaryHeader — 4-pillar trust strip for the consumer QR scan page.
 *
 * Answers the four shopper questions above-the-fold (Origin / Practices /
 * Documentation / Records) so consumers don't have to scroll the timeline
 * before forming a trust judgment. Each pillar degrades gracefully when its
 * primary data is missing — no fake green badges, no fabricated claims.
 *
 * FTC compliance:
 *  - 16 CFR 260.6(d): every certification claim has documented basis.
 *  - 7 CFR 205.311: USDA Organic seal rendered unmodified, only when the
 *    cert has an OID-database match.
 *  - The `self_reported` organic_claim status maps to "Conventional,
 *    Documented" — we do not invent a fourth state that implies organic
 *    without third-party evidence (a farmer-picked dropdown is not a basis
 *    for a sustainability seal claim).
 *
 * USDA Organic seal usage rests on nominative fair use:
 *   1. Product not identifiable without the mark.
 *   2. Use only as much as reasonably necessary (small, unmodified).
 *   3. Does not suggest sponsorship — explicit disclaimer reachable via the
 *      info icon next to the seal.
 *
 * See `/Users/oscarmunoz/.claude/plans/i-had-this-feedback-parsed-wirth.md`
 * for the full rationale.
 */

import React from 'react';
import { useIntl } from 'react-intl';
import type { IntlShape } from 'react-intl';
import {
  Box,
  Container,
  HStack,
  Icon,
  Image,
  Link,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  SimpleGrid,
  Skeleton,
  Text,
  VStack
} from '@chakra-ui/react';
import {
  FaCertificate,
  FaClipboardCheck,
  FaInfoCircle,
  FaLeaf,
  FaMapMarkerAlt,
  FaSeedling,
  FaShieldAlt
} from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { formatHarvestDate } from 'utils/consumerDisplay';
import type { ConsumerCertification, OrganicClaim } from 'types/certification';

export interface TrustSummaryHeaderProps {
  productName?: string;
  farmName?: string;
  location?: string;
  harvestDate?: string;
  lotId?: string;
  organicClaim?: OrganicClaim | null;
  certifications?: ConsumerCertification[];
  transparencyScore?: number | null;
  documentedEventsCount?: number;
  expectedEventsCount?: number;
  blockchainStatus?: 'verified' | 'submitted' | 'pending' | 'tampered' | null;
  totalPhotoEvidenceCount?: number;
  onMethodologyClick?: () => void;
  isLoading?: boolean;
}

type PillarTone = 'verified' | 'progress' | 'documented' | 'limited' | 'records';

interface PillarData {
  pillarName: string;
  pillarIcon: IconType;
  badgeLabel: string;
  badgeSublabel?: string;
  tooltipExplainer: string;
  tone: PillarTone;
  showUsdaSeal?: boolean;
  usdaSealCertifierName?: string;
}

const TONE_STYLES: Record<
  PillarTone,
  { bg: string; border: string; badgeColor: string; iconColor: string }
> = {
  verified: { bg: 'green.50', border: 'green.200', badgeColor: 'green', iconColor: 'green.600' },
  progress: {
    bg: 'yellow.50',
    border: 'yellow.200',
    badgeColor: 'yellow',
    iconColor: 'yellow.600'
  },
  documented: { bg: 'gray.50', border: 'gray.200', badgeColor: 'gray', iconColor: 'gray.600' },
  limited: { bg: 'gray.50', border: 'gray.300', badgeColor: 'gray', iconColor: 'gray.500' },
  records: { bg: 'purple.50', border: 'purple.200', badgeColor: 'purple', iconColor: 'purple.600' }
};

/**
 * ORIGIN pillar — answers "Where did this come from?"
 * Hide when no farm name available (anything else is misleading).
 */
function buildOriginPillar(props: TrustSummaryHeaderProps, intl: IntlShape): PillarData | null {
  const { farmName, location } = props;
  if (!farmName) return null;

  const baseTooltip = intl.formatMessage({
    id: 'consumer.trust.originTooltip',
    defaultMessage:
      'This product is traceable to a specific farm and harvest period. Every event below is tied to this production batch.'
  });

  // Batch identity (lot/harvest) is owned by the HARVEST pillar — the old
  // harvestDate-dependent "Lot tracked" variant duplicated it here.
  if (location) {
    return {
      pillarName: intl.formatMessage({ id: 'consumer.trust.pillarOrigin', defaultMessage: 'ORIGIN' }),
      pillarIcon: FaMapMarkerAlt,
      badgeLabel: intl.formatMessage({
        id: 'consumer.trust.farmTracked',
        defaultMessage: 'Farm tracked'
      }),
      badgeSublabel: location,
      tooltipExplainer: baseTooltip,
      tone: 'verified'
    };
  }
  return {
    pillarName: intl.formatMessage({ id: 'consumer.trust.pillarOrigin', defaultMessage: 'ORIGIN' }),
    pillarIcon: FaMapMarkerAlt,
    badgeLabel: intl.formatMessage({
      id: 'consumer.trust.originDisclosed',
      defaultMessage: 'Origin disclosed'
    }),
    badgeSublabel: farmName,
    tooltipExplainer: baseTooltip,
    tone: 'documented'
  };
}

/**
 * PRACTICES pillar — answers "How was this grown?"
 *
 * Crucially: `self_reported` and `conventional` BOTH map to
 * "Conventional, Documented." We do not surface a self-reported organic
 * claim as a trust signal — the `self_reported` state is derived purely
 * from the farmer's dropdown choice with no validation gate. Per FTC 16
 * CFR 260.6(d), surfacing it would imply third-party verification that
 * does not exist.
 *
 * Hide when no events have been documented (nothing meaningful to say).
 */
function buildPracticesPillar(props: TrustSummaryHeaderProps, intl: IntlShape): PillarData | null {
  const { organicClaim, certifications, documentedEventsCount } = props;
  if (!documentedEventsCount || documentedEventsCount === 0) return null;

  const tooltipExplainer = intl.formatMessage({
    id: 'consumer.trust.practicesTooltip',
    defaultMessage:
      "We label this based on what's verified, not what's claimed. 'Certified Organic' requires a USDA Organic Integrity Database match; 'Transitioning' requires documented transition records; otherwise we report this as 'Conventional, Documented' regardless of farmer-picked labels."
  });

  // Phase 3 lot gate: can_display_organic goes false when THIS lot is
  // ineligible (prohibited input, cert window, crop scope) even on a
  // certified farm. The pillar then falls through to the documented state;
  // the nuanced "farm certified, this lot…" message lives in the
  // Certifications card (OrganicClaimBadge), not in a 3-word pillar.
  if (organicClaim?.status === 'certified_organic' && organicClaim?.can_display_organic !== false) {
    const oidMatchedCert = (certifications ?? []).find((c) => c.status === 'verified_via_database');
    const certifierName = oidMatchedCert?.certifier_name;
    const showUsdaSeal = Boolean(oidMatchedCert);

    return {
      pillarName: intl.formatMessage({
        id: 'consumer.trust.pillarPractices',
        defaultMessage: 'PRACTICES'
      }),
      pillarIcon: FaLeaf,
      badgeLabel: intl.formatMessage({
        id: 'consumer.trust.certifiedOrganic',
        defaultMessage: 'Certified Organic'
      }),
      // Short certifier name — "via CCOF (California Certified Organic
      // Farm…" truncated mid-word in the pillar. Full legal name lives in
      // the Certifications card.
      badgeSublabel: certifierName
        ? intl.formatMessage(
            { id: 'consumer.trust.viaCertifier', defaultMessage: 'via {certifier}' },
            { certifier: certifierName.split(' (')[0] }
          )
        : intl.formatMessage({
            id: 'consumer.trust.viaUsdaAccredited',
            defaultMessage: 'via USDA-accredited certifier'
          }),
      tooltipExplainer,
      tone: 'verified',
      showUsdaSeal,
      usdaSealCertifierName: certifierName
    };
  }

  if (organicClaim?.status === 'transitioning') {
    return {
      pillarName: intl.formatMessage({
        id: 'consumer.trust.pillarPractices',
        defaultMessage: 'PRACTICES'
      }),
      pillarIcon: FaSeedling,
      badgeLabel: intl.formatMessage({
        id: 'consumer.trust.transitioningToOrganic',
        defaultMessage: 'Transitioning to Organic'
      }),
      badgeSublabel: intl.formatMessage({
        id: 'consumer.trust.transitionInProgress',
        defaultMessage: '3-year transition in progress'
      }),
      tooltipExplainer,
      tone: 'progress'
    };
  }

  // self_reported and conventional both fall through here — we do not invent
  // a fourth state that implies organic without third-party evidence.
  return {
    pillarName: intl.formatMessage({
      id: 'consumer.trust.pillarPractices',
      defaultMessage: 'PRACTICES'
    }),
    pillarIcon: FaCertificate,
    badgeLabel: intl.formatMessage({
      id: 'consumer.trust.conventionalDocumented',
      defaultMessage: 'Conventional, Documented'
    }),
    badgeSublabel: intl.formatMessage({
      id: 'consumer.trust.practiceRecordsOnFile',
      defaultMessage: 'Practice records on file'
    }),
    tooltipExplainer,
    tone: 'documented'
  };
}

/**
 * EVENTS pillar — answers "How thoroughly was this documented?"
 *
 * Renamed from DOCUMENTATION to EVENTS in the 2026 hero redesign: the
 * percentage score now lives in the hero badge (CarbonHeroSection). This
 * pillar surfaces the underlying *fraction* (e.g. "13 of 13") which gives
 * different, complementary information — fractions communicate
 * completeness/transparency; the hero score communicates verdict.
 *
 * Always renders — falls back to "Limited Data" when no events on file.
 */
function buildEventsPillar(props: TrustSummaryHeaderProps, intl: IntlShape): PillarData | null {
  const { transparencyScore, documentedEventsCount = 0, expectedEventsCount, productName } = props;

  if (transparencyScore == null && documentedEventsCount === 0) {
    return {
      pillarName: intl.formatMessage({ id: 'consumer.trust.pillarEvents', defaultMessage: 'EVENTS' }),
      pillarIcon: FaClipboardCheck,
      badgeLabel: intl.formatMessage({
        id: 'consumer.trust.limitedData',
        defaultMessage: 'Limited Data'
      }),
      tooltipExplainer: intl.formatMessage({
        id: 'consumer.trust.limitedDataTooltip',
        defaultMessage: 'Documentation data is being collected for this production.'
      }),
      tone: 'limited'
    };
  }

  const score = transparencyScore != null ? Math.round(transparencyScore) : null;
  let tone: PillarTone = 'documented';
  if (score != null) {
    if (score >= 70) tone = 'verified';
    else if (score >= 50) tone = 'progress';
  } else if (documentedEventsCount > 0) {
    tone = 'documented';
  }

  // Display rules:
  // - When actual < expected: "12 of 13" (transparency about completeness)
  // - When actual >= expected: just "13 events" (fraction reads odd as "23 of 9")
  // - When no expected count: plain count
  const showFraction = expectedEventsCount != null && documentedEventsCount < expectedEventsCount;
  const badgeLabel = showFraction
    ? intl.formatMessage(
        { id: 'consumer.trust.eventsFraction', defaultMessage: '{count} of {expected}' },
        { count: documentedEventsCount, expected: expectedEventsCount }
      )
    : intl.formatMessage(
        {
          id: 'consumer.trust.eventsCount',
          defaultMessage: '{count} {count, plural, one {event} other {events}}'
        },
        { count: documentedEventsCount }
      );

  const productPhrase = productName
    ? intl.formatMessage(
        { id: 'consumer.trust.thisNamedProduction', defaultMessage: 'this {productName} production' },
        { productName }
      )
    : intl.formatMessage({
        id: 'consumer.trust.thisProduction',
        defaultMessage: 'this production'
      });
  const tooltipExplainer = showFraction
    ? intl.formatMessage(
        {
          id: 'consumer.trust.eventsFractionTooltip',
          defaultMessage:
            '{count} of {expected} expected farming practices documented for {productPhrase}{scoreSuffix}.'
        },
        {
          count: documentedEventsCount,
          expected: expectedEventsCount,
          productPhrase,
          scoreSuffix:
            score != null
              ? intl.formatMessage(
                  {
                    id: 'consumer.trust.eventsScoreSuffix',
                    defaultMessage: ' ({score}% complete)'
                  },
                  { score }
                )
              : ''
        }
      )
    : expectedEventsCount != null
    ? intl.formatMessage(
        {
          id: 'consumer.trust.eventsExceedsTooltip',
          defaultMessage:
            '{count} farming {count, plural, one {event} other {events}} documented for {productPhrase} — exceeds the {expected}-event baseline for this crop.'
        },
        { count: documentedEventsCount, expected: expectedEventsCount, productPhrase }
      )
    : intl.formatMessage(
        {
          id: 'consumer.trust.eventsDocumentedTooltip',
          defaultMessage:
            '{count} farming {count, plural, one {event} other {events}} documented.'
        },
        { count: documentedEventsCount }
      );

  return {
    pillarName: intl.formatMessage({ id: 'consumer.trust.pillarEvents', defaultMessage: 'EVENTS' }),
    pillarIcon: FaClipboardCheck,
    badgeLabel,
    badgeSublabel: intl.formatMessage({
      id: 'consumer.trust.farmingPractices',
      defaultMessage: 'farming practices'
    }),
    tooltipExplainer,
    tone
  };
}

/**
 * HARVEST pillar — answers "How fresh is this, and which batch is it?"
 * Surfaces the harvest date + lot number: the two facts a shopper (and a
 * produce buyer) can actually act on. Farmer-reported, so tone stays
 * 'documented'. Hidden when neither fact exists; the EVENTS pillar takes
 * the slot instead.
 */
function buildHarvestPillar(props: TrustSummaryHeaderProps, intl: IntlShape): PillarData | null {
  const { harvestDate, lotId } = props;
  if (!harvestDate && !lotId) return null;

  const formattedHarvest = formatHarvestDate(harvestDate, intl.locale);
  if (!formattedHarvest && !lotId) return null;

  const lotLabel = intl.formatMessage(
    { id: 'consumer.trust.lotLabel', defaultMessage: 'Lot {lotId}' },
    { lotId }
  );

  return {
    pillarName: intl.formatMessage({
      id: 'consumer.trust.pillarHarvest',
      defaultMessage: 'HARVEST'
    }),
    pillarIcon: FaSeedling,
    badgeLabel: formattedHarvest
      ? intl.formatMessage(
          { id: 'consumer.trust.harvested', defaultMessage: 'Harvested {date}' },
          { date: formattedHarvest }
        )
      : lotLabel,
    badgeSublabel: formattedHarvest && lotId ? lotLabel : undefined,
    tooltipExplainer: intl.formatMessage({
      id: 'consumer.trust.harvestTooltip',
      defaultMessage:
        'Harvest date and lot number tie this product to one specific production batch — the basis of traceability. Reported by the farmer.'
    }),
    tone: 'documented'
  };
}

/**
 * RECORDS pillar — answers "Can we trust the records themselves?"
 *
 * Blockchain status intentionally does NOT render here anymore: blockchain
 * language ("Polygon", "tamper-evident") in the above-the-fold trust strip
 * read as a crypto signal to mainstream shoppers and crowded out stronger
 * signals. Record-integrity status now renders once, at the Production
 * Journey footer. This pillar surfaces photo evidence / records-on-file.
 *
 * Hide when blockchain check failed (tampered) — we will not surface a fake
 * positive trust signal in that case; the existing integrity-warning UI
 * elsewhere on the page is the correct place to alert consumers. Also hide
 * when there are no photos AND no events.
 */
function buildRecordsPillar(props: TrustSummaryHeaderProps, intl: IntlShape): PillarData | null {
  const { blockchainStatus, totalPhotoEvidenceCount = 0, documentedEventsCount = 0 } = props;
  const hasEvents = documentedEventsCount > 0;

  // Tampered: do not render any positive trust signal. The integrity-failure
  // state is communicated by the existing blockchain integrity UI further
  // down the page; surfacing "Photo-evidenced" green here would contradict it.
  if (blockchainStatus === 'tampered') return null;

  if (totalPhotoEvidenceCount >= 5) {
    return {
      pillarName: intl.formatMessage({
        id: 'consumer.trust.pillarRecords',
        defaultMessage: 'RECORDS'
      }),
      pillarIcon: FaShieldAlt,
      badgeLabel: intl.formatMessage({
        id: 'consumer.trust.photoEvidenced',
        defaultMessage: 'Photo-evidenced'
      }),
      badgeSublabel: intl.formatMessage(
        {
          id: 'consumer.trust.photosAcrossEvents',
          defaultMessage: '{count} photos across events'
        },
        { count: totalPhotoEvidenceCount }
      ),
      tooltipExplainer: intl.formatMessage({
        id: 'consumer.trust.photoEvidencedTooltip',
        defaultMessage:
          '5+ photos are attached across documented events, providing visual evidence alongside the written records.'
      }),
      tone: 'verified'
    };
  }
  if (hasEvents) {
    return {
      pillarName: intl.formatMessage({
        id: 'consumer.trust.pillarRecords',
        defaultMessage: 'RECORDS'
      }),
      pillarIcon: FaShieldAlt,
      badgeLabel: intl.formatMessage({
        id: 'consumer.trust.recordsOnFile',
        defaultMessage: 'Records on file'
      }),
      badgeSublabel: intl.formatMessage({
        id: 'consumer.trust.farmerLoggedRecords',
        defaultMessage: 'Farmer-logged records'
      }),
      tooltipExplainer: intl.formatMessage({
        id: 'consumer.trust.recordsOnFileTooltip',
        defaultMessage:
          'Farmer-logged records are on file. Photo evidence appears here once events include photos.'
      }),
      tone: 'documented'
    };
  }
  return null;
}

/**
 * USDA seal — the seal image itself is the popover trigger (one tap target,
 * no separate info icon). Tapping reveals the nominative-fair-use disclaimer
 * required by USPTO/INTA prong 3.
 */
const UsdaOrganicSeal: React.FC<{ certifierName?: string }> = ({ certifierName }) => {
  const intl = useIntl();
  return (
    <Popover trigger="click" placement="bottom-start">
      <PopoverTrigger>
        <Box
          as="button"
          type="button"
          aria-label={intl.formatMessage({
            id: 'consumer.trust.sealAriaLabel',
            defaultMessage: 'About the USDA Organic seal'
          })}
          cursor="pointer"
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          bg="transparent"
          border="none"
          p={0}
          borderRadius="full"
          transition="transform 0.15s ease"
          _hover={{ transform: 'scale(1.05)' }}
          _focusVisible={{
            outline: '2px solid',
            outlineColor: 'green.500',
            outlineOffset: '2px'
          }}
        >
          <Image
            src="/certifications/usda-organic-seal.svg"
            alt={
              certifierName
                ? intl.formatMessage(
                    {
                      id: 'consumer.trust.sealAltCertifier',
                      defaultMessage: 'USDA Organic seal — farm certified by {certifier}'
                    },
                    { certifier: certifierName }
                  )
                : intl.formatMessage({
                    id: 'consumer.trust.sealAltGeneric',
                    defaultMessage: 'USDA Organic seal — farm certified by a USDA-accredited certifier'
                  })
            }
            boxSize="36px"
            objectFit="contain"
            fallback={<Icon as={FaCertificate} aria-hidden="true" color="green.600" boxSize={5} />}
          />
        </Box>
      </PopoverTrigger>
      <PopoverContent fontSize="xs" maxW="280px">
        <PopoverArrow />
        <PopoverBody>
          <Text fontSize="xs" color="gray.700" lineHeight="1.5">
            {intl.formatMessage({
              id: 'consumer.trust.sealRegisteredMark',
              defaultMessage:
                'USDA Organic seal is a registered mark of the U.S. Department of Agriculture.'
            })}
            {certifierName
              ? intl.formatMessage(
                  {
                    id: 'consumer.trust.sealDisplayedCertifier',
                    defaultMessage: ' Displayed because this farm is certified by {certifier}.'
                  },
                  { certifier: certifierName }
                )
              : intl.formatMessage({
                  id: 'consumer.trust.sealDisplayedNop',
                  defaultMessage: ' Displayed because this farm is certified to the USDA NOP standard.'
                })}
          </Text>
          <Link
            mt={2}
            href="https://www.ams.usda.gov/rules-regulations/organic/organic-seal"
            isExternal
            fontSize="xs"
            color="green.600"
          >
            {intl.formatMessage({
              id: 'consumer.trust.learnMoreUsdaAms',
              defaultMessage: 'Learn more at USDA AMS'
            })}
          </Link>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

/**
 * A single pillar card — compact, modern, with subtle elevation and a
 * single dominant icon/seal in the header. Pillar label sits inline next
 * to the icon (not stacked) for tighter rhythm.
 */
const PillarCard: React.FC<{ pillar: PillarData }> = ({ pillar }) => {
  const tone = TONE_STYLES[pillar.tone];
  const intl = useIntl();

  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="xl"
      px={3.5}
      py={3}
      minH="92px"
      display="flex"
      flexDirection="column"
      justifyContent="space-between"
      role="group"
      boxShadow="0 1px 2px rgba(0, 0, 0, 0.04)"
      transition="box-shadow 0.15s ease, border-color 0.15s ease"
      _hover={{
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
        borderColor: `${tone.badgeColor}.200`
      }}
    >
      <HStack spacing={2} align="center" minH="36px">
        {pillar.showUsdaSeal ? (
          <UsdaOrganicSeal certifierName={pillar.usdaSealCertifierName} />
        ) : (
          <Box
            bg={tone.bg}
            borderRadius="md"
            w="28px"
            h="28px"
            display="inline-flex"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
          >
            <Icon as={pillar.pillarIcon} aria-hidden="true" color={tone.iconColor} boxSize={3.5} />
          </Box>
        )}
        <Text
          flex="1"
          fontSize={{ base: '11px', lg: 'xs' }}
          fontWeight="semibold"
          color="gray.500"
          letterSpacing="0.08em"
          textTransform="uppercase"
          noOfLines={1}
        >
          {pillar.pillarName}
        </Text>
        {/* Dedicated tap/click info affordance — reachable on TOUCH (2026-06 audit P1-4).
            A separate ⓘ button (not the whole card) avoids nesting with the USDA seal's
            own popover and never alters the grid card's sizing. */}
        <Popover trigger="click" placement="bottom-end" isLazy>
          <PopoverTrigger>
            <Box
              as="button"
              type="button"
              flexShrink={0}
              lineHeight="0"
              color="gray.300"
              cursor="pointer"
              aria-label={intl.formatMessage({
                id: 'consumer.trust.whatThisMeans',
                defaultMessage: 'What this means'
              })}
              _hover={{ color: 'gray.500' }}
              _focusVisible={{
                outline: '2px solid',
                outlineColor: 'green.500',
                outlineOffset: '2px',
                borderRadius: 'full'
              }}
            >
              <Icon as={FaInfoCircle} aria-hidden="true" boxSize={3} />
            </Box>
          </PopoverTrigger>
          <PopoverContent fontSize="xs" maxW="280px">
            <PopoverArrow />
            <PopoverBody>
              <Text fontWeight="bold" mb={1} fontSize="sm">
                {pillar.badgeLabel}
              </Text>
              <Text fontSize="xs" color="gray.700" lineHeight="1.5">
                {pillar.tooltipExplainer}
              </Text>
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </HStack>

      <VStack align="stretch" spacing={0.5} mt={2}>
        <Text
          fontSize={{ base: 'sm', lg: 'md' }}
          fontWeight="bold"
          color={`${tone.badgeColor}.700`}
          lineHeight="1.3"
          noOfLines={2}
        >
          {pillar.badgeLabel}
        </Text>
        {pillar.badgeSublabel && (
          <Text fontSize={{ base: 'xs', lg: 'sm' }} color="gray.600" noOfLines={1}>
            {pillar.badgeSublabel}
          </Text>
        )}
      </VStack>
    </Box>
  );
};

/**
 * Pillar skeleton — fixed-height placeholder during data load to prevent
 * cumulative layout shift (CLS).
 */
const PillarSkeleton: React.FC = () => (
  <Box
    bg="gray.50"
    borderWidth="1px"
    borderColor="gray.200"
    borderRadius="lg"
    px={3}
    py={3}
    minH="88px"
  >
    <Skeleton height="14px" width="60px" mb={3} />
    <Skeleton height="16px" width="80%" mb={2} />
    <Skeleton height="12px" width="60%" />
  </Box>
);

const TrustSummaryHeader: React.FC<TrustSummaryHeaderProps> = (props) => {
  const { onMethodologyClick, isLoading } = props;
  const intl = useIntl();

  if (isLoading) {
    return (
      <Box bg="white" pt={5} pb={5}>
        <Container maxW="container.lg">
          <SimpleGrid columns={{ base: 2, smd: 4 }} spacing={{ base: 2.5, smd: 3 }}>
            <PillarSkeleton />
            <PillarSkeleton />
            <PillarSkeleton />
            <PillarSkeleton />
          </SimpleGrid>
        </Container>
      </Box>
    );
  }

  // Order: certification first (strongest third-party signal), then origin,
  // then harvest/lot (falls back to events count when no harvest data),
  // then records evidence. Blockchain moved to the Production Journey footer.
  const harvestPillar = buildHarvestPillar(props, intl);
  const pillars = [
    buildPracticesPillar(props, intl),
    buildOriginPillar(props, intl),
    harvestPillar ?? buildEventsPillar(props, intl),
    buildRecordsPillar(props, intl)
  ].filter((p): p is PillarData => p !== null);

  // Don't render if we have nothing meaningful to say. Hero will still render.
  if (pillars.length === 0) return null;

  return (
    <Box bg="white" pt={5} pb={5}>
      <Container maxW="container.lg">
        <SimpleGrid
          columns={{ base: 2, smd: pillars.length === 4 ? 4 : pillars.length }}
          spacing={{ base: 2.5, smd: 3 }}
        >
          {pillars.map((pillar) => (
            <PillarCard key={pillar.pillarName} pillar={pillar} />
          ))}
        </SimpleGrid>

        {/* FTC compliance line — split by claim type. The old blanket
            "Not independently audited" read as negating the certification
            directly above it (which IS independently verified). Attribute
            the disclaimer to practice records only; state how certifications
            are labeled. */}
        <HStack spacing={2} pt={4} flexWrap="wrap" justify="center" align="baseline">
          <Text fontSize="xs" color="gray.500" textAlign="center">
            {intl.formatMessage({
              id: 'consumer.trust.ftcDisclaimer',
              defaultMessage:
                'Practice records are farmer-reported, not independently audited. Certifications are labeled separately as Verified or Self-Reported.'
            })}
          </Text>
          {onMethodologyClick && (
            <Box
              as="button"
              type="button"
              onClick={onMethodologyClick}
              fontSize="xs"
              color="green.600"
              fontWeight="medium"
              textDecoration="underline"
              cursor="pointer"
              bg="transparent"
              border="none"
              p={0}
              _hover={{ color: 'green.700' }}
              _focusVisible={{
                outline: '2px solid',
                outlineColor: 'green.500',
                outlineOffset: '2px'
              }}
            >
              {intl.formatMessage({
                id: 'consumer.trust.howCalculated',
                defaultMessage: 'How is this calculated?'
              })}
            </Box>
          )}
        </HStack>
      </Container>
    </Box>
  );
};

export default TrustSummaryHeader;
