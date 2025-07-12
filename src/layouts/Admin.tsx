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

// CSS imports - order matters for cascade
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import 'react-quill/dist/quill.snow.css';
import 'assets/css/pud-dashboard-styles.css';

// Chakra imports
import { ChakraProvider, Portal, useDisclosure, CSSReset } from '@chakra-ui/react';
import { CacheProvider } from '@emotion/react';
import { emotionCache } from '../emotion-cache';
import { Outlet, Route, useLocation, Location } from 'react-router-dom';
import React, { useEffect, useState } from 'react';

// Layout components
import AdminNavbar from 'components/Navbars/AdminNavbar';
import Configurator from 'components/Configurator/Configurator';
import FixedPlugin from 'components/FixedPlugin/FixedPlugin';
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
  const [sidebarVariant, setSidebarVariant] = useState('transparent');
  const [fixed, setFixed] = useState(false);
  const [toggleSidebar, setToggleSidebar] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(275);

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
    const routes = [...defaultRoutes];
    if (
      currentUser?.companies?.length > 0 &&
      currentUser?.companies[0].role === 'Company Admin' &&
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
          path: `/dashboard/establishment/${e.id}`,
          collapse: true,
          establishmentId: e.id,
          authIcon: <HomeIcon color="inherit" />,
          regex: /^\/admin\/dashboard\/establishment\/[0-9]+(\/parcel\/[0-9]+)?$/,
          layout: '/admin',
          items: e?.parcels?.map((p) => {
            return {
              name: p.name,
              path: `/dashboard/establishment/${e.id}/parcel/${p.id}`,
              component: Overview,
              layout: '/admin',
              regex: /^\/admin\/dashboard\/establishment\/[0-9]+\/parcel\/[0-9]+$/
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
  // Chakra Color Mode
  return (
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
        }}>
        <Portal padding="0">
          <AdminNavbar
            onOpen={onOpen}
            brandText={getActiveRoute(routes)}
            secondary={getActiveNavbar(routes)}
            fixed={fixed}
            {...rest}
          />
        </Portal>

        {getRoute() ? (
          <PanelContent
            paddingInlineStart={{ base: '0px', lg: '15px' }}
            paddingInlineEnd={{ base: '0px', lg: '15px' }}>
            <PanelContainer padding={{ base: '0px', lg: '30px 15px' }}>
              <Outlet />
            </PanelContainer>
          </PanelContent>
        ) : null}
        <Footer />
        <Portal>
          <FixedPlugin fixed={fixed} onOpen={onOpen} />
        </Portal>
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
    </SidebarContext.Provider>
  );
}
