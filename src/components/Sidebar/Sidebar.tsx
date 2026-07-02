// chakra imports
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerOverlay,
  Flex,
  HStack,
  Icon,
  Image,
  List,
  ListItem,
  Stack,
  Text,
  useColorModeValue,
  useBreakpointValue,
  Portal
} from '@chakra-ui/react';
import { NavLink, useLocation } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import {
  renderThumbDark,
  renderThumbLight,
  renderTrack,
  renderView
} from 'components/Scrollbar/Scrollbar';

import { FaCircle } from 'react-icons/fa';
import { HSeparator } from 'components/Separator/Separator';
/*eslint-disable*/
import { HamburgerIcon } from '@chakra-ui/icons';
// ROUTES
import { HomeIcon } from 'components/Icons/Icons';
import IconBox from 'components/Icons/IconBox';
import Overview from 'views/Pages/Profile/Overview/index';
import { RootState } from 'store';
import { Route } from 'types/common';
import { Scrollbars } from 'react-custom-scrollbars-2';
import { SidebarContext } from 'contexts/SidebarContext';
import SidebarHelp from './SidebarHelp';
import logo from 'assets/img/trazo2.png';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

type SidebarProps = {
  logoText: string;
  routes: any;
  sidebarVariant: string;
  toggleSidebar?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  display?: string;
  secondary?: boolean;
};

type ParcelType = {
  id: number;
  name: string;
};

type EstablishmentType = {
  id: number;
  name: string;
  parcels: ParcelType[];
};

