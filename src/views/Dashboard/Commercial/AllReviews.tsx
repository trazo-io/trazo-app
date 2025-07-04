import React, { useState, useEffect } from 'react';
import {
  Box,
  Text,
  useColorModeValue,
  VStack,
  HStack,
  Input,
  Select,
  Badge,
  Flex,
  InputGroup,
  InputLeftElement,
  Grid,
  Avatar,
  Icon,
  SimpleGrid,
  Spinner,
  IconButton
} from '@chakra-ui/react';
import { StandardPage, StandardCard, StandardButton } from 'components/Design/StandardComponents';
import { useParams, useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { FiSearch, FiStar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { BsStar, BsStarFill, BsStarHalf } from 'react-icons/bs';
import { useSelector } from 'react-redux';
import { useGetEstablishmentReviewsPaginatedQuery } from 'store/api/reviewApi';
import avatar4 from 'assets/img/avatars/avatar4.png';

const AllReviewsView = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { establishmentId } = useParams();
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

  const currentCompany = useSelector((state: any) => state.company.currentCompany);

  // API call for paginated reviews
  const {
    data: reviewsPaginatedData,
    isLoading,
    error
  } = useGetEstablishmentReviewsPaginatedQuery(
    {
      establishment_id: establishmentId,
      company_id: currentCompany?.id,
      page: currentPage,
      page_size: 10,
      ...filters
    },
    {
      skip: !establishmentId || !currentCompany?.id
    }
  );

  const reviewsData = reviewsPaginatedData?.results || [];
  const totalCount = reviewsPaginatedData?.count || 0;
  const totalPages = Math.ceil(totalCount / 10);

  const handleBack = () => {
    navigate(`/admin/dashboard/establishment/${establishmentId}/commercial`);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => {
      const starIndex = index + 1;
      return (
        <Icon
          key={index}
          as={rating >= starIndex ? BsStarFill : rating > starIndex - 0.5 ? BsStarHalf : BsStar}
          w="16px"
          h="16px"
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
      title="Todas las Reseñas"
      description="Vista completa de todas las reseñas y comentarios de tu establecimiento"
      showBackButton
      onBack={handleBack}
    >
      {/* Filters Section */}
      <StandardCard title="Filtros de Búsqueda" variant="outline">
        <VStack spacing={4}>
          <HStack spacing={4} w="100%" wrap="wrap">
            <Box flex={1} minW="300px">
              <InputGroup size="md">
                <InputLeftElement>
                  <FiSearch color="gray.500" />
                </InputLeftElement>
                <Input
                  placeholder="Buscar por título, contenido o usuario..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  borderRadius="lg"
                  bg="white"
                  _focus={{
                    borderColor: 'green.400',
                    boxShadow: '0 0 0 1px rgb(72, 187, 120)'
                  }}
                />
              </InputGroup>
            </Box>

            <Box minW="200px">
              <Select
                placeholder="Todos los productos"
                value={filters.product_id}
                onChange={(e) => handleFilterChange('product_id', e.target.value)}
                borderRadius="lg"
                bg="white"
                _focus={{
                  borderColor: 'green.400',
                  boxShadow: '0 0 0 1px rgb(72, 187, 120)'
                }}
              >
                {uniqueProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </Select>
            </Box>

            <Box minW="150px">
              <Select
                placeholder="Todas las calificaciones"
                value={filters.min_rating}
                onChange={(e) => handleFilterChange('min_rating', e.target.value)}
                borderRadius="lg"
                bg="white"
                _focus={{
                  borderColor: 'green.400',
                  boxShadow: '0 0 0 1px rgb(72, 187, 120)'
                }}
              >
                <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                <option value="4">⭐⭐⭐⭐ (4)</option>
                <option value="3">⭐⭐⭐ (3)</option>
                <option value="2">⭐⭐ (2)</option>
                <option value="1">⭐ (1)</option>
              </Select>
            </Box>

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
              size="sm"
            >
              Limpiar Filtros
            </StandardButton>
          </HStack>
        </VStack>
      </StandardCard>

      {/* Stats Section */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
        {/* Overall Stats */}
        <StandardCard title="Estadísticas Generales" variant="elevated">
          <VStack spacing={4} align="stretch">
            <HStack justify="space-between">
              <VStack align="start" spacing={0}>
                <Text fontSize="2xl" fontWeight="bold" color="green.600">
                  {averageRating.toFixed(1)}
                </Text>
                <HStack spacing={1}>{renderStars(averageRating)}</HStack>
                <Text fontSize="sm" color="gray.600">
                  {totalCount} reseñas totales
                </Text>
              </VStack>

              <VStack align="end" spacing={1}>
                <HStack spacing={4}>
                  <Box textAlign="center">
                    <Text fontSize="lg" fontWeight="bold" color="blue.600">
                      {reviewsData.filter((r) => r.verified_purchase).length}
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                      Verificadas
                    </Text>
                  </Box>
                  <Box textAlign="center">
                    <Text fontSize="lg" fontWeight="bold" color="purple.600">
                      {Math.round(
                        reviewsData.reduce((acc, r) => acc + r.helpful_count, 0) /
                          reviewsData.length
                      ) || 0}
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                      Útiles promedio
                    </Text>
                  </Box>
                </HStack>
              </VStack>
            </HStack>
          </VStack>
        </StandardCard>

        {/* Rating Distribution */}
        <StandardCard title="Distribución de Calificaciones" variant="elevated">
          <VStack spacing={3} align="stretch">
            {ratingDistribution.map((item) => (
              <HStack key={item.rating} spacing={3}>
                <HStack spacing={1} minW="80px">
                  <Text fontSize="sm" fontWeight="medium">
                    {item.rating}
                  </Text>
                  <Icon as={BsStarFill} w="12px" h="12px" color="yellow.400" />
                </HStack>
                <Box flex={1} bg="gray.200" borderRadius="full" h="8px">
                  <Box
                    bg="green.500"
                    h="100%"
                    borderRadius="full"
                    w={`${item.percentage}%`}
                    transition="width 0.3s"
                  />
                </Box>
                <Text fontSize="sm" color="gray.600" minW="40px" textAlign="right">
                  {item.count}
                </Text>
              </HStack>
            ))}
          </VStack>
        </StandardCard>
      </Grid>

      {/* Reviews List */}
      <StandardCard title={`Reseñas (${totalCount})`} variant="elevated">
        <VStack spacing={6} align="stretch">
          {isLoading ? (
            <Flex justify="center" align="center" py={12}>
              <HStack spacing={3}>
                <Spinner size="md" color="green.500" />
                <Text color="gray.500">Cargando reseñas...</Text>
              </HStack>
            </Flex>
          ) : error ? (
            <Flex justify="center" align="center" py={12}>
              <Text color="red.500">Error al cargar las reseñas</Text>
            </Flex>
          ) : reviewsData.length > 0 ? (
            <>
              {reviewsData.map((review) => (
                <Box
                  key={review.id}
                  p={6}
                  borderRadius="xl"
                  border="1px solid"
                  borderColor="gray.200"
                  bg="white"
                  _hover={{ boxShadow: 'md', borderColor: 'green.200' }}
                  transition="all 0.2s"
                >
                  <VStack spacing={4} align="stretch">
                    {/* Review Header */}
                    <Flex justify="space-between" align="center">
                      <HStack spacing={3}>
                        <Avatar
                          src={review.user_avatar || avatar4}
                          size="md"
                          borderRadius="xl"
                          border="2px solid"
                          borderColor="green.100"
                        />
                        <VStack align="start" spacing={0}>
                          <HStack spacing={2}>
                            <Text fontSize="md" fontWeight="semibold" color={textColor}>
                              {review.user || 'Usuario Anónimo'}
                            </Text>
                            {review.verified_purchase && (
                              <Badge colorScheme="green" size="sm">
                                Compra Verificada
                              </Badge>
                            )}
                          </HStack>
                          <Text fontSize="sm" color="gray.500">
                            {review.date} • {review.location || 'Ubicación desconocida'}
                          </Text>
                        </VStack>
                      </HStack>
                      <VStack align="end" spacing={1}>
                        <HStack spacing={1}>{renderStars(review.rating)}</HStack>
                        <Text fontSize="xs" color="gray.500">
                          {review.helpful_count || 0} útiles
                        </Text>
                      </VStack>
                    </Flex>

                    {/* Review Content */}
                    <VStack align="stretch" spacing={3}>
                      <Text fontSize="md" fontWeight="semibold" color={textColor}>
                        {review.headline || 'Sin título'}
                      </Text>
                      <Text fontSize="sm" color="gray.600" lineHeight="1.6">
                        {review.written_review || 'Sin comentarios'}
                      </Text>
                      <HStack spacing={4} fontSize="xs" color="gray.500">
                        <Text>Producto: {review.product || 'N/A'}</Text>
                        <Text>•</Text>
                        <Text>Parcela: {review.parcel || 'N/A'}</Text>
                      </HStack>
                    </VStack>
                  </VStack>
                </Box>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <Flex justify="space-between" align="center" w="100%" pt={4}>
                  <Text fontSize="sm" color="gray.600">
                    Página {currentPage} de {totalPages} ({totalCount} resultados totales)
                  </Text>
                  <HStack spacing={2}>
                    <IconButton
                      icon={<FiChevronLeft />}
                      aria-label="Página anterior"
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
                      aria-label="Página siguiente"
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
                  No se encontraron reseñas
                </Text>
                <Text color="gray.400" fontSize="sm">
                  Ajusta los filtros para ver más resultados
                </Text>
              </VStack>
            </Flex>
          )}
        </VStack>
      </StandardCard>
    </StandardPage>
  );
};

export default AllReviewsView;
