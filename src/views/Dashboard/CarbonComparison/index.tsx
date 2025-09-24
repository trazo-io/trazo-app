import React, { useState } from 'react';
import {
  VStack,
  HStack,
  SimpleGrid,
  Heading,
  Text,
  Icon,
  Badge,
  Button,
  useBreakpointValue,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Circle,
  Flex,
  Progress,
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Input,
  InputGroup,
  InputLeftElement,
  Image,
  Avatar,
  Divider
} from '@chakra-ui/react';
import {
  FaSearch,
  FaBalanceScale,
  FaChartBar,
  FaMapMarkerAlt,
  FaTractor,
  FaLeaf,
  FaStar,
  FaCheckCircle,
  FaChevronUp,
  FaChevronDown,
  FaFilter,
  FaSortAmountUp,
  FaEye,
  FaShareAlt,
  FaBookmark,
  FaPlus,
  FaMinus,
  FaClock,
  FaClipboardList
} from 'react-icons/fa';
import { MdEco, MdVerified, MdCompare, MdTrendingUp, MdSwapHoriz } from 'react-icons/md';
import {
  StandardPage,
  StandardCard,
  StandardSection,
  StandardGrid,
  StandardButton,
  StandardAlert,
  StandardInput,
  ConsumerTooltip
} from '../../../components/Design/StandardComponents';
import {
  useGetShoppingHistoryQuery,
  useCompareProductsMutation
} from '../../../store/api/consumerApi';

