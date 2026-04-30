/**
 * HeroPreviewCard — miniature of the consumer QR hero.
 *
 * Mirrors `CarbonHeroSection`'s photo + farm overlay + glass score badge
 * so farmers see in the Finish Production flow what shoppers will see
 * when they scan the QR code. The Trazo navbar pill is intentionally
 * omitted to avoid double branding when the uploaded photo already has
 * a watermark; gradient and blur values match the live hero for parity.
 */
import React from 'react';
import { Box, VStack, Text, Image, Icon, Badge } from '@chakra-ui/react';
import { FaImage } from 'react-icons/fa';

interface HeroPreviewCardProps {
  /** First uploaded image — becomes the consumer hero. */
  imageUrl?: string;
  /** Total uploaded image count, for the caption. */
  imageCount?: number;
  /** Farm name overlaid bottom-left (line 1). Use the public-facing farm
      name (transparency endpoint's `farmer.name`), not the legal company
      name, so it matches the live consumer page exactly. */
  farmName?: string;
  /** Product name overlaid bottom-left (line 2). */
  productName?: string;
  /** Real transparency score (0-100). Optional; when undefined, the
      glass score badge is hidden entirely so the preview never shows
      a misleading or empty score number. */
  score?: number;
  /** Harvest date ISO string. When supplied, appended after product name
      ("Avocado · Harvested Mar 18, 2026") to mirror the live hero. */
  harvestDate?: string;
  /** First event-timeline photo. Rendered as the cover when the farmer
      hasn't uploaded any production photos — same fallback the consumer
      page applies — so the preview shows what shoppers would actually
      see if the farmer skips this step. */
  fallbackImageUrl?: string;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return 'green.500';
  if (score >= 60) return 'green.400';
  if (score >= 40) return 'yellow.400';
  if (score >= 20) return 'orange.400';
  return 'red.500';
};

const getScoreGrade = (score: number) => {
  if (score >= 90) return { grade: 'A+', color: 'green' };
  if (score >= 80) return { grade: 'A', color: 'green' };
  if (score >= 70) return { grade: 'B', color: 'green' };
  if (score >= 60) return { grade: 'C', color: 'yellow' };
  if (score >= 40) return { grade: 'D', color: 'orange' };
  return { grade: 'F', color: 'red' };
};

