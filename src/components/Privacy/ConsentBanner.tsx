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
import { useIntl } from 'react-intl';

interface ConsentBannerProps {
  onConsentChange?: (consent: boolean) => void;
}

const CONSENT_STORAGE_KEY = 'trazo-analytics-consent';

/**
 * Read the consent cookie — the ONLY thing the backend sees.
 *
 * localStorage is the durable record of the visitor's decision; this cookie is how
 * that decision reaches the API. The two are not interchangeable, and code that
 * treats them as one (`storedConsent || cookieConsent`) is how a visitor ends up
 * silently un-consented server-side.
 */
export const readConsentCookie = (): string | undefined =>
  document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${CONSENT_STORAGE_KEY}=`))
    ?.split('=')[1];

/**
 * Write the consent cookie so it reaches the API on a sibling subdomain.
 *
 * Scoped to the registrable domain (consumer/app.trazo.io → api.trazo.io). Without a
 * domain attribute the cookie is host-only, never reaches api.trazo.io, and the
 * backend records every scan as anonymous — no geolocation, no session dedup.
 *
 * ⚠️ The 1-year expiry is a REQUEST, not a guarantee. Safari's ITP caps cookies
 * written by document.cookie at 7 days, and iOS Safari is the browser most QR codes
 * are scanned with. localStorage is not capped, so the two WILL drift apart — see
 * the self-heal in the mount effect.
 */
const writeConsentCookie = (consent: boolean): void => {
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);

  const hostname = window.location.hostname;
  const isSecure = window.location.protocol === 'https:';

  const cookieDomain = hostname.endsWith('trazo.io')
    ? '.trazo.io'
    : hostname.includes('localhost')
    ? 'localhost'
    : '';

  let cookieString = `${CONSENT_STORAGE_KEY}=${consent}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax${
    isSecure ? '; Secure' : ''
  }`;
  if (cookieDomain) {
    cookieString += `; domain=${cookieDomain}`;
  }

  document.cookie = cookieString;

  // Also set a host-only backup cookie on localhost (domain=localhost can be flaky)
  if (hostname.includes('localhost')) {
    document.cookie = `${CONSENT_STORAGE_KEY}=${consent}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
  }
};

