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

// Chakra Icons
import { SearchIcon } from '@chakra-ui/icons';
// Chakra Imports
import {
  Button,
  Flex,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Text,
  useColorModeValue,
  useDisclosure,
  useBreakpointValue
} from '@chakra-ui/react';
// Custom Icons
import { ProfileIcon, SettingsIcon } from 'components/Icons/Icons';
import React, { useEffect, useState } from 'react';

// Custom Components
import { NotificationDropdown } from 'components/Notifications/NotificationDropdown';
import { TrazoGlobalSearch } from 'components/Search/TrazoGlobalSearch';
import { useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { RiLogoutBoxRLine } from 'react-icons/ri';
import Sidebar from 'components/Sidebar/Sidebar';
import { consumerRoutes } from 'layouts/AdminConsumer';
import { HamburgerIcon } from '@chakra-ui/icons';
// Hooks
import { clearCurrentCompany } from 'store/features/companySlice';
import { clearUser } from 'store/features/userSlice';
import { logout as logoutAction } from 'store/features/authSlice';
import defaultRoutes from '../../routes';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { useLogoutMutation } from 'store/api/authApi';
import { useNavigate } from 'react-router-dom';

type HeaderLinksProps = {
  variant?: string;
  fixed?: boolean;
  secondary?: boolean;
  onOpen?: () => void;
  logoText?: string;
  children?: React.ReactNode;
};

export default function HeaderLinks(props: HeaderLinksProps) {
  const intl = useIntl();
  const { variant, children, fixed, secondary, onOpen, ...rest } = props;
  const [subdomain, setSubDomain] = useState<string>('');
  const [routes, setRoutes] = useState();
  const [isHome, setIsHome] = useState(false);

  // Mobile drawer state
  const { isOpen: isMobileOpen, onOpen: onMobileOpen, onClose: onMobileClose } = useDisclosure();
  const isMobile = useBreakpointValue({ base: true, xl: false }); // Mobile up to 1200px

  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Chakra Color Mode
  let mainTeal = useColorModeValue('green.500', 'green.400');
  let inputBg = useColorModeValue('white', 'gray.800');
  let mainText = useColorModeValue('gray.700', 'gray.200');
  let navbarIcon = useColorModeValue('gray.500', 'gray.200');
  let searchIcon = useColorModeValue('gray.700', 'gray.200');

  const [logout, { isLoading, isSuccess, error, isError }] = useLogoutMutation();

  const currentUser = useSelector((state) => state.userState.user);

  const location = useLocation();

  useEffect(() => {
    // Use regex to match /admin/dashboard/establishments/NUMBER pattern
    const establishmentPattern = /^\/admin\/dashboard\/establishment\/\d+$/;
    console.log(location.pathname);
    console.log(establishmentPattern.test(location.pathname));

    setIsHome(establishmentPattern.test(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    const routes = [...defaultRoutes];
    if (
      currentUser?.companies?.length > 0 &&
      currentUser?.companies[0]?.role === 'Company Admin' &&
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

  useEffect(() => {
    const host = window.location.host;
    const arr = host
      .split('.')
      .slice(0, host.includes(import.meta.env.VITE_APP_BASE_DOMAIN) ? -1 : -2);

    if (arr.length > 0) {
      if (arr[0] === 'app') {
        setSubDomain('producer');
      } else if (arr[0] === 'consumer') {
        setSubDomain('consumer');
      } else {
        setSubDomain('');
      }
    }
  }, []);

  const handleLogout = () => {
    logout();
  };

  useEffect(() => {
    if (isSuccess) {
      dispatch(logoutAction());
      dispatch(clearCurrentCompany());
      dispatch(clearUser());
      setTimeout(() => {
        navigate('/auth/signin', { replace: true });
      }, 1);
    }
  }, [dispatch, isSuccess, navigate]);

  if (secondary) {
    navbarIcon = 'white';
    mainText = 'white';
  }
  const settingsRef = React.useRef();
  return (
    <Flex
      alignItems="center"
      justifyContent="flex-end"
      gap={{ base: 1, sm: 2, md: 3 }}
      flexShrink={0}
      minW={0}>
      
      {/* Search Component - Show on all screen sizes when home */}
      {subdomain === 'producer' && isHome && (
        <Flex
          alignItems="center"
          w="auto"
          flex="1"
          maxW={{ 
            base: 'none',
            sm: '180px', 
            md: '220px', 
            lg: '260px', 
            xl: '300px' 
          }}
          mr={{ base: 1, sm: 2, md: 3 }}
          flexShrink={1}
          minW={0}>
          <TrazoGlobalSearch
            placeholder={
              intl.formatMessage({ id: 'app.searchEstablishmentsAndParcels' }) ||
              'Search establishments, parcels...'
            }
            size="md"
          />
        </Flex>
      )}

      {/* Action Buttons - Consistent spacing */}
      <Flex 
        alignItems="center" 
        gap={{ base: 1, sm: 1.5, md: 2 }} 
        flexShrink={0}>
        
        {/* Sign Out Button */}
        <Button
          color={navbarIcon}
          variant="transparent-with-icon"
          leftIcon={<RiLogoutBoxRLine color={navbarIcon} size="18px" />}
          onClick={handleLogout}
          size="sm"
          px={{ base: 1, md: 2 }}
          minW={0}>
          <Text display={{ base: 'none', lg: 'flex' }} fontSize="sm" ml={1}>
            {intl.formatMessage({ id: 'app.signOut' })}
          </Text>
        </Button>

        {/* Profile Button */}
        <Button
          color={navbarIcon}
          variant="transparent-with-icon"
          leftIcon={<ProfileIcon color={navbarIcon} w="18px" h="18px" />}
          onClick={() => navigate(`/admin/dashboard/profile`)}
          size="sm"
          px={{ base: 1, md: 2 }}
          minW={0}
        />

        {/* Settings Button */}
        <Button
          color={navbarIcon}
          variant="transparent-with-icon"
          leftIcon={<SettingsIcon color={navbarIcon} w="18px" h="18px" />}
          onClick={props.onOpen}
          size="sm"
          px={{ base: 1, md: 2 }}
          minW={0}
        />

        {/* Notification Dropdown */}
        {subdomain === 'producer' && <NotificationDropdown navbarIcon={navbarIcon} />}

        {/* Mobile hamburger menu */}
        {isMobile && (
          <IconButton
            aria-label="Open navigation menu"
            icon={<HamburgerIcon />}
            variant="ghost"
            color={navbarIcon}
            size="sm"
            minW={0}
            px={1}
            onClick={onMobileOpen}
            ml={1}
          />
        )}
      </Flex>

      {/* Mobile Sidebar */}
      {isMobile && (
        <Sidebar
          logoText={props.logoText}
          secondary={props.secondary}
          routes={subdomain === 'consumer' ? consumerRoutes : routes}
          sidebarVariant="opaque"
          isOpen={isMobileOpen}
          onClose={onMobileClose}
          {...rest}
        />
      )}
    </Flex>
  );
}

HeaderLinks.propTypes = {
  variant: PropTypes.string,
  fixed: PropTypes.bool,
  secondary: PropTypes.bool,
  onOpen: PropTypes.func
};
