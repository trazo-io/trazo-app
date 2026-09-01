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
import {
  FaQrcode,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaEye,
  FaChevronRight,
  FaChevronLeft
} from 'react-icons/fa';
import { format } from 'date-fns';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  StandardPage,
  StandardCard,
  StandardPageLoading,
  StandardQueryError
} from '../../../components/Design/StandardComponents';
import { useGetUserProductionScansQuery } from 'store/api/historyApi';

const ITEMS_PER_PAGE = 10;

export default function AllScans() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  // API query for data
  // `isError` read, not dropped: without it a failed request left `productions` undefined
  // and the screen told the user they have no scans — a claim only a 200 can license.
  const {
    data: productions,
    isLoading,
    isError,
    isFetching,
    refetch
  } = useGetUserProductionScansQuery();

  // Calculate pagination
  const totalCount = productions?.length || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedData = productions?.slice(startIndex, endIndex) || [];

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Calculate transparency based on documented events
  const getTransparencyInfo = (production: any) => {
    const eventsCount = production.events_count || production.total_events || 0;
    const hasVerification = production.is_verified || production.blockchain_verified;
    const hasPhotos = production.images?.length > 0 || production.photo_count > 0;

    // Documentation FACTS only — no derived tier. Same removal as CarbonJourney/index.tsx:
    // a threshold-keyed green/blue/gray ladder is a wordless self-assigned grade on a
    // consumer surface (ECGT 2024/825, FTC 16 CFR 260.6). The event count stays; the colour
    // is constant so it ranks nothing.
    return { eventsCount, color: 'gray', hasVerification, hasPhotos };
  };

  return (
    <StandardPage
      title="All Product Scans"
      description="Complete history of products you've scanned"
      showBackButton
      onBack={() => navigate('/admin/dashboard/journey')}>
      <StandardCard title={`Product Scans (${totalCount})`} variant="elevated">
        <VStack spacing={3}>
          {isLoading ? (
            <StandardPageLoading />
          ) : isError ? (
            <StandardQueryError onRetry={refetch} isRetrying={isFetching} />
          ) : paginatedData.length > 0 ? (
            <>
              {paginatedData.map((production: any, index: number) => {
                const transparencyInfo = getTransparencyInfo(production);
                const productName =
                  typeof production.product === 'object'
                    ? production.product?.name || 'Unknown Product'
                    : production.product || 'Unknown Product';
                const farmName =
                  production.establishment_name ||
                  production.parcel?.establishment?.name ||
                  production.establishment?.name ||
                  'Unknown Farm';
                const scanDate =
                  production.date && !isNaN(new Date(production.date).getTime())
                    ? format(new Date(production.date), 'MMM dd, yyyy')
                    : production.scanned_at
                    ? format(new Date(production.scanned_at), 'MMM dd, yyyy')
                    : 'Recently';

                return (
                  <NavLink
                    key={production.id || index}
                    to={`/production/${production.public_id}/`}
                    style={{ width: '100%' }}>
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
                      transition="all 0.2s">
                      <VStack spacing={4} align="stretch">
                        {/* Header with Image and Title */}
                        <Flex justify="space-between" align="center">
                          <HStack spacing={3}>
                            {/* Product Image */}
                            {production.images?.length > 0 ? (
                              <Image
                                src={production.images[0]}
                                w="56px"
                                h="56px"
                                borderRadius="xl"
                                objectFit="cover"
                                border="2px solid"
                                borderColor="green.100"
                              />
                            ) : (
                              <Circle
                                size="56px"
                                bg="green.50"
                                border="2px solid"
                                borderColor="green.100">
                                <Icon as={FaQrcode} color="green.500" boxSize={5} />
                              </Circle>
                            )}
                            <VStack align="start" spacing={0}>
                              <Text
                                fontWeight="semibold"
                                fontSize="md"
                                color="gray.800"
                                noOfLines={1}>
                                {productName}
                              </Text>
                              <Text fontSize="sm" color="gray.500">
                                {scanDate}
                              </Text>
                            </VStack>
                          </HStack>
                          <Icon as={FaChevronRight} color="gray.400" boxSize={4} />
                        </Flex>

                        {/* Content */}
                        <VStack align="stretch" spacing={3}>
                          <HStack spacing={1}>
                            <Icon as={FaMapMarkerAlt} color="gray.400" boxSize={3} />
                            <Text fontSize="sm" color="gray.600" noOfLines={1}>
                              {farmName}
                            </Text>
                          </HStack>

                          {/* Badges Row */}
                          <HStack spacing={2} flexWrap="wrap">
                            <Badge
                              colorScheme={transparencyInfo.color}
                              variant="subtle"
                              fontSize="xs"
                              px={2}
                              py={0.5}
                              borderRadius="full">
                              <HStack spacing={1}>
                                <Icon as={FaEye} boxSize={2.5} />
                                <Text>
                                  {transparencyInfo.eventsCount > 0
                                    ? `${transparencyInfo.eventsCount} ${
                                        transparencyInfo.eventsCount === 1 ? 'event' : 'events'
                                      }`
                                    : 'View'}
                                </Text>
                              </HStack>
                            </Badge>
                            {transparencyInfo.hasVerification && (
                              <Badge
                                colorScheme="green"
                                variant="outline"
                                fontSize="xs"
                                px={2}
                                py={0.5}
                                borderRadius="full">
                                <HStack spacing={1}>
                                  <Icon as={FaCheckCircle} boxSize={2.5} />
                                  <Text>Verified</Text>
                                </HStack>
                              </Badge>
                            )}
                            {transparencyInfo.hasPhotos && (
                              <Badge
                                colorScheme="blue"
                                variant="outline"
                                fontSize="xs"
                                px={2}
                                py={0.5}
                                borderRadius="full">
                                Photos
                              </Badge>
                            )}
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
                    Page {currentPage} of {totalPages} ({totalCount} total scans)
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
                <Icon as={FaQrcode} color="gray.400" boxSize={6} />
              </Circle>
              <Text color="gray.600" fontWeight="medium" mb={2}>
                No scans yet
              </Text>
              <Text color="gray.500" fontSize="sm">
                Scan a product QR code to start your transparency journey
              </Text>
            </Box>
          )}
        </VStack>
      </StandardCard>
    </StandardPage>
  );
}
