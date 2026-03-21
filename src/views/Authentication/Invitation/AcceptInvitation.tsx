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
  Container,
  Divider
} from '@chakra-ui/react';
import { useNavigate, useParams, useSearchParams, Link as RouterLink } from 'react-router-dom';
import { FiMail, FiCheck, FiAlertCircle, FiUser, FiShield } from 'react-icons/fi';
import { HiOfficeBuilding } from 'react-icons/hi';
import { motion } from 'framer-motion';
import AuthFooter from 'components/Footer/AuthFooter';
import { useAcceptInvitationMutation, useGetInvitationDetailsQuery } from 'store/api/invitationApi';
import { useSelector } from 'react-redux';

// Motion components
const MotionBox = motion(Box);

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

        // Redirect to invitation password setup page without showing toast
        // The user can see they're being redirected, no need for additional notification
        navigate(`/invitation/${invitationCode}/setup`);
        return;
      }

      // If we get here, invitation was accepted successfully (authenticated user)
      setStep('success');

      const companyName =
        typeof result.company === 'string' ? result.company : result.company?.name;
      const redirectUrl = result.redirect_to || '/admin/dashboard';

      // Show success toast with appropriate message
      const wasTransfer = isAuthenticated && currentUser?.companies?.length > 0;
      toast({
        title: wasTransfer ? 'Successfully transferred!' : 'Successfully joined!',
        description: wasTransfer
          ? `You've been transferred to ${companyName}. Taking you to your new dashboard...`
          : `Welcome to ${companyName}! Taking you to your dashboard...`,
        status: 'success',
        duration: 4000,
        isClosable: true
      });

      // Redirect based on subscription status
      setTimeout(() => {
        navigate(redirectUrl);
      }, 2000);
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      setStep('error');

      // Enhanced error handling with specific messages
      let message = 'Failed to accept invitation';

      if (error?.status === 404) {
        message = 'Invitation not found or has expired';
      } else if (error?.status === 400) {
        message = error?.data?.error || error?.data?.detail || 'Invalid invitation';
      } else if (error?.status === 429) {
        message = 'Too many attempts. Please wait a moment before trying again.';
      } else if (error?.status === 403) {
        message = 'You do not have permission to accept this invitation';
      } else if (error?.status >= 500) {
        message = 'Server error. Please try again in a few moments.';
      } else if (error?.data?.error) {
        message = error.data.error;
      } else if (error?.data?.detail) {
        message = error.data.detail;
      }

      setErrorMessage(message);

      // Show toast for immediate feedback
      toast({
        title: 'Invitation Error',
        description: message,
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const handleDeclineInvitation = () => {
    // Navigate back or show decline confirmation
    navigate('/');
  };

  // Loading state
  if (step === 'loading' || isLoadingDetails) {
    return (
      <Box minH="100vh" display="flex" flexDirection="column">
        <Flex
          flex="1"
          minH="calc(100vh - 80px)"
          align="center"
          justify="center"
          bg={useColorModeValue('white', 'gray.900')}
          px={4}
        >
          <MotionBox
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            textAlign="center"
            maxW="400px"
          >
            <VStack spacing={8}>
              <Box
                w="80px"
                h="80px"
                bg="green.500"
                borderRadius="2xl"
                display="flex"
                alignItems="center"
                justifyContent="center"
                animation="pulse 2s infinite"
                boxShadow="0 10px 30px rgba(72, 187, 120, 0.3)"
              >
                <Text fontSize="2xl" fontWeight="900" color="white" letterSpacing="-1px">
                  T
                </Text>
              </Box>
              <VStack spacing={4}>
                <Text fontSize="xl" fontWeight="600" color={useColorModeValue('gray.700', 'white')}>
                  Loading invitation
                </Text>
                <Text
                  fontSize="sm"
                  color={useColorModeValue('gray.500', 'gray.400')}
                  lineHeight="1.6"
                  textAlign="center"
                >
                  Please wait while we verify your invitation details...
                </Text>
                <Spinner
                  thickness="3px"
                  speed="0.8s"
                  emptyColor={useColorModeValue('gray.200', 'gray.600')}
                  color="green.500"
                  size="lg"
                />
              </VStack>
            </VStack>
          </MotionBox>
        </Flex>
      </Box>
    );
  }

  // Success state
  if (step === 'success') {
    return (
      <Box minH="100vh" display="flex" flexDirection="column">
        <Flex
          flex="1"
          minH="calc(100vh - 80px)"
          align="center"
          justify="center"
          bg={useColorModeValue('white', 'gray.900')}
          px={4}
        >
          <MotionBox
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
            textAlign="center"
            maxW="400px"
          >
            <VStack spacing={8}>
              <Box
                w="100px"
                h="100px"
                bg="green.500"
                borderRadius="2xl"
                display="flex"
                alignItems="center"
                justifyContent="center"
                boxShadow="0 20px 40px rgba(72, 187, 120, 0.4)"
              >
                <Icon as={FiCheck} color="white" boxSize={12} />
              </Box>
              <VStack spacing={4}>
                <Text
                  fontSize="2xl"
                  fontWeight="700"
                  color={useColorModeValue('gray.800', 'white')}
                >
                  Welcome to the team!
                </Text>
                <Text
                  fontSize="md"
                  color={useColorModeValue('gray.600', 'gray.300')}
                  textAlign="center"
                  lineHeight="1.6"
                >
                  You've successfully joined the company. Taking you to your dashboard...
                </Text>
              </VStack>
            </VStack>
          </MotionBox>
        </Flex>
      </Box>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <Box minH="100vh" display="flex" flexDirection="column">
        <Flex
          flex="1"
          minH="calc(100vh - 80px)"
          align="center"
          justify="center"
          bg={useColorModeValue('white', 'gray.900')}
          px={4}
        >
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            maxW="400px"
            w="full"
          >
            <Box
              bg={useColorModeValue('white', 'gray.800')}
              borderRadius="2xl"
              boxShadow={useColorModeValue(
                '0 25px 50px rgba(0, 0, 0, 0.1)',
                '0 25px 50px rgba(0, 0, 0, 0.3)'
              )}
              p={8}
              border="1px solid"
              borderColor={useColorModeValue('gray.100', 'gray.700')}
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
                  <Text
                    fontSize="xl"
                    fontWeight="600"
                    color={useColorModeValue('gray.800', 'white')}
                  >
                    Invitation Error
                  </Text>
                  <Text
                    fontSize="sm"
                    color={useColorModeValue('gray.600', 'gray.300')}
                    textAlign="center"
                    lineHeight="1.6"
                  >
                    {errorMessage}
                  </Text>
                </VStack>
                <Button
                  onClick={() => navigate('/')}
                  bg={useColorModeValue('gray.100', 'gray.700')}
                  color={useColorModeValue('gray.700', 'gray.300')}
                  size="lg"
                  w="full"
                  h="44px"
                  fontSize="sm"
                  fontWeight="600"
                  borderRadius="xl"
                  _hover={{
                    bg: useColorModeValue('gray.200', 'gray.600'),
                    transform: 'translateY(-1px)'
                  }}
                  transition="all 0.2s"
                >
                  Go to Homepage
                </Button>
              </VStack>
            </Box>
          </MotionBox>
        </Flex>
      </Box>
    );
  }

  // Main acceptance page - Modern Trazo Design (Following Producer Standards)
  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} flex="1" minH="calc(100vh - 80px)">
        {/* Left side - 2025 Premium App Design (Same as Producer Pages) */}
        <Box
          bg="green.600"
          display={{ base: 'none', lg: 'flex' }}
          alignItems="center"
          justifyContent="center"
          position="relative"
          overflow="hidden"
        >
          {/* Sophisticated gradient foundation */}
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            bg="linear-gradient(135deg, rgba(255,255,255,0.01) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 100%)"
          />

          {/* Subtle background floating element - positioned to not interfere */}
          <Box
            position="absolute"
            top="15%"
            right="5%"
            w="160px"
            h="100px"
            bg="rgba(255,255,255,0.04)"
            borderRadius="12px"
            border="1px solid rgba(255,255,255,0.06)"
            backdropFilter="blur(80px)"
            transform="rotate(-8deg)"
            zIndex={0}
          />

          {/* Bottom accent element */}
          <Box
            position="absolute"
            bottom="20%"
            left="8%"
            w="60px"
            h="60px"
            bg="rgba(255,255,255,0.03)"
            borderRadius="50%"
            border="1px solid rgba(255,255,255,0.05)"
            backdropFilter="blur(60px)"
            zIndex={0}
          />

          {/* Minimal line accents */}
          <Box
            position="absolute"
            top="0"
            left="20%"
            w="1px"
            h="40%"
            bg="linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)"
            zIndex={0}
          />

          <Box
            position="absolute"
            bottom="35%"
            left="0"
            right="0"
            h="1px"
            bg="linear-gradient(to right, transparent 0%, rgba(255,255,255,0.10) 50%, transparent 100%)"
            zIndex={0}
          />

          {/* Tiny accent dots */}
          <Box
            position="absolute"
            top="25%"
            left="20%"
            w="2px"
            h="2px"
            bg="rgba(255,255,255,0.20)"
            borderRadius="50%"
            zIndex={0}
          />

          <Box
            position="absolute"
            bottom="45%"
            right="15%"
            w="3px"
            h="3px"
            bg="rgba(255,255,255,0.18)"
            borderRadius="50%"
            zIndex={0}
          />

          <VStack
            spacing={8}
            position="relative"
            textAlign="center"
            color="white"
            px={12}
            maxW="lg"
            zIndex={10}
          >
            <VStack spacing={4}>
              <Text fontSize="4xl" fontWeight="800" lineHeight="1.1" letterSpacing="tight">
                You're Invited!
              </Text>
              <Text fontSize="lg" opacity={0.9} fontWeight="400" lineHeight="1.6">
                Join the carbon intelligence revolution and help build a sustainable future with
                science-based emission tracking
              </Text>
            </VStack>

            <VStack spacing={3} pt={4}>
              {[
                'Enterprise-grade carbon tracking',
                'Transparency-first documentation',
                'Science-based emission data'
              ].map((feature, index) => (
                <HStack key={index} spacing={3}>
                  <Box w={2} h={2} bg="white" borderRadius="50%" />
                  <Text fontSize="sm" fontWeight="500" opacity={0.9}>
                    {feature}
                  </Text>
                </HStack>
              ))}
            </VStack>
          </VStack>
        </Box>

        {/* Right side - Invitation Form */}
        <Flex
          align="center"
          justify="center"
          bg={useColorModeValue('white', 'gray.900')}
          px={{ base: 4, sm: 6, md: 8 }}
          py={12}
          overflow="hidden"
        >
          <MotionBox
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            w="full"
            maxW={{ base: '100%', md: '420px' }}
            my={{ base: 4, lg: 8 }}
          >
            {/* Header */}
            <VStack spacing={6} mb={10}>
              <VStack spacing={2}>
                <Text
                  fontSize="2xl"
                  fontWeight="700"
                  color={useColorModeValue('gray.900', 'white')}
                  letterSpacing="tight"
                  textAlign="center"
                >
                  Team Invitation
                </Text>
                <Text
                  fontSize="md"
                  color={useColorModeValue('gray.500', 'gray.400')}
                  textAlign="center"
                >
                  You've been invited to join the team
                </Text>
              </VStack>
            </VStack>

            {/* Company Info Card */}
            {invitationDetails && (
              <Box
                bg={useColorModeValue('green.50', 'green.900')}
                borderRadius="xl"
                p={6}
                mb={8}
                border="1px solid"
                borderColor={useColorModeValue('green.200', 'green.700')}
              >
                <VStack spacing={4} textAlign="center">
                  <Box
                    w="50px"
                    h="50px"
                    bg="green.500"
                    borderRadius="xl"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Icon as={HiOfficeBuilding} color="white" boxSize={6} />
                  </Box>

                  <VStack spacing={2}>
                    <Text
                      fontSize="lg"
                      fontWeight="600"
                      color={useColorModeValue('gray.800', 'white')}
                    >
                      {invitationDetails.company_name}
                    </Text>
                    <Badge
                      colorScheme="green"
                      variant="subtle"
                      px={3}
                      py={1}
                      borderRadius="full"
                      fontSize="sm"
                      fontWeight="600"
                    >
                      {invitationDetails.role_display || invitationDetails.role}
                    </Badge>
                  </VStack>

                  <Text
                    fontSize="sm"
                    color={useColorModeValue('gray.600', 'gray.300')}
                    textAlign="center"
                    lineHeight="1.5"
                  >
                    Join as a{' '}
                    <Text as="span" fontWeight="600" color="green.600">
                      {invitationDetails.role_display || invitationDetails.role}
                    </Text>{' '}
                    and start building sustainable solutions
                  </Text>
                </VStack>
              </Box>
            )}

            {/* Action Buttons */}
            <VStack spacing={4} w="full">
              <Button
                w="full"
                h="52px"
                bg="green.500"
                color="white"
                fontSize="md"
                fontWeight="600"
                borderRadius="xl"
                isLoading={isAccepting}
                loadingText="Accepting invitation..."
                onClick={handleAcceptInvitation}
                _hover={{
                  bg: 'green.600',
                  transform: 'translateY(-1px)'
                }}
                _active={{
                  transform: 'translateY(0)'
                }}
                transition="all 0.2s"
              >
                Accept Invitation
              </Button>

              <Button
                w="full"
                h="44px"
                bg={useColorModeValue('gray.50', 'gray.700')}
                color={useColorModeValue('gray.700', 'gray.300')}
                fontSize="sm"
                fontWeight="500"
                borderRadius="xl"
                border="1px solid"
                borderColor={useColorModeValue('gray.200', 'gray.600')}
                onClick={handleDeclineInvitation}
                _hover={{
                  bg: useColorModeValue('gray.100', 'gray.600'),
                  borderColor: useColorModeValue('gray.300', 'gray.500')
                }}
                transition="all 0.2s"
              >
                Decline
              </Button>
            </VStack>

            {/* Authentication Notice */}
            {!isAuthenticated && (
              <Box
                bg={useColorModeValue('blue.50', 'blue.900')}
                borderRadius="xl"
                p={4}
                mt={6}
                border="1px solid"
                borderColor={useColorModeValue('blue.200', 'blue.700')}
              >
                <HStack spacing={3}>
                  <Icon
                    as={FiShield}
                    color={useColorModeValue('blue.600', 'blue.400')}
                    boxSize={4}
                  />
                  <Text
                    fontSize="sm"
                    color={useColorModeValue('blue.700', 'blue.300')}
                    lineHeight="1.5"
                  >
                    Don't have an account? You'll be able to create one after accepting the
                    invitation.
                  </Text>
                </HStack>
              </Box>
            )}

            {/* Company Transfer Warning */}
            {isAuthenticated && currentUser?.companies?.length > 0 && (
              <Box
                bg={useColorModeValue('orange.50', 'orange.900')}
                borderRadius="xl"
                p={4}
                mt={6}
                border="1px solid"
                borderColor={useColorModeValue('orange.200', 'orange.700')}
              >
                <HStack spacing={3} align="start">
                  <Icon
                    as={FiAlertCircle}
                    color={useColorModeValue('orange.600', 'orange.400')}
                    boxSize={4}
                    mt={0.5}
                  />
                  <VStack spacing={2} align="start" flex={1}>
                    <Text
                      fontSize="sm"
                      fontWeight="600"
                      color={useColorModeValue('orange.700', 'orange.300')}
                    >
                      Company Transfer
                    </Text>
                    <Text
                      fontSize="sm"
                      color={useColorModeValue('orange.700', 'orange.300')}
                      lineHeight="1.5"
                    >
                      Accepting this invitation will transfer you from your current company to{' '}
                      <Text as="span" fontWeight="600">
                        {invitationDetails?.company_name}
                      </Text>
                      . Your account data will be preserved, but you'll lose access to your current
                      company's data.
                    </Text>
                  </VStack>
                </HStack>
              </Box>
            )}
          </MotionBox>
        </Flex>
      </Grid>

      <AuthFooter />
    </Box>
  );
};

export default AcceptInvitation;
