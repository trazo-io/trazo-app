/*!

=========================================================
* Purity UI Dashboard PRO - v1.0.0
=========================================================

* Product Page: https://www.creative-tim.com/product/purity-ui-dashboard-pro
* Copyright 2021 Creative Tim (https://www.creative-tim.com/)

* Design by Creative Tim & Coded by Simmmple

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/

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
import avatar4 from 'assets/img/avatars/avatar4.png';

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
          w="14px"
          h="14px"
          color="yellow.400"
        />
      );
    });
  };

  return (
    <StandardCard variant="outline">
      <VStack spacing={4} align="stretch">
        {/* User Info and Rating */}
        <Flex justify="space-between" align="center" w="100%">
          <HStack spacing={3}>
            <Avatar
              src={review.user_avatar || avatar4}
              size="md"
              borderRadius="xl"
              border="2px solid"
              borderColor="green.100"
            />
            <VStack align="start" spacing={0}>
              <Text color={textColor} fontSize="md" fontWeight="semibold">
                {review.user}
              </Text>
              <Text color="gray.500" fontSize="sm">
                {review.date}
              </Text>
            </VStack>
          </HStack>
          <HStack spacing={1}>{renderStars(review.rating)}</HStack>
        </Flex>

        {/* Review Content */}
        <VStack align="stretch" spacing={3}>
          <Text color={textColor} fontSize="md" fontWeight="semibold" lineHeight="1.4">
            {review.headline}
          </Text>
          <Text fontSize="sm" color="gray.600" lineHeight="1.6">
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
