// Chakra imports
import {
  Box,
  Button,
  Flex,
  Grid,
  HStack,
  Icon,
  IconButton,
  Image,
  Link,
  Menu,
  MenuItem,
  MenuList,
  Stack,
  Text,
  useBreakpointValue,
  useColorModeValue,
  useDisclosure
} from '@chakra-ui/react';
import { ProfileIcon, RocketIcon } from 'components/Icons/Icons';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { isProducerSubdomain, isConsumerSubdomain } from 'utils/subdomain';

import IconBox from 'components/Icons/IconBox';
import { NavLink } from 'react-router-dom';
import PropTypes from 'prop-types';
import { RiLogoutBoxRLine } from 'react-icons/ri';
import { RootState } from 'store';
import Sidebar from 'components/Sidebar/Sidebar';
import { HamburgerIcon } from '@chakra-ui/icons';
import { clearCurrentCompany } from 'store/features/companySlice';
import { clearUser } from 'store/features/userSlice';
import logoTrazo from 'assets/img/trazo2.png';
import logoTrazoConsumer from 'assets/img/trazo-consumer-logo.png';
import { logout as logoutAction } from 'store/features/authSlice';
import routes from 'routes.tsx';
import { useIntl } from 'react-intl';
import { useLogoutMutation } from 'store/api/authApi';
import baseApi from 'store/api/baseApi';
import { useNavigate } from 'react-router-dom';

type AuthNavbarProps = {
  logoText: string;
  secondary: boolean;
  logo: string;
  forceDefaultLogo?: boolean;
};

