import { useIntl } from 'react-intl';
import React from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputLeftElement,
  Textarea,
  Select,
  Badge,
  Icon,
  useColorModeValue,
  useBreakpointValue,
  Flex,
  Spinner,
  CircularProgress,
  Alert,
  AlertIcon,
  Divider,
  SimpleGrid,
  Circle,
  Grid,
  ResponsiveValue,
  Progress,
  Tooltip,
  Portal,
  IconButton,
  Image,
  CloseButton,
  Collapse,
  useDisclosure,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel
} from '@chakra-ui/react';
import type { ButtonProps } from '@chakra-ui/react';
import { S3Image } from '../Media/S3Image';
import { ReactNode, ReactElement, useState, useEffect, useCallback } from 'react';
import {
  FaLeaf,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaChevronUp,
  FaCheckCircle,
  FaQuestionCircle,
  FaCamera,
  FaTimes,
  FaTrash,
  FaEye,
  FaSearch
} from 'react-icons/fa';
import { ALERT_ACCENT_SHADE, ALERT_PALETTE } from 'theme/components/alert';
import { MdCheck, MdError, MdInfo, MdWarning } from 'react-icons/md';
import { IconType } from 'react-icons';
import { useDropzone } from 'react-dropzone';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';

// Core Layout Components

interface StandardPageProps {
  children: ReactNode;
  title?: string;
  /** ReactNode, not string: `intl.formatMessage` is typed as `string | ReactNode[]` (it can
      return rich-text chunks), so every i18n'd page description reported TS2322 against a
      `string`. FormLabel/Text render either. */
  description?: ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
  rightAction?: ReactNode;
  /**
   * NARROWS the page's column. Omit it — every page shares `PAGE_MAX_W` below, applied to the
   * header and the body together so they can never sit on different grids.
   *
   * Pass a narrower token only for a genuinely narrow page: a reading column (`3xl` FAQ) or a
   * single-column form (`xl` change-password, `4xl` OSP module). Never pass a WIDER one — that
   * re-creates the two-widths problem this exists to prevent, and never set `maxW` on your own
   * content either (that is what left titles floating ~140px from their own cards).
   */
  contentMaxW?: string;
}

/**
 * ONE column for every page. The hero, the back button and the body all use it, so a page
 * can never end up with its title on a different grid from its content.
 *
 * 8xl = 1440px. MEASURED: an 1800px window leaves 1465px of content area once the sidebar
 * and gutters are taken out, so the cap trims ~16px a side — effectively full width on a
 * laptop. It only really bites on an ultrawide, which is the point: tables and card grids
 * stop stretching. Override `contentMaxW` ONLY for a genuinely narrow page — a single-column
 * form or a reading column — never to "make this one wider".
 */
const PAGE_MAX_W = '8xl';

export const StandardPage = ({
  children,
  title,
  description,
  showBackButton = false,
  onBack,
  rightAction,
  contentMaxW
}: StandardPageProps) => {
  const bgColor = useColorModeValue('surface.canvas', 'gray.900');
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Determine if we need the full hero or just a minimal header
  const hasHeroContent = title || description;
  const needsMinimalHeader = showBackButton && !hasHeroContent;

  return (
    <Box bg={bgColor} minH="100vh">
      {/* Minimal Header - Just back button, aligned with content */}
      {needsMinimalHeader && (
        <Box
          bg="linear-gradient(135deg, #FAFAFA 0%, #F8F9FA 100%)"
          pt={{ base: '120px', md: '120px' }}
          pb="24px"
          // Third gutter in the same component, now the same as the hero's and the body's.
          // The Container matches too, so on a page that constrains its content the Back
          // button lands on that column instead of out at the window edge.
          px={{ base: 3, md: 4 }}>
          <Container maxW={contentMaxW || PAGE_MAX_W} mx="auto" px={0}>
            <Button
              variant="outline"
              leftIcon={<FaChevronLeft />}
              onClick={onBack}
              size="sm"
              minH="44px">
              Back
            </Button>
          </Container>
        </Box>
      )}

      {/* Full Hero Header Section - With title */}
      {hasHeroContent && (
        <Box
          bg="linear-gradient(135deg, #FAFAFA 0%, #F8F9FA 100%)"
          pt={{ base: '120px', md: '120px' }}
          pb={{ base: '64px', md: '80px' }}
          px={{ base: 3, md: 4 }}>
          {/* The hero NEVER has a width of its own: it takes `contentMaxW`, so it is capped
              exactly where the body is capped, and runs full width when the body does.
              Defaulting this to '6xl' while the content below defaulted to unconstrained is
              what put every page's title up to ~140px inside its own content — invisible at
              1440 (the cap does not bite yet) and obvious on a 1800px screen.
              px={0}: the gutter is the wrapping Box's padding and nothing else. Chakra's
              Container adds 16px of its own by default, which the content Container zeroes. */}
          <Container maxW={contentMaxW || PAGE_MAX_W} mx="auto" px={0}>
            <VStack spacing={4} textAlign="left" align="stretch">
              {isMobile ? (
                // Mobile: Compact left-aligned header
                <VStack spacing={3} w="full" align="flex-start">
                  {showBackButton && (
                    <Button
                      variant="outline"
                      leftIcon={<FaChevronLeft />}
                      onClick={onBack}
                      size="sm"
                      minH="44px"
                      mb={1}>
                      Back
                    </Button>
                  )}

                  {title && (
                    <Heading
                      as="h1"
                      size="lg"
                      color="green.700"
                      fontWeight="bold"
                      letterSpacing="-0.02em"
                      w="full">
                      {title}
                    </Heading>
                  )}
                  {description && (
                    <Text fontSize="sm" color="gray.600" fontWeight="normal" lineHeight="1.6">
                      {description}
                    </Text>
                  )}

                  {rightAction && <Box>{rightAction}</Box>}
                </VStack>
              ) : (
                // Desktop.
                //
                // LEFT-ALIGNED, not centred. The header used to centre its title and description
                // while every page body underneath it is left-aligned, so each page opened with a
                // large centred banner sitting on top of a left-aligned column — two different
                // documents stacked. Centring also made the title's position depend on its
                // neighbours: `flex={1}` between an optional Back button and an optional right
                // action meant the same heading landed in a different place on two pages purely
                // because one of them had an extra button.
                //
                // Back sits on its own row above the title (its target is "the page you came
                // from", not the title), and the right action stays opposite the title.
                <VStack spacing={3} w="full" align="stretch">
                  {showBackButton && (
                    <Box>
                      <Button
                        variant="outline"
                        leftIcon={<FaChevronLeft />}
                        onClick={onBack}
                        size="sm"
                        minH="44px">
                        Back
                      </Button>
                    </Box>
                  )}

                  <Flex direction="row" align="center" gap={4} w="full" justify="space-between">
                    <VStack spacing={2} align="flex-start" flex={1} minW={0}>
                      {title && (
                        <Heading
                          as="h1"
                          size="2xl"
                          color="green.700"
                          fontWeight="bold"
                          textAlign="left"
                          letterSpacing="-0.02em">
                          {title}
                        </Heading>
                      )}
                      {description && (
                        <Text
                          fontSize="lg"
                          color="gray.600"
                          fontWeight="normal"
                          maxW="70ch"
                          lineHeight="1.7"
                          textAlign="left">
                          {description}
                        </Text>
                      )}
                    </VStack>

                    {rightAction && <Box flexShrink={0}>{rightAction}</Box>}
                  </Flex>
                </VStack>
              )}
            </VStack>
          </Container>
        </Box>
      )}

      {/* No header at all when no back button and no content */}
      {!showBackButton && !hasHeroContent && <Box pt={{ base: '110px', md: '80px' }} />}

      {/* Main Content with Overlapping Card Design - Match producer app spacing */}
      <Box
        w="100%"
        // SAME gutter as the hero above (that Box uses `px={{ base: 3, md: 4 }}`). They used
        // to differ by 8px, so a page's title and its content sat on two grids that almost
        // lined up — the worst kind, since it reads as a mistake rather than a margin.
        px={{ base: 3, md: 4 }}
        mt={needsMinimalHeader ? '16px' : hasHeroContent ? '-40px' : '0'}
        position="relative"
        zIndex={10}>
        {/* Only constrained when the page asks for it — see `contentMaxW`. Left unconstrained by
            default so the wide table pages keep the full width they use today. */}
        <Container maxW={contentMaxW || PAGE_MAX_W} mx="auto" px={0}>
          {children}
        </Container>
      </Box>
    </Box>
  );
};

