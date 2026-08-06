import React, { useState } from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  IconButton,
  Progress,
  Icon,
  useColorModeValue,
  Collapse
} from '@chakra-ui/react';
import { FiCheck, FiChevronDown, FiChevronUp, FiX } from 'react-icons/fi';
import { FormattedMessage } from 'react-intl';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOnboardingChecklist } from '../../hooks/useOnboardingChecklist';
import { useTourStore } from '../../store/tourStore';
import { ChecklistVariant } from '../../tours/types';

/**
 * Route suffixes where the widget must not render.
 *
 * The widget is `position: fixed` in the bottom-right at zIndex 1000 — exactly where
 * the create/finish wizards put their primary action ("Continue to Location",
 * "Create Parcel", "Finish production"). It physically intercepted those clicks
 * (verified with Playwright: the button was enabled but unclickable until the panel
 * was dismissed). Because the widget only renders for new accounts, it blocked the
 * first step of the very checklist it was showing.
 *
 * Every wizard route ends in one of these, so suffix matching is sufficient; earlier
 * `/event/add` and `/production/add` entries were redundant with `/add`.
 */
const FORM_ROUTE_SUFFIXES = ['/add', '/edit', '/finish'];

/** Trailing slashes appear on some routes (e.g. after finalize redirects), so normalise. */
const isFormRoute = (pathname: string): boolean => {
  const normalized = pathname.replace(/\/+$/, '');
  return FORM_ROUTE_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
};

/**
 * Floating onboarding checklist widget — bottom-right corner.
 * Shows Writer (5-item creation) or Viewer (4-item exploration) variant.
 * Collapsible, dismissible, auto-hides when all complete or after 30 days.
 * Suppressed on form routes — see FORM_ROUTE_SUFFIXES above.
 */
const OnboardingChecklist: React.FC = () => {
  const {
    items,
    variant,
    completedCount,
    totalCount,
    progress,
    allComplete,
    isVisible,
    dismiss
  } = useOnboardingChecklist();

  const [isExpanded, setIsExpanded] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const trackPageVisit = useTourStore((s) => s.trackPageVisit);
  const isOnFormRoute = isFormRoute(location.pathname);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const headingColor = useColorModeValue('gray.800', 'white');
  const checkColor = useColorModeValue('green.500', 'green.400');
  const itemBg = useColorModeValue('gray.50', 'gray.700');
  const itemHoverBg = useColorModeValue('gray.100', 'gray.600');
  // Hoisted (was called inline in JSX after the early return below — varied the
  // hook count between renders, triggering the "change in order of Hooks" warning).
  const progressBg = useColorModeValue('gray.100', 'gray.700');

  if (!isVisible || allComplete || isOnFormRoute) return null;

  return (
    <Box
      position="fixed"
      bottom={{ base: 4, md: 6 }}
      right={{ base: 4, md: 6 }}
      zIndex={1000}
      w={{ base: '300px', md: '320px' }}
      bg={bgColor}
      borderRadius="xl"
      border="1px"
      borderColor={borderColor}
      boxShadow="0 10px 30px -5px rgba(0, 0, 0, 0.15)"
      overflow="hidden"
    >
      {/* Header — always visible */}
      <HStack
        px={4}
        py={3}
        justify="space-between"
        cursor="pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        _hover={{ bg: itemBg }}
        transition="background 0.15s"
      >
        <VStack align="start" spacing={0}>
          <Text fontSize="sm" fontWeight="700" color={headingColor}>
            <FormattedMessage id="tour.checklist.title" />
          </Text>
          <Text fontSize="xs" color={textColor}>
            <FormattedMessage
              id="tour.checklist.progress"
              values={{ completed: completedCount, total: totalCount }}
            />
          </Text>
        </VStack>
        <HStack spacing={1}>
          <IconButton
            aria-label="Dismiss checklist"
            icon={<FiX />}
            variant="ghost"
            size="xs"
            color={textColor}
            onClick={(e) => {
              e.stopPropagation();
              dismiss();
            }}
            minH="32px"
            minW="32px"
          />
          <Icon
            as={isExpanded ? FiChevronDown : FiChevronUp}
            color={textColor}
            boxSize={4}
          />
        </HStack>
      </HStack>

      {/* Progress bar */}
      <Progress
        value={progress}
        size="xs"
        colorScheme="green"
        bg={progressBg}
      />

      {/* Checklist items */}
      <Collapse in={isExpanded}>
        <VStack spacing={0} py={2} px={2}>
          {items.map((item) => {
            const isBlocked =
              item.dependsOn &&
              !items.find((i) => i.id === item.dependsOn)?.completed;

            return (
              <HStack
                key={item.id}
                w="full"
                px={3}
                py={2.5}
                borderRadius="lg"
                cursor={isBlocked ? 'default' : 'pointer'}
                opacity={isBlocked ? 0.5 : 1}
                _hover={!isBlocked ? { bg: itemHoverBg } : undefined}
                transition="all 0.15s"
                onClick={() => {
                  if (!isBlocked && !item.completed) {
                    // Only track page visits for viewer checklist (visiting IS the action)
                    // Writer items are completed by actual data changes, not clicks
                    if (variant === 'viewer') {
                      trackPageVisit(item.id);
                    }
                    navigate(item.linkTo);
                  }
                }}
              >
                {/* Check circle */}
                <Box
                  w="20px"
                  h="20px"
                  borderRadius="full"
                  border="2px"
                  borderColor={item.completed ? checkColor : borderColor}
                  bg={item.completed ? checkColor : 'transparent'}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  flexShrink={0}
                  transition="all 0.2s"
                >
                  {item.completed && (
                    <Icon as={FiCheck} color="white" boxSize={3} />
                  )}
                </Box>

                {/* Label */}
                <Text
                  fontSize="sm"
                  color={item.completed ? textColor : headingColor}
                  textDecoration={item.completed ? 'line-through' : 'none'}
                  flex={1}
                >
                  <FormattedMessage id={item.labelKey} />
                </Text>
              </HStack>
            );
          })}
        </VStack>
      </Collapse>
    </Box>
  );
};

export default OnboardingChecklist;