function Sidebar(props: SidebarProps) {
  const intl = useIntl();
  // to check for active links and opened collapses
  let location = useLocation();

  // this is for the rest of the collapses

  const [dynamicRoutes, setDynamicRoutes] = useState<Route[]>([]);
  const [commercialDynamicRoutes, setCommercialDynamicRoutes] = useState([]);
  const [transparencyDynamicRoutes, setTransparencyDynamicRoutes] = useState([]);
  const [ospDynamicRoutes, setOspDynamicRoutes] = useState([]);
  const [iotDynamicRoutes, setIotDynamicRoutes] = useState([]);

  const establishments = useSelector(
    (state: RootState) => state.company.currentCompany?.establishments
  );
  const { sidebarWidth, setSidebarWidth, toggleSidebar } = React.useContext(SidebarContext);
  const mainPanel = React.useRef();

  // Hoisted color-mode values — Rules of Hooks. These were previously called
  // inside createLinks / createAccordionLinks (each run once per route-group) and
  // inside conditional branches, so the number of hook calls varied between
  // renders and triggered React's "change in order of Hooks" warning. Hooks must
  // run unconditionally at the top level, so they live here and are read below.
  const cmGreen = useColorModeValue('green.500', 'green.500');
  const cmWhiteGray = useColorModeValue('white', 'gray.700');
  const cmWhiteWhite = useColorModeValue('white', 'white');
  const cmActiveColor = useColorModeValue('gray.700', 'white');
  const cmInactiveColor = useColorModeValue('gray.400', 'gray.400');
  const cmInactiveBgOpaque = useColorModeValue('gray.100', 'gray.600');
  const cmThumb = useColorModeValue(renderThumbLight, renderThumbDark);

  let variantChange = '0.2s linear';

  const activeRoute = (regex: RegExp) => {
    return regex.test(location.pathname);
  };

  useEffect(() => {
    const dynamicRoutes: Route[] =
      establishments &&
      establishments.map((e: EstablishmentType) => {
        return {
          name: e.name,
          path: `/dashboard/farm/${e.id}`,
          collapse: true,
          farmId: e.id,
          authIcon: <HomeIcon color="inherit" />,
          layout: '/admin',
          isDashboard: true,
          regex: new RegExp(
            `^\\/admin\\/dashboard\\/farm\\/${e.id}(\\/.*)?$`
          ),
          items: e?.parcels?.map((p: ParcelType) => {
            return {
              name: p.name,
              path: `/dashboard/farm/${e.id}/parcel/${p.id}`,
              component: Overview,
              layout: '/admin',
              isDashboard: true,
              regex: new RegExp(
                `^\\/admin\\/dashboard\\/farm\\/${e.id}\\/parcel\\/${p.id}(\\/.*)?$`
              )
            };
          })
        };
      });

    const commercialDynamicRoutes =
      establishments &&
      establishments.map((e: EstablishmentType) => {
        return {
          name: e.name,
          path: `/dashboard/farm/${e.id}/commercial`,
          farmId: e.id,
          authIcon: <HomeIcon color="inherit" />,
          regex: new RegExp(`^\\/admin\\/dashboard\\/farm\\/${e.id}\\/commercial$`),
          layout: '/admin',
          items: []
        };
      });

    const transparencyDynamicRoutes =
      establishments &&
      establishments.map((e: EstablishmentType) => {
        return {
          name: e.name,
          path: `/dashboard/farm/${e.id}/transparency`,
          farmId: e.id,
          authIcon: <HomeIcon color="inherit" />,
          regex: new RegExp(`^\\/admin\\/dashboard\\/farm\\/${e.id}\\/transparency$`),
          layout: '/admin',
          items: []
        };
      });

    const iotDynamicRoutes =
      establishments &&
      establishments.map((e: EstablishmentType) => {
        return {
          name: e.name,
          path: `/dashboard/farm/${e.id}/iot`,
          farmId: e.id,
          authIcon: <HomeIcon color="inherit" />,
          regex: new RegExp(`^\\/admin\\/dashboard\\/farm\\/${e.id}\\/iot$`),
          layout: '/admin',
          items: []
        };
      });

    // Sprint 5A — Organic System Plan per establishment.
    const ospDynamicRoutes =
      establishments &&
      establishments.map((e: EstablishmentType) => {
        return {
          name: e.name,
          path: `/dashboard/farm/${e.id}/osp`,
          farmId: e.id,
          authIcon: <HomeIcon color="inherit" />,
          regex: new RegExp(`^\\/admin\\/dashboard\\/farm\\/${e.id}\\/osp$`),
          layout: '/admin',
          items: []
        };
      });

    if (establishments) {
      setDynamicRoutes(dynamicRoutes);
      setCommercialDynamicRoutes(commercialDynamicRoutes);
      setTransparencyDynamicRoutes(transparencyDynamicRoutes);
      setOspDynamicRoutes(ospDynamicRoutes);
      setIotDynamicRoutes(iotDynamicRoutes);
    }
  }, [establishments]);

  // this function creates the links and collapses that appear in the sidebar (left menu)
  const createLinks = (routes: any) => {
    const { sidebarVariant } = props;
    const isOpaque = sidebarVariant === 'opaque';
    // Chakra Color Mode — values hoisted to the component top (Rules of Hooks).
    // Only inactiveBg + the shadow actually differ between the opaque/transparent
    // variants; the rest are identical in both.
    const activeBg = cmGreen;
    const activeAccordionBg = cmWhiteGray;
    const inactiveBg = isOpaque ? cmInactiveBgOpaque : cmWhiteGray;
    const inactiveColorIcon = cmGreen;
    const activeColorIcon = cmWhiteWhite;
    const activeColor = cmActiveColor;
    const inactiveColor = cmInactiveColor;
    const sidebarActiveShadow = isOpaque ? 'none' : '0px 7px 11px rgba(0, 0, 0, 0.04)';
    return routes?.map((prop: Route, index: number) => {
      if (prop.category) {
        return (
          <>
            <Text
              fontSize={sidebarWidth === 275 ? 'md' : 'xs'}
              color={activeColor}
              fontWeight="bold"
              mx="auto"
              ps={{
                sm: '10px',
                xl: '16px'
              }}
              py="12px"
              key={index}
            >
              {Object.keys(intl?.messages).includes(`app.${prop.id}`)
                ? intl.formatMessage({ id: `app.${prop.id}` })
                : prop.name}
            </Text>
            {createLinks(prop.items)}
          </>
        );
      }
      if (prop.collapse) {
        return (
          <AccordionItem border="none">
            <AccordionButton
              display="flex"
              align="center"
              justify="center"
              boxShadow={activeRoute(prop.regex) && prop.icon ? sidebarActiveShadow : null}
              _hover={{
                boxShadow: 'none'
              }}
              _focus={{
                boxShadow: 'none'
              }}
              borderRadius="15px"
              w={sidebarWidth === 275 ? '100%' : '77%'}
              px={prop.icon ? null : '0px'}
              py={prop.icon ? '12px' : null}
              bg={activeRoute(prop.regex) && prop.icon ? activeAccordionBg : 'transparent'}
              aria-expanded={activeRoute(prop.regex)}
              aria-label={`${prop.name} navigation section`}
            >
              {activeRoute(prop.regex) ? (
                <Flex
                  alignItems="center"
                  bg="transparent"
                  transition={variantChange}
                  px="0px"
                  borderRadius="15px"
                  flex="1"
                  minW="0"
                >
                  {prop.icon ? (
                    <Flex>
                      <IconBox
                        bg={activeBg}
                        color={activeColorIcon}
                        h="30px"
                        w="30px"
                        me="12px"
                        transition={variantChange}
                      >
                        {prop.icon}
                      </IconBox>
                      <Text
                        color={activeColor}
                        my="auto"
                        fontSize="sm"
                        display={sidebarWidth === 275 ? 'block' : 'none'}
                        noOfLines={1}
                        maxW="180px"
                        title={
                          Object.keys(intl?.messages).includes(`app.${prop.id}`)
                            ? intl.formatMessage({ id: `app.${prop.id}` })
                            : prop.name
                        }
                      >
                        {Object.keys(intl?.messages).includes(`app.${prop.id}`)
                          ? intl.formatMessage({ id: `app.${prop.id}` })
                          : prop.name}
                      </Text>
                    </Flex>
                  ) : (
                    <HStack
                      spacing={sidebarWidth === 275 ? '22px' : '0px'}
                      ps={sidebarWidth === 275 ? '10px' : '0px'}
                      ms={sidebarWidth === 275 ? '0px' : '8px'}
                    >
                      <Icon
                        as={FaCircle}
                        w="10px"
                        color="green.500"
                        display={sidebarWidth === 275 ? 'block' : 'none'}
                      />
                      {prop.farmId ? (
                        <NavLink to={prop.layout + prop.path}>
                          <Text
                            color={activeColor}
                            my="auto"
                            fontSize="sm"
                            maxW={sidebarWidth === 275 ? '180px' : 'auto'}
                            wordBreak="break-word"
                            whiteSpace="normal"
                            lineHeight="1.4"
                            textAlign="left"
                          >
                            {sidebarWidth === 275 ? prop.name : prop.name[0]}
                          </Text>
                        </NavLink>
                      ) : (
                        <Text
                          color={activeColor}
                          my="auto"
                          fontSize="sm"
                          maxW={sidebarWidth === 275 ? '180px' : 'auto'}
                          wordBreak="break-word"
                          whiteSpace="normal"
                          lineHeight="1.4"
                          textAlign="left"
                        >
                          {sidebarWidth === 275 ? prop.name : prop.name[0]}
                        </Text>
                      )}
                    </HStack>
                  )}
                </Flex>
              ) : (
                <Flex
                  alignItems="center"
                  bg="transparent"
                  px="0px"
                  borderRadius="15px"
                  flex="1"
                  minW="0"
                >
                  {prop.icon ? (
                    (() => {
                      const iconContent = (
                        <Flex>
                          <IconBox
                            bg={inactiveBg}
                            color={inactiveColorIcon}
                            h="30px"
                            w="30px"
                            me="12px"
                            transition={variantChange}
                            boxShadow={sidebarActiveShadow}
                            _hover={{ boxShadow: 'none' }}
                          >
                            {prop.icon}
                          </IconBox>
                          <Text
                            color={inactiveColor}
                            my="auto"
                            fontSize="sm"
                            display={sidebarWidth === 275 ? 'block' : 'none'}
                            noOfLines={1}
                            maxW="180px"
                            title={
                              Object.keys(intl?.messages).includes(`app.${prop.id}`)
                                ? intl.formatMessage({ id: `app.${prop.id}` })
                                : prop.name
                            }
                          >
                            {Object.keys(intl?.messages).includes(`app.${prop.id}`)
                              ? intl.formatMessage({ id: `app.${prop.id}` })
                              : prop.name}
                          </Text>
                        </Flex>
                      );
                      return prop.isCompanySettings ? (
                        <NavLink to={prop.layout + prop.path}>{iconContent}</NavLink>
                      ) : (
                        iconContent
                      );
                    })()
                  ) : (
                    <HStack
                      spacing={sidebarWidth === 275 ? '26px' : '0px'}
                      ps={sidebarWidth === 275 ? '10px' : '0px'}
                      ms={sidebarWidth === 275 ? '0px' : '8px'}
                    >
                      <Icon
                        as={FaCircle}
                        w="6px"
                        color="green.500"
                        display={sidebarWidth === 275 ? 'block' : 'none'}
                      />
                      {prop.farmId ? (
                        <NavLink color="red" to={prop.layout + prop.path}>
                          <Text
                            color={inactiveColor}
                            my="auto"
                            fontSize="md"
                            fontWeight="normal"
                            maxW={sidebarWidth === 275 ? '180px' : 'auto'}
                            wordBreak="break-word"
                            whiteSpace="normal"
                            lineHeight="1.4"
                            textAlign="left"
                          >
                            {sidebarWidth === 275 ? prop.name : prop.name[0]}
                          </Text>
                        </NavLink>
                      ) : (
                        <Text
                          color={inactiveColor}
                          my="auto"
                          fontSize="md"
                          fontWeight="normal"
                          maxW={sidebarWidth === 275 ? '180px' : 'auto'}
                          wordBreak="break-word"
                          whiteSpace="normal"
                          lineHeight="1.4"
                          textAlign="left"
                        >
                          {sidebarWidth === 275 ? prop.name : prop.name[0]}
                        </Text>
                      )}
                    </HStack>
                  )}
                </Flex>
              )}
              <AccordionIcon
                color="gray.400"
                flexShrink={0}
                display={
                  prop.icon
                    ? sidebarWidth === 275 && !prop.isCompanySettings
                      ? 'block'
                      : 'none'
                    : 'block'
                }
                transform={
                  prop.icon && !prop.isCompanySettings
                    ? null
                    : sidebarWidth === 275
                    ? null
                    : 'translateX(-70%)'
                }
              />
            </AccordionButton>
            <AccordionPanel
              pe={prop.icon ? null : '0px'}
              display={prop.isCompanySettings ? 'none' : 'block'}
              pb="8px"
              ps={prop.icon && !prop.isCompanySettings ? null : sidebarWidth === 275 ? null : '8px'}
            >
              {(dynamicRoutes ||
                commercialDynamicRoutes ||
                transparencyDynamicRoutes ||
                iotDynamicRoutes) && (
                <List>
                  {
                    prop.icon && !prop.isCompanySettings ? (
                      // Wrap establishment links in their own accordion to allow multiple open
                      <Accordion allowMultiple>
                        {(() => {
                          const routes =
                            prop.isDashboard && !prop.items
                              ? dynamicRoutes
                              : prop.isCommercial
                              ? commercialDynamicRoutes
                              : prop.isTransparencyDashboard
                              ? transparencyDynamicRoutes
                              : prop.isOrganicSystemPlan
                              ? ospDynamicRoutes
                              : prop.isIoTDashboard
                              ? iotDynamicRoutes
                              : prop.items;
                          return createLinks(routes);
                        })()}
                      </Accordion>
                    ) : (
                      createAccordionLinks(
                        prop.isDashboard && !prop.items
                          ? dynamicRoutes
                          : prop.isCommercial
                          ? commercialDynamicRoutes
                          : prop.isTransparencyDashboard
                          ? transparencyDynamicRoutes
                          : prop.isIoTDashboard
                          ? iotDynamicRoutes
                          : prop.items
                      )
                    ) // for non-bullet accordion links
                  }
                </List>
              )}
            </AccordionPanel>
          </AccordionItem>
        );
      } else {
        return (
          <NavLink to={prop.layout + prop.path}>
            {prop.icon ? (
              <Box>
                <HStack spacing="14px" py="15px" px="15px">
                  <IconBox
                    bg="green.500"
                    color="white"
                    h="30px"
                    w="30px"
                    transition={variantChange}
                  >
                    {prop.icon}
                  </IconBox>
                  <Text
                    color={activeRoute(prop.regex) ? activeColor : inactiveColor}
                    fontWeight={activeRoute(prop.regex) ? 'bold' : 'normal'}
                    fontSize="sm"
                  >
                    {prop.name}
                  </Text>
                </HStack>
              </Box>
            ) : (
              <ListItem>
                <HStack
                  spacing={
                    sidebarWidth === 275 ? (activeRoute(prop.regex) ? '22px' : '26px') : '8px'
                  }
                  py="5px"
                  px={sidebarWidth === 275 ? '10px' : '0px'}
                >
                  <Icon
                    as={FaCircle}
                    w={activeRoute(prop.regex) ? '10px' : '6px'}
                    color="green.500"
                    display={sidebarWidth === 275 ? 'block' : 'none'}
                  />
                  <Text
                    color={activeRoute(prop.regex) ? activeColor : inactiveColor}
                    fontWeight={activeRoute(prop.regex) ? 'bold' : 'normal'}
                  >
                    {sidebarWidth === 275 ? prop.name : prop.name[0]}
                  </Text>
                </HStack>
              </ListItem>
            )}
          </NavLink>
        );
      }
    });
  };

  const createAccordionLinks = (routes: Route[] | undefined) => {
    const inactiveColor = cmInactiveColor;
    const activeColor = cmActiveColor;
    return routes?.map((prop, index) => {
      return (
        <NavLink to={prop.layout + prop.path}>
          <ListItem pt="5px" ms={sidebarWidth === 275 ? '26px' : '0px'} key={index}>
            <Text
              mb="4px"
              color={activeRoute(prop.regex) ? activeColor : inactiveColor}
              fontWeight={activeRoute(prop.regex) ? 'bold' : 'normal'}
              fontSize="sm"
              maxW={sidebarWidth === 275 ? '180px' : 'auto'}
              wordBreak="break-word"
              whiteSpace="normal"
              lineHeight="1.4"
            >
              {sidebarWidth === 275 ? prop.name : prop.name[0]}
            </Text>
          </ListItem>
        </NavLink>
      );
    });
  };
  const { logoText, routes, sidebarVariant } = props;
  let isWindows = navigator.platform.startsWith('Win');

  //  Chakra Color Mode
  let sidebarBg = 'none';
  let sidebarRadius = '0px';
  let sidebarMargins = '0px';
  if (sidebarVariant === 'opaque') {
    sidebarBg = cmWhiteGray;
    sidebarRadius = '16px';
    sidebarMargins = '16px 0px 16px 16px';
  }
  let brand = (
    <Box pt={'25px'} mb="12px">
      <NavLink
        to="/admin/dashboard"
        style={{
          display: 'flex',
          lineHeight: '100%',
          marginBottom: '10px',
          fontWeight: 'bold',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '11px'
        }}
      >
        <Image src={logo} alt="trazo logo" height="40px" paddingRight="10px" />
      </NavLink>
      <HSeparator />
    </Box>
  );
  // Separate collapsible and non-collapsible routes
  const collapsibleRoutes = routes?.filter((route: Route) => route.collapse) || [];
  const nonCollapsibleRoutes = routes?.filter((route: Route) => !route.collapse) || [];

  let links = (
    <>
      {/* Non-collapsible routes */}
      {createLinks(nonCollapsibleRoutes)}

      {/* Fixed accordion - only one main section open, but allow multiple establishments within */}
      {collapsibleRoutes.length > 0 && (
        <Accordion allowToggle defaultIndex={0}>
          {collapsibleRoutes.map((route: Route, index: number) =>
            createLinks([route]).map((item, itemIndex) =>
              React.cloneElement(item, { key: `${index}-${itemIndex}` })
            )
          )}
        </Accordion>
      )}
    </>
  );

  let sidebarContent = (
    <Box>
      <Box mb="20px">{brand}</Box>
      <Stack direction="column" mb="40px" as="nav" aria-label="Main navigation" data-tour="sidebar-nav">
        <Box>{links}</Box>
      </Stack>
      <SidebarHelp sidebarWidth={sidebarWidth} />
    </Box>
  );

  // Determine if we're on mobile
  const isMobile = useBreakpointValue({ base: true, xl: false });

  // Close mobile drawer on route change
  useEffect(() => {
    if (isMobile && props.isOpen && props.onClose) {
      props.onClose();
    }
  }, [location.pathname]);

  // SIDEBAR
  if (isMobile) {
    // Mobile view - render as drawer
    return (
      <Drawer
        placement="left"
        isOpen={props.isOpen || false}
        onClose={props.onClose || (() => {})}
        size="xs"
      >
        <DrawerOverlay />
        <DrawerContent
          w="250px"
          maxW="250px"
          ms={{
            sm: '16px'
          }}
          my={{
            sm: '16px'
          }}
          borderRadius="16px"
          bg={cmWhiteGray}
        >
          <DrawerCloseButton
            _focus={{ boxShadow: 'none' }}
            _hover={{ boxShadow: 'none' }}
            aria-label="Close navigation menu"
          />
          <DrawerBody className="sidebar-container" maxW="250px" px="1rem">
            <Box maxW="100%" h="100vh">
              {sidebarContent}
            </Box>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    );
  } else {
    // Desktop view - original sidebar
    return (
      <Box
        ref={mainPanel}
        onMouseEnter={
          toggleSidebar ? () => setSidebarWidth(sidebarWidth === 120 ? 275 : 120) : null
        }
        onMouseLeave={
          toggleSidebar ? () => setSidebarWidth(sidebarWidth === 275 ? 120 : 275) : null
        }
      >
        <Box display={{ sm: 'none', xl: 'block' }} position="fixed">
          <Box
            className="sidebar-container"
            bg={sidebarBg}
            transition={variantChange}
            w={`${sidebarWidth}px`}
            ms={{
              sm: '16px'
            }}
            my={{
              sm: '16px'
            }}
            h="calc(100vh - 32px)"
            ps="20px"
            pe="20px"
            m={sidebarMargins}
            borderRadius={sidebarRadius}
            role="navigation"
            aria-label="Main navigation"
          >
            {isWindows ? (
              <Scrollbars
                autoHide
                renderTrackVertical={renderTrack}
                renderThumbVertical={cmThumb}
                renderView={renderView}
              >
                <Box pe="15px">
                  {sidebarContent}
                </Box>
              </Scrollbars>
            ) : (
              <Box id="sidebarScrollRemove" overflowY="scroll" height="100vh">
                {sidebarContent}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    );
  }
}

export default Sidebar;