export default function TransparencyComparison() {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [comparisonView, setComparisonView] = useState('table'); // 'table' | 'chart' | 'map'

  // Fetch user's shopping history to get products for comparison
  const {
    data: shoppingHistory,
    isLoading: historyLoading,
    error: historyError
  } = useGetShoppingHistoryQuery({});

  const [compareProducts, { isLoading: isComparing }] = useCompareProductsMutation();

  // Transform shopping history into product database for comparison
  const productDatabase = (shoppingHistory?.scans || []).map((scan) => ({
    id: scan.id.toString(),
    name: scan.product_name || 'Unknown Product',
    farm: scan.farm_name || 'Unknown Farm',
    location: scan.location || 'Location unavailable',
    carbonScoreText: scan.carbon_score || 'Not Available',
    carbonScore: (() => {
      if (
        !scan.carbon_score ||
        scan.carbon_score === 'Not Available' ||
        scan.carbon_score === 'Data unavailable'
      ) {
        return 50; // Default neutral score
      }
      const numericValue = parseInt(scan.carbon_score.replace(/[^0-9]/g, ''));
      return isNaN(numericValue) ? 50 : numericValue;
    })(),
    carbonFootprint: scan.carbon_footprint || 'Data unavailable',
    certifications: scan.sustainability_practices || [],
    seasonality: 'Available',
    farmingMethod: scan.sustainability_practices?.includes('Organic') ? 'Organic' : 'Conventional',
    image: null,
    lastScanned: scan.date || 'Recently',
    trustScore: scan.is_verified ? 95 : 70,
    userRating: 4.5, // Mock rating
    reviews: 100 // Mock review count
  }));

  const filteredProducts = productDatabase.filter((product) => {
    if (!product || !searchQuery) return true;

    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    return (
      product.name?.toLowerCase().includes(query) ||
      product.farm?.toLowerCase().includes(query) ||
      product.location?.toLowerCase().includes(query)
    );
  });

  const handleProductToggle = (productId: string) => {
    setSelectedProducts(
      (prev) =>
        prev.includes(productId)
          ? prev.filter((id) => id !== productId)
          : [...prev, productId].slice(0, 4) // Limit to 4 products
    );
  };

  const selectedProductData = productDatabase.filter((p) => selectedProducts.includes(p.id));

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'green';
    if (score >= 70) return 'blue';
    if (score >= 55) return 'orange';
    return 'red';
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  };

  // Handle loading state
  if (historyLoading) {
    return (
      <StandardPage title="Compare Products" description="Loading your product data...">
        <VStack spacing={8} align="center">
          <Text>Loading your scanned products for comparison...</Text>
        </VStack>
      </StandardPage>
    );
  }

  // Handle error state
  if (historyError) {
    return (
      <StandardPage title="Compare Products" description="Unable to load product data">
        <StandardAlert
          status="error"
          title="Error Loading Products"
          description="We couldn't load your product history. Please try refreshing the page."
        />
      </StandardPage>
    );
  }

  // Handle empty state
  if (!productDatabase || productDatabase.length === 0) {
    return (
      <StandardPage
        title="Compare Products"
        description="Start scanning products to enable comparisons"
      >
        <StandardAlert
          status="info"
          title="No Products Available"
          description="Scan some products first to start comparing their environmental impact. Use the QR scanner to add products to your history."
        />
      </StandardPage>
    );
  }

  return (
    <StandardPage
      title="Compare Transparency"
      description="Discover products with the most complete farming documentation and transparency"
    >
      <VStack spacing={8} align="stretch">
        {/* Search and Filter Section */}
        <StandardCard title="Transparency Search & Selection" variant="elevated">
          <VStack spacing={6}>
            {/* Search Bar */}
            <InputGroup size="lg">
              <InputLeftElement pointerEvents="none">
                <Icon as={FaSearch} color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Search by farm transparency, documentation level, or practices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                pl="40px"
                borderRadius="xl"
                borderColor="gray.300"
                _focus={{
                  borderColor: 'green.500',
                  boxShadow: '0 0 0 1px var(--chakra-colors-green-500)'
                }}
                _hover={{
                  borderColor: 'gray.400'
                }}
                bg="white"
                fontSize="md"
              />
            </InputGroup>

            {/* Selected Products Summary */}
            {selectedProducts.length > 0 && (
              <StandardAlert
                status="info"
                title={`${selectedProducts.length} product${
                  selectedProducts.length > 1 ? 's' : ''
                } selected for transparency comparison`}
                description="Add up to 4 products to compare their transparency levels and farming documentation."
              />
            )}

            {/* Product Selection Grid */}
            <StandardGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {filteredProducts.map((product) => {
                const isSelected = selectedProducts.includes(product.id);

                return (
                  <StandardCard
                    key={product.id}
                    variant={isSelected ? 'flat' : 'outline'}
                    padding={4}
                  >
                    <VStack spacing={4}>
                      <HStack justify="space-between" w="full" align="start">
                        <VStack align="start" spacing={1} flex={1}>
                          <Heading size="sm" color="gray.700">
                            {product.name}
                          </Heading>
                          <Text fontSize="sm" color="gray.600">
                            {product.farm}
                          </Text>
                          <HStack spacing={2}>
                            <Icon as={FaMapMarkerAlt} color="gray.500" boxSize={3} />
                            <Text fontSize="xs" color="gray.500">
                              {product.location}
                            </Text>
                          </HStack>
                        </VStack>

                        <VStack align="end" spacing={1}>
                          <ConsumerTooltip
                            label="Transparency Score"
                            explanation="Transparency scores show how completely a farm documents their practices, from 0% (minimal information) to 100% (complete documentation). Higher scores mean more detailed farming information available."
                          >
                            <Text
                              fontSize="2xl"
                              fontWeight="bold"
                              color="green.600"
                              cursor="help"
                            >
                              {product.carbonScore}%
                            </Text>
                          </ConsumerTooltip>
                          <Badge
                            colorScheme="green"
                            variant="solid"
                            fontSize="xs"
                          >
                            {product.carbonScore >= 95 ? 'Complete' : 
                             product.carbonScore >= 85 ? 'Excellent' :
                             product.carbonScore >= 70 ? 'Good' : 'Basic'} Documentation
                          </Badge>
                        </VStack>
                      </HStack>

                      <HStack justify="space-between" w="full" fontSize="sm">
                        <VStack align="start" spacing={0}>
                          <ConsumerTooltip
                            label="Documentation Level"
                            explanation="Shows how many farming practices and events have been documented for this product. More documentation means greater transparency about how your food was grown."
                          >
                            <Text
                              color="gray.600"
                              cursor="help"
                              textDecoration="underline"
                              textDecorationStyle="dotted"
                            >
                              Documentation Level
                            </Text>
                          </ConsumerTooltip>
                          <Text fontWeight="medium" color="gray.700">
                            {Math.round(product.carbonScore / 100 * 15)} of 15 practices documented
                          </Text>
                        </VStack>
                      </HStack>

                      <StandardButton
                        variant={isSelected ? 'outline' : 'primary'}
                        size="sm"
                        leftIcon={isSelected ? <FaMinus /> : <FaPlus />}
                        onClick={() => handleProductToggle(product.id)}
                        isDisabled={!isSelected && selectedProducts.length >= 4}
                        w="full"
                      >
                        {isSelected ? 'Remove from Analysis' : 'Add to Analysis'}
                      </StandardButton>
                    </VStack>
                  </StandardCard>
                );
              })}
            </StandardGrid>
          </VStack>
        </StandardCard>

        {/* Comparison Results */}
        {selectedProducts.length > 1 && (
          <StandardCard title="Transparency Analysis" variant="elevated">
            <Tabs variant="soft-rounded" colorScheme="green">
              <TabList mb={6}>
                <Tab>Documentation Comparison</Tab>
                <Tab>Transparency Analysis</Tab>
                <Tab>Best Practices Showcase</Tab>
              </TabList>

              <TabPanels>
                {/* Detailed Comparison Table */}
                <TabPanel p={0}>
                  <TableContainer>
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Product</Th>
                          <Th textAlign="center">Transparency</Th>
                          <Th textAlign="center">Documentation</Th>
                          <Th textAlign="center">Farming Method</Th>
                          <Th textAlign="center">Practices</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {selectedProductData
                          .map((product, index) => (
                            <Tr key={product.id}>
                              <Td>
                                <VStack align="start" spacing={1}>
                                  <Text fontWeight="medium">{product.name}</Text>
                                  <Text fontSize="xs" color="gray.600">
                                    {product.farm}
                                  </Text>
                                  <HStack spacing={1}>
                                    <Icon as={FaMapMarkerAlt} color="gray.500" boxSize={3} />
                                    <Text fontSize="xs" color="gray.500">
                                      {product.location}
                                    </Text>
                                  </HStack>
                                </VStack>
                              </Td>
                              <Td textAlign="center">
                                <VStack spacing={1}>
                                  <Text fontSize="xl" fontWeight="bold" color="green.600">
                                    {product.carbonScore}%
                                  </Text>
                                  <Badge colorScheme="green" size="sm">
                                    {product.carbonScore >= 95 ? 'Complete' : 
                                     product.carbonScore >= 85 ? 'Excellent' :
                                     product.carbonScore >= 70 ? 'Good' : 'Basic'}
                                  </Badge>
                                </VStack>
                              </Td>
                              <Td textAlign="center">
                                <Text fontWeight="medium">
                                  {Math.round(product.carbonScore / 100 * 15)} practices
                                </Text>
                              </Td>
                              <Td textAlign="center">
                                <Badge colorScheme="blue" variant="outline" size="sm">
                                  {product.farmingMethod}
                                </Badge>
                              </Td>
                              <Td textAlign="center">
                                <VStack spacing={1}>
                                  <Text fontSize="sm" color="green.600">
                                    {product.certifications?.length || 0} verified
                                  </Text>
                                  <Text fontSize="xs" color="gray.500">
                                    practices
                                  </Text>
                                </VStack>
                              </Td>
                            </Tr>
                          ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </TabPanel>

                {/* Visual Analysis */}
                <TabPanel p={0}>
                  <StandardSection
                    title="Transparency Levels"
                    description="Compare documentation completeness across farms"
                  >
                    <VStack spacing={6}>
                      {selectedProductData
                        .map((product, index) => (
                          <Box key={product.id} w="full">
                            <HStack justify="space-between" mb={2}>
                              <VStack align="start" spacing={0}>
                                <Text fontWeight="bold">{product.name}</Text>
                                <Text fontSize="sm" color="gray.600">
                                  {product.farm}
                                </Text>
                              </VStack>
                              <VStack align="end" spacing={0}>
                                <Text fontSize="xl" fontWeight="bold" color="green.600">
                                  {product.carbonScore}%
                                </Text>
                                <Badge colorScheme="green">
                                  {product.carbonScore >= 95 ? 'Complete Documentation' : 
                                   product.carbonScore >= 85 ? 'Excellent Transparency' :
                                   product.carbonScore >= 70 ? 'Good Documentation' : 'Basic Information'}
                                </Badge>
                              </VStack>
                            </HStack>
                            <Progress
                              value={product.carbonScore}
                              size="lg"
                              colorScheme="green"
                              borderRadius="full"
                              bg="gray.100"
                            />
                            <HStack justify="space-between" mt={2} fontSize="xs" color="gray.600">
                              <Text>{Math.round(product.carbonScore / 100 * 15)} practices documented</Text>
                              <Text>{product.farmingMethod} farming</Text>
                            </HStack>
                          </Box>
                        ))}
                    </VStack>
                  </StandardSection>
                </TabPanel>

                {/* Sustainability Ranking */}
                <TabPanel p={0}>
                  <StandardSection
                    title="Best Practices Showcase"
                    description="Highlighting excellent transparency and documentation"
                  >
                    <VStack spacing={4}>
                      {selectedProductData
                        .map((product, index) => {
                          const transparencyLevel = product.carbonScore >= 95 ? 'Complete' : 
                                                   product.carbonScore >= 85 ? 'Excellent' :
                                                   product.carbonScore >= 70 ? 'Good' : 'Basic';

                          return (
                            <StandardCard key={product.id} variant="flat" padding={6}>
                              <HStack spacing={6} align="center">
                                <Circle size="50px" bg="green.100">
                                  <Icon as={FaCheckCircle} color="green.500" boxSize={6} />
                                </Circle>

                                <VStack align="start" spacing={1} flex={1}>
                                  <HStack spacing={3}>
                                    <Heading size="md">{product.name}</Heading>
                                    <Badge colorScheme="green">{transparencyLevel}</Badge>
                                  </HStack>
                                  <Text color="gray.600">
                                    {product.farm} • {product.location}
                                  </Text>
                                  <HStack spacing={4} fontSize="sm">
                                    <HStack spacing={1}>
                                      <Icon as={FaClipboardList} color="green.500" boxSize={4} />
                                      <Text>Documentation: {product.carbonScore}%</Text>
                                    </HStack>
                                    <HStack spacing={1}>
                                      <Icon as={MdVerified} color="blue.500" boxSize={4} />
                                      <Text>Practices: {Math.round(product.carbonScore / 100 * 15)}</Text>
                                    </HStack>
                                    <HStack spacing={1}>
                                      <Icon as={FaLeaf} color="green.500" boxSize={4} />
                                      <Text>Method: {product.farmingMethod}</Text>
                                    </HStack>
                                  </HStack>
                                </VStack>

                                <VStack align="end" spacing={2}>
                                  <Text fontSize="2xl" fontWeight="bold" color="green.600">
                                    {product.carbonScore}%
                                  </Text>
                                  <Text fontSize="sm" color="gray.600">
                                    Transparency
                                  </Text>
                                  <HStack spacing={2}>
                                    <StandardButton
                                      size="sm"
                                      variant="outline"
                                      leftIcon={<FaEye />}
                                    >
                                      View Practices
                                    </StandardButton>
                                    <StandardButton
                                      size="sm"
                                      variant="ghost"
                                      leftIcon={<FaShareAlt />}
                                    >
                                      Share Story
                                    </StandardButton>
                                  </HStack>
                                </VStack>
                              </HStack>
                            </StandardCard>
                          );
                        })}
                    </VStack>
                  </StandardSection>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </StandardCard>
        )}

        {/* Comparison Insights */}
        {selectedProducts.length > 1 && (
          <StandardCard title="Transparency Insights" variant="elevated">
            <VStack spacing={4} align="stretch">
              {selectedProductData.length > 1 && (
                <>
                  <StandardAlert
                    status="info"
                    title="Complete Transparency Available"
                    description="These farms provide comprehensive documentation of their practices, giving you complete visibility into how your food was grown."
                  />

                  <Box bg="blue.50" p={4} borderRadius="lg">
                    <VStack align="start" spacing={2}>
                      <HStack spacing={2}>
                        <Icon as={FaBalanceScale} color="blue.500" />
                        <Text fontWeight="bold" color="blue.700">
                          Key Differences:
                        </Text>
                      </HStack>
                      <Text fontSize="sm" color="blue.600">
                        • Farms with higher transparency scores document {Math.round(15 * 0.95)} of 15 key farming practices
                      </Text>
                      <Text fontSize="sm" color="blue.600">
                        • Complete documentation includes soil management, water use, and harvesting methods
                      </Text>
                      <Text fontSize="sm" color="blue.600">
                        • Transparent farms help you make informed choices about your food
                      </Text>
                    </VStack>
                  </Box>
                </>
              )}
            </VStack>
          </StandardCard>
        )}
      </VStack>
    </StandardPage>
  );
}
