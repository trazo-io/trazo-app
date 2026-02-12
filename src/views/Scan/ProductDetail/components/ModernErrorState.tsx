import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  useColorModeValue,
  Icon,
  Container,
  Circle,
  Divider,
  Stack,
  useToast,
  IconButton
} from '@chakra-ui/react';
import {
  FaExclamationTriangle,
  FaQrcode,
  FaRedo,
  FaShieldAlt,
  FaLeaf,
  FaQuestionCircle,
  FaCopy,
  FaExternalLinkAlt
} from 'react-icons/fa';
import {
  StandardCard,
  StandardButton,
  CollapsibleSection
} from 'components/Design/StandardComponents';

// Support email - single source of truth
const SUPPORT_EMAIL = 'support@trazo.io';

interface ModernErrorStateProps {
  type: 'qr_verification' | 'network' | 'not_found' | 'general';
  title?: string;
  message?: string;
  errorId?: string;
  onRetry?: () => void;
  /** Optional: Show "Learn About Trazo" button linking to website */
  showLearnMore?: boolean;
}

export const ModernErrorState: React.FC<ModernErrorStateProps> = ({
  type,
  title,
  message,
  errorId,
  onRetry,
  showLearnMore = true
}) => {
  const toast = useToast();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Trazo design system colors
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  // Focus management for accessibility
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const getErrorConfig = () => {
    const configs = {
      qr_verification: {
        icon: FaQrcode,
        title: title || 'QR Code Verification Failed',
        message:
          message ||
          'This QR code could not be verified. Please try scanning again or contact support if the problem persists.',
        iconColor: 'red.500',
        iconBg: 'red.100',
        suggestions: [
          'Ensure good lighting when scanning',
          'Hold camera steady and at proper distance',
          'Check if QR code is damaged or obscured'
        ]
      },
      network: {
        icon: FaExclamationTriangle,
        title: title || 'Unable to Load Product',
        message:
          message || 'Please check your connection and try again, or scan a different product.',
        iconColor: 'orange.500',
        iconBg: 'orange.100',
        suggestions: [
          'Check your internet connection',
          'Try switching between WiFi and mobile data',
          'Wait a moment and retry'
        ]
      },
      not_found: {
        icon: FaQrcode,
        title: title || 'Product Not Found',
        message:
          message ||
          'This product information is not available. It may have been removed or the QR code is invalid.',
        iconColor: 'gray.500',
        iconBg: 'gray.100',
        suggestions: [
          'Verify you scanned the correct QR code',
          'Check if the product is still available',
          'Contact the farm or supplier for assistance'
        ]
      },
      general: {
        icon: FaExclamationTriangle,
        title: title || 'Something went wrong',
        message:
          message ||
          'We encountered an unexpected error. Please try again or contact support if the problem continues.',
        iconColor: 'red.500',
        iconBg: 'red.100',
        suggestions: [
          'Try refreshing the page',
          'Clear your browser cache',
          'Contact support if issue persists'
        ]
      }
    };
    return configs[type];
  };

  const config = getErrorConfig();

  // Smart retry handler with rate limiting
  const handleRetry = useCallback(async () => {
    if (retryCount >= maxRetries || !onRetry || isRetrying) return;

    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);

    try {
      onRetry();
    } finally {
      // Prevent spam clicking
      setTimeout(() => setIsRetrying(false), 2000);
    }
  }, [onRetry, retryCount, isRetrying]);

  // Copy email to clipboard
  const handleCopyEmail = useCallback(() => {
    navigator.clipboard.writeText(SUPPORT_EMAIL);
    toast({
      title: 'Email copied!',
      status: 'success',
      duration: 2000,
      isClosable: true
    });
  }, [toast]);

  // Copy error ID to clipboard
  const handleCopyErrorId = useCallback(() => {
    if (errorId) {
      navigator.clipboard.writeText(errorId);
      toast({
        title: 'Error ID copied!',
        description: 'Share this with support for faster help.',
        status: 'success',
        duration: 2000,
        isClosable: true
      });
    }
  }, [errorId, toast]);

  return (
    <Container maxW="2xl" py={{ base: 6, md: 8 }} px={{ base: 4, md: 6 }}>
      <VStack spacing={6} textAlign="center" pt="100px" role="alert" aria-live="polite">
        {/* Main Error Card - Using StandardCard */}
        <StandardCard variant="elevated" padding={{ base: 6, md: 8 }}>
          <VStack spacing={6}>
            {/* Error Icon */}
            <Circle size="80px" bg={config.iconBg}>
              <Icon as={config.icon} boxSize={8} color={config.iconColor} />
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
              <Text fontSize="md" color={mutedColor} lineHeight="1.6" maxW="md">
                {config.message}
              </Text>
            </VStack>

            {/* Action Buttons - Responsive layout */}
            <Stack direction={{ base: 'column', md: 'row' }} spacing={3} w="full" justify="center">
              {onRetry && (
                <StandardButton
                  variant="primary"
                  size="lg"
                  width="full"
                  onClick={handleRetry}
                  isLoading={isRetrying}
                  loadingText="Retrying..."
                  isDisabled={retryCount >= maxRetries}
                  leftIcon={<FaRedo />}
                >
                  {retryCount > 0 ? `Try Again (${maxRetries - retryCount} left)` : 'Try Again'}
                </StandardButton>
              )}
              {showLearnMore && (
                <StandardButton
                  variant="outline"
                  size="lg"
                  width="full"
                  onClick={() => window.open('https://trazo.io', '_blank')}
                  leftIcon={<FaLeaf />}
                  rightIcon={<FaExternalLinkAlt size={12} />}
                >
                  Learn About Trazo
                </StandardButton>
              )}
            </Stack>

            {/* Error ID for support - Transparency element */}
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
                  Error ID for support:
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

        {/* Trust Recovery Card - Reassure users during error */}
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
                Your scan is private and secure
              </Text>
              <Text fontSize="xs" color="green.600">
                This error doesn't affect your data or privacy
              </Text>
            </VStack>
          </HStack>
        </Box>

        {/* Support Information - Correct email */}
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
              Need help? Our support team is here to assist.
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

        {/* Trazo Branding Footer */}
        <VStack spacing={2}>
          <HStack spacing={4} fontSize="xs" color={mutedColor} opacity={0.8}>
            <HStack spacing={1}>
              <Icon as={FaShieldAlt} />
              <Text>Secure</Text>
            </HStack>
            <HStack spacing={1}>
              <Icon as={FaLeaf} />
              <Text>Sustainable</Text>
            </HStack>
          </HStack>
          <Divider maxW="xs" />
          <Text fontSize="xs" color={mutedColor} opacity={0.6}>
            Powered by Trazo Agricultural Transparency
          </Text>
        </VStack>
      </VStack>
    </Container>
  );
};

export default ModernErrorState;
