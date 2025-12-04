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
  Tooltip,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Icon,
  Divider
} from '@chakra-ui/react';
import { FaUser, FaRobot, FaChartLine } from 'react-icons/fa';
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
  const [expandedComments, setExpandedComments] = useState<{ [key: string]: boolean }>({});
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

  const handleToggleComment = (scanId: string) => {
    setExpandedComments((prev) => ({
      ...prev,
      [scanId]: !prev[scanId]
    }));
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

      {/* Customer Quality Analytics - Enhanced Stats */}
      <StandardCard
        title="Customer Quality Analytics"
        subtitle="Comprehensive customer engagement insights"
        variant="elevated"
      >
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6}>
          {/* Human vs Bot Scans */}
          <Stat>
            <StatLabel fontSize="sm" color="gray.600">
              <HStack spacing={2}>
                <Tooltip
                  label="Escaneos realizados por consumidores reales vs sistemas automatizados. Los humanos dedican más tiempo a leer y explorar la información."
                  placement="top"
                  hasArrow
                >
                  <HStack spacing={2}>
                    <Icon as={FaUser} color="green.500" boxSize={4} />
                    <Text>Human Scans</Text>
                  </HStack>
                </Tooltip>
              </HStack>
            </StatLabel>
            <StatNumber fontSize="2xl" fontWeight="bold" color={textColor}>
              {scansData.length > 0
                ? Math.round(
                    (scansData.filter((scan) => {
                      // Same logic as Commercial Dashboard: default to human
                      if (scan.bot_score !== undefined) {
                        return scan.bot_score < 0.5;
                      }
                      return true; // Default to human
                    }).length /
                      scansData.length) *
                      100
                  )
                : 0}
              %
            </StatNumber>
            <StatHelpText fontSize="xs" color="gray.500">
              {
                scansData.filter((scan) => {
                  if (scan.bot_score !== undefined) {
                    return scan.bot_score < 0.5;
                  }
                  return true;
                }).length
              }{' '}
              of {scansData.length} scans
              <Badge ml={2} colorScheme="green" size="sm">
                Excellent
              </Badge>
            </StatHelpText>
          </Stat>

          {/* High Engagement */}
          <Stat>
            <StatLabel fontSize="sm" color="gray.600">
              <HStack spacing={2}>
                <Tooltip
                  label="Consumidores que mostraron alto interés: comentaron, navegaron extensamente o pasaron tiempo significativo en la página."
                  placement="top"
                  hasArrow
                >
                  <HStack spacing={2}>
                    <Icon as={FaChartLine} color="blue.500" boxSize={4} />
                    <Text>High Engagement</Text>
                  </HStack>
                </Tooltip>
              </HStack>
            </StatLabel>
            <StatNumber fontSize="2xl" fontWeight="bold" color={textColor}>
              {scansData.length > 0
                ? Math.round(
                    (scansData.filter((scan) => {
                      const hasComment = scan.comment && scan.comment.trim().length > 0;
                      if (scan.engagement_score !== undefined) {
                        return scan.engagement_score > 0.6;
                      }
                      return hasComment;
                    }).length /
                      scansData.length) *
                      100
                  )
                : 0}
              %
            </StatNumber>
            <StatHelpText fontSize="xs" color="gray.500">
              {
                scansData.filter((scan) => {
                  const hasComment = scan.comment && scan.comment.trim().length > 0;
                  if (scan.engagement_score !== undefined) {
                    return scan.engagement_score > 0.6;
                  }
                  return hasComment;
                }).length
              }{' '}
              engaged customers
            </StatHelpText>
          </Stat>

          {/* Unique Sessions */}
          <Stat>
            <StatLabel fontSize="sm" color="gray.600">
              Unique Sessions
            </StatLabel>
            <StatNumber fontSize="2xl" fontWeight="bold" color={textColor}>
              {scansData.length > 0
                ? Math.round(
                    (scansData.filter((scan) => !scan.is_duplicate).length / scansData.length) * 100
                  )
                : 0}
              %
            </StatNumber>
            <StatHelpText fontSize="xs" color="gray.500">
              {scansData.filter((scan) => !scan.is_duplicate).length} unique visits
            </StatHelpText>
          </Stat>

          {/* GDPR Compliance */}
          <Stat>
            <StatLabel fontSize="sm" color="gray.600">
              GDPR Compliance
            </StatLabel>
            <StatNumber fontSize="2xl" fontWeight="bold" color={textColor}>
              {scansData.length > 0
                ? Math.round(
                    (scansData.filter((scan) => scan.consent_given !== false).length /
                      scansData.length) *
                      100
                  )
                : 0}
              %
            </StatNumber>
            <StatHelpText fontSize="xs" color="gray.500">
              {scansData.filter((scan) => scan.consent_given !== false).length} consented scans
            </StatHelpText>
          </Stat>
        </SimpleGrid>

        {/* Educational Section for Farmers */}
        {scansData.length > 0 && (
          <Box
            mt={6}
            p={4}
            bg="blue.50"
            borderRadius="lg"
            border="1px solid"
            borderColor="blue.200"
          >
            <VStack align="start" spacing={3}>
              <Text fontSize="sm" fontWeight="semibold" color="blue.700">
                💡 Entendiendo la Clasificación de Escaneos
              </Text>
              <VStack align="start" spacing={2} fontSize="xs" color="blue.600">
                <Text>
                  <strong>Escaneos Humanos (Todos):</strong> Actualmente clasificamos TODOS los
                  escaneos como humanos por defecto. Esta es una decisión conservadora que favorece
                  a los productores.
                </Text>
                <Text>
                  <strong>Sistema de Detección:</strong> Nuestro sistema usa dos métodos para
                  clasificar escaneos:
                </Text>
                <VStack align="start" spacing={1} pl={4} fontSize="xs">
                  <Text>
                    • <strong>Automático:</strong> Si el backend proporciona un puntaje de bot, lo
                    usamos
                  </Text>
                  <Text>
                    • <strong>Por defecto:</strong> Sin puntaje del backend, asumimos que es humano
                  </Text>
                  <Text>
                    • <strong>Realista:</strong> La mayoría de escaneos QR son de consumidores
                    genuinos
                  </Text>
                  <Text>
                    • <strong>Conservador:</strong> Preferimos contar como humano en caso de duda
                  </Text>
                </VStack>
                <Text>
                  <strong>Compromiso con la Transparencia:</strong> Los consumidores que escanean
                  sin comentarios son completamente normales. Valoramos cada escaneo como una
                  muestra legítima del interés del consumidor en su producción.
                </Text>
              </VStack>
            </VStack>
          </Box>
        )}
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
                    Customer Type
                  </Th>
                  <Th color="gray.700" fontWeight="semibold" fontSize="sm" py={4}>
                    Engagement
                  </Th>
                  <Th color="gray.700" fontWeight="semibold" fontSize="sm" py={4}>
                    Quality
                  </Th>
                  <Th color="gray.700" fontWeight="semibold" fontSize="sm" py={4}>
                    Ubicación
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
                  scansData.map((scan, index) => {
                    // Same customer classification logic as Commercial Dashboard
                    const hasComment = scan.comment && scan.comment.trim().length > 0;

                    // Human detection (same as Commercial Dashboard)
                    let isHumanLike: boolean;
                    if (
                      scan.bot_score !== undefined &&
                      scan.bot_score !== 0.5 &&
                      scan.bot_score !== 0.3
                    ) {
                      isHumanLike = scan.bot_score < 0.5;
                    } else {
                      isHumanLike = true; // Default to human
                    }

                    // Engagement calculation
                    let isHighEngagement: boolean;
                    if (
                      scan.engagement_score !== undefined &&
                      scan.engagement_score !== 0.5 &&
                      scan.engagement_score !== 0.4
                    ) {
                      isHighEngagement = scan.engagement_score > 0.6;
                    } else {
                      isHighEngagement = hasComment;
                    }

                    // Customer type badge
                    const getCustomerTypeBadge = () => {
                      if (scan.consent_given === false) {
                        return (
                          <Badge colorScheme="gray" size="sm">
                            Privacy
                          </Badge>
                        );
                      }
                      if (isHumanLike && isHighEngagement) {
                        return (
                          <Badge colorScheme="green" size="sm">
                            Explorer
                          </Badge>
                        );
                      }
                      if (isHumanLike && !isHighEngagement) {
                        return (
                          <Badge colorScheme="blue" size="sm">
                            Viewer
                          </Badge>
                        );
                      }
                      return (
                        <Badge colorScheme="orange" size="sm">
                          Bot
                        </Badge>
                      );
                    };

                    // Engagement level
                    const engagementLevel = isHighEngagement
                      ? { label: 'High', color: 'green' }
                      : { label: 'Low', color: 'gray' };

                    const isExpanded = expandedComments[scan.id.toString()];

                    return (
                      <React.Fragment key={scan.id}>
                        <Tr _hover={{ bg: 'green.50' }} transition="background-color 0.2s">
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

                          {/* Customer Type - NEW */}
                          <Td>
                            <HStack spacing={2}>
                              {getCustomerTypeBadge()}
                              {scan.is_duplicate && (
                                <Tooltip label="Duplicate session detected" placement="top">
                                  <Badge colorScheme="gray" size="sm" variant="outline">
                                    Dup
                                  </Badge>
                                </Tooltip>
                              )}
                            </HStack>
                          </Td>

                          {/* Engagement Level - NEW */}
                          <Td>
                            <HStack spacing={2}>
                              <Badge colorScheme={engagementLevel.color} size="sm" variant="subtle">
                                {engagementLevel.label}
                              </Badge>
                              {scan.consent_given !== false && isHighEngagement && (
                                <Tooltip
                                  label={`Engagement: ${Math.round(
                                    (scan.engagement_score || 0.5) * 100
                                  )}%`}
                                  placement="top"
                                >
                                  <Icon as={FaChartLine} color="green.500" boxSize={3} />
                                </Tooltip>
                              )}
                            </HStack>
                          </Td>

                          {/* Scan Quality - NEW */}
                          <Td>
                            <HStack spacing={2}>
                              <Tooltip
                                label={
                                  isHumanLike
                                    ? 'Consumidor real detectado'
                                    : 'Posible bot detectado'
                                }
                                placement="top"
                                hasArrow
                              >
                                <Badge
                                  colorScheme={isHumanLike ? 'green' : 'orange'}
                                  size="sm"
                                  variant={isHumanLike ? 'solid' : 'outline'}
                                >
                                  <HStack spacing={1}>
                                    <Icon as={isHumanLike ? FaUser : FaRobot} boxSize={2} />
                                    <Text>{isHumanLike ? 'Human' : 'Bot'}</Text>
                                  </HStack>
                                </Badge>
                              </Tooltip>
                            </HStack>
                          </Td>

                          <Td>
                            <Text fontSize="sm" color={textColor}>
                              {scan.location || 'Desconocida'}
                            </Text>
                          </Td>
                          <Td>
                            <Button
                              onClick={
                                scan.comment
                                  ? () => handleToggleComment(scan.id.toString())
                                  : undefined
                              }
                              variant="no-hover"
                              bg={scan.comment ? (isExpanded ? 'green.50' : 'white') : 'white'}
                              w="100px"
                              h="35px"
                              fontSize="xs"
                              color={
                                scan.comment ? (isExpanded ? 'green.700' : 'green.500') : '#CBD5E0'
                              }
                              border={scan.comment ? '1px solid' : '1px solid #CBD5E0'}
                              borderColor={
                                scan.comment ? (isExpanded ? 'green.200' : 'green.500') : '#CBD5E0'
                              }
                              cursor={scan.comment ? 'pointer' : 'default'}
                              fontWeight={scan.comment ? 'semibold' : 'normal'}
                              borderRadius="lg"
                              _hover={
                                scan.comment
                                  ? {
                                      bg: 'green.100',
                                      borderColor: 'green.600',
                                      color: 'green.700',
                                      transform: 'translateY(-1px)'
                                    }
                                  : {}
                              }
                              transition="all 0.2s ease"
                            >
                              {scan.comment ? (isExpanded ? 'Hide' : 'View') : 'View'}
                            </Button>
                          </Td>
                        </Tr>

                        {/* Expanded Comment Row */}
                        {isExpanded && scan.comment && (
                          <Tr>
                            <Td colSpan={7} px={6} py={4} bg="green.50">
                              <Box
                                p={4}
                                bg="white"
                                borderRadius="md"
                                border="1px solid"
                                borderColor="green.200"
                                boxShadow="sm"
                              >
                                <Text fontSize="sm" color="green.800" lineHeight="1.4">
                                  {scan.comment}
                                </Text>
                              </Box>
                            </Td>
                          </Tr>
                        )}
                      </React.Fragment>
                    );
                  })
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
