// Chakra imports
import {
  Avatar,
  Button,
  Flex,
  Icon,
  Stack,
  Text,
  useColorModeValue,
  VStack,
  HStack
} from '@chakra-ui/react';
import { BsStar, BsStarFill, BsStarHalf } from 'react-icons/bs';

// Custom components
import { StandardCard } from 'components/Design/StandardComponents';
import React from 'react';
import { useIntl } from 'react-intl';

const GeneralCard = ({ review }) => {
  const intl = useIntl();
  const textColor = useColorModeValue('gray.700', 'white');

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => {
      const starIndex = index + 1;
      return (
        <Icon
          key={index}
          as={rating >= starIndex ? BsStarFill : rating > starIndex - 0.5 ? BsStarHalf : BsStar}
          w={{ base: '12px', md: '14px' }}
          h={{ base: '12px', md: '14px' }}
          color="yellow.400"
        />
      );
    });
  };

  return (
    <StandardCard variant="outline" padding={{ base: 3, md: 4 }}>
      <VStack spacing={{ base: 2, md: 4 }} align="stretch">
        {/* User Info and Rating */}
        <Flex justify="space-between" align="center" w="100%" gap={2} flexWrap="wrap">
          <HStack spacing={2} minW={0}>
            <Avatar
              src={review.user_avatar || undefined}
              name={review.user || 'Anonymous'}
              size="sm"
              borderRadius="xl"
              border="2px solid"
              borderColor="green.100"
              bg="green.100"
              color="green.700"
              flexShrink={0}
            />
            <VStack align="start" spacing={0} minW={0}>
              <Text color={textColor} fontSize={{ base: 'xs', md: 'sm' }} fontWeight="semibold" noOfLines={1}>
                {review.user}
              </Text>
              <Text color="gray.500" fontSize="xs" whiteSpace="nowrap">
                {review.date}
              </Text>
            </VStack>
          </HStack>
          <HStack spacing={0.5} flexShrink={0}>{renderStars(review.rating)}</HStack>
        </Flex>

        {/* Review Content */}
        <VStack align="stretch" spacing={{ base: 1, md: 3 }}>
          <Text color={textColor} fontSize={{ base: 'sm', md: 'md' }} fontWeight="semibold" lineHeight="1.4">
            {review.headline}
          </Text>
          <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" lineHeight="1.5">
            {review.written_review}
          </Text>
          <Text color="gray.500" fontSize="xs" fontWeight="medium">
            {intl.formatMessage({ id: 'commercial.production' }, { name: review.production })}
          </Text>
        </VStack>
      </VStack>
    </StandardCard>
  );
};

export default GeneralCard;
