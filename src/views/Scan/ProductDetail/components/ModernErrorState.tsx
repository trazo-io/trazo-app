import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Container,
  Circle,
  Divider,
  Link,
  List,
  ListItem,
  ListIcon,
  IconButton,
  useToast
} from '@chakra-ui/react';
import {
  FaExclamationTriangle,
  FaQrcode,
  FaRedo,
  FaCopy,
  FaExternalLinkAlt,
  FaChevronRight,
  FaWifi,
  FaServer
} from 'react-icons/fa';
import { StandardCard, StandardButton } from 'components/Design/StandardComponents';
import { useIntl } from 'react-intl';

// Support email - single source of truth
const SUPPORT_EMAIL = 'support@trazo.io';

/**
 * Cooldown applied AFTER each attempt, so a consumer on a flaky connection
 * cannot hammer the API. Index = number of attempts already made.
 * The first retry is immediate; pressure only builds if it keeps failing.
 */
const RETRY_COOLDOWNS_MS = [0, 3000, 8000, 15000];

/**
 * Consumer-facing error taxonomy. Blame is only assigned where it is provable:
 * - `offline`     the device says it is disconnected — safe to point at their connection
 * - `unreachable` the request never landed while the device believed it was online;
 *                 could be a weak signal OR us, so the copy accuses neither
 * - `server`      we got a real 5xx back, so it is provably our fault
 */
export type ConsumerErrorType =
  | 'offline'
  | 'unreachable'
  | 'server'
  | 'not_found'
  | 'qr_verification'
  | 'general';

interface ModernErrorStateProps {
  type: ConsumerErrorType;
  title?: string;
  message?: string;
  /** Short opaque reference shown to the consumer and pre-filled into the support email */
  errorId?: string;
  /** Must actually re-run the request. Returning a promise keeps the spinner honest. */
  onRetry?: () => void | Promise<unknown>;
  /** Optional: Show "Learn About Trazo" link to the public site */
  showLearnMore?: boolean;
}

/**
 * Maps a fetch/RTK Query error onto the consumer taxonomy.
 * Anything we cannot attribute to the consumer's device is our problem, not theirs.
 */
export const classifyConsumerError = (error: unknown): ConsumerErrorType => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';

  const status = (error as { status?: number | string })?.status;

  // navigator.onLine says connected but nothing came back — do not pin this on their WiFi
  if (status === 'FETCH_ERROR' || status === 'TIMEOUT_ERROR') return 'unreachable';
  // 403/410 on an anonymous endpoint = unpublished or retired production, not a server fault
  if (status === 404 || status === 403 || status === 410) return 'not_found';
  if (status === 'PARSING_ERROR') return 'server';
  if (typeof status === 'number' && status >= 500) return 'server';
  if (typeof status === 'number' && status >= 400) return 'general';

  return 'general';
};

/**
 * Builds a short reference the consumer can quote to support.
 * Deliberately derived (not random) so the same failure always yields the same code.
 */
export const buildErrorReference = (error: unknown, productionId?: string | null): string => {
  const status = (error as { status?: number | string })?.status;
  const statusPart = status === undefined || status === null ? 'ERR' : String(status);
  const idPart = productionId ? productionId.replace(/-/g, '').slice(0, 6).toUpperCase() : '';
  return idPart ? `${statusPart}-${idPart}` : statusPart;
};

/** Safe clipboard copy with fallback for non-HTTPS contexts */
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for HTTP/insecure contexts
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
};

type ErrorTypeKey =
  | 'offline'
  | 'unreachable'
  | 'server'
  | 'notFound'
  | 'qrVerification'
  | 'general';

const TYPE_TO_KEY: Record<ConsumerErrorType, ErrorTypeKey> = {
  offline: 'offline',
  unreachable: 'unreachable',
  server: 'server',
  not_found: 'notFound',
  qr_verification: 'qrVerification',
  general: 'general'
};

