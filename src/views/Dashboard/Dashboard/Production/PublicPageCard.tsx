/**
 * The lot's public page, as one card (2026-11-06).
 *
 * Was a "Your public page" section of two cards side by side: an 820px cover-photo editor (a
 * 16:9 placeholder above a dropzone) and a QR card with a coloured banner, a 280px QR, a
 * paragraph, two buttons and a blue print tip. On a live season it took the first screen, so
 * the season plan and the activities started below 1,500px. The farmer comes here to log and
 * to check; the public page is configured once.
 *
 * Kept, every one of them: whether a scan opens the page (an unpublished lot answers 404 to
 * everyone but the owner, verified 2026-08-19, so "not live" is stated, never implied), the QR
 * download, the owner preview, the buyer link and the cover photo. The cover editor moved into
 * a modal opened from its own row.
 */
import React from 'react';
import { Box, HStack, Icon, Image, Stack, Text, VStack, useDisclosure } from '@chakra-ui/react';
import {
  FaCheckCircle,
  FaDownload,
  FaEye,
  FaImage,
  FaLink,
  FaLock,
  FaQrcode
} from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { StandardButton, StandardCard, StatusRow } from 'components/Design/StandardComponents';
import { ResponsiveModal } from 'components/Design/ResponsiveModal';
import { TrazoImageUpload } from 'components/Upload';

interface Props {
  qrCode?: string | null;
  coverImageUrl?: string | null;
  isFinished: boolean;
  isPublished: boolean;
  canWrite: boolean;
  isSavingCover: boolean;
  onDownloadQr: () => void;
  onPreview: () => void;
  onCopyBuyerLink: () => void;
  onSetCover: (urls: string[]) => void;
  onClearCover: () => void;
}

