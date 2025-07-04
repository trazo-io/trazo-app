import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import {
  Box,
  VStack,
  HStack,
  Text,
  Divider,
  useToast,
  Icon,
  Flex,
  Image,
  Button,
  InputGroup,
  InputLeftElement,
  useColorModeValue,
  Grid,
  Badge
} from '@chakra-ui/react';
import { FaGoogle, FaFacebook, FaApple, FaEnvelope, FaLock } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useLoginMutation, useSocialAuthMutation } from '../../../store/api/authApi';
import { login as loginAction } from '../../../store/features/authSlice';
import { executeAuthRedirectAction, buildAuthRedirectUrl } from '../../../utils/authRedirect';
import {
  handleGoogleSignIn,
  handleFacebookSignIn,
  handleAppleSignIn,
  handleSocialAuthError,
  checkSocialAuthConfig
} from '../../../utils/socialAuth';

// No assets needed for minimalist design

// Motion components
const MotionBox = motion(Box);

interface SignInFormData {
  email: string;
  password: string;
}

const ConsumerSignIn: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();
  const [login, { isLoading }] = useLoginMutation();
  const [socialAuth, { isLoading: isSocialLoading }] = useSocialAuthMutation();
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<SignInFormData>();

  const onSubmit = async (data: SignInFormData) => {
    console.log('🔍 ConsumerSignIn onSubmit called');
    try {
      setError(null);
      const response = await login(data).unwrap();
      console.log('🔍 Login successful, response:', response);

      // First check if there's a pending auth redirect URL
      const pendingRedirectUrl = buildAuthRedirectUrl();
      if (pendingRedirectUrl) {
        console.log('🔐 ConsumerSignIn: Found pending redirect URL:', pendingRedirectUrl);
        // Dispatch login action with redirect URL
        dispatch(loginAction({ ...response, redirectUrl: pendingRedirectUrl }));

        // Execute the redirect immediately
        const redirectExecuted = executeAuthRedirectAction(navigate);
        if (redirectExecuted) {
          console.log('🔐 ConsumerSignIn: Auth redirect action executed successfully');
          toast({
            title: 'Welcome back!',
            description: 'You have successfully signed in.',
            status: 'success',
            duration: 3000,
            isClosable: true
          });
          return;
        }
      } else {
        // No pending action, dispatch login normally
        dispatch(loginAction(response));
      }

      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
        status: 'success',
        duration: 3000,
        isClosable: true
      });

      // Default redirect - directly to impact to avoid route conflicts
      navigate('/admin/dashboard/impact', { replace: true });
    } catch (err: any) {
      const errorMessage = err?.data?.detail || 'Invalid email or password';
      setError(errorMessage);
    }
  };

  const handleSocialLoginSuccess = async (authData: any) => {
    try {
      setError(null);
      const response = await socialAuth(authData).unwrap();

      // First check if there's a pending auth redirect URL
      const pendingRedirectUrl = buildAuthRedirectUrl();
      if (pendingRedirectUrl) {
        console.log('🔐 ConsumerSignIn: Found pending redirect URL:', pendingRedirectUrl);
        // Dispatch login action with redirect URL
        dispatch(loginAction({ ...response, redirectUrl: pendingRedirectUrl }));

        // Execute the redirect immediately
        const redirectExecuted = executeAuthRedirectAction(navigate);
        if (redirectExecuted) {
          console.log('🔐 ConsumerSignIn: Auth redirect action executed successfully');
          toast({
            title: 'Welcome!',
            description: 'You have successfully signed in.',
            status: 'success',
            duration: 3000,
            isClosable: true
          });
          return;
        }
      } else {
        // No pending action, dispatch login normally
        dispatch(loginAction(response));
      }

      toast({
        title: 'Welcome!',
        description: 'You have successfully signed in.',
        status: 'success',
        duration: 3000,
        isClosable: true
      });

      // Default redirect - directly to impact to avoid route conflicts
      navigate('/admin/dashboard/impact', { replace: true });
    } catch (err: any) {
      const errorMessage = err?.data?.error || 'Social authentication failed';
      setError(errorMessage);
      handleSocialAuthError(new Error(errorMessage), authData.provider);
    }
  };

  const handleSocialLoginError = (error: Error, provider: string) => {
    console.error(`${provider} auth error:`, error);
    handleSocialAuthError(error, provider);
  };

  const handleSocialLogin = async (provider: string) => {
    // Check if social auth is configured
    const config = checkSocialAuthConfig();

    switch (provider) {
      case 'Google':
        if (!config.google) {
          toast({
            title: 'Configuration Error',
            description: 'Google sign-in is not configured. Please contact support.',
            status: 'error',
            duration: 5000,
            isClosable: true
          });
          return;
        }
        await handleGoogleSignIn(
          handleSocialLoginSuccess,
          (error) => handleSocialLoginError(error, 'Google'),
          5 // Consumer user type
        );
        break;

      case 'Facebook':
        if (!config.facebook) {
          toast({
            title: 'Configuration Error',
            description: 'Facebook sign-in is not configured. Please contact support.',
            status: 'error',
            duration: 5000,
            isClosable: true
          });
          return;
        }
        await handleFacebookSignIn(
          handleSocialLoginSuccess,
          (error) => handleSocialLoginError(error, 'Facebook'),
          5 // Consumer user type
        );
        break;

      case 'Apple':
        if (!config.apple) {
          toast({
            title: 'Configuration Error',
            description: 'Apple sign-in is not configured. Please contact support.',
            status: 'error',
            duration: 5000,
            isClosable: true
          });
          return;
        }
        await handleAppleSignIn(
          handleSocialLoginSuccess,
          (error) => handleSocialLoginError(error, 'Apple'),
          5 // Consumer user type
        );
        break;

      default:
        toast({
          title: 'Error',
          description: 'Unknown social login provider.',
          status: 'error',
          duration: 3000,
          isClosable: true
        });
    }
  };

  return (
    <Grid
      templateColumns={{ base: '1fr', lg: '1fr 1fr' }}
      minH="calc(100vh - 80px)"
      maxH="calc(100vh - 80px)"
      overflow="hidden"
    >
      {/* Left side - Modern Brand Section */}
      <Box
        bg="linear-gradient(135deg, #0891b2 0%, #0e7490 50%, #155e75 100%)"
        display={{ base: 'none', lg: 'flex' }}
        alignItems="center"
        justifyContent="center"
        position="relative"
        overflow="hidden"
      >
        {/* Subtle geometric patterns */}
        <Box
          position="absolute"
          top="-10%"
          right="-10%"
          w="300px"
          h="300px"
          borderRadius="50%"
          bg="whiteAlpha.100"
          filter="blur(100px)"
        />
        <Box
          position="absolute"
          bottom="-15%"
          left="-15%"
          w="400px"
          h="400px"
          borderRadius="50%"
          bg="whiteAlpha.50"
          filter="blur(120px)"
        />

        <VStack spacing={8} position="relative" textAlign="center" color="white" px={12} maxW="lg">
          <VStack spacing={4}>
            <Text fontSize="4xl" fontWeight="800" lineHeight="1.1" letterSpacing="tight">
              Discover Carbon Stories
            </Text>
            <Text fontSize="lg" opacity={0.9} fontWeight="400" lineHeight="1.6">
              Connect with sustainable farmers, track carbon footprints, and make informed choices
              about the food you consume
            </Text>
          </VStack>

          <VStack spacing={3} pt={4}>
            {['Verified Farms', 'Real Carbon Data', 'Full Transparency'].map((feature, index) => (
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

      {/* Right side - Sign In Form */}
      <Flex
        align="center"
        justify="center"
        bg={useColorModeValue('white', 'gray.900')}
        px={8}
        py={12}
      >
        <MotionBox
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          w="full"
          maxW="420px"
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
              >
                Welcome back
              </Text>
              <Text
                fontSize="md"
                color={useColorModeValue('gray.500', 'gray.400')}
                textAlign="center"
              >
                Sign in to discover sustainable food
              </Text>
            </VStack>
          </VStack>

          {/* Main Form */}
          <Box w="full">
            {error && (
              <Box
                bg="red.50"
                border="1px solid"
                borderColor="red.200"
                borderRadius="lg"
                p={4}
                mb={6}
              >
                <Text color="red.600" fontSize="sm">
                  {error}
                </Text>
              </Box>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              <VStack spacing={5}>
                {/* Email field */}
                <Box w="full">
                  <Text
                    fontSize="sm"
                    fontWeight="medium"
                    color={useColorModeValue('gray.700', 'gray.300')}
                    mb={2}
                  >
                    Email Address
                  </Text>
                  <InputGroup size="lg">
                    <InputLeftElement pointerEvents="none">
                      <Icon
                        as={FaEnvelope}
                        color={focusedField === 'email' ? 'green.500' : 'gray.400'}
                        transition="all 0.2s"
                      />
                    </InputLeftElement>
                    <Box
                      as="input"
                      type="email"
                      placeholder="Enter your email"
                      pl="3rem"
                      w="full"
                      h="44px"
                      fontSize="sm"
                      bg={useColorModeValue('gray.50', 'gray.900')}
                      border="1px solid"
                      borderColor={
                        errors.email
                          ? 'red.300'
                          : focusedField === 'email'
                          ? 'green.500'
                          : useColorModeValue('gray.300', 'gray.600')
                      }
                      borderRadius="lg"
                      _hover={{
                        borderColor: errors.email
                          ? 'red.300'
                          : useColorModeValue('gray.400', 'gray.500')
                      }}
                      _focus={{
                        outline: 'none',
                        borderColor: 'green.500',
                        bg: useColorModeValue('white', 'gray.800'),
                        boxShadow: '0 0 0 3px rgba(72, 187, 120, 0.1)'
                      }}
                      transition="all 0.2s"
                      {...register('email', {
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address'
                        }
                      })}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </InputGroup>
                  {errors.email && (
                    <Text fontSize="sm" color="red.500" mt={1}>
                      {errors.email.message}
                    </Text>
                  )}
                </Box>

                {/* Password field */}
                <Box w="full">
                  <Text
                    fontSize="sm"
                    fontWeight="medium"
                    color={useColorModeValue('gray.700', 'gray.300')}
                    mb={2}
                  >
                    Password
                  </Text>
                  <InputGroup size="lg">
                    <InputLeftElement pointerEvents="none">
                      <Icon
                        as={FaLock}
                        color={focusedField === 'password' ? 'green.500' : 'gray.400'}
                        transition="all 0.2s"
                      />
                    </InputLeftElement>
                    <Box
                      as="input"
                      type="password"
                      placeholder="Enter your password"
                      pl="3rem"
                      w="full"
                      h="44px"
                      fontSize="sm"
                      bg={useColorModeValue('gray.50', 'gray.900')}
                      border="1px solid"
                      borderColor={
                        errors.password
                          ? 'red.300'
                          : focusedField === 'password'
                          ? 'green.500'
                          : useColorModeValue('gray.300', 'gray.600')
                      }
                      borderRadius="lg"
                      _hover={{
                        borderColor: errors.password
                          ? 'red.300'
                          : useColorModeValue('gray.400', 'gray.500')
                      }}
                      _focus={{
                        outline: 'none',
                        borderColor: 'green.500',
                        bg: useColorModeValue('white', 'gray.800'),
                        boxShadow: '0 0 0 3px rgba(72, 187, 120, 0.1)'
                      }}
                      transition="all 0.2s"
                      {...register('password', {
                        required: 'Password is required'
                      })}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </InputGroup>
                  {errors.password && (
                    <Text fontSize="sm" color="red.500" mt={1}>
                      {errors.password.message}
                    </Text>
                  )}
                </Box>

                {/* Forgot password */}
                <HStack justify="flex-end" w="full">
                  <Link to="/consumer/auth/forgot-password">
                    <Text
                      fontSize="sm"
                      color="green.600"
                      fontWeight="medium"
                      _hover={{
                        textDecoration: 'underline',
                        color: 'green.700'
                      }}
                      transition="all 0.2s"
                    >
                      Forgot password?
                    </Text>
                  </Link>
                </HStack>

                {/* Sign in button */}
                <Button
                  type="submit"
                  w="full"
                  h="48px"
                  bg="green.600"
                  color="white"
                  fontSize="md"
                  fontWeight="semibold"
                  borderRadius="lg"
                  isLoading={isLoading || isSocialLoading}
                  loadingText={isSocialLoading ? 'Authenticating...' : 'Signing in...'}
                  _hover={{
                    bg: 'green.700'
                  }}
                  _active={{
                    bg: 'green.800'
                  }}
                  transition="all 0.2s"
                >
                  Sign in
                </Button>
              </VStack>
            </form>

            {/* Social login section */}
            <VStack spacing={4} mt={8}>
              <HStack w="full" spacing={4}>
                <Divider borderColor={useColorModeValue('gray.300', 'gray.600')} />
                <Text
                  fontSize="sm"
                  color={useColorModeValue('gray.500', 'gray.400')}
                  flexShrink={0}
                  fontWeight="medium"
                >
                  Or continue with
                </Text>
                <Divider borderColor={useColorModeValue('gray.300', 'gray.600')} />
              </HStack>

              <VStack spacing={3} w="full">
                {[
                  {
                    icon: FaGoogle,
                    color: '#EA4335',
                    name: 'Google',
                    text: 'Continue with Google'
                  },
                  {
                    icon: FaFacebook,
                    color: '#1877F2',
                    name: 'Facebook',
                    text: 'Continue with Facebook'
                  },
                  {
                    icon: FaApple,
                    color: useColorModeValue('black', 'white'),
                    name: 'Apple',
                    text: 'Continue with Apple'
                  }
                ].map((social) => (
                  <Button
                    key={social.name}
                    w="full"
                    h="40px"
                    bg={useColorModeValue('white', 'gray.700')}
                    border="1px solid"
                    borderColor={useColorModeValue('gray.300', 'gray.600')}
                    borderRadius="lg"
                    onClick={() => handleSocialLogin(social.name)}
                    isDisabled={isLoading || isSocialLoading}
                    justifyContent="center"
                    leftIcon={<Icon as={social.icon} fontSize="18px" color={social.color} />}
                    _hover={{
                      bg: useColorModeValue('gray.50', 'gray.600'),
                      borderColor: useColorModeValue('gray.400', 'gray.500')
                    }}
                    transition="all 0.2s"
                  >
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color={useColorModeValue('gray.700', 'gray.300')}
                    >
                      {social.text}
                    </Text>
                  </Button>
                ))}
              </VStack>
            </VStack>
          </Box>

          {/* Sign up section */}
          <VStack spacing={4} mt={8}>
            <Box textAlign="center">
              <Text fontSize="xs" color={useColorModeValue('gray.500', 'gray.400')}>
                Don't have an account?{' '}
                <Link to="/consumer/auth/signup">
                  <Text
                    as="span"
                    color="green.600"
                    fontWeight="semibold"
                    _hover={{
                      textDecoration: 'underline',
                      color: 'green.700'
                    }}
                    transition="all 0.2s"
                  >
                    Sign up for free
                  </Text>
                </Link>
              </Text>
            </Box>

            <Box textAlign="center">
              <Text fontSize="sm" color={useColorModeValue('gray.500', 'gray.500')}>
                Are you a producer?{' '}
                <Link to="/auth/signin">
                  <Text
                    as="span"
                    color="green.600"
                    _hover={{
                      textDecoration: 'underline',
                      color: 'green.700'
                    }}
                    transition="all 0.2s"
                  >
                    Business login
                  </Text>
                </Link>
              </Text>
            </Box>
          </VStack>
        </MotionBox>
      </Flex>
    </Grid>
  );
};

export default ConsumerSignIn;