interface StandardCardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  headerAction?: ReactNode;
  /**
   * Decorative glyph before the title. Additive, and the reason the OSP pages could not use
   * `title` at all: every section card there leads with an icon, `title` takes a string, so
   * ten cards hand-rolled `<HStack><Icon/><Text fontWeight="bold"/></HStack>` instead and
   * drifted to 14px/700 and 18px/700 with no <Heading> between them — a ten-section
   * compliance page whose only heading was the page <h1>.
   *
   * `aria-hidden` is applied here: the icon repeats the title, and a screen reader reading
   * "leaf Organic System Plan" is worse than reading the title alone.
   */
  titleIcon?: ReactNode;
  /**
   * ⚠️ CURRENTLY A NO-OP — every value renders identically.
   *
   * `assets/css/trazo-dashboard-styles.css` (one of the four protected CSS-production-build
   * files CLAUDE.md marks DO NOT CHANGE) targets `.trazo-card` / `[data-component='Card']`
   * and forces, with `!important`:
   *     box-shadow: 0px 3.5px 5.5px rgba(0,0,0,0.02)
   *     border-radius: 12px (mobile) / 15px (≥768px)
   *     border: 1px solid #e2e8f0
   * — the exact three properties this prop varies. So `elevated`, `outline` and `flat` all
   * paint the same faint shadow, same radius and same hairline border.
   *
   * Do NOT design a visual hierarchy around this prop (2026-08-07: a farm-profile redesign
   * did, and shipped three "elevated" action cards that were pixel-identical to the
   * "outline" reference cards). Build hierarchy from section headings and spacing instead.
   *
   * Fixing it means either relaxing the protected CSS — which exists because production
   * builds were dropping Card styles entirely — or rendering a plain `Box` instead of
   * `Card` (see the `project_trazo_card_css_override` note). Both are deliberate decisions,
   * not drive-by changes.
   */
  variant?: 'elevated' | 'flat' | 'outline';
  /**
   * Horizontal padding, forwarded to CardBody's `px`. Chakra spacing tokens are NUMBERS
   * (`padding={3}` = 12px), which the old `string | object` type rejected — 6 callers were
   * passing numbers against it, unnoticed because the typecheck gate does not run.
   */
  padding?: string | number | object;
  /**
   * Bottom margin. Defaults to 6 (24px) to preserve the spacing every existing
   * caller was built against. Pass 0 when the card sits inside a VStack that
   * already owns the gap — stacking `mb={6}` inside a `spacing={8}` VStack is
   * how the farm profile ended up with 56px between every pair of cards.
   */
  mb?: number | string | object;
  /**
   * Top margin. `mb` existed and `mt` did not, and StandardCard has no rest-spread, so
   * `<StandardCard mt={4}>` reached no DOM node — the margin was silently dropped at every
   * such call site (OSPView's version-history card and the approved-inputs panel among them)
   * while reporting a TS error into the masked pile. Same inert-prop class as `variant`.
   */
  mt?: number | string | object;
}

export const StandardCard = ({
  children,
  title,
  subtitle,
  headerAction,
  titleIcon,
  variant = 'elevated',
  padding = { base: 3, md: 4 },
  mb = 6,
  mt
}: StandardCardProps) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const cardProps = {
    elevated: {
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      borderRadius: { base: 'xl', md: '2xl' },
      bg: bgColor
    },
    flat: {
      bg: bgColor,
      borderRadius: { base: 'lg', md: 'xl' }
    },
    outline: {
      bg: bgColor,
      borderRadius: { base: 'lg', md: 'xl' },
      border: '1px solid',
      borderColor: borderColor
    }
  };

  return (
    <Card {...cardProps[variant]} mb={mb} mt={mt}>
      {(title || headerAction) && (
        <CardHeader pb={title && subtitle ? 2 : 4}>
          <Flex
            direction={{ base: 'column', md: 'row' }}
            justify="space-between"
            align={{ base: 'flex-start', md: 'center' }}
            gap={2}
            w="100%">
            <VStack align="start" spacing={1} flexShrink={0}>
              {title && (
                <HStack spacing={2} align="center">
                  {titleIcon ? (
                    <Box aria-hidden="true" display="flex" alignItems="center">
                      {titleIcon}
                    </Box>
                  ) : null}
                  <Heading as="h3" size={{ base: 'sm', md: 'md' }} color="gray.700">
                    {title}
                  </Heading>
                </HStack>
              )}
              {subtitle && (
                <Text color="gray.500" fontSize={{ base: 'xs', md: 'sm' }}>
                  {subtitle}
                </Text>
              )}
            </VStack>
            {headerAction}
          </Flex>
        </CardHeader>
      )}
      <CardBody pt={title ? 2 : 6} pb={6} px={padding}>
        {children}
      </CardBody>
    </Card>
  );
};

// Modern Step Progress Indicator

interface Step {
  title: string;
  shortTitle?: string;
  description?: string;
  icon?: IconType;
}

interface StandardStepperProps {
  steps: Step[];
  currentStep: number;
  completedSteps?: number[];
  onStepClick?: (step: number) => void;
  allowStepClick?: boolean;
}

export const StandardStepper = ({
  steps,
  currentStep,
  completedSteps = [],
  onStepClick,
  allowStepClick = false
}: StandardStepperProps) => {
  // Null safety for steps array
  if (!steps || !Array.isArray(steps)) {
    return null;
  }

  // Adjust spacing and sizing based on number of steps
  const manySteps = steps.length > 6;
  const spacing = manySteps ? { base: 2, md: 3 } : { base: 2, md: 6 };
  const circleSize = manySteps ? { base: '32px', md: '40px' } : { base: '36px', md: '44px' };
  const iconSize = manySteps ? '16px' : '18px';
  // 'xs' (12px) is the floor — '2xs' is 10px and below the project's minimum text size.
  const titleFontSize = manySteps ? 'xs' : { base: 'xs', md: 'sm' };

  return (
    <StandardCard padding={{ base: 2, md: 6 }}>
      <Box overflowX="auto" w="100%" py={2}>
        <HStack
          spacing={spacing}
          justify="center"
          align="flex-start"
          w={manySteps ? 'max-content' : '100%'}
          minW="100%"
          maxW={manySteps ? 'none' : '800px'}
          mx="auto"
          px={{ base: 2, md: manySteps ? 4 : 0 }}>
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              <VStack
                spacing={2}
                align="center"
                flex={manySteps ? '0 0 auto' : '1'}
                minW={manySteps ? '80px' : 'auto'}
                cursor={allowStepClick && index <= currentStep ? 'pointer' : 'default'}
                onClick={() => allowStepClick && index <= currentStep && onStepClick?.(index)}
                _hover={allowStepClick && index <= currentStep ? { opacity: 0.8 } : {}}
                transition="all 0.3s ease">
                <Circle
                  size={circleSize}
                  bg={
                    completedSteps.includes(index) || index < currentStep
                      ? 'green.500'
                      : index === currentStep
                      ? 'green.400'
                      : 'gray.200'
                  }
                  color={index <= currentStep ? 'white' : 'gray.500'}
                  fontSize={{ base: 'sm', md: 'md' }}
                  fontWeight="bold"
                  boxShadow={index === currentStep ? 'lg' : 'md'}
                  transition="all 0.3s">
                  {completedSteps.includes(index) || index < currentStep ? (
                    <Icon as={step.icon || FaCheckCircle} boxSize={iconSize} />
                  ) : (
                    <Text>{index + 1}</Text>
                  )}
                </Circle>
                <VStack spacing={1} align="center">
                  {/* A step label is wayfinding, not user data — never ellipsis it.
                      "Event Deta…" tells the farmer less than the step number does.
                      Pass an explicit `shortTitle` when a step name is too long for a
                      phone column; it applies BELOW `md` only, so the full name still
                      shows wherever there is room for it. NOTE: `maxW: 'auto'` is invalid
                      CSS (only min-width takes `auto`), so the old responsive object
                      silently left the 80px smd cap in force on desktop. Swapping the two
                      spans by `display` rather than a breakpoint hook keeps it flash-free,
                      and a `display: none` span is not announced, so no double-read. */}
                  <Text
                    fontSize={titleFontSize}
                    fontWeight="bold"
                    color={index <= currentStep ? 'green.500' : 'gray.500'}
                    textAlign="center"
                    lineHeight="1.2"
                    whiteSpace="normal"
                    noOfLines={2}
                    maxW={manySteps ? '80px' : { base: '84px', smd: '110px', md: 'none' }}>
                    {step.shortTitle ? (
                      <>
                        <Box as="span" display={{ base: 'inline', md: 'none' }}>
                          {step.shortTitle}
                        </Box>
                        <Box as="span" display={{ base: 'none', md: 'inline' }}>
                          {step.title}
                        </Box>
                      </>
                    ) : (
                      step.title
                    )}
                  </Text>
                  {step.description && !manySteps && (
                    <Text
                      fontSize="xs"
                      color="gray.500"
                      textAlign="center"
                      display={{ base: 'none', md: 'block' }}
                      lineHeight="1.2">
                      {step.description}
                    </Text>
                  )}
                </VStack>
              </VStack>
              {index < steps.length - 1 && (
                // Columns align at the top (see HStack align) so a two-line label can't
                // shove its circle off the connector. The connector therefore carries the
                // circle's own height and centres its rule inside it — margin offsets do
                // not work here, Stack's `& > * ~ *` spacing rule outranks a child's mt.
                // It must NOT take an equal `flex: 1` share on a phone: with 4 steps that
                // gave the rules as much width as the labels and squeezed every column to
                // 36px. The connector earns its stretch only once there is room for it.
                <Flex
                  flex={manySteps ? '0 0 40px' : { base: '0 1 16px', md: '1' }}
                  w={manySteps ? '40px' : 'auto'}
                  h={circleSize}
                  align="center"
                  mx={{ base: 0.5, md: 2 }}>
                  <Box
                    height="3px"
                    w="100%"
                    bg={index < currentStep ? 'green.500' : 'gray.200'}
                    borderRadius="full"
                    transition="all 0.3s"
                  />
                </Flex>
              )}
            </React.Fragment>
          ))}
        </HStack>
      </Box>
    </StandardCard>
  );
};