export default function PublicPageCard({
  qrCode,
  coverImageUrl,
  isFinished,
  isPublished,
  canWrite,
  isSavingCover,
  onDownloadQr,
  onPreview,
  onCopyBuyerLink,
  onSetCover,
  onClearCover
}: Props) {
  const intl = useIntl();
  const cover = useDisclosure();

  return (
    <>
      <StandardCard
        mb={0}
        title={intl.formatMessage({ id: 'season.publicPage.title', defaultMessage: 'Public page' })}
        subtitle={intl.formatMessage({
          id: 'production.section.publicPageHelp',
          defaultMessage: 'What a shopper sees when they scan this lot.'
        })}>
        <VStack align="stretch" spacing={4}>
          {/* Live or not, in words. HistoryViewSet refuses `published=True` on an open season,
              so an open season is never live and the way there is finishing it. A finished
              season is live only while published: the finish form's publish box can be
              unticked, and the Buyer page can unpublish later (review of #299). */}
          {isFinished && isPublished ? (
            <StatusRow
              tone="clear"
              icon={FaCheckCircle}
              title={intl.formatMessage({
                id: 'season.publicPage.live',
                defaultMessage: 'Live: a scan opens this lot’s page'
              })}
            />
          ) : (
            <StatusRow
              tone="neutral"
              icon={FaLock}
              title={intl.formatMessage({ id: 'production.qr.notLiveTitle' })}>
              <Text fontSize="xs" color="gray.600">
                {isFinished
                  ? intl.formatMessage({
                      id: 'season.publicPage.unpublishedBody',
                      defaultMessage:
                        'This season is not published, so a scan opens nothing. Only you can preview it. Publishing is on the Buyer Page.'
                    })
                  : intl.formatMessage({
                      id: 'season.publicPage.notLiveBody',
                      defaultMessage:
                        'The page goes live when you finish the season. Until then only you can preview it.'
                    })}
              </Text>
            </StatusRow>
          )}

          <Stack
            direction={{ base: 'column', smd: 'row' }}
            spacing={4}
            align={{ base: 'stretch', smd: 'center' }}>
            {qrCode && (
              <Box
                p={2}
                bg="white"
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="md"
                alignSelf={{ base: 'center', smd: 'auto' }}
                flexShrink={0}>
                <Image
                  src={qrCode}
                  alt={intl.formatMessage({
                    id: 'season.publicPage.qrAlt',
                    defaultMessage: 'QR code for this lot'
                  })}
                  boxSize="112px"
                  // The file sits on S3; until it answers, a QR glyph holds the space instead of a
                  // broken-image box with its alt text.
                  fallback={
                    <Box boxSize="112px" display="flex" alignItems="center" justifyContent="center">
                      <Icon as={FaQrcode} boxSize={10} color="gray.300" aria-hidden />
                    </Box>
                  }
                />
              </Box>
            )}
            <VStack align="stretch" spacing={2} flex={1} minW={0}>
              <HStack spacing={2} flexWrap="wrap">
                {qrCode && (
                  <StandardButton
                    size="sm"
                    variant="outline"
                    leftIcon={<Icon as={FaDownload} />}
                    onClick={onDownloadQr}>
                    {intl.formatMessage({
                      id: 'production.qr.download',
                      defaultMessage: 'Download QR'
                    })}
                  </StandardButton>
                )}
                <StandardButton
                  size="sm"
                  variant="outline"
                  leftIcon={<Icon as={FaEye} />}
                  onClick={onPreview}>
                  {intl.formatMessage({
                    id: isPublished ? 'season.publicPage.open' : 'production.qr.previewPublicPage',
                    defaultMessage: isPublished ? 'Open page' : 'Preview page'
                  })}
                </StandardButton>
                <StandardButton
                  size="sm"
                  variant="outline"
                  leftIcon={<Icon as={FaLink} />}
                  onClick={onCopyBuyerLink}>
                  {intl.formatMessage({ id: 'production.copyBuyerLink.button' })}
                </StandardButton>
              </HStack>
              {isFinished && isPublished && qrCode && (
                <Text fontSize="xs" color="gray.600">
                  {intl.formatMessage({
                    id: 'season.publicPage.printTip',
                    defaultMessage: 'Print at least 2.5 cm (1 in) wide so phones can scan it.'
                  })}
                </Text>
              )}
            </VStack>
          </Stack>

          {/* The cover is the hero image of the public page. One row: what it is now, and the
              door to change it. */}
          <HStack
            spacing={3}
            pt={4}
            borderTopWidth="1px"
            borderTopColor="gray.200"
            justify="space-between">
            <HStack spacing={3} minW={0}>
              {coverImageUrl ? (
                <Image
                  src={coverImageUrl}
                  alt=""
                  w="64px"
                  h="36px"
                  objectFit="cover"
                  borderRadius="sm"
                  flexShrink={0}
                />
              ) : (
                <Box
                  w="64px"
                  h="36px"
                  borderRadius="sm"
                  bg="gray.100"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  flexShrink={0}>
                  <Icon as={FaImage} color="gray.400" aria-hidden />
                </Box>
              )}
              <Box minW={0}>
                <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                  {intl.formatMessage({
                    id: 'season.publicPage.cover',
                    defaultMessage: 'Cover photo'
                  })}
                </Text>
                <Text fontSize="xs" color="gray.600" noOfLines={1}>
                  {coverImageUrl
                    ? intl.formatMessage({
                        id: 'season.publicPage.coverChosen',
                        defaultMessage: 'Chosen by you'
                      })
                    : intl.formatMessage({
                        id: 'season.publicPage.coverAuto',
                        defaultMessage: 'Automatic: the first activity photo'
                      })}
                </Text>
              </Box>
            </HStack>
            {canWrite && (
              <StandardButton size="sm" variant="ghost" onClick={cover.onOpen}>
                {intl.formatMessage({
                  id: 'season.publicPage.changeCover',
                  defaultMessage: 'Change'
                })}
              </StandardButton>
            )}
          </HStack>
        </VStack>
      </StandardCard>

      <ResponsiveModal
        isOpen={cover.isOpen}
        onClose={cover.onClose}
        size="lg"
        header={intl.formatMessage({
          id: 'season.publicPage.cover',
          defaultMessage: 'Cover photo'
        })}>
        <VStack align="stretch" spacing={4}>
          <Text fontSize="sm" color="gray.600">
            {intl.formatMessage({ id: 'production.cover.help' })}
          </Text>
          {coverImageUrl && (
            <Box position="relative">
              <Image
                src={coverImageUrl}
                alt=""
                borderRadius="lg"
                objectFit="cover"
                w="100%"
                aspectRatio="16/9"
              />
              <StandardButton
                variant="outline"
                size="xs"
                onClick={onClearCover}
                isLoading={isSavingCover}
                position="absolute"
                top={2}
                right={2}
                bg="white">
                {intl.formatMessage({ id: 'production.cover.reset' })}
              </StandardButton>
            </Box>
          )}
          <TrazoImageUpload
            maxFiles={1}
            maxSize={5 * 1024 * 1024}
            existingImages={[]}
            onImagesChange={onSetCover}
            isLoading={isSavingCover}
            compact
            title={intl.formatMessage({ id: 'production.cover.uploadTitle' })}
            subtitle={intl.formatMessage({ id: 'production.cover.uploadSubtitle' })}
          />
        </VStack>
      </ResponsiveModal>
    </>
  );
}
