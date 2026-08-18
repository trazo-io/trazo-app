import React, { useRef } from 'react';
import { Box, Flex, Portal } from '@chakra-ui/react';
import { Outlet } from 'react-router-dom';
import Footer from '../Footer/Footer';
import AuthNavbar from 'components/Navbars/AuthNavbar';
import { ConsentBanner } from '../Privacy/ConsentBanner';

interface ConsumerProductLayoutProps {
  children?: React.ReactNode;
}

/**
 * Layout specifically designed for consumer product detail pages
 * Includes footer and proper mobile-first responsive structure
 * Following Trazo design standards with proper spacing and hierarchy
 */
export const ConsumerProductLayout: React.FC<ConsumerProductLayoutProps> = ({ children }) => {
  const navRef = useRef<HTMLDivElement>(null);

  return (
    <Box ref={navRef} w="100%">
      {/* Navigation Header with Trazo Logo */}
      <Portal containerRef={navRef}>
        <AuthNavbar secondary={false} logoText="trazo" logo="" forceDefaultLogo />
      </Portal>

      {/* Privacy Consent Banner for consumer analytics */}
      <ConsentBanner />

      <Flex direction="column" minH="100vh" bg="gray.50">
        {/* Main Content - Full width for product detail */}
        <Box flex="1" w="100%">
          {children ? children : <Outlet />}
        </Box>

        {/* Footer - Following Trazo standards */}
        <Box
          as="footer"
          bg="white"
          borderTop="1px solid"
          borderTopColor="gray.200"
          px={4}
          pt={6}
          pb={{ base: '120px', md: 6 }}>
          <Footer />
        </Box>
      </Flex>
    </Box>
  );
};

export default ConsumerProductLayout;