// Section tabs — for a record whose parts are INDEPENDENT and saved as you go
// (a certifier form's lettered sections), as opposed to StandardStepper, which promises a
// linear order ending in one submit. Two rules this encodes:
//   1. Selection is never signalled by colour alone (WCAG 1.4.1) — the active tab also
//      carries a weight change and an underline, and Chakra sets aria-selected.
//   2. A section-based record must answer "where am I NOT done" from the nav itself, so a
//      tab shows its own completion, not just the document's.

// Segmented control — pick ONE of a few views of the SAME content (calendar vs list, team
// vs company). One track, the selected half lifted out in white. Distinct from
// StandardSectionTabs, which navigates between DIFFERENT sections of a record.
//
// `aria-pressed` toggles rather than a radiogroup: a radiogroup promises arrow-key
// navigation with a roving tabindex, and announcing a contract the widget does not honour
// is worse than the plainer one that is exactly true.

interface SegmentedOption<T extends string> {
  key: T;
  label: string;
  /** Optional leading glyph. Decorative — the label already names the segment. */
  icon?: IconType;
}

/**
 * Generic over the key union so `onChange` hands back `'calendar' | 'list'`, not `string` —
 * a `(key: string) => void` prop cannot take a `useState<'calendar' | 'list'>` setter, which
 * forced one call site to cast and let the other pass an unsound setter unnoticed (the
 * typecheck gate does not run — see frontend-typecheck-gate-dead).
 */
interface StandardSegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  /** Key of the active option. */
  value: T;
  onChange: (key: T) => void;
  /** Names the group for screen readers, e.g. "View mode". */
  ariaLabel: string;
  /** Stretch the segments to fill the row below `smd` (a phone-width toolbar). */
  stretchOnMobile?: boolean;
}

export const StandardSegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  stretchOnMobile = true
}: StandardSegmentedControlProps<T>) => (
  <HStack
    spacing={0}
    role="group"
    aria-label={ariaLabel}
    bg="gray.100"
    borderRadius="xl"
    p="2px"
    // The track must HUG its segments, otherwise it paints grey dead space across the rest
    // of the row. It only spans the full width where the segments stretch to fill it.
    w={{ base: stretchOnMobile ? 'full' : 'fit-content', smd: 'fit-content' }}
    alignSelf={{ base: stretchOnMobile ? 'stretch' : 'flex-start', smd: 'center' }}
    flexShrink={0}>
    {options.map((option) => {
      const isSelected = option.key === value;
      return (
        <Button
          key={option.key}
          aria-pressed={isSelected}
          onClick={() => onChange(option.key)}
          minH="44px"
          flex={{ base: stretchOnMobile ? 1 : 'none', smd: 'none' }}
          px={{ base: 3, md: 4 }}
          size="sm"
          borderRadius="lg"
          fontWeight={isSelected ? 'semibold' : 'medium'}
          color={isSelected ? 'green.700' : 'gray.600'}
          bg={isSelected ? 'white' : 'transparent'}
          boxShadow={isSelected ? 'sm' : 'none'}
          _hover={{ bg: isSelected ? 'white' : 'gray.200' }}
          leftIcon={option.icon ? <Icon as={option.icon} /> : undefined}>
          {option.label}
        </Button>
      );
    })}
  </HStack>
);

export type SectionTabStatus = 'complete' | 'incomplete' | 'none';

interface SectionTab {
  key: string;
  label: string;
  /** 'none' = this section has nothing to satisfy, so it is never marked incomplete. */
  status: SectionTabStatus;
  /** Full-words status for screen readers — i18n belongs to the caller. */
  statusLabel?: string;
  /** Optional leading glyph. Decorative — the label already names the tab. */
  icon?: IconType;
}

interface StandardSectionTabsProps {
  tabs: SectionTab[];
  activeIndex: number;
  onChange: (index: number) => void;
  /** Names the tablist for screen readers, e.g. "Application sections". */
  ariaLabel: string;
  children: ReactNode;
}

export const StandardSectionTabs = ({
  tabs,
  activeIndex,
  onChange,
  ariaLabel,
  children
}: StandardSectionTabsProps) => {
  const listRef = React.useRef<HTMLDivElement>(null);
  // Same keyboard focus ring `theme/components/button.js` settled on — Chakra's default
  // `outline` token is blue and reads as a foreign control in a green app.
  const focusRing = useColorModeValue('0 0 0 3px rgba(76, 175, 80, 0.6)', '0 0 0 3px #276749');

  // Below `md` the row scrolls, and the selected tab is regularly outside it — landing on a
  // section whose own tab is off-screen reads as "nothing is selected". Scroll the row
  // itself rather than calling scrollIntoView, which would also yank the page vertically.
  useEffect(() => {
    const list = listRef.current;
    const tab = list?.querySelectorAll<HTMLElement>('[role="tab"]')[activeIndex];
    if (!list || !tab) return;
    const gutter = 16;
    // `?.` on BOTH steps: jsdom has no matchMedia at all, so the optional call returns
    // undefined and reading `.matches` off it would throw in any test that renders this.
    const behavior: ScrollBehavior = window.matchMedia?.('(prefers-reduced-motion: reduce)')
      ?.matches
      ? 'auto'
      : 'smooth';
    if (tab.offsetLeft < list.scrollLeft) {
      list.scrollTo({ left: Math.max(tab.offsetLeft - gutter, 0), behavior });
    } else if (tab.offsetLeft + tab.offsetWidth > list.scrollLeft + list.clientWidth) {
      list.scrollTo({
        left: tab.offsetLeft + tab.offsetWidth - list.clientWidth + gutter,
        behavior
      });
    }
  }, [activeIndex, tabs.length]);

  return (
    // isLazy: only the selected panel mounts, so `children` is rendered once even though
    // the panel list has to match the tab list for Chakra's index mapping.
    <Tabs index={activeIndex} onChange={onChange} variant="unstyled" isLazy lazyBehavior="unmount">
      <TabList
        ref={listRef}
        aria-label={ariaLabel}
        overflowX="auto"
        overflowY="hidden"
        borderBottom="1px solid"
        borderColor="gray.200"
        sx={{
          // A tab row that scrolls should not advertise it with a scrollbar on desktop.
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' }
        }}>
        {/* Selection compares INDEX, not key: `index` is what Chakra and `activeIndex`
            actually agree on, so a repeated key can't light up two tabs or two panels. */}
        {tabs.map((tab, index) => (
          <Tab
            key={tab.key}
            flexShrink={0}
            minH="44px"
            px={{ base: 3, md: 4 }}
            fontSize="sm"
            fontWeight={index === activeIndex ? 'semibold' : 'medium'}
            color={index === activeIndex ? 'green.600' : 'gray.600'}
            borderBottom="2px solid"
            borderColor={index === activeIndex ? 'green.500' : 'transparent'}
            mb="-1px"
            borderRadius="0"
            transition="color 0.2s, border-color 0.2s"
            _hover={{ color: 'green.600' }}
            _focusVisible={{ boxShadow: focusRing, borderRadius: 'md' }}>
            <HStack spacing={2}>
              {tab.icon ? <Icon as={tab.icon} boxSize="14px" flexShrink={0} aria-hidden /> : null}
              <Text as="span" whiteSpace="nowrap">
                {tab.label}
              </Text>
              {/* One colour language: green = settled, amber = outstanding. The marker is
                  never the only cue — `statusLabel` carries the same fact in words.
                  flexShrink=0: the label is nowrap, so a squeezed row would otherwise eat
                  the marker before it scrolls. */}
              {tab.status === 'complete' && (
                <Icon
                  as={FaCheckCircle}
                  color="green.500"
                  boxSize="14px"
                  flexShrink={0}
                  aria-hidden
                />
              )}
              {tab.status === 'incomplete' && (
                <Circle size="8px" bg="orange.400" flexShrink={0} aria-hidden />
              )}
              {tab.statusLabel ? (
                <Box as="span" srOnly>
                  {tab.statusLabel}
                </Box>
              ) : null}
            </HStack>
          </Tab>
        ))}
      </TabList>
      <TabPanels>
        {tabs.map((tab, index) => (
          <TabPanel key={tab.key} px={0} pt={5} pb={0}>
            {index === activeIndex ? children : null}
          </TabPanel>
        ))}
      </TabPanels>
    </Tabs>
  );
};

// Card-based Selection Component

interface SelectionOption {
  id: string;
  title: string;
  description?: string;
  icon?: IconType;
  color?: string;
  value?: any;
}

