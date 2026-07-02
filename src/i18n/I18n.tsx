// Import the configuration we created earlier
import { defaultLocale, locales, loadLocaleMessages } from './i18n-config';

import { IntlProvider } from 'react-intl';
import type { IntlConfig } from 'react-intl';
import { LocaleContext } from './LocaleContext';
import { useEffect, useState } from 'react';

type I18nProps = {
  children: React.ReactNode;
};

// react-intl's default onError floods the dev console with MISSING_TRANSLATION
// for every absent key. A missing key still renders its id (no throw), and the
// `used-keys` test gate now catches absent keys at build time, so swallow that
// one error code while letting every other intl error surface normally.
const handleIntlError: IntlConfig['onError'] = (error) => {
  if (error.code === 'MISSING_TRANSLATION') return;
  // eslint-disable-next-line no-console
  console.error(error);
};

const LOCALE_STORAGE_KEY = 'trazo_locale';

// Pick the initial locale for first paint. Priority:
//   1. A previously-saved choice (the user toggled it before).
//   2. The browser/device language — a Spanish-locale shopper scanning a QR should land on
//      Spanish without any action (the consumer page has no login to read a profile from).
//   3. defaultLocale (en-US).
// 2026-06 audit P1-3: previously hardcoded to en-US with no detection/persistence, so a
// Spanish shopper always got English with no way to switch.
function detectInitialLocale(): string {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved && (locales as Record<string, unknown>)[saved]) return saved;
  } catch {
    // localStorage unavailable (private mode / blocked) — fall through to detection.
  }
  try {
    const langs =
      navigator.languages && navigator.languages.length
        ? navigator.languages
        : [navigator.language || ''];
    if (langs.some((l) => (l || '').toLowerCase().startsWith('es'))) return 'es-419';
  } catch {
    // navigator unavailable — fall through.
  }
  return defaultLocale;
}

export default function I18n(props: I18nProps) {
  const [locale, setLocaleState] = useState<string>(detectInitialLocale);

  // Persist the choice so it survives reloads and applies across the app (consumer + dashboard).
  const setLocale = (next: string) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Persistence is best-effort; ignore failures.
    }
  };

  // Ensure we have a valid locale, fallback to English
  const currentLocale = locales[locale] ? locale : 'en-US';

  // Only en-US is bundled statically; non-default locales (es-419) are code-split and
  // loaded on demand. Until the chunk resolves we render en-US — react-intl finds every
  // key there, so there is no missing-key flash, just English for a moment on the first
  // Spanish paint (which only Spanish users ever see, during the initial data fetch).
  const [messages, setMessages] = useState<Record<string, string>>(
    () => locales['en-US'].messages as Record<string, string>
  );
  useEffect(() => {
    let active = true;
    loadLocaleMessages(currentLocale).then((m) => {
      if (active) setMessages(m);
    });
    return () => {
      active = false;
    };
  }, [currentLocale]);

  return (
    <LocaleContext.Provider value={{ locale: currentLocale, setLocale }}>
      <IntlProvider
        locale={currentLocale}
        defaultLocale="en-US"
        messages={messages}
        onError={handleIntlError}
      >
        {props.children}
      </IntlProvider>
    </LocaleContext.Provider>
  );
}
