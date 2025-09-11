import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Textarea,
  useColorModeValue,
  Icon,
  Badge,
  useToast,
  Divider
} from '@chakra-ui/react';
import { FaComments, FaStar } from 'react-icons/fa';
import { useCreateScanMutation } from '../../store/api/historyApi';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { setAuthRedirectAction } from '../../utils/authRedirect';
import { hasAnalyticsConsent } from '../Privacy/ConsentBanner';

interface QuickFeedbackProps {
  productionId: string;
  scanId?: string;
  onFeedbackSubmitted?: () => void;
}

export const QuickFeedback: React.FC<QuickFeedbackProps> = ({
  productionId,
  scanId,
  onFeedbackSubmitted
}) => {
  const [quickMessage, setQuickMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime] = useState<number>(Date.now());
  const [interactionCount, setInteractionCount] = useState<number>(0);
  const [hasConsent, setHasConsent] = useState<boolean>(false);

  const [createScan] = useCreateScanMutation();
  const navigate = useNavigate();
  const toast = useToast();

  // Check if user is authenticated
  const isAuthenticated = useSelector((state: any) => state.auth.isAuthenticated);
  const currentUser = useSelector((state: any) => state.userState.user);

  // Debug authentication state
  React.useEffect(() => {
    console.log('🔍 QuickFeedback Auth State:', {
      isAuthenticated,
      currentUser: currentUser ? { id: currentUser.id, email: currentUser.email } : null
    });
  }, [isAuthenticated, currentUser]);

  // Track interactions for engagement scoring
  const trackInteraction = () => {
    setInteractionCount((prev) => prev + 1);
  };

  // Monitor consent status changes
  useEffect(() => {
    const updateConsentStatus = () => {
      const currentConsent = hasAnalyticsConsent();
      console.log('🔍 QuickFeedback consent check:', {
        hasAnalyticsConsent: currentConsent,
        localStorage: localStorage.getItem('trazo-analytics-consent'),
        cookies: document.cookie.split(';').find((c) => c.includes('trazo-analytics-consent')),
        timestamp: new Date().toISOString()
      });
      setHasConsent(currentConsent);
    };

    // Initial check
    updateConsentStatus();

    // Listen for consent changes
    const handleConsentChange = (event) => {
      console.log('🔄 Consent change event received:', event.type);
      updateConsentStatus();
    };

    window.addEventListener('trazo-consent-changed', handleConsentChange);
    window.addEventListener('storage', handleConsentChange);

    return () => {
      window.removeEventListener('trazo-consent-changed', handleConsentChange);
      window.removeEventListener('storage', handleConsentChange);
    };
  }, []);

  // Add interaction tracking to user actions
  useEffect(() => {
    const handleClick = () => trackInteraction();
    const handleScroll = () => trackInteraction();

    document.addEventListener('click', handleClick);
    document.addEventListener('scroll', handleScroll);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.700', 'white');

  const handleQuickFeedback = async () => {
    console.log('🎯 QuickFeedback submit clicked:', {
      messageLength: quickMessage.length,
      hasConsentState: hasConsent,
      hasAnalyticsConsentDirect: hasAnalyticsConsent(),
      timestamp: new Date().toISOString()
    });

    if (!quickMessage.trim()) {
      console.log('❌ No message provided');
      toast({
        title: 'Please leave a comment',
        status: 'warning',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    // Double-check consent with detailed logging
    const directConsentCheck = hasAnalyticsConsent();
    console.log('🔒 Consent validation before submit:', {
      hasConsentState: hasConsent,
      directConsentCheck: directConsentCheck,
      localStorage: localStorage.getItem('trazo-analytics-consent'),
      cookies: document.cookie.split(';').find((c) => c.includes('trazo-analytics-consent')),
      willProceed: hasConsent && directConsentCheck
    });

    // Check for analytics consent before submitting
    if (!hasConsent || !directConsentCheck) {
      console.log('🚫 Consent check failed - blocking API call');
      toast({
        title: 'Analytics Consent Required',
        description:
          'Please accept analytics to submit feedback and help improve carbon transparency',
        status: 'warning',
        duration: 5000,
        isClosable: true
      });
      return;
    }

    console.log('✅ Consent validated - proceeding with API call');

    setIsSubmitting(true);
    try {
      // Calculate time on page and engagement metrics
      const timeOnPage = (Date.now() - startTime) / 1000; // seconds

      // Enhanced feedback data with privacy and analytics
      const feedbackData = {
        production_id: productionId,
        comment: quickMessage,

        // Enhanced analytics data (2025 privacy standards)
        time_on_page: timeOnPage,
        interactions: interactionCount,
        screen: `${window.screen.width}x${window.screen.height}`, // For responsive analytics

        // EXPLICIT CONSENT FLAG - Add this as fallback for cookie domain issues
        explicit_consent: hasConsent && directConsentCheck,
        consent_timestamp: new Date().toISOString()

        // Get geolocation if user allows (optional)
        // Note: This would need user permission and should be implemented carefully
        // city: '', // Can be populated by backend via IP geolocation if consented
        // country: '', // Can be populated by backend via IP geolocation if consented
      };

      console.log('📊 Enhanced scan data about to send:', {
        timeOnPage: timeOnPage.toFixed(1) + 's',
        interactions: interactionCount,
        hasConsent: hasConsent,
        commentLength: quickMessage.length,
        feedbackData: feedbackData,
        apiEndpoint: 'public_scans',
        timestamp: new Date().toISOString()
      });

      console.log('🚀 Making API call to createScan...');
      const result = await createScan(feedbackData).unwrap();
      console.log('✅ API call successful:', result);

      toast({
        title: 'Thank you for your feedback!',
        description: 'Your comment helps improve transparency',
        status: 'success',
        duration: 3000,
        isClosable: true
      });

      // Reset form
      setQuickMessage('');

      if (onFeedbackSubmitted) {
        onFeedbackSubmitted();
      }
    } catch (error: any) {
      console.error('❌ Error submitting feedback:', error);
      console.error('🔍 Error details:', {
        status: error?.status,
        statusText: error?.statusText,
        data: error?.data,
        message: error?.message,
        timestamp: new Date().toISOString()
      });

      // Handle specific error cases
      if (error?.status === 428) {
        console.error('🚨 428 Consent Required - even though frontend validated consent!');
        console.error('🔍 Frontend consent state at error:', {
          hasConsentState: hasConsent,
          directCheck: hasAnalyticsConsent(),
          localStorage: localStorage.getItem('trazo-analytics-consent'),
          cookies: document.cookie
        });
        // Consent required
        toast({
          title: 'Analytics Consent Required',
          description: 'Please allow analytics to submit feedback',
          status: 'warning',
          duration: 5000,
          isClosable: true
        });
      } else if (error?.status === 429) {
        // Rate limited
        toast({
          title: 'Too Many Requests',
          description: 'Please wait a moment before submitting again',
          status: 'warning',
          duration: 3000,
          isClosable: true
        });
      } else {
        toast({
          title: 'Error submitting feedback',
          description: 'Please try again later',
          status: 'error',
          duration: 3000,
          isClosable: true
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFullReview = () => {
    if (!isAuthenticated) {
      console.log('🎯 User not authenticated, setting auth redirect action');
      // Store the production ID for review redirect after auth
      setAuthRedirectAction(productionId);
      console.log('🎯 Navigating to /auth/signin');
      // Redirect to consumer auth page
      navigate('/auth/signin');
      return;
    }

    // Generate a unique scan ID for the review
    const scanId = `web-${Date.now()}`;
    const reviewUrl = `/admin/dashboard/production/${productionId}/review/${scanId}`;

    console.log('🎯 User is authenticated, navigating directly to review page:', reviewUrl);
    // Navigate directly to the authenticated consumer review page
    navigate(reviewUrl);
  };

  return (
    <>
      <Box
        bg={cardBg}
        p={6}
        borderRadius="xl"
        border="1px"
        borderColor={borderColor}
        boxShadow="sm">
        <VStack spacing={5} align="stretch">
          {/* Header */}
          <HStack spacing={3}>
            <Icon as={FaComments} color="green.500" boxSize={5} />
            <Text fontSize="lg" fontWeight="600" color={textColor}>
              Share Your Carbon Transparency Experience
            </Text>
          </HStack>
          <Text fontSize="sm" color="gray.500">
            Quick feedback helps farmers improve their sustainable practices
          </Text>

          {/* Quick Message */}
          <VStack spacing={3} align="stretch">
            <Text fontSize="sm" fontWeight="500" color={textColor}>
              Quick comment (optional)
            </Text>
            <Textarea
              placeholder="Share what you learned about this product's carbon footprint or sustainability practices..."
              value={quickMessage}
              onChange={(e) => {
                setQuickMessage(e.target.value);
                trackInteraction();
              }}
              maxLength={200}
              resize="none"
              rows={3}
              borderRadius="lg"
              _focus={{
                borderColor: 'blue.500',
                boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)'
              }}
            />
            <Text fontSize="xs" color="gray.500" textAlign="right">
              {quickMessage.length}/200
            </Text>
          </VStack>

          {/* Action Buttons */}
          <VStack spacing={3} mt={4}>
            {!hasConsent && (
              <Text fontSize="sm" color="orange.500" textAlign="center" fontWeight="500">
                ⚠️ Please accept analytics to submit feedback
              </Text>
            )}
            <Button
              colorScheme={hasConsent ? 'green' : 'gray'}
              size="lg"
              onClick={handleQuickFeedback}
              isLoading={isSubmitting}
              loadingText="Submitting..."
              w="full"
              borderRadius="xl"
              isDisabled={!hasConsent}
              _hover={
                hasConsent
                  ? {
                      transform: 'translateY(-1px)',
                      boxShadow: 'lg'
                    }
                  : {}
              }
              opacity={hasConsent ? 1 : 0.6}>
              {hasConsent ? 'Submit Feedback' : 'Consent Required for Feedback'}
            </Button>

            <Divider />

            <Text fontSize="sm" color="gray.500" textAlign="center">
              Want to share more?
            </Text>

            <Button
              variant="outline"
              colorScheme="green"
              size="md"
              onClick={handleFullReview}
              leftIcon={<Icon as={FaStar} />}
              borderRadius="lg"
              w="full">
              {isAuthenticated ? 'Write Detailed Review' : 'Sign In for Full Review'}
            </Button>
          </VStack>
        </VStack>
      </Box>
    </>
  );
};

export default QuickFeedback;