interface StandardSelectionGridProps {
  options: SelectionOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  columns?: ResponsiveValue<string>;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StandardSelectionGrid = ({
  options,
  selectedValue,
  onSelect,
  columns = { base: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
  disabled = false,
  size = 'md'
}: StandardSelectionGridProps) => {
  const cardSizes = {
    sm: { height: '100px', iconSize: 5, fontSize: 'sm' },
    md: { height: '130px', iconSize: 6, fontSize: 'md' },
    lg: { height: '160px', iconSize: 8, fontSize: 'lg' }
  };

  const { height, iconSize, fontSize } = cardSizes[size];

  return (
    <Grid templateColumns={columns} gap={4}>
      {options.map((option) => (
        <Box
          key={option.id}
          p={4}
          borderRadius="xl"
          border="2px solid"
          borderColor={selectedValue === option.id ? `${option.color || 'green'}.500` : 'gray.200'}
          bg={selectedValue === option.id ? `${option.color || 'green'}.50` : 'white'}
          cursor={disabled ? 'not-allowed' : 'pointer'}
          opacity={disabled ? 0.5 : 1}
          height={height}
          transition="all 0.2s"
          _hover={
            !disabled
              ? {
                  borderColor: `${option.color || 'green'}.300`,
                  transform: 'translateY(-2px)',
                  boxShadow: 'lg'
                }
              : {}
          }
          onClick={() => !disabled && onSelect(option.id)}>
          <VStack spacing={3} justify="center" height="100%">
            {option.icon && (
              <Circle
                size="50px"
                bg={`${option.color || 'green'}.100`}
                color={`${option.color || 'green'}.600`}>
                <Icon as={option.icon} boxSize={iconSize} />
              </Circle>
            )}

            <VStack spacing={1} flex={1} justify="center">
              <Text fontWeight="semibold" fontSize={fontSize} textAlign="center" noOfLines={2}>
                {option.title}
              </Text>
              {option.description && (
                <Text
                  fontSize="xs"
                  color="gray.600"
                  textAlign="center"
                  noOfLines={2}
                  display={{ base: 'none', md: 'block' }}>
                  {option.description}
                </Text>
              )}
            </VStack>

            {selectedValue === option.id && (
              <Badge colorScheme={option.color || 'green'} variant="solid">
                Selected
              </Badge>
            )}
          </VStack>
        </Box>
      ))}
    </Grid>
  );
};

// Form Components

interface StandardFormProps {
  children: ReactNode;
  title: string;
  description?: string;
  onSubmit?: (data: any) => void;
  isLoading?: boolean;
  submitText?: string;
  showCancel?: boolean;
  onCancel?: () => void;
}

export const StandardForm = ({
  children,
  title,
  description,
  onSubmit,
  isLoading = false,
  submitText = 'Save',
  showCancel = false,
  onCancel
}: StandardFormProps) => {
  return (
    <StandardCard title={title} subtitle={description}>
      <form onSubmit={onSubmit}>
        <VStack spacing={6} align="stretch">
          {children}

          <Divider />

          <HStack spacing={3} justify="flex-end">
            {showCancel && (
              <Button variant="outline" onClick={onCancel} isDisabled={isLoading}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              colorScheme="green"
              isLoading={isLoading}
              loadingText="Saving..."
              size="lg"
              px={8}>
              {submitText}
            </Button>
          </HStack>
        </VStack>
      </form>
    </StandardCard>
  );
};

interface StandardFieldProps {
  /** ReactNode, not string: several call sites pass a fragment so they can hang a Badge off
      the label ("Crop Type [Read-Only]", "Parcel Area [Auto-Loaded]"). That already worked at
      runtime — FormLabel renders whatever it is given — so the `string` type was just narrower
      than the component, and every one of those call sites reported TS2322 into the masked
      pile. */
  label: ReactNode;
  required?: boolean;
  error?: string;
  helpText?: string;
  children: ReactNode;
}

export const StandardField = ({
  label,
  required = false,
  error,
  helpText,
  children
}: StandardFieldProps) => {
  return (
    <FormControl isRequired={required} isInvalid={!!error}>
      <FormLabel fontWeight="semibold" color="gray.700" fontSize="sm" mb={2}>
        {label}
      </FormLabel>
      {children}
      {helpText && !error && (
        <Text fontSize="xs" color="gray.500" mt={1}>
          {helpText}
        </Text>
      )}
      {error && (
        <Text fontSize="xs" color="red.500" mt={1}>
          {error}
        </Text>
      )}
    </FormControl>
  );
};

// Standard Input Components
export const StandardInput = React.forwardRef<HTMLInputElement, any>(
  ({ type, inputMode, leftElement, ...props }, ref) => {
    const input = (
      <Input
        ref={ref}
        borderRadius="lg"
        borderColor="gray.200"
        _hover={{ borderColor: 'green.400' }}
        _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px var(--chakra-colors-green-700)' }}
        size="lg"
        type={type}
        // D11 — every numeric field in the event forms is a measurement a farmer types on a phone
        // in the field: 6.8 pH, 44.5 acres, 0.8 ppm. `type="number"` alone does not guarantee the
        // decimal keypad on iOS, so they were reaching for a full keyboard to enter a number.
        // Defaulted here rather than at ~90 call sites; pass inputMode explicitly to override
        // (e.g. "numeric" for whole counts).
        inputMode={inputMode ?? (type === 'number' ? 'decimal' : undefined)}
        {...props}
      />
    );

    // `leftElement` was previously spread onto <Input>, so callers that passed an
    // adornment icon got no icon and a "React does not recognize the leftElement
    // prop" warning. Render it as a real InputLeftElement instead.
    if (!leftElement) return input;

    return (
      <InputGroup size="lg">
        <InputLeftElement pointerEvents="none" h="full">
          {leftElement}
        </InputLeftElement>
        {input}
      </InputGroup>
    );
  }
);
StandardInput.displayName = 'StandardInput';

/**
 * The app's ONE search field. Lifted verbatim out of `TrazoGlobalSearch` — 44px tall, `xl`
 * radius, magnifier in a 44px left slot — because every page that rolled its own ended up
 * with a bare `<Input>` that shared none of it (Activities had no icon, a different height
 * and a different radius, sitting two rows under the real one).
 *
 * `rightHint` is the slot the global search puts `⌘K` in; leave it out elsewhere.
 * Everything else forwards to the input, so `readOnly` + `onClick` still gives you the
 * navbar's open-the-modal trigger.
 *
 * Sizing props go to the GROUP, not the input. `maxW` on the input left the group at its
 * full flex width, so a 280px field sat at the left of a 725px invisible box — 446px short
 * of the row's right edge — and `rightHint` would have pinned ⌘K to that box's edge instead
 * of the field's.
 */
export const StandardSearchInput = React.forwardRef<HTMLInputElement, any>(
  ({ rightHint, maxW, minW, w, width, flex, ...props }, ref) => {
    const bg = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const hoverBorderColor = useColorModeValue('green.300', 'green.400');

    return (
      <InputGroup maxW={maxW} minW={minW} w={w ?? width} flex={flex}>
        <InputLeftElement pointerEvents="none" h="44px" w="44px">
          <Icon as={FaSearch} color="gray.500" boxSize="16px" />
        </InputLeftElement>
        <StandardInput
          ref={ref}
          // The field has no visible label — only the magnifier — so without this its
          // accessible name falls back to the placeholder, which assistive tech is not
          // required to expose. Callers can still override it.
          aria-label={props['aria-label'] ?? props.placeholder}
          bg={bg}
          borderColor={borderColor}
          _hover={{
            borderColor: hoverBorderColor,
            boxShadow: '0 0 0 1px var(--chakra-colors-green-300)'
          }}
          _focus={{
            borderColor: 'green.500',
            boxShadow: '0 0 0 2px rgba(72, 187, 120, 0.2)'
          }}
          h="44px"
          fontSize="sm"
          borderRadius="xl"
          pl="44px"
          pr={rightHint ? '64px' : 4}
          w="full"
          transition="all 0.2s ease"
          {...props}
        />
        {rightHint ? (
          <Text
            position="absolute"
            right="12px"
            top="50%"
            transform="translateY(-50%)"
            pointerEvents="none"
            fontSize="xs"
            color="gray.400"
            fontFamily="mono"
            letterSpacing="0.5px"
            zIndex={2}>
            {rightHint}
          </Text>
        ) : null}
      </InputGroup>
    );
  }
);
StandardSearchInput.displayName = 'StandardSearchInput';

export const StandardTextarea = React.forwardRef<HTMLTextAreaElement, any>((props, ref) => (
  <Textarea
    ref={ref}
    borderRadius="lg"
    borderColor="gray.200"
    _hover={{ borderColor: 'green.400' }}
    _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px var(--chakra-colors-green-700)' }}
    minH="120px"
    resize="vertical"
    {...props}
  />
));
StandardTextarea.displayName = 'StandardTextarea';

export const StandardSelect = React.forwardRef<HTMLSelectElement, any>((props, ref) => (
  <Select
    ref={ref}
    borderRadius="lg"
    borderColor="gray.200"
    _hover={{ borderColor: 'green.400' }}
    _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px var(--chakra-colors-green-700)' }}
    size="lg"
    {...props}
  />
));
StandardSelect.displayName = 'StandardSelect';

// Action Components
// The component spreads `...rest` onto Chakra's Button, so every prop below already
// worked at runtime — the interface was just narrower than the component. Callers were
// passing responsive widths, `size="xs"`, event-taking handlers and layout props and
// eating a TS error for each one.
/**
 * StandardButton spreads `...rest` straight onto Chakra's <Button>, so at runtime it already
 * accepts every Button prop. The hand-maintained prop list did not say so, and every layout or
 * polymorphic prop a caller reached for (`minH`, `flex`, `as`, `href`, `aria-label`) was a type
 * error — 35 of the 52 new errors that accumulated while the typecheck gate went unrun.
 *
 * Extending ButtonProps makes the type match the behaviour. `variant` and `size` stay narrowed
 * to Trazo's design tokens: the component maps those names onto Chakra colorScheme/variant
 * pairs, so a raw Chakra value like "solid" is NOT a synonym — it falls through the map and
 * silently renders unstyled, which is the inert-prop class already seen with Badge colorScheme
 * and StandardCard variant.
 */
interface StandardButtonProps extends Omit<ButtonProps, 'variant' | 'size' | 'onClick' | 'type'> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit';
  /** Present when rendered polymorphically as an anchor (`as="a"`). */
  href?: string;
  target?: string;
  rel?: string;
}

/**
 * forwardRef because Chakra's focus-management props take a real element ref — AlertDialog's
 * `leastDestructiveRef` is the one in the finish-production dialog. Without it the ref silently
 * never attached, so the dialog had no initial focus target and tsc reported the `ref` prop as
 * not assignable (a masked error; the build never surfaces it).
 */
export const StandardButton = React.forwardRef<HTMLButtonElement, StandardButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      onClick,
      type = 'button',
      disabled = false,
      w,
      width,
      isDisabled,
      ...rest
    },
    ref
  ) => {
    const variants = {
      primary: {
        colorScheme: 'green',
        variant: 'solid'
      },
      secondary: {
        colorScheme: 'gray',
        variant: 'solid'
      },
      outline: {
        colorScheme: 'green',
        variant: 'outline'
      },
      ghost: {
        colorScheme: 'green',
        variant: 'ghost'
      }
    };

    return (
      <Button
        ref={ref}
        {...variants[variant]}
        size={size}
        isLoading={isLoading}
        loadingText={loadingText}
        leftIcon={leftIcon}
        rightIcon={rightIcon}
        onClick={onClick}
        type={type}
        isDisabled={disabled || isDisabled}
        w={w}
        width={width}
        borderRadius="lg"
        fontWeight="semibold"
        minH="44px"
        _focus={{ boxShadow: '0 0 0 3px rgba(46, 125, 50, 0.15)' }}
        // NO `_hover` here. A style prop REPLACES the theme variant's `_hover` object rather
        // than merging into it, so this one used to delete the variant's hover BACKGROUND —
        // the emitted rule was `{ box-shadow; transform }` with no colour, and every primary
        // button in the app stayed exactly the same green while hovered. The lift now lives in
        // the variants, next to the colour it belongs with.
        transition="all 0.2s ease"
        {...rest}>
        {children}
      </Button>
    );
  }
);
StandardButton.displayName = 'StandardButton';

