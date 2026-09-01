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
import { Box, Button, HStack, Icon, Text, VStack, useToast } from '@chakra-ui/react';
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

  // Three conditions, all required. `exact` is the only level that publishes a boundary;
  // `choiceMade` separates an inherited value from a decision; `hasBoundary` stops the prompt
  // warning a parcel about a boundary it does not have.
  if (level !== 'exact' || choiceMade === true || !hasBoundary) return null;

  const choose = async (next: 'exact' | 'approximate') => {
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
    }
  };

  return (
    <Box
      bg={GUIDANCE_NOTE_TOKENS.ground}
      borderLeft="4px solid"
      borderLeftColor={GUIDANCE_NOTE_TOKENS.bar}
      borderRadius="md"
      px={4}
      py={4}
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
        <VStack align="stretch" spacing={3} flex={1}>
          <Box>
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
          <HStack spacing={3} flexWrap="wrap">
            <Button
              size="sm"
              variant="outline"
              minH="44px"
              isLoading={isLoading}
              onClick={() => choose('approximate')}>
              {intl.formatMessage({ id: 'parcel.disclosure.narrow' })}
            </Button>
            <Button
              size="sm"
              variant="outline"
              minH="44px"
              isLoading={isLoading}
              onClick={() => choose('exact')}>
              {intl.formatMessage({ id: 'parcel.disclosure.keep' })}
            </Button>
          </HStack>
        </VStack>
      </HStack>
    </Box>
  );
};

export default LocationDisclosurePrompt;
