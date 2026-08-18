import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  Box,
  Text,
  Button,
  HStack,
  Circle,
  Flex,
  IconButton,
  ChakraProvider
} from '@chakra-ui/react';
import { FiArrowRight, FiArrowLeft, FiX } from 'react-icons/fi';
import { FormattedMessage, IntlProvider } from 'react-intl';
import theme from '../../theme/theme';

// Cache for React root to avoid memory leaks
let currentRoot: Root | null = null;

interface TooltipMeta {
  stepIndex: number;
  totalSteps: number;
  titleKey: string;
  contentKey: string;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  locale: string;
  messages: Record<string, string>;
}

/**
 * Renders the Trazo-styled tooltip into a Driver.js popover DOM element.
 * Uses the description element as the render target to preserve the arrow
 * element that Driver.js needs for positioning calculations.
 */
export function renderTrazoTooltip(
  popover: { wrapper: HTMLElement; description: HTMLElement },
  meta: TooltipMeta
) {
  // Use Driver.js's description element as our React render target.
  // This preserves the arrow element for correct positioning.
  const container = popover.description;
  container.textContent = '';

  // Set explicit dimensions BEFORE React renders so Driver.js can
  // calculate the correct popover position on the initial pass.
  // Without this, the container is 0px tall → wrong position calculation.
  container.style.minHeight = '220px';
  container.style.width = '100%';

  // Cleanup previous root
  if (currentRoot) {
    currentRoot.unmount();
    currentRoot = null;
  }

  currentRoot = createRoot(container);
  currentRoot.render(
    <ChakraProvider theme={theme}>
      <IntlProvider locale={meta.locale} messages={meta.messages} defaultLocale="en-US">
        <TrazoTooltipContent {...meta} />
      </IntlProvider>
    </ChakraProvider>
  );
}

/** Cleanup React root on tour destroy */
export function cleanupTooltipRoot() {
  if (currentRoot) {
    currentRoot.unmount();
    currentRoot = null;
  }
}

/**
 * The actual Chakra UI tooltip content — same design as before,
 * now rendered inside a Driver.js popover via createRoot.
 */
const TrazoTooltipContent: React.FC<TooltipMeta> = ({
  stepIndex,
  totalSteps,
  titleKey,
  contentKey,
  onNext,
  onPrev,
  onClose
}) => {
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === totalSteps - 1;

  return (
    <Box p={5}>
      {/* Close button */}
      <Flex justify="flex-end" mb={-2} mt={-2} mr={-2}>
        <IconButton
          aria-label="Close"
          icon={<FiX />}
          variant="ghost"
          size="sm"
          color="gray.600"
          minH="44px"
          minW="44px"
          onClick={onClose}
        />
      </Flex>

      {/* Title */}
      {titleKey && (
        <Text fontSize="md" fontWeight="700" color="gray.900" mb={2}>
          <FormattedMessage id={titleKey} defaultMessage=" " />
        </Text>
      )}

      {/* Content */}
      {contentKey && (
        <Text fontSize="sm" color="gray.600" lineHeight="tall" mb={4}>
          <FormattedMessage id={contentKey} defaultMessage=" " />
        </Text>
      )}

      {/* Progress dots */}
      {totalSteps > 1 && (
        <HStack spacing={1.5} justify="center" mb={4}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <Circle
              key={i}
              size="6px"
              bg={i <= stepIndex ? 'green.500' : 'gray.200'}
              transition="background 0.2s"
            />
          ))}
        </HStack>
      )}

      {/* Navigation buttons */}
      <Flex justify="space-between" align="center" gap={2}>
        {/* Skip / Back */}
        {isFirstStep ? (
          <Button
            variant="ghost"
            size="sm"
            color="gray.600"
            minH="44px"
            fontWeight="500"
            onClick={onClose}>
            <FormattedMessage id="tour.common.skip" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            color="gray.600"
            minH="44px"
            leftIcon={<FiArrowLeft />}
            fontWeight="500"
            onClick={onPrev}>
            <FormattedMessage id="tour.common.previous" />
          </Button>
        )}

        {/* Step counter */}
        <Text fontSize="xs" color="gray.600" flexShrink={0}>
          <FormattedMessage
            id="tour.common.stepOf"
            values={{ current: stepIndex + 1, total: totalSteps }}
          />
        </Text>

        {/* Next / Finish */}
        <Button
          bg="green.700"
          color="white"
          size="sm"
          minH="44px"
          px={4}
          borderRadius="lg"
          fontWeight="600"
          rightIcon={!isLastStep ? <FiArrowRight /> : undefined}
          _hover={{ bg: 'green.600' }}
          onClick={onNext}>
          {isLastStep ? (
            <FormattedMessage id="tour.common.finish" />
          ) : (
            <FormattedMessage id="tour.common.next" />
          )}
        </Button>
      </Flex>
    </Box>
  );
};

export default TrazoTooltipContent;
