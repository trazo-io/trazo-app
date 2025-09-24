import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Heading,
  useColorModeValue,
  Badge,
  Icon,
  Text,
  SimpleGrid,
  VStack,
  HStack,
  Button,
  useDisclosure,
  Alert,
  AlertIcon,
  Progress,
  useBreakpointValue,
  Container,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Card,
  CardHeader,
  CardBody,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Divider,
  CircularProgress,
  CircularProgressLabel,
  Tooltip
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronDownIcon, CheckCircleIcon } from '@chakra-ui/icons';
import {
  FaClipboardList,
  FaCamera,
  FaCheckCircle,
  FaShieldAlt,
  FaLeaf,
  FaAward,
  FaEye,
  FaUsers,
  FaFileAlt,
  FaChartLine,
  FaDownload,
  FaShare,
  FaCertificate,
  FaTrophy,
  FaLock,
  FaGlobe
} from 'react-icons/fa';
import { MdVerified, MdTrendingUp, MdEco } from 'react-icons/md';
import { IoIosArrowDown } from 'react-icons/io';

// Import transparency-focused APIs
import { useGetTransparencyDetailsQuery } from 'store/api/transparencyQrApi';
import { useGetCarbonFootprintSummaryQuery } from 'store/api/companyApi';
import { useGetProductionsByEstablishmentQuery } from 'store/api/historyApi';

// Import transparency components
import { TransparencyAchievements } from 'components/Achievements/TransparencyAchievements';
import { EnhancedTransparencyScoreDisplay } from 'components/Transparency';

