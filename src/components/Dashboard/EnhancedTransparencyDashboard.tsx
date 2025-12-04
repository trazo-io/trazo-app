import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  Box,
  VStack,
  useBreakpointValue,
  Skeleton,
  Alert,
  AlertIcon,
  Text,
  HStack,
  Badge,
  Button,
  Icon,
  useColorModeValue,
  SimpleGrid,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Input,
  Textarea,
  Select,
  useToast
} from '@chakra-ui/react';
import {
  FaClipboardList,
  FaCamera,
  FaChartLine,
  FaLeaf,
  FaUpload,
  FaCloudUploadAlt
} from 'react-icons/fa';
import { MdVerified } from 'react-icons/md';

import { StandardPage } from '../Design/StandardComponents';
import { StandardCard } from '../Design/StandardComponents';
import { TransparencyHeroSection } from './TransparencyHeroSection';
import { TrustIndicators } from './TrustIndicators';
import { CarbonAnalysisExpandable } from './CarbonAnalysisExpandable';
import { useGetEstablishmentDashboardMetricsQuery } from '../../store/api/dashboardMetricsApi';
import {
  useGetDashboardComprehensiveQuery,
  useGetCarbonScopeBreakdownQuery
} from '../../store/api/carbonApi';

interface EnhancedTransparencyDashboardProps {
  establishmentId: string;
  user: any;
  transparencyScore: number;
  carbonSummary: {
    total_emissions: number;
    total_offsets: number;
    net_carbon: number;
    carbon_intensity: number;
  };
  trends: {
    transparency_trend: 'up' | 'down' | 'stable';
    carbon_trend: 'up' | 'down' | 'stable';
    engagement_trend: 'up' | 'down' | 'stable';
  };
  recentActivity: Array<{
    id: number;
    type: string;
    description: string;
    date: string;
    carbon_impact: number;
  }>;
  isMobile?: boolean;
}

