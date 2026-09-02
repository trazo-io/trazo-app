/**
 * Asks a farm, once, whether its field boundary should be public.
 *
 * WHY IT EXISTS
 * -------------
 * `Parcel.location_disclosure_level` decides what the consumer page may show — the full
 * polygon (`exact`), a ~1 km centre with no boundary (`approximate`), or nothing (`hidden`).
 * New parcels default to `approximate` and the marketing site describes the level as the
 * farmer's control.
 *
 * Migration 0013 wrote `exact` onto every parcel that already existed, because those parcels
 * were already publishing boundaries and narrowing that silently would have changed what farms
 * had agreed to show. But the setting was never surfaced anywhere in the producer app — so
 * those farms have been publishing a field boundary under a value they were never shown and
 * could not reach. Measured 2026-08-31 on a development database: 33 parcels at `exact`, zero
 * of them chosen by anyone.
 *
 * This is the control that was missing. It appears only for a parcel that is publishing a
 * boundary AND has never been asked (`location_disclosure_choice_made === false`), so a farm
 * that deliberately wants its boundary public is asked exactly once and never again.
 *
 * WHY THE WARNING IS SPECIFIC
 * ---------------------------
 * A boundary alone is close to harmless. The consumer page carries the boundary, a satellite
 * view, the harvest date and the lot quantity on one screen — together those read as an
 * operating schedule rather than a provenance claim, and many parcels contain the family
 * residence. The copy names that combination rather than gesturing at "privacy", because the
 * farmer is the only person who can weigh it for their own operation.
 *
 * WHAT IT DOES NOT DO
 * -------------------
 * Nothing here deletes the boundary. The parcel application asks for those vertices, the
 * dashboard draws them and the parcel form edits them — all read `Parcel.polygon` directly.
 * Only the consumer page consults the disclosure level, and the certifier packet is unaffected.
 * The copy says so, because a farmer who fears losing work they were asked to enter will
 * default to leaving it public.
 */

import React from 'react';
import { Box, Button, Flex, HStack, Icon, Text, useToast } from '@chakra-ui/react';
import { MdOutlineMap } from 'react-icons/md';
import { useIntl } from 'react-intl';

import { GUIDANCE_NOTE_TOKENS } from 'components/Design/StandardComponents';
import { useSetParcelLocationDisclosureMutation } from 'store/api/productApi';

interface LocationDisclosurePromptProps {
  parcelId: number | string;
  /** `location_disclosure_level` from the parcel payload. */
  level?: string | null;
  /** `location_disclosure_choice_made` — false means the value was inherited, not chosen. */
  choiceMade?: boolean | null;
  /** Whether a polygon actually exists. A parcel set to `exact` with none publishes nothing. */
  hasBoundary?: boolean | null;
}

