// CSS imports - order matters for cascade
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import 'react-quill/dist/quill.snow.css';

// Chakra imports
import { ChakraProvider, Portal, useDisclosure, CSSReset } from '@chakra-ui/react';
import { CacheProvider } from '@emotion/react';
import { emotionCache } from '../emotion-cache';
import { Outlet, Route, useLocation, Location } from 'react-router-dom';
import React, { Suspense, useEffect, useState } from 'react';
import { ROLE_DISPLAY_COMPANY_ADMIN } from 'config';

// Layout components
import AdminNavbar from 'components/Navbars/AdminNavbar';
import Configurator from 'components/Configurator/Configurator';
import Footer from 'components/Footer/Footer.tsx';
import { HomeIcon } from 'components/Icons/Icons';
// Custom components
import MainPanel from 'components/Layout/MainPanel';
import Overview from 'views/Pages/Profile/Overview/index';
import PanelContainer from 'components/Layout/PanelContainer';
import PanelContent from 'components/Layout/PanelContent';
import { RootState } from 'store/index';
import { SettingsIcon } from 'components/Icons/Icons';
import Sidebar from 'components/Sidebar/Sidebar';
import { SidebarContext } from 'contexts/SidebarContext';
import { Route as TypeRoute } from '../types/common';
// import { dynamicRoutes } from "components/Sidebar/Sidebar";
import defaultRoutes from '../routes';
import { set } from 'date-fns';
// Custom Chakra theme
import theme from 'theme';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import TourProvider from 'components/Tour/TourProvider';
import OnboardingChecklist from 'components/Tour/OnboardingChecklist';
import { MilestoneCelebrationModal, useMilestoneToast } from 'components/Tour/MilestoneCelebration';
import { useMilestones } from 'hooks/useMilestones';
import { OfflineQueueIndicator } from 'components/Upload/OfflineQueueIndicator';

// Define Company interface
interface Company {
  id: string | number;
  name?: string;
  subscription?: any;
  establishments?: any[];
  has_subscription?: boolean;
  [key: string]: any; // Allow additional properties
}

