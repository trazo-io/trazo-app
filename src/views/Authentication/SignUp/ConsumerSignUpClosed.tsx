/**
 * Consumer registration — closed.
 *
 * The authenticated consumer-account product (Discover / My Journey / Learn / Profile under
 * `consumer.*`) is being retired — see documentation/strategy/TRAZO-OCTOBER-2026-PLAN.md §10.5.
 * Short version: a logged-in shopper product is a consumer-network business, it serves none of
 * Trazo's post-October lanes, and it was the surface where self-assigned grades kept
 * regenerating (three P0 claim leaks lived there).
 *
 * This screen replaces the sign-up form NOW so no further accounts accrue between today and the
 * November removal. Closing the intake first is what keeps that removal a pure code deletion
 * rather than a user-migration and data-retention exercise.
 *
 * Deliberately NOT touched:
 *   - the anonymous QR page, which is the actual second output and needs no account;
 *   - anonymous scan counting, which is the farmer's engagement evidence;
 *   - EXISTING consumer sign-IN, so anyone already holding an account can still reach and
 *     export their data. Removing the exit before removing the product would be the wrong
 *     order.
 *
 * The sign-up form itself still exists at ./ConsumerSignUp.tsx; it is simply no longer routed
 * (src/routes/config.ts). Restoring it is a one-line change if this decision is reversed.
 */
import React from 'react';
import { Box, VStack, Heading, Text, Button, Icon, useColorModeValue } from '@chakra-ui/react';
import { FaLeaf } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';

export const ConsumerSignUpClosed: React.FC = () => {
  const navigate = useNavigate();
  const intl = useIntl();
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.600', 'gray.300');

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" px={4} py={12}>
      <Box
        bg={cardBg}
        borderRadius="2xl"
        boxShadow="lg"
        p={{ base: 6, smd: 10 }}
        maxW="480px"
        w="full">
        <VStack spacing={5} align="stretch" textAlign="center">
          <Icon as={FaLeaf} boxSize={10} color="green.700" alignSelf="center" />
          <Heading size="md">
            {intl.formatMessage({
              id: 'consumer.signup.closedTitle',
              defaultMessage: 'Shopper accounts are closed'
            })}
          </Heading>
          <Text color={textColor} fontSize="sm">
            {intl.formatMessage({
              id: 'consumer.signup.closedBody',
              defaultMessage:
                "You don't need an account to see how a product was grown. Scan the QR code on " +
                'the package — the farm’s documented practices, photos and certifications are ' +
                'all on the page, no sign-up required.'
            })}
          </Text>
          <Button colorScheme="green" onClick={() => navigate('/auth/signin')}>
            {intl.formatMessage({
              id: 'consumer.signup.closedSignIn',
              defaultMessage: 'I already have an account'
            })}
          </Button>
        </VStack>
      </Box>
    </Box>
  );
};

export default ConsumerSignUpClosed;