export const LocationDisclosurePrompt: React.FC<LocationDisclosurePromptProps> = ({
  parcelId,
  level,
  choiceMade,
  hasBoundary
}) => {
  const intl = useIntl();
  const toast = useToast();
  const [setDisclosure, { isLoading }] = useSetParcelLocationDisclosureMutation();
  // WHICH choice is in flight, not merely THAT one is. `isLoading` is one flag shared by one
  // mutation hook, so binding both buttons to it spun both spinners at once and the farmer
  // could not tell which of two opposite privacy decisions they had just committed to.
  const [pending, setPending] = React.useState<'exact' | 'approximate' | null>(null);

  // Three conditions, all required. `exact` is the only level that publishes a boundary;
  // `choiceMade` separates an inherited value from a decision; `hasBoundary` stops the prompt
  // warning a parcel about a boundary it does not have.
  if (level !== 'exact' || choiceMade === true || !hasBoundary) return null;

  const choose = async (next: 'exact' | 'approximate') => {
    setPending(next);
    try {
      await setDisclosure({ parcelId, level: next }).unwrap();
      toast({
        status: 'success',
        duration: 5000,
        isClosable: true,
        title: intl.formatMessage({
          id: next === 'exact' ? 'parcel.disclosure.keptToast' : 'parcel.disclosure.narrowedToast'
        })
      });
    } catch {
      toast({
        status: 'error',
        duration: 6000,
        isClosable: true,
        title: intl.formatMessage({ id: 'parcel.disclosure.failed' })
      });
    } finally {
      setPending(null);
    }
  };

  return (
    <Box
      /*
        WHITE ON A BORDER, NOT `GUIDANCE_NOTE_TOKENS.ground`.
        MEASURED 2026-09-01: the note's ground is `gray.50` #FAFAFA and this page's canvas is
        the app body's `gray.100` #F8F9FA (`theme/styles.js`) — 1.005:1, i.e. no edge at all.
        `GuidanceNote`'s own docstring calls that ground "a tinted aside over the page canvas";
        that holds on a white surface, not on this one. With no visible boundary the copy ran
        straight into the page title below and read as missing padding even though `py={4}` was
        already there. Every other block on this page is a `StandardCard`: white on `gray.200`.
        This matches them rather than inventing a fifth surface.

        Longhand border props on purpose — `border` / `borderLeft` are shorthands and their
        relative order decides which colour survives. Longhands cannot reset each other.
      */
      bg="white"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="gray.200"
      borderLeftWidth="4px"
      borderLeftColor={GUIDANCE_NOTE_TOKENS.bar}
      borderRadius="md"
      px={4}
      py={4}
      /* This page's blocks own the space beneath them — the title `Flex` below carries the same
         pair. Without it the gap to the page title was the heading's line leading (13px) and
         nothing else. */
      mb={{ base: '16px', md: '24px' }}
      role="region"
      aria-label={intl.formatMessage({ id: 'parcel.disclosure.title' })}>
      <HStack align="flex-start" spacing={3}>
        <Icon
          as={MdOutlineMap}
          color={GUIDANCE_NOTE_TOKENS.icon}
          boxSize={5}
          mt="2px"
          flexShrink={0}
          aria-hidden
        />
        {/*
          Copy left, the two answers right, and they fall onto their own line when they no
          longer fit beside it — NO BREAKPOINT. The wrap point cannot be written as one, because
          what is left for this card is the window minus the 321px sidebar and the page gutters;
          a `lg`/`xl` rule would be a guess about furniture outside the component. `flex-wrap`
          decides on the flex BASIS before any shrinking, so `flex="1 1 44ch"` on the prose means
          the buttons drop to the next line while the column is still readable rather than the
          column being squeezed to nothing to keep them alongside. Measured: they ride beside the
          copy from roughly a 1200px window up, and stack below it under that — which is exactly
          the mobile layout that was already there.

          `justify="space-between"` is what pushes them to the right edge; on a wrapped line the
          single item falls back to flex-start, so the stacked layout stays left-aligned.
        */}
        <Flex flex={1} wrap="wrap" align="center" justify="space-between" gap={4}>
          {/* The prose is capped, the buttons are not. This page is hand-rolled and does not
              use `StandardPage`, so nothing caps its content: at 1792px the paragraphs ran the
              full 1320px column — ~180 characters a line at `fontSize="sm"`. A one-time consent
              ask is the last copy on the page that should be hard to read. */}
          <Box flex="1 1 44ch" maxW="72ch">
            <Text fontWeight="semibold" fontSize="sm" color={GUIDANCE_NOTE_TOKENS.text}>
              {intl.formatMessage({ id: 'parcel.disclosure.title' })}
            </Text>
            <Text fontSize="sm" color={GUIDANCE_NOTE_TOKENS.text} mt={1}>
              {intl.formatMessage({ id: 'parcel.disclosure.body' })}
            </Text>
            <Text fontSize="sm" color={GUIDANCE_NOTE_TOKENS.text} mt={2}>
              {intl.formatMessage({ id: 'parcel.disclosure.reassurance' })}
            </Text>
          </Box>
          {/* Neither button is styled as the recommended one. Approximate is the safer default
              and the product's default for new parcels, but which risk a farm is willing to
              carry on its own land is not a call this dialog should nudge. */}
          {/* `flexShrink={0}` keeps the pair at its natural width beside the copy, so the
              prose column absorbs the squeeze rather than the two answers. `maxW="100%"` is what
              lets them still wrap onto two rows once they are on their OWN line: without it a
              non-shrinking box sits at max-content, its inner `flexWrap` never sees a constraint,
              and at 375px the second button was clipped by the card. MEASURED. */}
          <HStack spacing={3} flexWrap="wrap" flexShrink={0} maxW="100%">
            <Button
              size="sm"
              variant="outline"
              minH="44px"
              isLoading={pending === 'approximate'}
              isDisabled={isLoading && pending !== 'approximate'}
              onClick={() => choose('approximate')}>
              {intl.formatMessage({ id: 'parcel.disclosure.narrow' })}
            </Button>
            <Button
              size="sm"
              variant="outline"
              minH="44px"
              isLoading={pending === 'exact'}
              isDisabled={isLoading && pending !== 'exact'}
              onClick={() => choose('exact')}>
              {intl.formatMessage({ id: 'parcel.disclosure.keep' })}
            </Button>
          </HStack>
        </Flex>
      </HStack>
    </Box>
  );
};

export default LocationDisclosurePrompt;
