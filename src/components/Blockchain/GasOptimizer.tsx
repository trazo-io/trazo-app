import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  HStack,
  VStack,
  Text,
  Button,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Icon,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Select,
  Divider,
  useColorModeValue,
  useToast,
  Spinner,
  Progress
} from '@chakra-ui/react';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import { TriangleUpIcon, TriangleDownIcon, InfoIcon } from '@chakra-ui/icons';
import {
  useEstimateGasCostsMutation,
  useOptimizeTransactionGasMutation
} from '../../store/api/carbonApi';

interface GasOptimizerProps {
  operationType: string;
  operationData?: any;
  onOptimizationComplete?: (result: any) => void;
  showRecommendations?: boolean;
}

interface GasStrategy {
  name: string;
  label: string;
  description: string;
  multiplier: number;
  timeEstimate: string;
}

const GAS_STRATEGIES: GasStrategy[] = [
  {
    name: 'ECO',
    label: 'Eco (Slow)',
    description: 'Lowest cost, slower confirmation',
    multiplier: 0.8,
    timeEstimate: '5-15 minutes'
  },
  {
    name: 'STANDARD',
    label: 'Standard',
    description: 'Balanced cost and speed',
    multiplier: 1.0,
    timeEstimate: '2-5 minutes'
  },
  {
    name: 'FAST',
    label: 'Fast',
    description: 'Higher cost, faster confirmation',
    multiplier: 1.2,
    timeEstimate: '30 seconds - 2 minutes'
  },
  {
    name: 'URGENT',
    label: 'Urgent',
    description: 'Highest cost, immediate confirmation',
    multiplier: 1.5,
    timeEstimate: '15-30 seconds'
  }
];