export const HeroPreviewCard: React.FC<HeroPreviewCardProps> = ({
  imageUrl,
  imageCount = 0,
  farmName,
  productName,
  score,
  harvestDate,
  fallbackImageUrl
}) => {
  const hasUpload = Boolean(imageUrl);
  const hasFallback = !hasUpload && Boolean(fallbackImageUrl);
  const renderedImage = imageUrl || fallbackImageUrl;
  const hasImage = Boolean(renderedImage);
  const hasScore = typeof score === 'number' && !Number.isNaN(score);
  const grade = hasScore ? getScoreGrade(score!) : null;

  // One-line status under the card. Tells the farmer the source of the
  // current cover image without duplicating the on-photo overlay badge.
  const statusText = hasUpload
    ? imageCount > 1
      ? `Cover photo · 1 of ${imageCount} uploaded`
      : 'Cover photo · uploaded by you'
    : hasFallback
    ? 'No upload — auto-picked from your event timeline'
    : 'Upload a photo to set the cover';
  const statusColor = hasUpload ? 'green.700' : hasFallback ? 'orange.700' : 'gray.500';

  const formattedHarvest = (() => {
    if (!harvestDate) return null;
    try {
      const d = new Date(harvestDate);
      if (Number.isNaN(d.getTime())) return null;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return null;
    }
  })();

  return (
    <VStack spacing={3} align="stretch">
      {/* Single-line section header. The card overlay badges already
          communicate the active state ("Using event photo", "Cover · 1 of N"),
          so this row only labels the surface — no redundant pills. */}
      <Text fontSize="xs" fontWeight="semibold" color="gray.500" letterSpacing="0.04em">
        CONSUMER PREVIEW
      </Text>

      {/* Hero card — mirrors CarbonHeroSection's photo/overlay layout. */}
      <Box
        position="relative"
        w="full"
        maxW="320px"
        mx="auto"
        aspectRatio={3 / 4}
        bg={hasImage ? 'gray.900' : 'gray.100'}
        borderRadius="2xl"
        overflow="hidden"
        borderWidth="1px"
        borderColor="gray.200"
        boxShadow="0 8px 24px rgba(0, 0, 0, 0.06)"
      >
        {hasImage ? (
          <>
            <Image
              src={renderedImage}
              alt="Cover preview"
              position="absolute"
              inset={0}
              w="100%"
              h="100%"
              objectFit="cover"
              draggable={false}
            />
            {/* Same gradient stack as CarbonHeroSection. */}
            <Box
              position="absolute"
              inset={0}
              bgGradient="linear(to-t, blackAlpha.800 0%, blackAlpha.500 30%, blackAlpha.100 60%, transparent 80%)"
              pointerEvents="none"
            />
            {/* Auto-pick badge — overlaid on the photo when the cover is
                a fallback from a timeline event, so the farmer can tell at
                a glance that this is not their explicit choice. */}
            {hasFallback && (
              <Badge
                position="absolute"
                top="12px"
                left="12px"
                fontSize="11px"
                fontWeight="semibold"
                bg="whiteAlpha.800"
                color="orange.700"
                px={2}
                py={0.5}
                borderRadius="full"
                textTransform="none"
                backdropFilter="blur(8px)"
              >
                Using event photo
              </Badge>
            )}
          </>
        ) : (
          <Box
            position="absolute"
            inset={0}
            bgGradient={
              hasScore
                ? `linear(135deg, ${getScoreColor(score!)}30 0%, ${getScoreColor(score!)}10 100%)`
                : 'linear(135deg, gray.50 0%, gray.100 100%)'
            }
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <VStack spacing={2}>
              <Icon as={FaImage} boxSize={6} color="gray.400" />
              <Text fontSize="xs" color="gray.500">
                Cover photo preview
              </Text>
            </VStack>
          </Box>
        )}

        {/* Bottom-left farm + product overlay. */}
        <VStack
          position="absolute"
          bottom="14px"
          left="14px"
          right={hasScore ? '78px' : '14px'}
          align="flex-start"
          spacing={0.5}
          color={hasImage ? 'white' : 'gray.800'}
        >
          <Text
            fontSize="md"
            fontWeight="bold"
            lineHeight="1.1"
            letterSpacing="-0.01em"
            noOfLines={2}
            textShadow={hasImage ? '0 2px 12px rgba(0,0,0,0.4)' : 'none'}
          >
            {farmName || 'Your farm'}
          </Text>
          <Text
            fontSize="xs"
            fontWeight="medium"
            opacity={hasImage ? 0.95 : 0.75}
            noOfLines={2}
            textShadow={hasImage ? '0 1px 6px rgba(0,0,0,0.4)' : 'none'}
          >
            {productName || 'Your product'}
            {formattedHarvest ? ` · Harvested ${formattedHarvest}` : ''}
          </Text>
        </VStack>

        {/* Glass score badge — bottom-right, mirrors CarbonHeroSection. */}
        {hasScore && (
          <VStack
            position="absolute"
            bottom="14px"
            right="14px"
            spacing={0.5}
            bg={hasImage ? 'whiteAlpha.300' : 'white'}
            backdropFilter={hasImage ? 'blur(20px)' : 'none'}
            borderWidth="1px"
            borderColor={hasImage ? 'whiteAlpha.500' : 'gray.200'}
            borderRadius="xl"
            px={2.5}
            py={1.5}
            minW="56px"
            align="center"
            justify="center"
            boxShadow={
              hasImage
                ? '0 8px 24px rgba(0, 0, 0, 0.18)'
                : '0 4px 12px rgba(0, 0, 0, 0.08)'
            }
          >
            <Text
              fontSize="2xl"
              fontWeight="black"
              color={hasImage ? 'white' : getScoreColor(score!)}
              lineHeight="1"
              letterSpacing="-0.04em"
              textShadow={hasImage ? '0 1px 6px rgba(0,0,0,0.25)' : 'none'}
            >
              {Math.round(score!)}
            </Text>
            <Badge
              bg={hasImage ? 'whiteAlpha.900' : `${grade!.color}.50`}
              color={`${grade!.color}.700`}
              fontSize="11px"
              fontWeight="bold"
              px={1.5}
              py={0}
              borderRadius="md"
              mt={0.5}
            >
              {grade!.grade}
            </Badge>
          </VStack>
        )}
      </Box>

      {/* Status line — single source of truth for cover-image source. */}
      <Text
        fontSize="xs"
        color={statusColor}
        textAlign="center"
        maxW="320px"
        mx="auto"
        lineHeight="1.4"
      >
        {statusText}
      </Text>
    </VStack>
  );
};

export default HeroPreviewCard;
