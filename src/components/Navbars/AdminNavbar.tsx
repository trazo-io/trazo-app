// Add the getDaysRemaining function
const getDaysRemaining = (trialEndDate: string | null | undefined): number => {
  if (!trialEndDate) return 0;

  const end = new Date(trialEndDate);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
};

import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Flex,
  useColorModeValue,
  Tag,
  TagLabel,
  TagLeftIcon
} from '@chakra-ui/react';
import { useContext, useEffect, useState } from 'react';

import AdminNavbarLinks from './AdminNavbarLinks';
import { PAGE_MAX_W } from 'components/Design/StandardComponents';
import PropTypes from 'prop-types';
import { SidebarContext } from 'contexts/SidebarContext';
import { useIntl } from 'react-intl';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FaClock } from 'react-icons/fa';

// Add RootState type definition
type RootState = {
  company: {
    currentCompany?: {
      establishments?: any[];
      subscription?: any;
    };
  };
};

type AdminNavbarProps = {
  brandText: string;
  variant: string;
  secondary: boolean;
  fixed: boolean;
  children: React.ReactNode;
  onOpen: () => void;
  logoText: string;
};

/**
 * A 44px hit area without changing the navbar's height.
 *
 * MEASURED 2026-08-22: a breadcrumb link is 26px tall, against the 44px minimum
 * `.claude/rules/frontend.md` sets for touch targets — and it sits at the very top of the
 * screen, next to the status bar, where a thumb is least accurate. Padding alone would grow
 * the navbar, so the negative margin pulls the layout back to where it was: the box the finger
 * hits is 44px, the box the eye sees is unchanged.
 */
const CRUMB_TAP_TARGET = {
  display: 'inline-flex',
  alignItems: 'center',
  minH: '44px',
  py: '9px',
  my: '-9px'
} as const;

