import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

// Chakra imports
import { Box, ChakraProvider, Portal, CSSReset } from '@chakra-ui/react';
import { CacheProvider } from '@emotion/react';
import { emotionCache } from '../emotion-cache';
import { Outlet, Route } from 'react-router-dom';
import { useRef } from 'react';

// core components
import AuthNavbar from 'components/Navbars/AuthNavbar';
import React, { Suspense } from 'react';
import { Route as RouteType } from 'types/common';
import theme from 'theme/theme';
import { ConsentBanner } from '../components/Privacy/ConsentBanner';

export default function Pages() {
  // ref for the wrapper div
  const navRef = useRef<HTMLDivElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const dynamicRoutes: RouteType[] = [];
  React.useEffect(() => {
    document.body.style.overflow = 'unset';
    // Specify how to clean up after this effect:
    return function cleanup() {};
  });
  const getActiveRoute = (routes: RouteType[] | undefined): string => {
    let activeRoute = 'Home';
    if (!routes) {
      return activeRoute;
    }
    for (let i = 0; i < routes?.length; i++) {
      if (routes[i].collapse) {
        let collapseActiveRoute = getActiveRoute(routes[i].items);
        if (collapseActiveRoute !== activeRoute) {
          return collapseActiveRoute;
        }
      } else if (routes[i].category) {
        let categoryActiveRoute = getActiveRoute(routes[i].items);
        if (categoryActiveRoute !== activeRoute) {
          return categoryActiveRoute;
        }
      } else {
        if (window.location.href.indexOf(routes[i].layout + routes[i].path) !== -1) {
          return routes[i].name;
        }
      }
    }
    return activeRoute;
  };
  // This changes navbar state(fixed or not)
  const getActiveNavbar = (routes: RouteType[] | undefined): boolean | undefined => {
    let activeNavbar = false;
    if (!routes) {
      return activeNavbar;
    }
    for (let i = 0; i < routes?.length; i++) {
      if (routes[i].collapse) {
        let collapseActiveNavbar = getActiveNavbar(
          routes[i].isDashboard ? dynamicRoutes : routes[i].items
        );
        if (collapseActiveNavbar !== activeNavbar) {
          return collapseActiveNavbar;
        }
      } else if (routes[i].category) {
        let categoryActiveNavbar = getActiveNavbar(
          routes[i].isDashboard ? dynamicRoutes : routes[i].items
        );
        if (categoryActiveNavbar !== activeNavbar) {
          return categoryActiveNavbar;
        }
      } else {
        if (window.location.href.indexOf(routes[i].layout + routes[i].path) !== -1) {
          return routes[i].secondaryNavbar;
        }
      }
    }
    return activeNavbar;
  };

  const getRoutes = (routes: RouteType[]): React.ReactNode[] => {
    return routes?.map((prop, key) => {
      if (prop.component) {
        return <Route path={prop.path} element={<prop.component />} key={key} />;
      }
      return null;
    });
  };

  document.documentElement.dir = 'ltr';
  (document.documentElement as any).layout = 'auth';
  return (
    // <CacheProvider value={emotionCache}>
    //   <ChakraProvider theme={theme} w="100%">
    //     <CSSReset />
    <Box ref={navRef} w="100%" overflowX="hidden">
      <Portal containerRef={navRef}>
        <AuthNavbar secondary={false} logoText="trazo" logo="" />
      </Portal>
      <Box w="100%">
        <Box ref={wrapper} w="100%">
          {/* Suspense boundary for lazy-loaded auth route views (App.tsx lazyWithRetry). */}
          <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
            <Outlet />
          </Suspense>
        </Box>
      </Box>
      {/* Privacy consent banner for GDPR compliance */}
      <ConsentBanner />
    </Box>
    //   </ChakraProvider>
    // </CacheProvider>
  );
}
