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
  InputRightElement,
  useColorModeValue,
  Grid,
  Badge
} from '@chakra-ui/react';
import {
  FaGoogle,
  FaFacebook,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import AuthFooter from 'components/Footer/AuthFooter';
import { useLoginMutation, useSocialAuthMutation } from '../../../store/api/authApi';
import { login as loginAction } from '../../../store/features/authSlice';
import {
  handleGoogleSignIn,
  handleFacebookSignIn,
  handleSocialAuthError,
  checkSocialAuthConfig
} from '../../../utils/socialAuth';


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
  const [showPassword, setShowPassword] = useState(false);

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

      // Dispatch login action
      dispatch(loginAction(response));

      // Set a flag to prevent Authenticated component from interfering
      sessionStorage.setItem('just_authenticated', 'true');

      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
        status: 'success',
        duration: 3000,
        isClosable: true
      });

      // RedirectGuard will handle the navigation
      // Default redirect to dashboard
      navigate('/admin/dashboard', { replace: true });
    } catch (err: any) {
      const errorMessage = err?.data?.detail || 'Invalid email or password';
      setError(errorMessage);
    }
  };

  const handleSocialLoginSuccess = async (authData: any) => {
    try {
      setError(null);
      const response = await socialAuth(authData).unwrap();

      // Dispatch login action
      dispatch(loginAction(response));

      // Set a flag to prevent Authenticated component from interfering
      sessionStorage.setItem('just_authenticated', 'true');

      toast({
        title: 'Welcome!',
        description: 'You have successfully signed in.',
        status: 'success',
        duration: 3000,
        isClosable: true
      });

      // RedirectGuard will handle the navigation
      // Default redirect to dashboard
      navigate('/admin/dashboard', { replace: true });
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
    <Box minH="100vh" display="flex" flexDirection="column">
      <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} flex="1" minH="calc(100vh - 80px)">
        {/* Left side - 2025 Premium App Design */}
        <Box
          bg="#0D47A1"
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
            bg="rgba(255,255,255,0.02)"
            borderRadius="12px"
            border="1px solid rgba(255,255,255,0.04)"
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
            bg="rgba(255,255,255,0.015)"
            borderRadius="50%"
            border="1px solid rgba(255,255,255,0.03)"
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
            bg="linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)"
            zIndex={0}
          />

          <Box
            position="absolute"
            bottom="35%"
            left="0"
            right="0"
            h="1px"
            bg="linear-gradient(to right, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)"
            zIndex={0}
          />

          {/* Tiny accent dots */}
          <Box
            position="absolute"
            top="25%"
            left="20%"
            w="2px"
            h="2px"
            bg="rgba(255,255,255,0.15)"
            borderRadius="50%"
            zIndex={0}
          />

          <Box
            position="absolute"
            bottom="45%"
            right="15%"
            w="3px"
            h="3px"
            bg="rgba(255,255,255,0.12)"
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
                Know Your Food's Climate Impact
              </Text>
              <Text fontSize="lg" opacity={0.9} fontWeight="400" lineHeight="1.6">
                Scan products to see documented farming practices and support climate-positive farming
                through informed choices
              </Text>
            </VStack>

            <VStack spacing={3} pt={4}>
              {['Documented Farm Journeys', 'Blockchain Security', 'Real Farm Stories'].map(
                (feature, index) => (
                  <HStack key={index} spacing={3}>
                    <Box w={2} h={2} bg="white" borderRadius="50%" />
                    <Text fontSize="sm" fontWeight="500" opacity={0.9}>
                      {feature}
                    </Text>
                  </HStack>
                )
              )}
            </VStack>
          </VStack>
        </Box>

        {/* Right side - Sign In Form */}
        <Flex
          align="center"
          justify="center"
          bg={useColorModeValue('white', 'gray.900')}
          px={{ base: 4, sm: 6, md: 8 }}
          py={12}
          pt={{ base: '150px', md: '145px' }}
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
                >
                  Discover Food Transparency
                </Text>
                <Text
                  fontSize="md"
                  color={useColorModeValue('gray.500', 'gray.400')}
                  textAlign="center"
                >
                  Discover how your food was grown with verified farming transparency
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
                          color={focusedField === 'email' ? 'blue.600' : 'gray.400'}
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
                            ? 'blue.600'
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
                          borderColor: 'blue.600',
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
                          color={focusedField === 'password' ? 'blue.600' : 'gray.400'}
                          transition="all 0.2s"
                        />
                      </InputLeftElement>
                      <Box
                        as="input"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        pl="3rem"
                        pr="3rem"
                        w="full"
                        h="44px"
                        fontSize="sm"
                        bg={useColorModeValue('gray.50', 'gray.900')}
                        border="1px solid"
                        borderColor={
                          errors.password
                            ? 'red.300'
                            : focusedField === 'password'
                            ? 'blue.600'
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
                          borderColor: 'blue.600',
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
                      <InputRightElement>
                        <Button
                          variant="ghost"
                          onClick={() => setShowPassword(!showPassword)}
                          size="sm"
                          _hover={{ bg: 'transparent' }}
                        >
                          <Icon
                            as={showPassword ? FaEyeSlash : FaEye}
                            color={useColorModeValue('gray.400', 'gray.500')}
                            _hover={{ color: useColorModeValue('gray.600', 'gray.300') }}
                            transition="all 0.2s"
                          />
                        </Button>
                      </InputRightElement>
                    </InputGroup>
                    {errors.password && (
                      <Text fontSize="sm" color="red.500" mt={1}>
                        {errors.password.message}
                      </Text>
                    )}
                  </Box>

                  {/* Forgot password */}
                  <HStack justify="flex-end" w="full">
                    <Link to="/auth/forgot-password">
                      <Text
                        fontSize="sm"
                        color="blue.600"
                        fontWeight="medium"
                        _hover={{
                          textDecoration: 'underline',
                          color: 'blue.700'
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
                    bg="blue.600"
                    color="white"
                    fontSize="md"
                    fontWeight="semibold"
                    borderRadius="lg"
                    isLoading={isLoading || isSocialLoading}
                    loadingText={isSocialLoading ? 'Authenticating...' : 'Signing in...'}
                    _hover={{
                      bg: 'blue.700',
                      transform: 'translateY(-1px)'
                    }}
                    _active={{
                      transform: 'translateY(0)'
                    }}
                    transition="all 0.2s"
                  >
                    Sign In
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
                  <Link to="/auth/signup">
                    <Text
                      as="span"
                      color="blue.600"
                      fontWeight="semibold"
                      _hover={{
                        textDecoration: 'underline',
                        color: 'blue.700'
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
                      color="blue.600"
                      _hover={{
                        textDecoration: 'underline',
                        color: 'blue.700'
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

      <AuthFooter />
    </Box>
  );
};

export default ConsumerSignIn;
