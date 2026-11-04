import { useIntl } from 'react-intl';
import React from 'react';
import {
  Box,
  Container,
  Stack,
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
  InputRightElement,
  Textarea,
  Select,
  NumberInput,
  NumberInputProps,
  MenuItem,
  MenuDivider,
  InputProps,
  SelectProps,
  TextareaProps,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
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
  TabPanel,
  Checkbox
} from '@chakra-ui/react';
import type { ButtonProps, FormControlProps } from '@chakra-ui/react';
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
  /**
   * Names where Back goes ("Back to River Block"). Defaults to a bare "Back", which is
   * right only when nothing else on the page also goes back. A multi-step form has its own
   * previous-step control, and two buttons both reading "Back" sent a farmer out of the
   * activity wizard when they meant to return to step 1. ReactNode for the same reason as
   * `description`: `formatMessage` with values is typed `string | ReactNode[]`.
   */
  backLabel?: ReactNode;
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
  backLabel,
  rightAction,
  contentMaxW
}: StandardPageProps) => {
  const intl = useIntl();
  const bgColor = useColorModeValue('surface.canvas', 'gray.900');
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Determine if we need the full hero or just a minimal header
  const hasHeroContent = title || description;
  const needsMinimalHeader = showBackButton && !hasHeroContent;
  const backButtonLabel = backLabel || intl.formatMessage({ id: 'common.back' });
  // A named destination can be a long parcel name, and buttons do not wrap by default, so
  // it would overflow the column instead. Applied to all three Back buttons below.
  // NEVER add minH here: StandardButton's own 44px is the touch floor.
  const backButtonWrap = { whiteSpace: 'normal', h: 'auto', py: 1.5, textAlign: 'left' } as const;

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
            <StandardButton
              variant="outline"
              leftIcon={<FaChevronLeft />}
              onClick={onBack}
              size="sm"
              {...backButtonWrap}>
              {backButtonLabel}
            </StandardButton>
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
                    <StandardButton
                      variant="outline"
                      leftIcon={<FaChevronLeft />}
                      onClick={onBack}
                      size="sm"
                      {...backButtonWrap}
                      mb={1}>
                      {backButtonLabel}
                    </StandardButton>
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

                  {/*
                    `rightAction` is a SLOT, and it used to be a bare <Box> — which is fine for
                    one button and silently wrong for two.

                    MEASURED 2026-08-25 on the Documents page, the only page that passes two:
                    "Subir" (94px) and "Exportar todos los registros (CSV)" (304px) rendered
                    with a **0px gap** — touching — and left-aligned, so their right edges
                    finished 210px apart against a page margin they were both supposed to meet.
                    Neither was a decision: the stack came from a `data-tour` <Box> around the
                    first button forcing a line break, and the ragged edge from block layout.

                    A column Stack with `align="stretch"` fixes both and is a no-op for the
                    seven pages that pass a single action: one child in an auto-width stack
                    renders exactly as it did before.
                  */}
                  {rightAction && (
                    <Stack spacing={3} align="stretch" w="full">
                      {rightAction}
                    </Stack>
                  )}
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
                        minH="44px"
                        {...backButtonWrap}>
                        {backButtonLabel}
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

                    {rightAction && (
                      // See the note on the mobile branch above.
                      <Stack spacing={3} align="stretch" flexShrink={0}>
                        {rightAction}
                      </Stack>
                    )}
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
   *
   * ⚠️ The mobile base is 0 ON PURPOSE, and a non-zero base is almost always a bug.
   * `assets/css/trazo-dashboard-styles.css` (protected) forces `.trazo-card { padding: 14px }`
   * on mobile and 22px from `md` up, with `!important`. That IS the card's inset. Anything
   * `px` adds here is a SECOND inset inside the first.
   *
   * MEASURED 2026-08-22 at 375px, the width `.claude/rules/frontend.md` names as the design
   * target, on the add-activity form — every contributing edge, walked from the input outward:
   *
   *     16  page gutter        (4 panel + 12 wrapper)
   *      1  card border
   *     14  card padding       ← forced, protected CSS
   *     16  CardBody px
   *      1  SectionBox border
   *     12  SectionBox padding
   *     ──
   *     60  each side  →  a text input got 255px of a 375px screen. 68%.
   *
   * 88px, a quarter of a phone, spent on nested chrome. Material (16dp), Apple HIG (16pt) and
   * Bootstrap (16px) all put the gutter at 16 and stop; the page gutter here was already right,
   * so every pixel over it came from stacking insets. After: 16 + 1 + 14 = 31, input 313 (83%).
   *
   * `md` keeps its inset: 22 + 16 = 38px reads as generous rather than wasteful once there is
   * room for it, and desktop was not the complaint.
   */
  padding?: string | number | object;
  /**
   * Bottom margin. Defaults to 0 since 2026-11-04: the PARENT owns the gap between cards
   * (a VStack/SimpleGrid `spacing`), never the card. The old default of 6 (24px) stacked on
   * top of every spaced parent: the farm profile once had 56px between cards, the production
   * page 40px above a notice and 16px below it, the OSP module list 40px instead of 16. A card
   * in a container with NO gap of its own passes `mb` explicitly; every such caller that
   * relied on the old default was measured and given it in the same change.
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
  padding = { base: 0, md: 4 },
  mb = 0,
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
      {/*
        `px={padding}` on the header is what makes a card's header and its body share one
        content edge. MEASURED on the parcel profile: the card container carries 22px (locked
        in trazo-dashboard-styles.css, a do-not-edit file), the body then added another 16px
        via `px`, and the header added none — so a button in a header slot ended at x=1045
        while a button in a body ended at x=1029, and a title sat 16px left of the content
        beneath it. Five right-aligned buttons on one page finished at three different x
        positions.
      */}
      {(title || headerAction) && (
        <CardHeader px={padding} pb={title && subtitle ? 2 : 4}>
          <Flex
            direction={{ base: 'column', md: 'row' }}
            justify="space-between"
            align={{ base: 'flex-start', md: 'center' }}
            gap={2}
            w="100%">
            {/*
              MEASURED 2026-08-23 at 768px on the parcel profile. `flexShrink={0}` here meant
              the title column kept its MAX-CONTENT width, so a long title stayed on one line
              and the header action was pushed out instead: the affidavit card's heading ran
              94 → 690 (596px, one line) and its "Add Affidavit" button landed at x=729 —
              outside a card ending at 698, and past the 768px viewport.

              Backwards. The title is the part that can reflow; the action is a fixed-size
              control that must not be squeezed. So the title column shrinks (`minW={0}`, which
              a flex item needs to go below its longest word) and the action does not.

              ⚠️ Applies from `md` only — at `base` this Flex is a column, where neither
              declaration does anything.
            */}
            <VStack align="start" spacing={1} minW={0} flex="1 1 auto">
              {/* The HStack appears ONLY when there is an icon to sit beside. Wrapping the
                  Heading unconditionally would have turned it into a flex item at all 34
                  existing call sites, and a flex item defaults to `min-width:auto` — it
                  refuses to shrink below its longest word, so a long title on a narrow card
                  could overflow instead of wrapping the way a block-level Heading does. No
                  icon, no wrapper, no change for anyone who was already fine. */}
              {title &&
                (titleIcon ? (
                  <HStack spacing={2} align="center" minW={0}>
                    <Box aria-hidden="true" display="flex" alignItems="center" flexShrink={0}>
                      {titleIcon}
                    </Box>
                    <Heading as="h3" size={{ base: 'sm', md: 'md' }} color="gray.700" minW={0}>
                      {title}
                    </Heading>
                  </HStack>
                ) : (
                  <Heading as="h3" size={{ base: 'sm', md: 'md' }} color="gray.700">
                    {title}
                  </Heading>
                ))}
              {subtitle && (
                <Text color="gray.500" fontSize={{ base: 'xs', md: 'sm' }}>
                  {subtitle}
                </Text>
              )}
            </VStack>
            <Box flexShrink={0} maxW="100%">
              {headerAction}
            </Box>
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
  /**
   * The furthest step the person has reached (`useFurthestStep`). When it is ahead of
   * `currentStep`, the NEXT step is clickable too and drawn as reachable (outlined). Only the next one:
   * the caller must route that click through its own Continue, which validates the current
   * step, and a step two ahead would skip the one in between, whose form is not mounted.
   */
  furthestStep?: number;
}

export const StandardStepper = ({
  steps,
  currentStep,
  completedSteps = [],
  onStepClick,
  allowStepClick = false,
  furthestStep
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
    // The step header always sits directly above its form, in all five callers, so it keeps
    // the 24px it had when it inherited StandardCard's old default (now 0, 2026-11-04).
    <StandardCard padding={{ base: 0, md: 6 }} mb={6}>
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
          {steps.map((step, index) => {
            // Only a step already behind the farmer is a link back. The current step goes
            // nowhere, and a later one would skip the validation that Continue runs.
            // A real <button>, not a clickable div: a div is invisible to the keyboard and to
            // a screen reader, so the shortcut existed for mouse users only.
            // Only the NEXT step can be reached forward, so only it is drawn as reachable. A
            // visited step two ahead that looked reachable and did nothing would be the same
            // dead affordance this exists to remove.
            const isReachableAhead =
              allowStepClick &&
              !!onStepClick &&
              furthestStep !== undefined &&
              index === currentStep + 1 &&
              index <= furthestStep;
            const isClickable =
              (allowStepClick && !!onStepClick && index < currentStep) || isReachableAhead;
            return (
              <React.Fragment key={index}>
                <VStack
                  {...(isClickable
                    ? {
                        as: 'button' as const,
                        type: 'button' as const,
                        onClick: () => onStepClick?.(index)
                      }
                    : {})}
                  aria-current={index === currentStep ? 'step' : undefined}
                  spacing={2}
                  align="center"
                  flex={manySteps ? '0 0 auto' : '1'}
                  minW={manySteps ? '80px' : 'auto'}
                  borderRadius="lg"
                  cursor={isClickable ? 'pointer' : 'default'}
                  _hover={isClickable ? { opacity: 0.8 } : {}}
                  _focusVisible={isClickable ? { outline: 'none', boxShadow: 'outline' } : {}}
                  transition="all 0.3s ease">
                  <Circle
                    as="span"
                    size={circleSize}
                    /*
                     * green.700 / green.800, not green.500 / green.400. The circle carries a
                     * WHITE step number or check, and white on green.500 is 2.78:1 — on
                     * green.400 it is worse. The current step is the DARKER of the two so
                     * "where am I" is not signalled by hue alone.
                     */
                    // A step already visited but ahead of here is outlined, not filled: it is
                    // reachable, but it has not been re-confirmed since the farmer came back.
                    bg={
                      completedSteps.includes(index) || index < currentStep
                        ? 'green.700'
                        : index === currentStep
                        ? 'green.800'
                        : isReachableAhead
                        ? 'white'
                        : 'gray.200'
                    }
                    border={isReachableAhead ? '2px solid' : undefined}
                    // green.600: a non-text boundary (the colour table); the number stays green.700.
                    borderColor={isReachableAhead ? 'green.600' : undefined}
                    color={
                      index <= currentStep ? 'white' : isReachableAhead ? 'green.700' : 'gray.600'
                    }
                    fontSize={{ base: 'sm', md: 'md' }}
                    fontWeight="bold"
                    boxShadow={index === currentStep ? 'lg' : 'md'}
                    transition="all 0.3s">
                    {completedSteps.includes(index) || index < currentStep ? (
                      <Icon as={step.icon || FaCheckCircle} boxSize={iconSize} />
                    ) : (
                      <Text as="span">{index + 1}</Text>
                    )}
                  </Circle>
                  <VStack as="span" spacing={1} align="center">
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
                      as="span"
                      fontSize={titleFontSize}
                      fontWeight="bold"
                      color={index <= currentStep || isReachableAhead ? 'green.700' : 'gray.600'}
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
                        as="span"
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
                      bg={index < currentStep ? 'green.700' : 'gray.200'}
                      borderRadius="full"
                      transition="all 0.3s"
                    />
                  </Flex>
                )}
              </React.Fragment>
            );
          })}
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

export interface StandardCheckboxListOption {
  value: string;
  label: ReactNode;
  /** A second line under the label (a size, a status). */
  detail?: ReactNode;
  /** Shown as visible text and the option cannot be ticked. Never a silent grey-out. */
  disabledReason?: ReactNode;
  /** Ticked and locked: the item the list is about (e.g. the parcel the page was opened from). */
  isFixed?: boolean;
}

interface StandardCheckboxListProps {
  /** Rendered as the fieldset's legend, so screen readers announce the group. */
  legend: ReactNode;
  options: StandardCheckboxListOption[];
  value: string[];
  onChange: (value: string[]) => void;
  /** When set, a "select all" control ticks every option that can be ticked. */
  selectAllLabel?: ReactNode;
}

/**
 * A list of checkboxes with a real legend, visible disabled reasons and an optional select-all.
 *
 * Chakra's `Checkbox` is themed (`theme/components/checkbox.js`), so this wraps it rather than
 * a bare `<input type="checkbox">`; the wrapper exists for the parts every multi-select needs and
 * a raw list forgets: the group name for assistive tech, a reason next to anything that cannot be
 * picked, and 44px rows on a phone.
 */
export const StandardCheckboxList = ({
  legend,
  options,
  value,
  onChange,
  selectAllLabel
}: StandardCheckboxListProps) => {
  const selectable = options.filter((o) => !o.disabledReason && !o.isFixed).map((o) => o.value);
  const fixed = options.filter((o) => o.isFixed).map((o) => o.value);
  const allSelected = selectable.length > 0 && selectable.every((v) => value.includes(v));
  const toggle = (optionValue: string, checked: boolean) =>
    onChange(checked ? [...value, optionValue] : value.filter((v) => v !== optionValue));

  return (
    <Box as="fieldset" border="none" p={0} m={0}>
      <Box as="legend" fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
        {legend}
      </Box>
      <VStack align="stretch" spacing={1}>
        {selectAllLabel && selectable.length > 1 && (
          <Checkbox
            minH="44px"
            isChecked={allSelected}
            isIndeterminate={!allSelected && selectable.some((v) => value.includes(v))}
            onChange={(e) => onChange(e.target.checked ? [...fixed, ...selectable] : fixed)}>
            <Text fontSize="sm" fontWeight="medium" color="gray.700">
              {selectAllLabel}
            </Text>
          </Checkbox>
        )}
        {options.map((option) => (
          <Box key={option.value} py={1}>
            {/* The fixed item is read-only, not disabled: Chakra dims a disabled label to 0.4
                opacity, below the 4.5 text floor, and this one is the item the list is about. */}
            <Checkbox
              minH="44px"
              alignItems="flex-start"
              isChecked={option.isFixed || value.includes(option.value)}
              isReadOnly={option.isFixed}
              isDisabled={!option.isFixed && !!option.disabledReason}
              onChange={(e) => toggle(option.value, e.target.checked)}>
              <Box>
                <Text fontSize="sm" color="gray.800">
                  {option.label}
                </Text>
                {option.detail && (
                  <Text fontSize="xs" color="gray.600">
                    {option.detail}
                  </Text>
                )}
              </Box>
            </Checkbox>
            {/* Outside the Checkbox so the disabled dimming does not reach it: the reason is the
                one thing a grower needs to read on an option they cannot pick. */}
            {option.disabledReason && (
              <Text fontSize="xs" color="gray.700" pl={7}>
                {option.disabledReason}
              </Text>
            )}
          </Box>
        ))}
      </VStack>
    </Box>
  );
};

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
            /*
             * green.700, not green.600. A tab label is TEXT and owes 4.5 — green.600 is the
             * palette's boundary green (4.12 on white, and MEASURED 3.77 on the page's own
             * #F4F5F7 ground, where these tabs actually sit). green.700 clears it at 4.94.
             */
            color={index === activeIndex ? 'green.700' : 'gray.600'}
            borderBottom="2px solid"
            // The underline is the non-text indicator of which tab is active, so it owes 3.0.
            // green.500 is 2.78 and fails even that; green.600 is the boundary green (4.12).
            borderColor={index === activeIndex ? 'green.600' : 'transparent'}
            mb="-1px"
            borderRadius="0"
            transition="color 0.2s, border-color 0.2s"
            _hover={{ color: 'green.700' }}
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
                  color="green.700"
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
  submitText,
  showCancel = false,
  onCancel
}: StandardFormProps) => {
  /*
   * ⚠️ `intl` was referenced in the Cancel button below and NEVER obtained — no `useIntl()`
   * call in this component. Rendering it with `showCancel` would have thrown
   * `ReferenceError: intl is not defined`. It survived because this component has ZERO call
   * sites, and because `tsconfig.json` sets `allowJs: false` while the typecheck gate is not
   * enforced, so its TS2552 sat in the masked pile.
   *
   * `submitText` also defaulted to the literal 'Save' and `loadingText` to 'Saving...', both
   * hard-coded English in a design-system component.
   */
  const intl = useIntl();
  return (
    <StandardCard title={title} subtitle={description}>
      <form onSubmit={onSubmit}>
        <VStack spacing={6} align="stretch">
          {children}

          <Divider />

          <HStack spacing={3} justify="flex-end">
            {showCancel && (
              <Button variant="outline" onClick={onCancel} isDisabled={isLoading}>
                {intl.formatMessage({ id: 'app.cancel' })}
              </Button>
            )}
            <Button
              type="submit"
              colorScheme="green"
              isLoading={isLoading}
              loadingText={intl.formatMessage({ id: 'app.saving' })}
              size="lg"
              px={8}>
              {submitText ?? intl.formatMessage({ id: 'app.save' })}
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
  /* LAYOUT ONLY, and deliberately an allowlist rather than `...rest`.
     Call sites have been writing `flex={2}` / `mt={4}` on this component since it was
     introduced and every one of them was silently dropped — 10 `flex` props on the chemical
     tab alone, which is why its "Product Amount / Unit" rows rendered as two equal columns
     instead of 2:1. A blanket rest-spread would have fixed those and broken others: several
     call sites carry `colorScheme` / `variant` / `size` meant for a Badge inside the label
     fragment, and FormControl feeds exactly those three into its field theming context, so
     forwarding them would restyle the control. Layout props cannot do that. */
  flex?: FormControlProps['flex'];
  mt?: FormControlProps['mt'];
  minW?: FormControlProps['minW'];
  maxW?: FormControlProps['maxW'];
  w?: FormControlProps['w'];
}

export const StandardField = ({
  label,
  required = false,
  error,
  helpText,
  children,
  flex,
  mt,
  minW,
  maxW,
  w
}: StandardFieldProps) => {
  return (
    <FormControl
      isRequired={required}
      isInvalid={!!error}
      flex={flex}
      mt={mt}
      minW={minW}
      maxW={maxW}
      w={w}>
      <FormLabel
        fontWeight="semibold"
        color="gray.700"
        fontSize="sm"
        mb={2}
        /*
         * Chakra's stock required indicator is `red.500` = 3.68:1 — the asterisk is the only
         * thing marking a field mandatory, so it is content and owes 4.5. red.700 is 4.98.
         * (No FormLabel entry exists in theme.ts, so Chakra's default is what ships.)
         */
        requiredIndicator={
          <Text as="span" color="red.700" ml={1} aria-hidden="true">
            *
          </Text>
        }>
        {label}
      </FormLabel>
      {children}
      {helpText && !error && (
        /*
         * gray.600, not gray.500. MEASURED: gray.500 is 4.61 on white — fine — but 4.41 on
         * gray.50 and 4.48 on green.50, so every helper line inside a tinted block was under
         * the floor (26 of them across the activity tabs). gray.600 clears all three grounds
         * (6.19 / 5.93 / 6.02) and stays visibly secondary to the gray.700 label.
         */
        <Text fontSize="xs" color="gray.600" mt={1}>
          {helpText}
        </Text>
      )}
      {error && (
        <Text fontSize="xs" color="red.700" mt={1}>
          {error}
        </Text>
      )}
    </FormControl>
  );
};

// Standard Input Components
/**
 * The one form-control treatment, shared by every input, select and textarea in the app.
 *
 * MEASURED 2026-08-20 against the sign-in form, which had hand-rolled these values on a
 * `Box as="input"` (23 controls across views/Authentication) and so never touched this file.
 * That outlier was the better design and is now the standard: 44px tall, 14px text, 12px
 * radius, filled. The old values here were 48px / **18px** / 8px — 18px input text in a
 * 20-field certifier record, which is what made the event form read as a different product.
 *
 * ⚠️ `_focus` alone is not enough. The theme registers no Input config (theme.ts composes
 * button/badge/alert/link/drawer/progress/checkbox only), so Chakra's stock input theme is
 * live and ships `_focusVisible: { borderColor: blue.500 }`. Both pseudo-selectors must be
 * set here or a keyboard focus paints BLUE.
 *
 * ⚠️ Focus border is `green.600` (4.12:1), not `green.500` (2.78:1) — the border swap is the
 * actual focus indicator and a non-text boundary owes 3.0. The halo around it is the
 * `field-focus` shadow token; see the comment on it in theme/styles.js for why a form control
 * may use a soft ring where a button may not.
 */
const CONTROL_FIELD_FOCUS = {
  borderColor: 'green.600',
  bg: 'white',
  boxShadow: 'field-focus'
} as const;

const CONTROL_FIELD_SX = {
  h: '44px',
  fontSize: 'sm',
  borderRadius: 'xl',
  borderColor: 'gray.200',
  bg: 'gray.50',
  _hover: { borderColor: 'gray.300' },
  _focus: CONTROL_FIELD_FOCUS,
  _focusVisible: CONTROL_FIELD_FOCUS
} as const;

/**
 * Wire a react-hook-form `register()` result to focus-tracking state without losing RHF's own
 * `onBlur`.
 *
 * Every auth screen wrote `{...register('email', …)} onFocus={…} onBlur={() => setFocused(null)}`,
 * and because the bare handler comes AFTER the spread it replaced RHF's `onBlur` outright — so
 * the field was never marked touched and `mode: 'onBlur' | 'onTouched'` validation silently did
 * nothing. Passing the registration through here keeps both.
 */
export const registerWithFocus = (
  field: { name: string; onBlur: (e: any) => void; [k: string]: any },
  setFocused: (name: string | null) => void
) => ({
  ...field,
  onFocus: () => setFocused(field.name),
  onBlur: (e: any) => {
    field.onBlur(e);
    setFocused(null);
  }
});

type StandardInputProps = InputProps & {
  /** Adornment rendered inside the field's leading gutter. Decorative — not clickable. */
  leftElement?: ReactNode;
  /** Adornment inside the trailing gutter; stays clickable (password toggles live here). */
  rightElement?: ReactNode;
};

export const StandardInput = React.forwardRef<HTMLInputElement, StandardInputProps>(
  ({ type, inputMode, leftElement, rightElement, ...props }, ref) => {
    const input = (
      <Input
        ref={ref}
        {...CONTROL_FIELD_SX}
        size="md"
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
    //
    // `rightElement` exists because the password fields need a show/hide toggle, and without
    // it every auth screen hand-rolled its own InputGroup — which is how those 23 controls
    // drifted off the design system in the first place. Unlike the left adornment it must
    // stay clickable, so it gets no `pointerEvents="none"`.
    if (!leftElement && !rightElement) return input;

    return (
      <InputGroup size="md">
        {leftElement && (
          <InputLeftElement pointerEvents="none" h="full">
            {leftElement}
          </InputLeftElement>
        )}
        {input}
        {rightElement && <InputRightElement h="full">{rightElement}</InputRightElement>}
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
          /*
           * Height / font / radius / fill / hover / focus all come from StandardInput. They
           * used to be repeated here and had drifted: the focus border was `green.500`
           * (2.78:1, under the 3.0 a focus indicator owes) and the ring was
           * `rgba(72,187,120,0.2)` — CHAKRA's green.400, not a token of ours.
           *
           * `pl` stays hand-set: InputGroup only auto-pads a child whose `type.id` is
           * "Input", and this child is StandardInput, so the magnifier gutter is ours to
           * reserve.
           */
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

export const StandardTextarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (props, ref) => (
    <Textarea
      ref={ref}
      {...CONTROL_FIELD_SX}
      // A textarea is the one control that must NOT take the shared 44px height — it grows.
      // It also has no `size` of its own here, which is why it used to render at Chakra's
      // default 16px next to 18px inputs.
      h="auto"
      minH="120px"
      resize="vertical"
      {...props}
    />
  )
);
StandardTextarea.displayName = 'StandardTextarea';

/**
 * Numeric field — the same control surface as StandardInput, with NumberInput's clamping,
 * precision and stepper behaviour kept intact.
 *
 * Chakra registers `NumberInput` as its own theme component; it does NOT inherit whatever an
 * `Input` theme entry says. That is why these fields were the last ones on the activity form
 * still rendering white / 6px / **Chakra's stock blue focus ring**, sitting directly beside
 * selects that had already been converted.
 *
 * `hideStepper` is for decimal measurement fields (0.01 acres, Brix) where the spinner is a
 * misclick hazard rather than a convenience — the field keeps its numeric semantics either way.
 */
export type StandardNumberInputProps = Omit<NumberInputProps, 'children'> & {
  placeholder?: string;
  /** Drop the spinner where 0.01 steps are a misclick hazard, not a convenience. */
  hideStepper?: boolean;
  /** Escape hatch onto the inner NumberInputField (e.g. an `id` for a label to point at). */
  fieldProps?: Record<string, unknown>;
};

export const StandardNumberInput = React.forwardRef<HTMLInputElement, StandardNumberInputProps>(
  ({ placeholder, hideStepper, fieldProps, ...props }, ref) => (
    <NumberInput w="full" {...props}>
      <NumberInputField
        ref={ref}
        placeholder={placeholder}
        {...CONTROL_FIELD_SX}
        // Chakra reserves the stepper gutter through its `size`, which our explicit height
        // overrides — so with the stepper shown the padding has to be stated here or a long
        // value runs underneath the arrows.
        pr={hideStepper ? 4 : 8}
        {...fieldProps}
      />
      {!hideStepper && (
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      )}
    </NumberInput>
  )
);
StandardNumberInput.displayName = 'StandardNumberInput';

/**
 * A numeric field that a decimal can actually be TYPED into.
 *
 * MEASURED 2026-08-25 with real keystrokes, before this existed:
 *
 *     farm "Total area (acres)"      typed 14.5 → stored 145      typed 86.9 → stored 869
 *     parcel "Area (acres)"          typed 14.5 → stored 145      (…then ×0.404686 → 58.68 ha
 *                                                                  instead of 5.87)
 *
 * Ten times the real area, silently, on the two fields that feed the certifier packet, the
 * per-acre carbon maths and the consumer page.
 *
 * TWO causes, and the obvious one is not the one that matters:
 *
 *  1. Chakra derives `precision` from `step`, and `step` defaults to 1 — so precision is 0 and
 *     the parser drops the ".".
 *  2. The real cause: the field is controlled by a NUMBER. Every keystroke round-trips through
 *     `onChange(number)` and returns as `value={86}`, so Chakra rewrites "86." back to "86"
 *     before a digit can follow it. The parcel field PROVES this on its own — it already had
 *     `precision={2}` and still turned 14.5 into 145.
 *
 * So the STRING is the state here and the number is derived from it. The parent keeps storing a
 * number; it just stops being what drives the input.
 *
 * ⚠️ Use this for measurements (acres, gallons, tons, pH). `StandardNumberInput` stays correct
 * for counts — plant counts, employee counts, years, intervals in whole days — where a decimal
 * would be wrong and the number-controlled round-trip is harmless.
 */
interface StandardDecimalInputProps
  extends Omit<StandardNumberInputProps, 'value' | 'onChange' | 'precision'> {
  /** The stored value. `undefined` renders an empty field rather than a hard 0. */
  value?: number;
  /** Called with the parsed number, or `undefined` when the field is cleared. */
  onChange: (next: number | undefined) => void;
  /** Decimal places kept on blur. Defaults to 2. */
  precision?: number;
}

export const StandardDecimalInput = ({
  value,
  onChange,
  precision = 2,
  ...props
}: StandardDecimalInputProps) => {
  const [text, setText] = React.useState(value == null ? '' : String(value));

  /*
   * Re-sync only when the parent's value and the text disagree NUMERICALLY. Comparing numbers
   * rather than strings is what lets "86." survive: it parses to 86, matches the parent, and so
   * is left alone instead of being rewritten to "86" mid-keystroke.
   */
  React.useEffect(() => {
    const asNumber = text.trim() === '' ? undefined : Number(text);
    const agrees =
      value === asNumber || (value == null && asNumber == null) || Number.isNaN(asNumber as number);
    if (!agrees) setText(value == null ? '' : String(value));
    // Intentionally keyed on `value` alone: including `text` would re-run on every keystroke
    // and undo the very thing this effect exists to avoid. (`react-hooks` is not configured in
    // this project, so there is no rule to disable — the note is the whole record.)
  }, [value]);

  return (
    <StandardNumberInput
      {...props}
      value={text}
      precision={precision}
      onChange={(valueAsString) => {
        setText(valueAsString);
        const parsed = parseFloat(valueAsString);
        onChange(valueAsString.trim() === '' || Number.isNaN(parsed) ? undefined : parsed);
      }}
    />
  );
};
StandardDecimalInput.displayName = 'StandardDecimalInput';

export const StandardSelect = React.forwardRef<HTMLSelectElement, SelectProps>((props, ref) => (
  <Select
    ref={ref}
    {...CONTROL_FIELD_SX}
    // Chakra's select theme hardcodes its own field background (`$bg -> colors.white`), so a
    // select does not inherit the filled treatment the way an input does — `bg` above is what
    // keeps it in line, and dropping it silently returns this one control to white.
    size="md"
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
        /*
         * NO `borderRadius` here on purpose. This used to force `lg` (8px), which overrode the
         * theme's own Button baseStyle (`theme/components/button.js` — 12px). The result was a
         * design-system button that disagreed with the design system: a raw Chakra <Button>
         * rendered 12px, a StandardButton 8px, and after the form-control unification every
         * input was 12px too — so the only 8px corners in the app were the ones this component
         * produced. Let the theme own it.
         */
        fontWeight="semibold"
        minH="44px"
        // The same halo the form controls use; `rgba(46,125,50,0.15)` was written out here as a
        // literal, which is exactly how it drifts from the one the fields use.
        _focus={{ boxShadow: 'field-focus' }}
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

interface StandardNoticeProps {
  /**
   * warning/info: a finding or a limit. success: a confirmation (green check). neutral: a QUESTION
   * that is neither good nor bad news, e.g. the one-time boundary-disclosure consent ask, where
   * a warning colour would push the farmer toward one answer (2026-11-04).
   */
  status: 'warning' | 'info' | 'success' | 'neutral';
  /** Overrides the status glyph (the disclosure ask keeps its map). The circle keeps its tone. */
  icon?: React.ElementType;
  /**
   * Shows a close button. `dismissLabel` is required with it: an icon-only button needs an
   * accessible name (the dashboard welcome banner's bare "✕" had none).
   */
  onDismiss?: () => void;
  dismissLabel?: string;
  /** "status" (default) is a polite live region. A question the reader answers is a labelled
   *  "region" instead, so a screen reader does not announce it as news. */
  role?: 'status' | 'region';
  'aria-label'?: string;
  title: ReactNode;
  /** The facts the reader acts on (which inputs, which records). Keep it to a few lines. */
  children?: ReactNode;
  /** The action that RESOLVES the notice. One primary button; it leads on every width. */
  action?: ReactNode;
  /** Explanation, citations, per-record reasons. Hidden until asked for. */
  details?: ReactNode;
  showDetailsLabel?: string;
  hideDetailsLabel?: string;
  mb?: ResponsiveValue<number | string>;
  'data-testid'?: string;
}

/**
 * A page-level notice that sits among cards: the same white surface, radius and shadow as
 * StandardCard, with the status carried by a tinted icon and the words, not by painting the
 * whole block.
 *
 * Why not StandardAlert. StandardAlert is the inline message inside a form or panel, and its
 * tinted ground with a 4px bar is right there. Dropped between the white cards of a profile
 * page, the same look became a second visual language: a cream slab with an orange edge,
 * louder than anything else on the page, for a finding that needs a decision, not an alarm
 * (reported 2026-11-04 with screenshots of the drift banner).
 *
 * Layout. Desktop: text left, actions right and vertically centred (details toggle, then the
 * primary). Phone: actions in ONE row under the text, primary left, toggle right. The toggle
 * is a text link with a chevron, never a padded button: as a ghost button it wrapped onto its
 * own line at 390px and kept a focus box after every tap.
 *
 * Contrast: the icon takes the same steps StandardAlert's icon does (ALERT_ACCENT_SHADE) on
 * the `.50` circle, which `theme/__tests__/alertContrast.test.ts` already measures.
 */
export const StandardNotice = ({
  status,
  title,
  children,
  action,
  details,
  showDetailsLabel,
  hideDetailsLabel,
  mb = 6,
  icon,
  onDismiss,
  dismissLabel,
  role = 'status',
  'aria-label': ariaLabel,
  'data-testid': testId
}: StandardNoticeProps) => {
  const { isOpen, onToggle } = useDisclosure();
  // neutral has no Alert palette: it is gray by definition (the StatusRow neutral tokens).
  const circleBg =
    status === 'neutral' ? STATUS_TONE_TOKENS.neutral.circle : `${ALERT_PALETTE[status]}.50`;
  const glyphColor =
    status === 'neutral'
      ? STATUS_TONE_TOKENS.neutral.glyph
      : `${ALERT_PALETTE[status]}.${ALERT_ACCENT_SHADE[status]}`;
  const icons = { warning: MdWarning, info: MdInfo, success: MdCheck, neutral: MdInfo };
  const surface = useColorModeValue('white', 'gray.800');
  const rule = useColorModeValue('gray.100', 'gray.700');

  const toggle = details ? (
    <Box
      as="button"
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      display="inline-flex"
      alignItems="center"
      gap={1}
      minH="44px"
      fontSize="sm"
      fontWeight="semibold"
      color="green.700"
      whiteSpace="nowrap"
      order={{ base: 2, md: 1 }}
      // Hover underline only where hover exists: on a phone `:hover` sticks after a tap, so
      // "Hide details" stayed underlined like a visited link.
      sx={{ '@media (hover: hover)': { '&:hover': { textDecoration: 'underline' } } }}
      _focusVisible={{ outline: '2px solid', outlineColor: 'green.700', outlineOffset: '2px' }}>
      {isOpen ? hideDetailsLabel : showDetailsLabel}
      <Icon
        as={FaChevronDown}
        boxSize={3}
        transition="transform 0.2s"
        transform={isOpen ? 'rotate(180deg)' : undefined}
        aria-hidden
      />
    </Box>
  ) : null;

  return (
    <Box
      w="full"
      bg={surface}
      borderRadius={{ base: 'xl', md: '2xl' }}
      boxShadow="0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      p={{ base: 4, md: 6 }}
      pr={onDismiss ? { base: 12, md: 14 } : undefined}
      position="relative"
      mb={mb}
      role={role}
      aria-label={ariaLabel}
      data-testid={testId}>
      {onDismiss && (
        // 44px touch target (CLAUDE.md), like the details toggle above; Chakra's `md` CloseButton
        // is 32px (review of app #259). The offsets shrink by the same 6px each way, so the glyph
        // stays where it was: centre 28px in on a phone, 32px from md.
        <CloseButton
          position="absolute"
          top={{ base: 1.5, md: 2.5 }}
          right={{ base: 1.5, md: 2.5 }}
          size="md"
          minW="44px"
          minH="44px"
          aria-label={dismissLabel}
          onClick={onDismiss}
        />
      )}
      <Flex
        direction={{ base: 'column', md: 'row' }}
        align={{ base: 'stretch', md: 'center' }}
        gap={{ base: 3, md: 6 }}>
        <HStack align="flex-start" spacing={3} flex={1} minW={0}>
          <Circle size={8} bg={circleBg} flexShrink={0}>
            <Icon as={icon ?? icons[status]} boxSize={4} color={glyphColor} aria-hidden />
          </Circle>
          <Box flex={1} minW={0} pt={1}>
            <Text fontWeight="semibold" fontSize={{ base: 'sm', md: 'md' }} color="gray.800">
              {title}
            </Text>
            {children && <Box mt={1}>{children}</Box>}
          </Box>
        </HStack>
        {(action || toggle) && (
          <Flex
            align="center"
            gap={4}
            flexShrink={0}
            justify={{ base: 'space-between', md: 'flex-end' }}>
            {toggle}
            {action && <Box order={{ base: 1, md: 2 }}>{action}</Box>}
          </Flex>
        )}
      </Flex>
      {details && (
        <Collapse in={isOpen} animateOpacity>
          <Box mt={4} pt={4} borderTopWidth="1px" borderColor={rule}>
            {details}
          </Box>
        </Collapse>
      )}
    </Box>
  );
};

export type StatusTone = 'crit' | 'warn' | 'neutral' | 'clear';

/**
 * One finding, check or status line inside a card: a small tinted circle carrying the glyph,
 * the title and its badge, the detail, and the action that resolves it. Put rows in a
 * `StatusList`, which draws the hairline between them.
 *
 * Why it exists (2026-11-04). The farm-home readiness card and the certifier review page both
 * drew every finding as its own gray box with a 1px border and a 4px coloured edge, so a card
 * of six findings was six tinted slabs. Oscar picked rows over boxes on rendered screenshots,
 * and rejected a SOLID red circle for `crit` (too loud beside the red badge): the circle stays
 * tinted for every tone.
 *
 * Tone is meaning, never decoration (frontend.md). `crit`/`warn` take STATUS_URGENCY_TOKENS;
 * a surface that must not read as a verdict (the certifier review page) uses `neutral` only,
 * and its guard bans the other two names. Urgency is never carried by colour alone: the glyph
 * SHAPE and the badge WORDS say it too.
 */
export const StatusRow = ({
  tone,
  icon,
  title,
  badge,
  children,
  action,
  testId
}: {
  tone: StatusTone;
  icon: React.ElementType;
  title?: ReactNode;
  badge?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  testId?: string;
}) => {
  // Painted FROM the exported object, so a guard that reads STATUS_TONE_TOKENS reads what the
  // row actually renders (the GUIDANCE_NOTE_TOKENS pattern).
  const circle = useColorModeValue(STATUS_TONE_TOKENS[tone].circle, 'whiteAlpha.200');
  const glyph = STATUS_TONE_TOKENS[tone].glyph;
  const titleColor = useColorModeValue('gray.700', 'gray.200');
  return (
    <HStack align="flex-start" spacing={3} py={3} data-testid={testId}>
      <Circle size={7} bg={circle} flexShrink={0}>
        <Icon as={icon} boxSize={3.5} color={glyph} aria-hidden />
      </Circle>
      <VStack align="start" spacing={1} flex={1} minW={0} pt={0.5}>
        {(title || badge) && (
          <HStack spacing={2} flexWrap="wrap">
            {title && (
              <Text fontSize="sm" fontWeight="semibold" color={titleColor}>
                {title}
              </Text>
            )}
            {badge}
          </HStack>
        )}
        {children}
        {action}
      </VStack>
    </HStack>
  );
};

/**
 * StatusRows split by a hairline. A CSS sibling border, so a row that renders null leaves no
 * rule. gray.200, not gray.100: the theme's gray.100 is #F8F9FA, the page background, so a
 * gray.100 rule on a white card is invisible.
 */
export const StatusList = ({ children, testId }: { children: ReactNode; testId?: string }) => {
  const rule = useColorModeValue('gray.200', 'gray.600');
  return (
    <Box data-testid={testId} sx={{ '& > * + *': { borderTopWidth: '1px', borderTopColor: rule } }}>
      {children}
    </Box>
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
 * Urgency tokens for a status ROW — a deadline, a readiness finding, an open-item count. Named
 * and exported for the same reason as GUIDANCE_NOTE_TOKENS above: a guard that reads the object
 * the component actually paints from is enforceable; one that restates hex codes is not.
 *
 * ⚠️ THESE ARE CHAKRA'S `orange`, NOT THE THEME'S `amber`, AND THAT IS DELIBERATE.
 *
 * The theme (`theme/styles.js`) defines green, gray, amber, red, blue — there is no `orange`
 * scale, so every `orange.*` in this codebase silently resolves to Chakra's default palette.
 * That normally makes `orange.*` a foreign-palette bug. For the WARNING semantic it is not,
 * because the theme's own amber CANNOT carry text: MEASURED on white, amber.500 #FF9800 is
 * 2.16:1, amber.700 2.70:1, and even the darkest step amber.900 #E65100 reaches only 3.79:1 —
 * still under the 4.5 small text owes. Amber is a FILL ramp. This is why `badge.js`'s
 * `variant="warning"` is itself built on `orange.100`/`orange.800`, and why frontend.md tells
 * you to reach for that variant instead of `colorScheme="amber"`. Swapping these to amber to
 * "fix the foreign palette" would REGRESS every one of them below AA — do not.
 *
 * Steps chosen by role, MEASURED on white:
 *   warn.text  orange.600 #C05621  4.57:1  ✓ 4.5 (orange.500 was 3.39 — the failure this fixes)
 *   warn.icon  orange.500 #DD6B20  3.39:1  ✓ 3.0 (orange.400 was 2.55 — under the glyph floor)
 *   warn.bar   orange.400 #ED8936  2.55:1  — decorative only; never the sole carrier of urgency
 *   crit.text  red.700    #D32F2F  4.98:1  ✓ 4.5 (red.500, the theme's own "Error color", is
 *                                                  3.68 and fails as small text)
 *   crit.icon  red.500    #F44336  3.68:1  ✓ 3.0
 *   crit.bar   red.400    #EF5350  3.49:1  — decorative only
 *
 * `bar` is exempt from the 3.0 floor ONLY while the row also states its urgency in words
 * ("in 1 day", "Needs attention"). A row that drops the text must not keep the bar as the
 * signal — that is colour-alone status, which frontend.md rules out.
 */
export const STATUS_URGENCY_TOKENS = {
  warn: { text: 'orange.600', icon: 'orange.500', bar: 'orange.400' },
  crit: { text: 'red.700', icon: 'red.500', bar: 'red.400' }
} as const;

/**
 * What StatusRow paints for each tone, exported so guards can read it (the GUIDANCE_NOTE_TOKENS
 * reasoning: a guard that restates colours proves nothing about the component).
 *
 * `neutral` must stay gray: the certifier review page renders every finding in it, and
 * `CertifierReview/__tests__/readinessIsNotAVerdict.test.tsx` asserts that, so repurposing
 * `neutral` for another caller cannot quietly put a verdict colour on that page.
 * Its circle is gray.200, not gray.100: gray.100 IS the page background (#F8F9FA), so on a page
 * with no card around the rows the circle vanished.
 */
export const STATUS_TONE_TOKENS = {
  crit: { circle: 'red.50', glyph: STATUS_URGENCY_TOKENS.crit.icon },
  warn: { circle: 'orange.50', glyph: STATUS_URGENCY_TOKENS.warn.icon },
  neutral: { circle: 'gray.200', glyph: 'gray.600' },
  clear: { circle: 'green.50', glyph: 'green.700' }
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
//
// `green.700`, NOT `green.500` (2026-08-31). A spinner is a graphical object that carries
// the whole meaning of the screen while it turns, so WCAG 1.4.11 asks it for 3.0:1 against
// its background. `green.500` #4CAF50 on white measures 2.78:1 — it fails the NON-TEXT floor,
// not just the 4.5 text one, which is why .claude/rules/frontend.md bans it for anything that
// has to be seen rather than merely tinted. Every page that hand-rolled its own loader in
// `green.700` was more accessible than the component it was supposed to be reusing.
//
// A loader also has to SAY something. A bare turning ring is announced as nothing at all by a
// screen reader, and "the page is blank" is indistinguishable from "the page is working" —
// so `label` is rendered as visible text inside a `role="status"` live region. It is optional
// only because a spinner sitting inside an already-labelled card is not owed a second label;
// prefer passing one.

interface StandardLoadingProps {
  /** Visible, announced status text, e.g. "Loading plans...". Always i18n. */
  label?: string;
}

// Full-page loading - use when loading replaces the entire page content
export const StandardPageLoading = ({ label }: StandardLoadingProps) => (
  <Flex
    direction="column"
    justify="center"
    align="center"
    py={20}
    minH="200px"
    gap={4}
    role="status"
    aria-live="polite">
    <CircularProgress isIndeterminate color="green.700" />
    {label && <Text color="gray.600">{label}</Text>}
  </Flex>
);

// Section/inline loading - use within cards, tables, sections
export const StandardSpinner = ({ label }: StandardLoadingProps) => (
  <Flex
    direction="column"
    justify="center"
    align="center"
    py={8}
    gap={3}
    role="status"
    aria-live="polite">
    <CircularProgress isIndeterminate color="green.700" size="40px" />
    {label && (
      <Text color="gray.600" fontSize="sm">
        {label}
      </Text>
    )}
  </Flex>
);

/**
 * The FAILED state — the third branch that a two-branch screen keeps forgetting.
 *
 * The shape this exists to kill (found on 15 screens, 2026-08-31):
 *
 *   const { data: rows = [], isLoading } = useGetThingsQuery();
 *   …
 *   {isLoading ? <StandardPageLoading /> : rows.length === 0 ? <EmptyState … /> : <List />}
 *
 * `isError` is never destructured, so a 500, a dropped connection and an expired session all
 * land in `rows = []` — and the screen states, as a fact about the user's account, that they
 * have no scans / no reviews / no documents / no certifications. On Select Your Plan the same
 * omission printed "You're already on the highest plan" while the plans endpoint was down.
 *
 * An empty state is a CLAIM about the data ("there is none"). Only a successful response
 * licenses it. When the request failed, the honest screen says so and offers the retry — which
 * is also the only place a retry belongs, never inside the loading branch.
 *
 * `onRetry` is optional but pass RTK Query's `refetch` whenever you have it; without a way
 * forward the operator's only recourse is a full page reload.
 */
interface StandardQueryErrorProps {
  /** What failed to load, already translated. Defaults to a generic line. */
  title?: string;
  description?: string;
  /** RTK Query's `refetch`. Omit only when there is genuinely nothing to retry. */
  onRetry?: () => void;
  /** `isFetching` — so the retry button spins on the RETRY, not on the original failure. */
  isRetrying?: boolean;
}

export const StandardQueryError = ({
  title,
  description,
  onRetry,
  isRetrying = false
}: StandardQueryErrorProps) => {
  const intl = useIntl();
  return (
    // No `role="alert"` here: Chakra's <Alert> already carries one, and a live region
    // nested inside a live region gets announced twice.
    <VStack spacing={4} py={8} w="full">
      <StandardAlert
        status="error"
        mb={0}
        title={title ?? intl.formatMessage({ id: 'app.queryErrorTitle' })}
        description={description ?? intl.formatMessage({ id: 'app.queryErrorDescription' })}
      />
      {onRetry && (
        <StandardButton
          variant="outline"
          size="sm"
          onClick={onRetry}
          isLoading={isRetrying}
          loadingText={intl.formatMessage({ id: 'app.queryErrorRetrying' })}>
          {intl.formatMessage({ id: 'app.queryErrorRetry' })}
        </StandardButton>
      )}
    </VStack>
  );
};

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

// `w="full"` (2026-11-04). Without it the section shrink-wrapped to its content, and every
// profile page wraps sections in a VStack, whose default `align="center"` then centred the
// shrunken box: the production page's cards sat ~50px in from each side on a phone and ~130px
// on desktop while the cards above them used the full column.
export const StandardSection = ({ title, description, action, children }: StandardSectionProps) => (
  <Box mb={8} w="full">
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

/**
 * A section-heading icon is decoration for the title beside it, so it gets ONE colour.
 * Nine headings on the chemical activity form carried six different hues — green.500,
 * green.600, orange.600, orange.500, blue.600, teal.500 — and four of them measured 2.78:1,
 * under the 3.0 a glyph owes. `green.700` is the palette's text-weight green (5.13:1).
 */
const SECTION_ICON_COLOR = 'green.700';

/**
 * The empty state every list, card and panel should use.
 *
 * MEASURED 2026-08-22: 33 files hand-rolled one, and no shared component existed — so every
 * empty state invented its own icon size, title size, padding and colour. Two of them sat in
 * the SAME card (`Parcel/components/TrackList`) and disagreed on all four: `boxSize` 12 vs 10,
 * title `lg` vs `md`, `py` 16 vs 8, icon `green.400` vs `blue.400`.
 *
 * Every glyph colour in use failed the 3.0:1 a non-text mark owes on white — green.400 2.01,
 * blue.400 2.65, Chakra orange.400 2.55, green.300 1.65 — because an empty state "feels" like
 * a place for a soft, friendly tint. It is not: it is the only thing on the screen.
 * `green.700` (5.13) is the same colour section headings already use.
 *
 * ⚠️ `action` belongs HERE, not in a card footer. In TrackList the CTA lived in a separate
 * `<Flex>` after `<CardBody>`, pinned to the bottom of a card with a hard-coded 700px height,
 * which MEASURED 179px of blank space between "No current production yet" and the button that
 * answers it. A call to action separated from its sentence by half a phone screen reads as an
 * unrelated control.
 */
interface StandardEmptyStateProps {
  icon: IconType;
  title: string;
  description?: string;
  /** The one thing to do next. Pass a StandardButton. */
  action?: ReactNode;
  /**
   * `md` (default) is a card's primary empty state. `sm` is for a secondary one — a nested
   * panel, or a second empty state in a card that already has a bigger one.
   */
  size?: 'sm' | 'md';
  /*
   * ⛔ There is no `fill` prop, and the one that was here on 2026-08-22 is gone because it
   * was INERT.
   *
   * It set `flex: 1` intending to centre the empty state in a stretched grid item. MEASURED on
   * TrackList: the chain above it is `CardBody` (computed `flex: 0 1 auto`) → a `Box` with
   * `maxH={{ base: '400px', md: '450px' }}` → a content-sized `Flex`. Nothing in that chain
   * grows, so there was never any free space to claim, and the `maxH` meant the empty state
   * could not have exceeded 400px even if there had been.
   *
   * Making it real means flexing that whole chain and dropping the `maxH` scroll box — a
   * layout change that has to be watched in a browser, not reasoned about. Until then a prop
   * that quietly does nothing is worse than no prop: it reads as "handled".
   */
}

export const StandardEmptyState = ({
  icon,
  title,
  description,
  action,
  size = 'md'
}: StandardEmptyStateProps) => {
  const iconSize = size === 'md' ? 10 : 8;
  return (
    <VStack
      spacing={size === 'md' ? 5 : 4}
      py={size === 'md' ? 10 : 6}
      px={4}
      align="center"
      justify="center"
      textAlign="center"
      w="100%">
      <Icon as={icon} color={SECTION_ICON_COLOR} boxSize={iconSize} aria-hidden="true" />
      <VStack spacing={2} maxW="360px">
        <Text fontSize={size === 'md' ? 'lg' : 'md'} fontWeight="bold" color="gray.700">
          {title}
        </Text>
        {description && (
          <Text fontSize="sm" color="gray.600" lineHeight="1.5">
            {description}
          </Text>
        )}
      </VStack>
      {action}
    </VStack>
  );
};

interface SectionHeaderProps {
  icon: IconType;
  /** Escape hatch; leave unset. Passing a hue here is what produced the six-colour spread. */
  iconColor?: string;
  title: string;
  badge?: string;
  badgeTone?: SectionBadgeTone;
  description?: string;
}

/**
 * The section badge has exactly one appearance, and callers cannot change it.
 *
 * It used to take a `badgeColorScheme`, and the same badge — one i18n string,
 * `events.section.badge.certifierRecord` — shipped in FIVE colours on one activity form
 * (green, orange, red, teal, and gray from CollapsibleSection's default). Callers read the
 * prop as decoration; a farmer reads two colours as two meanings.
 *
 * ⚠️ `textTransform="none"` is load-bearing. The theme's `brand` badge variant applies
 * `capitalize` on the green palette only (theme/components/badge.js), which is why the green
 * pills rendered "Certifier Record" and the tinted ones "Certifier record" from the SAME
 * string. Worse, `capitalize` hits every word, so es-419's "Registro para el certificador"
 * came out title-cased — which is not correct Spanish. Render the string as authored.
 */
export type SectionBadgeTone = 'certifier' | 'optional';

const SectionBadge = ({
  tone = 'certifier',
  children,
  ...props
}: {
  tone?: SectionBadgeTone;
  children: ReactNode;
  [k: string]: any;
}) =>
  /*
   * TWO tones, because two things were being said and seven colours were being used to say
   * them. "Certifier record" (4 different i18n keys, all emitting that same string) marks a
   * section an inspector will read; "Optional — carbon only" marks one they will not. Flatten
   * those to a single colour and an optional section starts wearing the required mark.
   * Everything past that distinction was decoration.
   */
  tone === 'optional' ? (
    <Badge variant="neutral" fontSize="xs" flexShrink={0} {...props}>
      {children}
    </Badge>
  ) : (
    <Badge colorScheme="green" textTransform="none" fontSize="xs" flexShrink={0} {...props}>
      {children}
    </Badge>
  );

export const SectionHeader = ({
  icon,
  iconColor,
  title,
  badge,
  badgeTone,
  description
}: SectionHeaderProps) => (
  <Box mb={4}>
    <Flex
      direction={{ base: badge ? 'column' : 'row', smd: 'row' }}
      justify={{ base: 'flex-start', smd: 'space-between' }}
      align={{ base: 'flex-start', smd: 'center' }}
      gap={2}
      mb={description ? 2 : 0}>
      <HStack spacing={2}>
        <Icon as={icon} color={iconColor ?? SECTION_ICON_COLOR} boxSize={5} flexShrink={0} />
        <Text fontSize="md" fontWeight="bold" color="gray.700">
          {title}
        </Text>
      </HStack>
      {/*
       * One badge node, moved by `order` — not two nodes toggled by `display`. The old markup
       * rendered the badge twice (mobile copy + desktop copy), so every section shipped a
       * hidden duplicate and any edit had to be made in both places or they drifted.
       */}
      {badge && (
        <SectionBadge tone={badgeTone} order={{ base: -1, smd: 1 }}>
          {badge}
        </SectionBadge>
      )}
    </Flex>
    {description && (
      <Text fontSize="sm" color="gray.600">
        {description}
      </Text>
    )}
  </Box>
);

/**
 * One section card, one appearance. There is no `variant` and no tint.
 *
 * `variant="highlighted"` painted the card `green.50` / `green.200`, and it was applied by no
 * stated rule — on one activity form "Application Rate & Coverage" and the CA DPR permit were
 * tinted while the equally-mandatory "Chemical Application Details" and "Environmental
 * Context" were white, giving three backgrounds among sibling cards in a single scroll.
 *
 * The tint was also not free: `gray.500` helper text measures 4.61:1 on white but **4.48 on
 * green.50 and 4.41 on gray.50** — so tinting a card quietly pushed 14 of its own helper lines
 * under the 4.5 floor. A background that fails the text sitting on it is not an emphasis tool.
 */
interface SectionBoxProps {
  children: ReactNode;
  borderColor?: string;
  /*
   * ⛔ No `bg`. It existed, and MEASURED 2026-08-22 not one of the 68 call sites passed it —
   * every SectionBox in the app was a white box on a white card. Once the mobile treatment
   * went flush (no border, no horizontal inset) the prop stopped being merely unused and
   * became a trap: a tinted fill with no horizontal padding runs to the card's edge with the
   * text sitting on it. If a tinted section is ever wanted, add it back deliberately WITH its
   * mobile case — a tint cannot bleed the way white can.
   */
}

/**
 * A grouped block of fields inside a card.
 *
 * ⚠️ On mobile it is FLUSH — no border, no inset — and that is the design, not an oversight.
 *
 * MEASURED 2026-08-22 at 375px on the add-activity form: this box was a WHITE box on a WHITE
 * card (checked all 68 call sites — not one passed a `bg`), so its 1px border was the only
 * thing distinguishing it, and it charged 12px each side for the privilege. It was the third
 * inset in a row:
 *
 *     16 page gutter + 1 card border + 14 card padding
 *        + 16 CardBody px + 1 this border + 12 this padding  =  60px each side
 *
 * — which left a text input 255px of a 375px screen.
 *
 * Nothing is lost by dropping it there. Every one of these blocks leads with a `SectionHeader`
 * carrying an icon, a title and usually a `SectionBadge` — the grouping is stated in words
 * before the border ever gets a chance to imply it, and the parent stack's gap keeps the
 * blocks apart. Dropping a nested container on a narrow screen and letting the heading carry
 * the group is what iOS grouped lists and Material both do; a border 15px inside another
 * border is a desktop affordance that does not earn 24px of a phone's width.
 *
 * ⚠️ Only the HORIZONTAL axis changes. `py` stays at its old value on mobile ON PURPOSE: with
 * the border gone, whitespace is the only thing left separating one section from the next, and
 * these forms space their FIELDS 20px apart (`spacing={{ base: 5 }}`) while the parent stack's
 * gap between sections is the same order — MEASURED 20px on step 1, 24px on step 2. Zeroing
 * `py` too would have made section-to-section spacing indistinguishable from field-to-field
 * spacing — six sections reading as one long list — at the exact moment the border that used
 * to distinguish them was removed. Keeping `py={3}` holds content-to-content separation at
 * 12 + gap + 12, i.e. 44-48px: unchanged from before this edit.
 *
 * From `md` up the border and inset come back — there is room for them, and desktop was never
 * the complaint.
 *
 * ⚠️ `mb` here is INERT at every call site that sits in a Stack. `theme/styles.js` forces
 * `.chakra-stack > *:not(.chakra-divider) { margin: 0 !important }`, and MEASURED on this
 * form the computed margin-bottom is 0px — spacing comes from the stack's own gap. It is kept
 * only for the call sites that are NOT stack children.
 */
export const SectionBox = ({ children, borderColor }: SectionBoxProps) => {
  return (
    <Box
      mb={6}
      px={{ base: 0, md: 4 }}
      py={{ base: 3, md: 4 }}
      borderWidth={{ base: 0, md: '1px' }}
      borderStyle="solid"
      borderColor={borderColor || 'gray.200'}
      borderRadius={{ base: 0, md: 'lg' }}
      bg="white">
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
  badgeTone?: SectionBadgeTone;
  description?: string;
  children: ReactNode;
  defaultIsOpen?: boolean;
}

/**
 * ⚠️ Body text here is `gray.600`, not `gray.500`. This section's header sits on `gray.50`,
 * where gray.500 measures 4.41:1 — under the floor. Same reason as StandardField's helper text.
 */
export const CollapsibleSection = ({
  title,
  icon,
  iconColor,
  badge,
  badgeTone,
  description,
  children,
  defaultIsOpen = false
}: CollapsibleSectionProps) => {
  const intl = useIntl();
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen });
  // No tint and no variant — see the note on SectionBox.
  const borderColor = 'gray.200';
  const bgColor = 'white';
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
        _hover={{ bg: 'gray.100' }}
        transition="all 0.2s"
        /* A disclosure control must SAY it is a disclosure. This was a bare <button> whose
           only expanded/collapsed signal was the word "Show" and a chevron — both visual. */
        aria-expanded={isOpen}>
        <Flex justify="space-between" align="center" gap={2}>
          {/*
            `minW={0}` + `flexWrap` on the left, `flexShrink={0}` on the right.

            A flex item defaults to `min-width: auto`, which refuses to shrink below its
            longest word. Neither side declared anything, so on a narrow screen the browser
            crushed whichever side it could — MEASURED on the planting form at 375px, the
            title "Fuel Consumption & Equipment Data" wrapped to three lines and the word
            "Show" was squeezed into a one-character-per-line column reading S / h / o / w.
          */}
          <HStack spacing={2} minW={0} flex="1" flexWrap="wrap">
            {icon && (
              <Icon as={icon} color={iconColor ?? SECTION_ICON_COLOR} boxSize={5} flexShrink={0} />
            )}
            <Text fontSize="md" fontWeight="bold" color="gray.700" minW={0}>
              {title}
            </Text>
            {badge && <SectionBadge tone={badgeTone}>{badge}</SectionBadge>}
          </HStack>
          <HStack spacing={2} flexShrink={0}>
            {/*
              Hidden below `smd` (480px) rather than shrunk. The chevron already carries the
              affordance, `aria-expanded` carries it for assistive tech, and on a phone this
              word is the least valuable thing competing for the row. Was also hard-coded
              English in a DESIGN-SYSTEM component, so it shipped untranslated everywhere the
              component is used.
            */}
            <Text
              fontSize="sm"
              color="gray.600"
              whiteSpace="nowrap"
              display={{ base: 'none', smd: 'inline' }}>
              {isOpen
                ? intl.formatMessage({ id: 'app.hide' })
                : intl.formatMessage({ id: 'app.show' })}
            </Text>
            <Icon
              as={isOpen ? FaChevronUp : FaChevronDown}
              color="gray.600"
              boxSize={4}
              flexShrink={0}
              transition="transform 0.2s"
            />
          </HStack>
        </Flex>
        {description && !isOpen && (
          <Text fontSize="sm" color="gray.600" mt={2} textAlign="left">
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
          <Spinner size="xs" color="green.700" />
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

/**
 * Menu primitives — ONE menu language.
 *
 * The app had three. The sort/filter menus render an uppercase eyebrow, a divider, and items
 * that go green.700/600-weight when selected. The activity kebab ran its labels through
 * `.toUpperCase()` **in JavaScript** — uppercasing the translated string in code rather than
 * in CSS — and painted Delete `red.500` (3.68:1, under the 4.5 a 14px label owes). A third
 * kebab used sentence case with a leading icon on every row.
 *
 * These encode the sort/filter pattern, because it is the one that already reads best, and
 * add the two rules the others were missing: a label renders as authored, and a destructive
 * item is `red.700` (4.98:1).
 */
export const StandardMenuHeader = ({ children }: { children: ReactNode }) => (
  <>
    <Text px={3} py={1} fontSize="xs" fontWeight="600" color="gray.500" textTransform="uppercase">
      {children}
    </Text>
    <MenuDivider />
  </>
);

export const StandardMenuItem = ({
  icon,
  isSelected = false,
  isDestructive = false,
  children,
  ...props
}: {
  icon?: ReactNode;
  isSelected?: boolean;
  isDestructive?: boolean;
  children: ReactNode;
  [k: string]: any;
}) => (
  <MenuItem
    fontSize="sm"
    py={2}
    icon={icon as any}
    // Selection is weight AND colour, never colour alone.
    fontWeight={isSelected ? '600' : '400'}
    color={isDestructive ? 'red.700' : isSelected ? 'green.700' : 'gray.700'}
    {...props}>
    {children}
  </MenuItem>
);
