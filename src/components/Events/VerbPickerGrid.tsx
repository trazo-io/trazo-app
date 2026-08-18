/**
 * VerbPickerGrid — THE activity verb chooser (WS-4b entry convergence).
 *
 * Every surface that asks "What did you do?" renders this same grid: the
 * Activities page modal, the parcel Add Event modal, and NewEvent's own
 * chooser step. One vocabulary (config/activityVerbs), one tile style,
 * always all ten verbs visible — never a scroll-hidden subset.
 *
 * Labels wrap naturally (no line clamp): "Equipment cleanout" renders as two
 * clean lines, never "Equipme nt…".
 */

import React from 'react';
import { Box, Icon, SimpleGrid, Text } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import { ACTIVITY_VERBS } from 'config/activityVerbs';
import type { ActivityVerb } from 'config/activityVerbs';

interface VerbPickerGridProps {
  onSelect: (verb: ActivityVerb) => void;
  /** Highlighted verb (NewEvent chooser); omit on navigate-away surfaces. */
  selectedKey?: string | null;
  columns?: Record<string, number>;
}

export const VerbPickerGrid: React.FC<VerbPickerGridProps> = ({
  onSelect,
  selectedKey = null,
  columns = { base: 2, smd: 2, md: 3, lg: 5 }
}) => {
  const intl = useIntl();

  return (
    <SimpleGrid columns={columns} spacing={{ base: 2, md: 3 }} width="100%">
      {ACTIVITY_VERBS.map((verb) => {
        const isSelected = selectedKey === verb.key;
        return (
          <Box
            key={verb.key}
            as="button"
            type="button"
            onClick={() => onSelect(verb)}
            bg={isSelected ? `${verb.color}.500` : 'white'}
            color={isSelected ? 'white' : 'gray.700'}
            borderWidth="2px"
            borderColor={isSelected ? `${verb.color}.500` : 'gray.200'}
            borderRadius={{ base: 'lg', md: 'xl' }}
            p={{ base: 3, md: 4 }}
            minH={{ base: '80px', md: '96px' }}
            minW={0}
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            gap={2}
            transition="all 0.2s ease"
            _hover={{
              transform: 'translateY(-2px)',
              boxShadow: 'lg',
              borderColor: `${verb.color}.400`
            }}
            _focus={{
              outline: 'none',
              boxShadow: `0 0 0 3px var(--chakra-colors-${verb.color}-200)`
            }}
            aria-pressed={isSelected}>
            <Icon
              as={verb.icon}
              boxSize={{ base: 5, md: 6 }}
              color={isSelected ? 'white' : `${verb.color}.500`}
            />
            <Text
              fontSize={{ base: 'xs', md: 'sm' }}
              fontWeight="semibold"
              textAlign="center"
              lineHeight="1.25"
              wordBreak="normal"
              overflowWrap="break-word">
              {intl.formatMessage({ id: `activities.verb.${verb.key}` })}
            </Text>
          </Box>
        );
      })}
    </SimpleGrid>
  );
};

export default VerbPickerGrid;
