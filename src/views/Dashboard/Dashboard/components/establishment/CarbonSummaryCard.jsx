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
import { useGetEstablishmentComprehensiveDashboardQuery } from 'store/api/dashboardMetricsApi';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const TransparencySummaryCard = ({ establishmentId }) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'white');
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  // Get company from Redux state
  const activeCompany = useSelector((state) => state.company.currentCompany);
  const companyId = activeCompany?.id;

  // Get comprehensive transparency data (primary source)
  const {
    data: comprehensiveData,
    isLoading: isLoadingComprehensive,
    isFetching: isFetchingComprehensive,
    isError: isErrorComprehensive
  } = useGetEstablishmentComprehensiveDashboardQuery(
    { companyId, establishmentId },
    {
      refetchOnMountOrArgChange: true,
      skip: !companyId || !establishmentId
    }
  );

  // Get carbon data for environmental impact section (fallback)
  const {
    data: carbonData,
    isLoading: isLoadingCarbon,
    isFetching: isFetchingCarbon,
    isError: isErrorCarbon
  } = useGetCarbonFootprintSummaryQuery(
    { establishmentId, year },
    { refetchOnMountOrArgChange: true }
  );

  // Use comprehensive data as primary source, carbon data as fallback
  const data = comprehensiveData || carbonData;
  const isLoading = isLoadingComprehensive || isLoadingCarbon;
  const isFetching = isFetchingComprehensive || isFetchingCarbon;
  const isError = isErrorComprehensive && isErrorCarbon;

  // DEBUG: Log the API responses
  console.log('🐛 CarbonSummaryCard Debug:', {
    comprehensiveData,
    carbonData,
    isLoadingComprehensive,
    isLoadingCarbon,
    isErrorComprehensive,
    isErrorCarbon,
    companyId,
    establishmentId
  });

  // DEBUG: Log comprehensive data structure
  if (comprehensiveData) {
    console.log('🔍 Comprehensive Data Structure:', {
      dataType: typeof comprehensiveData,
      isObject: comprehensiveData && typeof comprehensiveData === 'object',
      rootKeys: Object.keys(comprehensiveData || {}),
      hasComprehensiveData: !!comprehensiveData.comprehensive_data,
      comprehensiveDataKeys: comprehensiveData.comprehensive_data
        ? Object.keys(comprehensiveData.comprehensive_data)
        : null,
      nestedData: comprehensiveData.comprehensive_data,
      fullData: JSON.stringify(comprehensiveData, null, 2)
    });
  }

  // Skip transparency API call for establishment level
  // This API is for production-level transparency, not establishment-level
  // We'll use carbon data to estimate transparency at establishment level
  const transparencyData = null; // Placeholder - API needs production ID, not establishment ID

  // Calculate transparency metrics - PRIMARY FOCUS
  const getTransparencyScore = () => {
    // Use comprehensive dashboard data if available (nested structure)
    const compData = comprehensiveData?.comprehensive_data;
    if (compData?.transparency_percentage !== undefined) {
      console.log('🎯 Using comprehensive transparency score:', compData.transparency_percentage);
      return compData.transparency_percentage;
    }

    // Fallback to carbon data calculation
    const eventCount = data?.entries_count?.total || 0;
    const photoCount = getPhotoCount();
    const productionCount = getActiveProductionsCount();

    // Dynamic transparency calculation based on actual establishment activity
    const baseScore = Math.min(60, (eventCount / 10) * 60); // Events contribute up to 60%
    const photoBonus = Math.min(20, (photoCount / 5) * 20); // Photos contribute up to 20%
    const productionBonus = Math.min(20, (productionCount / 3) * 20); // Productions contribute up to 20%

    const calculated = Math.min(100, Math.round(baseScore + photoBonus + productionBonus));
    console.log('🧮 Calculated transparency score:', calculated, {
      eventCount,
      photoCount,
      productionCount
    });
    return calculated;
  };

  const getEventCount = () => {
    // Use comprehensive dashboard data if available (nested structure)
    const compData = comprehensiveData?.comprehensive_data;
    if (compData?.total_events !== undefined) {
      return compData.total_events;
    }
    // Fallback to carbon data
    return carbonData?.entries_count?.total || 0;
  };

  const getPhotoCount = () => {
    // Use comprehensive dashboard data if available (nested structure)
    const compData = comprehensiveData?.comprehensive_data;
    if (compData?.total_photos !== undefined) {
      console.log('📸 Using comprehensive photo count:', compData.total_photos);
      return compData.total_photos;
    }

    // DEBUG: Try alternative field names that might exist
    if (comprehensiveData) {
      console.log(
        '📸 DEBUG: Looking for photo fields in comprehensiveData keys:',
        Object.keys(comprehensiveData)
      );
      const photoFields = Object.keys(comprehensiveData).filter(
        (key) => key.toLowerCase().includes('photo') || key.toLowerCase().includes('image')
      );
      console.log('📸 DEBUG: Found photo-related fields:', photoFields);

      // Try common variations
      const possiblePhotoFields = [
        'total_photos',
        'photos_count',
        'total_photo_count',
        'photo_count',
        'documented_photos'
      ];
      for (const field of possiblePhotoFields) {
        if (comprehensiveData[field] !== undefined) {
          console.log(`📸 DEBUG: Found photos in field "${field}":`, comprehensiveData[field]);
          return comprehensiveData[field];
        }
      }
    }

    // Fallback to carbon data
    const fallback = carbonData?.photos_count || 0;
    console.log('📸 Using fallback photo count:', fallback);
    return fallback;
  };

  const getActiveProductionsCount = () => {
    // Use comprehensive dashboard data if available (nested structure)
    const compData = comprehensiveData?.comprehensive_data;
    if (compData?.total_productions !== undefined) {
      console.log('🏭 Using comprehensive production count:', compData.total_productions);
      return compData.total_productions;
    }

    // DEBUG: Try alternative field names that might exist
    if (comprehensiveData) {
      console.log(
        '🏭 DEBUG: Looking for production fields in comprehensiveData keys:',
        Object.keys(comprehensiveData)
      );
      const productionFields = Object.keys(comprehensiveData).filter(
        (key) => key.toLowerCase().includes('production') || key.toLowerCase().includes('active')
      );
      console.log('🏭 DEBUG: Found production-related fields:', productionFields);

      // Try common variations
      const possibleProductionFields = [
        'total_productions',
        'active_productions',
        'productions_count',
        'production_count',
        'active_productions_count'
      ];
      for (const field of possibleProductionFields) {
        if (comprehensiveData[field] !== undefined) {
          console.log(`🏭 DEBUG: Found productions in field "${field}":`, comprehensiveData[field]);
          return comprehensiveData[field];
        }
      }
    }

    // Fallback to carbon data
    const fallback = carbonData?.active_productions_count || 0;
    console.log('🏭 Using fallback production count:', fallback);
    return fallback;
  };

  const getVerificationStatus = () => {
    // DEBUG: Log verification data structure
    console.log('🔐 Verification Debug:', {
      comprehensiveData: !!comprehensiveData,
      verificationBreakdown: comprehensiveData?.verification_breakdown,
      rootKeys: comprehensiveData ? Object.keys(comprehensiveData) : null,
      hasTransparencyMetrics: !!comprehensiveData?.transparency_metrics,
      transparencyKeys: comprehensiveData?.transparency_metrics
        ? Object.keys(comprehensiveData.transparency_metrics)
        : null
    });

    // Check comprehensive dashboard verification data (nested structure)
    let verificationData = comprehensiveData?.verification_breakdown;

    // If not found at root, check in transparency_metrics
    if (!verificationData && comprehensiveData?.transparency_metrics) {
      verificationData = comprehensiveData.transparency_metrics.verification_breakdown;
    }

    console.log('🔐 Verification Data Found:', verificationData);

    if (verificationData?.blockchain_verified > 0) {
      console.log('🔐 Status: Blockchain Verified');
      return 'Verificado';
    }
    if (verificationData?.usda_verified > 0) {
      console.log('🔐 Status: USDA Verified');
      return 'Verificado USDA';
    }

    // Fallback to carbon data
    if (data?.blockchain_verified) {
      return 'Verificado';
    }

    // Check completeness for verification readiness
    const score = getTransparencyScore();
    console.log('🔐 Verification Logic:', {
      score,
      isReadyForVerification: score >= 80,
      fallbackStatus: score >= 80 ? 'Listo para Verificar' : 'En Progreso'
    });

    if (score >= 80) {
      return 'Listo para Verificar';
    }
    return 'En Progreso';
  };

  // Get carbon data (for environmental impact section)
  const getCarbonData = () => {
    // Try comprehensive data first (flat structure may not have carbon_summary)
    if (comprehensiveData?.carbon_summary?.net_carbon !== undefined) {
      return comprehensiveData.carbon_summary.net_carbon;
    }
    // Fallback to carbon endpoint data
    return carbonData?.net_carbon || 0;
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
        <SimpleGrid columns={{ base: 1, md: 5 }} spacing={{ base: 4, md: 3 }}>
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
            bg={{ base: 'orange.50', md: 'transparent' }}
            borderRadius={{ base: 'lg', md: 'none' }}
            border={{ base: '1px solid', md: 'none' }}
            borderColor={{ base: 'orange.200', md: 'transparent' }}>
            <Stat>
              <StatLabel fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mb={1}>
                Fotos Documentadas
              </StatLabel>
              <StatNumber fontSize={{ base: 'lg', md: 'xl' }} color="orange.500" fontWeight="bold">
                {getPhotoCount()}
              </StatNumber>
              <StatHelpText fontSize={{ base: 'sm', md: 'xs' }} mt={1}>
                <StatArrow type="increase" /> Evidencia visual
              </StatHelpText>
            </Stat>
          </Box>
          <Box
            textAlign="center"
            p={{ base: 4, md: 2 }}
            bg={{ base: 'teal.50', md: 'transparent' }}
            borderRadius={{ base: 'lg', md: 'none' }}
            border={{ base: '1px solid', md: 'none' }}
            borderColor={{ base: 'teal.200', md: 'transparent' }}>
            <Stat>
              <StatLabel fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mb={1}>
                Producciones Activas
              </StatLabel>
              <StatNumber fontSize={{ base: 'lg', md: 'xl' }} color="teal.500" fontWeight="bold">
                {getActiveProductionsCount()}
              </StatNumber>
              <StatHelpText fontSize={{ base: 'sm', md: 'xs' }} mt={1}>
                <StatArrow type="increase" /> Ciclos en transparencia
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
                {getVerificationStatus()}
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
              <Text fontWeight="medium" color={getCarbonData() >= 0 ? 'orange.600' : 'green.600'}>
                {getCarbonData().toFixed(2)} kg CO₂e
              </Text>
            </HStack>
          </VStack>
        </Box>

        {/* Action Buttons - Enhanced for Transparency-First */}
        <Flex justify="center" gap={3} pt={{ base: 1, md: 2 }}>
          <Button
            bg="green.500"
            color="white"
            h={{ base: '40px', md: '44px' }}
            fontSize={{ base: 'xs', md: 'sm' }}
            borderRadius="xl"
            px={{ base: 4, md: 6 }}
            onClick={() =>
              navigate(`/admin/dashboard/establishment/${establishmentId}/productions`)
            }
            leftIcon={<Icon as={FaCheckCircle} />}
            _hover={{
              bg: 'green.600',
              transform: 'translateY(-1px)',
              boxShadow: 'md'
            }}
            _active={{
              bg: 'green.700'
            }}>
            Aumentar Transparencia
          </Button>
          <Button
            variant="outline"
            colorScheme="green"
            h={{ base: '40px', md: '44px' }}
            fontSize={{ base: 'xs', md: 'sm' }}
            borderRadius="xl"
            px={{ base: 4, md: 6 }}
            onClick={() =>
              navigate(`/admin/dashboard/establishment/${establishmentId}/transparency`)
            }
            leftIcon={<Icon as={FaEye} />}
            _hover={{
              transform: 'translateY(-1px)',
              boxShadow: 'md'
            }}>
            Ver Transparencia Completa
          </Button>
        </Flex>
      </CardBody>
    </Card>
  );
};

export default TransparencySummaryCard;
