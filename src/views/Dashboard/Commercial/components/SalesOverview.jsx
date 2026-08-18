// Chakra imports
import { Box, Flex, Text, useColorModeValue, VStack, HStack, Icon } from '@chakra-ui/react';
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';

// Custom components
import { StandardCard } from 'components/Design/StandardComponents';
import React from 'react';
import { useIntl } from 'react-intl';

const SalesOverview = ({ title, percentage, chart, period = '2024' }) => {
  const intl = useIntl();
  const textColor = useColorModeValue('gray.700', 'white');
  const isPositive = percentage > 0;

  return (
    <StandardCard title={title} variant="elevated">
      <VStack spacing={4} align="stretch">
        {/* Performance Indicator */}
        <HStack
          spacing={3}
          p={3}
          borderRadius="lg"
          bg={isPositive ? 'green.50' : 'red.50'}
          border="1px solid"
          borderColor={isPositive ? 'green.200' : 'red.200'}>
          <Icon
            as={isPositive ? FiTrendingUp : FiTrendingDown}
            color={isPositive ? 'green.600' : 'red.600'}
            boxSize={5}
          />
          <VStack align="start" spacing={0}>
            <HStack spacing={2}>
              <Text fontSize="lg" fontWeight="bold" color={isPositive ? 'green.600' : 'red.600'}>
                {percentage > 0 ? '+' : ''}
                {percentage}%
              </Text>
              <Text fontSize="sm" color="gray.600">
                {intl.formatMessage({ id: 'commercial.vsPreviousYear' })}
              </Text>
            </HStack>
            <Text fontSize="xs" color="gray.500">
              {isPositive
                ? intl.formatMessage({ id: 'commercial.positiveGrowth' }, { period })
                : intl.formatMessage({ id: 'commercial.decline' }, { period })}
            </Text>
          </VStack>
        </HStack>

        {/* Chart Container */}
        <Box
          w="100%"
          h="300px"
          p={2}
          borderRadius="md"
          bg="gray.50"
          border="1px solid"
          borderColor="gray.200">
          {chart || (
            <Flex justify="center" align="center" h="100%" direction="column" color="gray.500">
              <Text fontSize="md" fontWeight="medium">
                {intl.formatMessage({ id: 'commercial.chartNotAvailable' })}
              </Text>
              <Text fontSize="sm">
                {intl.formatMessage({ id: 'commercial.dataWillShowWhenAvailable' })}
              </Text>
            </Flex>
          )}
        </Box>
      </VStack>
    </StandardCard>
  );
};

export default SalesOverview;
