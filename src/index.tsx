// Sentry must be initialized before any other imports
import './config/sentry';

// PostHog is inert unless VITE_POSTHOG_KEY is set, and captures NOTHING until the visitor
// accepts via the consent banner (opt_out_capturing_by_default). See config/posthog.ts.
import { initPostHog } from './config/posthog';

initPostHog();

// Import minimal essential CSS
import 'assets/css/trazo-colors.css';
import 'assets/css/trazo-dashboard-styles.css';

import App from './App';
import { BrowserRouter } from 'react-router-dom';
import ScrollToTop from 'components/Utils/ScrollToTop';
import { ChakraProvider } from '@chakra-ui/react';
import { CacheProvider } from '@emotion/react';
import I18n from 'i18n/I18n';
import { Provider } from 'react-redux';
import { createRoot } from 'react-dom/client';
import { store } from './store';
import { runBootPrefetch } from './utils/bootPrefetch';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import theme from 'theme/theme';
import { emotionCache } from 'theme/emotion-cache';
import { performanceMonitor } from './utils/performance';

const container = document.getElementById('root');
const root = createRoot(container!);

// Performance monitoring initialization
if (process.env.NODE_ENV === 'development') {
  console.log('📊 Performance monitoring enabled for development');
}

// Warm the dashboard's own requests before React boots — see utils/bootPrefetch.ts.
try {
  runBootPrefetch(store);
} catch {
  /* never let a prefetch block boot */
}

root.render(
  <Provider store={store}>
    <BrowserRouter>
      <ScrollToTop />
      <I18n>
        <CacheProvider value={emotionCache}>
          <ChakraProvider theme={theme} resetCSS={true}>
            <SubscriptionProvider>
              <App />
            </SubscriptionProvider>
          </ChakraProvider>
        </CacheProvider>
      </I18n>
    </BrowserRouter>
  </Provider>
);

// Mark initial app load for performance tracking
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    console.log('🚀 Trazo Dashboard loaded - Mobile optimized');
  });
}
