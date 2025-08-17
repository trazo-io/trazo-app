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

export default function AdminNavbar(props: AdminNavbarProps) {
  const intl = useIntl();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const { sidebarWidth } = useContext(SidebarContext);
  const { variant, children, fixed, secondary, brandText, onOpen, ...rest } = props;

  const [currentEstablishment, setCurrentEstablishment] = useState<any>(null);
  const [currentParcel, setCurrentParcel] = useState<any>(null);

  const { establishmentId, parcelId } = useParams<{ establishmentId: string; parcelId: string }>();

  const establishments = useSelector(
    (state: RootState) => state.company.currentCompany?.establishments
  );

  const subscription = useSelector((state) => state.company.currentCompany?.subscription);

  useEffect(() => {
    if (establishmentId) {
      const establishment = establishments?.find((e) => e.id.toString() === establishmentId);
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
  }, [establishmentId, parcelId, establishments]);

  // 🚀 2025 Best Practice: Programmatic Navigation with State Preservation
  const handleEstablishmentClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Optimized navigation: No page refresh, preserves state, instant transition
    if (establishmentId) {
      navigate(`/admin/dashboard/establishment/${establishmentId}`, {
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
      left={''}
      right={'30px'}
      justifyContent={{ xl: 'center' }}
      lineHeight="25.6px"
      mx="auto"
      mt={secondaryMargin}
      pb="8px"
      px={{
        sm: paddingX,
        md: '30px'
      }}
      ps={{
        sm: paddingS,
        md: '20px'
      }}
      pt="8px"
      top="18px"
      w={{
        sm: 'calc(100vw - 30px)',
        xl: `calc(100vw - 75px - ${sidebarWidth}px)`
      }}>
      <Flex
        w="100%"
        h="100%"
        minH={{ base: '56px', sm: '60px', md: '64px' }}
        align="center"
        justify="space-between"
        gap={{ base: 1, sm: 2, md: 3 }}
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

        {/* Breadcrumb Container - Mobile Below Buttons */}
        <Flex
          align="center"
          flex={{ base: 'none', smd: '1' }}
          minW="0"
          w={{ base: '100%', smd: 'auto' }}
          order={{ base: 2, smd: 1 }}
          justify={{ base: 'flex-start', smd: 'flex-start' }}>
          <Breadcrumb
            fontSize={{ base: 'sm', md: 'md' }}
            spacing={{ base: '4px', sm: '6px', md: '8px' }}
            separator={
              <Box color={secondaryText} fontSize={{ base: 'xs', md: 'sm' }} px={{ base: 0.5, md: 1 }}>
                /
              </Box>
            }>
            
            {/* Home - Always visible, never truncates */}
            <BreadcrumbItem color={mainText}>
              <BreadcrumbLink
                onClick={handleHomeClick}
                color={secondaryText}
                fontSize={{ base: 'sm', md: 'md' }}
                _hover={{ color: mainText, textDecoration: 'none', cursor: 'pointer' }}
                flexShrink={0}
                whiteSpace="nowrap"
                cursor="pointer">
                {intl.formatMessage({ id: 'app.home' })}
              </BreadcrumbLink>
            </BreadcrumbItem>

            {/* Establishment - Smart responsive truncation */}
            {currentEstablishment && (
              <BreadcrumbItem color={mainText}>
                <BreadcrumbLink
                  onClick={parcelId ? handleEstablishmentClick : undefined}
                  color={!parcelId ? 'green.600' : mainText} // 🎯 Active state when on establishment page
                  fontSize={{ base: 'sm', md: 'md' }}
                  fontWeight="500"
                  noOfLines={1}
                  title={currentEstablishment.name}
                  maxW={{
                    base: currentParcel ? 'clamp(120px, 40vw, 250px)' : 'clamp(200px, 70vw, 350px)',
                    sm: currentParcel ? 'clamp(140px, 45vw, 280px)' : 'clamp(220px, 65vw, 400px)',
                    smd: currentParcel ? 'clamp(160px, 40vw, 300px)' : 'clamp(250px, 60vw, 450px)',
                    md: currentParcel ? 'clamp(180px, 35vw, 320px)' : 'clamp(280px, 55vw, 500px)',
                    lg: 'none'
                  }}
                  _hover={parcelId ? { 
                    color: 'green.600', 
                    textDecoration: 'none', 
                    cursor: 'pointer',
                    transform: 'translateY(-0.5px)',
                    transition: 'all 0.2s ease'
                  } : {}}
                  cursor={parcelId ? 'pointer' : 'default'}
                  transition="all 0.2s ease">
                  {currentEstablishment.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
            )}

            {/* Parcel - Smart responsive truncation */}
            {currentParcel && (
              <BreadcrumbItem color={mainText}>
                <BreadcrumbLink
                  color="green.600" // 🎯 Always active (current page) when parcel is shown
                  fontSize={{ base: 'sm', md: 'md' }}
                  fontWeight="600" // Slightly bolder for current page emphasis
                  noOfLines={1}
                  title={currentParcel.name}
                  maxW={{
                    base: 'clamp(100px, 35vw, 200px)',
                    sm: 'clamp(120px, 40vw, 240px)', 
                    smd: 'clamp(140px, 35vw, 280px)',
                    md: 'clamp(160px, 30vw, 320px)',
                    lg: 'none'
                  }}
                  cursor="default"> {/* Not clickable - current page */}
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
