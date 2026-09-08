import { Flex, Link, Text } from '@chakra-ui/react';
import { useIntl } from 'react-intl';
import { Link as RouterLink } from 'react-router-dom';
import { resetConsent } from '../Privacy/ConsentBanner';
import LanguageToggle from './LanguageToggle';

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
      gap={{ base: 3, md: 0 }}>
      <Text color="gray.400" textAlign={{ base: 'center', md: 'start' }} fontSize="sm">
        &copy; {new Date().getFullYear()} Trazo&trade;.
      </Text>
      <Flex
        gap={{ base: '16px', md: '24px' }}
        flexWrap="wrap"
        justifyContent="center"
        alignItems="center">
        <LanguageToggle />
        <Link
          as={RouterLink}
          to="/methodology"
          color="gray.400"
          fontSize="sm"
          _hover={{ color: 'green.500' }}>
          {intl.formatMessage({
            id: 'consumer.footer.howOurDataWorks',
            defaultMessage: 'How our data works'
          })}
        </Link>
        <Link
          href={`${LANDING_URL}/privacy-policy`}
          color="gray.400"
          fontSize="sm"
          isExternal
          _hover={{ color: 'green.500' }}>
          {intl.formatMessage({ id: 'app.privacyPolicy' })}
        </Link>
        <Link
          href={`${LANDING_URL}/terms-of-service`}
          color="gray.400"
          fontSize="sm"
          isExternal
          _hover={{ color: 'green.500' }}>
          {intl.formatMessage({ id: 'app.termsOfService' })}
        </Link>
        <Link
          as="button"
          color="gray.400"
          fontSize="sm"
          _hover={{ color: 'green.500' }}
          onClick={() => resetConsent()}>
          {intl.formatMessage({
            id: 'consumer.footer.privacySettings',
            defaultMessage: 'Privacy Settings'
          })}
        </Link>
      </Flex>
    </Flex>
  );
}
