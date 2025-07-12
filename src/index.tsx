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

import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider, CSSReset, Box } from '@chakra-ui/react';
import I18n from 'i18n/I18n';
import { Provider } from 'react-redux';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { store } from './store';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import theme from 'theme/theme';

const root = createRoot(document.getElementById('root')!);

// Add a debug component to test if Chakra is working
const DebugChakra = () => (
  <Box
    position="fixed"
    top="0"
    right="0"
    bg="red.500"
    color="white"
    p={2}
    zIndex={9999}
    fontSize="xs">
    Chakra Test
  </Box>
);

root.render(
  <Provider store={store}>
    <BrowserRouter>
      <ChakraProvider theme={theme} resetCSS={true}>
        <CSSReset />
        <DebugChakra />
        <I18n>
          <SubscriptionProvider>
            <App />
          </SubscriptionProvider>
        </I18n>
      </ChakraProvider>
    </BrowserRouter>
  </Provider>
);
