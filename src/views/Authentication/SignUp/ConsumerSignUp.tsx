import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  Checkbox,
  Grid,
  Badge,
  Progress
} from '@chakra-ui/react';
import {
  FaGoogle,
  FaFacebook,
  FaEnvelope,
  FaLock,
  FaUser,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';
import AuthFooter from 'components/Footer/AuthFooter';
import { passwordValidator } from '../../../utils/passwordValidation';
import { PERSON_NAME_PATTERN, PERSON_NAME_MAX_LENGTH } from '../../../utils/nameValidation';
import { PasswordStrengthIndicator } from '../../../components/Forms/PasswordStrengthIndicator';
import { useSignUpMutation, useSocialAuthMutation } from '../../../store/api/authApi';
import { useClaimScansMutation } from '../../../store/api/historyApi';
import { login as loginAction } from '../../../store/features/authSlice';
import { getPendingScanTokens, clearPendingScans } from '../../../utils/pendingScanStorage';
import {
  handleGoogleSignIn,
  handleFacebookSignIn,
  handleSocialAuthError,
  checkSocialAuthConfig
} from '../../../utils/socialAuth';

// Motion components
const MotionBox = motion(Box);

interface SignUpFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  subscribeNewsletter: boolean;
}

const ConsumerSignUp: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();
  const [signUp, { isLoading }] = useSignUpMutation();
  const [socialAuth, { isLoading: isSocialLoading }] = useSocialAuthMutation();
  const [claimScans] = useClaimScansMutation();
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register: registerField,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<SignUpFormData>();

  const password = watch('password');
  const confirmPassword = watch('confirmPassword');
  const firstName = watch('firstName');
  const lastName = watch('lastName');
  const email = watch('email');

  // Password strength validation (mirrors backend validators)
  const passwordValidation = React.useMemo(() => {
    if (!password) return null;
    return passwordValidator.validate(password, {
      email: email || undefined,
      firstName: firstName || undefined,
      lastName: lastName || undefined
    });
  }, [password, email, firstName, lastName]);

  const passwordStrength = passwordValidation?.score ?? 0;

  const onSubmit = async (data: SignUpFormData) => {
    try {
      setError(null);

      // Validate password strength before submitting
      if (!passwordValidation || !passwordValidation.isValid) {
        toast({
          title: 'Weak password',
          description: passwordValidation?.errors[0] || 'Please choose a stronger password',
          status: 'error',
          duration: 4000,
          isClosable: true
        });
        return;
      }

      await signUp({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        password: data.password,
        user_type: 'CONSUMER',
        subscribe_newsletter: data.subscribeNewsletter
      }).unwrap();

      toast({
        title: 'Welcome to Trazo!',
        description:
          'Your account has been created. Please check your email to verify your account.',
        status: 'success',
        duration: 5000,
        isClosable: true
      });

      navigate('/auth/verifyemail', { state: { email: data.email } });
    } catch (err: any) {
      const errorMessage =
        err?.data?.detail || err?.data?.email?.[0] || 'Registration failed. Please try again.';
      setError(errorMessage);
    }
  };

  const handleSocialLoginSuccess = async (authData: any) => {
    try {
      setError(null);
      const response = await socialAuth(authData).unwrap();

      // Dispatch login action
      dispatch(loginAction(response));

      // Claim any anonymous scans made before signing up
      const pendingTokens = getPendingScanTokens();
      if (pendingTokens.length > 0) {
        claimScans({ claim_tokens: pendingTokens })
          .unwrap()
          .then(() => clearPendingScans())
          .catch(() => clearPendingScans());
      }

      // Set a flag to prevent Authenticated component from interfering
      sessionStorage.setItem('just_authenticated', 'true');

      toast({
        title: response.is_new_user ? 'Welcome to Trazo!' : 'Welcome back!',
        description: response.is_new_user
          ? 'Your account has been created successfully.'
          : 'You have successfully signed in.',
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
          overflow="hidden">
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
            zIndex={10}>
            <VStack spacing={4}>
              <Text fontSize="4xl" fontWeight="800" lineHeight="1.1" letterSpacing="tight">
                {intl.formatMessage({ id: 'consumerSignup.heroTitle' })}
              </Text>
              <Text fontSize="lg" opacity={0.9} fontWeight="400" lineHeight="1.6">
                {intl.formatMessage({ id: 'consumerSignup.heroSubtitle' })}
              </Text>
            </VStack>

            {/* Claim-safe bullets. The old list said "Verified Farming Data" (nothing here
                is third-party verified — records are farmer-reported) and "Transparency
                Tracking" (retired framing), and closed with "Join thousands" — a fabricated
                user count. Consumer surfaces state facts only. */}
            <VStack spacing={4} pt={4}>
              <VStack spacing={3}>
                {[
                  'consumerSignup.bulletFree',
                  'consumerSignup.bulletRecords',
                  'consumerSignup.bulletScan'
                ].map((featureId) => (
                  <HStack key={featureId} spacing={3}>
                    <Box w={2} h={2} bg="white" borderRadius="50%" />
                    <Text fontSize="sm" fontWeight="500" opacity={0.9}>
                      {intl.formatMessage({ id: featureId })}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            </VStack>
          </VStack>
        </Box>

        {/* Right side - Sign Up Form */}
        <Flex
          align="center"
          justify="center"
          bg={useColorModeValue('white', 'gray.900')}
          px={{ base: 4, sm: 6, md: 8 }}
          pt={{ base: '150px', md: 24 }}
          pb={8}
          overflow="hidden">
          <MotionBox
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            w="full"
            maxW={{ base: '100%', md: '480px' }}
            my={{ base: 4, lg: 8 }}>
            {/* Header */}
            <VStack spacing={4} mb={6}>
              <VStack spacing={1}>
                <Text fontSize="xl" fontWeight="600" color={useColorModeValue('gray.900', 'white')}>
                  Create Free Account
                </Text>
                <Text
                  fontSize="sm"
                  color={useColorModeValue('gray.500', 'gray.400')}
                  textAlign="center">
                  Start your sustainable food journey
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
                  mb={6}>
                  <Text color="red.600" fontSize="sm">
                    {error}
                  </Text>
                </Box>
              )}

              <form onSubmit={handleSubmit(onSubmit)}>
                <VStack spacing={4}>
                  {/* Name fields */}
                  <Grid templateColumns="1fr 1fr" gap={3} w="full">
                    <Box>
                      <Text
                        fontSize="sm"
                        fontWeight="500"
                        color={useColorModeValue('gray.700', 'gray.300')}
                        mb={1}>
                        First Name
                      </Text>
                      <Box
                        as="input"
                        type="text"
                        placeholder="First name"
                        w="full"
                        h="44px"
                        fontSize="sm"
                        bg={useColorModeValue('gray.50', 'gray.900')}
                        border="1px solid"
                        borderColor={
                          errors.firstName
                            ? 'red.300'
                            : focusedField === 'firstName'
                            ? 'blue.600'
                            : useColorModeValue('gray.200', 'gray.600')
                        }
                        borderRadius="xl"
                        px={4}
                        _hover={{
                          borderColor: errors.firstName
                            ? 'red.300'
                            : useColorModeValue('gray.300', 'gray.500')
                        }}
                        _focus={{
                          outline: 'none',
                          borderColor: 'blue.600',
                          bg: useColorModeValue('white', 'gray.800'),
                          boxShadow: '0 0 0 4px rgba(72, 187, 120, 0.1)'
                        }}
                        transition="all 0.2s"
                        {...registerField('firstName', {
                          required: 'First name is required',
                          maxLength: {
                            value: PERSON_NAME_MAX_LENGTH,
                            message: 'First name is too long'
                          },
                          pattern: {
                            value: PERSON_NAME_PATTERN,
                            message: "First name can't contain numbers or symbols"
                          }
                        })}
                        onFocus={() => setFocusedField('firstName')}
                        onBlur={() => setFocusedField(null)}
                      />
                      {errors.firstName && (
                        <Text fontSize="sm" color="red.500" mt={1}>
                          {errors.firstName.message}
                        </Text>
                      )}
                    </Box>

                    <Box>
                      <Text
                        fontSize="sm"
                        fontWeight="500"
                        color={useColorModeValue('gray.700', 'gray.300')}
                        mb={1}>
                        Last Name
                      </Text>
                      <Box
                        as="input"
                        type="text"
                        placeholder="Last name"
                        w="full"
                        h="44px"
                        fontSize="sm"
                        bg={useColorModeValue('gray.50', 'gray.900')}
                        border="1px solid"
                        borderColor={
                          errors.lastName
                            ? 'red.300'
                            : focusedField === 'lastName'
                            ? 'blue.600'
                            : useColorModeValue('gray.200', 'gray.600')
                        }
                        borderRadius="xl"
                        px={4}
                        _hover={{
                          borderColor: errors.lastName
                            ? 'red.300'
                            : useColorModeValue('gray.300', 'gray.500')
                        }}
                        _focus={{
                          outline: 'none',
                          borderColor: 'blue.600',
                          bg: useColorModeValue('white', 'gray.800'),
                          boxShadow: '0 0 0 4px rgba(72, 187, 120, 0.1)'
                        }}
                        transition="all 0.2s"
                        {...registerField('lastName', {
                          required: 'Last name is required',
                          maxLength: {
                            value: PERSON_NAME_MAX_LENGTH,
                            message: 'Last name is too long'
                          },
                          pattern: {
                            value: PERSON_NAME_PATTERN,
                            message: "Last name can't contain numbers or symbols"
                          }
                        })}
                        onFocus={() => setFocusedField('lastName')}
                        onBlur={() => setFocusedField(null)}
                      />
                      {errors.lastName && (
                        <Text fontSize="sm" color="red.500" mt={1}>
                          {errors.lastName.message}
                        </Text>
                      )}
                    </Box>
                  </Grid>

                  {/* Email */}
                  <Box w="full">
                    <Text
                      fontSize="sm"
                      fontWeight="500"
                      color={useColorModeValue('gray.700', 'gray.300')}
                      mb={1}>
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
                        placeholder="Enter your email address"
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
                            : useColorModeValue('gray.200', 'gray.600')
                        }
                        borderRadius="xl"
                        _hover={{
                          borderColor: errors.email
                            ? 'red.300'
                            : useColorModeValue('gray.300', 'gray.500')
                        }}
                        _focus={{
                          outline: 'none',
                          borderColor: 'blue.600',
                          bg: useColorModeValue('white', 'gray.800'),
                          boxShadow: '0 0 0 4px rgba(72, 187, 120, 0.1)'
                        }}
                        transition="all 0.2s"
                        {...registerField('email', {
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

                  {/* Password */}
                  <Box w="full">
                    <Text
                      fontSize="sm"
                      fontWeight="500"
                      color={useColorModeValue('gray.700', 'gray.300')}
                      mb={1}>
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
                        placeholder="Create password (8+ characters)"
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
                            : useColorModeValue('gray.200', 'gray.600')
                        }
                        borderRadius="xl"
                        _hover={{
                          borderColor: errors.password
                            ? 'red.300'
                            : useColorModeValue('gray.300', 'gray.500')
                        }}
                        _focus={{
                          outline: 'none',
                          borderColor: 'blue.600',
                          bg: useColorModeValue('white', 'gray.800'),
                          boxShadow: '0 0 0 4px rgba(72, 187, 120, 0.1)'
                        }}
                        transition="all 0.2s"
                        {...registerField('password', {
                          required: 'Password is required',
                          minLength: {
                            value: 8,
                            message: 'Password must be at least 8 characters'
                          }
                        })}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                      />
                      <InputRightElement>
                        <Button
                          variant="ghost"
                          onClick={() => setShowPassword(!showPassword)}
                          size="sm"
                          _hover={{ bg: 'transparent' }}>
                          <Icon
                            as={showPassword ? FaEyeSlash : FaEye}
                            color={useColorModeValue('gray.400', 'gray.500')}
                            _hover={{ color: useColorModeValue('gray.600', 'gray.300') }}
                            transition="all 0.2s"
                          />
                        </Button>
                      </InputRightElement>
                    </InputGroup>

                    <PasswordStrengthIndicator
                      password={password || ''}
                      userInfo={{
                        email: email || undefined,
                        firstName: firstName || undefined,
                        lastName: lastName || undefined
                      }}
                      validation={passwordValidation}
                    />

                    {errors.password && (
                      <Text fontSize="sm" color="red.500" mt={1}>
                        {errors.password.message}
                      </Text>
                    )}
                  </Box>

                  {/* Confirm password */}
                  <Box w="full">
                    <Text
                      fontSize="sm"
                      fontWeight="500"
                      color={useColorModeValue('gray.700', 'gray.300')}
                      mb={1}>
                      Confirm Password
                    </Text>
                    <InputGroup size="lg">
                      <InputLeftElement pointerEvents="none">
                        <Icon
                          as={FaLock}
                          color={focusedField === 'confirmPassword' ? 'blue.600' : 'gray.400'}
                          transition="all 0.2s"
                        />
                      </InputLeftElement>
                      <Box
                        as="input"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        pl="3rem"
                        pr="3rem"
                        w="full"
                        h="44px"
                        fontSize="sm"
                        bg={useColorModeValue('gray.50', 'gray.900')}
                        border="1px solid"
                        borderColor={
                          errors.confirmPassword
                            ? 'red.300'
                            : confirmPassword && password !== confirmPassword
                            ? 'red.300'
                            : focusedField === 'confirmPassword'
                            ? 'blue.600'
                            : useColorModeValue('gray.200', 'gray.600')
                        }
                        borderRadius="xl"
                        _hover={{
                          borderColor: errors.confirmPassword
                            ? 'red.300'
                            : useColorModeValue('gray.300', 'gray.500')
                        }}
                        _focus={{
                          outline: 'none',
                          borderColor: 'blue.600',
                          bg: useColorModeValue('white', 'gray.800'),
                          boxShadow: '0 0 0 4px rgba(72, 187, 120, 0.1)'
                        }}
                        transition="all 0.2s"
                        {...registerField('confirmPassword', {
                          required: 'Please confirm your password',
                          validate: (value: string) =>
                            value === password || 'Passwords do not match'
                        })}
                        onFocus={() => setFocusedField('confirmPassword')}
                        onBlur={() => setFocusedField(null)}
                      />
                      <InputRightElement>
                        <Button
                          variant="ghost"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          size="sm"
                          _hover={{ bg: 'transparent' }}>
                          <Icon
                            as={showConfirmPassword ? FaEyeSlash : FaEye}
                            color={useColorModeValue('gray.400', 'gray.500')}
                            _hover={{ color: useColorModeValue('gray.600', 'gray.300') }}
                            transition="all 0.2s"
                          />
                        </Button>
                      </InputRightElement>
                    </InputGroup>

                    {/* Password Match Indicator */}
                    {confirmPassword && (
                      <Text
                        fontSize="xs"
                        color={password === confirmPassword ? 'green.500' : 'red.500'}
                        mt={1}>
                        {password === confirmPassword
                          ? '✓ Passwords match'
                          : '✗ Passwords do not match'}
                      </Text>
                    )}

                    {errors.confirmPassword && !confirmPassword && (
                      <Text fontSize="sm" color="red.500" mt={1}>
                        {errors.confirmPassword.message}
                      </Text>
                    )}
                  </Box>

                  {/* Checkboxes */}
                  <VStack spacing={3} w="full" align="start">
                    <Box>
                      <Checkbox
                        size="md"
                        colorScheme="green"
                        spacing={3}
                        {...registerField('acceptTerms', {
                          required: 'You must accept the terms and conditions'
                        })}>
                        <Text fontSize="sm" color={useColorModeValue('gray.700', 'gray.300')}>
                          I agree to the{' '}
                          <a
                            href="https://trazo.io/terms-conditions"
                            target="_blank"
                            rel="noopener noreferrer">
                            <Text
                              as="span"
                              color="blue.600"
                              fontWeight="medium"
                              _hover={{ textDecoration: 'underline' }}>
                              Terms of Service
                            </Text>
                          </a>{' '}
                          and{' '}
                          <a
                            href="https://trazo.io/privacy-policy"
                            target="_blank"
                            rel="noopener noreferrer">
                            <Text
                              as="span"
                              color="blue.600"
                              fontWeight="medium"
                              _hover={{ textDecoration: 'underline' }}>
                              Privacy Policy
                            </Text>
                          </a>
                        </Text>
                      </Checkbox>
                      {errors.acceptTerms && (
                        <Text fontSize="sm" color="red.500" mt={1}>
                          {errors.acceptTerms.message}
                        </Text>
                      )}
                    </Box>

                    <Checkbox
                      size="md"
                      colorScheme="green"
                      spacing={3}
                      {...registerField('subscribeNewsletter')}>
                      <Text fontSize="sm" color={useColorModeValue('gray.700', 'gray.300')}>
                        Send me updates about sustainable food choices and new features
                      </Text>
                    </Checkbox>
                  </VStack>

                  {/* Sign up button */}
                  <Button
                    type="submit"
                    w="full"
                    h="44px"
                    bg="blue.600"
                    color="white"
                    fontSize="sm"
                    fontWeight="600"
                    borderRadius="xl"
                    isLoading={isLoading || isSocialLoading}
                    loadingText={isSocialLoading ? 'Authenticating...' : 'Creating account...'}
                    _hover={{
                      bg: 'blue.700',
                      transform: 'translateY(-1px)'
                    }}
                    _active={{
                      transform: 'translateY(0)'
                    }}
                    transition="all 0.2s">
                    Create Free Account
                  </Button>
                </VStack>
              </form>

              {/* Social signup section */}
              <VStack spacing={4} mt={6}>
                <HStack w="full" spacing={4}>
                  <Divider borderColor={useColorModeValue('gray.200', 'gray.600')} />
                  <Text
                    fontSize="sm"
                    color={useColorModeValue('gray.400', 'gray.400')}
                    flexShrink={0}
                    fontWeight="500">
                    Or continue with
                  </Text>
                  <Divider borderColor={useColorModeValue('gray.200', 'gray.600')} />
                </HStack>

                <HStack spacing={3} w="full">
                  {[
                    { icon: FaGoogle, color: '#EA4335', name: 'Google' },
                    { icon: FaFacebook, color: '#1877F2', name: 'Facebook' }
                  ].map((social) => (
                    <Button
                      key={social.name}
                      flex={1}
                      h="40px"
                      bg={useColorModeValue('gray.50', 'gray.700')}
                      border="1px solid"
                      borderColor={useColorModeValue('gray.200', 'gray.600')}
                      borderRadius="xl"
                      onClick={() => handleSocialLogin(social.name)}
                      isDisabled={isLoading || isSocialLoading}
                      _hover={{
                        bg: useColorModeValue('gray.100', 'gray.600'),
                        borderColor: useColorModeValue('gray.300', 'gray.500'),
                        transform: 'translateY(-1px)',
                        boxShadow: 'sm'
                      }}
                      transition="all 0.2s">
                      <Icon as={social.icon} fontSize="18px" color={social.color} />
                    </Button>
                  ))}
                </HStack>
              </VStack>
            </Box>

            {/* Sign in section */}
            <VStack spacing={3} mt={4}>
              <Box textAlign="center">
                <Text fontSize="xs" color={useColorModeValue('gray.500', 'gray.400')}>
                  Already have an account?{' '}
                  <Link to="/auth/signin">
                    <Text
                      as="span"
                      color="blue.600"
                      fontWeight="semibold"
                      _hover={{
                        textDecoration: 'underline',
                        color: 'blue.700'
                      }}
                      transition="all 0.2s">
                      Sign in
                    </Text>
                  </Link>
                </Text>
              </Box>

              <Box textAlign="center">
                <Text fontSize="sm" color={useColorModeValue('gray.500', 'gray.500')}>
                  Are you a producer?{' '}
                  <Link to="/auth/signup">
                    <Text
                      as="span"
                      color="blue.600"
                      _hover={{
                        textDecoration: 'underline',
                        color: 'blue.700'
                      }}
                      transition="all 0.2s">
                      Create business account
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

export default ConsumerSignUp;
