import { HStack, Link, Text } from '@chakra-ui/react';
import { useContext } from 'react';
import { LocaleContext } from 'i18n/LocaleContext';

/**
 * Compact EN/ES language switch for consumer-facing pages.
 *
 * The consumer QR page has no login, so this is the only way a shopper can change the page
 * language (the choice also persists via localStorage). On first load the locale is
 * auto-detected from the browser — see i18n/I18n.tsx. 2026-06 audit P1-3: the consumer page
 * was previously en-US only with no detection or switcher.
 */
export default function LanguageToggle() {
  const { locale, setLocale } = useContext(LocaleContext);
  const isEs = (locale || '').toLowerCase().startsWith('es');

  return (
    <HStack spacing={1.5} aria-label="Language">
      <Link
        as="button"
        type="button"
        fontSize="sm"
        fontWeight={isEs ? 'normal' : 'semibold'}
        color={isEs ? 'gray.400' : 'green.500'}
        _hover={{ color: 'green.500' }}
        onClick={() => setLocale('en-US')}
        aria-pressed={!isEs}
      >
        EN
      </Link>
      <Text color="gray.300" fontSize="sm">
        |
      </Text>
      <Link
        as="button"
        type="button"
        fontSize="sm"
        fontWeight={isEs ? 'semibold' : 'normal'}
        color={isEs ? 'green.500' : 'gray.400'}
        _hover={{ color: 'green.500' }}
        onClick={() => setLocale('es-419')}
        aria-pressed={isEs}
      >
        ES
      </Link>
    </HStack>
  );
}