const TYPE_ICONS: Record<ConsumerErrorType, React.ComponentType> = {
  offline: FaWifi,
  unreachable: FaWifi,
  server: FaServer,
  not_found: FaQrcode,
  qr_verification: FaQrcode,
  general: FaExclamationTriangle
};

/**
 * One warm accent for anything recoverable, neutral for "nothing here".
 * No red: a shopper scanning a bag has done nothing wrong.
 */
const TYPE_COLORS: Record<ConsumerErrorType, { icon: string; bg: string }> = {
  offline: { icon: 'orange.500', bg: 'orange.50' },
  unreachable: { icon: 'orange.500', bg: 'orange.50' },
  server: { icon: 'orange.500', bg: 'orange.50' },
  not_found: { icon: 'gray.500', bg: 'gray.100' },
  qr_verification: { icon: 'orange.500', bg: 'orange.50' },
  general: { icon: 'orange.500', bg: 'orange.50' }
};

// Copy lives in i18n; these mirror the en-US values so a missing key never renders a raw ID.
const FALLBACK_COPY: Record<ErrorTypeKey, { title: string; message: string; tips: string[] }> = {
  offline: {
    title: "You're Offline",
    message: "We couldn't reach Trazo. Your device looks disconnected.",
    tips: [
      'Check your internet connection',
      'Try switching between WiFi and mobile data',
      'This page will retry on its own once you reconnect'
    ]
  },
  unreachable: {
    title: "Couldn't Reach Trazo",
    message: "The request didn't go through. That can be a weak signal or a hiccup on our side.",
    tips: [
      'Check your signal or WiFi',
      'Wait a moment and try again',
      'Contact support if it keeps happening'
    ]
  },
  server: {
    title: 'Trazo Is Having Trouble',
    message: 'This one is on us, not on your connection. Please try again in a moment.',
    tips: [
      'Nothing is wrong with your device or QR code',
      'Wait a moment and try again',
      'Contact support if it keeps happening'
    ]
  },
  notFound: {
    title: 'Product Not Found',
    message: 'This production may no longer be available or the link may be incorrect.',
    tips: [
      'Verify you scanned the correct QR code',
      'Check if the product is still available',
      'Contact the farm or supplier for assistance'
    ]
  },
  qrVerification: {
    title: 'QR Code Verification Failed',
    message:
      'This QR code could not be verified. Please try scanning again or contact support if the problem persists.',
    tips: [
      'Ensure good lighting when scanning',
      'Hold camera steady and at proper distance',
      'Check if QR code is damaged or obscured'
    ]
  },
  general: {
    title: 'Something Went Wrong',
    message:
      'We encountered an unexpected error. Please try again or contact support if the problem continues.',
    tips: [
      'Try refreshing the page',
      'Clear your browser cache',
      'Contact support if issue persists'
    ]
  }
};

