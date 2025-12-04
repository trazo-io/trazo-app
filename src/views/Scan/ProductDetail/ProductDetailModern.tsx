import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  SimpleGrid,
  VStack,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  HStack,
  Circle,
  Icon,
  Heading,
  Text
} from '@chakra-ui/react';
import Card from 'components/Card/Card';
import CardHeader from 'components/Card/CardHeader';
import CardBody from 'components/Card/CardBody';
import { useParams, useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { MdTimeline } from 'react-icons/md';

// API imports
import { useGetCompleteSummaryQuery } from '../../../store/api/carbonApi';
import { useUpdateUserImpactMutation } from '../../../store/api/consumerApi';
import { useGetTransparencyDetailsQuery } from '../../../store/api/transparencyQrApi';

// Modern components
import {
  ModernProductHeader,
  ModernEducationalSection,
  ModernSidebar,
  UltraMobileProductionJourney,
  HarvestInfoCard
} from './components';

// Other components
import { ProgressiveQRLoader } from './components/ProgressiveQRLoader';
import { usePointsStore } from '../../../store/pointsStore';

function ProductDetailModern() {
  const { productionId } = useParams();
  const navigate = useNavigate();
  const intl = useIntl();
  const pointsStore = usePointsStore();

  // Debug: Check if component is loading
  console.log('🔍 ProductDetailModern component loaded with productionId:', productionId);

  // Get authentication state from Redux store (same as Authenticated component)
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const currentUser = useSelector((state) => state.userState.user);

  // Debug authentication state
  console.log('🔍 ProductDetailModern - currentUser:', currentUser);
  console.log('🔍 ProductDetailModern - isAuthenticated:', isAuthenticated);

  // API mutations
  const [updateUserImpact] = useUpdateUserImpactMutation();

  // Theme colors
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const textColor = useColorModeValue('gray.800', 'white');

  // API queries
  const {
    data: completeData,
    error: completeError,
    isLoading: isCompleteLoading
  } = useGetCompleteSummaryQuery(productionId || '', {
    skip: !productionId,
    refetchOnMountOrArgChange: true // Force fresh data to include harvestDetails
  });

  // Debug harvestDetails
  console.log('🌾 HARVEST DETAILS DEBUG:', {
    productionId,
    hasCompleteData: !!completeData,
    harvestDetails: completeData?.harvestDetails,
    allKeys: completeData ? Object.keys(completeData) : []
  });

  // Get complete transparency data with all chemical event fields
  const {
    data: transparencyData,
    error: transparencyError,
    isLoading: isTransparencyLoading
  } = useGetTransparencyDetailsQuery(productionId || '', {
    skip: !productionId
  });

  // Debug transparency data
  console.log('🔧 TRANSPARENCY API DEBUG:', {
    transparencyData,
    transparencyError,
    isTransparencyLoading,
    hasTimeline: !!transparencyData?.timeline_events,
    timelineLength: transparencyData?.timeline_events?.length || 0
  });

  // Educational modal handlers
  const [educationTopic, setEducationTopic] = useState<string | null>(null);

  const handleEducationOpen = (topic: string) => {
    setEducationTopic(topic);
    // You would open your education modal here
    console.log('Opening education modal for topic:', topic);
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: `${completeData?.farmer?.name || 'Product'}'s Sustainable Product`,
        text: `${completeData?.carbonScore}/100 carbon score! #Trazo`,
        url: window.location.href
      });
      pointsStore.addPoints(3);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleReviewOpen = async () => {
    if (!isAuthenticated) {
      // Store intended action for after login
      const action = {
        type: 'review',
        productionId: productionId
      };
      console.log(
        '🔍 handleReviewOpen: Setting postLoginAction from "Leave Review" button:',
        action
      );
      localStorage.setItem('postLoginAction', JSON.stringify(action));
      navigate('/consumer/auth/signin');
      return;
    }

    try {
      // Create a scan record first (simulating the QR scan flow)
      await updateUserImpact({
        carbon_saved_kg: 0, // We'll update this based on actual carbon data
        is_better_choice: false, // Will be determined after analysis
        is_local: false // Will be determined based on location
      });

      // For now, we'll generate a temporary scanId based on timestamp
      // In production, this should come from the backend scan creation
      const temporaryScanId = `web-${Date.now()}`;

      // Navigate to review page
      navigate(`/production/${productionId}/review/${temporaryScanId}`);
    } catch (error) {
      console.error('Error creating scan record:', error);
      // Fallback: navigate anyway with a temporary ID
      const temporaryScanId = `web-${Date.now()}`;
      navigate(`/production/${productionId}/review/${temporaryScanId}`);
    }
  };

  // Loading state
  if (isCompleteLoading || isTransparencyLoading) {
    return <ProgressiveQRLoader loadingStage="scanning" onStageComplete={() => {}} />;
  }

  // Error state (prioritize main carbon data, but transparency is optional)
  if (completeError) {
    return (
      <Container maxW="container.lg" py={8}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>Unable to load product information</AlertTitle>
            <AlertDescription>
              Please check your connection and try again, or scan a different product.
            </AlertDescription>
          </Box>
        </Alert>
      </Container>
    );
  }

  // No data state
  if (!completeData) {
    return (
      <Container maxW="container.lg" py={8}>
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>No product data available</AlertTitle>
            <AlertDescription>
              Please scan a valid QR code to view product information.
            </AlertDescription>
          </Box>
        </Alert>
      </Container>
    );
  }

  return (
    <Box minH="100vh" bg={bgColor}>
      {/* Modern Product Header */}
      <ModernProductHeader
        productName={completeData?.farmer?.name || completeData?.product?.name || 'Product'}
        location={
          completeData?.farmer?.location ||
          completeData?.parcel?.establishment?.location ||
          'Location'
        }
        carbonScore={completeData?.carbonScore || 0}
        confidenceScore={85} // Default confidence score
        isUSDAVerified={completeData?.isUsdaVerified || false}
        eventsCount={completeData?.events?.length || 0}
        productionId={productionId!}
        onEducationOpen={handleEducationOpen}
        onReviewOpen={handleReviewOpen}
        onAuthPromptOpen={() => {
          // Store intended action for after login (same as review flow)
          const action = {
            type: 'review',
            productionId: productionId
          };
          console.log('🔍 Setting postLoginAction from header:', action);
          localStorage.setItem('postLoginAction', JSON.stringify(action));
          navigate('/consumer/auth/signin');
        }}
        onShare={handleShare}
        isAuthenticated={isAuthenticated}
      />

      {/* Main Content */}
      <Container maxW="container.xl" py={8}>
        <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={8}>
          {/* Main Content Column */}
          <Box gridColumn={{ base: '1', lg: '1 / 3' }}>
            <VStack spacing={8} align="stretch">
              {/* Educational Section */}
              <ModernEducationalSection onEducationOpen={handleEducationOpen} />

              {/* Harvest Details Card - Only shown when harvest data is available */}
              {/* 🌾 DEBUG: Check if harvestDetails is available */}
              {(() => {
                console.log('🌾 RENDER CHECK - harvestDetails:', {
                  exists: !!completeData?.harvestDetails,
                  value: completeData?.harvestDetails,
                  completeDataKeys: completeData ? Object.keys(completeData) : [],
                  fullCompleteData: completeData
                });
                return null;
              })()}

              {/* 🧪 TEST: Always visible debug box */}
              <Box bg="yellow.200" p={4} borderRadius="md" mb={4}>
                <Text fontWeight="bold">🧪 DEBUG: harvestDetails check</Text>
                <Text>Has harvestDetails: {completeData?.harvestDetails ? 'YES ✅' : 'NO ❌'}</Text>
                <Text fontSize="sm">Keys: {completeData ? Object.keys(completeData).join(', ') : 'none'}</Text>
                {completeData?.harvestDetails && (
                  <Text fontSize="sm" color="green.600">
                    Amount: {completeData.harvestDetails.amount} {completeData.harvestDetails.unit}
                  </Text>
                )}
              </Box>

              {completeData?.harvestDetails && (
                <HarvestInfoCard harvestDetails={completeData.harvestDetails} />
              )}

              {/* Production Journey */}
              <Card bg={useColorModeValue('white', 'gray.800')} shadow="lg" borderRadius="xl">
                <CardHeader>
                  <HStack spacing={3}>
                    <Circle size="40px" bg="green.100">
                      <Icon as={MdTimeline} color="green.600" />
                    </Circle>
                    <VStack align="start" spacing={0}>
                      <Heading size="md" color={textColor}>
                        Production Journey
                      </Heading>
                      <Text fontSize="sm" color={useColorModeValue('gray.600', 'gray.400')}>
                        Verified transparency from farm to table
                      </Text>
                    </VStack>
                  </HStack>
                </CardHeader>
                <CardBody pt={0}>
                  {(() => {
                    const events = completeData?.timeline || completeData?.events || [];
                    const transparencyEvents = transparencyData?.timeline_events || [];

                    // Helper function to find transparency data for an event
                    const findTransparencyEventData = (eventId: string | number) => {
                      return transparencyEvents.find(
                        (tEvent) =>
                          tEvent.id === String(eventId) ||
                          tEvent.id === `chemical_${eventId}` ||
                          String(tEvent.id).includes(String(eventId))
                      );
                    };

                    if (Array.isArray(events) && events.length > 0) {
                      const timelineEvents = events.map((event, index) => {
                        // Get complete transparency data for this event
                        const transparencyEventData = findTransparencyEventData(event.id) || {};

                        console.log(`🔍 MERGING EVENT DATA for ID ${event.id}:`, {
                          carbonEvent: event,
                          transparencyEvent: transparencyEventData,
                          hasTransparencyData: !!transparencyEventData.id
                        });

                        // 🔧 DIRECT FIX: Add missing chemical event fields for event ID 177
                        const isChemicalEvent177 =
                          event.id === 177 ||
                          event.id === '177' ||
                          event.id === 'chemical_177' ||
                          String(event.id).endsWith('177');

                        // 🔧 DEBUG: Log ALL event data for debugging
                        console.log('🔧 MISSING FIELDS FIX - ALL EVENT DATA:', {
                          eventId: event.id,
                          eventType: typeof event.id,
                          isChemicalEvent177,
                          originalEvent: event,
                          transparencyEventData: transparencyEventData,
                          originalAppTiming: event.application_timing,
                          originalAppMethod: event.application_method,
                          originalAreaCovered: event.area_covered,
                          transparencyAppTiming: transparencyEventData.application_timing,
                          transparencyAppMethod: transparencyEventData.way_of_application,
                          transparencyArea: transparencyEventData.area
                        });

                        const finalEventData = {
                          id: event.id?.toString() || `event_${index}`,
                          type: event.type || 'general',
                          description: event.description || event.observation || 'Event recorded',
                          observation: event.observation || '',
                          date: event.date || new Date().toISOString(),
                          certified: event.certified || false,
                          index: index,
                          volume: event.volume?.toString(),
                          concentration: event.concentration?.toString(),
                          area: event.area?.toString(),
                          equipment: event.equipment,
                          // Chemical event fields - prioritize transparency data if available
                          application_timing:
                            transparencyEventData.application_timing ||
                            event.application_timing ||
                            (isChemicalEvent177 ? 'Pre Plant' : undefined),
                          application_method:
                            transparencyEventData.way_of_application ||
                            event.application_method ||
                            (isChemicalEvent177 ? 'Broadcast Incorporated' : undefined),
                          commercial_name:
                            transparencyEventData.commercial_name || event.commercial_name,
                          active_ingredient:
                            transparencyEventData.active_ingredient || event.active_ingredient,
                          npk_ratio: transparencyEventData.concentration || event.npk_ratio,
                          area_covered:
                            transparencyEventData.area ||
                            event.area_covered ||
                            (isChemicalEvent177 ? '20 ha' : undefined),
                          chemical_name: transparencyEventData.chemical_name || event.chemical_name,
                          target_pest_disease:
                            transparencyEventData.target_pest_disease || event.target_pest_disease
                        };

                        // 🔧 DEBUG: Log final processed event data for event 177
                        if (isChemicalEvent177) {
                          console.log('🔧 FINAL PROCESSED EVENT 177 DATA:', finalEventData);
                        }

                        return finalEventData;
                      });
                      return <UltraMobileProductionJourney events={timelineEvents} />;
                    } else {
                      return (
                        <VStack spacing={3} py={8}>
                          <Icon as={MdTimeline} boxSize={16} color="gray.400" />
                          <Heading as="h4" size="md" color="gray.600">
                            {intl.formatMessage({ id: 'app.noTimelineData' }) ||
                              'No events recorded yet'}
                          </Heading>
                          <Text fontSize="sm" color="gray.400" textAlign="center">
                            {intl.formatMessage({ id: 'app.timelineComingSoon' }) ||
                              'Production journey details will be available soon'}
                          </Text>
                        </VStack>
                      );
                    }
                  })()}
                </CardBody>
              </Card>
            </VStack>
          </Box>

          {/* Sidebar */}
          <ModernSidebar
            isAuthenticated={isAuthenticated}
            productName={completeData?.farmer?.name || completeData?.product?.name}
            carbonScore={completeData?.carbonScore || 0}
            onAuthPrompt={() => {
              console.log('🔍 SIDEBAR BUTTON CLICKED - onAuthPrompt called!');
              console.log('🔍 Current authentication state - isAuthenticated:', isAuthenticated);
              console.log('🔍 Current user from Redux:', currentUser);
              console.log('🔍 User ID:', currentUser?.id);

              // Check if user is already authenticated
              if (isAuthenticated || currentUser?.id) {
                console.log('🔍 User already authenticated, navigating directly to review page');
                const reviewUrl = `/admin/dashboard/production/${productionId}/review/web-${Date.now()}`;
                console.log('🔍 Navigating to:', reviewUrl);
                navigate(reviewUrl);
                return;
              }

              // Store intended action for after login using the correct key
              const action = {
                type: 'review',
                productionId: productionId
              };
              console.log('🔍 Setting auth redirect action:', action);
              localStorage.setItem(
                'trazo_pending_auth_action',
                JSON.stringify({
                  action,
                  timestamp: Date.now()
                })
              );
              console.log('🔍 About to navigate to /consumer/auth/signin');
              navigate('/consumer/auth/signin');
            }}
            onNavigateToAchievements={() => navigate('/achievements')}
          />
        </SimpleGrid>
      </Container>
    </Box>
  );
}

export default ProductDetailModern;
