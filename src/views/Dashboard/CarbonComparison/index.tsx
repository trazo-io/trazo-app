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
  FaClock
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
import { useGetShoppingHistoryQuery, useCompareProductsMutation } from '../../../store/api/consumerApi';

export default function CarbonComparison() {
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
      if (!scan.carbon_score || scan.carbon_score === 'Not Available' || scan.carbon_score === 'Data unavailable') {
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

  const filteredProducts = productDatabase.filter(product => {
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
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId].slice(0, 4) // Limit to 4 products
    );
  };

  const selectedProductData = productDatabase.filter(p => selectedProducts.includes(p.id));

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
      <StandardPage
        title="Compare Products"
        description="Loading your product data..."
      >
        <VStack spacing={8} align="center">
          <Text>Loading your scanned products for comparison...</Text>
        </VStack>
      </StandardPage>
    );
  }

  // Handle error state
  if (historyError) {
    return (
      <StandardPage
        title="Compare Products"
        description="Unable to load product data"
      >
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
      title="Compare Products"
      description="Find products with lower environmental impact for your grocery shopping"
    >
      <VStack spacing={8} align="stretch">
        {/* Search and Filter Section */}
        <StandardCard title="Product Search & Selection" variant="elevated">
          <VStack spacing={6}>
            {/* Search Bar */}
            <InputGroup size="lg">
              <InputLeftElement pointerEvents="none">
                <Icon as={FaSearch} color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Search products, farms, or locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                pl="40px"
                borderRadius="xl"
                borderColor="gray.300"
                _focus={{
                  borderColor: "green.500",
                  boxShadow: "0 0 0 1px var(--chakra-colors-green-500)"
                }}
                _hover={{
                  borderColor: "gray.400"
                }}
                bg="white"
                fontSize="md"
              />
            </InputGroup>

            {/* Selected Products Summary */}
            {selectedProducts.length > 0 && (
              <StandardAlert
                status="info"
                title={`${selectedProducts.length} product${selectedProducts.length > 1 ? 's' : ''} selected for comparison`}
                description="Add up to 4 products to compare their carbon footprints and sustainability metrics."
              />
            )}

            {/* Product Selection Grid */}
            <StandardGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {filteredProducts.map((product) => {
                const isSelected = selectedProducts.includes(product.id);
                
                return (
                  <StandardCard 
                    key={product.id} 
                    variant={isSelected ? "flat" : "outline"} 
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
                          {product.carbonScoreText === 'Not Available' ? (
                            <ConsumerTooltip
                              label="Score Pending"
                              explanation="We're still analyzing the carbon footprint data for this product. Carbon scoring requires detailed information about farming practices, processing, and transportation that may take time to verify."
                            >
                              <VStack spacing={1} align="end" cursor="help">
                                <Icon as={FaClock} color="gray.400" boxSize={5} />
                                <Text fontSize="sm" color="gray.500" textAlign="center">
                                  Score Pending
                                </Text>
                              </VStack>
                            </ConsumerTooltip>
                          ) : (
                            <>
                              <ConsumerTooltip
                                label="Carbon Score"
                                explanation="Carbon scores rate products from A+ (very low environmental impact) to F (high impact) based on greenhouse gas emissions from farming, processing, and transportation. A+ means under 0.5 kg CO₂ per kg of product."
                              >
                                <Text 
                                  fontSize="2xl" 
                                  fontWeight="bold" 
                                  color={getScoreColor(product.carbonScore) + '.600'}
                                  cursor="help"
                                >
                                  {product.carbonScoreText}
                                </Text>
                              </ConsumerTooltip>
                              <Badge 
                                colorScheme={getScoreColor(product.carbonScore)} 
                                variant="solid"
                                fontSize="xs"
                              >
                                Grade {getScoreGrade(product.carbonScore)}
                              </Badge>
                            </>
                          )}
                        </VStack>
                      </HStack>
                      
                      <HStack justify="space-between" w="full" fontSize="sm">
                        <VStack align="start" spacing={0}>
                          <ConsumerTooltip
                            label="Carbon Footprint"
                            explanation="Carbon footprint measures all greenhouse gases produced to grow, harvest, process, package, and transport this food to you. It's measured in kg CO₂e (carbon dioxide equivalent) per kg of product. Lower numbers are better for the environment."
                          >
                            <Text color="gray.600" cursor="help" textDecoration="underline" textDecorationStyle="dotted">
                              Carbon Footprint
                            </Text>
                          </ConsumerTooltip>
                          <Text fontWeight="medium" color={product.carbonFootprint === 'Data unavailable' ? 'gray.400' : 'gray.700'}>
                            {product.carbonFootprint === 'Data unavailable' ? 'Pending analysis' : product.carbonFootprint}
                          </Text>
                        </VStack>
                      </HStack>
                      
                      <StandardButton
                        variant={isSelected ? "outline" : "primary"}
                        size="sm"
                        leftIcon={isSelected ? <FaMinus /> : <FaPlus />}
                        onClick={() => handleProductToggle(product.id)}
                        isDisabled={!isSelected && selectedProducts.length >= 4}
                        w="full"
                      >
                        {isSelected ? 'Remove from Comparison' : 'Add to Comparison'}
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
          <StandardCard title="Product Comparison" variant="elevated">
            <Tabs variant="soft-rounded" colorScheme="green">
              <TabList mb={6}>
                <Tab>Detailed Comparison</Tab>
                <Tab>Visual Analysis</Tab>
                <Tab>Sustainability Ranking</Tab>
              </TabList>
              
              <TabPanels>
                {/* Detailed Comparison Table */}
                <TabPanel p={0}>
                  <TableContainer>
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Product</Th>
                          <Th textAlign="center">Green Score</Th>
                          <Th textAlign="center">Impact</Th>
                          <Th textAlign="center">Farming</Th>
                          <Th textAlign="center">Rating</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {selectedProductData
                          .sort((a, b) => b.carbonScore - a.carbonScore)
                          .map((product, index) => (
                          <Tr key={product.id}>
                            <Td>
                              <VStack align="start" spacing={1}>
                                <Text fontWeight="medium">{product.name}</Text>
                                <Text fontSize="xs" color="gray.600">{product.farm}</Text>
                                <HStack spacing={1}>
                                  <Icon as={FaMapMarkerAlt} color="gray.500" boxSize={3} />
                                  <Text fontSize="xs" color="gray.500">{product.location}</Text>
                                </HStack>
                              </VStack>
                            </Td>
                            <Td textAlign="center">
                              <VStack spacing={1}>
                                <Text fontSize="xl" fontWeight="bold" color={getScoreColor(product.carbonScore) + '.600'}>
                                  {product.carbonScore}
                                </Text>
                                <Badge colorScheme={getScoreColor(product.carbonScore)} size="sm">
                                  {getScoreGrade(product.carbonScore)}
                                </Badge>
                                {index === 0 && (
                                  <Icon as={FaStar} color="gold" boxSize={4} />
                                )}
                              </VStack>
                            </Td>
                            <Td textAlign="center">
                              <Text fontWeight="medium">{product.carbonFootprint}</Text>
                            </Td>
                            <Td textAlign="center">
                              <Badge colorScheme="blue" variant="outline" size="sm">
                                {product.farmingMethod}
                              </Badge>
                            </Td>
                            <Td textAlign="center">
                              <VStack spacing={1}>
                                <HStack spacing={1}>
                                  <Icon as={FaStar} color="orange.400" boxSize={3} />
                                  <Text fontSize="sm">{product.userRating}</Text>
                                </HStack>
                                <Text fontSize="xs" color="gray.500">
                                  {product.reviews} reviews
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
                  <StandardSection title="Environmental Scores" description="See which products are better for the environment">
                    <VStack spacing={6}>
                      {selectedProductData
                        .sort((a, b) => b.carbonScore - a.carbonScore)
                        .map((product, index) => (
                        <Box key={product.id} w="full">
                          <HStack justify="space-between" mb={2}>
                            <VStack align="start" spacing={0}>
                              <Text fontWeight="bold">{product.name}</Text>
                              <Text fontSize="sm" color="gray.600">{product.farm}</Text>
                            </VStack>
                            <VStack align="end" spacing={0}>
                              <Text fontSize="xl" fontWeight="bold" color={getScoreColor(product.carbonScore) + '.600'}>
                                {product.carbonScore}/100
                              </Text>
                              <HStack spacing={1}>
                                {index === 0 && <Icon as={FaStar} color="gold" boxSize={4} />}
                                <Badge colorScheme={getScoreColor(product.carbonScore)}>
                                  #{index + 1} Best
                                </Badge>
                              </HStack>
                            </VStack>
                          </HStack>
                          <Progress
                            value={product.carbonScore}
                            size="lg"
                            colorScheme={getScoreColor(product.carbonScore)}
                            borderRadius="full"
                            bg="gray.100"
                          />
                          <HStack justify="space-between" mt={2} fontSize="xs" color="gray.600">
                            <Text>{product.carbonFootprint} footprint</Text>
                            <Text>{product.farmingMethod} method</Text>
                          </HStack>
                        </Box>
                      ))}
                    </VStack>
                  </StandardSection>
                </TabPanel>

                {/* Sustainability Ranking */}
                <TabPanel p={0}>
                  <StandardSection title="Comprehensive Sustainability Analysis" description="Ranking based on multiple environmental factors">
                    <VStack spacing={4}>
                      {selectedProductData
                        .sort((a, b) => {
                          // Complex scoring algorithm
                          const scoreA = a.carbonScore + a.trustScore * 0.3 + a.userRating * 10;
                          const scoreB = b.carbonScore + b.trustScore * 0.3 + b.userRating * 10;
                          return scoreB - scoreA;
                        })
                        .map((product, index) => {
                          const totalScore = Math.round(product.carbonScore + product.trustScore * 0.3 + product.userRating * 10);
                          
                          return (
                            <StandardCard key={product.id} variant="flat" padding={6}>
                              <HStack spacing={6} align="center">
                                <Circle size="50px" bg={index === 0 ? 'gold' : index === 1 ? 'gray.300' : 'orange.300'}>
                                  <Text fontSize="xl" fontWeight="bold" color={index === 0 ? 'white' : 'gray.600'}>
                                    #{index + 1}
                                  </Text>
                                </Circle>
                                
                                <VStack align="start" spacing={1} flex={1}>
                                  <HStack spacing={3}>
                                    <Heading size="md">{product.name}</Heading>
                                    {index === 0 && <Icon as={FaStar} color="gold" boxSize={5} />}
                                  </HStack>
                                  <Text color="gray.600">{product.farm} • {product.location}</Text>
                                  <HStack spacing={4} fontSize="sm">
                                    <HStack spacing={1}>
                                      <Icon as={MdEco} color="green.500" boxSize={4} />
                                      <Text>Carbon: {product.carbonScore}</Text>
                                    </HStack>
                                    <HStack spacing={1}>
                                      <Icon as={MdVerified} color="blue.500" boxSize={4} />
                                      <Text>Trust: {product.trustScore}</Text>
                                    </HStack>
                                    <HStack spacing={1}>
                                      <Icon as={FaStar} color="orange.500" boxSize={4} />
                                      <Text>Rating: {product.userRating}</Text>
                                    </HStack>
                                  </HStack>
                                </VStack>
                                
                                <VStack align="end" spacing={2}>
                                  <Text fontSize="2xl" fontWeight="bold" color="green.600">
                                    {totalScore}
                                  </Text>
                                  <Text fontSize="sm" color="gray.600">
                                    Overall Score
                                  </Text>
                                  <HStack spacing={2}>
                                    <StandardButton size="sm" variant="outline" leftIcon={<FaEye />}>
                                      View Details
                                    </StandardButton>
                                    <StandardButton size="sm" variant="ghost" leftIcon={<FaShareAlt />}>
                                      Share
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
          <StandardCard title="AI-Powered Comparison Insights" variant="elevated">
            <VStack spacing={4} align="stretch">
              {selectedProductData.length > 1 && (
                <>
                  <StandardAlert
                    status="success"
                    title="Best Choice Identified"
                    description={`${selectedProductData.sort((a, b) => b.carbonScore - a.carbonScore)[0].name} from ${selectedProductData.sort((a, b) => b.carbonScore - a.carbonScore)[0].farm} has the lowest carbon footprint and highest sustainability score.`}
                  />
                  
                  <Box bg="blue.50" p={4} borderRadius="lg">
                    <VStack align="start" spacing={2}>
                      <HStack spacing={2}>
                        <Icon as={FaBalanceScale} color="blue.500" />
                        <Text fontWeight="bold" color="blue.700">Key Differences:</Text>
                      </HStack>
                      <Text fontSize="sm" color="blue.600">
                        • The best option has {Math.round(((selectedProductData.sort((a, b) => b.carbonScore - a.carbonScore)[0].carbonScore - selectedProductData.sort((a, b) => a.carbonScore - b.carbonScore)[0].carbonScore) / selectedProductData.sort((a, b) => a.carbonScore - b.carbonScore)[0].carbonScore) * 100)}% better carbon performance
                      </Text>
                      <Text fontSize="sm" color="blue.600">
                        • Choosing sustainable options can save up to 2.1 kg CO₂e per purchase
                      </Text>
                      <Text fontSize="sm" color="blue.600">
                        • Local sourcing reduces transport emissions by up to 70%
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