// Status & Feedback Components
interface StandardAlertProps {
  status: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  description?: string;
  children?: ReactNode;
  /**
   * Bottom margin. Defaults to 6, which is what every existing call site already gets.
   *
   * It was hardcoded, and that is why the OSP narrative page never adopted this component:
   * its eleven alerts sit inside cards and accordion panels at mb 0–3, and the only way to
   * use StandardAlert there was to accept 24px of dead space under each one. A component
   * the design system cannot fit into its own pages loses to a raw <Alert> every time.
   */
  mb?: number | string;
}

/**
 * Semantic status -> the theme palette that actually exists.
 *
 * This used to interpolate the STATUS NAME straight into a colour token —
 * `bg={`${status}.50`}` emitted "success.50", "info.50", "warning.50".
 * `theme/styles.js` defines green / red / amber / blue and NO such scales, so Chakra
 * passed the literal string through, the browser dropped the declaration as invalid,
 * and BOTH `bg` and `borderLeftColor` were inert: every StandardAlert in the app has
 * been rendering Chakra's stock left-accent, not the Trazo one. Same failure class as
 * the inert `Badge colorScheme` — see `.claude/rules/frontend.md`.
 *
 * `warning` maps to `amber` deliberately. The theme defines amber and NOT orange, so
 * Chakra's own status->orange default was reaching for a foreign palette.
 */
/**
 * Re-exported, NOT redeclared. `theme/components/alert.js` is the canonical home now that
 * the theme paints every bare `<Alert>` too — two copies of this map is exactly how the
 * standard component and the 71 bare call sites would drift apart again. The existing
 * `theme/__tests__/alertContrast.test.ts` imports these names from here, so the re-export
 * keeps that guard pointed at the values the theme actually renders from.
 */
export { ALERT_PALETTE, ALERT_ACCENT_SHADE };

/**
 * The accent bar, the `lg` radius, the `.50` ground and the top-aligned icon now all come
 * from `theme/components/alert.js`, which paints a BARE `<Alert>` the same way. What is left
 * here is the only thing this component ever added on top: an optional bold title stacked
 * over a description, and a default bottom margin.
 *
 * ⛔ Do NOT re-add `bg` / `borderLeft` / `borderRadius` / `alignItems` as style props. They
 * were correct when the theme owned nothing; now they would be a SECOND definition that
 * silently outranks the theme (style props beat theme styles), so a future palette change in
 * alert.js would move all 71 bare alerts and leave these 42 behind. That divergence is the
 * exact defect this change closed.
 */
export const StandardAlert = ({
  status,
  title,
  description,
  children,
  mb = 6
}: StandardAlertProps) => {
  const icons = {
    success: MdCheck,
    error: MdError,
    warning: MdWarning,
    info: MdInfo
  };

  return (
    <Alert status={status} variant="left-accent" marginBottom={mb}>
      {/* `as` only swaps the glyph — the COLOUR comes from the theme's `icon` part, so it
          cannot drift from the accent bar beside it. */}
      <AlertIcon as={icons[status]} />
      <VStack align="start" spacing={1}>
        {title && (
          <Text fontWeight="semibold" fontSize="sm">
            {title}
          </Text>
        )}
        {description && <Text fontSize="sm">{description}</Text>}
        {children}
      </VStack>
    </Alert>
  );
};

interface GuidanceNoteProps {
  children: ReactNode;
}

/**
 * The four tokens GuidanceNote paints with, exported because the component RENDERS FROM
 * THIS OBJECT and `theme/__tests__/alertContrast.test.ts` ASSERTS AGAINST IT. That is the
 * whole point: a guard that names its own colours proves nothing about the component
 * (`expect(gray.500).not.toBe(green.500)` is true forever, whatever the JSX does). Reading
 * the same object the component consumes is what makes the contrast floors and the
 * no-status-hue rule actually enforceable.
 *
 * MEASURED on the `ground`: bar 4.41:1, icon 5.93:1, text 9.63:1.
 */
export const GUIDANCE_NOTE_TOKENS = {
  ground: 'gray.50',
  bar: 'gray.500',
  icon: 'gray.600',
  text: 'gray.700'
} as const;

/**
 * A quiet, NEUTRAL aside for static teaching copy — the "here is what this section means"
 * text that ships with a form, not something that just happened.
 *
 * Why this is not a StandardAlert:
 *
 * 1. SEMANTICS. `<Alert>` needs a status, and guidance has none. The OSP wizard reached
 *    for `status="success"` purely to obtain a green box, then had to override the icon
 *    (`<AlertIcon as={FaInfoCircle} />`) to hide the success checkmark it did not mean.
 *    A component you must de-check to use honestly is the wrong component.
 * 2. COLOUR. `.claude/rules/frontend.md`: status colour = meaning, never decoration.
 *    Green means done/success everywhere else in the app, so tinting permanent help text
 *    green tells the reader this part is complete. Nothing here is green, on purpose —
 *    that is what keeps green worth reading elsewhere.
 * 3. A11Y. `<Alert>` renders `role="alert"`, an ASSERTIVE live region. Module education
 *    blocks are present on first paint and never change; announcing them as alerts
 *    interrupts a screen reader for content that is simply part of the page.
 *
 * Grounds: `gray.50` over the page canvas reads as a tinted aside; over a white
 * StandardCard it is 1.02:1, so the note degrades to bar + icon + text with no nested
 * container. Both call sites want exactly one of those, so there is no variant prop.
 * Bar `gray.500` = 4.41:1 on that ground, icon `gray.600` = 5.93:1 — both clear 3.0.
 */
export const GuidanceNote = ({ children }: GuidanceNoteProps) => (
  <Flex
    align="flex-start"
    gap={3}
    bg={GUIDANCE_NOTE_TOKENS.ground}
    borderLeft="4px solid"
    borderLeftColor={GUIDANCE_NOTE_TOKENS.bar}
    borderRadius="md"
    px={4}
    py={3}>
    <Icon
      as={MdInfo}
      color={GUIDANCE_NOTE_TOKENS.icon}
      boxSize={5}
      mt="1px"
      flexShrink={0}
      aria-hidden
    />
    <Text fontSize="sm" color={GUIDANCE_NOTE_TOKENS.text}>
      {children}
    </Text>
  </Flex>
);

// Loading States

// Full-page loading - use when loading replaces the entire page content
export const StandardPageLoading = () => (
  <Flex justify="center" align="center" py={20} minH="200px">
    <CircularProgress isIndeterminate color="green.500" />
  </Flex>
);

// Section/inline loading - use within cards, tables, sections
export const StandardSpinner = () => (
  <Flex justify="center" align="center" py={8}>
    <CircularProgress isIndeterminate color="green.500" size="40px" />
  </Flex>
);

export const StandardSkeleton = ({ count = 3 }: { count?: number }) => (
  <VStack spacing={4}>
    {Array.from({ length: count }).map((_, i) => (
      <Box key={i} w="full" h="80px" bg="gray.200" borderRadius="lg" />
    ))}
  </VStack>
);

// Grid Components
interface StandardGridProps {
  children: ReactNode;
  columns?: number | object;
  spacing?: number;
}

export const StandardGrid = ({
  children,
  columns = { base: 1, md: 2, lg: 3 },
  spacing = 6
}: StandardGridProps) => (
  <SimpleGrid columns={columns} spacing={spacing}>
    {children}
  </SimpleGrid>
);

// Section Components
interface StandardSectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

