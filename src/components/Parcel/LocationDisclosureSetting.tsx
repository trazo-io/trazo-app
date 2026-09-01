/**
 * The permanent control for how precisely this parcel may be located on the public page.
 *
 * WHY THIS EXISTS SEPARATELY FROM THE PROMPT
 * ------------------------------------------
 * `LocationDisclosurePrompt` is a one-time consent ask: it appears on the parcel dashboard for
 * a parcel that inherited `exact` from migration 0013 and was never asked, and it disappears
 * the moment someone answers.
 *
 * A prompt that disappears is not a control. The marketing site describes the disclosure level
 * as the farmer's own setting, and until 2026-08-31 `location_disclosure_level` was not exposed
 * anywhere in the producer app at all — so a farm could neither see what it was publishing nor
 * change its mind afterwards. This is the setting itself: always present, always showing the
 * current state, changeable in both directions.
 *
 * WHY ON THE PARCEL PROFILE
 * -------------------------
 * The dashboard is where a farmer lands and where an urgent, one-time ask belongs. The profile
 * is where the parcel's stored facts live, and it is where someone goes when they are looking
 * for a setting rather than reacting to one.
 *
 * `hidden` is deliberately offered alongside the other two. A farm whose parcel contains the family home —
 * or that simply does not want a map on a public page — should not have to publish a location
 * at all to publish its records.
 */

import React from 'react';
import { Badge, Box, Button, HStack, Icon, Link, Text, VStack, useToast } from '@chakra-ui/react';
import { MdOpenInNew } from 'react-icons/md';
import { useIntl } from 'react-intl';

import {
  useGetParcelLocationDisclosureQuery,
  useSetParcelLocationDisclosureMutation
} from 'store/api/productApi';
import config from 'config/environment';

type Level = 'exact' | 'approximate' | 'hidden';

interface LocationDisclosureSettingProps {
  parcelId: number | string;
  level?: string | null;
  hasBoundary?: boolean | null;
}

const LEVELS: Level[] = ['exact', 'approximate', 'hidden'];

export const LocationDisclosureSetting: React.FC<LocationDisclosureSettingProps> = ({
  parcelId,
  level,
  hasBoundary
}) => {
  const intl = useIntl();
  const toast = useToast();
  const [setDisclosure, { isLoading }] = useSetParcelLocationDisclosureMutation();
  const { data: state } = useGetParcelLocationDisclosureQuery(parcelId, { skip: !parcelId });

  const current = (level as Level) || 'approximate';

  const choose = async (next: Level) => {
    if (next === current) return;
    try {
      await setDisclosure({ parcelId, level: next }).unwrap();
      toast({
        status: 'success',
        duration: 4000,
        isClosable: true,
        title: intl.formatMessage({ id: `parcel.disclosureSetting.saved.${next}` })
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
    <VStack align="stretch" spacing={3}>
      <Text fontSize="sm" color="gray.700">
        {intl.formatMessage({ id: 'parcel.disclosureSetting.intro' })}
      </Text>

      {/* Each option states what a shopper sees, not what the setting is called. "Approximate"
          means nothing to someone deciding; "a point about a kilometre wide, no field outline"
          does. */}
      <VStack align="stretch" spacing={2}>
        {LEVELS.map((option) => {
          const selected = option === current;
          return (
            <Box
              key={option}
              as="button"
              type="button"
              textAlign="left"
              onClick={() => choose(option)}
              disabled={isLoading}
              borderWidth="1px"
              borderRadius="md"
              // Selection is never signalled by colour alone (.claude/rules/frontend.md):
              // the chosen option also carries a weight change and an explicit badge.
              borderColor={selected ? 'green.600' : 'gray.200'}
              bg={selected ? 'green.50' : 'white'}
              px={4}
              py={3}
              minH="44px"
              _hover={{ borderColor: selected ? 'green.700' : 'gray.300' }}>
              <HStack justify="space-between" align="flex-start" spacing={3}>
                <Box>
                  <Text fontSize="sm" fontWeight={selected ? 'bold' : 'medium'} color="gray.800">
                    {intl.formatMessage({ id: `parcel.disclosureSetting.${option}.label` })}
                  </Text>
                  <Text fontSize="xs" color="gray.600" mt={0.5}>
                    {intl.formatMessage({ id: `parcel.disclosureSetting.${option}.help` })}
                  </Text>
                </Box>
                {selected && (
                  <Badge colorScheme="green" variant="subtle" flexShrink={0}>
                    {intl.formatMessage({ id: 'parcel.disclosureSetting.current' })}
                  </Badge>
                )}
              </HStack>
            </Box>
          );
        })}
      </VStack>

      {/* Shown only when `exact` cannot actually do anything, so the farmer is not left
          wondering why their choice changed nothing on the public page. */}
      {!hasBoundary && (
        <Text fontSize="xs" color="gray.600">
          {intl.formatMessage({ id: 'parcel.disclosureSetting.noBoundary' })}
        </Text>
      )}

      <Text fontSize="xs" color="gray.600">
        {intl.formatMessage({ id: 'parcel.disclosureSetting.reassurance' })}
      </Text>

      {/* The page this setting controls, one click away.
          Its absence is what made this control confusing in testing: a farmer changes what
          shoppers see and then has to work out, unaided, which published season belongs to
          THIS block. Twice in a row the wrong parcel's page got checked and the setting looked
          broken when it was working. A control for a page should link to the page. */}
      {state?.preview_production_public_id && (
        <Link
          href={`${config.CONSUMER_BASE_URL}/production/${state.preview_production_public_id}`}
          isExternal
          fontSize="sm"
          color="green.700"
          fontWeight="medium"
          alignSelf="flex-start"
          minH="44px"
          display="inline-flex"
          alignItems="center"
          gap={1}>
          {intl.formatMessage({ id: 'parcel.disclosureSetting.preview' })}
          <Icon as={MdOpenInNew} boxSize={4} aria-hidden />
        </Link>
      )}

      {isLoading && (
        <Button size="sm" variant="ghost" isLoading isDisabled alignSelf="flex-start">
          {intl.formatMessage({ id: 'parcel.disclosureSetting.saving' })}
        </Button>
      )}
    </VStack>
  );
};

export default LocationDisclosureSetting;