export const ConsentBanner: React.FC<ConsentBannerProps> = ({ onConsentChange }) => {
  const intl = useIntl();
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
      const isConsumerPage = path.includes('/production/') || host.includes('consumer');

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
    const cookieConsent = readConsentCookie();

    if (storedConsent || cookieConsent) {
      const consent = storedConsent === 'true' || cookieConsent === 'true';
      setConsentGiven(consent);
      setIsVisible(false);

      // SELF-HEAL. The banner is suppressed whenever localStorage holds anything, and
      // the backend only ever sees the cookie — so once the two drift apart the visitor
      // is stranded: no banner to re-accept, no cookie to send, no recovery path, and a
      // permanently empty location. They DO drift: Safari's ITP caps a script-written
      // cookie at 7 days while localStorage is uncapped, and "clear cookies" in any
      // browser leaves localStorage intact.
      //
      // The decision was already given and consent does not lapse in 7 days, so
      // re-establishing the transport from the durable record re-prompts nobody. Only
      // ever re-writes an ACCEPT: an absent cookie already means "no consent", so a
      // decline needs no repair.
      if (consent && cookieConsent !== 'true') {
        writeConsentCookie(true);
        // Tell ProductDetail, whose scan for THIS page view already went out without the
        // cookie and is sitting anonymous. Its listener upgrades that row in place.
        window.dispatchEvent(
          new CustomEvent('trazo-consent-changed', { detail: { consent: true } })
        );
      }
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
    writeConsentCookie(consent);

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

    const isConsumerPage = path.includes('/production/') || host.includes('consumer');

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
        mr="auto">
        {/* Layered notice (2026-06): the full GDPR Art. 13 wall was the FIRST
            thing every scanner saw, ahead of any product content — a heavy
            cost against a shopper's 8-15s attention budget. Layer 1 is one
            sentence + buttons; the complete disclosure stays one tap away
            ("What this means"), which satisfies the EDPB layered-notice approach.
            Dismissal still equals decline; buttons keep identical styling. */}
        <VStack spacing={3} align="stretch">
          {/* Header + summary line */}
          <HStack justify="space-between" align="start">
            <HStack spacing={2} align="start">
              <Icon as={FaShieldAlt} color="green.500" boxSize={5} mt={0.5} />
              <Text fontSize="sm" color={textColor} lineHeight="1.5">
                {/* This line used to read "Allow an anonymous scan count... No name, email or raw
                    IP is stored" — which describes DECLINING. The count is recorded either way
                    (`anonymous_mode` server-side); what Accept actually adds is approximate
                    location, time on page and hashed device/session identifiers. Consent has to
                    be specific and informed (GDPR Art. 4(11)), so layer 1 now names the thing
                    being asked for rather than reassuring about the thing that never happens. */}
                {intl.formatMessage({ id: 'app.consentSummary' })}{' '}
                <Box
                  as="button"
                  type="button"
                  color="green.700"
                  textDecoration="underline"
                  onClick={() => setShowDetails(!showDetails)}
                  aria-expanded={showDetails}>
                  {intl.formatMessage({
                    id: showDetails ? 'app.consentHideDetails' : 'app.consentShowDetails'
                  })}
                </Box>
              </Text>
            </HStack>
            <CloseButton
              size="sm"
              onClick={handleDismiss}
              aria-label={intl.formatMessage({ id: 'app.consentDeclineAria' })}
            />
          </HStack>

          {/* Layer 2 — full GDPR Art. 13 disclosures */}
          {showDetails && (
            <VStack spacing={3} align="stretch">
              <Text fontSize="sm" color={textColor} lineHeight="1.5">
                {intl.formatMessage({ id: 'app.consentDetailsCollected' })}
              </Text>

              {/* States what DECLINING does. Previously only the accept side was
                  described, so "anonymous scan count" read as the thing on offer
                  when it is in fact the baseline. */}
              <Text fontSize="sm" color={textColor} lineHeight="1.5">
                {intl.formatMessage({ id: 'app.consentDetailsDeclined' })}
              </Text>

              <Text fontSize="sm" color={textColor} lineHeight="1.5">
                {intl.formatMessage({ id: 'app.consentDetailsAccountLink' })}
              </Text>

              <HStack spacing={2} fontSize="xs" color="gray.500">
                <Icon as={FaChartLine} />
                <Text>{intl.formatMessage({ id: 'app.consentRetention' })}</Text>
              </HStack>

              <Text fontSize="xs" color="gray.500">
                {intl.formatMessage({ id: 'app.consentControllerLine' })}{' '}
                <Link
                  // green.500 is 2.78:1 on white — fails AA and even the 3:1
                  // non-text floor. Anything rendering glyphs is green.700.
                  color="green.700"
                  href="https://trazo.io/privacy-policy"
                  isExternal
                  textDecoration="underline">
                  {intl.formatMessage({ id: 'app.privacyPolicy' })}
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
              onClick={() => handleConsent(false)}>
              {intl.formatMessage({ id: 'app.consentDecline' })}
            </Button>
            <Button
              size="sm"
              variant="outline"
              colorScheme="gray"
              onClick={() => handleConsent(true)}>
              {intl.formatMessage({ id: 'app.consentAccept' })}
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
  const hostname = window.location.hostname;
  // Clear the host-only cookie
  document.cookie =
    'trazo-analytics-consent=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';
  // Clear the domain-scoped cookie (must match the domain it was set with, else it lingers)
  const cookieDomain = hostname.endsWith('trazo.io')
    ? '.trazo.io'
    : hostname.includes('localhost')
    ? 'localhost'
    : '';
  if (cookieDomain) {
    document.cookie = `trazo-analytics-consent=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax; domain=${cookieDomain}`;
  }
  // Dispatch event so listening components can react
  window.dispatchEvent(new CustomEvent('trazo-consent-changed', { detail: { consent: null } }));
};

export default ConsentBanner;
