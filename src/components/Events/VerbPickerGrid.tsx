/**
 * VerbPickerGrid — THE activity verb chooser (WS-4b entry convergence).
 *
 * Every surface that asks "What did you do?" renders this same grid: the
 * Activities page modal, the parcel Add Event modal, and NewEvent's own
 * chooser step. One vocabulary (config/activityVerbs), one tile style,
 * every verb visible — never a scroll-hidden subset. (The count is not
 * pinned here on purpose; it lives in config/activityVerbs, along with the
 * note on when a new subtype earns a tile instead of joining a family.)
 *
 * Labels wrap naturally (no line clamp): "Equipment cleanout" renders as two
 * clean lines, never "Equipme nt…".
 */

import React from 'react';
import { Box, type BoxProps, Icon, SimpleGrid, Text } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import { ACTIVITY_VERBS } from 'config/activityVerbs';
import type { ActivityVerb } from 'config/activityVerbs';

interface VerbPickerGridProps {
  onSelect: (verb: ActivityVerb) => void;
  /** Highlighted verb (NewEvent chooser); omit on navigate-away surfaces. */
  selectedKey?: string | null;
  columns?: Record<string, number>;
  /**
   * Why a tile cannot be picked right now, or undefined. The Activities page uses it once
   * several parcels are chosen: an activity logged one parcel at a time stays visible, greyed,
   * with its reason, rather than disappearing from a grid the grower knows by heart.
   */
  unavailableReason?: (verb: ActivityVerb) => string | undefined;
}

// Spread AFTER the regular tile props so it wins. Kept apart from the `isSelected` ternaries,
// which the contrast guards read (an unavailable tile is never selected).
const UNAVAILABLE_TILE: BoxProps = {
  bg: 'gray.50',
  borderStyle: 'dashed',
  cursor: 'not-allowed',
  _hover: { transform: 'none', boxShadow: 'none', borderColor: 'gray.200' }
};

export const VerbPickerGrid: React.FC<VerbPickerGridProps> = ({
  onSelect,
  selectedKey = null,
  columns = { base: 2, smd: 2, md: 3, lg: 5 },
  unavailableReason
}) => {
  const intl = useIntl();

  return (
    <SimpleGrid columns={columns} spacing={{ base: 2, md: 3 }} width="100%">
      {ACTIVITY_VERBS.map((verb) => {
        const isSelected = selectedKey === verb.key;
        const reason = unavailableReason?.(verb);
        return (
          <Box
            key={verb.key}
            as="button"
            type="button"
            // aria-disabled, not disabled: the tile stays focusable so its reason is announced.
            aria-disabled={reason ? true : undefined}
            onClick={reason ? undefined : () => onSelect(verb)}
            /*
             * ONE colour for fourteen tiles.
             *
             * The hue used to come from `verb.color`, giving seven of them across one modal —
             * and MEASURED on white: green.500 2.78, Chakra yellow.500 2.39, plus Chakra's
             * orange/blue/teal, none of which are Trazo tokens (the theme defines amber, not
             * orange). Five of the fourteen glyphs failed the 3.0 a non-text mark owes.
             *
             * Worse, SELECTION inverted onto those fills: white text on yellow.500 is the same
             * 2.39, so choosing a verb made it the least legible tile on screen.
             *
             * Nothing was encoded by the hue — the label names the activity and the glyph
             * distinguishes it. green.700 selected / white unselected, with weight and fill
             * carrying the state, matches every other selectable surface in the app.
             */
            bg={isSelected ? 'green.700' : 'white'}
            color={isSelected ? 'white' : 'gray.700'}
            borderWidth="2px"
            borderColor={isSelected ? 'green.700' : 'gray.200'}
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
              // Hover DARKENS. This was a flat green.600, which on a SELECTED tile is lighter
              // than its own green.700 fill — the border disappeared on the one tile the
              // pointer was over.
              borderColor: isSelected ? 'green.800' : 'green.600'
            }}
            /*
             * 2026-08-22: this was `_focus` with the halo alone. `field-focus` is 15% green
             * and theme/styles.js is explicit that it only clears the 3:1 focus floor BECAUSE
             * the control also swaps its border to green.600 — without the swap the keyboard
             * ring here was ~1.3:1, i.e. no ring. `_focusVisible` so a tap does not leave it
             * stuck on the tile the farmer just pressed.
             */
            _focusVisible={{
              outline: 'none',
              boxShadow: 'field-focus',
              borderColor: isSelected ? 'green.800' : 'green.600'
            }}
            aria-pressed={isSelected}
            {...(reason ? UNAVAILABLE_TILE : {})}>
            <Icon
              as={verb.icon}
              boxSize={{ base: 5, md: 6 }}
              color={isSelected ? 'white' : reason ? 'gray.600' : 'green.700'}
            />
            {/* `as="span"`, not Text's default <p>.
                MEASURED 2026-08-22 in the a11y tree: a <p> inside a <button> is invalid flow
                content, and the browser refused to compute the label from it — every tile
                announced as an unnamed pressed button. As a span the tile is
                `button "Pruning & canopy" [pressed]`. */}
            <Text
              as="span"
              fontSize={{ base: 'xs', md: 'sm' }}
              fontWeight="semibold"
              textAlign="center"
              lineHeight="1.25"
              wordBreak="normal"
              overflowWrap="break-word">
              {intl.formatMessage({ id: `activities.verb.${verb.key}` })}
            </Text>
            {reason && (
              <Text as="span" fontSize="xs" color="gray.700" textAlign="center" lineHeight="1.25">
                {reason}
              </Text>
            )}
          </Box>
        );
      })}
    </SimpleGrid>
  );
};

export default VerbPickerGrid;
