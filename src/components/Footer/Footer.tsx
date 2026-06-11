import { Flex, Link, Text } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { resetConsent } from '../Privacy/ConsentBanner';

const LANDING_URL = 'https://trazo.io';

export default function Footer() {
  const intl = useIntl();
  // The /methodology route is registered on the consumer subdomain only —
  // this footer is shared with the producer app, where the link would 404.
  const isConsumerHost =
    typeof window !== 'undefined' && window.location.hostname.includes('consumer');

  return (
    <Flex
      flexDirection={{ base: 'column', xl: 'row' }}
      alignItems="center"
      justifyContent="space-between"
      px="30px"
      pb="20px"
      pt="20px"
      gap={{ base: 3, xl: 0 }}
    >
      <Text
        color="gray.400"
        textAlign={{ base: 'center', xl: 'start' }}
        fontSize="sm"
      >
        &copy; {new Date().getFullYear()} Trazo&trade;. Agricultural Transparency
        Platform.
      </Text>
      <Flex gap={{ base: '16px', md: '32px' }} flexWrap="wrap" justifyContent="center">
        {isConsumerHost && (
          <Link
            as={RouterLink}
            to="/methodology"
            color="gray.400"
            fontSize="sm"
            _hover={{ color: 'green.500' }}
          >
            How our data works
          </Link>
        )}
        <Link
          href={`${LANDING_URL}/privacy-policy`}
          color="gray.400"
          fontSize="sm"
          isExternal
          _hover={{ color: 'green.500' }}
        >
          {intl.formatMessage({ id: 'app.privacyPolicy' })}
        </Link>
        <Link
          href={`${LANDING_URL}/terms-conditions`}
          color="gray.400"
          fontSize="sm"
          isExternal
          _hover={{ color: 'green.500' }}
        >
          {intl.formatMessage({ id: 'app.termsOfService' })}
        </Link>
        <Link
          href={LANDING_URL}
          color="gray.400"
          fontSize="sm"
          isExternal
          _hover={{ color: 'green.500' }}
        >
          {intl.formatMessage({ id: 'app.about' })}
        </Link>
        <Link
          href={`${LANDING_URL}/contact`}
          color="gray.400"
          fontSize="sm"
          isExternal
          _hover={{ color: 'green.500' }}
        >
          {intl.formatMessage({ id: 'app.contactUs' })}
        </Link>
        <Link
          as="button"
          color="gray.400"
          fontSize="sm"
          _hover={{ color: 'green.500' }}
          onClick={() => resetConsent()}
        >
          Privacy Settings
        </Link>
      </Flex>
    </Flex>
  );
}
