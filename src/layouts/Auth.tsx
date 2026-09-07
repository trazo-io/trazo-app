import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

// Chakra imports
import { Box, ChakraProvider, CSSReset, Portal, useColorModeValue } from '@chakra-ui/react';
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
import { grantAnalyticsConsent, revokeAnalyticsConsent } from 'config/posthog';

type AuthLayoutProps = {
  /**
   * Opt in to the 2026 auth shell: logo in flow (not a fixed pill), shared #FBFCFA canvas,
   * flex column so the page fills the remaining height. Only the redesigned auth route group
   * passes this — `/pricing` and `/invitation/*` mount this same layout and were built around
   * the fixed navbar.
   */
  plainNav?: boolean;
};

export default function Pages({ plainNav = false }: AuthLayoutProps) {
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

  const canvasBg = useColorModeValue('#FBFCFA', 'gray.900');

  document.documentElement.dir = 'ltr';
  (document.documentElement as any).layout = 'auth';
  return (
    // <CacheProvider value={emotionCache}>
    //   <ChakraProvider theme={theme} w="100%">
    //     <CSSReset />
    /*
      `plainNav` is OPT-IN per route group, and that is the whole point of the prop.
      This layout does not only serve the four redesigned auth pages — App.tsx also mounts
      `/pricing` and `/invitation/*` on it. Those were built around a FIXED navbar that takes
      no space in flow, so switching the layout globally regressed them in two ways at once:
        • `StandardPage` (pricing) and AcceptInvitation/SetupPassword all set `minH="100vh"`,
          which under an in-flow navbar totals 100vh PLUS the logo strip — phantom scroll.
        • the canvas painted here showed as a band above their own backgrounds
          (#FBFCFA over StandardPage's #F4F5F7) — the exact seam this was meant to remove.
      So: the redesigned group opts in, everything else keeps precisely what it had.
    */
    <Box
      ref={navRef}
      w="100%"
      overflowX="hidden"
      {...(plainNav
        ? {
            minH: '100vh',
            display: 'flex',
            flexDirection: 'column',
            /*
              The auth CANVAS is painted here, once, not by each page. #FBFCFA is the landing
              site's `--background` token (trazo-landing/app/globals.css), so crossing from the
              marketing site into the app keeps the same ground. It has to live on the layout
              because the navbar is in flow: when the four pages each painted their own canvas,
              the strip behind the logo fell OUTSIDE those boxes and showed the BODY colour —
              #F8F9FA against #FBFCFA, a hard horizontal seam under the logo.
            */
            bg: canvasBg
          }
        : {})}>
      {plainNav ? (
        /*
          Rendered IN FLOW, not through the <Portal>. The Portal appends to its container as
          the LAST child, which is harmless while the navbar is `position: fixed` and invisible
          in flow — but a static navbar appended last would paint the logo BELOW the form.

          Why static at all: on an auth page the logo is not navigation, and a fixed header
          exists to keep navigation reachable during a long scroll. These pages are one short
          task, so the pinned logo bought nothing and cost a collision — MEASURED at 1440x800,
          the fixed logo overlapped card content at 11 of 16 scroll positions, running straight
          through the create-account heading, then the subtitle, then the Create/Join buttons.
          It was survivable only while the navbar painted an opaque pill over what it covered;
          removing that chrome for the centered-card redesign exposed it. Linear, Stripe,
          Vercel, Notion and Clerk all put the wordmark in flow and let it scroll away.
        */
        <AuthNavbar secondary={false} logoText="trazo" logo="" plain />
      ) : (
        <Portal containerRef={navRef}>
          <AuthNavbar secondary={false} logoText="trazo" logo="" />
        </Portal>
      )}
      {/*
        Under `plainNav`, `flex="1"` runs all the way down to the route so the page fills
        exactly the space the in-flow navbar leaves, instead of adding 100vh below it.
      */}
      <Box w="100%" {...(plainNav ? { flex: '1', display: 'flex', flexDirection: 'column' } : {})}>
        <Box
          ref={wrapper}
          w="100%"
          {...(plainNav ? { flex: '1', display: 'flex', flexDirection: 'column' } : {})}>
          {/* Suspense boundary for lazy-loaded auth route views (App.tsx lazyWithRetry). */}
          <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
            <Outlet />
          </Suspense>
        </Box>
      </Box>
      {/* Privacy consent banner for GDPR compliance.
          onConsentChange is what actually reaches PostHog — see ConsumerProductLayout. */}
      <ConsentBanner
        onConsentChange={(consent) =>
          consent ? grantAnalyticsConsent() : revokeAnalyticsConsent()
        }
      />
    </Box>
    //   </ChakraProvider>
    // </CacheProvider>
  );
}
