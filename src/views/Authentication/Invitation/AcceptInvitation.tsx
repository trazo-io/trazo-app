import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Text,
  VStack,
  HStack,
  Icon,
  Link,
  useToast,
  Spinner,
  Badge,
  useColorModeValue,
  Grid,
  Container
} from '@chakra-ui/react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FiMail, FiCheck, FiAlertCircle, FiUser } from 'react-icons/fi';
import { HiOfficeBuilding } from 'react-icons/hi';
import { useAcceptInvitationMutation, useGetInvitationDetailsQuery } from 'store/api/invitationApi';
import { useSelector } from 'react-redux';
import AuthLayout from 'components/Layout/AuthLayout';

const AcceptInvitation: React.FC = () => {
  const navigate = useNavigate();
  const { invitationCode } = useParams<{ invitationCode: string }>();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const [step, setStep] = useState<'loading' | 'accept' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const currentUser = useSelector((state) => state.userState.user);

  // API hooks
  const [acceptInvitation, { isLoading: isAccepting }] = useAcceptInvitationMutation();
  const {
    data: invitationDetails,
    error: detailsError,
    isLoading: isLoadingDetails
  } = useGetInvitationDetailsQuery(invitationCode || '', {
    skip: !invitationCode
  });

  // Colors
  const primaryColor = 'green.500';
  const primaryGradient = 'linear(to-r, green.500, green.600)';

  // Check invitation details on load
  useEffect(() => {
    if (detailsError) {
      setStep('error');
      setErrorMessage('Invitation not found or has expired');
    } else if (invitationDetails) {
      setStep('accept');
    }
  }, [invitationDetails, detailsError]);

  // Handle accepting the invitation
  const handleAcceptInvitation = async () => {
    if (!invitationCode) return;

    try {
      const result = await acceptInvitation(invitationCode).unwrap();

      // Check if this is a signup redirect response
      if (result.requires_signup) {
        // Store invitation for after authentication
        sessionStorage.setItem('pendingInvitation', invitationCode);

        toast({
          title: 'Account creation required',
          description: 'Please create your account to join the team',
          status: 'info',
          duration: 4000,
          isClosable: true
        });

        // Redirect to invitation password setup page
        navigate(`/invitation/${invitationCode}/setup`);
        return;
      }

      // If we get here, invitation was accepted successfully (authenticated user)
      setStep('success');

      const companyName =
        typeof result.company === 'string' ? result.company : result.company?.name;
      const redirectUrl = result.redirect_to || '/admin/dashboard';

      toast({
        title: 'Invitation accepted!',
        description: `Welcome to ${companyName}!`,
        status: 'success',
        duration: 4000,
        isClosable: true
      });

      // Redirect based on subscription status
      setTimeout(() => {
        navigate(redirectUrl);
      }, 2000);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setStep('error');
      setErrorMessage(error?.data?.error || 'Failed to accept invitation');
    }
  };

  const handleDeclineInvitation = () => {
    // Navigate back or show decline confirmation
    navigate('/');
  };

  // Loading state
  if (step === 'loading' || isLoadingDetails) {
    return (
      <Flex minH="calc(100vh - 80px)" align="center" justify="center" bg="gray.50" px={4}>
        <VStack spacing={8} textAlign="center" maxW="400px">
          <Box
            w="80px"
            h="80px"
            bg="linear-gradient(135deg, #059669 0%, #047857 100%)"
            borderRadius="2xl"
            display="flex"
            alignItems="center"
            justifyContent="center"
            animation="pulse 2s infinite"
          >
            <Text fontSize="2xl" fontWeight="900" color="white" letterSpacing="-1px">
              T
            </Text>
          </Box>
          <VStack spacing={4}>
            <Text fontSize="xl" fontWeight="600" color="gray.700">
              Loading invitation
            </Text>
            <Text fontSize="sm" color="gray.500" lineHeight="1.6" textAlign="center">
              Please wait while we verify your invitation details...
            </Text>
            <Spinner
              thickness="3px"
              speed="0.8s"
              emptyColor="gray.200"
              color="green.500"
              size="lg"
            />
          </VStack>
        </VStack>
      </Flex>
    );
  }

  // Success state
  if (step === 'success') {
    return (
      <Flex minH="calc(100vh - 80px)" align="center" justify="center" bg="gray.50" px={4}>
        <VStack spacing={8} textAlign="center" maxW="400px">
          <Box
            w="100px"
            h="100px"
            bg="linear-gradient(135deg, #059669 0%, #047857 100%)"
            borderRadius="2xl"
            display="flex"
            alignItems="center"
            justifyContent="center"
            boxShadow="0 10px 30px rgba(5, 150, 105, 0.3)"
            animation="bounce 1s ease-in-out"
          >
            <Icon as={FiCheck} color="white" boxSize={12} />
          </Box>
          <VStack spacing={4}>
            <Text fontSize="2xl" fontWeight="700" color="gray.800">
              Welcome to the team!
            </Text>
            <Text fontSize="md" color="gray.600" textAlign="center" lineHeight="1.6">
              You've successfully joined the company. Taking you to your dashboard...
            </Text>
          </VStack>
        </VStack>
      </Flex>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <Flex minH="calc(100vh - 80px)" align="center" justify="center" bg="gray.50" px={4}>
        <Box
          maxW="400px"
          w="full"
          bg="white"
          borderRadius="2xl"
          boxShadow="0 25px 50px rgba(0, 0, 0, 0.1)"
          p={8}
          border="1px solid"
          borderColor="gray.100"
        >
          <VStack spacing={6} textAlign="center">
            <Box
              w="80px"
              h="80px"
              bg="linear-gradient(135deg, #EF4444 0%, #DC2626 100%)"
              borderRadius="2xl"
              display="flex"
              alignItems="center"
              justifyContent="center"
              boxShadow="0 10px 30px rgba(239, 68, 68, 0.3)"
            >
              <Icon as={FiAlertCircle} color="white" boxSize={10} />
            </Box>
            <VStack spacing={3}>
              <Text fontSize="xl" fontWeight="600" color="gray.800">
                Invitation Error
              </Text>
              <Text fontSize="sm" color="gray.600" textAlign="center" lineHeight="1.6">
                {errorMessage}
              </Text>
            </VStack>
            <Button
              onClick={() => navigate('/')}
              bg="gray.100"
              color="gray.700"
              size="lg"
              w="full"
              h="44px"
              fontSize="sm"
              fontWeight="600"
              borderRadius="xl"
              _hover={{ bg: 'gray.200' }}
            >
              Go to Homepage
            </Button>
          </VStack>
        </Box>
      </Flex>
    );
  }

  // Main acceptance page - Modern Trazo Design
  return (
    <AuthLayout
      title="You're Invited!"
      subtitle="Join the carbon intelligence revolution and help build a sustainable future"
      features={[
        'Enterprise-grade carbon tracking',
        'Blockchain-verified transparency',
        'USDA-certified emission data'
      ]}
    >
      <VStack spacing={8}>
        {/* Company Info Header */}
        {invitationDetails && (
          <VStack spacing={4} w="full" textAlign="center">
            <Box
              w="60px"
              h="60px"
              bg="linear-gradient(135deg, #059669 0%, #047857 100%)"
              borderRadius="xl"
              display="flex"
              alignItems="center"
              justifyContent="center"
              mx="auto"
            >
              <Icon as={HiOfficeBuilding} color="white" boxSize={6} />
            </Box>

            <VStack spacing={2}>
              <Text fontSize="xl" fontWeight="600" color="gray.700">
                {invitationDetails.company_name}
              </Text>
              <Badge
                colorScheme="green"
                variant="subtle"
                px={4}
                py={2}
                borderRadius="full"
                fontSize="sm"
                fontWeight="600"
              >
                {invitationDetails.role_display || invitationDetails.role}
              </Badge>
            </VStack>

            <Text fontSize="sm" color="gray.500" textAlign="center" lineHeight="1.6">
              You've been invited to join{' '}
              <Text as="span" fontWeight="600" color="gray.700">
                {invitationDetails.company_name}
              </Text>{' '}
              as a{' '}
              <Text as="span" fontWeight="600" color="green.600">
                {invitationDetails.role_display || invitationDetails.role}
              </Text>
              . Accept to join the team and start building sustainable solutions!
            </Text>
          </VStack>
        )}

        {/* Action Buttons */}
        <VStack spacing={4} w="full">
          <Button
            bg="linear-gradient(135deg, #059669 0%, #047857 100%)"
            color="white"
            size="lg"
            w="full"
            h="44px"
            fontSize="sm"
            fontWeight="600"
            borderRadius="xl"
            isLoading={isAccepting}
            loadingText="Accepting..."
            onClick={handleAcceptInvitation}
            _hover={{
              transform: 'translateY(-1px)',
              boxShadow: '0 10px 25px rgba(5, 150, 105, 0.4)'
            }}
            _active={{ transform: 'translateY(0)' }}
          >
            Accept Invitation
          </Button>

          <Button
            variant="ghost"
            size="lg"
            w="full"
            h="44px"
            fontSize="sm"
            fontWeight="500"
            borderRadius="xl"
            onClick={handleDeclineInvitation}
            color="gray.500"
            _hover={{ bg: 'gray.50', color: 'gray.700' }}
          >
            Decline
          </Button>
        </VStack>

        {/* Authentication Notice */}
        {!isAuthenticated && (
          <Box
            bg="linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)"
            borderRadius="xl"
            p={4}
            w="full"
            border="1px solid"
            borderColor="blue.200"
          >
            <HStack spacing={3}>
              <Box w="6px" h="6px" bg="blue.500" borderRadius="full" flexShrink={0} mt={1} />
              <Text fontSize="xs" color="blue.700" lineHeight="1.5">
                Don't have an account? You'll be able to create one after accepting the invitation.
              </Text>
            </HStack>
          </Box>
        )}
      </VStack>
    </AuthLayout>
  );
};

export default AcceptInvitation;
