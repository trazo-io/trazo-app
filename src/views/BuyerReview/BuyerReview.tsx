/**
 * What a BUYER sees when they open a farmer's buyer review link (2026-08-25).
 *
 * The wholesale procurement counterpart of CertifierReview: anonymous, plain,
 * nothing to sign up for. It answers "whose operation, which seasons, how
 * current" and hands off to the consumer product page for season detail — with
 * the token as `rt`, so an in-season, unpublished season opens there too.
 *
 * The content-class line this page must never cross: it links ONLY to the
 * claim-safe consumer surface. It shows no readiness findings, no dossier, no
 * score — those are the certifier's and the farmer's surfaces respectively.
 * What a buyer sees is exactly what a shopper would see, just earlier and
 * privately: same uniform policy, no per-farm curation (see
 * .claude/rules/transparency-first.md).
 */
import React, { useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Center,
  Divider,
  Heading,
  HStack,
  Icon,
  Spinner,
  Text,
  VStack,
  useColorModeValue
} from '@chakra-ui/react';
import { FaExternalLinkAlt, FaLeaf } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';

import { StandardButton } from 'components/Design/StandardComponents';
import { config } from 'config/environment';
import { formatDateOnly } from 'utils/dateOnly';

interface BuyerSeason {
  public_id: string;
  name: string;
  product: string | null;
  parcel: string | null;
  start_date: string | null;
  finish_date: string | null;
  in_progress: boolean;
  published: boolean;
}

interface BuyerReviewMetadata {
  operation_name: string;
  operation_city: string | null;
  operation_state: string | null;
  label: string;
  expires_at: string;
  seasons: BuyerSeason[];
}

// DateFields arrive as "2026-01-15"; new Date(...) reads that as UTC midnight and
// prints the previous day west of Greenwich. Same helper class as CertifierReview.
const formatDate = (value?: string | null) => formatDateOnly(value) ?? null;

const BuyerReview: React.FC = () => {
  const intl = useIntl();
  const { token } = useParams<{ token: string }>();
  const [meta, setMeta] = useState<BuyerReviewMetadata | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const rowBg = useColorModeValue('gray.50', 'gray.700');
  const rowBorder = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');

  const apiRoot = `${config.API_ROOT_URL}/api`;

  useEffect(() => {
    let cancelled = false;
    // No credentials: anonymous by design, like CertifierReview — sending cookies
    // would tie the buyer's view to whatever Trazo session their browser holds.
    fetch(`${apiRoot}/buyer-review/${token}/`)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setMeta(data);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiRoot, token]);

  if (loading) {
    return (
      <Center minH="60vh">
        <Spinner size="lg" color="green.700" />
      </Center>
    );
  }

  if (notFound || !meta) {
    return (
      <Center minH="60vh" px={6}>
        <VStack spacing={3} maxW="lg" textAlign="center">
          <Heading size="md">{intl.formatMessage({ id: 'buyerReview.notFound.title' })}</Heading>
          <Text color={mutedColor}>{intl.formatMessage({ id: 'buyerReview.notFound.body' })}</Text>
        </VStack>
      </Center>
    );
  }

  const location = [meta.operation_city, meta.operation_state].filter(Boolean).join(', ');

  const seasonUrl = (season: BuyerSeason) =>
    `${config.CONSUMER_BASE_URL}/production/${season.public_id}?rt=${token}`;

  return (
    <Center px={{ base: 4, md: 8 }} py={{ base: 8, md: 14 }}>
      <VStack spacing={6} align="stretch" w="full" maxW="3xl">
        <VStack spacing={1} align="flex-start">
          <HStack spacing={2}>
            <Icon as={FaLeaf} color="green.700" />
            <Text fontSize="sm" fontWeight="semibold" color="green.700">
              {intl.formatMessage({ id: 'buyerReview.kicker' })}
            </Text>
          </HStack>
          <Heading size="lg">{meta.operation_name}</Heading>
          {location && <Text color={mutedColor}>{location}</Text>}
          {meta.label && (
            <Text fontSize="sm" color={mutedColor}>
              {meta.label}
            </Text>
          )}
        </VStack>

        {/* The honesty frame: what this page is and is not. Records-to-date, read-only,
            same information policy as the public product page — stated to the BUYER,
            because an unexplained private link invites over-reading. */}
        <Box borderWidth="1px" borderColor={rowBorder} borderRadius="lg" bg={rowBg} p={4}>
          <Text fontSize="sm" color={textColor}>
            {intl.formatMessage({ id: 'buyerReview.policyNote' })}
          </Text>
        </Box>

        <Divider />

        <Heading size="md">{intl.formatMessage({ id: 'buyerReview.seasons.title' })}</Heading>
        {meta.seasons.length === 0 && (
          <Text color={mutedColor}>{intl.formatMessage({ id: 'buyerReview.seasons.empty' })}</Text>
        )}
        <VStack spacing={3} align="stretch">
          {meta.seasons.map((season) => (
            <HStack
              key={season.public_id}
              borderWidth="1px"
              borderColor={rowBorder}
              borderRadius="lg"
              p={4}
              justify="space-between"
              align="flex-start"
              flexWrap="wrap"
              gap={3}>
              <VStack align="flex-start" spacing={1}>
                <HStack spacing={2} flexWrap="wrap">
                  <Text fontWeight="semibold" color={textColor}>
                    {season.product || season.name}
                  </Text>
                  {season.in_progress ? (
                    <Badge variant="warning">
                      {intl.formatMessage({ id: 'buyerReview.season.inProgress' })}
                    </Badge>
                  ) : (
                    <Badge variant="neutral">
                      {intl.formatMessage({ id: 'buyerReview.season.finished' })}
                    </Badge>
                  )}
                </HStack>
                <Text fontSize="sm" color={mutedColor}>
                  {[season.parcel, formatDate(season.start_date), formatDate(season.finish_date)]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </VStack>
              <StandardButton
                as="a"
                href={seasonUrl(season)}
                target="_blank"
                rel="noopener noreferrer"
                size="sm"
                rightIcon={<FaExternalLinkAlt />}>
                {intl.formatMessage({ id: 'buyerReview.season.open' })}
              </StandardButton>
            </HStack>
          ))}
        </VStack>

        <Text fontSize="xs" color={mutedColor}>
          {intl.formatMessage(
            { id: 'buyerReview.expires' },
            { date: formatDate(meta.expires_at) ?? '' }
          )}
        </Text>
      </VStack>
    </Center>
  );
};

export default BuyerReview;
