import enMessages from 'i18n/lang/en-US.json';
import es419Messages from 'i18n/lang/es-419.json';

// Default to English for consistent user experience
// Spanish can be enabled through user preference settings
export const defaultLocale = 'en-US';

export const locales = {
  // English translation message dictionary.
  'en-US': {
    name: 'English',
    messages: enMessages
  },
  // Spanish translation message dictionary.
  'es-419': {
    name: 'Español',
    messages: es419Messages
  }
};
