import enMessages from 'i18n/lang/en-US.json';

// Default to English for consistent user experience
// Spanish can be enabled through user preference settings
export const defaultLocale = 'en-US';

// Only the default (en-US) message bundle is imported statically — it's needed for
// first paint + as the react-intl fallback. Non-default bundles (es-419.json, ~92KB
// gz) are lazy-loaded via loadLocaleMessages so they are NOT shipped in the entry
// bundle to every (mostly English) user on every page.
export const locales: Record<string, { name: string; messages?: Record<string, string> }> = {
  'en-US': {
    name: 'English',
    messages: enMessages as unknown as Record<string, string>
  },
  'es-419': {
    name: 'Español'
    // messages loaded on demand — see loadLocaleMessages
  }
};

/**
 * Resolve the react-intl message dictionary for a locale, code-splitting the
 * non-default bundles into their own chunk (loaded only when that locale is active).
 */
export const loadLocaleMessages = async (locale: string): Promise<Record<string, string>> => {
  if (locale === 'es-419') {
    const mod = await import('i18n/lang/es-419.json');
    return ((mod as any).default || mod) as Record<string, string>;
  }
  return enMessages as unknown as Record<string, string>;
};
