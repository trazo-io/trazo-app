/**
 * Where the crew sends it: the number, and the steps a supervisor has to carry out once.
 *
 * WHY THIS EXISTS. Every other part of setup shipped before it. The roster says which numbers may
 * send, the consent copy says what happens to a message, the inbox says what to do with one. Nothing
 * said the ADDRESS. `fieldNotes.emptyHelp` promised that anything sent to "your Trazo number" would
 * appear here, and that number lived only in the deployment's environment, so the single fact a
 * supervisor had to relay to their crew was the single fact the product never stated.
 *
 * THE JOIN STEP IS NOT A DETAIL. On the Twilio sandbox every sender must send a join phrase once
 * before Twilio delivers anything at all. Without it a grower adds a number, tells their crew to
 * message it, and every message is dropped upstream of the webhook: no note, no refusal row, nothing
 * on any screen. That is the worst failure this feature can have, because it is indistinguishable
 * from "my crew did not bother", and the person it blames is the crew.
 *
 * THE NOT-CONFIGURED STATE IS THE TRUTH TODAY. Production has no sender number set, so this renders
 * as "not switched on yet" rather than as a number that would not work. It says the roster below is
 * still worth filling in, because it is: the numbers work the moment the channel does.
 */
import { useIntl } from 'react-intl';

import { Box, HStack, Text, VStack, useToast } from '@chakra-ui/react';

import { StandardButton, StandardCard } from 'components/Design/StandardComponents';
import { useGetCrewChannelQuery } from 'store/api/crewSenderApi';

const CrewChannel = () => {
  const intl = useIntl();
  const toast = useToast();

  // No argument and no skip: this is a property of the deployment, not of a company, so there is
  // nothing to wait for. That is also why it does not live inside `CrewRoster`, which cannot render
  // until the company slice hydrates.
  const { data: channel, isLoading, isError } = useGetCrewChannelQuery();

  const copy = async () => {
    if (!channel?.number) return;
    // GUARDED ON BOTH, following `ModernErrorState.tsx`. `navigator.clipboard` is undefined outside
    // a secure context and in jsdom, so an unguarded call is a thrown TypeError rather than a failed
    // copy, and the catch below would report it as one.
    if (!navigator.clipboard || !window.isSecureContext) {
      toast({
        title: intl.formatMessage({ id: 'fieldNotes.channel.copyFailed' }),
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top'
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(channel.number);
      toast({
        title: intl.formatMessage({ id: 'fieldNotes.channel.copied' }),
        status: 'success',
        duration: 2000,
        isClosable: true,
        position: 'top'
      });
    } catch {
      toast({
        title: intl.formatMessage({ id: 'fieldNotes.channel.copyFailed' }),
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top'
      });
    }
  };

  const heading = (
    <Text fontSize="sm" fontWeight="semibold" color="gray.800">
      {intl.formatMessage({ id: 'fieldNotes.channel.heading' })}
    </Text>
  );

  if (isLoading) {
    return (
      <StandardCard>
        <VStack align="stretch" spacing={2} p={2}>
          {heading}
          <Text fontSize="sm">{intl.formatMessage({ id: 'app.loading' })}</Text>
        </VStack>
      </StandardCard>
    );
  }

  /*
    SAID OUT LOUD, never folded into the not-configured state. The two are different facts and the
    second is a claim: "the channel is not on for this account" would be asserted here on the
    evidence of a request that failed. Same rule the refusals list on this page already follows.
  */
  if (isError || !channel) {
    return (
      <StandardCard>
        <VStack align="stretch" spacing={2} p={2}>
          {heading}
          <Text fontSize="sm" color="gray.800">
            {intl.formatMessage({ id: 'fieldNotes.channel.loadFailed' })}
          </Text>
        </VStack>
      </StandardCard>
    );
  }

  if (!channel.configured) {
    return (
      <StandardCard>
        <VStack align="stretch" spacing={2} p={2}>
          {heading}
          <Text fontSize="sm" color="gray.800">
            {intl.formatMessage({ id: 'fieldNotes.channel.notConfigured' })}
          </Text>
        </VStack>
      </StandardCard>
    );
  }

  // Only rendered when there is one. An empty string here would print "First time only: each person
  // sends  to that number", which reads as a bug and is worse than saying nothing.
  const phrase = channel.join_phrase;

  return (
    <StandardCard>
      <VStack align="stretch" spacing={3} p={2}>
        <VStack align="start" spacing={1}>
          {heading}
          <Text fontSize="xs" color="gray.700">
            {intl.formatMessage({ id: 'fieldNotes.channel.help' })}
          </Text>
        </VStack>

        <HStack spacing={3} flexWrap="wrap">
          <Box
            bg="green.50"
            borderWidth="1px"
            borderColor="green.600"
            borderRadius="md"
            px={3}
            py={2}>
            <Text
              fontSize="md"
              fontWeight="semibold"
              color="green.800"
              /*
               * Selectable on purpose, and the reason the copy button is not the only way out. A
               * phone with no clipboard permission, or a browser on an insecure origin, still has to
               * be able to get this number onto a crew member's handset.
               */
              userSelect="all"
              data-testid="crew-channel-number">
              {channel.number}
            </Text>
          </Box>
          <StandardButton size="sm" variant="outline" minH="44px" onClick={copy}>
            {intl.formatMessage({ id: 'fieldNotes.channel.copy' })}
          </StandardButton>
        </HStack>

        {/*
          An ordered list, because the order is load-bearing: a crew member who messages before their
          number is on the roster gets refused, and on the sandbox one who messages before joining is
          not delivered at all. Rendered as <ol> rather than styled Text so a screen reader announces
          it as a sequence.
        */}
        <Box as="ol" pl={5} m={0}>
          {['step1', 'step2', 'step3'].map((step) => (
            <Box as="li" key={step} mb={1}>
              <Text fontSize="sm" color="gray.800">
                {intl.formatMessage({ id: `fieldNotes.channel.${step}` })}
              </Text>
              {/* Nested under step 2, which is the step it modifies: saving the number is not enough. */}
              {step === 'step2' && phrase ? (
                <Text fontSize="sm" color="gray.800" mt={1} fontWeight="semibold">
                  {intl.formatMessage({ id: 'fieldNotes.channel.join' }, { phrase: `“${phrase}”` })}
                </Text>
              ) : null}
            </Box>
          ))}
        </Box>

        {/*
          The expiry, and only on the sandbox. It is the one thing that makes a working channel stop
          working with no error anywhere, and the roster's "last message" column below is how a
          supervisor spots it, so the two belong on the same page.
        */}
        {phrase ? (
          <Text fontSize="xs" color="gray.700">
            {intl.formatMessage({ id: 'fieldNotes.channel.joinExpiry' }, { phrase: `“${phrase}”` })}
          </Text>
        ) : null}
      </VStack>
    </StandardCard>
  );
};

export default CrewChannel;
