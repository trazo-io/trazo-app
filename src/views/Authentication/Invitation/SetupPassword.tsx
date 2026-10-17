import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  Box,
  Button,
  Flex,
  Text,
  VStack,
  HStack,
  Icon,
  useToast,
  Progress,
  useColorModeValue,
  Badge,
  Grid,
  Container,
  Divider,
  Checkbox
} from '@chakra-ui/react';
import {
  useNavigate,
  useParams,
  useSearchParams,
  useLocation,
  Link as RouterLink
} from 'react-router-dom';
import { FiLock, FiEye, FiEyeOff, FiCheck, FiUser, FiShield } from 'react-icons/fi';
import { FaGoogle, FaFacebook } from 'react-icons/fa';
import { HiOfficeBuilding } from 'react-icons/hi';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { useIntl } from 'react-intl';
import AuthFooter from 'components/Footer/AuthFooter';
import {
  StandardField,
  StandardInput,
  StandardButton,
  registerWithFocus
} from 'components/Design/StandardComponents';
import { passwordValidator } from 'utils/passwordValidation';
import { PasswordStrengthIndicator } from 'components/Forms/PasswordStrengthIndicator';
import {
  useSignupWithInvitationMutation,
  useGetInvitationDetailsQuery
} from 'store/api/invitationApi';
import { useSocialAuthMutation } from 'store/api/authApi';
import { login as loginAction } from 'store/features/authSlice';
import { setUser } from 'store/features/userSlice';
import { setCompany } from 'store/features/companySlice';
import { ROLE_DISPLAY_FARM_MANAGER } from 'config';
import {
  handleGoogleSignIn,
  handleFacebookSignIn,
  handleSocialAuthError,
  checkSocialAuthConfig
} from 'utils/socialAuth';

interface SetupPasswordFormData {
  first_name: string;
  last_name: string;
  password: string;
  password_confirm: string;
  acceptTerms: boolean;
}

// Motion components
const MotionBox = motion(Box);

/**
 * The localized reason a password was refused, for the reasons the strength indicator cannot
 * show. Matches the English messages `passwordValidator.validate()` pushes
 * (utils/passwordValidation.ts).
 */
export function weakPasswordReasonId(errors: string[] | undefined): string {
  const list = errors ?? [];
  if (list.some((e) => /personal information/i.test(e))) {
    return 'auth.invitationSetup.weakPassword.personalInfo';
  }
  if (list.some((e) => /too simple/i.test(e))) {
    return 'auth.invitationSetup.weakPassword.tooSimple';
  }
  return 'auth.signup.toast.weakPassword.body';
}

