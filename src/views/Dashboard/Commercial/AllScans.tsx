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
  Badge,
  Flex,
  Button,
  CircularProgress,
  IconButton,
  SimpleGrid,
  Tooltip,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Icon,
  Divider,
  Collapse,
  useDisclosure
} from '@chakra-ui/react';
import { FaUser, FaRobot, FaChartLine } from 'react-icons/fa';
import {
  StandardPage,
  StandardCard,
  StandardButton,
  StandardSearchInput,
  StandardInput,
  StandardSelect
} from 'components/Design/StandardComponents';
import { useParams, useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import {
  FiCalendar,
  FiArrowLeft,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiChevronUp
} from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { useGetFarmScansPaginatedQuery } from 'store/api/historyApi';

const AllScansView = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { farmId } = useParams();
  const textColor = useColorModeValue('gray.700', 'white');

  const { isOpen: isEducationOpen, onToggle: onEducationToggle } = useDisclosure();
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
    isUninitialized,
    error
  } = useGetFarmScansPaginatedQuery(
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

  const scansData = scansPaginatedData?.results || [];
  const totalCount = scansPaginatedData?.count || 0;
  const totalPages = Math.ceil(totalCount / 10);

  const handleBack = () => {
    navigate(`/admin/dashboard/farm/${farmId}/commercial`);
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
      title={intl.formatMessage({ id: 'commercial.allScansTitle' })}
      description={intl.formatMessage({ id: 'commercial.allScansDescription' })}
      showBackButton
      onBack={handleBack}>
      {/* Filters Section */}
      <StandardCard
        title={intl.formatMessage({ id: 'commercial.searchFilters' })}
        variant="outline">
        <VStack spacing={{ base: 3, md: 4 }}>
          <Flex direction={{ base: 'column', md: 'row' }} gap={{ base: 3, md: 4 }} w="100%">
            <Box flex={1}>
              <StandardSearchInput
                placeholder={intl.formatMessage({ id: 'commercial.searchScansPlaceholder' })}
                value={filters.search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleFilterChange('search', e.target.value)
                }
              />
            </Box>

            <Box w={{ base: '100%', md: '200px' }}>
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
            </Box>
          </Flex>

          <SimpleGrid columns={{ base: 2, md: 3 }} spacing={{ base: 3, md: 4 }} w="100%">
            <Box>
              <Text fontSize="xs" fontWeight="medium" mb={1} color="gray.700">
                {intl.formatMessage({ id: 'commercial.dateFrom' })}
              </Text>
              <StandardInput
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
              />
            </Box>

            <Box>
              <Text fontSize="xs" fontWeight="medium" mb={1} color="gray.700">
                {intl.formatMessage({ id: 'commercial.dateTo' })}
              </Text>
              <StandardInput
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
              />
            </Box>

            <Box alignSelf="flex-end">
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
                size="sm">
                {intl.formatMessage({ id: 'commercial.clearFilters' })}
              </StandardButton>
            </Box>
          </SimpleGrid>
        </VStack>
      </StandardCard>

      {/* Customer Quality Analytics - Enhanced Stats */}
      <StandardCard
        title={intl.formatMessage({ id: 'commercial.customerQualityAnalytics' })}
        subtitle={intl.formatMessage({ id: 'commercial.comprehensiveInsights' })}
        variant="elevated">
        <SimpleGrid columns={{ base: 2, md: 3 }} spacing={{ base: 3, md: 6 }}>
          {/* Human vs Bot Scans */}
          <Stat>
            <StatLabel fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">
              <Tooltip
                label={intl.formatMessage({ id: 'commercial.humanScansTooltip' })}
                placement="top"
                hasArrow>
                <HStack spacing={1.5}>
                  <Icon as={FaUser} color="green.500" boxSize={{ base: 3, md: 4 }} />
                  <Text>{intl.formatMessage({ id: 'commercial.humanScans' })}</Text>
                </HStack>
              </Tooltip>
            </StatLabel>
            <StatNumber fontSize={{ base: 'lg', md: '2xl' }} fontWeight="bold" color={textColor}>
              {scansData.length > 0
                ? Math.round(
                    (scansData.filter((scan) => {
                      if (scan.bot_score !== undefined) {
                        return scan.bot_score < 0.5;
                      }
                      return true;
                    }).length /
                      scansData.length) *
                      100
                  )
                : 0}
              %
            </StatNumber>
            <StatHelpText fontSize="xs" color="gray.500" mb={0}>
              {intl.formatMessage(
                { id: 'commercial.humanScansCount' },
                {
                  human: scansData.filter((scan) => {
                    if (scan.bot_score !== undefined) {
                      return scan.bot_score < 0.5;
                    }
                    return true;
                  }).length,
                  total: scansData.length
                }
              )}
              <Badge ml={1.5} colorScheme="green" fontSize="xs">
                {intl.formatMessage({ id: 'commercial.ratingExcellent' })}
              </Badge>
            </StatHelpText>
          </Stat>

          {/* High Engagement */}
          <Stat>
            <StatLabel fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">
              <Tooltip
                label={intl.formatMessage({ id: 'commercial.highEngagementTooltip' })}
                placement="top"
                hasArrow>
                <HStack spacing={1.5}>
                  <Icon as={FaChartLine} color="blue.500" boxSize={{ base: 3, md: 4 }} />
                  <Text>{intl.formatMessage({ id: 'commercial.highEngagement' })}</Text>
                </HStack>
              </Tooltip>
            </StatLabel>
            <StatNumber fontSize={{ base: 'lg', md: '2xl' }} fontWeight="bold" color={textColor}>
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
            <StatHelpText fontSize="xs" color="gray.500" mb={0}>
              {intl.formatMessage(
                { id: 'commercial.engagedCustomers' },
                {
                  count: scansData.filter((scan) => {
                    const hasComment = scan.comment && scan.comment.trim().length > 0;
                    if (scan.engagement_score !== undefined) {
                      return scan.engagement_score > 0.6;
                    }
                    return hasComment;
                  }).length
                }
              )}
            </StatHelpText>
          </Stat>

          {/* Unique Sessions */}
          <Stat>
            <StatLabel fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">
              {intl.formatMessage({ id: 'commercial.uniqueSessions' })}
            </StatLabel>
            <StatNumber fontSize={{ base: 'lg', md: '2xl' }} fontWeight="bold" color={textColor}>
              {scansData.length > 0
                ? Math.round(
                    (scansData.filter((scan) => !scan.is_duplicate).length / scansData.length) * 100
                  )
                : 0}
              %
            </StatNumber>
            <StatHelpText fontSize="xs" color="gray.500" mb={0}>
              {intl.formatMessage(
                { id: 'commercial.uniqueVisits' },
                { count: scansData.filter((scan) => !scan.is_duplicate).length }
              )}
            </StatHelpText>
          </Stat>
        </SimpleGrid>

        {/* Educational Section for Farmers - Collapsible */}
        {scansData.length > 0 && (
          <Box
            mt={{ base: 4, md: 6 }}
            bg="blue.50"
            borderRadius="lg"
            border="1px solid"
            borderColor="blue.200"
            overflow="hidden">
            <Flex
              align="center"
              justify="space-between"
              p={{ base: 3, md: 4 }}
              cursor="pointer"
              onClick={onEducationToggle}
              _hover={{ bg: 'blue.100' }}
              transition="background-color 0.2s">
              <Text fontSize={{ base: 'xs', md: 'sm' }} fontWeight="semibold" color="blue.700">
                💡 {intl.formatMessage({ id: 'commercial.educationTitle' })}
              </Text>
              <Icon
                as={isEducationOpen ? FiChevronUp : FiChevronDown}
                color="blue.500"
                boxSize={4}
              />
            </Flex>
            <Collapse in={isEducationOpen} animateOpacity>
              <VStack
                align="start"
                spacing={1.5}
                px={{ base: 3, md: 4 }}
                pb={{ base: 3, md: 4 }}
                fontSize="xs"
                color="blue.600">
                <Text>{intl.formatMessage({ id: 'commercial.educationHumanScans' })}</Text>
                <Text>{intl.formatMessage({ id: 'commercial.educationDetectionSystem' })}</Text>
                <VStack align="start" spacing={0.5} pl={{ base: 3, md: 4 }} fontSize="xs">
                  <Text>• {intl.formatMessage({ id: 'commercial.educationAutomatic' })}</Text>
                  <Text>• {intl.formatMessage({ id: 'commercial.educationDefault' })}</Text>
                  <Text>• {intl.formatMessage({ id: 'commercial.educationRealistic' })}</Text>
                  <Text>• {intl.formatMessage({ id: 'commercial.educationConservative' })}</Text>
                </VStack>
                <Text>
                  {intl.formatMessage({ id: 'commercial.educationTransparencyCommitment' })}
                </Text>
              </VStack>
            </Collapse>
          </Box>
        )}
      </StandardCard>

      {/* Scans Table */}
      <StandardCard
        title={intl.formatMessage({ id: 'commercial.scansCount' }, { count: totalCount })}
        variant="elevated"
        padding={{ base: 0, md: 4 }}>
        <VStack spacing={4}>
          <Box
            overflowX="auto"
            w="100%"
            borderRadius="lg"
            border="1px solid"
            borderColor="gray.200">
            {/* The wrapper scrolls only if the table refuses to shrink below this. Without
                a `minW` the columns compress until uppercase headers wrap one character per
                line — the P-R-O-D-U-C-T-I-O-N failure seen on the Buyer page. */}
            <Table variant="simple" size="sm" minW="720px">
              <Thead bg="gray.50" position="sticky" top={0} zIndex={1}>
                <Tr>
                  <Th
                    color="gray.600"
                    fontWeight="semibold"
                    fontSize="xs"
                    py={{ base: 2, md: 3 }}
                    px={{ base: 2, md: 4 }}
                    whiteSpace="nowrap">
                    {intl.formatMessage({ id: 'commercial.dateColumn' })}
                  </Th>
                  <Th
                    color="gray.600"
                    fontWeight="semibold"
                    fontSize="xs"
                    py={{ base: 2, md: 3 }}
                    px={{ base: 2, md: 4 }}
                    whiteSpace="nowrap">
                    {intl.formatMessage({ id: 'commercial.productColumn' })}
                  </Th>
                  <Th
                    color="gray.600"
                    fontWeight="semibold"
                    fontSize="xs"
                    py={{ base: 2, md: 3 }}
                    px={{ base: 2, md: 4 }}
                    whiteSpace="nowrap">
                    {intl.formatMessage({ id: 'commercial.customerType' })}
                  </Th>
                  <Th
                    color="gray.600"
                    fontWeight="semibold"
                    fontSize="xs"
                    py={{ base: 2, md: 3 }}
                    px={{ base: 2, md: 4 }}
                    whiteSpace="nowrap">
                    {intl.formatMessage({ id: 'commercial.engagement' })}
                  </Th>
                  <Th
                    color="gray.600"
                    fontWeight="semibold"
                    fontSize="xs"
                    py={{ base: 2, md: 3 }}
                    px={{ base: 2, md: 4 }}
                    whiteSpace="nowrap">
                    {intl.formatMessage({ id: 'commercial.quality' })}
                  </Th>
                  <Th
                    color="gray.600"
                    fontWeight="semibold"
                    fontSize="xs"
                    py={{ base: 2, md: 3 }}
                    px={{ base: 2, md: 4 }}
                    whiteSpace="nowrap">
                    {intl.formatMessage({ id: 'commercial.locationColumn' })}
                  </Th>
                  <Th
                    color="gray.600"
                    fontWeight="semibold"
                    fontSize="xs"
                    py={{ base: 2, md: 3 }}
                    px={{ base: 2, md: 4 }}
                    whiteSpace="nowrap">
                    {intl.formatMessage({ id: 'commercial.commentColumn' })}
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {/* `isUninitialized` — a skip gated on `currentCompany?.id` reports
                    `isLoading: false` before it has ever run, which fell through to the
                    "no scans" row. */}
                {isLoading || isUninitialized ? (
                  <Tr>
                    <Td colSpan={7} textAlign="center" py={8}>
                      <CircularProgress isIndeterminate color="green.700" size="40px" />
                    </Td>
                  </Tr>
                ) : error ? (
                  <Tr>
                    <Td colSpan={7} textAlign="center" py={8}>
                      <Text color="red.700" fontSize={{ base: 'xs', md: 'sm' }}>
                        {intl.formatMessage({ id: 'commercial.errorLoadingScans' })}
                      </Text>
                    </Td>
                  </Tr>
                ) : scansData.length > 0 ? (
                  scansData.map((scan, index) => {
                    const hasComment = scan.comment && scan.comment.trim().length > 0;

                    let isHumanLike: boolean;
                    if (
                      scan.bot_score !== undefined &&
                      scan.bot_score !== 0.5 &&
                      scan.bot_score !== 0.3
                    ) {
                      isHumanLike = scan.bot_score < 0.5;
                    } else {
                      isHumanLike = true;
                    }

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

                    const getCustomerTypeBadge = () => {
                      if (scan.consent_given === false) {
                        return (
                          <Badge colorScheme="gray" fontSize="xs">
                            {intl.formatMessage({ id: 'commercial.privacy' })}
                          </Badge>
                        );
                      }
                      if (isHumanLike && isHighEngagement) {
                        return (
                          <Badge colorScheme="green" fontSize="xs">
                            {intl.formatMessage({ id: 'commercial.explorer' })}
                          </Badge>
                        );
                      }
                      if (isHumanLike && !isHighEngagement) {
                        return (
                          <Badge colorScheme="blue" fontSize="xs">
                            {intl.formatMessage({ id: 'commercial.viewer' })}
                          </Badge>
                        );
                      }
                      return (
                        <Badge colorScheme="orange" fontSize="xs">
                          {intl.formatMessage({ id: 'commercial.bot' })}
                        </Badge>
                      );
                    };

                    const engagementLevel = isHighEngagement
                      ? {
                          label: intl.formatMessage({ id: 'commercial.engagementHigh' }),
                          color: 'green'
                        }
                      : {
                          label: intl.formatMessage({ id: 'commercial.engagementLow' }),
                          color: 'gray'
                        };

                    const isExpanded = expandedComments[scan.id.toString()];

                    // Compact date format
                    const formatDate = (dateStr: string) => {
                      if (!dateStr) return 'N/A';
                      try {
                        const d = new Date(dateStr);
                        if (isNaN(d.getTime())) return dateStr;
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        const dd = String(d.getDate()).padStart(2, '0');
                        const yy = String(d.getFullYear()).slice(-2);
                        return `${mm}/${dd}/${yy}`;
                      } catch {
                        return dateStr;
                      }
                    };

                    const formatTime = (dateStr: string) => {
                      if (!dateStr) return '';
                      try {
                        const d = new Date(dateStr);
                        if (isNaN(d.getTime())) return '';
                        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      } catch {
                        return '';
                      }
                    };

                    return (
                      <React.Fragment key={scan.id}>
                        <Tr _hover={{ bg: 'green.50' }} transition="background-color 0.2s">
                          <Td px={{ base: 2, md: 4 }}>
                            <Text
                              fontSize={{ base: 'xs', md: 'sm' }}
                              fontWeight="medium"
                              whiteSpace="nowrap">
                              {formatDate(scan.date)}
                            </Text>
                            <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">
                              {formatTime(scan.date)}
                            </Text>
                          </Td>
                          <Td px={{ base: 2, md: 4 }} maxW={{ base: '100px', md: 'none' }}>
                            <Text
                              fontSize={{ base: 'xs', md: 'sm' }}
                              fontWeight="medium"
                              color={textColor}
                              noOfLines={1}>
                              {scan.product || 'N/A'}
                            </Text>
                          </Td>

                          <Td px={{ base: 2, md: 4 }}>
                            <HStack spacing={1}>
                              {getCustomerTypeBadge()}
                              {scan.is_duplicate && (
                                <Tooltip
                                  label={intl.formatMessage({ id: 'commercial.duplicateSession' })}
                                  placement="top">
                                  <Badge colorScheme="gray" fontSize="xs" variant="outline">
                                    {intl.formatMessage({ id: 'commercial.dup' })}
                                  </Badge>
                                </Tooltip>
                              )}
                            </HStack>
                          </Td>

                          <Td px={{ base: 2, md: 4 }}>
                            <HStack spacing={1}>
                              <Badge
                                colorScheme={engagementLevel.color}
                                fontSize="xs"
                                variant="subtle">
                                {engagementLevel.label}
                              </Badge>
                              {scan.consent_given !== false && isHighEngagement && (
                                <Tooltip
                                  label={intl.formatMessage(
                                    { id: 'commercial.engagementTooltip' },
                                    { score: Math.round((scan.engagement_score || 0.5) * 100) }
                                  )}
                                  placement="top">
                                  <Icon as={FaChartLine} color="green.500" boxSize={3} />
                                </Tooltip>
                              )}
                            </HStack>
                          </Td>

                          <Td px={{ base: 2, md: 4 }}>
                            <HStack spacing={1}>
                              <Tooltip
                                label={
                                  isHumanLike
                                    ? intl.formatMessage({ id: 'commercial.realConsumerDetected' })
                                    : intl.formatMessage({ id: 'commercial.possibleBotDetected' })
                                }
                                placement="top"
                                hasArrow>
                                <Badge
                                  colorScheme={isHumanLike ? 'green' : 'orange'}
                                  fontSize="xs"
                                  variant={isHumanLike ? 'solid' : 'outline'}>
                                  <HStack spacing={1}>
                                    <Icon as={isHumanLike ? FaUser : FaRobot} boxSize={2} />
                                    <Text>
                                      {isHumanLike
                                        ? intl.formatMessage({ id: 'commercial.human' })
                                        : intl.formatMessage({ id: 'commercial.bot' })}
                                    </Text>
                                  </HStack>
                                </Badge>
                              </Tooltip>
                            </HStack>
                          </Td>

                          <Td px={{ base: 2, md: 4 }}>
                            <Text
                              fontSize={{ base: 'xs', md: 'sm' }}
                              color={textColor}
                              whiteSpace="nowrap">
                              {scan.location || '-'}
                            </Text>
                          </Td>
                          <Td px={{ base: 2, md: 4 }}>
                            <Button
                              onClick={
                                scan.comment
                                  ? () => handleToggleComment(scan.id.toString())
                                  : undefined
                              }
                              variant="no-hover"
                              bg={scan.comment ? (isExpanded ? 'green.50' : 'white') : 'white'}
                              w={{ base: '70px', md: '100px' }}
                              h={{ base: '28px', md: '35px' }}
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
                              transition="all 0.2s ease">
                              {scan.comment
                                ? isExpanded
                                  ? intl.formatMessage({ id: 'commercial.hideButton' })
                                  : intl.formatMessage({ id: 'commercial.viewButton' })
                                : intl.formatMessage({ id: 'commercial.viewButton' })}
                            </Button>
                          </Td>
                        </Tr>

                        {/* Expanded Comment Row */}
                        {isExpanded && scan.comment && (
                          <Tr>
                            <Td
                              colSpan={7}
                              px={{ base: 2, md: 6 }}
                              py={{ base: 2, md: 4 }}
                              bg="green.50">
                              <Box
                                p={{ base: 2, md: 4 }}
                                bg="white"
                                borderRadius="md"
                                border="1px solid"
                                borderColor="green.200"
                                boxShadow="sm">
                                <Text
                                  fontSize={{ base: 'xs', md: 'sm' }}
                                  color="green.800"
                                  lineHeight="1.4">
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
                        <Text
                          color="gray.500"
                          fontSize={{ base: 'sm', md: 'lg' }}
                          fontWeight="medium">
                          {intl.formatMessage({ id: 'commercial.noScansFound' })}
                        </Text>
                        <Text color="gray.400" fontSize={{ base: 'xs', md: 'sm' }}>
                          {intl.formatMessage({ id: 'commercial.adjustFilters' })}
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
        </VStack>
      </StandardCard>
    </StandardPage>
  );
};

export default AllScansView;
