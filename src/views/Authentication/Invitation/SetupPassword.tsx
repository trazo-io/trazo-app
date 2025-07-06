import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  Text,
  VStack,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  useToast,
  Progress,
  useColorModeValue,
  Badge,
  Grid,
  Container,
} from '@chakra-ui/react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { FiLock, FiEye, FiEyeOff, FiCheck, FiUser } from 'react-icons/fi';
import { HiOfficeBuilding } from 'react-icons/hi';
import { useForm } from 'react-hook-form';
import { 
  StandardField,
  StandardInput,
  StandardButton 
} from 'components/Design/StandardComponents';
import { useSignupWithInvitationMutation, useGetInvitationDetailsQuery } from 'store/api/invitationApi';

interface SetupPasswordFormData {
  first_name: string;
  last_name: string;
  password: string;
  password_confirm: string;
}

const SetupPassword: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<'setup' | 'success'>('setup');
  const [redirectProgress, setRedirectProgress] = useState(0);

  // Get invitation code from URL params
  const { invitationCode } = useParams<{ invitationCode: string }>();

  // API hooks
  const [signupWithInvitation, { isLoading: isCreatingAccount }] = useSignupWithInvitationMutation();
  const { data: invitationDetails, error: detailsError, isLoading: isLoadingDetails } = 
    useGetInvitationDetailsQuery(invitationCode || '', {
      skip: !invitationCode
    });

  // Form handling
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<SetupPasswordFormData>();

  const password = watch('password');
  const passwordConfirm = watch('password_confirm');

  // Colors
  const primaryColor = 'green.500';
  const primaryGradient = 'linear(to-r, green.500, green.600)';

  // Password strength calculation
  const getPasswordStrength = (password: string) => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/\d/.test(password)) strength += 25;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password || '');

  // Check for invitation errors
  React.useEffect(() => {
    if (detailsError) {
      toast({
        title: 'Invitation error',
        description: 'Invitation not found or has expired',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [detailsError, toast]);

  // Handle form submission
  const onSubmit = async (data: SetupPasswordFormData) => {
    if (data.password !== data.password_confirm) {
      toast({
        title: 'Password mismatch',
        description: 'Passwords do not match',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (passwordStrength < 75) {
      toast({
        title: 'Weak password',
        description: 'Please choose a stronger password',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!invitationCode) {
      toast({
        title: 'Invitation error',
        description: 'No invitation code found',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const result = await signupWithInvitation({
        first_name: data.first_name,
        last_name: data.last_name,
        password: data.password,
        invitation_code: invitationCode,
      }).unwrap();

      setStep('success');
      
      toast({
        title: 'Account created successfully!',
        description: `Welcome to ${result.company.name}!`,
        status: 'success',
        duration: 4000,
        isClosable: true,
      });

      // Start progress animation and redirect based on subscription status
      const redirectUrl = result.redirect_to || '/admin/dashboard';
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 5;
        setRedirectProgress(progress);
        if (progress >= 100) {
          clearInterval(progressInterval);
          navigate(redirectUrl);
        }
      }, 100);

    } catch (error) {
      console.error('Error creating account:', error);
      toast({
        title: 'Account creation failed',
        description: error?.data?.error || 'Please try again',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
  };

  // Success state
  if (step === 'success') {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="gray.50" px={4}>
        <VStack spacing={6} textAlign="center" maxW="400px">
          <Box
            w="80px"
            h="80px"
            bg={primaryGradient}
            borderRadius="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
            animation="pulse 2s infinite"
          >
            <Icon as={FiCheck} color="white" boxSize={10} />
          </Box>
          <VStack spacing={4}>
            <Text fontSize="xl" fontWeight="600" color="gray.700">
              Welcome to the team!
            </Text>
            <Text fontSize="sm" color="gray.500" textAlign="center">
              Your account has been created. Taking you to your dashboard...
            </Text>
            
            {/* Progress Bar */}
            <Box w="200px">
              <Progress 
                value={redirectProgress} 
                size="sm" 
                borderRadius="full"
                bg="gray.100"
                sx={{
                  '& > div': {
                    background: primaryGradient,
                    transition: 'width 0.1s ease'
                  }
                }}
              />
              <Text fontSize="xs" color="gray.400" textAlign="center" mt={1}>
                {Math.round(redirectProgress)}%
              </Text>
            </Box>
          </VStack>
        </VStack>
      </Flex>
    );
  }

  // Loading state for invitation details
  if (isLoadingDetails) {
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
            <Text
              fontSize="2xl"
              fontWeight="900"
              color="white"
              letterSpacing="-1px"
            >
              T
            </Text>
          </Box>
          <VStack spacing={4}>
            <Text fontSize="xl" fontWeight="600" color="gray.700">
              Loading invitation details
            </Text>
            <Text fontSize="sm" color="gray.500" lineHeight="1.6" textAlign="center">
              Please wait while we verify your invitation...
            </Text>
          </VStack>
        </VStack>
      </Flex>
    );
  }

  // Error state for invalid invitation
  if (detailsError || !invitationDetails) {
    return (
      <Flex minH="calc(100vh - 80px)" align="center" justify="center" bg="gray.50" px={4}>
        <Box maxW="400px" w="full" bg="white" borderRadius="2xl" boxShadow="0 25px 50px rgba(0, 0, 0, 0.1)" p={8} border="1px solid" borderColor="gray.100">
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
              <Icon as={FiCheck} color="white" boxSize={10} />
            </Box>
            <VStack spacing={3}>
              <Text fontSize="xl" fontWeight="600" color="gray.800">
                Invalid Invitation
              </Text>
              <Text fontSize="sm" color="gray.600" textAlign="center" lineHeight="1.6">
                This invitation link is invalid or has expired. Please contact your team administrator for a new invitation.
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

  // Main password setup form - Modern Trazo Design
  return (
    <Box minH="calc(100vh - 80px)" bg="gray.50" position="relative" overflow="hidden">
      {/* Background Design */}
      <Box
        position="absolute"
        top="-50%"
        right="-10%"
        w="60%"
        h="120%"
        bg="linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)"
        borderRadius="50%"
        filter="blur(1px)"
        opacity={0.6}
      />
      <Box
        position="absolute"
        bottom="-40%"
        left="-10%"
        w="50%"
        h="100%"
        bg="linear-gradient(45deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.05) 100%)"
        borderRadius="50%"
        filter="blur(2px)"
      />

      <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} minH="calc(100vh - 80px)">
        {/* Left Side - Welcome Content */}
        <Flex
          direction="column"
          justify="center"
          align="center"
          px={{ base: 6, md: 12, lg: 16 }}
          py={12}
          position="relative"
          zIndex={2}
        >
          <Container maxW="400px" textAlign="center">
            <VStack spacing={8}>
              {/* Trazo Logo */}
              <Box
                w="80px"
                h="80px"
                bg="linear-gradient(135deg, #059669 0%, #047857 100%)"
                borderRadius="2xl"
                display="flex"
                alignItems="center"
                justifyContent="center"
                boxShadow="0 10px 30px rgba(5, 150, 105, 0.3)"
                transform="rotate(-5deg)"
                transition="all 0.3s ease"
                _hover={{ transform: 'rotate(0deg) scale(1.05)' }}
              >
                <Text
                  fontSize="2xl"
                  fontWeight="900"
                  color="white"
                  letterSpacing="-1px"
                >
                  T
                </Text>
              </Box>

              {/* Welcome Text */}
              <VStack spacing={4}>
                <Text
                  fontSize={{ base: '2xl', md: '3xl' }}
                  fontWeight="700"
                  color="gray.800"
                  lineHeight="1.2"
                >
                  Welcome to the Team!
                </Text>
                <Text
                  fontSize="lg"
                  color="gray.600"
                  lineHeight="1.6"
                  maxW="350px"
                >
                  Complete your account setup and start building sustainable solutions with carbon intelligence
                </Text>
              </VStack>
            </VStack>
          </Container>
        </Flex>

        {/* Right Side - Setup Form */}
        <Flex
          direction="column"
          justify="center"
          align="center"
          px={{ base: 6, md: 8, lg: 12 }}
          py={12}
          position="relative"
          zIndex={2}
        >
          <Container maxW="400px">
            <Box
              bg="white"
              borderRadius="2xl"
              p={{ base: 6, md: 8 }}
              boxShadow="0 25px 50px rgba(0, 0, 0, 0.1)"
              border="1px solid"
              borderColor="gray.100"
            >
              <form onSubmit={handleSubmit(onSubmit)}>
                <VStack spacing={6}>
                  {/* Header */}
                  <VStack spacing={3} textAlign="center" w="full">
                    <Text fontSize="xl" fontWeight="600" color="gray.800">
                      Complete Your Setup
                    </Text>
                    <Text fontSize="sm" color="gray.500" lineHeight="1.6">
                      Create your account to join the team
                    </Text>
                  </VStack>

                  {/* Company Info */}
                  {invitationDetails && (
                    <Box
                      bg="linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)"
                      borderRadius="xl"
                      p={4}
                      w="full"
                      border="1px solid"
                      borderColor="green.200"
                    >
                      <HStack spacing={3}>
                        <Icon as={HiOfficeBuilding} color="green.600" boxSize={5} />
                        <VStack spacing={1} align="start" flex={1}>
                          <Text fontSize="sm" fontWeight="600" color="gray.800">
                            {invitationDetails.company_name}
                          </Text>
                          <Badge colorScheme="green" variant="subtle" fontSize="xs">
                            {invitationDetails.role}
                          </Badge>
                        </VStack>
                      </HStack>
                    </Box>
                  )}

                  {/* Form Fields */}
                  <VStack spacing={4} w="full">
                    {/* Name Fields */}
                    <HStack spacing={4} w="full">
                <StandardField label="First Name" required error={errors.first_name?.message}>
                  <StandardInput
                    placeholder="John"
                    {...register('first_name', {
                      required: 'First name is required',
                      minLength: { value: 2, message: 'First name too short' },
                      maxLength: { value: 50, message: 'First name too long' }
                    })}
                  />
                </StandardField>

                <StandardField label="Last Name" required error={errors.last_name?.message}>
                  <StandardInput
                    placeholder="Doe"
                    {...register('last_name', {
                      required: 'Last name is required',
                      minLength: { value: 2, message: 'Last name too short' },
                      maxLength: { value: 50, message: 'Last name too long' }
                    })}
                  />
                </StandardField>
                    </HStack>

                    {/* Password Field */}
                    <StandardField label="Password" required error={errors.password?.message}>
                <InputGroup size="lg">
                  <InputLeftElement pointerEvents="none">
                    <Icon as={FiLock} color="gray.400" />
                  </InputLeftElement>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    h="44px"
                    fontSize="sm"
                    bg="gray.50"
                    border="1px solid"
                    borderColor="gray.300"
                    borderRadius="lg"
                    pl="3rem"
                    pr="3rem"
                    _focus={{
                      borderColor: primaryColor,
                      bg: 'white',
                      boxShadow: `0 0 0 3px ${primaryColor}20`
                    }}
                    {...register('password', {
                      required: 'Password is required',
                      minLength: { value: 8, message: 'Password must be at least 8 characters' }
                    })}
                  />
                  <InputRightElement>
                    <Button
                      variant="ghost"
                      onClick={() => setShowPassword(!showPassword)}
                      size="sm"
                    >
                      <Icon as={showPassword ? FiEyeOff : FiEye} />
                    </Button>
                  </InputRightElement>
                      </InputGroup>
                      
                      {/* Password Strength Indicator */}
                      {password && (
                        <Box w="full" mt={2}>
                          <Progress
                            value={passwordStrength}
                            size="sm"
                            borderRadius="full"
                            colorScheme={passwordStrength < 50 ? 'red' : passwordStrength < 75 ? 'yellow' : 'green'}
                          />
                          <Text fontSize="xs" color="gray.500" mt={1}>
                            Password strength: {passwordStrength < 50 ? 'Weak' : passwordStrength < 75 ? 'Medium' : 'Strong'}
                          </Text>
                        </Box>
                      )}
                    </StandardField>

                    {/* Confirm Password Field */}
                    <StandardField label="Confirm Password" required error={errors.password_confirm?.message}>
                <InputGroup size="lg">
                  <InputLeftElement pointerEvents="none">
                    <Icon as={FiLock} color="gray.400" />
                  </InputLeftElement>
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    h="44px"
                    fontSize="sm"
                    bg="gray.50"
                    border="1px solid"
                    borderColor={passwordConfirm && password !== passwordConfirm ? 'red.300' : 'gray.300'}
                    borderRadius="lg"
                    pl="3rem"
                    pr="3rem"
                    _focus={{
                      borderColor: primaryColor,
                      bg: 'white',
                      boxShadow: `0 0 0 3px ${primaryColor}20`
                    }}
                    {...register('password_confirm', {
                      required: 'Please confirm your password'
                    })}
                  />
                  <InputRightElement>
                    <Button
                      variant="ghost"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      size="sm"
                    >
                      <Icon as={showConfirmPassword ? FiEyeOff : FiEye} />
                    </Button>
                  </InputRightElement>
                      </InputGroup>
                      
                      {/* Password Match Indicator */}
                      {passwordConfirm && (
                        <Text 
                          fontSize="xs" 
                          color={password === passwordConfirm ? 'green.500' : 'red.500'} 
                          mt={1}
                        >
                          {password === passwordConfirm ? '✓ Passwords match' : '✗ Passwords do not match'}
                        </Text>
                      )}
                    </StandardField>
                  </VStack>

                  {/* Submit Button */}
                  <StandardButton
                    type="submit"
                    variant="primary"
                    size="lg"
                    w="full"
                    h="50px"
                    isLoading={isSubmitting || isCreatingAccount}
                    loadingText="Creating account..."
                  >
                    Complete Setup
                  </StandardButton>

                  {/* Footer */}
                  <Text fontSize="xs" color="gray.500" textAlign="center">
                    By creating an account, you agree to our terms of service
                  </Text>
                </VStack>
              </form>
            </Box>
          </Container>
        </Flex>
      </Grid>
    </Box>
  );
};

export default SetupPassword;