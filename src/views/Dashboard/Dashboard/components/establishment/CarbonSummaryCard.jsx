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
  const { data, isLoading, isFetching, isError } = useGetCarbonFootprintSummaryQuery(
    { establishmentId, year },
    { refetchOnMountOrArgChange: true }
  );

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

  if (isLoading || isFetching) {
    return (
      <Card bg={bgColor} p={6} borderRadius="15px">
        <VStack spacing={4}>
          <Spinner size="sm" color="green.500" />
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
      p={{ base: 4, md: 6 }}
      borderRadius="xl"
      className="trazo-card"
      boxShadow="md">
      <CardHeader p={0} mb={{ base: 4, md: 4 }}>
        <Flex direction="column">
          <HStack spacing={2} align="center">
            <Icon as={FaLeaf} color="green.500" boxSize={{ base: 5, md: 6 }} />
            <Text fontSize={{ base: 'xl', md: 'xl' }} color="gray.700" fontWeight="700">
              Huella Neta!
            </Text>
          </HStack>
          <Text fontSize={{ base: 'sm', md: 'sm' }} color="gray.500" fontWeight="400" ml={7}>
            Resumen de Carbono del Establecimiento
          </Text>
        </Flex>
      </CardHeader>
      <CardBody px={0}>
        {/* Metrics Grid - Mobile Optimized */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={{ base: 4, md: 4 }}>
          <Box
            textAlign="center"
            p={{ base: 4, md: 2 }}
            bg={{ base: 'red.50', md: 'transparent' }}
            borderRadius={{ base: 'lg', md: 'none' }}
            border={{ base: '1px solid', md: 'none' }}
            borderColor={{ base: 'red.200', md: 'transparent' }}>
            <Stat>
              <StatLabel fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mb={1}>
                Emisiones Totales
              </StatLabel>
              <StatNumber fontSize={{ base: 'lg', md: 'xl' }} color="red.500" fontWeight="bold">
                {(data?.total_emissions || 0).toFixed(2)} kg CO₂e
              </StatNumber>
              <StatHelpText fontSize={{ base: 'sm', md: 'xs' }} mt={1}>
                <StatArrow type="increase" /> Emisiones del período
              </StatHelpText>
            </Stat>
          </Box>
          <Box
            textAlign="center"
            p={{ base: 4, md: 2 }}
            bg={{ base: 'green.50', md: 'transparent' }}
            borderRadius={{ base: 'lg', md: 'none' }}
            border={{ base: '1px solid', md: 'none' }}
            borderColor={{ base: 'green.200', md: 'transparent' }}>
            <Stat>
              <StatLabel fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mb={1}>
                Compensaciones
              </StatLabel>
              <StatNumber fontSize={{ base: 'lg', md: 'xl' }} color="green.500" fontWeight="bold">
                {(data?.total_offsets || 0).toFixed(2)} kg CO₂e
              </StatNumber>
              <StatHelpText fontSize={{ base: 'sm', md: 'xs' }} mt={1}>
                <StatArrow type="decrease" /> Compensaciones del período
              </StatHelpText>
            </Stat>
          </Box>
          <Box
            textAlign="center"
            p={{ base: 4, md: 2 }}
            bg={{ base: (data?.net_carbon || 0) >= 0 ? 'red.50' : 'green.50', md: 'transparent' }}
            borderRadius={{ base: 'lg', md: 'none' }}
            border={{ base: '1px solid', md: 'none' }}
            borderColor={{
              base: (data?.net_carbon || 0) >= 0 ? 'red.200' : 'green.200',
              md: 'transparent'
            }}>
            <Stat>
              <StatLabel fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mb={1}>
                Huella Neta
              </StatLabel>
              <StatNumber
                fontSize={{ base: 'lg', md: 'xl' }}
                color={(data?.net_carbon || 0) >= 0 ? 'red.500' : 'green.500'}
                fontWeight="bold">
                {(data?.net_carbon || 0).toFixed(2)} kg CO₂e
              </StatNumber>
              <StatHelpText fontSize={{ base: 'sm', md: 'xs' }} mt={1}>
                <StatArrow type={(data?.net_carbon || 0) >= 0 ? 'increase' : 'decrease'} />
                {Math.abs(data?.net_carbon || 0).toFixed(2)} kg CO₂e
              </StatHelpText>
            </Stat>
          </Box>
        </SimpleGrid>

        {/* Divider */}
        <Divider my={{ base: 3, md: 4 }} />

        {/* Progress Section */}
        <Box mb={{ base: 2, md: 2 }}>
          <Heading
            size={{ base: 'xs', md: 'sm' }}
            mb={{ base: 2, md: 3 }}
            color="green.700"
            fontWeight="600">
            Progreso de Compensación
          </Heading>
          <Progress
            value={offsetPercentage}
            colorScheme={offsetPercentage >= 100 ? 'green' : 'orange'}
            size={{ base: 'md', md: 'lg' }}
            borderRadius="md"
            mb={{ base: 2, md: 3 }}
            height={{ base: '12px', md: '16px' }}
            bg="gray.100"
          />
          <Text
            textAlign="center"
            fontSize={{ base: 'xs', md: 'sm' }}
            color="gray.600"
            fontWeight="500">
            {offsetPercentage.toFixed(1)}% de las emisiones compensadas
            {offsetPercentage >= 100 && (
              <Text as="span" color="green.500" fontWeight="bold">
                {' - ¡Carbono Neutral!'}
              </Text>
            )}
          </Text>
        </Box>

        {/* View Details Button */}
        <Flex justify="center" pt={{ base: 1, md: 2 }}>
          <Button
            bg="green.500"
            color="white"
            h={{ base: '40px', md: '44px' }}
            fontSize={{ base: 'xs', md: 'sm' }}
            borderRadius="xl"
            px={{ base: 4, md: 6 }}
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
