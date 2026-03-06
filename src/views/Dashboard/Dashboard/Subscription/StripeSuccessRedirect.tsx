import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  CircularProgress,
  Text,
  useToast,
  VStack,
  Button,
  Heading,
  Alert,
  AlertIcon,
  HStack,
  Icon,
  useColorModeValue,
  Code,
  Flex
} from '@chakra-ui/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from 'store/index';
import { useCompleteCheckoutMutation } from 'store/api/subscriptionApi';
import { setCompany } from 'store/features/companySlice';
import { Company } from 'types/company';
import { FaArrowRight, FaCheckCircle } from 'react-icons/fa';
import { useGetCompanyQuery } from 'store/api/companyApi';
import stripeCheckoutStorage from 'utils/storage/StripeCheckoutStorage';
import { useSubscriptionProcessing } from '../../../../hooks/useSubscriptionProcessing';
import { subscriptionStorage } from '../../../../utils/subscriptionStorage';

// Extended response type to include company data
interface ExtendedCompleteCheckoutResponse {
  success: boolean;
  subscription_id?: string;
  error?: string;
  company?: Company;
}

const StripeSuccessRedirect: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const intl = useIntl();
  const dispatch = useDispatch();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Get parameters from URL
  const searchParams = new URLSearchParams(location.search);
  const sessionId = searchParams.get('session_id');
  const companyId = searchParams.get('company_id');
  const isNewCompany = searchParams.get('new_company') === 'true';
  // Support both 'redirect' and 'return_url' parameters for backward compatibility
  // Add-on flow uses 'return_url', while new subscriptions use 'redirect'
  const redirectPath =
    searchParams.get('redirect') ||
    searchParams.get('return_url') ||
    (isNewCompany ? '/admin/dashboard/establishment/add' : '/admin/dashboard');

  // Set immediate flags to prevent any redirects during processing
  useEffect(() => {
    // Set flags immediately when component mounts
    localStorage.setItem('stripe_checkout_in_progress', 'true');
    localStorage.setItem('subscription_bypass_temp', 'true');
    localStorage.setItem('redirect_from_stripe', 'true');
    localStorage.setItem('stripe_success_redirect', 'true');
    localStorage.setItem('prevent_pricing_page', 'true');
    localStorage.setItem('skip_pricing_render', 'true');
    localStorage.setItem('subscription_last_check', Date.now().toString());

    // Cleanup function to remove flags when component unmounts
    return () => {
      // Only clean up if we're actually navigating away (not just re-rendering)
      setTimeout(() => {
        localStorage.removeItem('stripe_checkout_in_progress');
        localStorage.removeItem('prevent_pricing_page');
        localStorage.removeItem('skip_pricing_render');
      }, 1000);
    };
  }, []);

  // Complete checkout mutation
  const [completeCheckout] = useCompleteCheckoutMutation();

  // Query company data
  const { data: companyData, isLoading: isLoadingCompany } = useGetCompanyQuery(companyId || '', {
    skip: !companyId
  });

  const processCheckout = useCallback(async () => {
    if (!sessionId || !companyId) {
      setError(intl.formatMessage({ id: 'subscription.missingSessionInfo' }));
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const result = await completeCheckout({
        session_id: sessionId,
        company_id: companyId
      }).unwrap();
      if (result.success && result.company) {
        dispatch(setCompany(result.company));

        // Show success toast
        toast({
          title: intl.formatMessage({ id: isNewCompany ? 'subscription.completedTitle' : 'subscription.updatedTitle' }),
          description: intl.formatMessage({ id: isNewCompany ? 'subscription.completedNewDescription' : 'subscription.updatedDescription' }),
          status: 'success',
          duration: isNewCompany ? 8000 : 5000,
          isClosable: true,
          position: 'top'
        });

        // Clean up bypass flags before navigation
        localStorage.removeItem('subscription_bypass_temp');
        localStorage.removeItem('redirect_from_stripe');
        localStorage.removeItem('stripe_success_redirect');

        // Small delay for new companies to show the success message
        const delay = isNewCompany ? 2000 : 0;
        setTimeout(() => {
          navigate(redirectPath, { replace: true });
        }, delay);
      } else {
        setError(intl.formatMessage({ id: 'subscription.verificationFailed' }));
      }
    } catch (err) {
      setError(intl.formatMessage({ id: 'subscription.processingError' }));
    } finally {
      setIsProcessing(false);
    }
  }, [
    sessionId,
    companyId,
    completeCheckout,
    dispatch,
    navigate,
    redirectPath,
    toast,
    isNewCompany
  ]);

  useEffect(() => {
    processCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.600', 'gray.200');

  return (
    <Flex
      width="100%"
      height="100vh"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
      bg={bgColor}
    >
      <CircularProgress isIndeterminate color="green.500" />
      <Text mt={4} fontSize="lg" fontWeight="medium" color={textColor}>
        {intl.formatMessage({ id: isNewCompany ? 'subscription.processingNewCompany' : 'subscription.processingGeneric' })}
      </Text>
      {isNewCompany && (
        <Text mt={2} fontSize="sm" color="gray.500" textAlign="center" maxW="md">
          {intl.formatMessage({ id: 'subscription.redirectToEstablishment' })}
        </Text>
      )}
      {error && (
        <Alert status="error" mt={4} maxW="sm">
          <AlertIcon />
          {error}
        </Alert>
      )}
      {error && (
        <Button mt={4} colorScheme="green" onClick={processCheckout} isLoading={isProcessing}>
          {intl.formatMessage({ id: 'subscription.retry' })}
        </Button>
      )}
    </Flex>
  );
};

export default StripeSuccessRedirect;
