import React, { useState } from 'react';
import {
  Box,
  Link,
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
import { SETUP_HELP_EMAIL } from '../../config/contactAddresses';
import { useOnboardingChecklist } from '../../hooks/useOnboardingChecklist';
import { useTourStore } from '../../store/tourStore';
import { ChecklistItem } from '../../tours/types';

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
 * Shows Writer (7-item), Pilot (4 required + optional) or Viewer (4-item exploration) variant.
 * Collapsible, dismissible, auto-hides when all complete or after 30 days.
 * Suppressed on form routes — see FORM_ROUTE_SUFFIXES above.
 */
const OnboardingChecklist: React.FC = () => {
  const {
    items,
    optionalItems,
    isPilot,
    isSetupOperator,
    pilotStepsComplete,
    variant,
    completedCount,
    totalCount,
    progress,
    allComplete,
    isVisible,
    dismiss
  } = useOnboardingChecklist();

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
  // The pilot setup note is information, not a step: a tinted, bordered box sets it apart from
  // the check-circle items below it. At xs with no separation it read as fine print.
  const infoBoxProps = {
    mx: 4,
    mt: 3,
    mb: 1,
    px: 3,
    py: 2.5,
    bg: itemBg,
    borderWidth: '1px',
    borderColor,
    borderRadius: 'md'
  };

  if (!isVisible || (allComplete && !pilotStepsComplete) || isOnFormRoute) return null;

  // Dependencies can cross groups (an optional item can wait on a required one).
  const allItems = [...items, ...optionalItems];

  const renderItem = (item: ChecklistItem) => {
    const dependency = item.dependsOn ? allItems.find((i) => i.id === item.dependsOn) : undefined;
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
            // Pilot labels are conditions, not actions: "Complete "A parcel is on file" first"
            // does not parse (review of app #113), so a pilot row says what it waits on.
            { id: isPilot ? 'tour.checklist.pilot.waitsOn' : 'tour.checklist.completeDependency' },
            { dependency: intl.formatMessage({ id: dependency.labelKey }) }
          )
        : undefined;
    // Pilot labels state a condition ("A parcel is on file in Trazo"); striking one through
    // when it is met would read as its negation. The check circle carries the state.
    const strike = item.completed && !isPilot;

    return (
      <HStack
        key={item.id}
        data-testid={`checklist-item-${item.id}`}
        data-completed={item.completed ? 'true' : 'false'}
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
          textDecoration={strike ? 'line-through' : 'none'}
          flex={1}>
          <FormattedMessage id={item.labelKey} />
        </Text>
      </HStack>
    );
  };

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
        data-testid="checklist-header"
        px={4}
        py={3}
        justify="space-between"
        // A completed pilot panel has no body to expand, so its header is a static row.
        cursor={pilotStepsComplete ? 'default' : 'pointer'}
        onClick={pilotStepsComplete ? undefined : () => setIsExpanded(!isExpanded)}
        _hover={pilotStepsComplete ? undefined : { bg: itemBg }}
        transition="background 0.15s">
        <VStack align="start" spacing={0}>
          <Text fontSize="sm" fontWeight="700" color={headingColor}>
            <FormattedMessage id="tour.checklist.title" />
          </Text>
          <Text fontSize="xs" color={textColor} data-testid="checklist-progress">
            {pilotStepsComplete ? (
              // Exactly this sentence (Run 8b, 8b-02). Never "You're all set": these steps put
              // records in Trazo; they do not show anything was reviewed or is ready to file.
              <FormattedMessage id="tour.checklist.pilot.complete" />
            ) : (
              <FormattedMessage
                id="tour.checklist.progress"
                values={{ completed: completedCount, total: totalCount }}
              />
            )}
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
          {!pilotStepsComplete && (
            <Icon as={isExpanded ? FiChevronDown : FiChevronUp} color={textColor} boxSize={4} />
          )}
        </HStack>
      </HStack>

      {/* Progress bar */}
      {!pilotStepsComplete && (
        <Progress value={progress} size="xs" colorScheme="green" bg={progressBg} />
      )}

      {/* Checklist items */}
      {!pilotStepsComplete && (
        <Collapse in={isExpanded}>
          {isPilot && isSetupOperator && (
            // The operator entering the grower's records gets the operator's side of setup, not
            // the grower's instruction to send records to the operator (rehearsal finding 7).
            <Box data-testid="pilot-operator-info" {...infoBoxProps}>
              <Text fontSize="sm" fontWeight="700" color={headingColor} mb={1}>
                <FormattedMessage id="tour.checklist.pilot.operatorSetup" />
              </Text>
              <VStack as="ul" align="start" spacing={1} pl={4} fontSize="sm" color={textColor}>
                <Text as="li">
                  <FormattedMessage id="tour.checklist.pilot.operatorSetup.body" />
                </Text>
                <Text as="li">
                  <FormattedMessage id="tour.checklist.pilot.operatorSetup.check" />
                </Text>
              </VStack>
            </Box>
          )}
          {isPilot && !isSetupOperator && (
            // Information, not steps: no check circle, never counted, never shown incomplete.
            <Box data-testid="pilot-setup-info" {...infoBoxProps}>
              <Text fontSize="sm" fontWeight="700" color={headingColor} mb={1}>
                <FormattedMessage id="tour.checklist.pilot.howSetupWorks" />
              </Text>
              <VStack as="ul" align="start" spacing={1} pl={4} fontSize="sm" color={textColor}>
                <Text as="li">
                  <FormattedMessage id="tour.checklist.pilot.howSetupWorks.send" />{' '}
                  <Link
                    href={`mailto:${SETUP_HELP_EMAIL}`}
                    color={checkColor}
                    fontWeight="600"
                    data-testid="pilot-setup-mailto">
                    {SETUP_HELP_EMAIL}
                  </Link>
                </Text>
                <Text as="li">
                  <FormattedMessage id="tour.checklist.pilot.howSetupWorks.enter" />
                </Text>
                <Text as="li">
                  <FormattedMessage id="tour.checklist.pilot.howSetupWorks.check" />
                </Text>
              </VStack>
            </Box>
          )}
          <VStack spacing={0} py={2} px={2} data-testid="checklist-required">
            {items.map(renderItem)}
          </VStack>
          {optionalItems.length > 0 && (
            <Box px={2} pb={2} data-testid="checklist-optional">
              <Text
                px={3}
                fontSize="xs"
                fontWeight="700"
                color={textColor}
                textTransform="uppercase">
                <FormattedMessage id="tour.checklist.optional" />
              </Text>
              <VStack spacing={0}>{optionalItems.map(renderItem)}</VStack>
            </Box>
          )}
          {variant === 'writer' && !isPilot && (
            <Text px={5} pb={3} fontSize="xs" color={textColor} data-testid="checklist-setup-help">
              <FormattedMessage id="tour.checklist.setupHelpPrompt" />{' '}
              <Link href={`mailto:${SETUP_HELP_EMAIL}`} color={checkColor} fontWeight="600">
                <FormattedMessage id="tour.checklist.setupHelpLink" />
              </Link>
            </Text>
          )}
        </Collapse>
      )}
    </Box>
  );
};

export default OnboardingChecklist;
