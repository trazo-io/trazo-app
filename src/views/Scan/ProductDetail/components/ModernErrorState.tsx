import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Container,
  Circle,
  Divider,
  Stack,
  useToast,
  IconButton,
  Link,
  List,
  ListItem,
  ListIcon
} from '@chakra-ui/react';
import {
  FaExclamationTriangle,
  FaQrcode,
  FaRedo,
  FaShieldAlt,
  FaLeaf,
  FaCopy,
  FaExternalLinkAlt,
  FaCheckCircle
} from 'react-icons/fa';
import { StandardCard, StandardButton } from 'components/Design/StandardComponents';
import { useIntl } from 'react-intl';

// Support email - single source of truth
const SUPPORT_EMAIL = 'support@trazo.io';

// Exponential backoff delays (ms)
const RETRY_DELAYS = [2000, 4000, 8000];

interface ModernErrorStateProps {
  type: 'qr_verification' | 'network' | 'not_found' | 'general';
  title?: string;
  message?: string;
  errorId?: string;
  onRetry?: () => void;
  /** Optional: Show "Learn About Trazo" button linking to website */
  showLearnMore?: boolean;
}

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

type ErrorTypeKey = 'qrVerification' | 'network' | 'notFound' | 'general';

const TYPE_TO_KEY: Record<ModernErrorStateProps['type'], ErrorTypeKey> = {
  qr_verification: 'qrVerification',
  network: 'network',
  not_found: 'notFound',
  general: 'general'
};

const TYPE_ICONS: Record<ModernErrorStateProps['type'], React.ComponentType> = {
  qr_verification: FaQrcode,
  network: FaExclamationTriangle,
  not_found: FaQrcode,
  general: FaExclamationTriangle
};