export default function AdminNavbar(props: AdminNavbarProps) {
  const intl = useIntl();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const { sidebarWidth } = useContext(SidebarContext);
  const { variant, children, fixed, secondary, brandText, onOpen, ...rest } = props;

  const [currentEstablishment, setCurrentEstablishment] = useState<any>(null);
  const [currentParcel, setCurrentParcel] = useState<any>(null);

  const { farmId, parcelId } = useParams<{ farmId: string; parcelId: string }>();

  const establishments = useSelector(
    (state: RootState) => state.company.currentCompany?.establishments
  );

  const subscription = useSelector((state) => state.company.currentCompany?.subscription);

  useEffect(() => {
    if (farmId) {
      const establishment = establishments?.find((e) => e.id.toString() === farmId);
      if (establishment) {
        setCurrentEstablishment(establishment);
        if (parcelId) {
          const parcels = establishment.parcels;
          const parcel = parcels?.find((p) => p.id.toString() === parcelId);
          if (parcel) {
            setCurrentParcel(parcel);
          }
        } else {
          setCurrentParcel(null);
        }
      }
    } else {
      setCurrentEstablishment(null);
      setCurrentParcel(null);
    }
  }, [farmId, parcelId, establishments]);

  // Programmatic Navigation with State Preservation
  const handleEstablishmentClick = (e: React.MouseEvent) => {
    e.preventDefault();

    // Optimized navigation: No page refresh, preserves state, instant transition
    if (farmId) {
      navigate(`/admin/dashboard/farm/${farmId}`, {
        // Replace current entry to maintain clean history stack
        replace: false,
        // Preserve scroll position for better UX
        state: {
          preserveScroll: true,
          navigationSource: 'breadcrumb'
        }
      });
    }
  };

  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/admin/dashboard/', {
      replace: false,
      state: {
        preserveScroll: true,
        navigationSource: 'breadcrumb'
      }
    });
  };

  // Here are all the props that may change depending on navbar's type or state.(secondary, variant, scrolled)
  let mainText = useColorModeValue('gray.700', 'gray.200');
  let secondaryText = useColorModeValue('gray.400', 'gray.200');
  let navbarPosition = 'absolute';
  let navbarFilter = 'none';
  let navbarBackdrop = 'none';
  let navbarShadow = 'none';
  let navbarBg = 'none';
  let navbarBorder = 'transparent';
  let secondaryMargin = '0px';
  let paddingS = '15px';
  let paddingX = '15px';
  if (props.fixed === true)
    if (scrolled === true) {
      navbarPosition = 'fixed';
      navbarShadow = useColorModeValue('0px 7px 23px rgba(0, 0, 0, 0.05)', 'none');
      navbarBg = useColorModeValue(
        'linear-gradient(112.83deg, rgba(255, 255, 255, 0.82) 0%, rgba(255, 255, 255, 0.8) 110.84%)',
        'linear-gradient(112.83deg, rgba(255, 255, 255, 0.21) 0%, rgba(255, 255, 255, 0) 110.84%)'
      );
      navbarBorder = useColorModeValue('#FFFFFF', 'rgba(255, 255, 255, 0.31)');
      navbarFilter = useColorModeValue('none', 'drop-shadow(0px 7px 23px rgba(0, 0, 0, 0.05))');
    }
  if (props.secondary) {
    navbarBackdrop = 'none';
    navbarPosition = 'absolute';
    mainText = 'white';
    secondaryText = 'white';
    secondaryMargin = '22px';
    paddingS = '40px';
    paddingX = '30px';
  }
  const changeNavbar = () => {
    if (window.scrollY > 1) {
      setScrolled(true);
    } else {
      setScrolled(false);
    }
  };

  // Fix: Properly manage scroll event listener with useEffect and cleanup
  useEffect(() => {
    window.addEventListener('scroll', changeNavbar);

    // Cleanup function to remove event listener
    return () => {
      window.removeEventListener('scroll', changeNavbar);
    };
  }, []); // Empty dependency array means this runs once on mount and cleanup on unmount

  return (
    <Flex
      position={navbarPosition}
      boxShadow={navbarShadow}
      bg={navbarBg}
      borderColor={navbarBorder}
      filter={navbarFilter}
      backdropFilter={navbarBackdrop}
      borderWidth="1.5px"
      borderStyle="solid"
      // transitionDelay="0s, 0s, 0s, 0s"
      // transitionDuration=" 0.25s, 0.25s, 0.25s, 0s"
      // transition-property="box-shadow, background-color, filter, border"
      // transitionTimingFunction="linear, linear, linear, linear"
      alignItems={{ xl: 'center' }}
      borderRadius="16px"
      display="flex"
      minH="75px"
      left={{ base: '12px', xl: `${sidebarWidth + 30}px` }}
      right={{ base: '12px', xl: '30px' }}
      justifyContent={{ xl: 'center' }}
      lineHeight="25.6px"
      mx="auto"
      mt={secondaryMargin}
      pb="8px"
      // 16px from md, both sides: the page column's gutter (PAGE_GUTTER md = 4), so the
      // breadcrumb and the page title start at the same x and the icons end where the cards do.
      // It was 20px left / 30px right (2026-11-06).
      px={{
        base: '12px',
        sm: paddingX,
        md: '16px'
      }}
      ps={{
        base: '12px',
        sm: paddingS,
        md: '16px'
      }}
      pt="8px"
      top="18px"
      w="auto">
      {/* Capped like the page column (PAGE_MAX_W, centred): on a 1920px screen the breadcrumb
          sat at the panel's left edge while the capped content started 50-76px further in. */}
      <Flex
        w="100%"
        maxW={PAGE_MAX_W}
        mx="auto"
        h="100%"
        minH={{ base: '56px', sm: '60px', md: '64px' }}
        align="center"
        justify="space-between"
        gap={{ base: 1, sm: 4, md: 5 }}
        flexDirection={{ base: 'column', smd: 'row' }}
        py={{ base: 1, smd: 0 }}>
        {/* Action Buttons Container - Mobile First */}
        <Flex
          align="center"
          flexShrink={0}
          w={{ base: '100%', smd: 'auto' }}
          order={{ base: 1, smd: 2 }}
          justify="flex-end">
          <AdminNavbarLinks
            onOpen={props.onOpen}
            logoText={props.logoText}
            secondary={props.secondary}
            fixed={props.fixed}
          />
        </Flex>

        {/* Breadcrumb Container - Simple & Reliable */}
        <Flex
          align="center"
          flex={{ base: 'none', smd: '1' }}
          minW="0"
          w={{ base: '100%', smd: 'auto' }}
          order={{ base: 2, smd: 1 }}
          justify={{ base: 'flex-start', smd: 'flex-start' }}
          // No padding needed - column layout on mobile, flex handles spacing on desktop
          pr={0}
          overflow="hidden">
          <Breadcrumb
            fontSize={{ base: 'sm', md: 'md' }}
            spacing={{ base: '4px', sm: '6px', md: '8px' }}
            separator={
              <Box
                /*
                 * gray.500 (4.61), not `secondaryText` (gray.400, 2.68). A separator should be
                 * quieter than the segments it divides, but it is still a rendered glyph and
                 * 2.68:1 is under every floor. This one token was also shared with the segment
                 * text, which is how the whole row ended up too faint.
                 */
                color="gray.500"
                fontSize={{ base: 'xs', md: 'sm' }}
                px={{ base: 0.5, md: 1 }}>
                /
              </Box>
            }>
            {/* Home - Always visible, never truncates */}
            <BreadcrumbItem color={mainText}>
              <BreadcrumbLink
                href="/admin/dashboard/"
                onClick={handleHomeClick}
                /*
                 * `green.700`, not `secondaryText`. Two reasons, both measured:
                 * gray.400 is 2.68:1 on white — this is TEXT and owes 4.5 — and green is the
                 * app's link colour, which the breadcrumb was spending on the one segment
                 * that is NOT a link (see the current-page item below).
                 */
                color="green.700"
                fontSize={{ base: 'sm', md: 'md' }}
                _hover={{ color: 'green.800', textDecoration: 'underline', cursor: 'pointer' }}
                flexShrink={0}
                whiteSpace="nowrap"
                cursor="pointer"
                {...CRUMB_TAP_TARGET}>
                {intl.formatMessage({ id: 'app.home' })}
              </BreadcrumbLink>
            </BreadcrumbItem>

            {/* Establishment - Smart space allocation based on context */}
            {currentEstablishment && (
              <BreadcrumbItem color={mainText}>
                <BreadcrumbLink
                  href={parcelId ? `/admin/dashboard/farm/${farmId}` : undefined}
                  onClick={parcelId ? handleEstablishmentClick : undefined}
                  aria-current={!parcelId ? 'page' : undefined}
                  /*
                   * ⚠️ INVERTED before this change, and that is the whole bug.
                   *
                   * It read `!parcelId ? 'green.700' : mainText` — green when this segment is
                   * the CURRENT PAGE (not clickable) and gray.700 when it is a LINK. Green is
                   * the app's link colour everywhere else, so on a parcel page the tappable
                   * farm name looked like plain text while the inert current-page segment
                   * looked like the link. People tap the green one and conclude navigation is
                   * broken.
                   */
                  color={parcelId ? 'green.700' : 'gray.700'}
                  fontSize={{ base: 'sm', md: 'md' }}
                  fontWeight="500"
                  {...(parcelId ? CRUMB_TAP_TARGET : {})}
                  title={currentEstablishment.name}
                  // Smart allocation: More space when alone, conservative when sharing with parcel
                  isTruncated
                  maxW={
                    currentParcel
                      ? { base: '120px', sm: '160px', smd: '200px', md: '220px', lg: '300px' } // Sharing space
                      : { base: '180px', sm: '250px', smd: '320px', md: '400px', lg: '500px' } // Taking full space
                  }
                  _hover={
                    parcelId
                      ? {
                          // darker on hover, per the palette rule — and an underline, so the
                          // affordance does not rest on colour alone
                          color: 'green.800',
                          textDecoration: 'underline',
                          cursor: 'pointer'
                        }
                      : {}
                  }
                  cursor={parcelId ? 'pointer' : 'default'}
                  transition="all 0.2s ease">
                  {currentEstablishment.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
            )}

            {/* Parcel - Simple truncation */}
            {currentParcel && (
              <BreadcrumbItem color={mainText}>
                <BreadcrumbLink
                  // The current page. Neutral, and marked as such for assistive tech — it was
                  // green.700 + bold, i.e. dressed as the only link in the row while carrying
                  // `cursor: default`.
                  aria-current="page"
                  color="gray.700"
                  fontSize={{ base: 'sm', md: 'md' }}
                  fontWeight="600"
                  title={currentParcel.name}
                  // Optimized breakpoints for better space utilization
                  isTruncated
                  maxW={{ base: '100px', sm: '140px', smd: '180px', md: '200px', lg: '250px' }}
                  cursor="default">
                  {currentParcel.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
            )}
          </Breadcrumb>
        </Flex>
      </Flex>
    </Flex>
  );
}

AdminNavbar.propTypes = {
  brandText: PropTypes.string,
  variant: PropTypes.string,
  secondary: PropTypes.bool,
  fixed: PropTypes.bool,
  onOpen: PropTypes.func
};
