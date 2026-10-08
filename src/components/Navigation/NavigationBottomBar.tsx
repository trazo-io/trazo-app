import React, { useState, useEffect } from 'react';
import { Box, HStack, VStack, Text, Icon, useColorModeValue, Center } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaClipboardList, FaHome } from 'react-icons/fa';
import { useIntl } from 'react-intl';

const MotionBox = motion(Box);

interface NavigationItem {
  id: string;
  labelId: string;
  defaultLabel: string;
  icon: any;
  targetSection: string;
}

interface NavigationBottomBarProps {
  activeSection?: string;
  onSectionChange?: (sectionId: string) => void;
  onScrollStart?: () => void;
  onScrollEnd?: () => void;
}

/**
 * Two tabs, named for what they scroll to. Until 2026-10-08 the bar carried the old buyer-page
 * framing: "Story" with a shield (a verification mark on a self-reported record) and "Impact"
 * with a leaf (carbon given the hero position the transparency-first rule keeps it out of, and a
 * general-benefit word). The record is the page; carbon stays in its expandable card inside it;
 * the farm profile is the other destination. The "Reviews" tab left on 2026-08-06 with the
 * review section (sign-in-gated stars for a consumer account that no longer registers).
 */
const navigationItems: NavigationItem[] = [
  {
    id: 'record',
    labelId: 'consumer.nav.record',
    defaultLabel: 'Record',
    icon: FaClipboardList,
    targetSection: 'transparency-section'
  },
  {
    id: 'farm',
    labelId: 'consumer.nav.farm',
    defaultLabel: 'Farm',
    icon: FaHome,
    targetSection: 'farm-section'
  }
];

export const NavigationBottomBar: React.FC<NavigationBottomBarProps> = ({
  activeSection = 'record',
  onSectionChange,
  onScrollStart,
  onScrollEnd
}) => {
  const intl = useIntl();
  const [currentActiveSection, setCurrentActiveSection] = useState(activeSection);
  const [clickedSection, setClickedSection] = useState<string | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  // Theme colors following Trazo design standards
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const activeColor = 'green.500';
  const inactiveColor = useColorModeValue('gray.400', 'gray.500');
  const activeBgColor = useColorModeValue('green.50', 'green.900');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const activeTextColor = useColorModeValue('green.700', 'green.400');

  // Update active section when prop changes, but don't override during user-initiated scrolling
  useEffect(() => {
    if (!clickedSection && !isScrolling) {
      setCurrentActiveSection(activeSection);
    }
  }, [activeSection, clickedSection, isScrolling]);

  const handleSectionClick = (item: NavigationItem) => {
    // Immediate visual feedback
    setClickedSection(item.id);
    setCurrentActiveSection(item.id);
    setIsScrolling(true);

    // Notify parent that user scrolling started
    onScrollStart?.();

    // Smooth scroll to section
    const targetElement = document.getElementById(item.targetSection);
    if (targetElement) {
      // Calculate offset for fixed header (145px from TrazoShimmers)
      const headerOffset = 160;
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }

    // Clear the states after scroll animation completes
    setTimeout(() => {
      setClickedSection(null);
      setIsScrolling(false);
      // Notify parent that user scrolling ended
      onScrollEnd?.();
    }, 1000);

    // Notify parent component
    onSectionChange?.(item.id);
  };

  return (
    <MotionBox
      position="fixed"
      bottom="16px"
      left="50%"
      bg={bgColor}
      borderRadius="3xl"
      boxShadow="0 8px 30px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)"
      zIndex={9999}
      // Modern floating design with padding
      px={6}
      py={3}
      // Floating container width
      minW="280px"
      // Hide on desktop, show on mobile/tablet
      display={{ base: 'block', xl: 'none' }}
      // Add border for subtle definition
      border="1px solid"
      borderColor={useColorModeValue('white', 'gray.700')}
      // Backdrop blur effect for modern feel
      backdropFilter="blur(10px)"
      width={'100%'}
      maxW={'95vw'}
      transform="translateX(-50%) !important"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}>
      <HStack
        as="nav"
        aria-label={intl.formatMessage({
          id: 'consumer.nav.pageSections',
          defaultMessage: 'Page sections'
        })}
        spacing={0}
        justify="space-around"
        w="full">
        {navigationItems.map((item) => {
          // Show as active if clicked (immediate feedback) OR if it's the current active section
          const isActive = clickedSection === item.id || currentActiveSection === item.id;

          return (
            <Center
              key={item.id}
              as="button"
              aria-current={isActive ? 'true' : undefined}
              onClick={() => handleSectionClick(item)}
              position="relative"
              minW="60px"
              h="50px"
              borderRadius="xl"
              bg={isActive ? activeBgColor : 'transparent'}
              transition="all 0.2s ease"
              _hover={{
                bg: isActive ? activeBgColor : useColorModeValue('gray.50', 'gray.700'),
                transform: 'translateY(-1px) !important'
              }}
              _active={{
                transform: 'scale(0.95) !important'
              }}>
              <VStack spacing={1}>
                {/* Icon with active state animation */}
                <MotionBox
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    y: isActive ? -1 : 0
                  }}
                  transition={{ duration: 0.2 }}>
                  <Icon
                    as={item.icon}
                    aria-hidden="true"
                    boxSize={isActive ? 6 : 5}
                    color={isActive ? activeColor : inactiveColor}
                    transition="all 0.2s ease"
                  />
                </MotionBox>

                {/* Label */}
                <Text
                  fontSize="xs"
                  fontWeight={isActive ? 'semibold' : 'medium'}
                  color={isActive ? activeTextColor : textColor}
                  transition="all 0.2s ease"
                  lineHeight="1"
                  noOfLines={1}>
                  {intl.formatMessage({ id: item.labelId, defaultMessage: item.defaultLabel })}
                </Text>

                {/* Active indicator dot */}
                <AnimatePresence mode="wait">
                  {isActive && (
                    <MotionBox
                      key="indicator"
                      position="absolute"
                      bottom="0px"
                      w="3px"
                      h="3px"
                      bg={activeColor}
                      borderRadius="full"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </AnimatePresence>
              </VStack>
            </Center>
          );
        })}
      </HStack>
    </MotionBox>
  );
};

export default NavigationBottomBar;
