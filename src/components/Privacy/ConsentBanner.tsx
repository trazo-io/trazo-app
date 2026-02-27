import React, { useState, useEffect } from 'react';
import {
  Box,
  Text,
  Button,
  HStack,
  VStack,
  useColorModeValue,
  Icon,
  Slide,
  Link,
  CloseButton
} from '@chakra-ui/react';
import { FaShieldAlt, FaChartLine } from 'react-icons/fa';

interface ConsentBannerProps {
  onConsentChange?: (consent: boolean) => void;
}

const CONSENT_STORAGE_KEY = 'trazo-analytics-consent';

export const ConsentBanner: React.FC<ConsentBannerProps> = ({ onConsentChange }) => {
  const [consentGiven, setConsentGiven] = useState<boolean | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.700', 'gray.200');

  useEffect(() => {
    // Only show banner on consumer-facing pages that track analytics
    const shouldShowBanner = () => {
      const path = window.location.pathname;
      const host = window.location.host;

      // Only show on consumer pages or QR scanning pages
      const isConsumerPage =
        path.includes('/production/') ||
        path.includes('/establishment/') ||
        host.includes('consumer');

      // Don't show on producer auth pages
      const isProducerAuth =
        path.includes('/auth/') &&
        (host.includes('app.') || host.includes('app-') || !host.includes('consumer'));

      return isConsumerPage && !isProducerAuth;
    };

    if (!shouldShowBanner()) {
      setIsVisible(false);
      return;
    }

    // Check if consent has been given before
    const storedConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
    const cookieConsent = document.cookie
      .split('; ')
      .find((row) => row.startsWith('trazo-analytics-consent='))
      ?.split('=')[1];

    if (storedConsent || cookieConsent) {
      const consent = storedConsent === 'true' || cookieConsent === 'true';
      setConsentGiven(consent);
      setIsVisible(false);
    } else {
      // Show banner immediately for QR pages to prevent API calls without consent
      const isQRPage = window.location.pathname.includes('/production/');
      const delay = isQRPage ? 100 : 2000; // Almost immediate for QR pages
      setTimeout(() => setIsVisible(true), delay);
    }
  }, []);

  const handleConsent = (consent: boolean) => {
    console.log('🔒 ConsentBanner handleConsent called:', {
      consent,
      timestamp: new Date().toISOString()
    });

    setConsentGiven(consent);
    setIsVisible(false);

    // Store consent in localStorage and cookie
    localStorage.setItem(CONSENT_STORAGE_KEY, consent.toString());
    console.log('📦 Stored in localStorage:', localStorage.getItem(CONSENT_STORAGE_KEY));

    // Set cookie with 1 year expiration and proper domain handling
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    // Handle localhost development domain issues
    const hostname = window.location.hostname;
    let cookieString = `trazo-analytics-consent=${consent}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;

    // For localhost development, also set a more permissive cookie
    if (hostname.includes('localhost')) {
      cookieString += `; domain=localhost`;
    }

    document.cookie = cookieString;
    console.log('🍪 Set cookie:', cookieString);
    console.log('🍪 Current cookies:', document.cookie);

    // Also set a backup cookie without domain restriction for localhost
    if (hostname.includes('localhost')) {
      const backupCookieString = `trazo-analytics-consent=${consent}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
      document.cookie = backupCookieString;
      console.log('🍪 Set backup cookie:', backupCookieString);
    }

    // Notify parent component
    onConsentChange?.(consent);

    // Dispatch custom event for page-level listeners
    const customEvent = new CustomEvent('trazo-consent-changed', {
      detail: { consent }
    });
    window.dispatchEvent(customEvent);
    console.log('📡 Dispatched custom event:', customEvent);

    // Log consent decision (for debugging)
    console.log('🔒 Privacy consent:', consent ? 'granted' : 'declined');

    // Verify storage after setting
    setTimeout(() => {
      console.log('🔍 Verification after consent set:', {
        localStorage: localStorage.getItem(CONSENT_STORAGE_KEY),
        cookies: document.cookie.split(';').find((c) => c.includes('trazo-analytics-consent')),
        hasAnalyticsConsent: hasAnalyticsConsent()
      });
    }, 100);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Set temporary session storage to prevent banner from showing again in this session
    sessionStorage.setItem('trazo-consent-dismissed', 'true');
  };

  // Additional check: only show on consumer/QR pages
  const shouldRenderBanner = () => {
    const path = window.location.pathname;
    const host = window.location.host;

    const isConsumerPage =
      path.includes('/production/') ||
      path.includes('/establishment/') ||
      host.includes('consumer');

    const isProducerAuth =
      path.includes('/auth/') &&
      (host.includes('app.') || host.includes('app-') || !host.includes('consumer'));

    return isConsumerPage && !isProducerAuth;
  };

  // Don't show if consent already given, dismissed, or not a consumer page
  if (
    consentGiven !== null ||
    !isVisible ||
    sessionStorage.getItem('trazo-consent-dismissed') ||
    !shouldRenderBanner()
  ) {
    return null;
  }

  return (
    <Slide direction="bottom" in={isVisible} style={{ zIndex: 10000 }}>
      <Box
        position="fixed"
        bottom={{ base: '80px', xl: 0 }}
        left={0}
        right={0}
        bg={bgColor}
        borderTop="1px"
        borderColor={borderColor}
        boxShadow="lg"
        p={4}
        mx={4}
        mb={4}
        borderRadius="xl"
        maxW="600px"
        ml="auto"
        mr="auto"
      >
        <VStack spacing={4} align="stretch">
          {/* Header */}
          <HStack justify="space-between">
            <HStack spacing={2}>
              <Icon as={FaShieldAlt} color="green.500" boxSize={5} />
              <Text fontSize="lg" fontWeight="600" color={textColor}>
                Privacy & Analytics
              </Text>
            </HStack>
            <CloseButton size="sm" onClick={handleDismiss} aria-label="Dismiss consent banner" />
          </HStack>

          {/* Content */}
          <VStack spacing={3} align="stretch">
            <Text fontSize="sm" color={textColor} lineHeight="1.5">
              Help us improve carbon transparency by allowing anonymous analytics. We use
              privacy-safe methods to understand how consumers interact with sustainability
              information.
            </Text>

            <HStack spacing={2} fontSize="xs" color="gray.500">
              <Icon as={FaChartLine} />
              <Text>No personal data stored • IP addresses hashed • GDPR compliant</Text>
            </HStack>

            <Text fontSize="xs" color="gray.500">
              Learn more about our{' '}
              <Link color="green.500" href="https://trazo.io/privacy-policy" isExternal textDecoration="underline">
                privacy policy
              </Link>{' '}
              and{' '}
              <Link color="green.500" href="/data-handling" isExternal textDecoration="underline">
                data handling practices
              </Link>
              .
            </Text>
          </VStack>

          {/* Actions */}
          <HStack spacing={3} justify="flex-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleConsent(false)}
              _hover={{ bg: 'gray.100' }}
            >
              Essential Only
            </Button>
            <Button
              size="sm"
              colorScheme="green"
              onClick={() => handleConsent(true)}
              _hover={{ transform: 'translateY(-1px)', boxShadow: 'md' }}
            >
              Accept Analytics
            </Button>
          </HStack>
        </VStack>
      </Box>
    </Slide>
  );
};

/**
 * Utility function to check if analytics consent has been given
 */
export const hasAnalyticsConsent = (): boolean => {
  const storedConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
  const cookieConsent = document.cookie
    .split('; ')
    .find((row) => row.startsWith('trazo-analytics-consent='))
    ?.split('=')[1];

  return storedConsent === 'true' || cookieConsent === 'true';
};

/**
 * Utility function to get consent status
 */
export const getConsentStatus = (): 'granted' | 'denied' | 'unknown' => {
  const storedConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
  const cookieConsent = document.cookie
    .split('; ')
    .find((row) => row.startsWith('trazo-analytics-consent='))
    ?.split('=')[1];

  if (storedConsent === 'true' || cookieConsent === 'true') {
    return 'granted';
  } else if (storedConsent === 'false' || cookieConsent === 'false') {
    return 'denied';
  } else {
    return 'unknown';
  }
};

export default ConsentBanner;
