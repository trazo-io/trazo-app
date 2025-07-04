import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  Tbody,
  Text,
  Th,
  Thead,
  Tr,
  Td,
  useColorModeValue,
  VStack,
  HStack,
  Input,
  Select,
  Badge,
  Flex,
  InputGroup,
  InputLeftElement,
  Button,
  Spinner,
  IconButton,
  SimpleGrid,
  Tooltip
} from '@chakra-ui/react';
import { StandardPage, StandardCard, StandardButton } from 'components/Design/StandardComponents';
import { useParams, useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { FiSearch, FiCalendar, FiArrowLeft, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { useGetEstablishmentScansPaginatedQuery } from 'store/api/historyApi';

const AllScansView = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { establishmentId } = useParams();
  const textColor = useColorModeValue('gray.700', 'white');

  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    product_id: '',
    date_from: '',
    date_to: '',
    parcel_id: ''
  });

  const currentCompany = useSelector((state: any) => state.company.currentCompany);

  // API call for paginated scans
  const {
    data: scansPaginatedData,
    isLoading,
    error
  } = useGetEstablishmentScansPaginatedQuery(
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

  const scansData = scansPaginatedData?.results || [];
  const totalCount = scansPaginatedData?.count || 0;
  const totalPages = Math.ceil(totalCount / 10);

  const handleBack = () => {
    navigate(`/admin/dashboard/establishment/${establishmentId}/commercial`);
  };

  // Create unique products with both ID and name for proper filtering
  const uniqueProducts = scansData
    .filter((scan) => scan.product && scan.product_id)
    .reduce((acc, scan) => {
      const existing = acc.find((p) => p.id === scan.product_id);
      if (!existing) {
        acc.push({ id: scan.product_id, name: scan.product });
      }
      return acc;
    }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  return (
    <StandardPage
      title="Todos los Escaneos"
      description="Vista completa de todos los escaneos de QR realizados en tu establecimiento"
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
                  placeholder="Buscar por producto, ubicación o usuario..."
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
          </HStack>

          <HStack spacing={4} w="100%" wrap="wrap">
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700">
                Fecha desde:
              </Text>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                borderRadius="lg"
                bg="white"
                _focus={{
                  borderColor: 'green.400',
                  boxShadow: '0 0 0 1px rgb(72, 187, 120)'
                }}
              />
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700">
                Fecha hasta:
              </Text>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                borderRadius="lg"
                bg="white"
                _focus={{
                  borderColor: 'green.400',
                  boxShadow: '0 0 0 1px rgb(72, 187, 120)'
                }}
              />
            </Box>

            <Box>
              <StandardButton
                variant="outline"
                onClick={() => {
                  setFilters({
                    search: '',
                    product_id: '',
                    date_from: '',
                    date_to: '',
                    parcel_id: ''
                  });
                  setCurrentPage(1);
                }}
                size="sm"
              >
                Limpiar Filtros
              </StandardButton>
            </Box>
          </HStack>
        </VStack>
      </StandardCard>

      {/* Stats Section */}
      <StandardCard title="Estadísticas" variant="outline">
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
          <Box textAlign="center" p={4}>
            <Text fontSize="3xl" fontWeight="bold" color="green.600">
              {totalCount}
            </Text>
            <Text fontSize="sm" color="gray.600" fontWeight="medium">
              Escaneos Totales
            </Text>
          </Box>
          <Box textAlign="center" p={4}>
            <Text fontSize="3xl" fontWeight="bold" color="blue.600">
              {scansData.filter((scan) => scan.user !== 'Anonymous').length}
            </Text>
            <Text fontSize="sm" color="gray.600" fontWeight="medium">
              Usuarios Registrados
            </Text>
          </Box>
          <Box textAlign="center" p={4}>
            <Text fontSize="3xl" fontWeight="bold" color="purple.600">
              {Math.round(
                scansData.reduce((acc, scan) => acc + (scan.carbon_score || 0), 0) /
                  scansData.length
              ) || 0}
            </Text>
            <Text fontSize="sm" color="gray.600" fontWeight="medium">
              Score Promedio
            </Text>
          </Box>
        </SimpleGrid>
      </StandardCard>

      {/* Scans Table */}
      <StandardCard title={`Escaneos (${totalCount})`} variant="elevated">
        <VStack spacing={4}>
          <Box
            overflowX="auto"
            w="100%"
            borderRadius="xl"
            border="1px solid"
            borderColor="gray.200"
          >
            <Table variant="simple" size="md">
              <Thead bg="gray.50">
                <Tr>
                  <Th color="gray.700" fontWeight="semibold" fontSize="sm" py={4}>
                    Fecha
                  </Th>
                  <Th color="gray.700" fontWeight="semibold" fontSize="sm" py={4}>
                    Producto
                  </Th>
                  <Th color="gray.700" fontWeight="semibold" fontSize="sm" py={4}>
                    Ubicación
                  </Th>
                  <Th color="gray.700" fontWeight="semibold" fontSize="sm" py={4}>
                    Parcela
                  </Th>
                  <Th color="gray.700" fontWeight="semibold" fontSize="sm" py={4}>
                    Usuario
                  </Th>
                  <Th color="gray.700" fontWeight="semibold" fontSize="sm" py={4}>
                    Score CO2
                  </Th>
                  <Th color="gray.700" fontWeight="semibold" fontSize="sm" py={4}>
                    Comentario
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {isLoading ? (
                  <Tr>
                    <Td colSpan={7} textAlign="center" py={8}>
                      <HStack justify="center" spacing={3}>
                        <Spinner size="md" color="green.500" />
                        <Text color="gray.500">Cargando escaneos...</Text>
                      </HStack>
                    </Td>
                  </Tr>
                ) : error ? (
                  <Tr>
                    <Td colSpan={7} textAlign="center" py={8}>
                      <Text color="red.500">Error al cargar los escaneos</Text>
                    </Td>
                  </Tr>
                ) : scansData.length > 0 ? (
                  scansData.map((scan) => (
                    <Tr
                      key={scan.id}
                      _hover={{ bg: 'green.50' }}
                      transition="background-color 0.2s"
                    >
                      <Td>
                        <Text fontSize="sm" fontWeight="medium">
                          {scan.date ? new Date(scan.date).toLocaleDateString() : 'N/A'}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {scan.date ? new Date(scan.date).toLocaleTimeString() : ''}
                        </Text>
                      </Td>
                      <Td>
                        <Text fontSize="sm" fontWeight="medium" color={textColor}>
                          {scan.product || 'N/A'}
                        </Text>
                      </Td>
                      <Td>
                        <Text fontSize="sm" color={textColor}>
                          {scan.location || 'Desconocida'}
                        </Text>
                      </Td>
                      <Td>
                        <Text fontSize="sm" color={textColor}>
                          {scan.parcel || 'N/A'}
                        </Text>
                      </Td>
                      <Td>
                        <HStack spacing={2}>
                          <Text fontSize="sm" color={textColor}>
                            {scan.user || 'Anonymous'}
                          </Text>
                          {(!scan.user || scan.user === 'Anonymous') && (
                            <Badge colorScheme="gray" size="sm">
                              Anónimo
                            </Badge>
                          )}
                        </HStack>
                      </Td>
                      <Td>
                        <Badge
                          colorScheme={
                            (scan.carbon_score || 0) >= 80
                              ? 'green'
                              : (scan.carbon_score || 0) >= 60
                              ? 'yellow'
                              : 'red'
                          }
                          variant="solid"
                        >
                          {scan.carbon_score || 0}
                        </Badge>
                      </Td>
                      <Td maxW="200px">
                        {scan.comment && scan.comment.length > 50 ? (
                          <Tooltip label={scan.comment} placement="top" hasArrow>
                            <Text fontSize="sm" color={textColor} noOfLines={2} cursor="help">
                              {scan.comment.substring(0, 50)}...
                            </Text>
                          </Tooltip>
                        ) : (
                          <Text
                            fontSize="sm"
                            color={scan.comment ? textColor : 'gray.400'}
                            fontStyle={scan.comment ? 'normal' : 'italic'}
                          >
                            {scan.comment || 'Sin comentarios'}
                          </Text>
                        )}
                      </Td>
                    </Tr>
                  ))
                ) : (
                  <Tr>
                    <Td colSpan={7} textAlign="center" py={12}>
                      <VStack spacing={3}>
                        <Text color="gray.500" fontSize="lg" fontWeight="medium">
                          No se encontraron escaneos
                        </Text>
                        <Text color="gray.400" fontSize="sm">
                          Ajusta los filtros para ver más resultados
                        </Text>
                      </VStack>
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </Box>

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
        </VStack>
      </StandardCard>
    </StandardPage>
  );
};

export default AllScansView;