const SetupPassword: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const intl = useIntl();
  const dispatch = useDispatch();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<'setup' | 'success'>('setup');
  const [redirectProgress, setRedirectProgress] = useState(0);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Get invitation code from URL params
  const { invitationCode } = useParams<{ invitationCode: string }>();

  // API hooks
  const [signupWithInvitation, { isLoading: isCreatingAccount }] =
    useSignupWithInvitationMutation();
  const [socialAuth, { isLoading: isSocialLoading }] = useSocialAuthMutation();
  const {
    data: invitationDetails,
    error: detailsError,
    isLoading: isLoadingDetails
  } = useGetInvitationDetailsQuery(invitationCode || '', {
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
  const firstName = watch('first_name');
  const lastName = watch('last_name');
  const acceptTerms = watch('acceptTerms');

  // Password strength validation (mirrors backend validators)
  const passwordValidation = React.useMemo(() => {
    if (!password) return null;
    return passwordValidator.validate(password, {
      firstName: firstName || undefined,
      lastName: lastName || undefined
    });
  }, [password, firstName, lastName]);

  const passwordStrength = passwordValidation?.score ?? 0;

  // Store invitation code in sessionStorage as fallback for sign-in page flow
  React.useEffect(() => {
    if (invitationCode) {
      sessionStorage.setItem('pendingInvitation', invitationCode);
    }
  }, [invitationCode]);

  // Social auth handlers
  const handleSocialLoginSuccess = async (authData: any) => {
    try {
      const response = await socialAuth({
        ...authData,
        invitation_code: invitationCode,
        accept_terms: acceptTerms === true
      }).unwrap();

      dispatch(loginAction(response));
      handleSuccessfulSignup(response);
    } catch (err: any) {
      const errorMessage =
        err?.data?.error || intl.formatMessage({ id: 'auth.error.social.failed' });
      toast({
        title: intl.formatMessage({ id: 'auth.invitationSetup.toast.signInFailed.title' }),
        description: errorMessage,
        status: 'error',
        duration: 4000,
        isClosable: true
      });
      handleSocialAuthError(new Error(errorMessage), authData.provider);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    const config = checkSocialAuthConfig();

    switch (provider) {
      case 'Google':
        if (!config.google) return;
        await handleGoogleSignIn(
          handleSocialLoginSuccess,
          (error) => handleSocialAuthError(error, 'Google'),
          4
        );
        break;
      case 'Facebook':
        if (!config.facebook) return;
        await handleFacebookSignIn(
          handleSocialLoginSuccess,
          (error) => handleSocialAuthError(error, 'Facebook'),
          4
        );
        break;
    }
  };

  // Check for invitation errors
  React.useEffect(() => {
    if (detailsError) {
      toast({
        title: intl.formatMessage({ id: 'auth.invitationSetup.toast.invitationError.title' }),
        description: intl.formatMessage({
          id: 'auth.invitationSetup.toast.invitationError.notFound'
        }),
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  }, [detailsError, toast, intl]);

  // Handle form submission
  const onSubmit = async (data: SetupPasswordFormData) => {
    if (data.password !== data.password_confirm) {
      toast({
        title: intl.formatMessage({ id: 'auth.invitationSetup.toast.mismatch.title' }),
        description: intl.formatMessage({ id: 'auth.invitationSetup.toast.mismatch.body' }),
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    if (!passwordValidation || !passwordValidation.isValid) {
      toast({
        // The validator's messages are English-only. The strength indicator under the field
        // lists the five character rules in the reader's language, but has no row for the two
        // other reasons a password is refused (too simple, contains the person's name), so those
        // get their own localized line; anything else falls back to the generic one.
        title: intl.formatMessage({ id: 'auth.signup.toast.weakPassword.title' }),
        description: intl.formatMessage({ id: weakPasswordReasonId(passwordValidation?.errors) }),
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    if (!invitationCode) {
      toast({
        title: intl.formatMessage({ id: 'auth.invitationSetup.toast.invitationError.title' }),
        description: intl.formatMessage({
          id: 'auth.invitationSetup.toast.invitationError.noCode'
        }),
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    try {
      console.log('🔒 INVITATION: Starting signup with invitation...');
      const result = await signupWithInvitation({
        first_name: data.first_name,
        last_name: data.last_name,
        password: data.password,
        invitation_code: invitationCode,
        accept_terms: data.acceptTerms === true
      }).unwrap();

      console.log('🔒 INVITATION: Signup result received:', result);

      handleSuccessfulSignup(result);
    } catch (error: any) {
      console.error('🔒 INVITATION ERROR: Error creating account:', error);
      console.error('🔒 INVITATION ERROR: Full error object:', JSON.stringify(error, null, 2));

      // Check if this is actually a successful response being treated as an error
      if (error?.status === 201 || error?.data?.access) {
        console.warn('🔒 INVITATION: Got 201 status in error handler - treating as success');

        // Handle it as a successful response
        if (error?.data) {
          handleSuccessfulSignup(error.data);
          return;
        }
      }

      toast({
        title: intl.formatMessage({ id: 'auth.invitationSetup.toast.failed.title' }),
        description:
          error?.data?.error ||
          error?.data?.message ||
          intl.formatMessage({ id: 'auth.invitationSetup.toast.failed.body' }),
        status: 'error',
        duration: 4000,
        isClosable: true
      });
    }
  };

  // Extract the success handling logic
  const handleSuccessfulSignup = (result: any) => {
    // Log the user in immediately after account creation
    // Tokens are set as httpOnly cookies by the backend — no localStorage needed
    if (result.user) {
      // Prepare user data with company included
      const userData = {
        ...result.user,
        companies: result.company
          ? [
              {
                id: result.company.id,
                name: result.company.name,
                role: result.role || ROLE_DISPLAY_FARM_MANAGER
              }
            ]
          : []
      };

      // Set user data in Redux
      dispatch(setUser(userData));
      console.log('🔒 INVITATION: User data set:', userData);

      // Set company data if available
      if (result.company) {
        dispatch(setCompany(result.company));
        console.log('🔒 INVITATION: Company data set:', result.company);
      }

      // Dispatch login action with correct payload structure (data wrapper)
      dispatch(
        loginAction({
          data: {
            access: result.access,
            refresh: result.refresh,
            user: userData
          }
        })
      );
      console.log('🔒 INVITATION: Login action dispatched with isAuthenticated = true');
    }

    setStep('success');

    // Start progress animation and redirect based on subscription status
    const redirectUrl = result.redirect_to || '/admin/dashboard';
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 5;
      setRedirectProgress(progress);
      if (progress >= 100) {
        clearInterval(progressInterval);
        navigate(redirectUrl, { replace: true });
      }
    }, 100);
  };

  // Success state - Modern Trazo Design
  if (step === 'success') {
    return (
      <Box minH="100vh" display="flex" flexDirection="column">
        <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} flex="1" minH="calc(100vh - 80px)">
          {/* Left side - Same as setup form for consistency */}
          <Box
            bg="green.600"
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

            {/* Floating elements */}
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
                  {intl.formatMessage({ id: 'auth.invitationSetup.success.panelTitle' })}
                </Text>
                <Text fontSize="lg" opacity={0.9} fontWeight="400" lineHeight="1.6">
                  {intl.formatMessage({ id: 'auth.invitationSetup.success.panelBody' })}
                </Text>
              </VStack>

              <VStack spacing={3} pt={4}>
                {[
                  intl.formatMessage({ id: 'auth.invitationSetup.success.item.records' }),
                  intl.formatMessage({ id: 'auth.invitationSetup.success.item.renewal' }),
                  intl.formatMessage({ id: 'auth.invitationSetup.success.item.team' })
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

          {/* Right side - Success content */}
          <Flex
            align="center"
            justify="center"
            bg={useColorModeValue('white', 'gray.900')}
            px={{ base: 4, sm: 6, md: 8 }}
            py={12}
            overflow="hidden">
            <MotionBox
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
              textAlign="center"
              maxW={{ base: '100%', md: '420px' }}>
              <VStack spacing={8}>
                <Box
                  w="100px"
                  h="100px"
                  bg="linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)"
                  borderRadius="2xl"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  boxShadow="0 20px 40px rgba(72, 187, 120, 0.4)"
                  animation="pulse 2s infinite">
                  <Icon as={FiCheck} color="white" boxSize={12} />
                </Box>

                <VStack spacing={4}>
                  <Text
                    fontSize="2xl"
                    fontWeight="700"
                    color={useColorModeValue('gray.800', 'white')}>
                    {intl.formatMessage({ id: 'auth.invitationSetup.success.title' })}
                  </Text>
                  <Text
                    fontSize="md"
                    color={useColorModeValue('gray.600', 'gray.300')}
                    textAlign="center"
                    lineHeight="1.6">
                    {intl.formatMessage({ id: 'auth.invitationSetup.success.body' })}
                  </Text>
                </VStack>

                {/* Modern Progress Bar */}
                <Box w="300px">
                  <Progress
                    value={redirectProgress}
                    size="lg"
                    borderRadius="full"
                    bg={useColorModeValue('gray.100', 'gray.700')}
                    sx={{
                      '& > div': {
                        background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
                        transition: 'width 0.1s ease'
                      }
                    }}
                  />
                  <HStack justify="space-between" mt={2}>
                    <Text fontSize="xs" color={useColorModeValue('gray.500', 'gray.400')}>
                      {intl.formatMessage({ id: 'auth.invitationSetup.success.progress' })}
                    </Text>
                    <Text
                      fontSize="xs"
                      color={useColorModeValue('gray.500', 'gray.400')}
                      fontWeight="600">
                      {Math.round(redirectProgress)}%
                    </Text>
                  </HStack>
                </Box>
              </VStack>
            </MotionBox>
          </Flex>
        </Grid>

        <AuthFooter />
      </Box>
    );
  }

  // Loading state for invitation details
  if (isLoadingDetails) {
    return (
      <Flex minH="calc(100vh - 80px)" align="center" justify="center" bg="gray.50" px={4}>
        <VStack spacing={8} textAlign="center" maxW={{ base: '100%', md: '400px' }}>
          <Box
            w="80px"
            h="80px"
            bg="#2E7D32"
            borderRadius="2xl"
            display="flex"
            alignItems="center"
            justifyContent="center"
            animation="pulse 2s infinite">
            <Text fontSize="2xl" fontWeight="900" color="white" letterSpacing="-1px">
              T
            </Text>
          </Box>
          <VStack spacing={4}>
            <Text fontSize="xl" fontWeight="600" color="gray.700">
              {intl.formatMessage({ id: 'auth.invitationSetup.loading.title' })}
            </Text>
            <Text fontSize="sm" color="gray.500" lineHeight="1.6" textAlign="center">
              {intl.formatMessage({ id: 'auth.invitationSetup.loading.body' })}
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
        <Box
          maxW="400px"
          w="full"
          bg="white"
          borderRadius="2xl"
          boxShadow="0 25px 50px rgba(0, 0, 0, 0.1)"
          p={8}
          border="1px solid"
          borderColor="gray.100">
          <VStack spacing={6} textAlign="center">
            <Box
              w="80px"
              h="80px"
              bg="linear-gradient(135deg, #EF4444 0%, #DC2626 100%)"
              borderRadius="2xl"
              display="flex"
              alignItems="center"
              justifyContent="center"
              boxShadow="0 10px 30px rgba(239, 68, 68, 0.3)">
              <Icon as={FiCheck} color="white" boxSize={10} />
            </Box>
            <VStack spacing={3}>
              <Text fontSize="xl" fontWeight="600" color="gray.800">
                {intl.formatMessage({ id: 'auth.invitationSetup.invalid.title' })}
              </Text>
              <Text fontSize="sm" color="gray.600" textAlign="center" lineHeight="1.6">
                {intl.formatMessage({ id: 'auth.invitationSetup.invalid.body' })}
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
              _hover={{ bg: 'gray.200' }}>
              {intl.formatMessage({ id: 'auth.invitationSetup.invalid.home' })}
            </Button>
          </VStack>
        </Box>
      </Flex>
    );
  }

  // Main password setup form - Modern Trazo Design (Following Producer Standards)
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
            zIndex={10}>
            <VStack spacing={4}>
              <Text fontSize="4xl" fontWeight="800" lineHeight="1.1" letterSpacing="tight">
                {intl.formatMessage({ id: 'auth.invitationSetup.panel.title' })}
              </Text>
              <Text fontSize="lg" opacity={0.9} fontWeight="400" lineHeight="1.6">
                {intl.formatMessage({ id: 'auth.invitationSetup.panel.body' })}
              </Text>
            </VStack>

            <VStack spacing={3} pt={4}>
              {[
                intl.formatMessage({ id: 'auth.invitationSetup.panel.item.records' }),
                intl.formatMessage({ id: 'auth.invitationSetup.panel.item.osp' }),
                intl.formatMessage({ id: 'auth.invitationSetup.panel.item.team' })
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

        {/* Right side - Setup Form */}
        <Flex
          align="center"
          justify="center"
          bg={useColorModeValue('white', 'gray.900')}
          px={{ base: 4, sm: 6, md: 8 }}
          py={12}
          pt={{ base: '150px', md: '120px' }}
          overflow="hidden">
          <MotionBox
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            w="full"
            maxW={{ base: '100%', md: '420px' }}
            my={{ base: 4, lg: 8 }}>
            {/* Header */}
            <VStack spacing={6} mb={10}>
              <VStack spacing={2}>
                <Text
                  fontSize="2xl"
                  fontWeight="700"
                  color={useColorModeValue('gray.900', 'white')}
                  letterSpacing="tight"
                  textAlign="center">
                  {intl.formatMessage({ id: 'auth.invitationSetup.form.title' })}
                </Text>
                <Text
                  fontSize="md"
                  color={useColorModeValue('gray.500', 'gray.400')}
                  textAlign="center">
                  {intl.formatMessage({ id: 'auth.invitationSetup.form.subtitle' })}
                </Text>
              </VStack>
            </VStack>

            {/* Company Info Card */}
            {invitationDetails && (
              <Box
                bg={useColorModeValue('green.50', 'green.900')}
                borderRadius="xl"
                p={4}
                mb={8}
                border="1px solid"
                borderColor={useColorModeValue('green.200', 'green.700')}>
                <HStack spacing={3}>
                  <Icon
                    as={HiOfficeBuilding}
                    color={useColorModeValue('green.700', 'green.400')}
                    boxSize={5}
                  />
                  <VStack spacing={1} align="start" flex={1}>
                    <Text
                      fontSize="sm"
                      fontWeight="600"
                      color={useColorModeValue('gray.800', 'white')}>
                      {invitationDetails.company_name}
                    </Text>
                    <Badge colorScheme="green" variant="subtle" fontSize="xs">
                      {invitationDetails.role}
                    </Badge>
                  </VStack>
                </HStack>
              </Box>
            )}

            {/* Main Form */}
            <Box w="full">
              <form onSubmit={handleSubmit(onSubmit)}>
                <VStack spacing={5}>
                  {/* Name Fields */}
                  <Grid templateColumns="1fr 1fr" gap={3} w="full">
                    <Box>
                      <Text
                        fontSize="sm"
                        fontWeight="medium"
                        color={useColorModeValue('gray.700', 'gray.300')}
                        mb={2}>
                        {intl.formatMessage({ id: 'auth.signup.field.firstName.label' })}
                      </Text>
                      <StandardInput
                        type="text"
                        placeholder={intl.formatMessage({
                          id: 'auth.signup.field.firstName.placeholder'
                        })}
                        {...registerWithFocus(
                          register('first_name', {
                            required: intl.formatMessage({
                              id: 'auth.validation.firstName.required'
                            }),
                            minLength: {
                              value: 2,
                              message: intl.formatMessage({
                                id: 'auth.invitationSetup.validation.firstName.tooShort'
                              })
                            },
                            maxLength: {
                              value: 50,
                              message: intl.formatMessage({
                                id: 'auth.validation.firstName.tooLong'
                              })
                            }
                          }),
                          setFocusedField
                        )}
                        isInvalid={!!errors.first_name}
                      />
                      {errors.first_name && (
                        <Text fontSize="sm" color="red.700" mt={1}>
                          {errors.first_name.message}
                        </Text>
                      )}
                    </Box>

                    <Box>
                      <Text
                        fontSize="sm"
                        fontWeight="medium"
                        color={useColorModeValue('gray.700', 'gray.300')}
                        mb={2}>
                        {intl.formatMessage({ id: 'auth.signup.field.lastName.label' })}
                      </Text>
                      <StandardInput
                        type="text"
                        placeholder={intl.formatMessage({
                          id: 'auth.signup.field.lastName.placeholder'
                        })}
                        {...registerWithFocus(
                          register('last_name', {
                            required: intl.formatMessage({
                              id: 'auth.validation.lastName.required'
                            }),
                            minLength: {
                              value: 2,
                              message: intl.formatMessage({
                                id: 'auth.invitationSetup.validation.lastName.tooShort'
                              })
                            },
                            maxLength: {
                              value: 50,
                              message: intl.formatMessage({
                                id: 'auth.validation.lastName.tooLong'
                              })
                            }
                          }),
                          setFocusedField
                        )}
                        isInvalid={!!errors.last_name}
                      />
                      {errors.last_name && (
                        <Text fontSize="sm" color="red.700" mt={1}>
                          {errors.last_name.message}
                        </Text>
                      )}
                    </Box>
                  </Grid>

                  {/* Password field */}
                  <Box w="full">
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color={useColorModeValue('gray.700', 'gray.300')}
                      mb={2}>
                      {intl.formatMessage({ id: 'auth.signup.field.password.label' })}
                    </Text>
                    <StandardInput
                      type={showPassword ? 'text' : 'password'}
                      placeholder={intl.formatMessage({
                        id: 'auth.signup.field.password.placeholder'
                      })}
                      {...registerWithFocus(
                        register('password', {
                          required: intl.formatMessage({ id: 'auth.validation.password.required' }),
                          minLength: {
                            value: 8,
                            message: intl.formatMessage({ id: 'auth.validation.password.tooShort' })
                          }
                        }),
                        setFocusedField
                      )}
                      isInvalid={!!errors.password}
                      leftElement={
                        <Icon
                          as={FiLock}
                          color={focusedField === 'password' ? 'green.500' : 'gray.400'}
                          transition="all 0.2s"
                        />
                      }
                      rightElement={
                        <Button
                          variant="ghost"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={intl.formatMessage({
                            id: showPassword ? 'auth.password.hide' : 'auth.password.show'
                          })}
                          size="sm">
                          <Icon as={showPassword ? FiEyeOff : FiEye} />
                        </Button>
                      }
                    />

                    <PasswordStrengthIndicator
                      password={password || ''}
                      userInfo={{
                        firstName: firstName || undefined,
                        lastName: lastName || undefined
                      }}
                      validation={passwordValidation}
                    />

                    {errors.password && (
                      <Text fontSize="sm" color="red.700" mt={1}>
                        {errors.password.message}
                      </Text>
                    )}
                  </Box>

                  {/* Confirm Password field */}
                  <Box w="full">
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color={useColorModeValue('gray.700', 'gray.300')}
                      mb={2}>
                      {intl.formatMessage({ id: 'auth.signup.field.confirmPassword.label' })}
                    </Text>
                    <StandardInput
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder={intl.formatMessage({
                        id: 'auth.signup.field.confirmPassword.placeholder'
                      })}
                      {...registerWithFocus(
                        register('password_confirm', {
                          required: intl.formatMessage({
                            id: 'auth.validation.confirmPassword.required'
                          })
                        }),
                        setFocusedField
                      )}
                      isInvalid={!!errors.password_confirm}
                      leftElement={
                        <Icon
                          as={FiLock}
                          color={focusedField === 'password_confirm' ? 'green.500' : 'gray.400'}
                          transition="all 0.2s"
                        />
                      }
                      rightElement={
                        <Button
                          variant="ghost"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          aria-label={intl.formatMessage({
                            id: showConfirmPassword ? 'auth.password.hide' : 'auth.password.show'
                          })}
                          size="sm">
                          <Icon as={showConfirmPassword ? FiEyeOff : FiEye} />
                        </Button>
                      }
                    />

                    {/* Password Match Indicator */}
                    {passwordConfirm && (
                      <Text
                        fontSize="xs"
                        color={password === passwordConfirm ? 'green.700' : 'red.700'}
                        mt={1}>
                        {password === passwordConfirm
                          ? `✓ ${intl.formatMessage({ id: 'auth.invitationSetup.match.yes' })}`
                          : `✗ ${intl.formatMessage({ id: 'auth.invitationSetup.match.no' })}`}
                      </Text>
                    )}

                    {errors.password_confirm && !passwordConfirm && (
                      <Text fontSize="sm" color="red.700" mt={1}>
                        {errors.password_confirm.message}
                      </Text>
                    )}
                  </Box>

                  {/* Terms checkbox */}
                  <Box w="full">
                    <Checkbox
                      size="md"
                      colorScheme="green"
                      spacing={3}
                      {...register('acceptTerms', {
                        required: intl.formatMessage({ id: 'auth.validation.terms.required' })
                      })}>
                      <Text fontSize="sm" color={useColorModeValue('gray.700', 'gray.300')}>
                        {intl.formatMessage({ id: 'auth.signup.terms.agreeShort' })}
                      </Text>
                    </Checkbox>
                    {/* The links live OUTSIDE the checkbox label, as on AppSignUp (recordkeeping
                        review F-20): a click on a link inside a <label> follows the link and
                        never toggles the box. */}
                    <Text
                      fontSize="xs"
                      color={useColorModeValue('gray.600', 'gray.400')}
                      mt={1}
                      ml={8}
                      data-testid="setup-terms-links">
                      {intl.formatMessage(
                        { id: 'auth.signup.terms.readLinks' },
                        {
                          tos: (
                            <a
                              key="tos"
                              href="https://trazo.io/terms-of-service"
                              target="_blank"
                              rel="noopener noreferrer">
                              <Text
                                as="span"
                                color="green.700"
                                fontWeight="medium"
                                _hover={{ textDecoration: 'underline' }}>
                                {intl.formatMessage({ id: 'auth.signup.terms.tos' })}
                              </Text>
                            </a>
                          ),
                          privacy: (
                            <a
                              key="privacy"
                              href="https://trazo.io/privacy-policy"
                              target="_blank"
                              rel="noopener noreferrer">
                              <Text
                                as="span"
                                color="green.700"
                                fontWeight="medium"
                                _hover={{ textDecoration: 'underline' }}>
                                {intl.formatMessage({ id: 'auth.signup.terms.privacy' })}
                              </Text>
                            </a>
                          )
                        }
                      )}
                    </Text>
                    {errors.acceptTerms && (
                      <Text fontSize="sm" color="red.700" mt={1}>
                        {errors.acceptTerms.message}
                      </Text>
                    )}
                  </Box>

                  {/* Submit button */}
                  <Button
                    type="submit"
                    w="full"
                    h="52px"
                    bg="green.700"
                    color="white"
                    fontSize="md"
                    fontWeight="600"
                    borderRadius="xl"
                    isLoading={isSubmitting || isCreatingAccount}
                    loadingText={intl.formatMessage({ id: 'auth.invitationSetup.submitting' })}
                    _hover={{
                      bg: 'green.600',
                      transform: 'translateY(-1px)'
                    }}
                    _active={{
                      transform: 'translateY(0)'
                    }}
                    transition="all 0.2s">
                    {intl.formatMessage({ id: 'auth.invitationSetup.submit' })}
                  </Button>
                </VStack>
              </form>

              {/* Social login section */}
              <VStack spacing={4} mt={8}>
                <HStack w="full" spacing={4}>
                  <Divider borderColor={useColorModeValue('gray.200', 'gray.600')} />
                  <Text
                    fontSize="sm"
                    color={useColorModeValue('gray.400', 'gray.400')}
                    flexShrink={0}
                    fontWeight="500">
                    {intl.formatMessage({ id: 'auth.signup.orSignUpWith' })}
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
                      isDisabled={
                        isSubmitting || isCreatingAccount || isSocialLoading || !acceptTerms
                      }
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
                {!acceptTerms && (
                  <Text
                    fontSize="xs"
                    color="gray.500"
                    _dark={{ color: 'gray.400' }}
                    textAlign="center">
                    {intl.formatMessage({
                      id: 'auth.signup.social.termsFirst',
                      defaultMessage:
                        'Tick the Terms box above to continue with Google or Facebook.'
                    })}
                  </Text>
                )}
              </VStack>
            </Box>
          </MotionBox>
        </Flex>
      </Grid>

      <AuthFooter />
    </Box>
  );
};

export default SetupPassword;
