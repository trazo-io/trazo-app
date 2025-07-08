import { ChakraProvider, Portal, useDisclosure, CSSReset } from '@chakra-ui/react';
import { Outlet } from 'react-router-dom';
import React, { useState } from 'react';

import AdminNavbar from 'components/Navbars/AdminNavbar';
import Configurator from 'components/Configurator/Configurator';
import FixedPlugin from 'components/FixedPlugin/FixedPlugin';
import Footer from 'components/Footer/Footer';
import MainPanel from 'components/Layout/MainPanel';
import PanelContainer from 'components/Layout/PanelContainer';
import PanelContent from 'components/Layout/PanelContent';
import { StatsIcon, RocketIcon } from 'components/Icons/Icons';
import Sidebar from 'components/Sidebar/Sidebar';
import { SidebarContext } from 'contexts/SidebarContext';
import theme from 'theme/theme';
import ConsumerSidebar from 'components/Sidebar/ConsumerSidebar';
import ConsumerSidebarResponsive from 'components/Sidebar/ConsumerSidebarResponsive';
import {
  FaQrcode,
  FaStar,
  FaLeaf,
  FaGraduationCap,
  FaUsers,
  FaChartLine,
  FaBalanceScale
} from 'react-icons/fa';
import { MdDashboard, MdInsights, MdCompare, MdTimeline } from 'react-icons/md';

export const consumerRoutes = [
  {
    name: 'My Impact',
    path: 'impact',
    icon: <MdDashboard color="inherit" />,
    layout: '/admin',
    regex: /^\/admin\/dashboard\/impact$/
  },
  {
    name: 'Compare Products',
    path: 'compare',
    icon: <MdCompare color="inherit" />,
    layout: '/admin',
    regex: /^\/admin\/dashboard\/compare$/
  },
  {
    name: 'My History',
    path: 'journey',
    icon: <MdTimeline color="inherit" />,
    layout: '/admin',
    regex: /^\/admin\/dashboard\/journey$/
  }
];

export default function AdminConsumerLayout(props: any) {
  const [sidebarVariant, setSidebarVariant] = useState('transparent');
  const [fixed, setFixed] = useState(false);
  const [toggleSidebar, setToggleSidebar] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(275);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { ...rest } = props;

  const getActiveRoute = (routes) => {
    const currentPath = window.location.pathname;
    for (let route of routes) {
      if (route.regex.test(currentPath)) {
        return route.name;
      }
    }
    return 'Consumer Dashboard';
  };

  return (
    <ChakraProvider theme={theme}>
      <CSSReset />
      <SidebarContext.Provider
        value={{
          sidebarWidth,
          setSidebarWidth,
          toggleSidebar,
          setToggleSidebar
        }}
      >
        <>
          <ConsumerSidebar
            routes={consumerRoutes}
            logoText={''}
            sidebarVariant={sidebarVariant}
            display="none"
            {...rest}
          />
        </>
        <MainPanel
          w={{
            base: '100%',
            xl: `calc(100% - ${sidebarWidth}px)`
          }}
        >
          <Portal>
            <AdminNavbar onOpen={onOpen} brandText={getActiveRoute(consumerRoutes)} fixed={fixed} />
          </Portal>

          <PanelContent>
            <PanelContainer>
              <Outlet />
            </PanelContainer>
          </PanelContent>

          <Footer />
          <Portal>
            <FixedPlugin fixed={fixed} onOpen={onOpen} />
          </Portal>
          <Configurator
            isOpen={isOpen}
            onClose={onClose}
            isChecked={fixed}
            onSwitch={(value) => setFixed(value)}
            onOpaque={() => setSidebarVariant('opaque')}
            onTransparent={() => setSidebarVariant('transparent')}
          />
        </MainPanel>
      </SidebarContext.Provider>
    </ChakraProvider>
  );
}