export default function Dashboard(props: any) {
  const intl = useIntl();
  const { ...rest } = props;
  // states and functions
  const [sidebarVariant, setSidebarVariant] = useState('opaque');
  const [fixed, setFixed] = useState(false);
  const [toggleSidebar, setToggleSidebar] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(275);

  // Milestone celebrations
  const { activeMilestone, daysSinceSignup, dismissMilestone } = useMilestones();
  const { showToast: showMilestoneToast } = useMilestoneToast();

  // Show toast for toast-pattern milestones, auto-dismiss them
  useEffect(() => {
    if (activeMilestone && activeMilestone.pattern === 'toast') {
      showMilestoneToast(activeMilestone, daysSinceSignup);
      dismissMilestone();
    }
  }, [activeMilestone]); // eslint-disable-line react-hooks/exhaustive-deps

  const [dynamicRoutes, setDynamicRoutes] = useState([]);
  const establishments = useSelector(
    (state: RootState) => state.company.currentCompany?.establishments
  );

  const currentUser = useSelector((state) => state.userState.user);

  // Get active company state at component level
  const activeCompany = useSelector(
    (state: RootState) => state.company.currentCompany
  ) as Company | null;

  const location = useLocation() as Location<{ from: string }>;
  const [routes, setRoutes] = useState<TypeRoute[]>([]);

  useEffect(() => {
    const isAdmin =
      currentUser?.companies?.length > 0 &&
      currentUser?.companies[0].role === ROLE_DISPLAY_COMPANY_ADMIN;

    // Filter out admin-only routes (Subscription) for non-admin users
    const routes = isAdmin
      ? [...defaultRoutes]
      : defaultRoutes.filter((route) => route.id !== 'subscription');

    if (
      isAdmin &&
      !routes.some((route) => route.id === 'companySettings') // Check if route already exists
    ) {
      const companySettingRoute = {
        id: 'companySettings',
        name: 'Company Settings',
        path: '/dashboard/settings',
        icon: <SettingsIcon color="inherit" />,
        authIcon: <SettingsIcon color="inherit" />,
        layout: '/admin',
        collapse: true,
        isCompanySettings: true,
        regex: /^\/admin\/dashboard\/settings$/
      };
      routes.push(companySettingRoute);
    }

    setRoutes(routes);
  }, [currentUser]);

  // functions for changing the states from components

  useEffect(() => {
    const dynamicRoutes =
      establishments &&
      establishments.map((e) => {
        return {
          name: e.name,
          path: `/dashboard/farm/${e.id}`,
          collapse: true,
          farmId: e.id,
          authIcon: <HomeIcon color="inherit" />,
          regex: /^\/admin\/dashboard\/farm\/[0-9]+(\/parcel\/[0-9]+)?$/,
          layout: '/admin',
          items: e?.parcels?.map((p) => {
            return {
              name: p.name,
              path: `/dashboard/farm/${e.id}/parcel/${p.id}`,
              component: Overview,
              layout: '/admin',
              regex: /^\/admin\/dashboard\/farm\/[0-9]+\/parcel\/[0-9]+$/
            };
          })
        };
      });
    if (establishments) {
      setDynamicRoutes(dynamicRoutes);
    }
  }, [establishments]);

  // Check subscription status and redirect if needed
  useEffect(() => {
    const currentPath = window.location.pathname;

    console.log('Admin layout subscription check:', {
      activeCompany,
      hasSubscription: activeCompany?.has_subscription,
      path: currentPath
    });

    // Skip checks for certain paths
    if (
      currentPath.includes('/pricing') ||
      currentPath.includes('/stripe-success') ||
      currentPath.includes('/select-company') ||
      currentPath.includes('/subscription')
    ) {
      return;
    }

    // Check if company exists but has no subscription
    if (
      activeCompany &&
      typeof activeCompany === 'object' &&
      Object.keys(activeCompany).length > 0 &&
      'id' in activeCompany &&
      activeCompany.has_subscription === false
    ) {
      const redirectUrl = `/admin/dashboard/pricing?new_company=false&company_id=${activeCompany.id}`;
      console.log('Admin layout redirecting to:', redirectUrl);

      // Use direct browser redirect
      window.location.href = redirectUrl;
    }
  }, [activeCompany]);

  // ref for main panel div
  const mainPanel = React.createRef();

  const getRoute = () => {
    return window.location.pathname !== '/admin/full-screen-maps';
  };

  const getActiveRoute = (routes: TypeRoute[]): string => {
    let activeRoute = intl.formatMessage({ id: 'app.home' });
    try {
      if (!routes || !Array.isArray(routes)) {
        console.warn('getActiveRoute: routes is not an array', routes);
        return activeRoute;
      }

      for (let i = 0; i < routes.length; i++) {
        const route = routes[i];
        if (!route) continue;

        if (route.collapse) {
          const items = route.isDashboard ? dynamicRoutes : route.items;
          if (items && Array.isArray(items)) {
            let collapseActiveRoute = getActiveRoute(items);
            if (collapseActiveRoute !== activeRoute) {
              return collapseActiveRoute;
            }
          }
        } else if (route.category) {
          const items = route.isDashboard ? dynamicRoutes : route.items;
          if (items && Array.isArray(items)) {
            let categoryActiveRoute = getActiveRoute(items);
            if (categoryActiveRoute !== activeRoute) {
              return categoryActiveRoute;
            }
          }
        } else if (route.layout && route.path && route.name) {
          if (window.location.href.indexOf(route.layout + route.path) !== -1) {
            return route.name;
          }
        }
      }
    } catch (error) {
      console.error('Error in getActiveRoute:', error, { routes });
    }
    return activeRoute;
  };

  const getActiveNavbar = (routes: TypeRoute[]): boolean => {
    let activeNavbar = false;
    try {
      if (!routes || !Array.isArray(routes)) {
        return activeNavbar;
      }

      for (let i = 0; i < routes.length; i++) {
        const route = routes[i];
        if (!route) continue;

        if (route.collapse) {
          const items = route.isDashboard ? dynamicRoutes : route.items;
          if (items && Array.isArray(items)) {
            let collapseActiveNavbar = getActiveNavbar(items);
            if (collapseActiveNavbar !== activeNavbar) {
              return collapseActiveNavbar;
            }
          }
        } else if (route.category) {
          const items = route.isDashboard ? dynamicRoutes : route.items;
          if (items && Array.isArray(items)) {
            let categoryActiveNavbar = getActiveNavbar(items);
            if (categoryActiveNavbar !== activeNavbar) {
              return categoryActiveNavbar;
            }
          }
        } else if (route.layout && route.path) {
          if (window.location.href.indexOf(route.layout + route.path) !== -1) {
            return route.secondaryNavbar ? true : false;
          }
        }
      }
    } catch (error) {
      console.error('Error in getActiveNavbar:', error, { routes });
    }
    return activeNavbar;
  };

  const getRoutes = (routes: TypeRoute[]): React.ReactNode[] => {
    return routes.map((prop, key) => {
      if (prop.component) {
        return <Route path={prop.path} element={<prop.component />} key={key} />;
      }
      if (prop.collapse && prop.items) {
        return getRoutes(prop.items);
      }
      return null;
    });
  };

  const { isOpen, onOpen, onClose } = useDisclosure();

  type HTMLDocumentElement = HTMLElement & {
    dir: string;
    layout: string;
  };

  const htmlDocumentElement = document.documentElement as HTMLDocumentElement;

  htmlDocumentElement.dir = 'ltr';
  htmlDocumentElement.layout = 'admin';

  // Inject CSS variables for sidebar width
  htmlDocumentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);

  // Chakra Color Mode
  return (
    <TourProvider>
      <SidebarContext.Provider
        value={{
          sidebarWidth,
          setSidebarWidth,
          toggleSidebar,
          setToggleSidebar
        }}>
        <Sidebar
          routes={routes}
          logoText={''}
          display="none"
          sidebarVariant={sidebarVariant}
          {...rest}
        />
        <MainPanel
          ref={mainPanel}
          w={{
            base: '100%',
            xl: `calc(100% - ${sidebarWidth}px)`
          }}
          ml={{ base: 0, xl: `${sidebarWidth}px` }}
          transition="all 0.33s cubic-bezier(0.685, 0.0473, 0.346, 1)"
          position="relative"
          float="right">
          <Portal padding="0">
            <AdminNavbar
              onOpen={onOpen}
              brandText={getActiveRoute(routes)}
              secondary={getActiveNavbar(routes)}
              fixed={fixed}
              {...rest}
            />
          </Portal>

          <OfflineQueueIndicator />

          {getRoute() ? (
            <PanelContent
              paddingInlineStart={{ base: '4px', md: '15px' }}
              paddingInlineEnd={{ base: '4px', md: '15px' }}>
              <PanelContainer padding={{ base: '4px 0px', lg: '30px 15px' }}>
                {/* Suspense boundary so lazy-loaded dashboard route views (see App.tsx
                  lazyWithRetry conversion) have a fallback while their chunk loads. */}
                <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
                  <Outlet />
                </Suspense>
              </PanelContainer>
            </PanelContent>
          ) : null}
          <Footer />
          <OnboardingChecklist />
          {/*
            The floating settings puck was removed 2026-08-21.

            It was a DUPLICATE: AdminNavbarLinks renders the same SettingsIcon wired to this
            same `onOpen`, so the Configurator drawer stays reachable from the top bar at every
            breakpoint — nothing here is lost.

            It was also a repeat offender. `position: fixed` at right:35 / bottom:30 with
            z-index 99 put it permanently in the one screen region any bottom-anchored UI needs.
            On 2026-08-17 it was measured covering a document card's Download button; the fix
            then was to hide it below `md`, which treated one breakpoint rather than the cause.
            On 2026-08-21 it was measured covering 19.3% of "Start Production" on the new
            production form (52x26px of overlap) AND winning the click there, because 99 > 10.
            A global, rarely-used shortcut should not outrank a page's primary action.
          */}
          <Configurator
            secondary={getActiveNavbar(routes)}
            isOpen={isOpen}
            onClose={onClose}
            isChecked={fixed}
            onSwitch={(value) => {
              setFixed(value);
            }}
            onOpaque={() => setSidebarVariant('opaque')}
            onTransparent={() => setSidebarVariant('transparent')}
          />
        </MainPanel>
        {activeMilestone && activeMilestone.pattern === 'modal' && (
          <MilestoneCelebrationModal
            milestone={activeMilestone}
            isOpen={true}
            onClose={dismissMilestone}
            daysSinceSignup={daysSinceSignup}
          />
        )}
      </SidebarContext.Provider>
    </TourProvider>
  );
}