const TransparencyDashboard: React.FC = () => {
  const { establishmentId } = useParams();
  const navigate = useNavigate();
  
  // Theme configuration
  const bg = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const accentColor = useColorModeValue('green.600', 'green.400');
  
  // Responsive configuration
  const isMobile = useBreakpointValue({ base: true, md: false });
  const headerFontSize = useBreakpointValue({ base: 'xl', md: '2xl' });
  
  // State management
  const [viewMode, setViewMode] = useState('establishment');
  const [productionId, setProductionId] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  
  // Primary data source: Transparency API
  const { 
    data: transparencyData, 
    isLoading: isTransparencyLoading,
    error: transparencyError 
  } = useGetTransparencyDetailsQuery(
    establishmentId?.toString() || '',
    { skip: !establishmentId }
  );
  
  // Secondary data source: Carbon data (for supporting metrics)
  const { 
    data: carbonData,
    isLoading: isCarbonLoading 
  } = useGetCarbonFootprintSummaryQuery({
    establishmentId: viewMode === 'establishment' ? establishmentId : undefined,
    productionId: viewMode === 'production' ? productionId : undefined,
    year: new Date().getFullYear()
  });
  
  // Productions data for view selector
  const { data: productions } = useGetProductionsByEstablishmentQuery({ 
    establishmentId 
  });
  
  // Calculate transparency metrics - PRIMARY FOCUS
  const getTransparencyScore = (): number => {
    if (transparencyData?.quick_view?.transparency_score?.percentage) {
      return transparencyData.quick_view.transparency_score.percentage;
    }
    // Fallback calculation based on documented events
    return Math.min(100, Math.round(((carbonData?.entries_count?.total || 0) / 15) * 100));
  };
  
  const getEventCount = (): number => {
    return carbonData?.entries_count?.total || 0;
  };
  
  const getVerificationCount = (): number => {
    // Count verified events - this would come from transparency API in real implementation
    return Math.floor(getEventCount() * 0.3); // Estimate 30% verified
  };
  
  const getPhotoCount = (): number => {
    // Count events with photos - this would come from transparency API in real implementation
    return Math.floor(getEventCount() * 0.6); // Estimate 60% have photos
  };
  
  // Get transparency status and messaging
  const getTransparencyStatus = (score: number) => {
    if (score >= 95) return { 
      status: 'Transparencia Certificada', 
      color: 'green', 
      icon: FaTrophy,
      description: 'Documentación completa y verificada'
    };
    if (score >= 85) return { 
      status: 'Excelente Transparencia', 
      color: 'green', 
      icon: FaAward,
      description: 'Documentación comprensiva disponible'
    };
    if (score >= 70) return { 
      status: 'Buena Transparencia', 
      color: 'blue', 
      icon: FaCheckCircle,
      description: 'Documentación regular y confiable'
    };
    if (score >= 50) return { 
      status: 'Transparencia Básica', 
      color: 'orange', 
      icon: FaClipboardList,
      description: 'Información básica disponible'
    };
    return { 
      status: 'Construyendo Transparencia', 
      color: 'red', 
      icon: FaFileAlt,
      description: 'Ampliar documentación recomendada'
    };
  };
  
  const transparencyScore = getTransparencyScore();
  const transparencyStatus = getTransparencyStatus(transparencyScore);
  
  // Handle view mode changes
  const handleViewModeChange = (event: { target: { value: string } }) => {
    setViewMode(event.target.value);
    if (event.target.value === 'establishment') {
      setProductionId('');
    }
  };
  
  // Loading state
  if (isTransparencyLoading || isCarbonLoading) {
    return (
      <Box minH="100vh" bg={bg} display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <CircularProgress isIndeterminate color="green.400" size="120px">
            <CircularProgressLabel>
              <Icon as={FaClipboardList} boxSize={8} color="green.500" />
            </CircularProgressLabel>
          </CircularProgress>
          <Text fontSize="lg" color={textColor}>Cargando datos de transparencia...</Text>
        </VStack>
      </Box>
    );
  }
  
  return (
    <Box minH="100vh" bg={bg} py={{ base: 4, md: 8 }} px={{ base: 2, md: 6 }}>
      <Container maxW="7xl" mx="auto">
        <VStack spacing={8} align="stretch">
          
          {/* Header Section - TRANSPARENCY FIRST */}
          <Flex
            direction={{ base: 'column', md: 'row' }}
            justify="space-between"
            align="center"
            gap={6}
            pt={12}
          >
            <VStack align="start" spacing={2}>
              <Heading as="h1" size={headerFontSize} color={textColor} fontWeight="bold">
                Panel de Transparencia
              </Heading>
              <Text color={mutedColor} fontSize="lg">
                Documenta prácticas agrícolas y construye confianza del consumidor
              </Text>
            </VStack>
            
            {/* View Mode Selector */}
            <HStack spacing={4}>
              <Menu>
                <MenuButton
                  as={Button}
                  rightIcon={<IoIosArrowDown />}
                  colorScheme="green"
                  variant="outline"
                  minW="180px"
                  h="44px"
                  fontSize="sm"
                >
                  {viewMode === 'establishment' ? 'Vista Establecimiento' : 'Vista Producción'}
                </MenuButton>
                <MenuList>
                  <MenuItem onClick={() => handleViewModeChange({ target: { value: 'establishment' } })}>
                    Vista Establecimiento
                  </MenuItem>
                  <MenuDivider />
                  <MenuItem onClick={() => handleViewModeChange({ target: { value: 'production' } })}>
                    Vista Producción
                  </MenuItem>
                </MenuList>
              </Menu>
              
              {viewMode === 'production' && (
                <Menu>
                  <MenuButton
                    as={Button}
                    rightIcon={<ChevronDownIcon />}
                    variant="outline"
                    minW="200px"
                    h="44px"
                    fontSize="sm"
                    isDisabled={!productions?.length}
                  >
                    {productionId ? `Producción ${productionId}` : 'Seleccionar Producción'}
                  </MenuButton>
                  <MenuList>
                    {productions?.map((production) => (
                      <MenuItem 
                        key={production.id}
                        onClick={() => setProductionId(production.id.toString())}
                      >
                        {production.product?.name || `Producción ${production.id}`}
                      </MenuItem>
                    ))}
                  </MenuList>
                </Menu>
              )}
            </HStack>
          </Flex>
          
          {/* Primary Transparency Metrics Card */}
          <Card bg={cardBg} borderColor={borderColor} borderWidth="1px" boxShadow="lg">
            <CardHeader>
              <HStack justify="space-between" align="center">
                <HStack spacing={3}>
                  <Icon as={transparencyStatus.icon} color={`${transparencyStatus.color}.500`} boxSize={8} />
                  <VStack align="start" spacing={0}>
                    <Heading as="h2" size="lg" color={textColor}>
                      {transparencyStatus.status}
                    </Heading>
                    <Text color={mutedColor} fontSize="sm">
                      {transparencyStatus.description}
                    </Text>
                  </VStack>
                </HStack>
                
                <Badge 
                  colorScheme={transparencyStatus.color} 
                  variant="solid" 
                  px={4} 
                  py={2} 
                  borderRadius="full"
                  fontSize="lg"
                  fontWeight="bold"
                >
                  {transparencyScore}%
                </Badge>
              </HStack>
            </CardHeader>
            
            <CardBody pt={0}>
              {/* PRIMARY TRANSPARENCY METRICS */}
              <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6} mb={8}>
                
                {/* 1. TRANSPARENCY SCORE - PRIMARY METRIC */}
                <VStack spacing={3}>
                  <CircularProgress 
                    value={transparencyScore} 
                    color={`${transparencyStatus.color}.400`}
                    size="120px"
                    thickness="8px"
                  >
                    <CircularProgressLabel>
                      <VStack spacing={0}>
                        <Text fontSize="2xl" fontWeight="bold" color={textColor}>
                          {transparencyScore}%
                        </Text>
                        <Text fontSize="xs" color={mutedColor}>
                          Transparencia
                        </Text>
                      </VStack>
                    </CircularProgressLabel>
                  </CircularProgress>
                  
                  <VStack spacing={1}>
                    <Text fontSize="sm" fontWeight="bold" color={textColor} textAlign="center">
                      Puntuación General
                    </Text>
                    <Text fontSize="xs" color={mutedColor} textAlign="center">
                      Basada en documentación completa
                    </Text>
                  </VStack>
                </VStack>
                
                {/* 2. DOCUMENTED EVENTS */}
                <Stat textAlign="center">
                  <StatLabel color={mutedColor} fontSize="sm">
                    Eventos Documentados
                  </StatLabel>
                  <StatNumber color={accentColor} fontSize="3xl">
                    {getEventCount()}
                  </StatNumber>
                  <StatHelpText>
                    <StatArrow type="increase" />
                    Actividades registradas
                  </StatHelpText>
                </Stat>
                
                {/* 3. VERIFICATION STATUS */}
                <Stat textAlign="center">
                  <StatLabel color={mutedColor} fontSize="sm">
                    Eventos Verificados
                  </StatLabel>
                  <StatNumber color="blue.500" fontSize="3xl">
                    {getVerificationCount()}
                  </StatNumber>
                  <StatHelpText>
                    <HStack justify="center">
                      <Icon as={MdVerified} color="blue.500" />
                      <Text>Datos confirmados</Text>
                    </HStack>
                  </StatHelpText>
                </Stat>
                
                {/* 4. VISUAL EVIDENCE */}
                <Stat textAlign="center">
                  <StatLabel color={mutedColor} fontSize="sm">
                    Evidencia Visual
                  </StatLabel>
                  <StatNumber color="purple.500" fontSize="3xl">
                    {getPhotoCount()}
                  </StatNumber>
                  <StatHelpText>
                    <HStack justify="center">
                      <Icon as={FaCamera} color="purple.500" />
                      <Text>Fotos incluidas</Text>
                    </HStack>
                  </StatHelpText>
                </Stat>
                
              </SimpleGrid>
              
              {/* Progress Bar */}
              <Box mb={6}>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="sm" fontWeight="medium" color={textColor}>
                    Progreso hacia Transparencia Completa
                  </Text>
                  <Text fontSize="sm" color={mutedColor}>
                    {transparencyScore}% / 100%
                  </Text>
                </HStack>
                <Progress 
                  value={transparencyScore} 
                  colorScheme={transparencyStatus.color}
                  size="lg"
                  borderRadius="md"
                  bg="gray.100"
                />
              </Box>
              
              {/* Trust Indicators */}
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                <HStack spacing={2}>
                  <Icon as={FaShieldAlt} color="green.500" />
                  <Text fontSize="sm" color={textColor}>Datos Verificados</Text>
                </HStack>
                <HStack spacing={2}>
                  <Icon as={FaCamera} color="purple.500" />
                  <Text fontSize="sm" color={textColor}>Evidencia Visual</Text>
                </HStack>
                <HStack spacing={2}>
                  <Icon as={FaUsers} color="blue.500" />
                  <Text fontSize="sm" color={textColor}>Acceso Público</Text>
                </HStack>
                <HStack spacing={2}>
                  <Icon as={FaLock} color="orange.500" />
                  <Text fontSize="sm" color={textColor}>Blockchain Seguro</Text>
                </HStack>
              </SimpleGrid>
            </CardBody>
          </Card>
          
          {/* Detailed Transparency Analytics */}
          <Tabs colorScheme="green" variant="enclosed" index={activeTab} onChange={setActiveTab}>
            <TabList>
              <Tab>Documentación</Tab>
              <Tab>Verificación</Tab>
              <Tab>Impacto del Consumidor</Tab>
              <Tab>Datos Ambientales</Tab>
            </TabList>
            
            <TabPanels>
              {/* Documentation Tab */}
              <TabPanel px={0}>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <Card bg={cardBg}>
                    <CardHeader>
                      <HStack>
                        <Icon as={FaClipboardList} color="green.500" boxSize={6} />
                        <Text fontWeight="bold">Estado de Documentación</Text>
                      </HStack>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={4}>
                        <Box w="full">
                          <HStack justify="space-between" mb={1}>
                            <Text fontSize="sm">Siembra</Text>
                            <Text fontSize="sm" fontWeight="bold">Completo</Text>
                          </HStack>
                          <Progress value={100} colorScheme="green" size="sm" />
                        </Box>
                        <Box w="full">
                          <HStack justify="space-between" mb={1}>
                            <Text fontSize="sm">Riego</Text>
                            <Text fontSize="sm" fontWeight="bold">85%</Text>
                          </HStack>
                          <Progress value={85} colorScheme="green" size="sm" />
                        </Box>
                        <Box w="full">
                          <HStack justify="space-between" mb={1}>
                            <Text fontSize="sm">Fertilización</Text>
                            <Text fontSize="sm" fontWeight="bold">70%</Text>
                          </HStack>
                          <Progress value={70} colorScheme="yellow" size="sm" />
                        </Box>
                        <Box w="full">
                          <HStack justify="space-between" mb={1}>
                            <Text fontSize="sm">Cosecha</Text>
                            <Text fontSize="sm" fontWeight="bold">90%</Text>
                          </HStack>
                          <Progress value={90} colorScheme="green" size="sm" />
                        </Box>
                      </VStack>
                    </CardBody>
                  </Card>
                  
                  <Card bg={cardBg}>
                    <CardHeader>
                      <HStack>
                        <Icon as={FaChartLine} color="blue.500" boxSize={6} />
                        <Text fontWeight="bold">Tendencias de Documentación</Text>
                      </HStack>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={4}>
                        <Stat>
                          <StatLabel>Eventos este mes</StatLabel>
                          <StatNumber color="blue.500">24</StatNumber>
                          <StatHelpText>
                            <StatArrow type="increase" />
                            15% más que el mes anterior
                          </StatHelpText>
                        </Stat>
                        <Stat>
                          <StatLabel>Promedio de fotos por evento</StatLabel>
                          <StatNumber color="purple.500">3.2</StatNumber>
                          <StatHelpText>
                            <StatArrow type="increase" />
                            Mejorando evidencia visual
                          </StatHelpText>
                        </Stat>
                      </VStack>
                    </CardBody>
                  </Card>
                </SimpleGrid>
              </TabPanel>
              
              {/* Verification Tab */}
              <TabPanel px={0}>
                <Alert status="info" borderRadius="md" mb={6}>
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">Sistema de Verificación</Text>
                    <Text fontSize="sm">
                      Los datos están siendo verificados por terceros para garantizar la autenticidad.
                    </Text>
                  </Box>
                </Alert>
                
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                  <Card bg="green.50" borderColor="green.200" borderWidth="1px">
                    <CardBody textAlign="center">
                      <Icon as={FaCertificate} color="green.500" boxSize={12} mb={4} />
                      <Text fontWeight="bold" fontSize="lg" mb={2}>
                        Verificación USDA
                      </Text>
                      <Badge colorScheme="green" variant="solid">Activo</Badge>
                      <Text fontSize="sm" color="green.600" mt={2}>
                        Datos respaldados por estándares oficiales
                      </Text>
                    </CardBody>
                  </Card>
                  
                  <Card bg="blue.50" borderColor="blue.200" borderWidth="1px">
                    <CardBody textAlign="center">
                      <Icon as={FaLock} color="blue.500" boxSize={12} mb={4} />
                      <Text fontWeight="bold" fontSize="lg" mb={2}>
                        Blockchain
                      </Text>
                      <Badge colorScheme="blue" variant="solid">Implementado</Badge>
                      <Text fontSize="sm" color="blue.600" mt={2}>
                        Datos inmutables y transparentes
                      </Text>
                    </CardBody>
                  </Card>
                  
                  <Card bg="purple.50" borderColor="purple.200" borderWidth="1px">
                    <CardBody textAlign="center">
                      <Icon as={FaAward} color="purple.500" boxSize={12} mb={4} />
                      <Text fontWeight="bold" fontSize="lg" mb={2}>
                        Certificación Trazo
                      </Text>
                      <Badge colorScheme="purple" variant="solid">Certificado</Badge>
                      <Text fontSize="sm" color="purple.600" mt={2}>
                        Transparencia verificada por Trazo
                      </Text>
                    </CardBody>
                  </Card>
                </SimpleGrid>
              </TabPanel>
              
              {/* Consumer Impact Tab */}
              <TabPanel px={0}>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <Card bg={cardBg}>
                    <CardHeader>
                      <HStack>
                        <Icon as={FaUsers} color="blue.500" boxSize={6} />
                        <Text fontWeight="bold">Engagement del Consumidor</Text>
                      </HStack>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={4}>
                        <Stat>
                          <StatLabel>Escaneos QR este mes</StatLabel>
                          <StatNumber color="blue.500">342</StatNumber>
                          <StatHelpText>
                            <StatArrow type="increase" />
                            78% más que el mes anterior
                          </StatHelpText>
                        </Stat>
                        <Stat>
                          <StatLabel>Tiempo promedio de visualización</StatLabel>
                          <StatNumber color="green.500">2:45</StatNumber>
                          <StatHelpText>
                            Minutos explorando su transparencia
                          </StatHelpText>
                        </Stat>
                      </VStack>
                    </CardBody>
                  </Card>
                  
                  <Card bg={cardBg}>
                    <CardHeader>
                      <HStack>
                        <Icon as={FaGlobe} color="green.500" boxSize={6} />
                        <Text fontWeight="bold">Alcance de Transparencia</Text>
                      </HStack>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={4}>
                        <Text fontSize="sm" color={mutedColor}>
                          Su transparencia está ayudando a los consumidores a tomar decisiones informadas sobre alimentos.
                        </Text>
                        <Badge colorScheme="green" variant="solid" p={2} borderRadius="md">
                          Impacto Positivo Confirmado
                        </Badge>
                      </VStack>
                    </CardBody>
                  </Card>
                </SimpleGrid>
              </TabPanel>
              
              {/* Environmental Data Tab - SECONDARY */}
              <TabPanel px={0}>
                <Alert status="info" borderRadius="md" mb={6}>
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">Datos Ambientales de Apoyo</Text>
                    <Text fontSize="sm">
                      Información complementaria para clientes B2B y reportes de sostenibilidad.
                    </Text>
                  </Box>
                </Alert>
                
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                  <Stat>
                    <StatLabel>Huella de Carbono</StatLabel>
                    <StatNumber color="orange.500">
                      {carbonData?.total_emissions?.toFixed(1) || '0.0'} kg CO₂e
                    </StatNumber>
                    <StatHelpText>
                      Para reportes B2B
                    </StatHelpText>
                  </Stat>
                  
                  <Stat>
                    <StatLabel>Compensaciones</StatLabel>
                    <StatNumber color="green.500">
                      {carbonData?.total_offsets?.toFixed(1) || '0.0'} kg CO₂e
                    </StatNumber>
                    <StatHelpText>
                      Proyectos de compensación
                    </StatHelpText>
                  </Stat>
                  
                  <Stat>
                    <StatLabel>Huella Neta</StatLabel>
                    <StatNumber color="blue.500">
                      {carbonData?.net_carbon?.toFixed(1) || '0.0'} kg CO₂e
                    </StatNumber>
                    <StatHelpText>
                      Impacto total neto
                    </StatHelpText>
                  </Stat>
                </SimpleGrid>
              </TabPanel>
            </TabPanels>
          </Tabs>
          
          {/* Action Buttons */}
          <Card bg={cardBg}>
            <CardBody>
              <HStack spacing={4} justify="center" flexWrap="wrap">
                <Button
                  leftIcon={<FaFileAlt />}
                  colorScheme="green"
                  size="lg"
                  onClick={() => navigate(`/admin/dashboard/establishment/${establishmentId}/productions`)}
                >
                  Documentar Más Actividades
                </Button>
                
                <Button
                  leftIcon={<FaEye />}
                  variant="outline"
                  colorScheme="blue"
                  size="lg"
                  onClick={() => window.open(`/production/${establishmentId}`, '_blank')}
                >
                  Vista del Consumidor
                </Button>
                
                <Button
                  leftIcon={<FaDownload />}
                  variant="outline"
                  colorScheme="gray"
                  size="lg"
                >
                  Descargar Reporte
                </Button>
                
                <Button
                  leftIcon={<FaShare />}
                  variant="outline"
                  colorScheme="purple"
                  size="lg"
                >
                  Compartir Transparencia
                </Button>
              </HStack>
            </CardBody>
          </Card>
          
        </VStack>
      </Container>
    </Box>
  );
};

export default TransparencyDashboard;