export const ModernErrorState: React.FC<ModernErrorStateProps> = ({
  type,
  title,
  message,
  errorId,
  onRetry,
  showLearnMore = true
}) => {
  const intl = useIntl();
  const toast = useToast();
  const [isRetrying, setIsRetrying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  const typeKey = TYPE_TO_KEY[type];
  const iconComponent = TYPE_ICONS[type];
  const colors = TYPE_COLORS[type];

  const config = useMemo(() => {
    const fallback = FALLBACK_COPY[typeKey];
    return {
      title:
        title ||
        intl.formatMessage({
          id: `consumer.error.${typeKey}.title`,
          defaultMessage: fallback.title
        }),
      message:
        message ||
        intl.formatMessage({
          id: `consumer.error.${typeKey}.message`,
          defaultMessage: fallback.message
        }),
      suggestions: fallback.tips.map((tip, idx) =>
        intl.formatMessage({
          id: `consumer.error.${typeKey}.suggestion${idx + 1}`,
          defaultMessage: tip
        })
      )
    };
  }, [typeKey, title, message, intl]);

  // Cooldown ticker — one timeout per second, cleared on unmount
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const runRetry = useCallback(
    async (force = false) => {
      if (!onRetry || isRetrying) return;
      if (!force && cooldown > 0) return;

      const attemptIndex = attempts;
      setIsRetrying(true);
      setAttempts((a) => a + 1);

      try {
        await onRetry();
      } catch {
        // The parent owns error reporting; swallowing here keeps the recovery UI usable.
      } finally {
        setIsRetrying(false);
        const delayMs = RETRY_COOLDOWNS_MS[Math.min(attemptIndex, RETRY_COOLDOWNS_MS.length - 1)];
        if (delayMs > 0) setCooldown(Math.round(delayMs / 1000));
      }
    },
    [onRetry, isRetrying, cooldown, attempts]
  );

  // Reconnecting is the fix for an offline error — apply it without making the user tap
  useEffect(() => {
    if ((type !== 'offline' && type !== 'unreachable') || !onRetry) return undefined;
    const handleOnline = () => {
      setCooldown(0);
      void runRetry(true);
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [type, onRetry, runRetry]);

  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  // Pre-filled support email: a support request with no diagnostics is a dead end
  const supportHref = useMemo(() => {
    const subject = intl.formatMessage(
      {
        id: 'consumer.error.supportSubject',
        defaultMessage: 'Trazo scan issue ({reference})'
      },
      { reference: errorId || type }
    );
    const body = intl.formatMessage(
      {
        id: 'consumer.error.supportBody',
        defaultMessage:
          'Hi Trazo team,\n\nI could not open a product page after scanning a QR code.\n\nWhat happened: {type}\nPage: {url}\nReference: {reference}\n\n'
      },
      { type, url: pageUrl, reference: errorId || '—' }
    );
    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  }, [intl, errorId, type, pageUrl]);

  const handleCopy = useCallback(
    async (value: string, successId: string, successFallback: string) => {
      const success = await copyToClipboard(value);
      toast({
        title: success
          ? intl.formatMessage({ id: successId, defaultMessage: successFallback })
          : intl.formatMessage({
              id: 'consumer.error.copyFailed',
              defaultMessage: 'Could not copy to clipboard'
            }),
        status: success ? 'success' : 'warning',
        duration: 2000,
        isClosable: true
      });
    },
    [toast, intl]
  );

  const retryLabel = isRetrying
    ? intl.formatMessage({ id: 'consumer.error.retrying', defaultMessage: 'Retrying...' })
    : cooldown > 0
    ? intl.formatMessage(
        { id: 'consumer.error.retryIn', defaultMessage: 'Try Again in {seconds}s' },
        { seconds: cooldown }
      )
    : intl.formatMessage({ id: 'consumer.error.tryAgain', defaultMessage: 'Try Again' });

  return (
    <Container
      maxW="md"
      pt={{ base: '110px', md: '145px' }}
      pb={{ base: 10, md: 14 }}
      px={{ base: 4, md: 0 }}
    >
      <VStack spacing={5} w="full">
        <StandardCard variant="elevated">
          <VStack spacing={5} w="full" textAlign="center">
            {/* Decorative status glyph — the heading below carries the meaning */}
            <Circle size={{ base: '64px', md: '72px' }} bg={colors.bg} aria-hidden="true">
              <Icon as={iconComponent} boxSize={{ base: 6, md: 7 }} color={colors.icon} />
            </Circle>

            <VStack spacing={2} role="alert">
              <Text as="h1" fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold" color="gray.800">
                {config.title}
              </Text>
              <Text fontSize="sm" color="gray.600" lineHeight="1.6">
                {config.message}
              </Text>
            </VStack>

            {/* What to do next — neutral surface, no success chrome on unfinished steps */}
            <Box w="full" bg="gray.50" borderRadius="lg" p={4} textAlign="left">
              <Text
                fontSize="xs"
                fontWeight="semibold"
                color="gray.600"
                textTransform="uppercase"
                letterSpacing="0.04em"
                mb={2}
              >
                {intl.formatMessage({
                  id: 'consumer.error.troubleshooting',
                  defaultMessage: 'Troubleshooting Tips'
                })}
              </Text>
              <List spacing={2}>
                {config.suggestions.map((suggestion) => (
                  <ListItem key={suggestion} fontSize="sm" color="gray.600" lineHeight="1.5">
                    <ListIcon as={FaChevronRight} color="gray.500" boxSize={2.5} />
                    {suggestion}
                  </ListItem>
                ))}
              </List>
            </Box>

            {/* One dominant recovery action; everything else is secondary by weight */}
            <VStack spacing={3} w="full">
              {onRetry && (
                <StandardButton
                  variant="primary"
                  size="lg"
                  width="full"
                  onClick={() => void runRetry()}
                  isLoading={isRetrying}
                  loadingText={intl.formatMessage({
                    id: 'consumer.error.retrying',
                    defaultMessage: 'Retrying...'
                  })}
                  isDisabled={cooldown > 0}
                  leftIcon={<FaRedo />}
                >
                  {retryLabel}
                </StandardButton>
              )}
              {showLearnMore && (
                <Link
                  href="https://trazo.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  fontSize="sm"
                  fontWeight="medium"
                  color="green.700"
                  display="inline-flex"
                  alignItems="center"
                  gap={2}
                  py={2}
                  _hover={{ textDecoration: 'underline' }}
                >
                  {intl.formatMessage({
                    id: 'consumer.error.learnAboutTrazo',
                    defaultMessage: 'Learn About Trazo'
                  })}
                  <Icon as={FaExternalLinkAlt} boxSize={3} aria-hidden="true" />
                </Link>
              )}
            </VStack>
          </VStack>
        </StandardCard>

        {/* Support — a real mailto carrying diagnostics, not a string that looks like a link */}
        <VStack spacing={1} w="full">
          <Text fontSize="xs" color="gray.600" textAlign="center">
            {intl.formatMessage({
              id: 'consumer.error.needHelp',
              defaultMessage: 'Need help? Our support team is here to assist.'
            })}
          </Text>
          <HStack spacing={1}>
            <Link
              href={supportHref}
              fontSize="sm"
              fontWeight="medium"
              color="green.700"
              _hover={{ textDecoration: 'underline' }}
            >
              {SUPPORT_EMAIL}
            </Link>
            <IconButton
              size="xs"
              icon={<FaCopy />}
              aria-label={intl.formatMessage({
                id: 'consumer.error.copyEmailAria',
                defaultMessage: 'Copy support email'
              })}
              variant="ghost"
              colorScheme="gray"
              onClick={() =>
                void handleCopy(SUPPORT_EMAIL, 'consumer.error.emailCopied', 'Email copied!')
              }
            />
          </HStack>
          {errorId && (
            <HStack spacing={1}>
              <Text fontSize="xs" color="gray.600" fontFamily="mono">
                {intl.formatMessage({
                  id: 'consumer.error.errorIdLabel',
                  defaultMessage: 'Error ID for support:'
                })}{' '}
                {errorId}
              </Text>
              <IconButton
                size="xs"
                icon={<FaCopy />}
                aria-label={intl.formatMessage({
                  id: 'consumer.error.copyErrorIdAria',
                  defaultMessage: 'Copy error reference'
                })}
                variant="ghost"
                colorScheme="gray"
                onClick={() =>
                  void handleCopy(errorId, 'consumer.error.errorIdCopied', 'Error ID copied!')
                }
              />
            </HStack>
          )}
        </VStack>

        <VStack spacing={2} w="full">
          <Divider maxW="120px" />
          <Text fontSize="xs" color="gray.600">
            {intl.formatMessage({
              id: 'consumer.error.poweredBy',
              defaultMessage: 'Powered by Trazo Agricultural Transparency'
            })}
          </Text>
        </VStack>
      </VStack>
    </Container>
  );
};

export default ModernErrorState;
