import { Badge, Box, HStack, Stack, Text, VStack } from '@chakra-ui/react';
import React from 'react';
import { useIntl } from 'react-intl';

import { StandardButton } from 'components/Design/StandardComponents';

/**
 * One labelled line of the crew-note banner: "Would fill", "Held back", "Block", "Records on".
 *
 * The banner used to be six stacked sentences, each a full line of prose, and a farmer reading it
 * on a phone could not tell at a glance what the message would write, what it refused to write,
 * or which day it would file under (Oscar, 2026-10-20: "I dont like the way we show that, like
 * just in text"). The facts did not change; they are a label and its values now, so the eye can
 * land on the one it wants.
 */
export const CrewNoteRow = ({ label, children }) => (
  <Stack
    direction={{ base: 'column', smd: 'row' }}
    spacing={{ base: 0.5, smd: 3 }}
    align={{ base: 'start', smd: 'baseline' }}
    w="full">
    <Text fontSize="xs" color="gray.600" minW={{ smd: '104px' }} flexShrink={0}>
      {label}
    </Text>
    <Box flex="1" minW={0}>
      {children}
    </Box>
  </Stack>
);

/**
 * The values on a row, one chip each.
 *
 * ⛔ NEUTRAL, never green. A chip here is a value WAITING for a person to accept it, and green is
 * this app's done colour: tinting an offer with it would say the record already carries the
 * number. The row's own label is what separates "Would fill" from "Held back", so the colour
 * carries no meaning and does not have to.
 */
export const CrewNoteChips = ({ values, testId }) => (
  // ⛔ `aria-hidden`, because a sentence saying the same thing sits beside it. Without this a
  // screen reader reads every value twice, once as a run of disconnected chips and once as the
  // sentence, and the chips are the half that does not say what the values ARE (review of app
  // #160). The sentence is the accessible version; this is its picture.
  <HStack flexWrap="wrap" spacing={2} rowGap={1} aria-hidden="true" data-testid={testId}>
    {values.map((value) => (
      <Badge
        key={value}
        variant="neutral"
        textTransform="none"
        fontWeight="medium"
        whiteSpace="normal"
        fontSize="11px">
        {value}
      </Badge>
    ))}
  </HStack>
);

/**
 * WHAT THE MESSAGE WAS NOT ALLOWED TO WRITE, on an application record.
 *
 * On an application the product, rate, quantity, area and their units are typed by the confirmer
 * from their own records (OSP audit T29, Oscar's boundary 2026-10-01), and the server refuses the
 * save if they arrive from a message. The fields are named as chips and the reason sits behind a
 * toggle. ⛔ The reason itself is not cut: a farmer who is told four values were held back is owed
 * it on the same screen, not in a help centre.
 *
 * 🔴 MEASURED 2026-10-25 on a Beneficial Release ("Released ladybugs on both blocks this morning,
 * 2000 per acre"). Nothing was held back, and the banner still printed a "Held back" label with
 * an empty row and a "Why?" toggle explaining a refusal that never happened. A label with nothing
 * under it reads as "something was dropped and we will not say what". So the row exists only when
 * something WAS held back: `count` is the withheld fields without their unit companions, the same
 * basis the sentence counts with.
 */
export const CrewNoteHeldBackRow = ({ labels, count, open, onToggle }) => {
  const intl = useIntl();
  if (!count) return null;
  return (
    <CrewNoteRow label={intl.formatMessage({ id: 'events.voice.row.heldBack' })}>
      <VStack align="start" spacing={1} w="full">
        {labels.length > 0 && <CrewNoteChips testId="crew-note-withheld" values={labels} />}
        <StandardButton
          size="xs"
          variant="ghost"
          px={2}
          ml={-2}
          aria-expanded={open}
          onClick={onToggle}>
          {intl.formatMessage({ id: 'events.voice.row.why' })}
        </StandardButton>
        {open && (
          <Text fontSize="xs" color="gray.800" data-testid="crew-note-application-mode">
            {intl.formatMessage({ id: 'events.voice.crewNoteApplicationMode' })}{' '}
            {intl.formatMessage(
              { id: 'events.voice.crewNoteWithheld' },
              // THE SAME BASIS AS THE CHIPS. The raw list carries unit companions (`volume_unit`
              // beside `volume_applied`), so counting it said "4 values" over three chips. A unit
              // is part of a value, not a value of its own: the filled count has excluded them
              // since 2026-09-01 for the same reason.
              { count }
            )}
          </Text>
        )}
      </VStack>
    </CrewNoteRow>
  );
};
