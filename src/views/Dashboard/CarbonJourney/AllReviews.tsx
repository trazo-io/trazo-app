import React, { useState } from 'react';
import {
  VStack,
  HStack,
  Text,
  Icon,
  Badge,
  Image,
  Circle,
  Box,
  Flex,
  IconButton
} from '@chakra-ui/react';
import { FaStar, FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import { format } from 'date-fns';
import { NavLink, useNavigate } from 'react-router-dom';
import { StandardPage, StandardCard } from '../../../components/Design/StandardComponents';
import { useGetUserReviewsQuery } from 'store/api/historyApi';

const ITEMS_PER_PAGE = 10;

export default function AllReviews() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  // API query for data
  const { data: reviews, isLoading } = useGetUserReviewsQuery();

  // Calculate pagination
  const totalCount = reviews?.length || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedData = reviews?.slice(startIndex, endIndex) || [];

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <StandardPage
      title="All Reviews"
      description="Complete history of reviews you've written"
      showBackButton
      onBack={() => navigate('/admin/dashboard/journey')}
    >
      <StandardCard title={`Your Reviews (${totalCount})`} variant="elevated">
        <VStack spacing={3}>
          {isLoading ? (
            <Box textAlign="center" py={8}>
              <Text color="gray.500">Loading reviews...</Text>
            </Box>
          ) : paginatedData.length > 0 ? (
            <>
              {paginatedData.map((review: any, index: number) => {
                const productName =
                  typeof review.history.product === 'object'
                    ? review.history.product?.name || 'Unknown Product'
                    : review.history.product || 'Unknown Product';
                const reviewDate =
                  review.date && !isNaN(new Date(review.date).getTime())
                    ? format(new Date(review.date), 'MMM dd, yyyy')
                    : 'Recently';

                return (
                  <NavLink
                    key={review.id || index}
                    to={`/production/${review.history.id}/`}
                    style={{ width: '100%' }}
                  >
                    <Box
                      bg="white"
                      borderRadius="xl"
                      border="1px solid"
                      borderColor="gray.200"
                      p={6}
                      _hover={{
                        boxShadow: 'md',
                        borderColor: 'green.200'
                      }}
                      transition="all 0.2s"
                    >
                      <VStack spacing={4} align="stretch">
                        {/* Header with Image and User Info */}
                        <Flex justify="space-between" align="center">
                          <HStack spacing={3}>
                            {/* Review Icon/Image */}
                            {review.history.images?.length > 0 ? (
                              <Image
                                src={review.history.images[0]}
                                w="56px"
                                h="56px"
                                borderRadius="xl"
                                objectFit="cover"
                                border="2px solid"
                                borderColor="orange.100"
                              />
                            ) : (
                              <Circle
                                size="56px"
                                bg="orange.50"
                                border="2px solid"
                                borderColor="orange.100"
                              >
                                <Icon as={FaStar} color="orange.500" boxSize={5} />
                              </Circle>
                            )}
                            <VStack align="start" spacing={0}>
                              <Text
                                fontWeight="semibold"
                                fontSize="md"
                                color="gray.800"
                                noOfLines={1}
                              >
                                {review.headline || productName}
                              </Text>
                              <Text fontSize="sm" color="gray.500">
                                {reviewDate}
                              </Text>
                            </VStack>
                          </HStack>
                          <VStack align="end" spacing={1}>
                            <Badge
                              colorScheme="orange"
                              variant="subtle"
                              fontSize="xs"
                              px={2}
                              py={0.5}
                              borderRadius="full"
                            >
                              <HStack spacing={1}>
                                <Icon as={FaStar} boxSize={2.5} />
                                <Text>{review.rating}/5</Text>
                              </HStack>
                            </Badge>
                          </VStack>
                        </Flex>

                        {/* Review Content */}
                        <VStack align="stretch" spacing={3}>
                          <Text fontSize="sm" color="gray.600" noOfLines={2} lineHeight="1.6">
                            {review.written_review || 'No comments'}
                          </Text>
                          <HStack spacing={4} fontSize="xs" color="gray.500">
                            <Text>Product: {productName}</Text>
                          </HStack>
                        </VStack>
                      </VStack>
                    </Box>
                  </NavLink>
                );
              })}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <Flex justify="space-between" align="center" w="100%" pt={4}>
                  <Text fontSize="sm" color="gray.600">
                    Page {currentPage} of {totalPages} ({totalCount} total reviews)
                  </Text>
                  <HStack spacing={2}>
                    <IconButton
                      icon={<FaChevronLeft />}
                      aria-label="Previous page"
                      size="sm"
                      variant="outline"
                      colorScheme="green"
                      onClick={() => handlePageChange(currentPage - 1)}
                      isDisabled={currentPage === 1}
                    />
                    <Text fontSize="sm" fontWeight="medium" px={3}>
                      {currentPage}
                    </Text>
                    <IconButton
                      icon={<FaChevronRight />}
                      aria-label="Next page"
                      size="sm"
                      variant="outline"
                      colorScheme="green"
                      onClick={() => handlePageChange(currentPage + 1)}
                      isDisabled={currentPage === totalPages}
                    />
                  </HStack>
                </Flex>
              )}
            </>
          ) : (
            <Box textAlign="center" py={8}>
              <Circle size="60px" bg="gray.100" mx="auto" mb={4}>
                <Icon as={FaStar} color="gray.400" boxSize={6} />
              </Circle>
              <Text color="gray.600" fontWeight="medium" mb={2}>
                No reviews yet
              </Text>
              <Text color="gray.500" fontSize="sm">
                Share your thoughts on products you've scanned
              </Text>
            </Box>
          )}
        </VStack>
      </StandardCard>
    </StandardPage>
  );
}