export const StandardSection = ({ title, description, action, children }: StandardSectionProps) => (
  <Box mb={8}>
    <Flex justify="space-between" align="center" mb={4}>
      <VStack align="start" spacing={1}>
        {/* Responsive, not a fixed `lg`. At 375px a fixed `lg` renders 24px while a page
            title using the usual `{base:'md'}` renders 20px — so every section heading came
            out LARGER than the h1 above it, inverting the hierarchy on the breakpoint that
            matters most. 20px mobile / 24px desktop keeps h1 > h2 at both. */}
        <Heading as="h2" size={{ base: 'md', md: 'lg' }} color="gray.700">
          {title}
        </Heading>
        {description && (
          <Text color="gray.500" fontSize="sm">
            {description}
          </Text>
        )}
      </VStack>
      {action}
    </Flex>
    {children}
  </Box>
);

// Sprint 2 Epic 2.3: Section Header Component for Form Tabs
// Provides consistent header styling across all event form tabs

interface SectionHeaderProps {
  icon: IconType;
  iconColor?: string;
  title: string;
  badge?: string;
  badgeColorScheme?: string;
  description?: string;
}

export const SectionHeader = ({
  icon,
  iconColor = 'green.500',
  title,
  badge,
  badgeColorScheme = 'green',
  description
}: SectionHeaderProps) => (
  <Box mb={4}>
    <Flex
      direction={{ base: badge ? 'column' : 'row', smd: 'row' }}
      justify={{ base: 'flex-start', smd: 'space-between' }}
      align={{ base: 'flex-start', smd: 'center' }}
      gap={2}
      mb={description ? 2 : 0}>
      {badge && (
        <Badge
          colorScheme={badgeColorScheme}
          fontSize="xs"
          flexShrink={0}
          display={{ base: 'inline-flex', smd: 'none' }}>
          {badge}
        </Badge>
      )}
      <HStack spacing={2}>
        <Icon as={icon} color={iconColor} boxSize={5} flexShrink={0} />
        <Text fontSize="md" fontWeight="bold" color="gray.700">
          {title}
        </Text>
      </HStack>
      {badge && (
        <Badge
          colorScheme={badgeColorScheme}
          fontSize="xs"
          flexShrink={0}
          display={{ base: 'none', smd: 'inline-flex' }}>
          {badge}
        </Badge>
      )}
    </Flex>
    {description && (
      <Text fontSize="sm" color="gray.600">
        {description}
      </Text>
    )}
  </Box>
);

// Section Box Component - wrapper with border styling for form sections
interface SectionBoxProps {
  children: ReactNode;
  variant?: 'default' | 'highlighted';
  borderColor?: string;
  bg?: string;
}

export const SectionBox = ({ children, variant = 'default', borderColor, bg }: SectionBoxProps) => {
  const defaultBorderColor = variant === 'highlighted' ? 'green.200' : 'gray.200';
  const defaultBg = variant === 'highlighted' ? 'green.50' : 'white';

  return (
    <Box
      mb={6}
      p={{ base: 3, md: 4 }}
      border="1px"
      borderColor={borderColor || defaultBorderColor}
      borderRadius="lg"
      bg={bg || defaultBg}>
      {children}
    </Box>
  );
};

// Sprint 3 Epic 3.3: Collapsible Section for Progressive Field Display
// Provides expandable/collapsible sections for advanced or optional fields

interface CollapsibleSectionProps {
  title: string;
  icon?: IconType;
  iconColor?: string;
  badge?: string;
  badgeColorScheme?: string;
  description?: string;
  children: ReactNode;
  defaultIsOpen?: boolean;
  variant?: 'default' | 'highlighted';
}

export const CollapsibleSection = ({
  title,
  icon,
  iconColor = 'gray.500',
  badge,
  badgeColorScheme = 'gray',
  description,
  children,
  defaultIsOpen = false,
  variant = 'default'
}: CollapsibleSectionProps) => {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen });
  const borderColor = variant === 'highlighted' ? 'green.200' : 'gray.200';
  const bgColor = variant === 'highlighted' ? 'green.50' : 'white';
  const headerBg = useColorModeValue('gray.50', 'gray.700');

  return (
    <Box
      mb={6}
      border="1px"
      borderColor={borderColor}
      borderRadius="lg"
      bg={bgColor}
      overflow="hidden">
      {/* Clickable Header */}
      <Box
        as="button"
        type="button"
        onClick={onToggle}
        w="100%"
        p={4}
        bg={headerBg}
        borderBottom={isOpen ? '1px' : '0'}
        borderColor={borderColor}
        cursor="pointer"
        _hover={{ bg: variant === 'highlighted' ? 'green.100' : 'gray.100' }}
        transition="all 0.2s">
        <Flex justify="space-between" align="center">
          <HStack spacing={2}>
            {icon && <Icon as={icon} color={iconColor} boxSize={5} />}
            <Text fontSize="md" fontWeight="bold" color="gray.700">
              {title}
            </Text>
            {badge && (
              <Badge colorScheme={badgeColorScheme} fontSize="xs">
                {badge}
              </Badge>
            )}
          </HStack>
          <HStack spacing={2}>
            <Text fontSize="sm" color="gray.500">
              {isOpen ? 'Hide' : 'Show'}
            </Text>
            <Icon
              as={isOpen ? FaChevronUp : FaChevronDown}
              color="gray.500"
              boxSize={4}
              transition="transform 0.2s"
            />
          </HStack>
        </Flex>
        {description && !isOpen && (
          <Text fontSize="sm" color="gray.500" mt={2} textAlign="left">
            {description}
          </Text>
        )}
      </Box>

      {/* Collapsible Content */}
      <Collapse in={isOpen} animateOpacity>
        <Box p={4}>
          {description && (
            <Text fontSize="sm" color="gray.600" mb={4}>
              {description}
            </Text>
          )}
          {children}
        </Box>
      </Collapse>
    </Box>
  );
};

// Consumer-Friendly Tooltip Component

