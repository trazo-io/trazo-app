/*!

=========================================================
* Purity UI Dashboard PRO - v1.0.0
=========================================================

* Product Page: https://www.creative-tim.com/product/purity-ui-dashboard-pro
* Copyright 2021 Creative Tim (https://www.creative-tim.com/)

* Design by Creative Tim & Coded by Simmmple

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/

// Import minimal essential CSS
import 'assets/css/trazo-colors.css';
import 'assets/css/pud-dashboard-styles.css';

import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { CacheProvider } from '@emotion/react';
import I18n from 'i18n/I18n';
import { Provider } from 'react-redux';
import { createRoot } from 'react-dom/client';
import { store } from './store';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import theme from 'theme/theme';
import { emotionCache } from 'theme/emotion-cache';
import { optimizeForMobile } from './utils/serviceWorker';
import { performanceMonitor } from './utils/performance';

const container = document.getElementById('root');
const root = createRoot(container!);

// Initialize mobile optimizations
if (process.env.NODE_ENV === 'production') {
  // Register service worker and setup mobile optimizations
  optimizeForMobile().catch(error => {
    console.warn('Mobile optimization failed:', error);
  });
}

// Performance monitoring initialization
if (process.env.NODE_ENV === 'development') {
  console.log('📊 Performance monitoring enabled for development');
}

root.render(
  <Provider store={store}>
    <BrowserRouter>
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