export default function AuthNavbar(props: AuthNavbarProps) {
  const intl = useIntl();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const isLoadingAuth = useSelector((state: RootState) => state.auth.isLoading);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [subdomain, setSubDomain] = useState(null);
  const [isConsumer, setIsConsumer] = useState(false);

  // Mobile drawer state
  const { isOpen: isMobileOpen, onOpen: onMobileOpen, onClose: onMobileClose } = useDisclosure();
  const isMobile = useBreakpointValue({ base: true, lg: false });

  const [open, setOpen] = React.useState(false);
  const { isOpen: isOpenPages, onOpen: onOpenPages, onClose: onClosePages } = useDisclosure();

  const { isOpen: isOpenAuth, onOpen: onOpenAuth, onClose: onCloseAuth } = useDisclosure();

  const {
    isOpen: isOpenApplication,
    onOpen: onOpenApplication,
    onClose: onCloseApplication
  } = useDisclosure();

  const [logout, { isLoading }] = useLogoutMutation();

  useEffect(() => {
    // Use centralized subdomain detection utility
    setSubDomain(isProducerSubdomain());
    setIsConsumer(isConsumerSubdomain());
  }, []);

  // Auto-hide on scroll (consumer pages only, 2026 mobile pattern): the
  // floating pill otherwise sits on top of flat story content mid-scroll,
  // cutting sentences in half. Hide scrolling down, reveal scrolling up or
  // near the top.
  const [hiddenOnScroll, setHiddenOnScroll] = useState(false);
  useEffect(() => {
    if (!isConsumer) return undefined;
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY;
        if (y < 80) setHiddenOnScroll(false);
        else if (delta > 6) setHiddenOnScroll(true);
        else if (delta < -6) setHiddenOnScroll(false);
        lastY = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isConsumer]);

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch (err) {
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

  const {
    isOpen: isOpenEcommerce,
    onOpen: onOpenEcommerce,
    onClose: onCloseEcommerce
  } = useDisclosure();
  const textColor = useColorModeValue('gray.700', '#fff');
  const { logo, logoText, secondary, forceDefaultLogo, ...rest } = props;

  let authObject = {};
  routes.forEach((route) => {
    if (route?.items) {
      authObject = route.items.find((link) => link.name === 'Authentication');
    }
  });

  let applicationsObject = {};
  routes.forEach((route) => {
    if (route?.items) {
      applicationsObject = route.items.find((link) => link.name === 'Applications');
    }
  });

  let ecommerceObject = {};
  routes.forEach((route) => {
    if (route?.items) {
      ecommerceObject = route.items.find((link) => link.name === 'Ecommerce');
    }
  });

  let extraArr = [];
  routes.forEach((route) => {
    route?.items?.forEach((item) => {
      if (item.items && item.name === 'Pages') {
        extraArr = item.items.filter((link) => !link.collapse);
      }
    });
  });

  // verifies if routeName is the one active (in browser input)

  // Chakra color mode
  let mainText = useColorModeValue('gray.700', 'gray.200');
  let navbarIcon = useColorModeValue('gray.500', 'gray.200');
  let navbarBg = useColorModeValue(
    'linear-gradient(112.83deg, rgba(255, 255, 255, 0.82) 0%, rgba(255, 255, 255, 0.8) 110.84%)',
    'linear-gradient(112.83deg, rgba(255, 255, 255, 0.21) 0%, rgba(255, 255, 255, 0) 110.84%)'
  );
  let navbarBorder = useColorModeValue(
    '1.5px solid #FFFFFF',
    '1.5px solid rgba(255, 255, 255, 0.31)'
  );
  let navbarShadow = useColorModeValue('0px 7px 23px rgba(0, 0, 0, 0.05)', 'none');
  let navbarFilter = useColorModeValue('none', 'drop-shadow(0px 7px 23px rgba(0, 0, 0, 0.05))');
  let navbarBackdrop = 'none';
  let bgButton = useColorModeValue(
    'linear-gradient(81.62deg, #313860 2.25%, #151928 79.87%)',
    'gray.800'
  );
  // Frosted-glass consumer-navbar colors. These useColorModeValue calls MUST be
  // unconditional — calling them inside the `if (isConsumer && !props.secondary)`
  // block below changed the hook count when isConsumer toggled (false on first
  // render → true after the subdomain effect), producing a React "change in order
  // of Hooks" error on re-render. Hoisted here; the values are only *used* when the
  // condition holds. 2026-06 audit.
  const consumerNavbarBg = useColorModeValue('rgba(255, 255, 255, 0.85)', 'rgba(20, 24, 33, 0.85)');
  const consumerNavbarBorder = useColorModeValue(
    '1px solid rgba(255, 255, 255, 0.6)',
    '1px solid rgba(255, 255, 255, 0.12)'
  );
  let navbarPosition = 'fixed';
  let colorButton = 'white';
  if (props.secondary === true) {
    navbarBg = 'none';
    navbarBorder = 'none';
    navbarShadow = 'initial';
    navbarFilter = 'initial';
    navbarBackdrop = 'none';
    bgButton = 'black';
    colorButton = 'gray.700';
    mainText = '#fff';
    navbarPosition = 'absolute';
  }

  // 2026 frosted-glass navbar over hero photos on consumer-subdomain pages.
  // Apple/Linear/Stripe pattern: backdrop-blur + low-opacity bg makes the
  // navbar feel like a glass overlay on the underlying photo, instead of a
  // floating white card with empty space around it. Scoped to consumer so
  // producer/admin layouts keep their existing dense navbar.
  // Navbar sizing kept at the standard height per product preference
  // (2026-06: a slimmer 32px-logo variant was tried and reverted).
  const navbarTop = '30px';
  const navbarPy = '22px';
  const logoHeight = '45px';
  if (isConsumer && !props.secondary) {
    // 0.85 (was 0.45): with the journey's father card removed, story content
    // scrolls beneath the pill over the gray page — at 0.45 the glass blended
    // card fragments and text into unreadable mush mid-scroll. Higher opacity
    // keeps the frosted look while giving the pill a legible surface.
    navbarBg = consumerNavbarBg;
    navbarBackdrop = 'saturate(180%) blur(20px)';
    navbarBorder = consumerNavbarBorder;
    navbarShadow = '0 4px 16px rgba(0, 0, 0, 0.08)';
  }

  const createPagesLinks = (routes) => {
    return routes.map((link) => {
      if (
        link.name === 'Applications' ||
        link.name === 'Ecommerce' ||
        link.name === 'Authentication' ||
        link.name === 'Widgets' ||
        link.name === 'Charts' ||
        link.name === 'Alerts'
      ) {
        return;
      }
      if (link.name === 'Pricing Page') {
        return (
          <Stack direction="column">
            <Stack direction="row" spacing="6px" align="center" mb="6px" cursor="default">
              <IconBox bg="green.400" color="white" h="30px" w="30px">
                <RocketIcon color="inherit" />
              </IconBox>
              <Text fontWeight="bold" fontSize="sm" color={textColor}>
                Extra
              </Text>
            </Stack>
            {createExtraLinks(extraArr)}
          </Stack>
        );
      }
      if (link.authIcon) {
        return (
          <Stack direction="column">
            <Stack direction="row" spacing="6px" align="center" mb="6px" cursor="default">
              <IconBox bg="green.400" color="white" h="30px" w="30px">
                {link.authIcon}
              </IconBox>
              <Text fontWeight="bold" fontSize="sm" color={textColor}>
                {link.name}
              </Text>
            </Stack>
            {createPagesLinks(link.items)}
          </Stack>
        );
      } else {
        if (link.component) {
          return (
            <NavLink to={link.layout + link.path}>
              <MenuItem
                ps="36px"
                py="0px"
                _hover={{ boxShadow: 'none', bg: 'none' }}
                borderRadius="12px"
              >
                <Text color="gray.400" fontSize="sm" fontWeight="normal">
                  {link.name}
                </Text>
              </MenuItem>
            </NavLink>
          );
        } else {
          return <>{createPagesLinks(link.items)}</>;
        }
      }
    });
  };

  const createExtraLinks = (routes) => {
    return routes.map((link) => {
      return (
        <NavLink to={link.layout + link.path}>
          <MenuItem
            ps="36px"
            py="0px"
            _hover={{ boxShadow: 'none', bg: 'none' }}
            borderRadius="12px"
          >
            <Text color="gray.400" fontSize="sm" fontWeight="normal">
              {link.name}
            </Text>
          </MenuItem>
        </NavLink>
      );
    });
  };

  const createAuthLinks = (routes) => {
    return routes.map((link) => {
      if (link.authIcon) {
        return (
          <Stack direction="column">
            <Stack direction="row" spacing="6px" align="center" mb="6px" cursor="default">
              <IconBox bg="green.400" color="white" h="30px" w="30px">
                {link.authIcon}
              </IconBox>
              <Text fontWeight="bold" fontSize="sm" color={textColor}>
                {link.name}
              </Text>
            </Stack>
            {createAuthLinks(link.items)}
          </Stack>
        );
      } else {
        return (
          <NavLink to={link.layout + link.path}>
            <MenuItem
              ps="36px"
              py="0px"
              _hover={{ boxShadow: 'none', bg: 'none' }}
              borderRadius="12px"
            >
              <Text color="gray.400" fontSize="sm" fontWeight="normal">
                {link.name}
              </Text>
            </MenuItem>
          </NavLink>
        );
      }
    });
  };

  const createApplicationLinks = (routes) => {
    return routes.map((link) => {
      return (
        <NavLink to={link.layout + link.path}>
          <Stack direction="row" spacing="12px" align="center" cursor="pointer">
            <IconBox bg="green.400" color="white" h="30px" w="30px">
              {link.authIcon}
            </IconBox>
            <Text fontWeight="bold" fontSize="sm" color={textColor}>
              {link.name}
            </Text>
          </Stack>
        </NavLink>
      );
    });
  };

  const createEcommerceLinks = (routes) => {
    return routes.map((link) => {
      if (link.authIcon) {
        return (
          <Stack direction="column">
            <Stack direction="row" spacing="6px" align="center" mb="6px" cursor="default">
              <IconBox bg="green.400" color="white" h="30px" w="30px">
                {link.authIcon}
              </IconBox>
              <Text fontWeight="bold" fontSize="sm" color={textColor}>
                {link.name}
              </Text>
            </Stack>
            {createPagesLinks(link.items)}
          </Stack>
        );
      } else {
        if (link.component) {
          return (
            <NavLink to={link.layout + link.path}>
              <MenuItem
                ps="36px"
                py="0px"
                _hover={{ boxShadow: 'none', bg: 'none' }}
                borderRadius="12px"
              >
                <Text color="gray.400" fontSize="sm" fontWeight="normal">
                  {link.name}
                </Text>
              </MenuItem>
            </NavLink>
          );
        } else {
          return <>{createPagesLinks(link.items)}</>;
        }
      }
    });
  };

  var brand = (
    <Link
      href={`${import.meta.env.VITE_APP_BASE_URL}`}
      target="_blank"
      display="flex"
      lineHeight="100%"
      fontWeight="bold"
      justifyContent="center"
      alignItems="center"
      color={mainText}
    >
      <Image
        src={isConsumer && !forceDefaultLogo ? logoTrazoConsumer : logoTrazo}
        alt="trazo logo"
        height={logoHeight}
        paddingRight="10px"
        href=""
      />
    </Link>
  );

  return (
    <Flex
      position={navbarPosition}
      top={navbarTop}
      left="50%"
      transform={
        isConsumer && hiddenOnScroll ? 'translate(-50%, -150px)' : 'translate(-50%, 0px)'
      }
      transition="transform 0.25s ease"
      background={navbarBg}
      border={navbarBorder}
      boxShadow={navbarShadow}
      filter={navbarFilter}
      backdropFilter={navbarBackdrop}
      borderRadius="15px"
      px="16px"
      py={navbarPy}
      mx="auto"
      width="1044px"
      maxW="90%"
      alignItems="center"
      zIndex={1000}
    >
      <Flex w="100%" justifyContent={{ sm: 'start', lg: 'space-between' }}>
        {brand}
        <Box ms={{ base: 'auto', lg: '0px' }} display={{ lg: 'none' }}>
          {subdomain && isLoadingAuth === false && isAuthenticated && (
            <>
              <IconButton
                aria-label="Open navigation menu"
                icon={<HamburgerIcon />}
                variant="ghost"
                color={navbarIcon}
                onClick={onMobileOpen}
                me="16px"
              />
              <Sidebar
                logoText={props.logoText}
                secondary={props.secondary}
                routes={routes}
                sidebarVariant="opaque"
                isOpen={isMobileOpen}
                onClose={onMobileClose}
                {...rest}
              />
            </>
          )}
        </Box>
        {/* {linksAuth} */}
        {
          subdomain &&
          isLoadingAuth === false &&
          isAuthenticated &&
          window.location.pathname != '/pricing' ? (
            <>
              <Button
                ms="0px"
                px="0px"
                me={{ sm: '2px', md: '16px' }}
                color={navbarIcon}
                variant="transparent-with-icon"
                leftIcon={<RiLogoutBoxRLine color={navbarIcon} w="22px" h="22px" me="0px" />}
                onClick={handleLogout}
              >
                <Text display={{ sm: 'none', md: 'flex' }}>
                  {intl.formatMessage({ id: 'app.signOut' })}
                </Text>
              </Button>
              <Button
                ms="0px"
                px="0px"
                me={{ sm: '2px', md: '16px' }}
                color={navbarIcon}
                variant="transparent-with-icon"
                leftIcon={<ProfileIcon color={navbarIcon} w="22px" h="22px" me="0px" />}
                onClick={() => navigate(`/admin/dashboard/profile`)}
              />
            </>
          ) : null
          // <Link to="pricing">
          //   <Button
          //     bg={bgButton}
          //     color={colorButton}
          //     fontSize="xs"
          //     variant="no-hover"
          //     borderRadius="35px"
          //     px="30px"
          //     display={{
          //       sm: 'none',
          //       lg: 'flex'
          //     }}>
          //     {intl.formatMessage({ id: 'app.buyNow' })}
          //   </Button>
          // </Link>
        }
      </Flex>
    </Flex>
  );
}

AuthNavbar.propTypes = {
  color: PropTypes.oneOf(['primary', 'info', 'success', 'warning', 'danger']),
  brandText: PropTypes.string
};
