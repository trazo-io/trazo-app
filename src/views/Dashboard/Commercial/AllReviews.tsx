import React, { useState, useEffect } from 'react';
import {
  Box,
  Text,
  useColorModeValue,
  VStack,
  HStack,
  Badge,
  Flex,
  Grid,
  Avatar,
  Icon,
  SimpleGrid,
  CircularProgress,
  IconButton,
  Image,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalBody,
  useDisclosure
} from '@chakra-ui/react';
import {
  StandardPage,
  StandardCard,
  StandardButton,
  StandardSearchInput,
  StandardSelect
} from 'components/Design/StandardComponents';
import { useParams, useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { FiStar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { BsStar, BsStarFill, BsStarHalf } from 'react-icons/bs';
import { useSelector } from 'react-redux';
import { useGetFarmReviewsPaginatedQuery } from 'store/api/reviewApi';

const AllReviewsView = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { farmId } = useParams();
  const textColor = useColorModeValue('gray.700', 'white');

  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    product_id: '',
    min_rating: '',
    max_rating: '',
    date_from: '',
    date_to: ''
  });

  // Image modal state
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    onOpen();
  };

  const currentCompany = useSelector((state: any) => state.company.currentCompany);

  // API call for paginated reviews
  const {
    data: reviewsPaginatedData,
    isLoading,
    isUninitialized,
    error
  } = useGetFarmReviewsPaginatedQuery(
    {
      establishment_id: farmId,
      company_id: currentCompany?.id,
      page: currentPage,
      page_size: 10,
      ...filters
    },
    {
      skip: !farmId || !currentCompany?.id
    }
  );

  const reviewsData = reviewsPaginatedData?.results || [];
  const totalCount = reviewsPaginatedData?.count || 0;
  const totalPages = Math.ceil(totalCount / 10);

  const handleBack = () => {
    navigate(`/admin/dashboard/farm/${farmId}/commercial`);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => {
      const starIndex = index + 1;
      return (
        <Icon
          key={index}
          as={rating >= starIndex ? BsStarFill : rating > starIndex - 0.5 ? BsStarHalf : BsStar}
          w={{ base: '12px', md: '16px' }}
          h={{ base: '12px', md: '16px' }}
          color="yellow.400"
        />
      );
    });
  };

  // Create unique products with both ID and name for proper filtering
  const uniqueProducts = reviewsData
    .filter((review) => review.product && review.product_id)
    .reduce((acc, review) => {
      const existing = acc.find((p) => p.id === review.product_id);
      if (!existing) {
        acc.push({ id: review.product_id, name: review.product });
      }
      return acc;
    }, []);
  const averageRating =
    reviewsData.length > 0
      ? reviewsData.reduce((acc, review) => acc + review.rating, 0) / reviewsData.length
      : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviewsData.filter((review) => review.rating === rating).length,
    percentage:
      reviewsData.length > 0
        ? (reviewsData.filter((review) => review.rating === rating).length / reviewsData.length) *
          100
        : 0
  }));

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  return (
    <StandardPage
      title={intl.formatMessage({ id: 'commercial.allReviewsTitle' })}
      description={intl.formatMessage({ id: 'commercial.allReviewsDescription' })}
      showBackButton
      onBack={handleBack}>
      {/* Filters Section */}
      <StandardCard
        title={intl.formatMessage({ id: 'commercial.searchFilters' })}
        variant="outline"
        padding={{ base: 0, md: 4 }}>
        <VStack spacing={{ base: 3, md: 4 }}>
          <Box w="100%">
            <StandardSearchInput
              placeholder={intl.formatMessage({ id: 'commercial.searchReviewsPlaceholder' })}
              value={filters.search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleFilterChange('search', e.target.value)
              }
            />
          </Box>

          <SimpleGrid columns={{ base: 2, md: 3 }} spacing={{ base: 3, md: 4 }} w="100%">
            <StandardSelect
              placeholder={intl.formatMessage({ id: 'commercial.allProducts' })}
              value={filters.product_id}
              onChange={(e) => handleFilterChange('product_id', e.target.value)}>
              {uniqueProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </StandardSelect>

            <StandardSelect
              placeholder={intl.formatMessage({ id: 'commercial.allRatings' })}
              value={filters.min_rating}
              onChange={(e) => handleFilterChange('min_rating', e.target.value)}>
              <option value="5">⭐⭐⭐⭐⭐ (5)</option>
              <option value="4">⭐⭐⭐⭐ (4)</option>
              <option value="3">⭐⭐⭐ (3)</option>
              <option value="2">⭐⭐ (2)</option>
              <option value="1">⭐ (1)</option>
            </StandardSelect>

            <StandardButton
              variant="outline"
              onClick={() => {
                setFilters({
                  search: '',
                  product_id: '',
                  min_rating: '',
                  max_rating: '',
                  date_from: '',
                  date_to: ''
                });
                setCurrentPage(1);
              }}
              size="sm">
              {intl.formatMessage({ id: 'commercial.clearFilters' })}
            </StandardButton>
          </SimpleGrid>
        </VStack>
      </StandardCard>

      {/* Stats Section */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={{ base: 4, md: 6 }}>
        {/* Overall Stats */}
        <StandardCard
          title={intl.formatMessage({ id: 'commercial.generalStats' })}
          variant="elevated"
          padding={{ base: 0, md: 4 }}>
          <VStack spacing={{ base: 2, md: 4 }} align="stretch">
            <HStack justify="space-between">
              <VStack align="start" spacing={0}>
                <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="green.700">
                  {averageRating.toFixed(1)}
                </Text>
                <HStack spacing={0.5}>{renderStars(averageRating)}</HStack>
                <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">
                  {intl.formatMessage({ id: 'commercial.totalReviews' }, { count: totalCount })}
                </Text>
              </VStack>

              <VStack align="end" spacing={1}>
                <HStack spacing={{ base: 3, md: 4 }}>
                  <Box textAlign="center">
                    <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="bold" color="blue.600">
                      {reviewsData.filter((r) => r.verified_purchase).length}
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                      {intl.formatMessage({ id: 'commercial.verified' })}
                    </Text>
                  </Box>
                  <Box textAlign="center">
                    <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="bold" color="purple.600">
                      {Math.round(
                        reviewsData.reduce((acc, r) => acc + r.helpful_count, 0) /
                          reviewsData.length
                      ) || 0}
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                      {intl.formatMessage({ id: 'commercial.averageHelpful' })}
                    </Text>
                  </Box>
                </HStack>
              </VStack>
            </HStack>
          </VStack>
        </StandardCard>

        {/* Rating Distribution */}
        <StandardCard
          title={intl.formatMessage({ id: 'commercial.ratingDistribution' })}
          variant="elevated"
          padding={{ base: 0, md: 4 }}>
          <VStack spacing={{ base: 2, md: 3 }} align="stretch">
            {ratingDistribution.map((item) => (
              <HStack key={item.rating} spacing={2}>
                <HStack spacing={1} minW={{ base: '40px', md: '80px' }}>
                  <Text fontSize={{ base: 'xs', md: 'sm' }} fontWeight="medium">
                    {item.rating}
                  </Text>
                  <Icon
                    as={BsStarFill}
                    w={{ base: '10px', md: '12px' }}
                    h={{ base: '10px', md: '12px' }}
                    color="yellow.400"
                  />
                </HStack>
                <Box flex={1} bg="gray.200" borderRadius="full" h={{ base: '6px', md: '8px' }}>
                  <Box
                    bg="green.500"
                    h="100%"
                    borderRadius="full"
                    w={`${item.percentage}%`}
                    transition="width 0.3s"
                  />
                </Box>
                <Text
                  fontSize={{ base: 'xs', md: 'sm' }}
                  color="gray.600"
                  minW={{ base: '25px', md: '40px' }}
                  textAlign="right">
                  {item.count}
                </Text>
              </HStack>
            ))}
          </VStack>
        </StandardCard>
      </Grid>

      {/* Reviews List */}
      <StandardCard
        title={intl.formatMessage({ id: 'commercial.reviewsCount' }, { count: totalCount })}
        variant="elevated"
        padding={{ base: 0, md: 4 }}>
        <VStack spacing={{ base: 3, md: 6 }} align="stretch">
          {/* `isUninitialized` — see AllScans: skipped is not the same as "answered, empty". */}
          {isLoading || isUninitialized ? (
            <Flex justify="center" align="center" py={12}>
              <CircularProgress isIndeterminate color="green.700" size="40px" />
            </Flex>
          ) : error ? (
            <Flex justify="center" align="center" py={12}>
              <Text color="red.700">
                {intl.formatMessage({ id: 'commercial.errorLoadingReviews' })}
              </Text>
            </Flex>
          ) : reviewsData.length > 0 ? (
            <>
              {reviewsData.map((review) => (
                <Box
                  key={review.id}
                  p={{ base: 3, md: 6 }}
                  borderRadius="xl"
                  border="1px solid"
                  borderColor="gray.200"
                  bg="white"
                  _hover={{ boxShadow: 'md', borderColor: 'green.200' }}
                  transition="all 0.2s">
                  <VStack spacing={{ base: 2, md: 4 }} align="stretch">
                    {/* Review Header */}
                    <Flex
                      justify="space-between"
                      align={{ base: 'flex-start', md: 'center' }}
                      direction={{ base: 'column', sm: 'row' }}
                      gap={{ base: 2, md: 0 }}>
                      <HStack spacing={2}>
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
                          <HStack spacing={1}>
                            <Text
                              fontSize={{ base: 'xs', md: 'md' }}
                              fontWeight="semibold"
                              color={textColor}
                              noOfLines={1}>
                              {review.user ||
                                intl.formatMessage({ id: 'commercial.anonymousUser' })}
                            </Text>
                            {review.verified_purchase && (
                              <Badge colorScheme="green" fontSize="xs">
                                {intl.formatMessage({ id: 'commercial.verifiedPurchase' })}
                              </Badge>
                            )}
                          </HStack>
                          <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.500" noOfLines={1}>
                            {review.date} •{' '}
                            {review.location ||
                              intl.formatMessage({ id: 'commercial.unknownLocation' })}
                          </Text>
                        </VStack>
                      </HStack>
                      <VStack
                        align={{ base: 'flex-start', sm: 'flex-end' }}
                        spacing={0}
                        flexShrink={0}>
                        <HStack spacing={0.5}>{renderStars(review.rating)}</HStack>
                        <Text fontSize="xs" color="gray.500">
                          {intl.formatMessage(
                            { id: 'commercial.helpfulCount' },
                            { count: review.helpful_count || 0 }
                          )}
                        </Text>
                      </VStack>
                    </Flex>

                    {/* Review Content */}
                    <VStack align="stretch" spacing={{ base: 1, md: 3 }}>
                      <Text
                        fontSize={{ base: 'sm', md: 'md' }}
                        fontWeight="semibold"
                        color={textColor}>
                        {review.headline || intl.formatMessage({ id: 'commercial.noTitle' })}
                      </Text>
                      <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" lineHeight="1.5">
                        {review.written_review ||
                          intl.formatMessage({ id: 'commercial.noComments' })}
                      </Text>

                      {/* Review Images */}
                      {review.images && review.images.length > 0 && (
                        <HStack spacing={2} pt={1}>
                          {review.images.slice(0, 4).map((imageUrl: string, imgIndex: number) => (
                            <Box
                              key={imgIndex}
                              position="relative"
                              cursor="pointer"
                              onClick={() => handleImageClick(imageUrl)}
                              borderRadius="lg"
                              overflow="hidden"
                              transition="all 0.2s"
                              _hover={{ transform: 'scale(1.05)', boxShadow: 'md' }}>
                              <Image
                                src={imageUrl}
                                alt={intl.formatMessage(
                                  { id: 'commercial.reviewImageAlt' },
                                  { number: imgIndex + 1 }
                                )}
                                w={{ base: '60px', md: '80px' }}
                                h={{ base: '60px', md: '80px' }}
                                objectFit="cover"
                                borderRadius="lg"
                                border="1px solid"
                                borderColor="gray.200"
                              />
                              {imgIndex === 3 && review.images.length > 4 && (
                                <Flex
                                  position="absolute"
                                  top={0}
                                  left={0}
                                  right={0}
                                  bottom={0}
                                  bg="blackAlpha.600"
                                  align="center"
                                  justify="center"
                                  borderRadius="lg">
                                  <Text color="white" fontWeight="bold" fontSize="xs">
                                    +{review.images.length - 4}
                                  </Text>
                                </Flex>
                              )}
                            </Box>
                          ))}
                        </HStack>
                      )}

                      <HStack
                        spacing={{ base: 2, md: 4 }}
                        fontSize="xs"
                        color="gray.500"
                        flexWrap="wrap">
                        <Text>
                          {intl.formatMessage(
                            { id: 'commercial.productLabel' },
                            { name: review.product || 'N/A' }
                          )}
                        </Text>
                        <Text>•</Text>
                        <Text>
                          {intl.formatMessage(
                            { id: 'commercial.parcelLabel' },
                            { name: review.parcel || 'N/A' }
                          )}
                        </Text>
                      </HStack>
                    </VStack>
                  </VStack>
                </Box>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <Flex justify="space-between" align="center" w="100%" pt={4}>
                  <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">
                    {intl.formatMessage(
                      { id: 'commercial.pageInfo' },
                      { current: currentPage, total: totalPages, count: totalCount }
                    )}
                  </Text>
                  <HStack spacing={2}>
                    <IconButton
                      icon={<FiChevronLeft />}
                      aria-label={intl.formatMessage({ id: 'commercial.previousPage' })}
                      size="sm"
                      variant="outline"
                      onClick={() => handlePageChange(currentPage - 1)}
                      isDisabled={currentPage === 1}
                    />
                    <Text fontSize="sm" px={3}>
                      {currentPage}
                    </Text>
                    <IconButton
                      icon={<FiChevronRight />}
                      aria-label={intl.formatMessage({ id: 'commercial.nextPage' })}
                      size="sm"
                      variant="outline"
                      onClick={() => handlePageChange(currentPage + 1)}
                      isDisabled={currentPage === totalPages}
                    />
                  </HStack>
                </Flex>
              )}
            </>
          ) : (
            <Flex justify="center" align="center" py={12}>
              <VStack spacing={3}>
                <Text color="gray.500" fontSize="lg" fontWeight="medium">
                  {intl.formatMessage({ id: 'commercial.noReviewsFound' })}
                </Text>
                <Text color="gray.400" fontSize="sm">
                  {intl.formatMessage({ id: 'commercial.adjustFilters' })}
                </Text>
              </VStack>
            </Flex>
          )}
        </VStack>
      </StandardCard>

      {/* Image Lightbox Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="4xl" isCentered>
        <ModalOverlay bg="blackAlpha.800" />
        <ModalContent bg="transparent" boxShadow="none" maxW="90vw">
          <ModalCloseButton color="white" size="lg" top={4} right={4} zIndex={10} />
          <ModalBody p={0} display="flex" alignItems="center" justifyContent="center">
            {selectedImage && (
              <Image
                src={selectedImage}
                alt={intl.formatMessage({ id: 'commercial.reviewImageFullAlt' })}
                maxH="85vh"
                maxW="90vw"
                objectFit="contain"
                borderRadius="xl"
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </StandardPage>
  );
};

export default AllReviewsView;
