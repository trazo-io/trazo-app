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
import { Box, HStack, Text, useToast } from '@chakra-ui/react';
import { MdOutlineMap } from 'react-icons/md';
import { useIntl } from 'react-intl';

import { StandardButton, StandardNotice } from 'components/Design/StandardComponents';
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

  // A StandardNotice in the NEUTRAL tone (2026-11-04). It was a hand-rolled white box with a
  // 4px gray edge: the edged look retired across the app. Neutral, not warning: this is a
  // question only the farmer can weigh, and a warning colour would push toward one answer.
  // A labelled region, not a live status: it is not news to announce.
  return (
    <StandardNotice
      status="neutral"
      icon={MdOutlineMap}
      role="region"
      aria-label={intl.formatMessage({ id: 'parcel.disclosure.title' })}
      title={intl.formatMessage({ id: 'parcel.disclosure.title' })}
      // This page's blocks own the space beneath them (its title Flex carries the same pair).
      mb={{ base: '16px', md: '24px' }}
      data-testid="location-disclosure-prompt"
      action={
        // Neither answer is styled as the recommended one. Approximate is the safer default
        // and the product's default for new parcels, but which risk a farm is willing to carry
        // on its own land is not a call this prompt should nudge. Same variant, same weight.
        <HStack spacing={3} flexWrap="wrap">
          <StandardButton
            size="sm"
            variant="outline"
            isLoading={pending === 'approximate'}
            isDisabled={isLoading && pending !== 'approximate'}
            onClick={() => choose('approximate')}>
            {intl.formatMessage({ id: 'parcel.disclosure.narrow' })}
          </StandardButton>
          <StandardButton
            size="sm"
            variant="outline"
            isLoading={pending === 'exact'}
            isDisabled={isLoading && pending !== 'exact'}
            onClick={() => choose('exact')}>
            {intl.formatMessage({ id: 'parcel.disclosure.keep' })}
          </StandardButton>
        </HStack>
      }>
      {/* Prose capped at a readable measure: this page does not use StandardPage, so nothing
          else caps it, and at 1792px the paragraphs ran ~180 characters a line. */}
      <Box maxW="72ch">
        <Text fontSize="sm" color="gray.700">
          {intl.formatMessage({ id: 'parcel.disclosure.body' })}
        </Text>
        <Text fontSize="sm" color="gray.700" mt={2}>
          {intl.formatMessage({ id: 'parcel.disclosure.reassurance' })}
        </Text>
      </Box>
    </StandardNotice>
  );
};

export default LocationDisclosurePrompt;
