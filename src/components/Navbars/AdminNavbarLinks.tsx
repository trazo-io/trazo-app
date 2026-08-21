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
import { getSubdomainType } from 'utils/subdomain';

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
import { ROLE_DISPLAY_COMPANY_ADMIN } from 'config';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { useLogoutMutation } from 'store/api/authApi';
import baseApi from 'store/api/baseApi';
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
  let mainTeal = useColorModeValue('green.700', 'green.300');
  let inputBg = useColorModeValue('white', 'gray.800');
  let mainText = useColorModeValue('gray.700', 'gray.200');
  let navbarIcon = useColorModeValue('gray.500', 'gray.200');
  let searchIcon = useColorModeValue('gray.700', 'gray.200');

  const [logout, { isLoading }] = useLogoutMutation();

  const currentUser = useSelector((state) => state.userState.user);

  const location = useLocation();

  useEffect(() => {
    // Use regex to match /admin/dashboard/farm/NUMBER pattern
    const farmPattern = /^\/admin\/dashboard\/farm\/\d+$/;

    setIsHome(farmPattern.test(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    const isAdmin =
      currentUser?.companies?.length > 0 &&
      currentUser?.companies[0]?.role === ROLE_DISPLAY_COMPANY_ADMIN;

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

  useEffect(() => {
    // Use centralized subdomain detection utility
    setSubDomain(getSubdomainType());
  }, []);

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch (err) {
      // Even if server logout fails, clean up local state
      console.error('Logout request failed:', err);
    }
    // Always clean up Redux state and redirect, regardless of server response
    dispatch(logoutAction());
    dispatch(clearCurrentCompany());
    dispatch(clearUser());
    // Flush RTK Query cache BEFORE navigation to prevent stale data from previous user
    dispatch(baseApi.util.resetApiState());
    navigate('/auth/signin', { replace: true });
  };

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
      {/* Search Component - Icon on mobile, full input on desktop */}
      {subdomain === 'producer' && isHome && (
        <TrazoGlobalSearch
          placeholder={
            intl.formatMessage({ id: 'app.searchEstablishmentsAndParcels' }) ||
            'Search establishments, parcels...'
          }
          size="md"
        />
      )}

      {/* Action Buttons - Consistent spacing */}
      <Flex alignItems="center" gap={{ base: 1, sm: 1.5, md: 2 }} flexShrink={0}>
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
          /* Icon-only: with no text child a screen reader announces just "button". The
             floating settings puck that was removed on 2026-08-21 carried this label; this is
             now the ONLY door to the Configurator, so it has to carry it instead. */
          aria-label={intl.formatMessage({ id: 'nav.openSettings' })}
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
