import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Image,
  useColorModeValue,
  Container,
  Grid,
  GridItem,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  useBreakpointValue
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { motion } from 'framer-motion';
import { useIntl } from 'react-intl';
import { FaStar, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import { formatDateRangeForConsumer, formatHarvestDate } from 'utils/consumerDisplay';

const MotionBox = motion(Box);
const MotionVStack = motion(VStack);
const MotionHStack = motion(HStack);

// Enhanced animations for hero impact
const scoreGlow = keyframes`
  0% { box-shadow: 0 0 20px rgba(76, 175, 80, 0.3); }
  50% { box-shadow: 0 0 40px rgba(76, 175, 80, 0.6), 0 0 60px rgba(76, 175, 80, 0.3); }
  100% { box-shadow: 0 0 20px rgba(76, 175, 80, 0.3); }
`;

const trustPulse = keyframes`
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
`;

const slideInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

interface CarbonScoreData {
  score: number;
  footprint: number;
  relatableFootprint?: string;
  grade?: string;
  level?: string;
}

interface TrustIndicatorData {
  confidenceScore: number;
  isUSDAVerified: boolean;
  reviewsCount: number;
  averageRating?: number | null;
  scansCount: number;
  transparencyScore: number;
}

interface ProductBasicData {
  name: string;
  company: {
    name: string;
  };
  reputation?: number; // 0-5 scale from consumer reviews
}

interface CarbonHeroSectionProps {
  carbonData?: CarbonScoreData;
  trustData?: TrustIndicatorData;
  productData?: ProductBasicData;
  isLoading?: boolean;
  onLearnMore?: () => void;
  // 2026 hero redesign — optional photo + harvest context
  heroPhotoUrl?: string;
  harvestDate?: string;
  /** Set only for a multi-pass harvest: the FIRST pass, so the hero can show the window. */
  harvestDateStart?: string;
  // Claim-safe hero badge inputs. The numeric score + letter grade were
  // removed from the consumer hero (self-created sustainability label —
  // FTC 16 CFR 260.6(d) / EU ECGT exposure). The badge now leads with the
  // third-party certification when one is OID-verified, otherwise with the
  // factual practices count.
  certifiedLabel?: string | null;
  certifierName?: string;
  practicesCount?: number;
  lotId?: string;
  /**
   * Set when this lot's records are FABRICATED (`Establishment.is_demo`, served as
   * `specimen` on the transparency payload). Draws the provenance mark ON the hero.
   *
   * The mark belongs here, not in a banner above the page, because the hero is what
   * gets cropped out and sent on: the photo, the farm name, the lot number and the
   * practice count are the whole identity of the record, and a strip above them is
   * absent from every screenshot that does not happen to include the top of the page.
   * `common/specimen.py` reached the same conclusion for exports and draws its mark on
   * EVERY page rather than the cover, because packets are "excerpted and printed a
   * section at a time". A web page is excerpted harder than a PDF.
   */
  specimen?: boolean;
}

export const CarbonHeroSection: React.FC<CarbonHeroSectionProps> = ({
  carbonData,
  trustData,
  productData,
  isLoading = false,
  onLearnMore,
  heroPhotoUrl,
  harvestDate,
  harvestDateStart,
  certifiedLabel,
  certifierName,
  practicesCount,
  lotId,
  specimen = false
}) => {
  const intl = useIntl();
  const [visibleElements, setVisibleElements] = useState(0);
  const [showDetailedComparison, setShowDetailedComparison] = useState(false);

  // Theme colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const successColor = useColorModeValue('green.700', 'green.400');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Responsive values
  const heroHeight = useBreakpointValue({ base: 'auto', md: '60vh' });
  const scoreSize = useBreakpointValue({ base: '140px', md: '180px' });
  const fontSize = useBreakpointValue({ base: 'xl', md: '2xl' });
  const spacing = useBreakpointValue({ base: 4, md: 6 });

  // 2025 Best Practice: Reserve space and fade in simultaneously to prevent layout shift
  useEffect(() => {
    if (!isLoading && carbonData) {
      // Show all elements at once with staggered animation delays
      // This prevents layout shift by reserving all space upfront
      setVisibleElements(5);
    }
  }, [isLoading, carbonData]);

  // Claim-safe narrative line. The old score-tiered ladder ("Open Book
  // Farm — complete growing story… you can see it all") made unsubstantiated
  // completeness claims and implied a ranking. One neutral, factual message
  // regardless of score.
  const getTransparencyMessage = (_score: number) => {
    return {
      primary: intl.formatMessage({
        id: 'consumer.hero.documentedStoryHeading',
        defaultMessage: '🌱 Documented growing story'
      }),
      secondary: intl.formatMessage({
        id: 'consumer.hero.documentedStorySubtitle',
        defaultMessage:
          'This farmer records their growing practices on Trazo — from soil preparation to harvest. Explore the timeline below.'
      }),
      action: ''
    };
  };

  // The consumer page always renders in transparency mode (ProductDetail passes
  // level:'transparency'). The old score-tiered ladder below this returned unqualified
  // environmental-benefit claims ("excellent environmental stewardship", "Sustainable
  // Farming Practices") derived from a self-reported score — FTC 16 CFR 260.4 / EU ECGT
  // point 4a risk — so it has been removed. One neutral, factual message regardless of score.
  const getConsumerMessage = (score: number) => getTransparencyMessage(score);

  // NOTE: a `getRelatableComparison()` helper used to live here. It was already dead
  // (defined, never called), but it built a four-tier verdict ladder off the self-reported
  // score — "Complete farm story" / "Rich story" / "Key farming moments" / "Basic farm story
  // building" — which is a self-assigned sustainability grade in all but name. Deleted
  // 2026-07 rather than neutralized, because a dead helper is one call site away from
  // re-exposing it. EU ECGT 2024/825 (live 2026-09-27) + FTC 16 CFR 260.6.
  // Its carbon-mode branch had already been stripped for unsubstantiated offset claims.

  if (isLoading) {
    return (
      <Box
        minH={heroHeight}
        bg={`linear-gradient(135deg, ${successColor}15 0%, ${successColor}05 100%)`}
        p={spacing}
        position="relative">
        <Container maxW="container.md" py={spacing}>
          <VStack spacing={6} align="center" textAlign="center">
            <SkeletonCircle size={scoreSize} />
            <VStack spacing={3}>
              <SkeletonText noOfLines={1} width="200px" />
              <SkeletonText noOfLines={2} width="300px" />
            </VStack>
            <HStack spacing={4}>
              <Skeleton height="40px" width="120px" borderRadius="md" />
              <Skeleton height="40px" width="120px" borderRadius="md" />
            </HStack>
          </VStack>
        </Container>
      </Box>
    );
  }

  if (!carbonData) {
    return (
      <Box
        minH={heroHeight}
        bg={cardBg}
        p={spacing}
        display="flex"
        alignItems="center"
        justifyContent="center">
        <VStack spacing={4} textAlign="center">
          <Icon as={FaInfoCircle} boxSize={12} color={mutedColor} />
          <Text fontSize="lg" color={mutedColor}>
            Loading carbon data...
          </Text>
        </VStack>
      </Box>
    );
  }

  const score = carbonData.score || 0;
  const message = getConsumerMessage(score);

  // Format harvest date for hero overlay (e.g. "Harvested Mar 18, 2026").
  // Falls back to nothing when missing — never renders "Recently harvested"
  // placeholder which feels like a stand-in. Uses formatHarvestDate so
  // date-only strings ("2026-03-18") parse as local, not UTC midnight
  // (which renders as the previous day west of UTC).
  // See resolveHarvestDates(): `harvestDate` is the LAST harvest pass, and
  // `harvestDateStart` is set only when the lot came off over more than one day.
  const formattedHarvest =
    (harvestDateStart
      ? formatDateRangeForConsumer(harvestDateStart, harvestDate, intl.locale)
      : null) ?? formatHarvestDate(harvestDate, intl.locale);

  // Consumer review rating — renders only when real reviews exist. Zero
  // reviews shows nothing (no "No ratings yet" placeholder on the hero).
  const reviewsCount = trustData?.reviewsCount ?? 0;
  const avgRating = Number(trustData?.averageRating);
  const showRating = reviewsCount > 0 && Number.isFinite(avgRating);

  return (
    <Box position="relative" overflow="hidden" bg="white">
      {/* Hero photo + glassmorphism score badge.
          Photo extends to top:0 (behind the floating navbar) for a
          magazine-style edge-to-edge cover. Photo height is generous so
          the bottom-anchored overlays (farm name, score badge) sit well
          clear of the navbar pill. Falls back to score-tinted gradient
          when no photo exists for this production. */}
      <MotionBox
        position="relative"
        h={{ base: '60vh', md: '68vh' }}
        maxH={{ base: '560px', md: '680px' }}
        minH={{ base: '440px', md: '500px' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: visibleElements >= 1 ? 1 : 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}>
        {heroPhotoUrl ? (
          <>
            <Image
              src={heroPhotoUrl}
              alt={`${productData?.company.name ?? 'Farm'} growing ${
                productData?.name ?? 'this product'
              }`}
              objectFit="cover"
              objectPosition="center"
              position="absolute"
              inset={0}
              w="100%"
              h="100%"
              loading="eager"
              // LCP: this photo is the largest above-the-fold element — ask
              // the browser to fetch it first. Lowercase DOM attribute form
              // because React 18 doesn't recognize camelCase fetchPriority
              // (added in React 19); emotion's prop filter forwards it.
              {...({ fetchpriority: 'high' } as any)}
              draggable={false}
            />
            {/* Bottom-up gradient for text legibility on the photo. */}
            <Box
              position="absolute"
              inset={0}
              bgGradient="linear(to-t, blackAlpha.800 0%, blackAlpha.500 30%, blackAlpha.100 60%, transparent 80%)"
              pointerEvents="none"
            />
          </>
        ) : (
          <Box
            position="absolute"
            inset={0}
            // Neutral brand gradient. Was score-tinted (getScoreColor), but the
            // transparency score left the consumer hero (claim-safety, 2026-06) —
            // a score-derived tint here is both meaningless and, at a 0/absent
            // score, alarmingly red. Fixed brand green regardless of score.
            bgGradient="linear(135deg, green.100 0%, green.50 100%)"
          />
        )}

        {/* Specimen hatch — the wide-crop half of the provenance mark.
            Diagonal repeating stripes rather than repeated wordmark text: a wash has to
            survive at any crop size and any zoom, and tiled text becomes unreadable noise
            at both extremes. Kept at low contrast because it is the BACKUP signal — the
            chip beside the farm name is the one that states the fact in words. Colour-alone
            never carries meaning here (`.claude/rules/frontend.md`); this only has to make
            an excerpt visibly not-a-normal-record so the reader looks for the label.

            `pointerEvents="none"` so it never intercepts a tap on the photo or the badge. */}
        {specimen && (
          <Box
            position="absolute"
            inset={0}
            pointerEvents="none"
            aria-hidden
            zIndex={1}
            // PAIRED light/dark hairlines, not white alone. A white-only wash is invisible
            // over a dark photograph — which is precisely the crop it has to survive — and a
            // black-only one disappears over a bright sky. Each light stripe carries a dark
            // twin, so one of the two always registers whatever the underlying luminance.
            backgroundImage="repeating-linear-gradient(-45deg, rgba(255,255,255,0.11) 0px, rgba(255,255,255,0.11) 2px, rgba(0,0,0,0.11) 2px, rgba(0,0,0,0.11) 4px, transparent 4px, transparent 15px)"
          />
        )}

        {/* Overlay container — constrains farm name + score badge to the
            same maxW as the pillars below. Photo stays full-bleed, but the
            overlays align with the rest of the page content on desktop. */}
        <Container
          maxW="container.lg"
          position="absolute"
          inset={0}
          px={{ base: 4, md: 6, lg: 8 }}
          pointerEvents="none">
          {/* Bottom-left text overlay — farm name + product/harvest line.
              Right-padded to leave room for the score badge. */}
          <VStack
            position="absolute"
            bottom={{ base: 5, md: 8 }}
            left={{ base: 4, md: 6, lg: 8 }}
            // Clears the trust badge (maxW 150px base / 190px md + right
            // offset). The old 120px assumed the slimmer score badge and let
            // the product line wrap behind the new badge mid-word.
            right={{ base: '190px', md: '240px' }}
            align="flex-start"
            spacing={1}
            color={heroPhotoUrl ? 'white' : 'gray.800'}
            pointerEvents="auto">
            {/* Provenance chip. Placed INSIDE the identity stack, above the farm name, so it
                cannot be separated from the thing it qualifies — crop to the farm name and the
                chip comes with it. That is the property a banner at the top of the page does
                not have, and it is why this is not styled as a warning: it states what the
                record IS, permanently, rather than flagging a transient problem. Solid neutral
                ink at full opacity (not amber, which `STATUS_URGENCY_TOKENS` documents as a
                fill ramp that cannot carry text) reads as a stamp, and stays legible over any
                photograph. */}
            {specimen && (
              <Box
                bg="gray.900"
                color="white"
                px={2.5}
                py={1}
                borderRadius="sm"
                fontSize="xs"
                fontWeight="bold"
                letterSpacing="0.08em"
                textTransform="uppercase"
                mb={1}>
                {intl.formatMessage({
                  id: 'consumer.specimen.heroChip',
                  defaultMessage: 'Not a real farm'
                })}
              </Box>
            )}
            <Text
              as="h1"
              fontSize={{ base: '2xl', md: '4xl' }}
              fontWeight="bold"
              lineHeight="1.1"
              letterSpacing="-0.02em"
              // 3 lines at 375px (2026-08-01). The badge reserves 190px, leaving the title a
              // 169px column — at 24px that is ~13 characters a line, so a two-line clamp cut
              // "Solana Verde Organic Ranch (DEMO)" to "Solana Verde / Organic Ranc" with no
              // ellipsis. The farm's own name is the most identity-critical text on the page.
              noOfLines={{ base: 3, md: 2 }}
              textShadow={heroPhotoUrl ? '0 2px 12px rgba(0,0,0,0.4)' : 'none'}>
              {productData?.company.name ?? 'Farm'}
            </Text>
            <Text
              fontSize={{ base: 'sm', md: 'md' }}
              fontWeight="medium"
              opacity={heroPhotoUrl ? 0.95 : 0.8}
              // Same 169px column as the title above: "Avocado · Lot SVR-2026-HA-001 ·
              // Harvested Apr 14, 2026" is ~55 characters and was being cut at "Harvested Apr".
              noOfLines={{ base: 3, md: 2 }}
              textShadow={heroPhotoUrl ? '0 1px 6px rgba(0,0,0,0.4)' : 'none'}>
              {productData?.name ??
                intl.formatMessage({
                  id: 'consumer.hero.productFallback',
                  defaultMessage: 'Product'
                })}
              {lotId
                ? intl.formatMessage(
                    { id: 'consumer.hero.lotLabel', defaultMessage: ' · Lot {lot}' },
                    { lot: lotId }
                  )
                : ''}
              {formattedHarvest
                ? intl.formatMessage(
                    { id: 'consumer.hero.harvestedLabel', defaultMessage: ' · Harvested {date}' },
                    { date: formattedHarvest }
                  )
                : ''}
            </Text>
          </VStack>

          {/* Glassmorphism trust badge — bottom-right corner.
              Leads with the third-party certification when OID-verified
              (the strongest true signal on the page), otherwise the factual
              practices count. Replaces the former numeric score + letter
              grade, which read as a quality/safety grade and was a
              self-created label (FTC/ECGT exposure). */}
          {(certifiedLabel || (practicesCount ?? 0) > 0) && (
            <MotionBox
              position="absolute"
              bottom={{ base: 5, md: 8 }}
              right={{ base: 4, md: 6, lg: 8 }}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{
                opacity: visibleElements >= 2 ? 1 : 0,
                scale: visibleElements >= 2 ? 1 : 0.85
              }}
              transition={{ delay: 0.2, duration: 0.6, type: 'spring', bounce: 0.3 }}
              style={{ pointerEvents: 'auto' }}>
              <VStack
                spacing={0.5}
                bg={heroPhotoUrl ? 'whiteAlpha.400' : 'white'}
                backdropFilter={heroPhotoUrl ? 'blur(20px)' : 'none'}
                borderWidth="1px"
                borderColor={heroPhotoUrl ? 'whiteAlpha.600' : 'gray.200'}
                borderRadius="2xl"
                px={{ base: 3.5, md: 4 }}
                py={{ base: 2.5, md: 3 }}
                maxW={{ base: '172px', md: '210px' }}
                align="center"
                justify="center"
                boxShadow={
                  heroPhotoUrl ? '0 8px 32px rgba(0, 0, 0, 0.18)' : '0 4px 16px rgba(0, 0, 0, 0.08)'
                }>
                {certifiedLabel ? (
                  <>
                    {/* Compact: short certifier name on one line (the full
                        legal name lives in the Certifications card below) and
                        plain-text practices line — the old nested white pill
                        plus 3-line certifier name read as a cramped
                        badge-in-badge. */}
                    <HStack spacing={1.5}>
                      <Icon
                        as={FaCheckCircle}
                        color={heroPhotoUrl ? 'white' : 'green.600'}
                        boxSize={4}
                      />
                      <Text
                        fontSize={{ base: 'sm', md: 'md' }}
                        fontWeight="bold"
                        color={heroPhotoUrl ? 'white' : 'green.700'}
                        textAlign="center"
                        lineHeight="1.2"
                        whiteSpace="nowrap"
                        textShadow={heroPhotoUrl ? '0 1px 6px rgba(0,0,0,0.25)' : 'none'}>
                        {certifiedLabel}
                      </Text>
                    </HStack>
                    {certifierName && (
                      <Text
                        fontSize="xs"
                        fontWeight="medium"
                        color={heroPhotoUrl ? 'whiteAlpha.900' : 'gray.600'}
                        textAlign="center"
                        noOfLines={1}>
                        {intl.formatMessage(
                          { id: 'consumer.hero.byCertifier', defaultMessage: 'by {certifier}' },
                          { certifier: certifierName.split(' (')[0] }
                        )}
                      </Text>
                    )}
                    {(practicesCount ?? 0) > 0 && (
                      <Text
                        fontSize="xs"
                        color={heroPhotoUrl ? 'whiteAlpha.800' : 'gray.500'}
                        textAlign="center"
                        noOfLines={1}
                        mt={0.5}>
                        {intl.formatMessage(
                          {
                            id: 'consumer.hero.practicesDocumented',
                            defaultMessage: '{count} practices documented'
                          },
                          { count: practicesCount }
                        )}
                      </Text>
                    )}
                  </>
                ) : (
                  <>
                    <Text
                      fontSize={{ base: '3xl', md: '4xl' }}
                      fontWeight="black"
                      color={heroPhotoUrl ? 'white' : 'green.600'}
                      lineHeight="1"
                      letterSpacing="-0.04em"
                      textShadow={heroPhotoUrl ? '0 1px 6px rgba(0,0,0,0.25)' : 'none'}>
                      {practicesCount}
                    </Text>
                    <Text
                      fontSize="xs"
                      fontWeight="semibold"
                      color={heroPhotoUrl ? 'whiteAlpha.900' : 'gray.600'}
                      textAlign="center"
                      lineHeight="1.2">
                      {intl.formatMessage({
                        id: 'consumer.hero.practicesDocumentedLabel',
                        defaultMessage: 'practices documented'
                      })}
                    </Text>
                  </>
                )}
                {/* Compact consumer-review line — plain count + average
                    only (claim-safe: no "verified buyers" language). */}
                {showRating && (
                  <HStack spacing={1} mt={0.5}>
                    <Icon as={FaStar} color="yellow.400" boxSize={3} />
                    <Text
                      fontSize="xs"
                      fontWeight="medium"
                      color={heroPhotoUrl ? 'white' : 'gray.600'}
                      textShadow={heroPhotoUrl ? '0 1px 6px rgba(0,0,0,0.25)' : 'none'}>
                      {avgRating.toFixed(1)} ({reviewsCount})
                    </Text>
                  </HStack>
                )}
              </VStack>
            </MotionBox>
          )}
        </Container>
      </MotionBox>

      {/* Tier message strip — narrative voice carrying the verdict moment
          into a warm, plain-English sentence. Single line; expanded copy
          lives in `message.secondary` only when not redundant with the
          score badge above. */}
      <MotionVStack
        spacing={1}
        align="center"
        textAlign="center"
        bg="white"
        px={4}
        py={{ base: 4, md: 5 }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: visibleElements >= 3 ? 1 : 0, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}>
        <Text
          fontSize={{ base: 'lg', md: 'xl' }}
          fontWeight="bold"
          color={successColor}
          letterSpacing="-0.01em">
          {message.primary}
        </Text>
        <Text fontSize={{ base: 'sm', md: 'md' }} color={mutedColor} maxW="2xl" lineHeight="1.5">
          {message.secondary}
        </Text>
      </MotionVStack>
    </Box>
  );
};

export default CarbonHeroSection;
