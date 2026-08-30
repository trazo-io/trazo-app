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

/**
 * Parcels listed under a farm in the sidebar before the list is cut off. Matches the cap the OSP
 * page uses for its parcel-application list, so the two agree on "a few, then a way to see all".
 */
const SIDEBAR_PARCEL_LIMIT = 6;

function Sidebar(props: SidebarProps) {
  const intl = useIntl();
  // to check for active links and opened collapses
  let location = useLocation();

  // this is for the rest of the collapses

  const [dynamicRoutes, setDynamicRoutes] = useState<Route[]>([]);
  const [ospDynamicRoutes, setOspDynamicRoutes] = useState([]);
  const [iotDynamicRoutes, setIotDynamicRoutes] = useState([]);
  const [documentsDynamicRoutes, setDocumentsDynamicRoutes] = useState([]);
  const [activitiesDynamicRoutes, setActivitiesDynamicRoutes] = useState([]);
  const [buyerDynamicRoutes, setBuyerDynamicRoutes] = useState([]);

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
  // green.700, not green.500. This one value paints BOTH the active nav chip (white glyph on
  // it: green.500 = 2.78:1) and every inactive nav icon (green.500 on a near-white chip =
  // 2.70:1). Both are below the 3:1 WCAG 1.4.11 asks of a meaningful graphic; green.700 is
  // 5.13:1 and 4.98:1. green.500 stays the brand colour everywhere it is not carrying content.
  const cmGreen = useColorModeValue('green.700', 'green.700');
  const cmWhiteGray = useColorModeValue('white', 'gray.700');
  const cmWhiteWhite = useColorModeValue('white', 'white');
  const cmActiveColor = useColorModeValue('gray.700', 'white');
  /**
   * gray.500, not gray.400. This paints every INACTIVE nav label — "Activities", "Organic
   * System Plan", "Documents", "Buyer Page", "Subscription", "Educational Resources",
   * "Company Settings" — i.e. 16px primary navigation text, which owes 4.5:1. MEASURED
   * 2026-08-28 on the farm dashboard: gray.400 #9E9E9E is 2.68:1, the lowest-contrast text
   * anywhere on the screen, and it covered seven of the eight nav items (only the active
   * "Home" was legible, at gray.700). gray.500 #757575 is 4.61:1.
   *
   * Still clearly quieter than the active label (gray.700, 10.05:1), and active/inactive was
   * never carried by this colour alone anyway — the active item also gets the filled green
   * chip, which is the fill change frontend.md requires alongside any colour shift.
   *
   * Same defect class as the nav ICONS three lines above: a mark that carries meaning was
   * given a decorative-tint step.
   */
  const cmInactiveColor = useColorModeValue('gray.500', 'gray.400');
  const cmInactiveBgOpaque = useColorModeValue('gray.100', 'gray.600');
  const cmThumb = useColorModeValue(renderThumbLight, renderThumbDark);

  let variantChange = '0.2s linear';

  const activeRoute = (regex: RegExp) => {
    return regex.test(location.pathname);
  };

  useEffect(() => {
    const dynamicRoutes = (establishments ?? []).map((e: EstablishmentType) => {
      return {
        name: e.name,
        path: `/dashboard/farm/${e.id}`,
        collapse: true,
        farmId: e.id,
        authIcon: <HomeIcon color="inherit" />,
        layout: '/admin',
        isDashboard: true,
        regex: new RegExp(`^\\/admin\\/dashboard\\/farm\\/${e.id}(\\/.*)?$`),
        // Parcels are CAPPED. Expanding a farm used to list every parcel it has, so a
        // 25-parcel operation pushed Activities / OSP / Documents / Buyer Page off the bottom
        // of the sidebar — the primary navigation buried under a data list. Neither a nested
        // scroll region (scrollbar inside a scrollbar) nor pagination (navigation is not a
        // dataset) belongs in a nav tree; the standard is a short list plus a way to reach the
        // rest, which here is the farm home's parcel carousel and the ⌘K search this app
        // already ships.
        items: [
          ...(e?.parcels ?? []).slice(0, SIDEBAR_PARCEL_LIMIT).map((p: ParcelType) => {
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
          }),
          ...((e?.parcels?.length ?? 0) > SIDEBAR_PARCEL_LIMIT
            ? [
                {
                  name: intl.formatMessage(
                    { id: 'sidebar.viewAllParcels' },
                    { count: e.parcels.length }
                  ),
                  path: `/dashboard/farm/${e.id}`,
                  // Same shape as a parcel entry above, `component` included: a differently
                  // shaped object turns `items` into a union type and the whole array stops
                  // matching `Route[]`.
                  component: Overview,
                  layout: '/admin',
                  isDashboard: true,
                  // Deliberately matches nothing: this is a way out of the list, not a
                  // destination that should ever paint itself as the active parcel.
                  regex: /(?!)/
                }
              ]
            : [])
        ]
      };
    });

    const iotDynamicRoutes = (establishments ?? []).map((e: EstablishmentType) => {
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

    // WS-4 — Activities per establishment.
    const activitiesDynamicRoutes = (establishments ?? []).map((e: EstablishmentType) => {
      return {
        name: e.name,
        path: `/dashboard/farm/${e.id}/activities`,
        farmId: e.id,
        authIcon: <HomeIcon color="inherit" />,
        regex: new RegExp(`^\\/admin\\/dashboard\\/farm\\/${e.id}\\/activities$`),
        layout: '/admin',
        items: []
      };
    });

    // WS-6 — Buyer Page per establishment.
    const buyerDynamicRoutes = (establishments ?? []).map((e: EstablishmentType) => {
      return {
        name: e.name,
        path: `/dashboard/farm/${e.id}/buyer`,
        farmId: e.id,
        authIcon: <HomeIcon color="inherit" />,
        regex: new RegExp(`^\\/admin\\/dashboard\\/farm\\/${e.id}\\/buyer$`),
        layout: '/admin',
        items: []
      };
    });

    // WS-1 — Documents (DMS) per establishment.
    const documentsDynamicRoutes = (establishments ?? []).map((e: EstablishmentType) => {
      return {
        name: e.name,
        path: `/dashboard/farm/${e.id}/documents`,
        farmId: e.id,
        authIcon: <HomeIcon color="inherit" />,
        regex: new RegExp(`^\\/admin\\/dashboard\\/farm\\/${e.id}\\/documents$`),
        layout: '/admin',
        items: []
      };
    });

    // Sprint 5A — Organic System Plan per establishment.
    const ospDynamicRoutes = (establishments ?? []).map((e: EstablishmentType) => {
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
      setOspDynamicRoutes(ospDynamicRoutes);
      setIotDynamicRoutes(iotDynamicRoutes);
      setDocumentsDynamicRoutes(documentsDynamicRoutes);
      setBuyerDynamicRoutes(buyerDynamicRoutes);
      setActivitiesDynamicRoutes(activitiesDynamicRoutes);
    }
    // `intl.locale`, NOT the `intl` object: this effect calls setState, so depending on an
    // object identity that a provider might not memoise is an infinite-render risk for the sake
    // of one translated label. The locale string is the thing that actually changes.
  }, [establishments, intl.locale]);

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
              key={index}>
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
              aria-label={`${prop.name} navigation section`}>
              {activeRoute(prop.regex) ? (
                <Flex
                  alignItems="center"
                  bg="transparent"
                  transition={variantChange}
                  px="0px"
                  borderRadius="15px"
                  flex="1"
                  minW="0">
                  {prop.icon ? (
                    <Flex>
                      <IconBox
                        bg={activeBg}
                        color={activeColorIcon}
                        h="30px"
                        w="30px"
                        me="12px"
                        transition={variantChange}>
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
                        }>
                        {Object.keys(intl?.messages).includes(`app.${prop.id}`)
                          ? intl.formatMessage({ id: `app.${prop.id}` })
                          : prop.name}
                      </Text>
                    </Flex>
                  ) : (
                    <HStack
                      spacing={sidebarWidth === 275 ? '22px' : '0px'}
                      ps={sidebarWidth === 275 ? '10px' : '0px'}
                      ms={sidebarWidth === 275 ? '0px' : '8px'}>
                      <Icon
                        as={FaCircle}
                        w="10px"
                        color="green.700"
                        display={sidebarWidth === 275 ? 'block' : 'none'}
                      />
                      {prop.farmId ? (
                        <NavLink to={prop.layout + prop.path}>
                          <Text
                            color={activeColor}
                            my="auto"
                            fontSize="sm"
                            maxW={sidebarWidth === 275 ? '180px' : 'none'}
                            wordBreak="break-word"
                            whiteSpace="normal"
                            lineHeight="1.4"
                            textAlign="left">
                            {sidebarWidth === 275 ? prop.name : prop.name[0]}
                          </Text>
                        </NavLink>
                      ) : (
                        <Text
                          color={activeColor}
                          my="auto"
                          fontSize="sm"
                          maxW={sidebarWidth === 275 ? '180px' : 'none'}
                          wordBreak="break-word"
                          whiteSpace="normal"
                          lineHeight="1.4"
                          textAlign="left">
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
                  minW="0">
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
                            _hover={{ boxShadow: 'none' }}>
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
                            }>
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
                      ms={sidebarWidth === 275 ? '0px' : '8px'}>
                      <Icon
                        as={FaCircle}
                        w="6px"
                        color="green.700"
                        display={sidebarWidth === 275 ? 'block' : 'none'}
                      />
                      {prop.farmId ? (
                        <NavLink color="red" to={prop.layout + prop.path}>
                          <Text
                            color={inactiveColor}
                            my="auto"
                            fontSize="md"
                            fontWeight="normal"
                            maxW={sidebarWidth === 275 ? '180px' : 'none'}
                            wordBreak="break-word"
                            whiteSpace="normal"
                            lineHeight="1.4"
                            textAlign="left">
                            {sidebarWidth === 275 ? prop.name : prop.name[0]}
                          </Text>
                        </NavLink>
                      ) : (
                        <Text
                          color={inactiveColor}
                          my="auto"
                          fontSize="md"
                          fontWeight="normal"
                          maxW={sidebarWidth === 275 ? '180px' : 'none'}
                          wordBreak="break-word"
                          whiteSpace="normal"
                          lineHeight="1.4"
                          textAlign="left">
                          {sidebarWidth === 275 ? prop.name : prop.name[0]}
                        </Text>
                      )}
                    </HStack>
                  )}
                </Flex>
              )}
              {/* gray.500 (4.61:1), not gray.400 (2.68:1). A disclosure chevron is not
                  decoration — it is the only thing saying this row expands — so it owes the
                  3.0 WCAG 1.4.11 floor a meaningful graphic owes. */}
              <AccordionIcon
                color="gray.500"
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
              ps={
                prop.icon && !prop.isCompanySettings ? null : sidebarWidth === 275 ? null : '8px'
              }>
              {(dynamicRoutes || iotDynamicRoutes) && (
                <List>
                  {
                    prop.icon && !prop.isCompanySettings ? (
                      // Wrap establishment links in their own accordion to allow multiple open
                      <Accordion allowMultiple>
                        {(() => {
                          const routes =
                            prop.isDashboard && !prop.items
                              ? dynamicRoutes
                              : prop.isOrganicSystemPlan
                              ? ospDynamicRoutes
                              : prop.isBuyer
                              ? buyerDynamicRoutes
                              : prop.isDocuments
                              ? documentsDynamicRoutes
                              : prop.isActivities
                              ? activitiesDynamicRoutes
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
                          : prop.isBuyer
                          ? buyerDynamicRoutes
                          : prop.isDocuments
                          ? documentsDynamicRoutes
                          : prop.isActivities
                          ? activitiesDynamicRoutes
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
                    bg="green.700"
                    color="white"
                    h="30px"
                    w="30px"
                    transition={variantChange}>
                    {prop.icon}
                  </IconBox>
                  <Text
                    color={activeRoute(prop.regex) ? activeColor : inactiveColor}
                    fontWeight={activeRoute(prop.regex) ? 'bold' : 'normal'}
                    fontSize="sm">
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
                  px={sidebarWidth === 275 ? '10px' : '0px'}>
                  <Icon
                    as={FaCircle}
                    w={activeRoute(prop.regex) ? '10px' : '6px'}
                    color="green.700"
                    display={sidebarWidth === 275 ? 'block' : 'none'}
                  />
                  <Text
                    color={activeRoute(prop.regex) ? activeColor : inactiveColor}
                    fontWeight={activeRoute(prop.regex) ? 'bold' : 'normal'}>
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
              maxW={sidebarWidth === 275 ? '180px' : 'none'}
              wordBreak="break-word"
              whiteSpace="normal"
              lineHeight="1.4">
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
        }}>
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
      <Stack
        direction="column"
        mb="40px"
        as="nav"
        aria-label="Main navigation"
        data-tour="sidebar-nav">
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
        size="xs">
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
          bg={cmWhiteGray}>
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
        }>
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
            aria-label="Main navigation">
            {isWindows ? (
              <Scrollbars
                autoHide
                renderTrackVertical={renderTrack}
                renderThumbVertical={cmThumb}
                renderView={renderView}>
                <Box pe="15px">{sidebarContent}</Box>
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