interface ConsumerTooltipProps {
  label: string;
  explanation: string;
  children: ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export const ConsumerTooltip = ({
  label,
  explanation,
  children,
  placement = 'top'
}: ConsumerTooltipProps) => {
  // NOTE (2026-06 audit P1-4): pillar explanations are hover/focus only. A tap-to-open
  // variant was tried but caused two regressions on the PRACTICES pillar — (1) wrapping
  // children broke the grid card sizing, and (2) tapping the card opened this tooltip AND
  // the nested USDA-seal popover at once ("double message"). Reverted to hover-only. The
  // supplementary nature is acceptable: the FTC disclaimer is static text beneath the
  // pillars and the USDA seal carries its own tap-accessible popover. A proper mobile
  // affordance needs a Popover-based pillar redesign that coordinates with the seal popover.
  return (
    <Tooltip
      label={
        <Box maxW="280px" p={2}>
          <Text fontWeight="bold" mb={1} fontSize="sm">
            {label}
          </Text>
          <Text fontSize="xs" lineHeight="1.4">
            {explanation}
          </Text>
        </Box>
      }
      placement={placement}
      bg="gray.800"
      color="white"
      borderRadius="md"
      fontSize="xs"
      hasArrow
      closeOnClick={false}
      openDelay={300}>
      {children}
    </Tooltip>
  );
};

// Metric Card Component for Consistent Dashboard Displays

interface StandardMetricCardProps {
  icon: IconType;
  iconColor?: string;
  iconBg?: string;
  value: string | number;
  label: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  colorScheme?: string;
  tooltip?: {
    label: string;
    explanation: string;
  };
}

export const StandardMetricCard = ({
  icon,
  iconColor = 'green.600',
  iconBg = 'green.100',
  value,
  label,
  subtitle,
  size = 'md',
  colorScheme = 'green',
  tooltip
}: StandardMetricCardProps) => {
  const iconSize = size === 'sm' ? 4 : size === 'lg' ? 8 : 6;
  const circleSize = size === 'sm' ? '40px' : size === 'lg' ? '80px' : '60px';
  const valueSize = size === 'sm' ? 'lg' : size === 'lg' ? '3xl' : '2xl';
  const labelSize = size === 'sm' ? 'xs' : 'sm';

  const MetricContent = (
    <VStack spacing={3}>
      <Circle size={circleSize} bg={iconBg} color={iconColor}>
        <Icon as={icon} boxSize={iconSize} />
      </Circle>
      <VStack spacing={1}>
        <Text fontSize={valueSize} fontWeight="bold" color={iconColor}>
          {value}
        </Text>
        <HStack spacing={1} align="center">
          <Text fontSize={labelSize} color="gray.600" textAlign="center">
            {label}
          </Text>
          {tooltip && <Icon as={FaQuestionCircle} boxSize={3} color="gray.400" />}
        </HStack>
        {subtitle && (
          <Text fontSize="xs" color="gray.500" textAlign="center">
            {subtitle}
          </Text>
        )}
      </VStack>
    </VStack>
  );

  if (tooltip) {
    return (
      <ConsumerTooltip label={tooltip.label} explanation={tooltip.explanation}>
        <Box cursor="help">{MetricContent}</Box>
      </ConsumerTooltip>
    );
  }

  return MetricContent;
};

// Standardized Media Upload Component

interface StandardMediaUploadProps {
  onFilesChange: (files: File[]) => void;
  acceptedFiles?: File[];
  uploadedFiles?: string[]; // URLs of successfully uploaded files
  maxFiles?: number;
  maxSize?: number;
  accept?: string | string[] | { [key: string]: string[] };
  multiple?: boolean;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  helpText?: string;
  placeholder?: string;
  description?: string;
  height?: string;
  variant?: 'default' | 'compact' | 'consumer';
  showFileNames?: boolean;
  previewMode?: 'grid' | 'list' | 'thumbnails';
  isUploading?: boolean;
  uploadProgress?: number;
  onRemoveFile?: (index: number) => void;
  onRemoveUploadedFile?: (index: number, url: string) => void;
}

export const StandardMediaUpload = ({
  onFilesChange,
  acceptedFiles = [],
  uploadedFiles = [],
  maxFiles = 5,
  maxSize = 10485760, // 10MB
  accept = 'image/*',
  multiple = true,
  disabled = false,
  required = false,
  error,
  helpText,
  placeholder,
  description,
  height = '280px',
  variant = 'default',
  showFileNames = true,
  previewMode = 'grid',
  isUploading = false,
  uploadProgress = 0,
  onRemoveFile,
  onRemoveUploadedFile
}: StandardMediaUploadProps) => {
  const borderColor = useColorModeValue('gray.300', 'gray.600');
  const bgColor = useColorModeValue('green.50', 'green.900');
  const textColor = useColorModeValue('gray.700', 'white');
  const hoverBgColor = useColorModeValue('green.25', 'green.800');
  const successColor = useColorModeValue('green.700', 'green.300');

  // State for managing object URLs to prevent memory leaks
  const [fileObjectUrls, setFileObjectUrls] = useState<Map<File, string>>(new Map());

  // Clean up object URLs when component unmounts or files change
  useEffect(() => {
    return () => {
      fileObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [fileObjectUrls]);

  // Update object URLs when accepted files change
  useEffect(() => {
    const newUrls = new Map();
    acceptedFiles.forEach((file) => {
      if (fileObjectUrls.has(file)) {
        newUrls.set(file, fileObjectUrls.get(file)!);
      } else {
        newUrls.set(file, URL.createObjectURL(file));
      }
    });

    // Clean up old URLs
    fileObjectUrls.forEach((url, file) => {
      if (!acceptedFiles.includes(file)) {
        URL.revokeObjectURL(url);
      }
    });

    setFileObjectUrls(newUrls);
  }, [acceptedFiles]);

  // Convert string accept prop to object format for react-dropzone v14+
  const acceptObject = typeof accept === 'string' ? { [accept]: [] } : accept;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (droppedFiles: File[]) => {
      if (onFilesChange && Array.isArray(droppedFiles)) {
        onFilesChange(droppedFiles);
      }
    },
    accept: acceptObject,
    multiple,
    maxFiles,
    maxSize,
    disabled: disabled || isUploading
  });

  const isImage = (file: File) => {
    return file.type && file.type.startsWith('image/');
  };

  const handleRemoveFile = useCallback(
    (index: number) => {
      if (onRemoveFile) {
        onRemoveFile(index);
      }
    },
    [onRemoveFile]
  );

  const handleRemoveUploadedFile = useCallback(
    (index: number, url: string) => {
      if (onRemoveUploadedFile) {
        onRemoveUploadedFile(index, url);
      }
    },
    [onRemoveUploadedFile]
  );

  const renderFilePreview = (file: File, index: number, isFromAccepted = true) => {
    if (isImage(file)) {
      const objectUrl = fileObjectUrls.get(file) || URL.createObjectURL(file);

      return (
        <Box key={index} position="relative" textAlign="center">
          <Box
            borderRadius="xl"
            overflow="hidden"
            mb={2}
            boxShadow="md"
            border="1px solid"
            borderColor="gray.200"
            position="relative">
            <Image
              src={objectUrl}
              alt={file.name}
              w="100%"
              h={previewMode === 'thumbnails' ? '80px' : '120px'}
              objectFit="cover"
            />

            {/* Remove button */}
            {isFromAccepted && onRemoveFile && (
              <IconButton
                aria-label="Remove image"
                icon={<FaTimes />}
                position="absolute"
                top={1}
                right={1}
                size="xs"
                colorScheme="red"
                variant="solid"
                borderRadius="full"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile(index);
                }}
              />
            )}
          </Box>
          {showFileNames && (
            <Text fontSize="xs" color="gray.600" noOfLines={1} fontWeight="medium">
              {file.name}
            </Text>
          )}
        </Box>
      );
    }

    return (
      <Box
        key={index}
        textAlign="center"
        p={3}
        border="1px solid"
        borderColor={borderColor}
        borderRadius="lg"
        bg="gray.50"
        position="relative">
        <Icon as={FaCheckCircle} boxSize={6} color="green.500" mb={2} />
        <Text fontSize="xs" color={textColor} noOfLines={1} fontWeight="medium">
          {file.name}
        </Text>
        {isFromAccepted && onRemoveFile && (
          <IconButton
            aria-label="Remove file"
            icon={<FaTimes />}
            position="absolute"
            top={1}
            right={1}
            size="xs"
            colorScheme="red"
            variant="solid"
            borderRadius="full"
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveFile(index);
            }}
          />
        )}
      </Box>
    );
  };

  const renderUploadedImage = (url: string, index: number) => {
    return (
      <Box key={`uploaded-${index}`} position="relative" textAlign="center">
        <Box
          borderRadius="xl"
          overflow="hidden"
          mb={2}
          boxShadow="md"
          border="2px solid"
          borderColor={successColor}
          position="relative">
          <S3Image
            src={url}
            alt={`Uploaded image ${index + 1}`}
            w="100%"
            h={previewMode === 'thumbnails' ? '80px' : '120px'}
            objectFit="cover"
            fallbackSrc="/images/placeholder.jpg"
          />

          {/* Success badge */}
          <Box
            position="absolute"
            top={1}
            left={1}
            bg={successColor}
            color="white"
            borderRadius="full"
            p={1}>
            <Icon as={FaCheckCircle} boxSize={3} />
          </Box>

          {/* Remove button */}
          {onRemoveUploadedFile && (
            <IconButton
              aria-label="Remove uploaded image"
              icon={<FaTrash />}
              position="absolute"
              top={1}
              right={1}
              size="xs"
              colorScheme="red"
              variant="solid"
              borderRadius="full"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveUploadedFile(index, url);
              }}
            />
          )}
        </Box>
        <Text fontSize="xs" color={successColor} fontWeight="medium">
          Uploaded
        </Text>
      </Box>
    );
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'compact':
        return {
          height: '160px',
          iconSize: 8,
          textSize: 'md'
        };
      case 'consumer':
        return {
          height: '140px',
          iconSize: 6,
          textSize: 'sm',
          borderStyle: 'solid',
          borderWidth: '1px'
        };
      default:
        return {
          height: height,
          iconSize: 12,
          textSize: 'lg'
        };
    }
  };

  const variantStyles = getVariantStyles();
  const totalFiles = acceptedFiles.length + uploadedFiles.length;
  const hasFiles = totalFiles > 0;

  return (
    <VStack spacing={4} align="stretch" w="100%">
      {/* Upload Progress */}
      {isUploading && (
        <Box>
          <Flex justify="space-between" align="center" mb={2}>
            <Text fontSize="sm" fontWeight="medium" color={textColor}>
              Uploading images...
            </Text>
            <Text fontSize="sm" color="gray.500">
              {Math.round(uploadProgress)}%
            </Text>
          </Flex>
          <Progress
            value={uploadProgress}
            colorScheme="green"
            borderRadius="md"
            bg="gray.100"
            size="sm"
          />
        </Box>
      )}

      {/* Uploaded Files Display */}
      {uploadedFiles.length > 0 && (
        <Box>
          <Text fontSize="sm" fontWeight="medium" color={successColor} mb={3}>
            Successfully uploaded ({uploadedFiles.length})
          </Text>
          <Grid
            templateColumns={
              previewMode === 'thumbnails'
                ? 'repeat(auto-fill, minmax(100px, 1fr))'
                : 'repeat(auto-fill, minmax(140px, 1fr))'
            }
            gap={3}
            w="100%">
            {uploadedFiles.map((url, index) => renderUploadedImage(url, index))}
          </Grid>
        </Box>
      )}

      {/* File Drop Zone */}
      <Box
        border={variantStyles.borderStyle || '2px dashed'}
        borderWidth={variantStyles.borderWidth || '2px'}
        borderColor={
          error ? 'red.300' : isUploading ? 'blue.300' : isDragActive ? 'green.400' : borderColor
        }
        borderRadius="xl"
        p={variant === 'consumer' ? 4 : 6}
        minH={hasFiles ? 'auto' : variantStyles.height}
        textAlign="center"
        cursor={disabled || isUploading ? 'not-allowed' : 'pointer'}
        transition="all 0.3s ease"
        bg={isUploading ? 'blue.25' : isDragActive ? bgColor : error ? 'red.25' : 'transparent'}
        _hover={{
          borderColor: disabled || isUploading ? borderColor : error ? 'red.400' : 'green.400',
          bg: disabled || isUploading ? 'transparent' : error ? 'red.50' : hoverBgColor,
          transform: disabled || isUploading ? 'none' : 'translateY(-1px)',
          boxShadow: disabled || isUploading ? 'none' : 'md'
        }}
        opacity={disabled ? 0.6 : 1}
        {...getRootProps()}>
        <input {...getInputProps()} style={{ display: 'none' }} />

        {acceptedFiles.length > 0 ? (
          <VStack spacing={4} justify="center">
            <HStack>
              <Circle
                size="40px"
                bg={isUploading ? 'blue.100' : 'green.100'}
                color={isUploading ? 'blue.600' : 'green.600'}>
                {isUploading ? <Spinner size="sm" /> : <Icon as={FaCheckCircle} boxSize={5} />}
              </Circle>
              <VStack spacing={0} align="start">
                <Text fontWeight="semibold" fontSize="md" color={textColor}>
                  {acceptedFiles.length} file{acceptedFiles.length !== 1 ? 's' : ''} ready
                </Text>
                {isUploading && (
                  <Text fontSize="sm" color="blue.600">
                    Processing upload...
                  </Text>
                )}
              </VStack>
            </HStack>

            {previewMode !== 'list' && (
              <Grid
                templateColumns={
                  previewMode === 'thumbnails'
                    ? 'repeat(auto-fill, minmax(100px, 1fr))'
                    : 'repeat(auto-fill, minmax(140px, 1fr))'
                }
                gap={3}
                w="100%"
                maxW="500px"
                mx="auto">
                {acceptedFiles
                  .slice(0, 3)
                  .map((file, index) => renderFilePreview(file, index, true))}
                {acceptedFiles.length > 3 && (
                  <Box
                    textAlign="center"
                    p={3}
                    borderRadius="lg"
                    bg="gray.100"
                    border="1px dashed"
                    borderColor="gray.300">
                    <Text fontSize="sm" color="gray.600" fontWeight="medium">
                      +{acceptedFiles.length - 3} more
                    </Text>
                  </Box>
                )}
              </Grid>
            )}
          </VStack>
        ) : (
          <VStack spacing={4} justify="center" h="full">
            <Circle size="60px" bg="gray.100" color="gray.500">
              <Icon as={FaCamera} boxSize={variantStyles.iconSize} />
            </Circle>
            <VStack spacing={2}>
              <Text
                fontSize={variantStyles.textSize}
                color="gray.600"
                fontWeight="semibold"
                textAlign="center">
                {placeholder || 'Drag & drop images here, or click to select'}
              </Text>
              <Text fontSize="sm" color="gray.500" textAlign="center">
                {description ||
                  `Maximum ${maxFiles} files, up to ${Math.round(maxSize / 1048576)}MB each`}
              </Text>
            </VStack>
          </VStack>
        )}
      </Box>

      {/* Status and Help Text */}
      {helpText && !error && !isUploading && (
        <Text fontSize="xs" color="gray.500">
          {helpText}
        </Text>
      )}
      {error && (
        <Alert status="error">
          <AlertIcon />
          <Text fontSize="sm">{error}</Text>
        </Alert>
      )}
    </VStack>
  );
};

