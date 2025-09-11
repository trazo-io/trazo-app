import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Progress,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  SimpleGrid,
  Divider,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  List,
  ListItem,
  ListIcon,
} from '@chakra-ui/react';
import { FaDollarSign, FaLeaf, FaTrophy, FaChartLine, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

interface CarbonROI {
  investment_estimate: number;
  carbon_credit_value: number;
  premium_pricing_value: number;
  total_annual_benefits: number;
  roi_percentage: number;
  payback_period_years: number;
  cost_per_ton_co2e: number;
}

interface MarketValueImpact {
  current_market_tier: string;
  base_production_value: number;
  enhanced_market_value: number;
  value_uplift: number;
  value_uplift_percentage: number;
  consumer_appeal_rating: string;
  market_differentiation: string;
  competitive_advantage: string;
}

interface CarbonCreditPotential {
  eligible: boolean;
  sequestered_tons_co2e?: number;
  voluntary_market?: {
    price_per_ton: number;
    gross_value: number;
    verification_cost: number;
    net_value: number;
  };
  compliance_market?: {
    price_per_ton: number;
    gross_value: number;
    verification_cost: number;
    net_value: number;
  };
  recommendation?: string;
  annual_potential?: number;
  reason?: string;
  current_status?: string;
  improvement_needed?: number;
}

interface PremiumPricingOpportunity {
  total_opportunities: number;
  opportunities: Array<{
    category: string;
    potential_premium: string;
    target_markets: string[];
    requirements: string[];
    estimated_value: number;
  }>;
  total_potential_value: number;
  recommended_priority: string;
}

interface CarbonROIAnalysisProps {
  carbonROI: CarbonROI;
  marketValueImpact: MarketValueImpact;
  carbonCreditPotential: CarbonCreditPotential;
  premiumPricingOpportunity: PremiumPricingOpportunity;
}

export const CarbonROIAnalysis: React.FC<CarbonROIAnalysisProps> = ({
  carbonROI,
  marketValueImpact,
  carbonCreditPotential,
  premiumPricingOpportunity,
}) => {
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const successColor = useColorModeValue('green.500', 'green.400');
  const warningColor = useColorModeValue('orange.500', 'orange.400');
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getROIColor = (percentage: number) => {
    if (percentage > 50) return 'green';
    if (percentage > 20) return 'blue';
    if (percentage > 0) return 'yellow';
    return 'red';
  };

  const getMarketTierColor = (tier: string) => {
    switch (tier) {
      case 'Premium Sustainable': return 'green';
      case 'Sustainable': return 'blue';
      case 'Standard': return 'gray';
      default: return 'orange';
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* ROI Overview */}
      <Card>
        <CardHeader>
          <HStack>
            <Icon as={FaDollarSign} color="green.500" />
            <Heading size="md">Carbon Investment ROI</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
            <Stat>
              <StatLabel>Total Investment</StatLabel>
              <StatNumber>{formatCurrency(carbonROI.investment_estimate)}</StatNumber>
              <StatHelpText>Carbon practices</StatHelpText>
            </Stat>
            
            <Stat>
              <StatLabel>Annual Benefits</StatLabel>
              <StatNumber color="green.500">
                {formatCurrency(carbonROI.total_annual_benefits)}
              </StatNumber>
              <StatHelpText>Credits + Premiums</StatHelpText>
            </Stat>
            
            <Stat>
              <StatLabel>ROI</StatLabel>
              <StatNumber color={getROIColor(carbonROI.roi_percentage)}>
                {carbonROI.roi_percentage.toFixed(1)}%
              </StatNumber>
              <StatHelpText>
                <StatArrow type={carbonROI.roi_percentage > 0 ? 'increase' : 'decrease'} />
                Annual return
              </StatHelpText>
            </Stat>
            
            <Stat>
              <StatLabel>Payback Period</StatLabel>
              <StatNumber>
                {carbonROI.payback_period_years === Infinity ? 'N/A' : 
                 `${carbonROI.payback_period_years.toFixed(1)} years`}
              </StatNumber>
              <StatHelpText>Time to break even</StatHelpText>
            </Stat>
          </SimpleGrid>

          <Divider my={4} />

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            {/* Benefits Breakdown */}
            <Box>
              <Heading size="sm" mb={3}>Annual Benefits Breakdown</Heading>
              <VStack align="stretch" spacing={3}>
                <HStack justify="space-between" p={3} bg={bg} borderRadius="md" border="1px" borderColor={borderColor}>
                  <HStack>
                    <Icon as={FaLeaf} color="green.500" />
                    <Text>Carbon Credits</Text>
                  </HStack>
                  <Text fontWeight="bold" color="green.500">
                    {formatCurrency(carbonROI.carbon_credit_value)}
                  </Text>
                </HStack>
                
                <HStack justify="space-between" p={3} bg={bg} borderRadius="md" border="1px" borderColor={borderColor}>
                  <HStack>
                    <Icon as={FaTrophy} color="blue.500" />
                    <Text>Premium Pricing</Text>
                  </HStack>
                  <Text fontWeight="bold" color="blue.500">
                    {formatCurrency(carbonROI.premium_pricing_value)}
                  </Text>
                </HStack>
                
                <HStack justify="space-between" p={3} bg="green.50" borderRadius="md" border="2px" borderColor="green.200">
                  <Text fontWeight="bold">Total Annual Value</Text>
                  <Text fontWeight="bold" color="green.600" fontSize="lg">
                    {formatCurrency(carbonROI.total_annual_benefits)}
                  </Text>
                </HStack>
              </VStack>
            </Box>

            {/* Cost Efficiency */}
            <Box>
              <Heading size="sm" mb={3}>Cost Efficiency Metrics</Heading>
              <VStack align="stretch" spacing={3}>
                <Stat>
                  <StatLabel>Cost per Ton CO₂e</StatLabel>
                  <StatNumber>{formatCurrency(carbonROI.cost_per_ton_co2e)}</StatNumber>
                  <StatHelpText>Investment efficiency</StatHelpText>
                </Stat>
                
                {carbonROI.roi_percentage > 0 ? (
                  <Alert status="success" borderRadius="md">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Profitable Carbon Investment!</AlertTitle>
                      <AlertDescription>
                        Your carbon practices generate {carbonROI.roi_percentage.toFixed(1)}% annual ROI.
                      </AlertDescription>
                    </Box>
                  </Alert>
                ) : (
                  <Alert status="warning" borderRadius="md">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Break-even Analysis</AlertTitle>
                      <AlertDescription>
                        Consider additional revenue streams to improve ROI.
                      </AlertDescription>
                    </Box>
                  </Alert>
                )}
              </VStack>
            </Box>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Market Value Impact */}
      <Card>
        <CardHeader>
          <HStack>
            <Icon as={FaChartLine} color="blue.500" />
            <Heading size="md">Market Value Impact</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            <VStack align="stretch" spacing={4}>
              <Box textAlign="center">
                <Badge colorScheme={getMarketTierColor(marketValueImpact.current_market_tier)} size="lg" p={2}>
                  {marketValueImpact.current_market_tier}
                </Badge>
                <Text fontSize="sm" color="gray.600" mt={1}>Market Tier</Text>
              </Box>
              
              <Stat textAlign="center">
                <StatLabel>Consumer Appeal</StatLabel>
                <StatNumber color="blue.500">{marketValueImpact.consumer_appeal_rating}</StatNumber>
                <StatHelpText>{marketValueImpact.market_differentiation}</StatHelpText>
              </Stat>
            </VStack>

            <VStack align="stretch" spacing={4}>
              <Stat>
                <StatLabel>Base Production Value</StatLabel>
                <StatNumber>{formatCurrency(marketValueImpact.base_production_value)}</StatNumber>
              </Stat>
              
              <Stat>
                <StatLabel>Enhanced Market Value</StatLabel>
                <StatNumber color="green.500">
                  {formatCurrency(marketValueImpact.enhanced_market_value)}
                </StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  {marketValueImpact.value_uplift_percentage.toFixed(1)}% increase
                </StatHelpText>
              </Stat>
            </VStack>

            <Box>
              <Heading size="sm" mb={3}>Competitive Advantages</Heading>
              <VStack align="stretch" spacing={2}>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.500" />
                  <Text fontSize="sm">{marketValueImpact.competitive_advantage}</Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.500" />
                  <Text fontSize="sm">Strong market differentiation</Text>
                </HStack>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.500" />
                  <Text fontSize="sm">Verified sustainability claims</Text>
                </HStack>
              </VStack>
              
              <Text fontSize="lg" fontWeight="bold" color="green.500" mt={4} textAlign="center">
                +{formatCurrency(marketValueImpact.value_uplift)} Value Uplift
              </Text>
            </Box>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Carbon Credit Potential */}
      <Card>
        <CardHeader>
          <HStack>
            <Icon as={FaLeaf} color="green.500" />
            <Heading size="md">Carbon Credit Potential</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          {carbonCreditPotential.eligible ? (
            <VStack align="stretch" spacing={6}>
              <Alert status="success" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Eligible for Carbon Credits!</AlertTitle>
                  <AlertDescription>
                    Your production sequesters {carbonCreditPotential.sequestered_tons_co2e?.toFixed(1)} tons CO₂e annually.
                  </AlertDescription>
                </Box>
              </Alert>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                {/* Voluntary Market */}
                {carbonCreditPotential.voluntary_market && (
                  <Card variant="outline">
                    <CardHeader>
                      <Heading size="sm">Voluntary Carbon Market</Heading>
                    </CardHeader>
                    <CardBody>
                      <VStack align="stretch" spacing={3}>
                        <HStack justify="space-between">
                          <Text>Price per ton:</Text>
                          <Text fontWeight="bold">
                            {formatCurrency(carbonCreditPotential.voluntary_market.price_per_ton)}
                          </Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text>Gross value:</Text>
                          <Text color="green.500">
                            {formatCurrency(carbonCreditPotential.voluntary_market.gross_value)}
                          </Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text>Verification cost:</Text>
                          <Text color="red.500">
                            -{formatCurrency(carbonCreditPotential.voluntary_market.verification_cost)}
                          </Text>
                        </HStack>
                        <Divider />
                        <HStack justify="space-between">
                          <Text fontWeight="bold">Net annual value:</Text>
                          <Text fontWeight="bold" color="green.600" fontSize="lg">
                            {formatCurrency(carbonCreditPotential.voluntary_market.net_value)}
                          </Text>
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>
                )}

                {/* Compliance Market */}
                {carbonCreditPotential.compliance_market && (
                  <Card variant="outline" borderColor="blue.200">
                    <CardHeader>
                      <HStack>
                        <Heading size="sm">Compliance Market</Heading>
                        {carbonCreditPotential.recommendation === 'Compliance Market' && (
                          <Badge colorScheme="blue">Recommended</Badge>
                        )}
                      </HStack>
                    </CardHeader>
                    <CardBody>
                      <VStack align="stretch" spacing={3}>
                        <HStack justify="space-between">
                          <Text>Price per ton:</Text>
                          <Text fontWeight="bold">
                            {formatCurrency(carbonCreditPotential.compliance_market.price_per_ton)}
                          </Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text>Gross value:</Text>
                          <Text color="green.500">
                            {formatCurrency(carbonCreditPotential.compliance_market.gross_value)}
                          </Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text>Verification cost:</Text>
                          <Text color="red.500">
                            -{formatCurrency(carbonCreditPotential.compliance_market.verification_cost)}
                          </Text>
                        </HStack>
                        <Divider />
                        <HStack justify="space-between">
                          <Text fontWeight="bold">Net annual value:</Text>
                          <Text fontWeight="bold" color="green.600" fontSize="lg">
                            {formatCurrency(carbonCreditPotential.compliance_market.net_value)}
                          </Text>
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>
                )}
              </SimpleGrid>

              <Box p={4} bg="blue.50" borderRadius="md">
                <Text fontWeight="bold" color="blue.700" mb={2}>
                  Recommended Strategy: {carbonCreditPotential.recommendation}
                </Text>
                <Text fontSize="sm" color="blue.600">
                  Conservative annual potential: {formatCurrency(carbonCreditPotential.annual_potential || 0)}
                </Text>
              </Box>
            </VStack>
          ) : (
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <Box>
                <AlertTitle>Not Currently Eligible</AlertTitle>
                <AlertDescription>
                  {carbonCreditPotential.reason} 
                  {carbonCreditPotential.improvement_needed && 
                    ` Reduce emissions by ${carbonCreditPotential.improvement_needed.toLocaleString()} kg CO₂e to become eligible.`
                  }
                </AlertDescription>
              </Box>
            </Alert>
          )}
        </CardBody>
      </Card>

      {/* Premium Pricing Opportunities */}
      <Card>
        <CardHeader>
          <HStack>
            <Icon as={FaTrophy} color="purple.500" />
            <Heading size="md">Premium Pricing Opportunities</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <VStack align="stretch" spacing={6}>
            <HStack justify="space-between">
              <Stat>
                <StatLabel>Total Opportunities</StatLabel>
                <StatNumber>{premiumPricingOpportunity.total_opportunities}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Total Potential Value</StatLabel>
                <StatNumber color="purple.500">
                  {formatCurrency(premiumPricingOpportunity.total_potential_value)}
                </StatNumber>
                <StatHelpText>Annual premium revenue</StatHelpText>
              </Stat>
            </HStack>

            <Box p={4} bg="purple.50" borderRadius="md">
              <Text fontWeight="bold" color="purple.700" mb={1}>
                Recommended Priority:
              </Text>
              <Text color="purple.600">{premiumPricingOpportunity.recommended_priority}</Text>
            </Box>

            <VStack align="stretch" spacing={4}>
              {premiumPricingOpportunity.opportunities.map((opportunity, index) => (
                <Card key={index} variant="outline">
                  <CardBody>
                    <VStack align="stretch" spacing={3}>
                      <HStack justify="space-between">
                        <VStack align="start" spacing={1}>
                          <Heading size="sm">{opportunity.category}</Heading>
                          <Badge colorScheme="purple">{opportunity.potential_premium} Premium</Badge>
                        </VStack>
                        <Text fontSize="lg" fontWeight="bold" color="purple.500">
                          {formatCurrency(opportunity.estimated_value)}
                        </Text>
                      </HStack>

                      <Box>
                        <Text fontSize="sm" fontWeight="medium" mb={2}>Target Markets:</Text>
                        <HStack spacing={1} flexWrap="wrap">
                          {opportunity.target_markets.map((market, idx) => (
                            <Badge key={idx} variant="outline" size="sm">{market}</Badge>
                          ))}
                        </HStack>
                      </Box>

                      <Box>
                        <Text fontSize="sm" fontWeight="medium" mb={2}>Requirements:</Text>
                        <List spacing={1}>
                          {opportunity.requirements.map((req, idx) => (
                            <ListItem key={idx} fontSize="sm">
                              <ListIcon as={FaCheckCircle} color="green.500" />
                              {req}
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );
};

export default CarbonROIAnalysis;