const TYPE_COLORS: Record<ModernErrorStateProps['type'], { icon: string; bg: string }> = {
  qr_verification: { icon: 'red.500', bg: 'red.100' },
  network: { icon: 'orange.500', bg: 'orange.100' },
  not_found: { icon: 'gray.500', bg: 'gray.100' },
  general: { icon: 'red.500', bg: 'red.100' }
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
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Focus management for accessibility
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const typeKey = TYPE_TO_KEY[type];
  const iconComponent = TYPE_ICONS[type];
  const colors = TYPE_COLORS[type];

  const config = useMemo(
    () => ({
      title:
        title ||
        intl.formatMessage({ id: `consumer.error.${typeKey}.title` }),
      message:
        message ||
        intl.formatMessage({ id: `consumer.error.${typeKey}.message` }),
      suggestions: [
        intl.formatMessage({ id: `consumer.error.${typeKey}.suggestion1` }),
        intl.formatMessage({ id: `consumer.error.${typeKey}.suggestion2` }),
        intl.formatMessage({ id: `consumer.error.${typeKey}.suggestion3` })
      ]
    }),
    [type, title, message, intl]
  );

  // Smart retry handler with exponential backoff
  const handleRetry = useCallback(async () => {
    if (retryCount >= maxRetries || !onRetry || isRetrying) return;

    setIsRetrying(true);
    const currentRetry = retryCount;
    setRetryCount((prev) => prev + 1);

    try {
      onRetry();
    } finally {
      const delay = RETRY_DELAYS[currentRetry] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      setTimeout(() => setIsRetrying(false), delay);
    }
  }, [onRetry, retryCount, isRetrying]);

  // Copy email to clipboard
  const handleCopyEmail = useCallback(async () => {
    const success = await copyToClipboard(SUPPORT_EMAIL);
    toast({
      title: success
        ? intl.formatMessage({ id: 'consumer.error.emailCopied' })
        : intl.formatMessage({ id: 'consumer.error.copyFailed' }),
      status: success ? 'success' : 'warning',
      duration: 2000,
      isClosable: true
    });
  }, [toast, intl]);

  // Copy error ID to clipboard
  const handleCopyErrorId = useCallback(async () => {
    if (!errorId) return;
    const success = await copyToClipboard(errorId);
    toast({
      title: success
        ? intl.formatMessage({ id: 'consumer.error.errorIdCopied' })
        : intl.formatMessage({ id: 'consumer.error.copyFailed' }),
      description: success
        ? intl.formatMessage({ id: 'consumer.error.errorIdCopiedDesc' })
        : undefined,
      status: success ? 'success' : 'warning',
      duration: 2000,
      isClosable: true
    });
  }, [errorId, toast, intl]);

  const attemptsLeft = maxRetries - retryCount;

  return (
    <Container maxW="2xl" py={{ base: 6, md: 8 }} px={{ base: 4, md: 6 }}>
      <VStack spacing={6} textAlign="center" pt="145px" role="alert" aria-live="polite">
        {/* Main Error Card */}
        <StandardCard variant="elevated" padding={{ base: 6, md: 8 }}>
          <VStack spacing={6}>
            {/* Error Icon */}
            <Circle size="80px" bg={colors.bg}>
              <Icon as={iconComponent} boxSize={8} color={colors.icon} />
            </Circle>

            {/* Error Title and Message */}
            <VStack spacing={3}>
              <Text
                as="h1"
                fontSize="xl"
                fontWeight="bold"
                color="gray.800"
                ref={headingRef}
                tabIndex={-1}
                outline="none"
              >
                {config.title}
              </Text>
              <Text fontSize="md" color="gray.600" lineHeight="1.6" maxW="md">
                {config.message}
              </Text>
            </VStack>

            {/* Troubleshooting Suggestions */}
            <Box w="full" maxW="sm" textAlign="left">
              <Text fontSize="xs" fontWeight="semibold" color="gray.500" mb={2} textAlign="center">
                {intl.formatMessage({ id: 'consumer.error.troubleshooting' })}
              </Text>
              <List spacing={1}>
                {config.suggestions.map((suggestion, idx) => (
                  <ListItem key={idx} fontSize="sm" color="gray.600">
                    <ListIcon as={FaCheckCircle} color="green.400" boxSize={3} />
                    {suggestion}
                  </ListItem>
                ))}
              </List>
            </Box>

            {/* Action Buttons */}
            <Stack direction={{ base: 'column', md: 'row' }} spacing={3} w="full" justify="center">
              {onRetry && (
                <StandardButton
                  variant="primary"
                  size="lg"
                  width="full"
                  onClick={handleRetry}
                  isLoading={isRetrying}
                  loadingText={intl.formatMessage({ id: 'consumer.error.retrying' })}
                  isDisabled={retryCount >= maxRetries}
                  leftIcon={<FaRedo />}
                >
                  {retryCount > 0
                    ? intl.formatMessage(
                        { id: 'consumer.error.tryAgainWithCount' },
                        { attemptsLeft }
                      )
                    : intl.formatMessage({ id: 'consumer.error.tryAgain' })}
                </StandardButton>
              )}
              {showLearnMore && (
                <StandardButton
                  as={Link}
                  href="https://trazo.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outline"
                  size="lg"
                  width="full"
                  leftIcon={<FaLeaf />}
                  rightIcon={<FaExternalLinkAlt size={12} />}
                  _hover={{ textDecoration: 'none', bg: 'gray.50' }}
                >
                  {intl.formatMessage({ id: 'consumer.error.learnAboutTrazo' })}
                </StandardButton>
              )}
            </Stack>

            {/* Error ID for support */}
            {errorId && (
              <VStack
                spacing={1}
                align="center"
                w="full"
                pt={4}
                borderTop="1px"
                borderColor="gray.200"
              >
                <Text fontSize="xs" color="gray.500">
                  {intl.formatMessage({ id: 'consumer.error.errorIdLabel' })}
                </Text>
                <HStack spacing={2}>
                  <Text fontSize="xs" color="gray.600" fontFamily="mono">
                    {errorId}
                  </Text>
                  <IconButton
                    size="xs"
                    icon={<FaCopy />}
                    aria-label="Copy error ID"
                    variant="ghost"
                    colorScheme="gray"
                    onClick={handleCopyErrorId}
                  />
                </HStack>
              </VStack>
            )}
          </VStack>
        </StandardCard>

        {/* Trust Recovery Card */}
        <Box
          bg="green.50"
          border="1px solid"
          borderColor="green.200"
          borderRadius="xl"
          p={4}
          w="full"
          maxW="lg"
        >
          <HStack spacing={3} justify="center">
            <Icon as={FaShieldAlt} color="green.600" boxSize={5} />
            <VStack align="start" spacing={0}>
              <Text fontSize="sm" fontWeight="semibold" color="green.700">
                {intl.formatMessage({ id: 'consumer.error.scanPrivate' })}
              </Text>
              <Text fontSize="xs" color="green.600">
                {intl.formatMessage({ id: 'consumer.error.scanPrivateDesc' })}
              </Text>
            </VStack>
          </HStack>
        </Box>

        {/* Support Information */}
        <Box
          bg="blue.50"
          border="1px solid"
          borderColor="blue.200"
          borderLeft="4px solid"
          borderLeftColor="blue.500"
          borderRadius="lg"
          p={4}
          w="full"
          maxW="lg"
        >
          <VStack spacing={2}>
            <Text fontSize="sm" color="blue.700" fontWeight="medium">
              {intl.formatMessage({ id: 'consumer.error.needHelp' })}
            </Text>
            <HStack spacing={2}>
              <Text fontSize="sm" color="blue.600" fontWeight="medium">
                {SUPPORT_EMAIL}
              </Text>
              <IconButton
                size="xs"
                icon={<FaCopy />}
                aria-label="Copy support email"
                variant="ghost"
                colorScheme="blue"
                onClick={handleCopyEmail}
              />
            </HStack>
          </VStack>
        </Box>

        {/* Minimal Branding Footer */}
        <VStack spacing={2}>
          <Divider maxW="xs" />
          <Text fontSize="xs" color="gray.400">
            {intl.formatMessage({ id: 'consumer.error.poweredBy' })}
          </Text>
        </VStack>
      </VStack>
    </Container>
  );
};

export default ModernErrorState;
