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
  Divider
} from '@chakra-ui/react';
import { FaCheckCircle, FaComments, FaStar } from 'react-icons/fa';
import { useIntl } from 'react-intl';
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
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [startTime] = useState<number>(Date.now());
  const [interactionCount, setInteractionCount] = useState<number>(0);
  const [hasConsent, setHasConsent] = useState<boolean>(false);

  const [createScan] = useCreateScanMutation();
  const navigate = useNavigate();
  const intl = useIntl();

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
      return;
    }

    setIsSubmitting(true);
    try {
      const analyticsConsented = hasAnalyticsConsent();

      // Feedback is user-initiated (GDPR Art. 6(1)(b)) — always allowed.
      // Analytics data (time, interactions, screen) is only included when consented.
      const feedbackData: Record<string, unknown> = {
        production_id: productionId,
        comment: quickMessage,
        consent_timestamp: new Date().toISOString()
      };

      if (analyticsConsented) {
        feedbackData.time_on_page = (Date.now() - startTime) / 1000;
        feedbackData.interactions = interactionCount;
        feedbackData.screen = `${window.screen.width}x${window.screen.height}`;
      }

      const result = await createScan(feedbackData).unwrap();

      // Show confirmation state with submitted message
      setSubmittedMessage(quickMessage.trim());
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

      // Error is logged above, no additional UI action needed
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

  if (submittedMessage) {
    return (
      <Box
        bg={cardBg}
        p={6}
        borderRadius="xl"
        border="1px"
        borderColor="green.200"
        boxShadow="sm"
      >
        <VStack spacing={4} align="stretch">
          <HStack spacing={3} justify="center">
            <Icon as={FaCheckCircle} color="green.500" boxSize={6} />
            <Text fontSize="lg" fontWeight="600" color="green.600">
              {intl.formatMessage({ id: 'quickFeedback.thankYou' })}
            </Text>
          </HStack>

          <Box
            bg="gray.50"
            p={4}
            borderRadius="lg"
            borderLeft="3px solid"
            borderLeftColor="green.400"
          >
            <Text fontSize="sm" color="gray.600" fontStyle="italic">
              &ldquo;{submittedMessage}&rdquo;
            </Text>
          </Box>

          <Text fontSize="sm" color="gray.500" textAlign="center">
            {intl.formatMessage({ id: 'quickFeedback.thankYouSubtitle' })}
          </Text>

          <Divider />

          <Button
            variant="link"
            size="sm"
            color="gray.500"
            onClick={() => setSubmittedMessage(null)}
            fontWeight="normal"
          >
            {intl.formatMessage({ id: 'quickFeedback.leaveAnother' })}
          </Button>

          <Button
            variant="outline"
            colorScheme="green"
            size="md"
            onClick={handleFullReview}
            leftIcon={<Icon as={FaStar} />}
            borderRadius="lg"
            w="full"
          >
            {isAuthenticated
              ? intl.formatMessage({ id: 'quickFeedback.fullReviewAuth' })
              : intl.formatMessage({ id: 'quickFeedback.fullReview' })}
          </Button>
        </VStack>
      </Box>
    );
  }

  return (
    <Box
      bg={cardBg}
      p={6}
      borderRadius="xl"
      border="1px"
      borderColor={borderColor}
      boxShadow="sm"
    >
      <VStack spacing={5} align="stretch">
        {/* Header */}
        <HStack spacing={3}>
          <Icon as={FaComments} color="green.500" boxSize={5} />
          <Text fontSize="lg" fontWeight="600" color={textColor}>
            {intl.formatMessage({ id: 'quickFeedback.title' })}
          </Text>
        </HStack>
        <Text fontSize="sm" color="gray.500">
          {intl.formatMessage({ id: 'quickFeedback.subtitle' })}
        </Text>

        {/* Quick Message */}
        <VStack spacing={3} align="stretch">
          <Text fontSize="sm" fontWeight="500" color={textColor}>
            {intl.formatMessage({ id: 'quickFeedback.commentLabel' })}
          </Text>
          <Textarea
            placeholder={intl.formatMessage({ id: 'quickFeedback.placeholder' })}
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
            {intl.formatMessage({ id: 'quickFeedback.charCount' }, { count: quickMessage.length })}
          </Text>
        </VStack>

        {/* Action Buttons */}
        <VStack spacing={3} mt={4}>
          <Button
            colorScheme="green"
            size="lg"
            onClick={handleQuickFeedback}
            isLoading={isSubmitting}
            loadingText={intl.formatMessage({ id: 'quickFeedback.submitting' })}
            w="full"
            borderRadius="xl"
            isDisabled={!quickMessage.trim()}
            _hover={{
              transform: 'translateY(-1px)',
              boxShadow: 'lg'
            }}
          >
            {intl.formatMessage({ id: 'quickFeedback.submitButton' })}
          </Button>

          <Divider />

          <Text fontSize="sm" color="gray.500" textAlign="center">
            {intl.formatMessage({ id: 'quickFeedback.shareMore' })}
          </Text>

          <Button
            variant="outline"
            colorScheme="green"
            size="md"
            onClick={handleFullReview}
            leftIcon={<Icon as={FaStar} />}
            borderRadius="lg"
            w="full"
          >
            {isAuthenticated
              ? intl.formatMessage({ id: 'quickFeedback.fullReviewAuth' })
              : intl.formatMessage({ id: 'quickFeedback.fullReview' })}
          </Button>
        </VStack>
      </VStack>
    </Box>
  );
};

export default QuickFeedback;
