import React from 'react';
import { Flex, CircularProgress } from '@chakra-ui/react';

const SubscriptionLoadingState = () => (
  <Flex width="100%" height="100vh" alignItems="center" justifyContent="center" bg="white">
    <CircularProgress isIndeterminate color="green.500" />
  </Flex>
);

export default SubscriptionLoadingState;
