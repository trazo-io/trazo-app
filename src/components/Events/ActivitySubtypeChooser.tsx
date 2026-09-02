/**
 * ActivitySubtypeChooser — the SECOND-LEVEL activity question, asked at most once.
 *
 * A verb tile answers "what did you do". Most tiles answer it completely (Irrigation is IR and
 * nothing else). A few honestly stand for several record shapes — "Field work" is cultivation,
 * thinning or mowing; "Input application" is fertilizer, pesticide, fungicide or herbicide — and
 * which one it was decides half the fields the next step renders. This is where that is asked:
 * step 0 of the wizard, before any subtype-scoped field has been shown, in the same farmer
 * vocabulary as the tiles.
 *
 * ⛔ It is NOT a re-run of ProductionTab's `type` select. Until 2026-08-22 that select rendered
 * on every path, so a farmer who tapped "Harvest" was asked again — in developer wording
 * ("Harvesting - Crop collection & transport"), against all sixteen codes, with the page header
 * still reading "Log activity — Harvest" whatever they picked. One question, one place.
 *
 * Labels come from the display registry (config/events → getSubtypes), never from a local map:
 * the grid, this chooser, the timeline and the certifier packet then all name a subtype the same
 * way, and adding a subtype to the backend without a label fails the coverage guard rather than
 * rendering a raw code at a farmer.
 *
 * Colour: same reasoning as VerbPickerGrid — one green, state carried by fill + weight, never by
 * hue. `green.700` selected (5.13:1 under white), `gray.200` border unselected.
 */

import React from 'react';
import { Box, SimpleGrid, Text } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import { getSubtypes } from 'config/events';
import type { EventTypeCode } from 'config/events';

interface ActivitySubtypeChooserProps {
  /** Backend event_type the verb routed to — see HOISTED_SUBTYPE_EVENT_TYPES (production, chemical). */
  eventType: EventTypeCode;
  /** Subtype codes this verb covers, in display order. */
  choices: readonly string[];
  /** Currently selected code. */
  value?: string | null;
  onChange: (code: string) => void;
}

export const ActivitySubtypeChooser: React.FC<ActivitySubtypeChooserProps> = ({
  eventType,
  choices,
  value = null,
  onChange
}) => {
  const intl = useIntl();
  const registrySubtypes = getSubtypes(eventType);

  const labelFor = (code: string): string => {
    const entry = registrySubtypes.find((s) => s.code === code);
    // Falls back to the raw code rather than throwing: a farmer mid-record should not lose a
    // form to a missing label. The code is deliberately ugly so the gap is VISIBLE — the
    // coverage guard is what actually stops it reaching here.
    return entry ? intl.formatMessage({ id: entry.labelKey }) : code;
  };

  /*
   * Two or three options are the normal case (a family verb) and get one full-width column on
   * a phone — the biggest, least mis-tappable target. The long list is the fallback for a
   * subtype nothing upstream answered; at sixteen options one column is a 16-row scroll, so
   * it packs instead.
   */
  const dense = choices.length > 4;
  /*
   * A short list never leaves exactly ONE option on the last row.
   *
   * MEASURED 2026-09-01 at 1440px with chemical's four: `smd: min(n, 3)` laid them out 3 + 1,
   * and a lone tile on its own row reads as a different KIND of option rather than the fourth
   * peer — the four are equals, and the grid was saying otherwise. Four wraps 2 x 2 from the
   * tablet breakpoint and sits in one row of four once there is width for it.
   */
  const columns = dense
    ? { base: 2, smd: 3, md: 4 }
    : {
        base: 1,
        smd: choices.length === 4 ? 2 : Math.min(choices.length, 3),
        md: Math.min(choices.length, 4)
      };

  return (
    <SimpleGrid columns={columns} spacing={3} width="100%">
      {choices.map((code) => {
        const isSelected = value === code;
        return (
          <Box
            key={code}
            as="button"
            type="button"
            onClick={() => onChange(code)}
            bg={isSelected ? 'green.700' : 'white'}
            color={isSelected ? 'white' : 'gray.700'}
            borderWidth="2px"
            borderColor={isSelected ? 'green.700' : 'gray.200'}
            borderRadius="lg"
            px={4}
            // 44px minimum touch target (frontend.md).
            minH="44px"
            py={3}
            fontSize={{ base: 'sm', md: 'md' }}
            fontWeight={isSelected ? 'bold' : 'medium'}
            transition="all 0.15s ease"
            // Hover DARKENS (frontend.md). The first version moved the selected tile's border
            // from green.700 to green.600 — lighter than its own fill, i.e. the border
            // vanished on the one tile the pointer was over.
            _hover={{
              bg: isSelected ? 'green.800' : 'gray.50',
              borderColor: isSelected ? 'green.800' : 'green.600'
            }}
            /*
             * `field-focus` is a 15%-opacity halo, and theme/styles.js says in so many words
             * that it only clears the 3:1 focus floor BECAUSE the control also swaps its
             * border to green.600. Ship the halo without that swap and the keyboard ring is
             * ~1.3:1 — invisible. _focusVisible, not _focus, so a tap does not leave the ring
             * stuck on the tile the farmer just pressed.
             */
            _focusVisible={{
              outline: 'none',
              boxShadow: 'field-focus',
              borderColor: isSelected ? 'green.800' : 'green.600'
            }}
            aria-pressed={isSelected}>
            {/* `as="span"`: Text renders a <p> by default, and flow content inside a <button>
                is invalid HTML — browsers cope, screen readers need not. */}
            <Text
              as="span"
              textAlign="center"
              lineHeight="1.25"
              wordBreak="normal"
              overflowWrap="break-word">
              {labelFor(code)}
            </Text>
          </Box>
        );
      })}
    </SimpleGrid>
  );
};

export default ActivitySubtypeChooser;
