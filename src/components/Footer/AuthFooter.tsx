import { useIntl } from 'react-intl';

import { Box, Flex, HStack, Text, useColorModeValue } from '@chakra-ui/react';

const LANDING_URL = 'https://trazo.io';

/**
 * Footer for the unauthenticated pages (sign-in, sign-up, password reset).
 *
 * Every string here was hardcoded English, including on a sign-in page that detects a Spanish
 * browser and renders the rest of itself in Spanish — a bilingual crew's first screen showed four
 * English links under Spanish copy. Reuses the same `app.*` keys the dashboard footer already
 * ships, so the two footers cannot drift apart again.
 */
export default function AuthFooter() {
  const intl = useIntl();
  const textColor = useColorModeValue('gray.600', 'gray.400');
  /* This footer sits on gray.50 (#FAFAFA), not white — so the ratio is measured against that,
     and gray.500 lands at 4.41:1, just under AA for the 12px copyright line. gray.600 is 5.98. */
  const subtleColor = useColorModeValue('gray.600', 'gray.400');

  const links = [
    { href: `${LANDING_URL}/privacy-policy`, id: 'app.privacyPolicy' },
    { href: `${LANDING_URL}/terms-conditions`, id: 'app.termsOfService' },
    { href: LANDING_URL, id: 'app.about' },
    { href: `${LANDING_URL}/contact`, id: 'app.contactUs' }
  ];

  return (
    <Box
      as="footer"
      bg={useColorModeValue('gray.50', 'gray.900')}
      borderTop="1px solid"
      borderColor={useColorModeValue('gray.200', 'gray.700')}
      py={6}
      px={8}>
      <Flex
        maxW="7xl"
        mx="auto"
        direction={{ base: 'column', md: 'row' }}
        align="center"
        justify="space-between"
        gap={4}>
        <HStack spacing={6} flexWrap="wrap" justify="center">
          {links.map(({ href, id }) => (
            <a key={id} href={href} target="_blank" rel="noopener noreferrer">
              <Text
                fontSize="sm"
                color={textColor}
                /* green.500 as text is 2.78:1 — a hover state still has to be readable, and
                   hovering must not make a link HARDER to read than its resting gray.600. */
                _hover={{ color: 'green.700' }}
                transition="color 0.2s">
                {intl.formatMessage({ id })}
              </Text>
            </a>
          ))}
        </HStack>

        {/* Was the hardcoded "Agricultural Transparency Platform." — pre-pivot positioning.
            One string, both footers. */}
        <Text fontSize="xs" color={subtleColor}>
          {intl.formatMessage({ id: 'app.footerCopyright' }, { year: new Date().getFullYear() })}
        </Text>
      </Flex>
    </Box>
  );
}
