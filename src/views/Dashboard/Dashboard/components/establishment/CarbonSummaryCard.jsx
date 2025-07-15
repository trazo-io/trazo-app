import React from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Badge,
  Button,
  useColorModeValue,
  Spinner,
  Progress,
  HStack,
  VStack,
  Icon,
  SimpleGrid,
  Divider
} from '@chakra-ui/react';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import { FaLeaf, FaChartLine } from 'react-icons/fa';
import { MdEco } from 'react-icons/md';
import { useGetCarbonFootprintSummaryQuery } from 'store/api/companyApi';
import { useNavigate } from 'react-router-dom';

const CarbonSummaryCard = ({ establishmentId }) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'white');
  const navigate = useNavigate();
  const year = new Date().getFullYear();
  const { data, isLoading, isError } = useGetCarbonFootprintSummaryQuery({ establishmentId, year });

  // Calculate offset percentage
  let offsetPercentage = 0;
  if (data) {
    const totalEmissions = data.total_emissions || 0;
    const totalOffsets = data.total_offsets || 0;

    if (totalEmissions > 0) {
      offsetPercentage = Math.min(100, Math.max(0, (totalOffsets / totalEmissions) * 100));
    } else if (totalOffsets > 0) {
      offsetPercentage = 100;
    }
  }

  if (isLoading) {
    return (
      <Card bg={bgColor} p={6} borderRadius="15px">
        <VStack spacing={4}>
          <Spinner size="lg" color="green.500" />
          <Text color="gray.500">Cargando datos de huella de carbono...</Text>
        </VStack>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card bg={bgColor} p={6} borderRadius="15px">
        <VStack spacing={4}>
          <Icon as={MdEco} color="red.500" boxSize={8} />
          <Text color="red.500" textAlign="center">
            No se pudo cargar la huella de carbono
          </Text>
          <Button
            size="sm"
            colorScheme="red"
            variant="outline"
            onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </VStack>
      </Card>
    );
  }

  return (
    <Card 
      bg={bgColor} 
      p={6} 
      borderRadius="xl" 
      className="trazo-card"
    >
      <CardHeader p={0} mb={4}>
        <Flex direction="column">
          <Text fontSize="lg" color="gray.700" fontWeight="bold">
            Huella Neta
          </Text>
          <Text fontSize="sm" color="gray.500" fontWeight="400">
            Resumen de Carbono del Establecimiento
          </Text>
        </Flex>
      </CardHeader>
      <CardBody px={0}>
        {/* Metrics Grid */}
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={4} mb={4}>
          <Box textAlign="center" p={2}>
            <Stat>
              <StatLabel fontSize="sm" color="gray.600">Emisiones Totales</StatLabel>
              <StatNumber fontSize={{ base: "lg", md: "xl" }} color="red.500" fontWeight="bold">
                {(data?.total_emissions || 0).toFixed(2)} kg CO₂e
              </StatNumber>
              <StatHelpText fontSize="xs">
                <StatArrow type="increase" /> Emisiones del período
              </StatHelpText>
            </Stat>
          </Box>
          <Box textAlign="center" p={2}>
            <Stat>
              <StatLabel fontSize="sm" color="gray.600">Compensaciones</StatLabel>
              <StatNumber fontSize={{ base: "lg", md: "xl" }} color="green.500" fontWeight="bold">
                {(data?.total_offsets || 0).toFixed(2)} kg CO₂e
              </StatNumber>
              <StatHelpText fontSize="xs">
                <StatArrow type="decrease" /> Compensaciones del período
              </StatHelpText>
            </Stat>
          </Box>
          <Box textAlign="center" p={2}>
            <Stat>
              <StatLabel fontSize="sm" color="gray.600">Huella Neta</StatLabel>
              <StatNumber 
                fontSize={{ base: "lg", md: "xl" }} 
                color={(data?.net_carbon || 0) >= 0 ? "red.500" : "green.500"} 
                fontWeight="bold"
              >
                {(data?.net_carbon || 0).toFixed(2)} kg CO₂e
              </StatNumber>
              <StatHelpText fontSize="xs">
                <StatArrow type={(data?.net_carbon || 0) >= 0 ? 'increase' : 'decrease'} />
                {Math.abs(data?.net_carbon || 0).toFixed(2)} kg CO₂e
              </StatHelpText>
            </Stat>
          </Box>
        </SimpleGrid>

        {/* Divider */}
        <Divider my={4} />

        {/* Progress Section */}
        <Box mb={6}>
          <Heading size="sm" mb={3} color="trazo.forest" fontWeight="600">
            Progreso de Compensación
          </Heading>
          <Progress
            value={offsetPercentage}
            colorScheme={offsetPercentage >= 100 ? 'green' : 'orange'}
            size="lg"
            borderRadius="md"
            mb={3}
            height="16px"
            bg="gray.100"
          />
          <Text textAlign="center" fontSize="sm" color="gray.600" fontWeight="500">
            {offsetPercentage.toFixed(1)}% de las emisiones compensadas
            {offsetPercentage >= 100 && (
              <Text as="span" color="green.500" fontWeight="bold">
                {' - ¡Carbono Neutral!'}
              </Text>
            )}
          </Text>
        </Box>

        {/* View Details Button */}
        <Flex justify="center" pt={2}>
          <Button
            bg="trazo.forest"
            color="white"
            h="44px"
            fontSize="sm"
            borderRadius="xl"
            px={6}
            onClick={() => navigate(`/admin/dashboard/establishment/${establishmentId}/carbon`)}
            leftIcon={<Icon as={FaChartLine} />}
            _hover={{
              bg: 'green.600',
              transform: 'translateY(-1px)',
              boxShadow: 'md'
            }}
            _active={{
              bg: 'green.700'
            }}>
            Ver Detalles
          </Button>
        </Flex>
      </CardBody>
    </Card>
  );
};

export default CarbonSummaryCard;