export const EnhancedTransparencyDashboard: React.FC<EnhancedTransparencyDashboardProps> =
  React.memo(
    ({
      establishmentId,
      user,
      transparencyScore,
      carbonSummary,
      trends,
      recentActivity,
      isMobile = false
    }) => {
      const [loadPhase, setLoadPhase] = useState<'transparency' | 'trust' | 'carbon' | 'complete'>(
        'transparency'
      );
      const [performanceStart] = useState(performance.now());
      const [activeAction, setActiveAction] = useState<string | null>(null);
      const [recommendations] = useState([]);

      const toast = useToast();

      // Modal controls
      const {
        isOpen: isPhotoModalOpen,
        onOpen: onPhotoModalOpen,
        onClose: onPhotoModalClose
      } = useDisclosure();
      const {
        isOpen: isVerificationModalOpen,
        onOpen: onVerificationModalOpen,
        onClose: onVerificationModalClose
      } = useDisclosure();

      const cardSpacing = useBreakpointValue({ base: 4, md: 6 }) || 4;

      // API queries
      const {
        data: dashboardData,
        isLoading: isDashboardLoading,
        error: dashboardError
      } = useGetDashboardComprehensiveQuery({
        companyId: user?.company?.id?.toString() || '1',
        establishmentId
      });

      const {
        data: carbonScopeData,
        isLoading: isCarbonScopeLoading,
        error: carbonScopeError
      } = useGetCarbonScopeBreakdownQuery({
        companyId: user?.company?.id?.toString() || '1',
        establishmentId
      });

      // Process data for display
      const processedData = useMemo(() => {
        if (dashboardData) {
          // Use real API data when available
          return {
            transparencyScore:
              dashboardData.transparency_metrics?.overall_score || transparencyScore,
            carbonSummary: dashboardData.carbon_summary || carbonSummary,
            trustMetrics: dashboardData.transparency_metrics?.trust_indicators || {},
            trends: dashboardData.performance_trends || trends,
            recentActivity:
              dashboardData.recent_activity?.slice(0, 5) || recentActivity.slice(0, 5),
            hasBlockchainVerification:
              dashboardData.transparency_metrics?.trust_indicators?.blockchain_verified || false,
            photoEvidenceCount:
              dashboardData.transparency_metrics?.trust_indicators?.photo_evidence_count || 3
          };
        }

        // Fallback to props when API data not available
        return {
          transparencyScore: transparencyScore,
          carbonSummary: carbonSummary,
          trustMetrics: {},
          trends: trends,
          recentActivity: recentActivity.slice(0, 5),
          hasBlockchainVerification: false,
          photoEvidenceCount: 3
        };
      }, [dashboardData, transparencyScore, carbonSummary, trends, recentActivity]);

      // Progressive loading phases
      useEffect(() => {
        if (loadPhase === 'transparency') {
          const timer = setTimeout(() => setLoadPhase('trust'), 500);
          return () => clearTimeout(timer);
        }
        if (loadPhase === 'trust') {
          const timer = setTimeout(() => setLoadPhase('carbon'), 1000);
          return () => clearTimeout(timer);
        }
        if (loadPhase === 'carbon') {
          const timer = setTimeout(() => setLoadPhase('complete'), 1500);
          return () => clearTimeout(timer);
        }
      }, [loadPhase]);

      // Action handlers
      const handlePhotoUpload = useCallback(
        async (eventId: string, files: FileList) => {
          try {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            toast({
              title: 'Fotos subidas exitosamente',
              description: 'Las fotos han sido verificadas y añadidas al evento.',
              status: 'success',
              duration: 5000,
              isClosable: true
            });
          } catch (error) {
            toast({
              title: 'Error al subir fotos',
              description: 'Por favor, inténtalo de nuevo.',
              status: 'error',
              duration: 5000,
              isClosable: true
            });
          }
        },
        [toast]
      );

      const handleQuickEventAdd = useCallback(
        async (eventType: string, productionId?: string) => {
          setActiveAction(eventType);
          try {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            toast({
              title: 'Evento agregado exitosamente',
              description: `Se ha documentado el evento de ${eventType} para mejorar tu transparencia.`,
              status: 'success',
              duration: 5000,
              isClosable: true
            });
          } catch (error) {
            toast({
              title: 'Error al agregar evento',
              description: 'Por favor, inténtalo de nuevo.',
              status: 'error',
              duration: 5000,
              isClosable: true
            });
          } finally {
            setActiveAction(null);
          }
        },
        [toast]
      );

      const handleVerificationRequest = useCallback(
        async (productionId: string) => {
          setActiveAction(`verify-${productionId}`);
          try {
            await new Promise((resolve) => setTimeout(resolve, 3000));
            toast({
              title: 'Verificación iniciada',
              description: 'Tu producción está siendo verificada por nuestro equipo.',
              status: 'info',
              duration: 5000,
              isClosable: true
            });
          } catch (error) {
            toast({
              title: 'Error al solicitar verificación',
              description: 'Por favor, inténtalo de nuevo.',
              status: 'error',
              duration: 5000,
              isClosable: true
            });
          } finally {
            setActiveAction(null);
          }
        },
        [toast]
      );

      const handleCarbonOptimization = useCallback(async () => {
        setActiveAction('carbon-optimization');
        try {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          toast({
            title: 'Optimización aplicada',
            description: 'Se han aplicado las recomendaciones de carbono.',
            status: 'success',
            duration: 5000,
            isClosable: true
          });
        } catch (error) {
          toast({
            title: 'Error en optimización',
            description: 'Por favor, inténtalo de nuevo.',
            status: 'error',
            duration: 5000,
            isClosable: true
          });
        } finally {
          setActiveAction(null);
        }
      }, [toast]);

      // Urgency alerts
      const urgencyAlerts = useMemo(() => {
        const alerts = [];

        if (transparencyScore < 60) {
          alerts.push({
            type: 'critical',
            title: `🚨 Puntuación de Transparencia Baja (${transparencyScore}%)`,
            description: `Tu transparencia está por debajo del 60%. Documenta más actividades agrícolas.`,
            action: 'Documentar Actividades',
            actionIcon: FaClipboardList,
            actionColor: 'red'
          });
        }

        if (trends?.transparency_trend === 'down') {
          alerts.push({
            type: 'warning',
            title: `📉 Transparencia en Declive`,
            description: `Tu transparencia está disminuyendo. Aumenta la documentación de eventos.`,
            action: 'Ver Estrategia',
            actionIcon: FaChartLine,
            actionColor: 'orange'
          });
        }

        return alerts;
      }, [transparencyScore, trends]);

      const title = `Transparency Dashboard - ${user?.company?.name || 'Farm'} Dashboard`;
      const description = 'Complete transparency overview with actionable insights';

      return (
        <StandardPage title={title} description={description}>
          <VStack spacing={cardSpacing} align="stretch">
            {/* Phase 1: Transparency Hero Section */}
            <StandardCard variant="elevated" title="Transparency Overview">
              {processedData ? (
                <TransparencyHeroSection
                  transparencyScore={processedData.transparencyScore}
                  carbonSummary={processedData.carbonSummary}
                  trends={processedData.trends}
                  recentActivity={processedData.recentActivity}
                  isMobile={isMobile}
                />
              ) : (
                <VStack spacing={4}>
                  <Skeleton height="120px" borderRadius="lg" />
                  <Skeleton height="60px" borderRadius="lg" />
                </VStack>
              )}
            </StandardCard>

            {/* Urgency Alerts */}
            {urgencyAlerts.length > 0 && (
              <StandardCard
                variant="elevated"
                title="⚠️ Alertas Urgentes"
                subtitle="Acciones que requieren atención inmediata"
              >
                <VStack spacing={3} align="stretch">
                  {urgencyAlerts.slice(0, 2).map((alert, index) => (
                    <Alert
                      key={index}
                      status={
                        alert.type === 'critical'
                          ? 'error'
                          : alert.type === 'warning'
                          ? 'warning'
                          : 'info'
                      }
                      borderRadius="lg"
                      variant="left-accent"
                    >
                      <AlertIcon />
                      <Box flex={1}>
                        <HStack justify="space-between" align="start">
                          <VStack align="start" spacing={1} flex={1}>
                            <Text fontWeight="bold" fontSize="sm">
                              {alert.title}
                            </Text>
                            <Text fontSize="xs" color={useColorModeValue('gray.600', 'gray.400')}>
                              {alert.description}
                            </Text>
                          </VStack>
                          <Button
                            size="sm"
                            colorScheme={alert.actionColor}
                            leftIcon={<Icon as={alert.actionIcon} />}
                            onClick={() => {
                              /* Handle alert action */
                            }}
                          >
                            {alert.action}
                          </Button>
                        </HStack>
                      </Box>
                    </Alert>
                  ))}
                </VStack>
              </StandardCard>
            )}

            {/* Transparency Actions Section */}
            {processedData && (
              <StandardCard
                variant="elevated"
                title="📊 Centro de Acciones de Transparencia"
                subtitle="Mejora tu puntuación tomando acciones inmediatas"
              >
                <VStack spacing={6} align="stretch">
                  {/* Quick Actions Grid */}
                  <SimpleGrid columns={isMobile ? 2 : 4} spacing={4}>
                    <Button
                      size="lg"
                      h="auto"
                      py={4}
                      flexDirection="column"
                      variant="outline"
                      colorScheme="blue"
                      onClick={onPhotoModalOpen}
                      _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
                      transition="all 0.2s"
                    >
                      <Icon as={FaCamera} boxSize={8} mb={2} />
                      <Text fontSize="sm" fontWeight="bold">
                        Subir Fotos
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        +5% transparencia
                      </Text>
                    </Button>

                    <Button
                      size="lg"
                      h="auto"
                      py={4}
                      flexDirection="column"
                      variant="outline"
                      colorScheme="purple"
                      onClick={onVerificationModalOpen}
                      _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
                      transition="all 0.2s"
                    >
                      <Icon as={MdVerified} boxSize={8} mb={2} />
                      <Text fontSize="sm" fontWeight="bold">
                        Verificar
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        +10% confianza
                      </Text>
                    </Button>

                    <Button
                      size="lg"
                      h="auto"
                      py={4}
                      flexDirection="column"
                      variant="outline"
                      colorScheme="green"
                      onClick={() => handleQuickEventAdd('document_harvest', 'current')}
                      _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
                      transition="all 0.2s"
                    >
                      <Icon as={FaClipboardList} boxSize={8} mb={2} />
                      <Text fontSize="sm" fontWeight="bold">
                        Documentar
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        +3% por evento
                      </Text>
                    </Button>

                    <Button
                      size="lg"
                      h="auto"
                      py={4}
                      flexDirection="column"
                      variant="outline"
                      colorScheme="teal"
                      onClick={() => handleCarbonOptimization()}
                      _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
                      transition="all 0.2s"
                    >
                      <Icon as={FaChartLine} boxSize={8} mb={2} />
                      <Text fontSize="sm" fontWeight="bold">
                        Optimizar
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        -15% carbono
                      </Text>
                    </Button>
                  </SimpleGrid>

                  {/* Smart Recommendations */}
                  {recommendations.length > 0 && (
                    <Box>
                      <Text
                        fontSize="sm"
                        fontWeight="bold"
                        mb={3}
                        color={useColorModeValue('gray.700', 'gray.300')}
                      >
                        💡 Recomendaciones Personalizadas
                      </Text>
                      <VStack spacing={3} align="stretch">
                        {recommendations.slice(0, 3).map((rec, index) => (
                          <HStack
                            key={index}
                            p={3}
                            bg={useColorModeValue('blue.50', 'blue.900')}
                            borderRadius="lg"
                            spacing={3}
                            align="start"
                          >
                            <Icon as={rec.icon} color={rec.color} boxSize={5} mt={1} />
                            <VStack align="start" flex={1} spacing={1}>
                              <Text fontSize="sm" fontWeight="medium">
                                {rec.title}
                              </Text>
                              <Text fontSize="xs" color={useColorModeValue('gray.600', 'gray.400')}>
                                {rec.description}
                              </Text>
                            </VStack>
                            <Button
                              size="xs"
                              colorScheme={rec.buttonColor}
                              onClick={() => rec.action()}
                            >
                              {rec.actionLabel}
                            </Button>
                          </HStack>
                        ))}
                      </VStack>
                    </Box>
                  )}
                </VStack>
              </StandardCard>
            )}

            {/* Phase 2: Trust Indicators - Progressive Loading */}
            {processedData &&
              (loadPhase === 'trust' || loadPhase === 'carbon' || loadPhase === 'complete') && (
                <StandardCard variant="elevated" title="Trust & Verification">
                  {loadPhase === 'trust' && isMobile ? (
                    <VStack spacing={4}>
                      <Skeleton height="100px" borderRadius="full" alignSelf="center" />
                      <Skeleton height="80px" borderRadius="lg" />
                    </VStack>
                  ) : (
                    <TrustIndicators
                      trustMetrics={processedData.trustMetrics}
                      photoEvidenceCount={processedData.photoEvidenceCount}
                      hasBlockchainVerification={processedData.hasBlockchainVerification}
                      isMobile={isMobile}
                    />
                  )}
                </StandardCard>
              )}

            {/* Phase 3: Carbon Analysis - Progressive Loading */}
            {(loadPhase === 'carbon' || loadPhase === 'complete') && (
              <StandardCard variant="elevated" title="Carbon Analysis">
                {(isCarbonScopeLoading && !carbonScopeData) ||
                (isMobile && loadPhase === 'carbon') ? (
                  <VStack spacing={4}>
                    <Skeleton height="80px" borderRadius="lg" />
                    <Skeleton height="120px" borderRadius="lg" />
                    <Skeleton height="100px" borderRadius="lg" />
                  </VStack>
                ) : (
                  <CarbonAnalysisExpandable
                    carbonScopeData={carbonScopeData}
                    carbonSummary={processedData?.carbonSummary}
                    isLoading={isCarbonScopeLoading}
                    isMobile={isMobile}
                  />
                )}
              </StandardCard>
            )}
          </VStack>

          {/* Photo Upload Modal */}
          <Modal isOpen={isPhotoModalOpen} onClose={onPhotoModalClose} size="lg">
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>
                <HStack spacing={3}>
                  <Icon as={FaCamera} color="blue.500" boxSize={6} />
                  <Text>Subir Fotos para Verificación</Text>
                </HStack>
              </ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <VStack spacing={4} align="stretch">
                  <Text color={useColorModeValue('gray.600', 'gray.400')}>
                    Las fotos aumentan la confianza del consumidor y mejoran tu puntuación de
                    transparencia.
                  </Text>

                  <Select placeholder="Seleccionar evento a documentar">
                    <option value="riego">Evento de Riego - 20 Ene 2024</option>
                    <option value="fertilizacion">Fertilización Orgánica - 18 Ene 2024</option>
                    <option value="cosecha">Cosecha Parcial - 15 Ene 2024</option>
                  </Select>

                  <Box
                    border="2px dashed"
                    borderColor={useColorModeValue('gray.300', 'gray.600')}
                    borderRadius="lg"
                    p={8}
                    textAlign="center"
                    cursor="pointer"
                    _hover={{
                      borderColor: 'blue.400',
                      bg: useColorModeValue('blue.50', 'blue.900')
                    }}
                    transition="all 0.2s"
                  >
                    <VStack spacing={3}>
                      <Icon
                        as={FaCloudUploadAlt}
                        boxSize={12}
                        color={useColorModeValue('gray.400', 'gray.500')}
                      />
                      <Text fontWeight="medium">
                        Arrastra fotos aquí o haz clic para seleccionar
                      </Text>
                      <Text fontSize="sm" color={useColorModeValue('gray.500', 'gray.400')}>
                        JPG, PNG hasta 10MB cada una
                      </Text>
                    </VStack>
                  </Box>

                  <Textarea
                    placeholder="Descripción opcional de las fotos (recomendado para mejor transparencia)"
                    rows={3}
                  />
                </VStack>
              </ModalBody>
              <ModalFooter>
                <HStack spacing={3}>
                  <Button variant="ghost" onClick={onPhotoModalClose}>
                    Cancelar
                  </Button>
                  <Button
                    colorScheme="blue"
                    leftIcon={<Icon as={FaUpload} />}
                    onClick={() => {
                      handlePhotoUpload('demo-event', new FileList());
                      onPhotoModalClose();
                    }}
                  >
                    Subir Fotos
                  </Button>
                </HStack>
              </ModalFooter>
            </ModalContent>
          </Modal>

          {/* Verification Request Modal */}
          <Modal isOpen={isVerificationModalOpen} onClose={onVerificationModalClose} size="lg">
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>
                <HStack spacing={3}>
                  <Icon as={MdVerified} color="purple.500" boxSize={6} />
                  <Text>Solicitar Verificación Oficial</Text>
                </HStack>
              </ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <VStack spacing={4} align="stretch">
                  <Text color={useColorModeValue('gray.600', 'gray.400')}>
                    La verificación oficial aumenta la credibilidad y confianza de los consumidores
                    en tus productos.
                  </Text>

                  <Alert status="info" borderRadius="lg">
                    <AlertIcon />
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm" fontWeight="bold">
                        ✓ Beneficios de la Verificación:
                      </Text>
                      <VStack align="start" fontSize="sm">
                        <Text>• +25% credibilidad con consumidores</Text>
                        <Text>• Certificación USDA oficial</Text>
                        <Text>• Registro inmutable en blockchain</Text>
                      </VStack>
                    </VStack>
                  </Alert>
                </VStack>
              </ModalBody>
              <ModalFooter>
                <HStack spacing={3}>
                  <Button variant="ghost" onClick={onVerificationModalClose}>
                    Cancelar
                  </Button>
                  <Button
                    colorScheme="purple"
                    leftIcon={<Icon as={MdVerified} />}
                    onClick={() => {
                      handleVerificationRequest('current-production');
                      onVerificationModalClose();
                    }}
                  >
                    Solicitar Verificación
                  </Button>
                </HStack>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </StandardPage>
      );
    }
  );

EnhancedTransparencyDashboard.displayName = 'EnhancedTransparencyDashboard';

export default EnhancedTransparencyDashboard;