// Sprint 3 Epic 3.3: Draft Restoration Alert Component
// Shows when a saved draft is available for restoration

interface DraftRestorationAlertProps {
  /** Whether there's a draft available */
  hasDraft: boolean;
  /** Timestamp of the last save */
  lastSaved: Date | null;
  /** Callback to restore the draft */
  onRestore: () => void;
  /** Callback to discard the draft */
  onDiscard: () => void;
  /** Whether to show the alert */
  show?: boolean;
}

export const DraftRestorationAlert = ({
  hasDraft,
  lastSaved,
  onRestore,
  onDiscard,
  show = true
}: DraftRestorationAlertProps) => {
  const intl = useIntl();
  if (!hasDraft || !show) return null;

  // D10 — was hand-rolled English pluralization ("2 minutes ago"), which cannot be translated.
  // Intl.RelativeTimeFormat gets the plural rules right in every locale for free.
  const formatTimeAgo = (date: Date | null): string => {
    if (!date)
      return intl.formatMessage({ id: 'events.draft.someTimeAgo', defaultMessage: 'earlier' });

    const diffMins = Math.round((Date.now() - date.getTime()) / 60000);
    if (diffMins < 1) {
      return intl.formatMessage({ id: 'events.draft.justNow', defaultMessage: 'just now' });
    }
    if (diffMins < 60) return intl.formatRelativeTime(-diffMins, 'minute', { numeric: 'auto' });
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return intl.formatRelativeTime(-diffHours, 'hour', { numeric: 'auto' });
    return intl.formatRelativeTime(-Math.round(diffHours / 24), 'day', { numeric: 'auto' });
  };

  return (
    <Alert status="info" variant="left-accent" mb={4}>
      <AlertIcon color="blue.500" />
      <Flex
        direction={{ base: 'column', md: 'row' }}
        justify="space-between"
        align={{ base: 'flex-start', md: 'center' }}
        flex={1}
        gap={3}>
        <VStack align="flex-start" spacing={0}>
          <Text fontWeight="semibold" fontSize="sm" color="blue.700">
            {intl.formatMessage({
              id: 'events.draft.available',
              defaultMessage: 'Draft available'
            })}
          </Text>
          <Text fontSize="xs" color="blue.600">
            {intl.formatMessage(
              {
                id: 'events.draft.availableBody',
                defaultMessage: 'You have an unsaved draft from {when}'
              },
              { when: formatTimeAgo(lastSaved) }
            )}
          </Text>
        </VStack>
        <HStack spacing={2}>
          <Button size="sm" colorScheme="blue" variant="solid" minH="44px" onClick={onRestore}>
            {intl.formatMessage({ id: 'events.draft.restore', defaultMessage: 'Restore draft' })}
          </Button>
          <Button size="sm" colorScheme="gray" variant="outline" minH="44px" onClick={onDiscard}>
            {intl.formatMessage({ id: 'events.draft.discard', defaultMessage: 'Discard' })}
          </Button>
        </HStack>
      </Flex>
    </Alert>
  );
};

// Sprint 3 Epic 3.3: Auto-Save Status Indicator
// Shows when form data was last auto-saved

interface AutoSaveStatusProps {
  /** Timestamp of the last save */
  lastSaved: Date | null;
  /** Whether currently saving */
  isSaving: boolean;
}

export const AutoSaveStatus = ({ lastSaved, isSaving }: AutoSaveStatusProps) => {
  const intl = useIntl();
  if (!lastSaved && !isSaving) return null;

  return (
    <HStack spacing={2} fontSize="xs" color="gray.500">
      {isSaving ? (
        <>
          <Spinner size="xs" color="green.500" />
          <Text>
            {intl.formatMessage({ id: 'events.draft.saving', defaultMessage: 'Saving draft…' })}
          </Text>
        </>
      ) : lastSaved ? (
        <>
          <Icon as={FaCheckCircle} color="green.500" boxSize={3} />
          <Text>
            {intl.formatMessage(
              { id: 'events.draft.savedAt', defaultMessage: 'Draft saved at {time}' },
              { time: intl.formatTime(lastSaved, { hour: '2-digit', minute: '2-digit' }) }
            )}
          </Text>
        </>
      ) : null}
    </HStack>
  );
};

interface StandardPaginationProps {
  /** 1-based. */
  page: number;
  /** Total number of items across all pages. */
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  /** Optional noun for the range label, e.g. "activities". Defaults to a generic count. */
  itemLabel?: string;
}

/**
 * Page control for the long lists (activities, productions, scans).
 *
 * These lists rendered every row they had — 166 seasons, hundreds of activities — so the page
 * grew without bound, the browser laid out rows nobody scrolled to, and "how many are there?"
 * had no answer short of scrolling to the end. Deliberately a pager and not infinite scroll:
 * these are records a grower cross-checks against a certifier's questions, so a stable position
 * ("page 3 of 12") and a total are the useful affordances.
 *
 * Renders nothing when everything fits on one page — a pager under a 4-row table is noise.
 */
export const StandardPagination = ({
  page,
  total,
  pageSize,
  onChange,
  itemLabel
}: StandardPaginationProps) => {
  const intl = useIntl();
  // A zero/negative pageSize would make `total / pageSize` Infinity or negative and hand the
  // pager an unusable page count; floor it at 1 rather than render nonsense.
  const size = Math.max(1, pageSize);
  const pageCount = Math.max(1, Math.ceil(total / size));
  if (total <= size) return null;

  const first = (page - 1) * size + 1;
  const last = Math.min(page * size, total);

  return (
    <Flex
      align="center"
      justify="space-between"
      gap={3}
      pt={3}
      mt={2}
      borderTopWidth="1px"
      borderColor="gray.100"
      flexWrap="wrap">
      <Text fontSize="xs" color="gray.500">
        {/* `.trim()` because `item` is optional: without a label the message ends in a dangling
            space ("Showing 1–10 of 20 "). */}
        {intl
          .formatMessage({ id: 'pagination.range' }, { first, last, total, item: itemLabel ?? '' })
          .toString()
          .trim()}
      </Text>
      <HStack spacing={2}>
        <Button
          size="sm"
          variant="outline"
          leftIcon={<FaChevronLeft />}
          onClick={() => onChange(Math.max(1, page - 1))}
          isDisabled={page <= 1}>
          {intl.formatMessage({ id: 'pagination.previous' })}
        </Button>
        <Text fontSize="xs" color="gray.600" whiteSpace="nowrap">
          {intl.formatMessage({ id: 'pagination.pageOf' }, { page, pageCount })}
        </Text>
        <Button
          size="sm"
          variant="outline"
          rightIcon={<FaChevronRight />}
          onClick={() => onChange(Math.min(pageCount, page + 1))}
          isDisabled={page >= pageCount}>
          {intl.formatMessage({ id: 'pagination.next' })}
        </Button>
      </HStack>
    </Flex>
  );
};
