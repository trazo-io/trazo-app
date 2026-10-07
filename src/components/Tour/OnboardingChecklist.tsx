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
import { FormattedMessage, useIntl } from 'react-intl';
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

/**
 * Pages whose content the fixed panel covered (recordkeeping review F-19, 2026-10-07): on the
 * parcel page it sat over the production card, so a new farm could not open the season it
 * had just created. The panel is a guide to the next step, never a lid on the current one.
 */
// The production segment is the season's public_id (a UUID), never a number (review of app #98).
const RECORD_ROUTE_PATTERNS = [/\/parcel\/\d+$/, /\/parcel\/\d+\/production\/[^/]+$/];

/** Trailing slashes appear on some routes (e.g. after finalize redirects), so normalise. */
export const isRecordOrFormRoute = (pathname: string): boolean => {
  const normalized = pathname.replace(/\/+$/, '');
  return (
    FORM_ROUTE_SUFFIXES.some((suffix) => normalized.endsWith(suffix)) ||
    RECORD_ROUTE_PATTERNS.some((pattern) => pattern.test(normalized))
  );
};

/**
 * Floating onboarding checklist widget — bottom-right corner.
 * Shows Writer (5-item creation) or Viewer (4-item exploration) variant.
 * Collapsible, dismissible, auto-hides when all complete or after 30 days.
 * Suppressed on form routes — see FORM_ROUTE_SUFFIXES above.
 */
const OnboardingChecklist: React.FC = () => {
  const { items, variant, completedCount, totalCount, progress, allComplete, isVisible, dismiss } =
    useOnboardingChecklist();

  // Expanded by default on desktop, COLLAPSED on phones. At 375px the expanded panel is 300px
  // wide and ~370px tall — 80% of the width and 45% of the height of the viewport — and it is
  // `position: fixed`, so on every non-wizard page it sat on top of the content the grower came
  // for (measured on /osp: it covered the first module card outright). Collapsed it is just its
  // own header bar, still present and still one tap from opening. Read once, from the initial
  // width: this is a default, not a responsive style, and re-collapsing a panel the user opened
  // because they rotated the phone would be worse than the overlap.
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return !window.matchMedia('(max-width: 767px)').matches;
  });
  const intl = useIntl();
  const navigate = useNavigate();
  const location = useLocation();
  const trackPageVisit = useTourStore((s) => s.trackPageVisit);
  const isOnFormRoute = isRecordOrFormRoute(location.pathname);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const headingColor = useColorModeValue('gray.800', 'white');
  const checkColor = useColorModeValue('green.700', 'green.300');
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
      overflow="hidden">
      {/* Header — always visible */}
      <HStack
        px={4}
        py={3}
        justify="space-between"
        cursor="pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        _hover={{ bg: itemBg }}
        transition="background 0.15s">
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
            // Was the hardcoded English string "Dismiss checklist" on a widget whose every
            // other word is translated — and `tour.checklist.dismiss` already existed in both
            // locales, unused. Found by the orphan-key arm of tours/__tests__/tourWiring.
            aria-label={intl.formatMessage({ id: 'tour.checklist.dismiss' })}
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
          <Icon as={isExpanded ? FiChevronDown : FiChevronUp} color={textColor} boxSize={4} />
        </HStack>
      </HStack>

      {/* Progress bar */}
      <Progress value={progress} size="xs" colorScheme="green" bg={progressBg} />

      {/* Checklist items */}
      <Collapse in={isExpanded}>
        <VStack spacing={0} py={2} px={2}>
          {items.map((item) => {
            const dependency = item.dependsOn
              ? items.find((i) => i.id === item.dependsOn)
              : undefined;
            const isBlocked = !!dependency && !dependency.completed;
            /**
             * A blocked item was dimmed to 50% and inert with nothing saying why — the same
             * "a disabled control is a bug report you never receive" pattern the onboarding
             * wizards were fixed for on 2026-07-31. `tour.checklist.completeDependency`
             * shipped in both locales for exactly this and had never been rendered.
             */
            const blockedReason =
              isBlocked && dependency
                ? intl.formatMessage(
                    { id: 'tour.checklist.completeDependency' },
                    { dependency: intl.formatMessage({ id: dependency.labelKey }) }
                  )
                : undefined;

            return (
              <HStack
                key={item.id}
                w="full"
                px={3}
                py={2.5}
                borderRadius="lg"
                cursor={isBlocked ? 'default' : 'pointer'}
                // `title` only. The row is a plain div (role=generic), where `aria-label` and
                // `aria-disabled` are not allowed and are dropped by the a11y tree — my first
                // pass set both, which would have read as coverage while announcing nothing.
                // `title` becomes the accessible description on any element. The row being a
                // click target with no role/tabindex at all is older, wider debt.
                title={blockedReason}
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
                }}>
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
                  transition="all 0.2s">
                  {item.completed && <Icon as={FiCheck} color="white" boxSize={3} />}
                </Box>

                {/* Label */}
                <Text
                  fontSize="sm"
                  color={item.completed ? textColor : headingColor}
                  textDecoration={item.completed ? 'line-through' : 'none'}
                  flex={1}>
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
