// Import the configuration we created earlier
import { defaultLocale, locales } from './i18n-config';

import { IntlProvider } from 'react-intl';
import { LocaleContext } from './LocaleContext';
import { useState } from 'react';

type I18nProps = {
  children: React.ReactNode;
};

export default function I18n(props: I18nProps) {
  const [locale, setLocale] = useState(defaultLocale);

  // Ensure we have a valid locale, fallback to English
  const currentLocale = locales[locale] ? locale : 'en-US';
  const messages = locales[currentLocale]?.messages || locales['en-US'].messages;

  return (
    <LocaleContext.Provider value={{ locale: currentLocale, setLocale }}>
      <IntlProvider
        locale={currentLocale}
        defaultLocale="en-US"
        messages={messages}
      >
        {props.children}
      </IntlProvider>
    </LocaleContext.Provider>
  );
}
