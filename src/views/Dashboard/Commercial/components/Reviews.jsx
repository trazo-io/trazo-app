// Chakra imports
import {
  Button,
  Flex,
  Progress,
  Stack,
  Text,
  useColorModeValue,
  VStack,
  HStack,
  Box
} from '@chakra-ui/react';
import {
  useGetEstablishmentLastReviewsQuery,
  useGetEstablishmentProductReputationPercentageQuery
} from 'store/api/reviewApi';

// Custom components
import { StandardCard, StandardButton } from 'components/Design/StandardComponents';
import GeneralCard from './GeneralCard';
import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const Reviews = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const textColor = useColorModeValue('gray.700', 'white');
  const { farmId } = useParams();
  const [showAllReviews, setShowAllReviews] = useState(false);

  const currentCompany = useSelector((state) => state.company.currentCompany);

  const { data: reviews } = useGetEstablishmentLastReviewsQuery(
    {
      companyId: currentCompany?.id,
      farmId
    },
    {
      skip: !currentCompany || !farmId || currentCompany?.id === undefined
    }
  );

  const { data: reviewsPercentage } = useGetEstablishmentProductReputationPercentageQuery(
    {
      companyId: currentCompany?.id,
      farmId
    },
    {
      skip: !currentCompany || !farmId || currentCompany?.id === undefined
    }
  );

  const handleViewAllReviews = () => {
    // Navigate to dedicated reviews page or show modal
    navigate(`/admin/dashboard/farm/${farmId}/reviews`);
  };

  const displayedReviews = showAllReviews ? reviews : reviews?.slice(0, 3);

  return (
    <StandardCard title={intl.formatMessage({ id: 'app.reviews' })} variant="elevated">
      <Flex gap={{ base: 4, md: 6 }} width="100%" direction={{ base: 'column', lg: 'row' }}>
        {/* Reviews Statistics */}
        <Box flex={1} minW={{ base: 'auto', lg: '300px' }}>
          <VStack spacing={{ base: 3, md: 6 }}>
            <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="semibold" color={textColor} alignSelf="start">
              {intl.formatMessage({ id: 'commercial.reputationSummary' })}
            </Text>

            <VStack spacing={{ base: 3, md: 4 }} w="100%">
              {/* Positive Reviews */}
              <Box w="100%">
                <Flex justify="space-between" mb={2}>
                  <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" fontWeight="medium">
                    {intl.formatMessage({ id: 'app.positiveReviews' })}
                  </Text>
                  <Text fontSize={{ base: 'xs', md: 'sm' }} color="green.700" fontWeight="semibold">
                    {reviewsPercentage?.positive || 0}%
                  </Text>
                </Flex>
                <Progress
                  colorScheme="green"
                  size={{ base: 'sm', md: 'md' }}
                  value={reviewsPercentage?.positive || 0}
                  borderRadius="full"
                  bg="gray.100"
                />
              </Box>

              {/* Neutral Reviews */}
              <Box w="100%">
                <Flex justify="space-between" mb={2}>
                  <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" fontWeight="medium">
                    {intl.formatMessage({ id: 'app.neutralReviews' })}
                  </Text>
                  <Text fontSize={{ base: 'xs', md: 'sm' }} color="yellow.600" fontWeight="semibold">
                    {reviewsPercentage?.neutral || 0}%
                  </Text>
                </Flex>
                <Progress
                  colorScheme="yellow"
                  size={{ base: 'sm', md: 'md' }}
                  value={reviewsPercentage?.neutral || 0}
                  borderRadius="full"
                  bg="gray.100"
                />
              </Box>

              {/* Negative Reviews */}
              <Box w="100%">
                <Flex justify="space-between" mb={2}>
                  <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" fontWeight="medium">
                    {intl.formatMessage({ id: 'app.negativeReviews' })}
                  </Text>
                  <Text fontSize={{ base: 'xs', md: 'sm' }} color="red.600" fontWeight="semibold">
                    {reviewsPercentage?.negative || 0}%
                  </Text>
                </Flex>
                <Progress
                  colorScheme="red"
                  size={{ base: 'sm', md: 'md' }}
                  value={reviewsPercentage?.negative || 0}
                  borderRadius="full"
                  bg="gray.100"
                />
              </Box>
            </VStack>
          </VStack>
        </Box>

        {/* Recent Reviews */}
        <Box flex={2}>
          <VStack spacing={{ base: 3, md: 4 }} align="stretch">
            <Flex justify="space-between" align="center">
              <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="semibold" color={textColor}>
                {intl.formatMessage({ id: 'commercial.recentReviews' })}
              </Text>
              {!showAllReviews && reviews && reviews.length > 3 && (
                <StandardButton variant="outline" size="sm" onClick={() => setShowAllReviews(true)}>
                  {intl.formatMessage({ id: 'commercial.showMore' })}
                </StandardButton>
              )}
            </Flex>

            {displayedReviews && displayedReviews.length > 0 ? (
              <VStack spacing={{ base: 3, md: 4 }} align="stretch">
                {displayedReviews.map((review) => (
                  <GeneralCard key={review.id} review={review} />
                ))}

                {showAllReviews && (
                  <HStack justify="space-between">
                    <StandardButton
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAllReviews(false)}
                    >
                      {intl.formatMessage({ id: 'commercial.showLess' })}
                    </StandardButton>
                    <StandardButton variant="primary" size="sm" onClick={handleViewAllReviews}>
                      {intl.formatMessage({ id: 'app.viewAllReviews' })}
                    </StandardButton>
                  </HStack>
                )}

                {!showAllReviews && (
                  <StandardButton
                    variant="primary"
                    size={{ base: 'sm', md: 'md' }}
                    onClick={handleViewAllReviews}
                    alignSelf="flex-end"
                  >
                    {intl.formatMessage({ id: 'app.viewAllReviews' })}
                  </StandardButton>
                )}
              </VStack>
            ) : (
              <Flex justify="center" align="center" py={8}>
                <Text color="gray.500" fontSize="md">
                  {intl.formatMessage({ id: 'commercial.noReviewsAvailable' })}
                </Text>
              </Flex>
            )}
          </VStack>
        </Box>
      </Flex>
    </StandardCard>
  );
};

export default Reviews;
