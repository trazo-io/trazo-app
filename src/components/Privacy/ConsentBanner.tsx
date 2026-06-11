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
  // Layered notice: layer 1 is a one-line summary; full Art. 13 text expands.
  const [showDetails, setShowDetails] = useState(false);

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
        path.includes('/farm/') ||
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

    // Listen for consent reset (e.g. "Privacy Settings" footer link)
    const handleReset = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.consent === null) {
        setConsentGiven(null);
        setIsVisible(true);
      }
    };

    window.addEventListener('trazo-consent-changed', handleReset);
    return () => window.removeEventListener('trazo-consent-changed', handleReset);
  }, []);

  const handleConsent = (consent: boolean) => {
    setConsentGiven(consent);
    setIsVisible(false);

    // Store consent in localStorage and cookie
    localStorage.setItem(CONSENT_STORAGE_KEY, consent.toString());

    // Set cookie with 1 year expiration, Secure flag on HTTPS, proper domain
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const hostname = window.location.hostname;
    const isSecure = window.location.protocol === 'https:';
    let cookieString = `trazo-analytics-consent=${consent}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax${isSecure ? '; Secure' : ''}`;

    if (hostname.includes('localhost')) {
      cookieString += `; domain=localhost`;
    }

    document.cookie = cookieString;

    // Also set a backup cookie without domain restriction for localhost
    if (hostname.includes('localhost')) {
      const backupCookieString = `trazo-analytics-consent=${consent}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
      document.cookie = backupCookieString;
    }

    // Notify parent component
    onConsentChange?.(consent);

    // Dispatch custom event for page-level listeners
    const customEvent = new CustomEvent('trazo-consent-changed', {
      detail: { consent }
    });
    window.dispatchEvent(customEvent);
  };

  const handleDismiss = () => {
    // GDPR: Dismissal must have the same effect as declining (EDPB dark pattern guidelines).
    // Closing the banner without choosing = rejection of non-essential tracking.
    handleConsent(false);
  };

  // Additional check: only show on consumer/QR pages
  const shouldRenderBanner = () => {
    const path = window.location.pathname;
    const host = window.location.host;

    const isConsumerPage =
      path.includes('/production/') ||
      path.includes('/farm/') ||
      host.includes('consumer');

    const isProducerAuth =
      path.includes('/auth/') &&
      (host.includes('app.') || host.includes('app-') || !host.includes('consumer'));

    return isConsumerPage && !isProducerAuth;
  };

  // Don't show if consent already decided or not a consumer page
  if (consentGiven !== null || !isVisible || !shouldRenderBanner()) {
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
        {/* Layered notice (2026-06): the full GDPR Art. 13 wall was the FIRST
            thing every scanner saw, ahead of any product content — a heavy
            cost against a shopper's 8-15s attention budget. Layer 1 is one
            sentence + buttons; the complete disclosure stays one tap away
            ("Details"), which satisfies the EDPB layered-notice approach.
            Dismissal still equals decline; buttons keep identical styling. */}
        <VStack spacing={3} align="stretch">
          {/* Header + summary line */}
          <HStack justify="space-between" align="start">
            <HStack spacing={2} align="start">
              <Icon as={FaShieldAlt} color="green.500" boxSize={5} mt={0.5} />
              <Text fontSize="sm" color={textColor} lineHeight="1.5">
                Allow an anonymous scan count for this farmer's dashboard? No name, email, or raw
                IP is stored.{' '}
                <Box
                  as="button"
                  type="button"
                  color="green.600"
                  textDecoration="underline"
                  onClick={() => setShowDetails(!showDetails)}
                  aria-expanded={showDetails}
                >
                  {showDetails ? 'Hide details' : 'Details'}
                </Box>
              </Text>
            </HStack>
            <CloseButton size="sm" onClick={handleDismiss} aria-label="Decline analytics" />
          </HStack>

          {/* Layer 2 — full GDPR Art. 13 disclosures */}
          {showDetails && (
            <VStack spacing={3} align="stretch">
              <Text fontSize="sm" color={textColor} lineHeight="1.5">
                Scanning this QR code can record an anonymous visit for the farmer's analytics
                dashboard. We collect: approximate location (country/region), time spent on page,
                and a one-way hashed device identifier. No name, email, or raw IP address is
                stored.
              </Text>

              <Text fontSize="sm" color={textColor} lineHeight="1.5">
                If you create an account, your previous scan activity will be linked to your
                profile and appear in your scan history.
              </Text>

              <HStack spacing={2} fontSize="xs" color="gray.500">
                <Icon as={FaChartLine} />
                <Text>Data retained 12 months (accepted) or 7 days (declined)</Text>
              </HStack>

              <Text fontSize="xs" color="gray.500">
                Data controller: Trazo (privacy@trazo.io).{' '}
                <Link
                  color="green.500"
                  href="https://trazo.io/privacy-policy"
                  isExternal
                  textDecoration="underline"
                >
                  Privacy policy
                </Link>
              </Text>
            </VStack>
          )}

          {/* Actions — identical styling (GDPR button parity, Austrian Court 2025) */}
          <HStack spacing={3} justify="flex-end">
            <Button
              size="sm"
              variant="outline"
              colorScheme="gray"
              onClick={() => handleConsent(false)}
            >
              Decline Analytics
            </Button>
            <Button
              size="sm"
              variant="outline"
              colorScheme="gray"
              onClick={() => handleConsent(true)}
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

/**
 * Reset consent — allows users to change their preference (GDPR Art. 7(3)).
 * Call this from a "Privacy Settings" link to re-show the consent banner.
 */
export const resetConsent = (): void => {
  localStorage.removeItem(CONSENT_STORAGE_KEY);
  // Clear cookie by setting past expiry
  document.cookie =
    'trazo-analytics-consent=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';
  if (window.location.hostname.includes('localhost')) {
    document.cookie =
      'trazo-analytics-consent=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax; domain=localhost';
  }
  // Dispatch event so listening components can react
  window.dispatchEvent(new CustomEvent('trazo-consent-changed', { detail: { consent: null } }));
};

export default ConsentBanner;