const GasOptimizer: React.FC<GasOptimizerProps> = ({
  operationType,
  operationData = {},
  onOptimizationComplete,
  showRecommendations = true
}) => {
  const toast = useToast();
  const [selectedStrategy, setSelectedStrategy] = useState<string>('STANDARD');
  const [gasEstimation, setGasEstimation] = useState<any>(null);

  const [estimateGas, { isLoading: isEstimating }] = useEstimateGasCostsMutation();
  const [optimizeTransaction, { isLoading: isOptimizing }] = useOptimizeTransactionGasMutation();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Auto-estimate gas on component mount and when operation changes
  useEffect(() => {
    if (operationType) {
      handleEstimateGas();
    }
  }, [operationType, operationData]);

  const handleEstimateGas = async () => {
    try {
      const result = await estimateGas({
        operation_type: operationType,
        operation_data: operationData
      }).unwrap();

      setGasEstimation(result);
    } catch (error: any) {
      toast({
        title: 'Gas Estimation Failed',
        description: error?.data?.error || 'Unable to estimate gas costs',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const handleOptimizeTransaction = async () => {
    if (!gasEstimation) {
      await handleEstimateGas();
      return;
    }

    try {
      const result = await optimizeTransaction({
        transactions: [
          {
            operation_type: operationType,
            operation_data: operationData
          }
        ],
        strategy: selectedStrategy
      }).unwrap();

      toast({
        title: 'Transaction Optimized',
        description: `Potential savings: ${result.gas_savings}% with ${selectedStrategy} strategy`,
        status: 'success',
        duration: 5000,
        isClosable: true
      });

      if (onOptimizationComplete) {
        onOptimizationComplete(result);
      }
    } catch (error: any) {
      toast({
        title: 'Optimization Failed',
        description: error?.data?.error || 'Unable to optimize transaction',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const getStrategyColor = (strategy: string) => {
    switch (strategy) {
      case 'ECO':
        return 'green';
      case 'STANDARD':
        return 'blue';
      case 'FAST':
        return 'orange';
      case 'URGENT':
        return 'red';
      default:
        return 'gray';
    }
  };

  const formatGasPrice = (wei: number) => {
    return `${(wei / 1000000000).toFixed(2)} Gwei`;
  };

  const formatCost = (costWei: number, ethPrice: number = 2000) => {
    const costEth = costWei / Math.pow(10, 18);
    const costUsd = costEth * ethPrice;
    return {
      eth: costEth.toFixed(6),
      usd: costUsd.toFixed(2)
    };
  };

  const selectedStrategyInfo = GAS_STRATEGIES.find((s) => s.name === selectedStrategy);

  return (
    <Card bg={bgColor} borderColor={borderColor}>
      <CardHeader>
        <HStack justify="space-between" align="center">
          <HStack>
            <Icon as={TriangleUpIcon} color="trazo.500" boxSize={5} />
            <Heading size="md" color="trazo.500">
              Gas Optimization
            </Heading>
          </HStack>

          {gasEstimation?.recommended_strategy && (
            <Badge colorScheme={getStrategyColor(gasEstimation.recommended_strategy)}>
              Recommended: {gasEstimation.recommended_strategy}
            </Badge>
          )}
        </HStack>
      </CardHeader>

      <CardBody>
        <VStack spacing={6} align="stretch">
          {/* Current Gas Prices */}
          {gasEstimation?.current_gas_prices && (
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={3}>
                Current Network Conditions
              </Text>
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
                {Object.entries(gasEstimation.current_gas_prices).map(([type, price]) => (
                  <Stat key={type} size="sm">
                    <StatLabel fontSize="xs" textTransform="capitalize">
                      {type}
                    </StatLabel>
                    <StatNumber fontSize="sm" color={getStrategyColor(type.toUpperCase()) + '.500'}>
                      {formatGasPrice(price as number)}
                    </StatNumber>
                  </Stat>
                ))}
              </SimpleGrid>
            </Box>
          )}

          <Divider />

          {/* Strategy Selection */}
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={3}>
              Gas Strategy
            </Text>
            <Select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              placeholder="Select gas strategy"
            >
              {GAS_STRATEGIES.map((strategy) => (
                <option key={strategy.name} value={strategy.name}>
                  {strategy.label} - {strategy.description}
                </option>
              ))}
            </Select>

            {selectedStrategyInfo && (
              <Box mt={2} p={3} bg="gray.50" borderRadius="md">
                <HStack justify="space-between">
                  <VStack spacing={1} align="flex-start">
                    <Text fontSize="sm" fontWeight="medium">
                      {selectedStrategyInfo.label}
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                      {selectedStrategyInfo.description}
                    </Text>
                  </VStack>
                  <VStack spacing={1} align="flex-end">
                    <Badge colorScheme={getStrategyColor(selectedStrategy)}>
                      {selectedStrategyInfo.multiplier}x
                    </Badge>
                    <Text fontSize="xs" color="gray.500">
                      ~{selectedStrategyInfo.timeEstimate}
                    </Text>
                  </VStack>
                </HStack>
              </Box>
            )}
          </Box>

          {/* Gas Estimation Results */}
          {gasEstimation?.gas_estimation && (
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={3}>
                Cost Estimation
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Stat size="sm">
                  <StatLabel fontSize="xs">Estimated Gas</StatLabel>
                  <StatNumber fontSize="md">
                    {gasEstimation.gas_estimation.estimated_gas?.toLocaleString() || 'N/A'}
                  </StatNumber>
                  <StatHelpText fontSize="xs">Gas units required</StatHelpText>
                </Stat>

                <Stat size="sm">
                  <StatLabel fontSize="xs">Total Cost</StatLabel>
                  <StatNumber fontSize="md" color="blue.500">
                    ${formatCost(gasEstimation.gas_estimation.total_cost_wei || 0).usd}
                  </StatNumber>
                  <StatHelpText fontSize="xs">
                    {formatCost(gasEstimation.gas_estimation.total_cost_wei || 0).eth} ETH
                  </StatHelpText>
                </Stat>
              </SimpleGrid>

              {gasEstimation.gas_estimation.strategy_comparison && (
                <Box mt={4}>
                  <Text fontSize="xs" fontWeight="medium" mb={2}>
                    Strategy Comparison
                  </Text>
                  <VStack spacing={2} align="stretch">
                    {Object.entries(gasEstimation.gas_estimation.strategy_comparison).map(
                      ([strategy, data]: [string, any]) => (
                        <HStack
                          key={strategy}
                          justify="space-between"
                          p={2}
                          bg="gray.50"
                          borderRadius="sm"
                        >
                          <HStack>
                            <Badge size="sm" colorScheme={getStrategyColor(strategy)}>
                              {strategy}
                            </Badge>
                            <Text fontSize="xs">
                              {GAS_STRATEGIES.find((s) => s.name === strategy)?.timeEstimate}
                            </Text>
                          </HStack>
                          <Text fontSize="xs" fontWeight="medium">
                            ${formatCost(data.cost_wei || 0).usd}
                          </Text>
                        </HStack>
                      )
                    )}
                  </VStack>
                </Box>
              )}
            </Box>
          )}

          {/* Optimization Recommendations */}
          {showRecommendations && gasEstimation && (
            <Alert status="info" size="sm">
              <AlertIcon />
              <Box>
                <AlertTitle fontSize="sm">Optimization Tips</AlertTitle>
                <AlertDescription fontSize="xs">
                  <VStack spacing={1} align="flex-start" mt={1}>
                    <Text>• Use ECO mode during low network activity</Text>
                    <Text>• Batch multiple operations to save gas</Text>
                    <Text>• Monitor network congestion for optimal timing</Text>
                    {gasEstimation.recommended_strategy && (
                      <Text fontWeight="medium">
                        • Recommended: {gasEstimation.recommended_strategy} strategy for current
                        conditions
                      </Text>
                    )}
                  </VStack>
                </AlertDescription>
              </Box>
            </Alert>
          )}

          {/* Action Buttons */}
          <HStack spacing={3} justify="flex-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEstimateGas}
              isLoading={isEstimating}
              loadingText="Estimating..."
            >
              Refresh Estimate
            </Button>

            <Button
              colorScheme="trazo"
              size="sm"
              onClick={handleOptimizeTransaction}
              isLoading={isOptimizing}
              loadingText="Optimizing..."
              isDisabled={!gasEstimation}
            >
              Optimize Transaction
            </Button>
          </HStack>
        </VStack>
      </CardBody>
    </Card>
  );
};

export default GasOptimizer;
