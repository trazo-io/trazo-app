import { Portal, useDisclosure } from '@chakra-ui/react';
import { Outlet } from 'react-router-dom';
import React, { useState } from 'react';

import AdminNavbar from 'components/Navbars/AdminNavbar';

import ConsumerFooter from 'components/Footer/ConsumerFooter';
import MainPanel from 'components/Layout/MainPanel';
import PanelContainer from 'components/Layout/PanelContainer';
import PanelContent from 'components/Layout/PanelContent';
import Sidebar from 'components/Sidebar/Sidebar';
import { SidebarContext } from 'contexts/SidebarContext';
import { MdExplore, MdTimeline, MdPerson, MdSettings } from 'react-icons/md';

export const consumerRoutes = [
  {
    name: 'Discover',
    path: '/dashboard/impact',
    icon: <MdExplore color="inherit" />,
    layout: '/admin',
    regex: /^\/admin\/dashboard\/impact$/
  },
  {
    name: 'My Journey',
    path: '/dashboard/journey',
    icon: <MdTimeline color="inherit" />,
    layout: '/admin',
    regex: /^\/admin\/dashboard\/journey$/
  },
  {
    name: 'Profile',
    path: '/dashboard/profile',
    icon: <MdPerson color="inherit" />,
    layout: '/admin',
    regex: /^\/admin\/dashboard\/profile$/
  },
  {
    name: 'Settings',
    path: '/dashboard/settings',
    icon: <MdSettings color="inherit" />,
    layout: '/admin',
    regex: /^\/admin\/dashboard\/settings$/
  }
];

export default function AdminConsumerLayout(props: any) {
  const [sidebarVariant, setSidebarVariant] = useState('opaque');
  const [fixed, setFixed] = useState(false);
  const [toggleSidebar, setToggleSidebar] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(275);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { ...rest } = props;

  const getActiveRoute = (routes: any[]) => {
    const currentPath = window.location.pathname;
    for (let route of routes) {
      if (route.regex.test(currentPath)) {
        return route.name;
      }
    }
    return 'Consumer Dashboard';
  };

  return (
    <SidebarContext.Provider
      value={{
        sidebarWidth,
        setSidebarWidth,
        toggleSidebar,
        setToggleSidebar
      }}
    >
      <>
        <Sidebar
          routes={consumerRoutes}
          logoText={''}
          sidebarVariant={sidebarVariant}
          display="none"
          toggleSidebar={toggleSidebar}
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

        <PanelContent
          paddingInlineStart={{ base: '0px', lg: '15px' }}
          paddingInlineEnd={{ base: '0px', lg: '15px' }}
        >
          <PanelContainer padding={{ base: '0px', lg: '30px 15px' }}>
            <Outlet />
          </PanelContainer>
        </PanelContent>

        <ConsumerFooter />
      </MainPanel>
    </SidebarContext.Provider>
  );
}
