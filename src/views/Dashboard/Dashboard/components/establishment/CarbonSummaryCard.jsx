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
import { FaLeaf, FaChartLine, FaClipboardList, FaCheckCircle, FaEye } from 'react-icons/fa';
import { MdEco, MdVerified } from 'react-icons/md';
import { useGetCarbonFootprintSummaryQuery } from 'store/api/companyApi';
import { useNavigate } from 'react-router-dom';

const TransparencySummaryCard = ({ establishmentId }) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'white');
  const navigate = useNavigate();
  const year = new Date().getFullYear();
  
  // Get carbon data for environmental impact section
  const { data, isLoading, isFetching, isError } = useGetCarbonFootprintSummaryQuery(
    { establishmentId, year },
    { refetchOnMountOrArgChange: true }
  );
  
  // Skip transparency API call for establishment level
  // This API is for production-level transparency, not establishment-level
  // We'll use carbon data to estimate transparency at establishment level
  const transparencyData = null; // Placeholder - API needs production ID, not establishment ID

  // Calculate transparency metrics - PRIMARY FOCUS
  const getTransparencyScore = () => {
    if (transparencyData?.quick_view?.transparency_score?.percentage) {
      return transparencyData.quick_view.transparency_score.percentage;
    }
    // Fallback estimation based on documented events
    return Math.min(100, Math.round(((data?.entries_count?.total || 0) / 15) * 100));
  };
  
  const getEventCount = () => {
    return data?.entries_count?.total || 0;
  };
  
  const getTransparencyMessage = (score) => {
    if (score >= 95) return '¡Transparencia Completa!';
    if (score >= 85) return 'Excelente Documentación';
    if (score >= 70) return 'Buena Transparencia';
    if (score >= 50) return 'Transparencia Básica';
    return 'Construyendo Transparencia';
  };
  

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
            No se pudo cargar los datos de transparencia
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
            <Icon as={FaClipboardList} color="green.500" boxSize={{ base: 5, md: 6 }} />
            <Text fontSize={{ base: 'xl', md: 'xl' }} color="gray.700" fontWeight="700">
              {getTransparencyMessage(getTransparencyScore())}
            </Text>
          </HStack>
          <Text fontSize={{ base: 'sm', md: 'sm' }} color="gray.500" fontWeight="400" ml={7}>
            Documentación y Transparencia del Establecimiento
          </Text>
        </Flex>
      </CardHeader>
      <CardBody px={0}>
        {/* PRIMARY: Transparency Metrics - Mobile Optimized */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={{ base: 4, md: 4 }}>
          <Box
            textAlign="center"
            p={{ base: 4, md: 2 }}
            bg={{ base: 'green.50', md: 'transparent' }}
            borderRadius={{ base: 'lg', md: 'none' }}
            border={{ base: '1px solid', md: 'none' }}
            borderColor={{ base: 'green.200', md: 'transparent' }}>
            <Stat>
              <StatLabel fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mb={1}>
                Puntaje de Transparencia
              </StatLabel>
              <StatNumber fontSize={{ base: 'lg', md: 'xl' }} color="green.500" fontWeight="bold">
                {getTransparencyScore()}%
              </StatNumber>
              <StatHelpText fontSize={{ base: 'sm', md: 'xs' }} mt={1}>
                <StatArrow type="increase" /> Documentación completa
              </StatHelpText>
            </Stat>
          </Box>
          <Box
            textAlign="center"
            p={{ base: 4, md: 2 }}
            bg={{ base: 'blue.50', md: 'transparent' }}
            borderRadius={{ base: 'lg', md: 'none' }}
            border={{ base: '1px solid', md: 'none' }}
            borderColor={{ base: 'blue.200', md: 'transparent' }}>
            <Stat>
              <StatLabel fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mb={1}>
                Eventos Documentados
              </StatLabel>
              <StatNumber fontSize={{ base: 'lg', md: 'xl' }} color="blue.500" fontWeight="bold">
                {getEventCount()}
              </StatNumber>
              <StatHelpText fontSize={{ base: 'sm', md: 'xs' }} mt={1}>
                <StatArrow type="increase" /> Actividades registradas
              </StatHelpText>
            </Stat>
          </Box>
          <Box
            textAlign="center"
            p={{ base: 4, md: 2 }}
            bg={{ base: 'purple.50', md: 'transparent' }}
            borderRadius={{ base: 'lg', md: 'none' }}
            border={{ base: '1px solid', md: 'none' }}
            borderColor={{ base: 'purple.200', md: 'transparent' }}>
            <Stat>
              <StatLabel fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mb={1}>
                Verificación
              </StatLabel>
              <StatNumber fontSize={{ base: 'lg', md: 'xl' }} color="purple.500" fontWeight="bold">
                {transparencyData?.verification_status?.transparency_verified ? 'Verificado' : 'En Progreso'}
              </StatNumber>
              <StatHelpText fontSize={{ base: 'sm', md: 'xs' }} mt={1}>
                <Icon as={MdVerified} /> Estado de verificación
              </StatHelpText>
            </Stat>
          </Box>
        </SimpleGrid>

        {/* Divider */}
        <Divider my={{ base: 3, md: 4 }} />

        {/* PRIMARY: Transparency Progress Section */}
        <Box mb={{ base: 2, md: 2 }}>
          <Heading
            size={{ base: 'xs', md: 'sm' }}
            mb={{ base: 2, md: 3 }}
            color="green.700"
            fontWeight="600">
            Progreso de Transparencia
          </Heading>
          <Progress
            value={getTransparencyScore()}
            colorScheme={getTransparencyScore() >= 80 ? 'green' : 'blue'}
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
            {getTransparencyScore()}% de documentación completa
            {getTransparencyScore() >= 95 && (
              <Text as="span" color="green.500" fontWeight="bold">
                {' - ¡Transparencia Certificada!'}
              </Text>
            )}
          </Text>
        </Box>
        
        {/* SECONDARY: Environmental Impact Section */}
        <Divider my={{ base: 3, md: 4 }} />
        
        <Box mb={{ base: 2, md: 2 }}>
          <Heading
            size={{ base: 'xs', md: 'sm' }}
            mb={{ base: 2, md: 3 }}
            color="gray.600"
            fontWeight="500">
            Impacto Ambiental
          </Heading>
          <VStack spacing={2}>
            <HStack justify="space-between" w="full" fontSize="sm">
              <Text color="gray.600">Huella Neta:</Text>
              <Text fontWeight="medium" color={(data?.net_carbon || 0) >= 0 ? 'orange.600' : 'green.600'}>
                {(data?.net_carbon || 0).toFixed(2)} kg CO₂e
              </Text>
            </HStack>
          </VStack>
        </Box>


        {/* Action Buttons */}
        <Flex justify="center" gap={3} pt={{ base: 1, md: 2 }}>
          <Button
            bg="green.500"
            color="white"
            h={{ base: '40px', md: '44px' }}
            fontSize={{ base: 'xs', md: 'sm' }}
            borderRadius="xl"
            px={{ base: 4, md: 6 }}
            onClick={() => navigate(`/admin/dashboard/establishment/${establishmentId}/productions`)}
            leftIcon={<Icon as={FaCheckCircle} />}
            _hover={{
              bg: 'green.600',
              transform: 'translateY(-1px)',
              boxShadow: 'md'
            }}
            _active={{
              bg: 'green.700'
            }}>
            Documentar Más
          </Button>
          <Button
            variant="outline"
            colorScheme="green"
            h={{ base: '40px', md: '44px' }}
            fontSize={{ base: 'xs', md: 'sm' }}
            borderRadius="xl"
            px={{ base: 4, md: 6 }}
            onClick={() => navigate(`/admin/dashboard/establishment/${establishmentId}/transparency`)}
            leftIcon={<Icon as={FaEye} />}
            _hover={{
              transform: 'translateY(-1px)',
              boxShadow: 'md'
            }}>
            Ver Impacto
          </Button>
        </Flex>
      </CardBody>
    </Card>
  );
};

export default TransparencySummaryCard;
