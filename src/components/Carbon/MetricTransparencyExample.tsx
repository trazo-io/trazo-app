import React from 'react';
import {
  Box,
  Card,
  CardBody,
  SimpleGrid,
  Text,
  VStack,
  HStack,
  Icon,
  IconButton,
  Tooltip,
  Badge,
  useDisclosure,
  useColorModeValue
} from '@chakra-ui/react';
import { FaInfoCircle, FaLeaf } from 'react-icons/fa';
import MetricTransparencyModal from './MetricTransparencyModal';

// Example component showing how to integrate the transparency modal
const MetricCard = ({ 
  title, 
  value, 
  metricKey, 
  icon, 
  color 
}: {
  title: string;
  value: string | number;
  metricKey: string;
  icon: any;
  color: string;
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  return (
    <>
      <Card
        bg={cardBg}
        cursor="pointer"
        transition="all 0.3s ease"
        _hover={{
          transform: 'translateY(-2px)',
          boxShadow: 'xl'
        }}
      >
        <CardBody>
          <VStack spacing={3}>
            <HStack justify="space-between" w="full">
              <Icon as={icon} color={`${color}.500`} boxSize={5} />
              <Tooltip label="Click for details and improvement suggestions" hasArrow>
                <IconButton
                  aria-label={`${title} Info`}
                  icon={<FaInfoCircle />}
                  size="xs"
                  variant="ghost"
                  color={mutedColor}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen();
                  }}
                  _hover={{ color: `${color}.500`, bg: `${color}.50` }}
                />
              </Tooltip>
            </HStack>
            
            <VStack spacing={1}>
              <Text fontSize="2xl" fontWeight="bold" color={textColor}>
                {value}
              </Text>
              <Text fontWeight="semibold" color={textColor} fontSize="sm">
                {title}
              </Text>
            </VStack>
          </VStack>
        </CardBody>
      </Card>

      <MetricTransparencyModal
        isOpen={isOpen}
        onClose={onClose}
        metric={metricKey}
        currentValue={value}
      />
    </>
  );
};

// Example usage showing all metrics
const MetricTransparencyExample = () => {
  const metrics = [
    { title: 'Carbon Score', value: 72, metricKey: 'carbonScore', icon: FaLeaf, color: 'green' },
    { title: 'Net Footprint', value: '+1,234.5 kg CO₂e', metricKey: 'netFootprint', icon: FaLeaf, color: 'blue' },
    { title: 'Transparency Score', value: 85, metricKey: 'transparencyScore', icon: FaLeaf, color: 'purple' },
    { title: 'Verified Events', value: '42 events', metricKey: 'verifiedEvents', icon: FaLeaf, color: 'orange' },
    { title: 'Security Score', value: '65%', metricKey: 'securityScore', icon: FaLeaf, color: 'red' },
    { title: 'USDA Compliance', value: 92, metricKey: 'usdaCompliance', icon: FaLeaf, color: 'blue' },
    { title: 'Blockchain Status', value: 'PENDING', metricKey: 'blockchainStatus', icon: FaLeaf, color: 'gray' }
  ];

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        <Text fontSize="xl" fontWeight="bold">
          Carbon Dashboard Metrics - Click info icons for details
        </Text>
        
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
          {metrics.map((metric) => (
            <MetricCard key={metric.metricKey} {...metric} />
          ))}
        </SimpleGrid>
      </VStack>
    </Box>
  );
};

export default MetricTransparencyExample;