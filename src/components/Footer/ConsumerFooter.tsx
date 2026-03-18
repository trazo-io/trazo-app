import { Flex, Link, Text } from '@chakra-ui/react';
import { useIntl } from 'react-intl';
import { resetConsent } from '../Privacy/ConsentBanner';

const LANDING_URL = 'https://trazo.io';

export default function ConsumerFooter() {
  const intl = useIntl();

  return (
    <Flex
      flexDirection={{ base: 'column', md: 'row' }}
      alignItems="center"
      justifyContent="space-between"
      px="30px"
      pb="20px"
      pt="20px"
      gap={{ base: 3, md: 0 }}
    >
      <Text
        color="gray.400"
        textAlign={{ base: 'center', md: 'start' }}
        fontSize="sm"
      >
        &copy; {new Date().getFullYear()} Trazo&trade;.
      </Text>
      <Flex gap={{ base: '16px', md: '24px' }}>
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
