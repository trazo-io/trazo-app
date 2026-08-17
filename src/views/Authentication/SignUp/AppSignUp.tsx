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
  Button,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  useColorModeValue,
  Checkbox,
  Stack,
  Grid
} from '@chakra-ui/react';
import {
  FaGoogle,
  FaFacebook,
  FaEnvelope,
  FaLock,
  FaBuilding,
  FaUser,
  FaEye,
  FaEyeSlash,
  FaArrowLeft,
  FaCheckCircle,
  FaRedo
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import AuthFooter from 'components/Footer/AuthFooter';
import { passwordValidator } from '../../../utils/passwordValidation';
import { PERSON_NAME_PATTERN, PERSON_NAME_MAX_LENGTH } from '../../../utils/nameValidation';
import { PasswordStrengthIndicator } from '../../../components/Forms/PasswordStrengthIndicator';
import {
  useSignUpMutation,
  useResendVerificationEmailMutation,
  useSocialAuthMutation
} from '../../../store/api/authApi';
import { login as loginAction } from '../../../store/features/authSlice';
import {
  handleGoogleSignIn,
  handleFacebookSignIn,
  handleSocialAuthError,
  checkSocialAuthConfig
} from '../../../utils/socialAuth';

// No assets needed for minimalist design

// Motion components
const MotionBox = motion(Box);

interface SignUpFormData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password2: string;
  acceptTerms: boolean;
  company_code?: string;
}

const AppSignUp: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const intl = useIntl();
  const toast = useToast();
  const [signUp, { isLoading }] = useSignUpMutation();
  const [socialAuth, { isLoading: isSocialLoading }] = useSocialAuthMutation();
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [joinExistingCompany, setJoinExistingCompany] = useState(false);
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  // 🚀 2025 UX Enhancement: In-panel verification state
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [isCompanyJoin, setIsCompanyJoin] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [resendEmail, { isLoading: isResending }] = useResendVerificationEmailMutation();

  const {
    register: registerField,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<SignUpFormData>();

  const password = watch('password');
  const password2 = watch('password2');
  const companyCode = watch('company_code');
  const firstName = watch('first_name');
  const lastName = watch('last_name');
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

  // 🚀 2025 UX Enhancement: Verification panel functions
  const handleBackToSignup = () => {
    setShowVerification(false);
    setVerificationEmail('');
    setIsCompanyJoin(false);
    setResendCooldown(0);
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;

    try {
      await resendEmail({ email: verificationEmail }).unwrap();
      setResendCooldown(60); // 60 second cooldown

      toast({
        title: 'Email sent!',
        description: "We've sent another verification email to your inbox.",
        status: 'success',
        duration: 4000,
        isClosable: true
      });
    } catch (error: any) {
      toast({
        title: 'Failed to resend email',
        description: error?.data?.message || 'Please try again later.',
        status: 'error',
        duration: 4000,
        isClosable: true
      });
    }
  };

  // Countdown timer for resend button
  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

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

      const signUpData = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        password: data.password,
        user_type: 'PRODUCER'
      };

      // Add company code if joining existing company
      if (joinExistingCompany && data.company_code) {
        signUpData.company_code = data.company_code;
      }

      const result = await signUp(signUpData).unwrap();
      console.log('🔒 SIGNUP SUCCESS: User created successfully', {
        email: data.email,
        hasCompanyCode: !!data.company_code
      });

      // 🚀 2025 Best Practice: Seamless in-panel email verification transition
      if (joinExistingCompany && data.company_code) {
        console.log('🔒 COMPANY SIGNUP: Processing company code signup flow');

        // Company code users still need email verification first (security-first approach)
        toast({
          title: 'Account created successfully!',
          description:
            "Check your email to verify your account. Once verified, you'll automatically join the company team.",
          status: 'success',
          duration: 4000,
          isClosable: true
        });

        console.log('🔒 TRANSITION: Moving to verification panel');

        // Transition to verification panel with company context
        setVerificationEmail(data.email);
        setIsCompanyJoin(true);
        setShowVerification(true);
      } else {
        // Regular users need email verification first
        console.log('🔒 REGULAR SIGNUP: Processing regular signup flow');

        toast({
          title: 'Account created successfully!',
          description: 'Welcome to Trazo. Please check your email to verify your account.',
          status: 'success',
          duration: 4000,
          isClosable: true
        });

        console.log('🔒 TRANSITION: Moving to verification panel (regular)');

        // Transition to verification panel
        setVerificationEmail(data.email);
        setIsCompanyJoin(false);
        setShowVerification(true);

        // Clear form after navigation for security
        setTimeout(() => reset(), 100);
      }
    } catch (err: any) {
      console.error('Signup error:', err);

      // Handle different types of errors with specific messaging
      let errorMessage = 'Registration failed. Please try again.';

      if (err?.data?.company_code) {
        // Company code specific errors
        const codeError = Array.isArray(err.data.company_code)
          ? err.data.company_code[0]
          : err.data.company_code;
        errorMessage = codeError;
      } else if (err?.data?.email) {
        // Email specific errors
        const emailError = Array.isArray(err.data.email) ? err.data.email[0] : err.data.email;
        errorMessage = emailError;
      } else if (err?.data?.detail) {
        // General error detail
        errorMessage = err.data.detail;
      } else if (err?.data?.non_field_errors) {
        // Non-field errors
        const nonFieldError = Array.isArray(err.data.non_field_errors)
          ? err.data.non_field_errors[0]
          : err.data.non_field_errors;
        errorMessage = nonFieldError;
      } else if (err?.status === 429) {
        // Rate limiting
        errorMessage = 'Too many attempts. Please wait a moment before trying again.';
      } else if (err?.status >= 500) {
        // Server errors
        errorMessage = 'Server error. Please try again in a few moments.';
      }

      setError(errorMessage);
    }
  };

  const handleSocialLoginSuccess = async (authData: any) => {
    try {
      setError(null);

      // Check for pending invitation in sessionStorage
      const pendingInvitation = sessionStorage.getItem('pendingInvitation');
      const authPayload = pendingInvitation
        ? { ...authData, invitation_code: pendingInvitation }
        : authData;

      const response = await socialAuth(authPayload).unwrap();

      // Clear pending invitation on successful auth
      if (pendingInvitation) {
        sessionStorage.removeItem('pendingInvitation');
      }

      dispatch(loginAction(response));

      // If invitation was accepted, redirect to the specified URL
      if (response.invitation_accepted && response.redirect_to) {
        navigate(response.redirect_to, { replace: true });
        return;
      }

      toast({
        title: response.is_new_user ? 'Welcome to Trazo!' : 'Welcome back!',
        description: response.is_new_user
          ? 'Your account has been created successfully.'
          : 'You have successfully signed in.',
        status: 'success',
        duration: 3000,
        isClosable: true
      });

      // Don't redirect immediately - let Authenticated.jsx handle establishment redirect
      // This prevents race condition where company data isn't loaded yet
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
          4 // Producer user type
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
          4 // Producer user type
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

  /*
   * #FBFCFA is the LANDING's `--background` token (trazo-landing/app/globals.css). Shared ground
   * across the marketing site and the app. Same treatment as AppSignIn.
   */
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'whiteAlpha.200');

  /*
   * 2026 auth layout: a quiet centered card. Same rebuild as AppSignIn, and this page needed it
   * MORE — MEASURED at 51.9% green coverage against the landing's 4.3% (sign-in was 40.6%).
   *
   * One deliberate difference from sign-in: a signup visitor has NOT chosen yet, so a single
   * trust line under the form is earned here where it was not on the login page. It is one line,
   * not a 50% billboard — the pattern Linear/Vercel/Notion use. The three benefit bullets and the
   * headline moved off; their i18n keys stay in both locale files for the landing/marketing copy.
   */
  return (
    <Box flex="1" display="flex" flexDirection="column">
      <Flex
        flex="1"
        align="center"
        justify="center"
        px={{ base: 4, sm: 6 }}
        /* The navbar is in FLOW now (see layouts/Auth.tsx), so it occupies its own space —
           this used to reserve room under a fixed logo and would now double-count. */
        pt={{ base: 6, md: 10 }}
        pb={{ base: 10, md: 16 }}>
        <MotionBox
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          w="full"
          /* Wider than sign-in's 440: this form has a two-column name row and the
             create/join segmented control. */
          maxW="520px"
          bg={cardBg}
          borderWidth="1px"
          borderColor={cardBorder}
          borderRadius="2xl"
          boxShadow="0 1px 2px rgba(16, 24, 40, 0.04), 0 12px 32px -12px rgba(16, 24, 40, 0.12)"
          px={{ base: 6, sm: 8 }}
          py={{ base: 8, sm: 10 }}>
          {/* 🚀 2025 UX Enhancement: Conditional rendering between signup form and verification */}
          {!showVerification ? (
            <>
              {/* Header with smooth text transitions */}
              <VStack spacing={4} mb={6}>
                <VStack spacing={1}>
                  <MotionBox
                    key={joinExistingCompany ? 'join' : 'create'} // Forces re-render for animation
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}>
                    <Text
                      fontSize="xl"
                      fontWeight="600"
                      color={useColorModeValue('gray.900', 'white')}>
                      {intl.formatMessage({
                        id: joinExistingCompany
                          ? 'auth.signup.title.join'
                          : 'auth.signup.title.create'
                      })}
                    </Text>
                  </MotionBox>
                  <MotionBox
                    key={joinExistingCompany ? 'join-sub' : 'create-sub'} // Forces re-render for animation
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}>
                    <Text
                      fontSize="sm"
                      color={useColorModeValue('gray.500', 'gray.400')}
                      textAlign="center">
                      {intl.formatMessage({
                        id: joinExistingCompany
                          ? 'auth.signup.subtitle.join'
                          : 'auth.signup.subtitle.create'
                      })}
                    </Text>
                  </MotionBox>
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
                    {/* Company Join Toggle with smooth animation */}
                    <MotionBox
                      w="full"
                      initial={false}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2 }}>
                      {/*
                        Stacks below `smd` (480px). MEASURED at 375: side by side, these labels
                        need 127px and 131px inside a 119px button — "Create New Company"
                        rendered as "reate New Compan". Shrinking the padding buys 8px, which is
                        not enough for either, and truncating the two things a new user is
                        choosing between is the worst option. Two full-width 44px rows read fine
                        on a phone.
                      */}
                      <Stack
                        direction={{ base: 'column', smd: 'row' }}
                        spacing={{ base: 1, sm: 4 }}
                        justify="center"
                        bg={useColorModeValue('gray.50', 'gray.800')}
                        borderRadius="xl"
                        p={1}
                        w="full">
                        <Button
                          size="sm"
                          flex={1}
                          variant={!joinExistingCompany ? 'solid' : 'ghost'}
                          bg={!joinExistingCompany ? 'green.700' : 'transparent'}
                          color={
                            !joinExistingCompany
                              ? 'white'
                              : useColorModeValue('gray.600', 'gray.400')
                          }
                          _hover={{
                            bg: !joinExistingCompany
                              ? 'green.800'
                              : useColorModeValue('gray.100', 'gray.700'),
                            transform: 'translateY(-1px)'
                          }}
                          _active={{
                            transform: 'translateY(0)'
                          }}
                          borderRadius="lg"
                          fontSize={{ base: 'xs', sm: 'sm' }}
                          fontWeight="600"
                          px={{ base: 3, sm: 6 }}
                          py={2}
                          minH="44px"
                          onClick={() => setJoinExistingCompany(false)}
                          transition="all 0.2s"
                          boxShadow={
                            !joinExistingCompany ? '0 2px 8px rgba(46, 125, 50, 0.2)' : 'none'
                          }>
                          {intl.formatMessage({
                            id: 'auth.signup.mode.createCompany',
                            defaultMessage: 'Create New Company'
                          })}
                        </Button>
                        <Button
                          size="sm"
                          flex={1}
                          variant={joinExistingCompany ? 'solid' : 'ghost'}
                          bg={joinExistingCompany ? 'green.700' : 'transparent'}
                          color={
                            joinExistingCompany
                              ? 'white'
                              : useColorModeValue('gray.600', 'gray.400')
                          }
                          _hover={{
                            bg: joinExistingCompany
                              ? 'green.800'
                              : useColorModeValue('gray.100', 'gray.700'),
                            transform: 'translateY(-1px)'
                          }}
                          _active={{
                            transform: 'translateY(0)'
                          }}
                          borderRadius="lg"
                          fontSize={{ base: 'xs', sm: 'sm' }}
                          fontWeight="600"
                          px={{ base: 3, sm: 6 }}
                          py={2}
                          minH="44px"
                          onClick={() => setJoinExistingCompany(true)}
                          transition="all 0.2s"
                          boxShadow={
                            joinExistingCompany ? '0 2px 8px rgba(46, 125, 50, 0.2)' : 'none'
                          }>
                          {intl.formatMessage({
                            id: 'auth.signup.mode.joinCompany',
                            defaultMessage: 'Join Existing Company'
                          })}
                        </Button>
                      </Stack>
                    </MotionBox>

                    {/* Company Code Input (animated appearance when joining existing company) */}
                    {joinExistingCompany && (
                      <MotionBox
                        w="full"
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}>
                        <Box w="full">
                          <Text
                            fontSize="sm"
                            fontWeight="500"
                            color={useColorModeValue('gray.700', 'gray.300')}
                            mb={1}>
                            Company Invitation Code
                          </Text>
                          <Box
                            as="input"
                            type="text"
                            placeholder={intl.formatMessage({
                              id: 'auth.signup.field.companyCode.placeholder',
                              defaultMessage: 'Enter 6-character company code'
                            })}
                            w="full"
                            h="44px"
                            fontSize="sm"
                            bg={useColorModeValue('gray.50', 'gray.900')}
                            border="1px solid"
                            borderColor={
                              errors.company_code
                                ? 'red.300'
                                : focusedField === 'company_code'
                                ? 'green.600'
                                : useColorModeValue('gray.200', 'gray.600')
                            }
                            borderRadius="xl"
                            px={4}
                            textTransform="uppercase"
                            letterSpacing="wide"
                            textAlign="center"
                            fontWeight="600"
                            _hover={{
                              borderColor: errors.company_code
                                ? 'red.300'
                                : useColorModeValue('gray.300', 'gray.500')
                            }}
                            _focus={{
                              outline: 'none',
                              borderColor: 'green.600',
                              bg: useColorModeValue('white', 'gray.800'),
                              boxShadow: '0 0 0 4px rgba(46, 125, 50, 0.15)'
                            }}
                            transition="all 0.2s"
                            {...registerField('company_code', {
                              required: joinExistingCompany ? 'Company code is required' : false,
                              minLength: joinExistingCompany
                                ? {
                                    value: 6,
                                    message: intl.formatMessage({
                                      id: 'auth.validation.companyCode.tooShort',
                                      defaultMessage: 'Company code must be at least 6 characters'
                                    })
                                  }
                                : undefined,
                              maxLength: {
                                value: 8,
                                message: intl.formatMessage({
                                  id: 'auth.validation.companyCode.tooLong',
                                  defaultMessage: 'Company code must be 8 characters or less'
                                })
                              },
                              pattern: joinExistingCompany
                                ? {
                                    value: /^[A-Z0-9]{6,8}$/,
                                    message: intl.formatMessage({
                                      id: 'auth.validation.companyCode.pattern',
                                      defaultMessage:
                                        'Company code must be 6-8 letters and numbers only'
                                    })
                                  }
                                : undefined,
                              validate: joinExistingCompany
                                ? (value) => {
                                    if (!value) return true;
                                    // Check if contains only alphanumeric characters
                                    if (!/^[A-Z0-9]+$/i.test(value)) {
                                      return 'Company code can only contain letters and numbers';
                                    }
                                    return true;
                                  }
                                : undefined
                            })}
                            onFocus={() => setFocusedField('company_code')}
                            onBlur={() => setFocusedField(null)}
                            onChange={(e) => {
                              // Transform to uppercase and filter out invalid characters
                              const cleanValue = e.target.value
                                .toUpperCase()
                                .replace(/[^A-Z0-9]/g, '');
                              // Update both the input value and the form state
                              e.target.value = cleanValue;
                              setValue('company_code', cleanValue, { shouldValidate: true });
                            }}
                          />
                          {/* Company Code Validation Feedback */}
                          {isValidatingCode && joinExistingCompany && (
                            <Text
                              fontSize="xs"
                              color="blue.500"
                              mt={1}
                              display="flex"
                              alignItems="center"
                              gap={1}>
                              <Box as="span" className="animate-spin" display="inline-block">
                                ⟳
                              </Box>
                              Validating company code...
                            </Text>
                          )}
                          {companyCode &&
                            !errors.company_code &&
                            !isValidatingCode &&
                            joinExistingCompany && (
                              <Text
                                fontSize="xs"
                                color="green.700"
                                mt={1}
                                display="flex"
                                alignItems="center"
                                gap={1}>
                                ✓ Code format is valid
                              </Text>
                            )}
                          {errors.company_code && (
                            <Text fontSize="sm" color="red.500" mt={1}>
                              {errors.company_code.message}
                            </Text>
                          )}
                          <Text
                            fontSize="xs"
                            color={useColorModeValue('gray.500', 'gray.400')}
                            mt={1}>
                            Get this code from your company admin or team leader
                          </Text>
                        </Box>
                      </MotionBox>
                    )}

                    {/* Name fields */}
                    <Grid
                      templateColumns="1fr 1fr"
                      gap={3}
                      w="full"
                      sx={{ '& > *': { minWidth: 0 } }}>
                      <Box>
                        <Text
                          fontSize="sm"
                          fontWeight="500"
                          color={useColorModeValue('gray.700', 'gray.300')}
                          mb={1}>
                          {intl.formatMessage({
                            id: 'auth.signup.field.firstName.label',
                            defaultMessage: 'First Name'
                          })}
                        </Text>
                        <Box
                          as="input"
                          type="text"
                          placeholder={intl.formatMessage({
                            id: 'auth.signup.field.firstName.placeholder',
                            defaultMessage: 'First name'
                          })}
                          w="full"
                          h="44px"
                          fontSize="sm"
                          bg={useColorModeValue('gray.50', 'gray.900')}
                          border="1px solid"
                          borderColor={
                            errors.first_name
                              ? 'red.300'
                              : focusedField === 'first_name'
                              ? 'green.600'
                              : useColorModeValue('gray.200', 'gray.600')
                          }
                          borderRadius="xl"
                          px={4}
                          _hover={{
                            borderColor: errors.first_name
                              ? 'red.300'
                              : useColorModeValue('gray.300', 'gray.500')
                          }}
                          _focus={{
                            outline: 'none',
                            borderColor: 'green.600',
                            bg: useColorModeValue('white', 'gray.800'),
                            boxShadow: '0 0 0 4px rgba(46, 125, 50, 0.15)'
                          }}
                          transition="all 0.2s"
                          {...registerField('first_name', {
                            required: intl.formatMessage({
                              id: 'auth.validation.firstName.required',
                              defaultMessage: 'First name is required'
                            }),
                            minLength: {
                              value: 1,
                              message: intl.formatMessage({
                                id: 'auth.validation.firstName.required',
                                defaultMessage: 'First name is required'
                              })
                            },
                            maxLength: {
                              value: PERSON_NAME_MAX_LENGTH,
                              message: intl.formatMessage({
                                id: 'auth.validation.firstName.tooLong',
                                defaultMessage: 'First name is too long'
                              })
                            },
                            pattern: {
                              value: PERSON_NAME_PATTERN,
                              message: intl.formatMessage({
                                id: 'auth.validation.firstName.pattern',
                                defaultMessage: "First name can't contain numbers or symbols"
                              })
                            }
                          })}
                          onFocus={() => setFocusedField('first_name')}
                          onBlur={() => setFocusedField(null)}
                        />
                        {errors.first_name && (
                          <Text fontSize="sm" color="red.500" mt={1}>
                            {errors.first_name.message}
                          </Text>
                        )}
                      </Box>

                      <Box>
                        <Text
                          fontSize="sm"
                          fontWeight="500"
                          color={useColorModeValue('gray.700', 'gray.300')}
                          mb={1}>
                          {intl.formatMessage({
                            id: 'auth.signup.field.lastName.label',
                            defaultMessage: 'Last Name'
                          })}
                        </Text>
                        <Box
                          as="input"
                          type="text"
                          placeholder={intl.formatMessage({
                            id: 'auth.signup.field.lastName.placeholder',
                            defaultMessage: 'Last name'
                          })}
                          w="full"
                          h="44px"
                          fontSize="sm"
                          bg={useColorModeValue('gray.50', 'gray.900')}
                          border="1px solid"
                          borderColor={
                            errors.last_name
                              ? 'red.300'
                              : focusedField === 'last_name'
                              ? 'green.600'
                              : useColorModeValue('gray.200', 'gray.600')
                          }
                          borderRadius="xl"
                          px={4}
                          _hover={{
                            borderColor: errors.last_name
                              ? 'red.300'
                              : useColorModeValue('gray.300', 'gray.500')
                          }}
                          _focus={{
                            outline: 'none',
                            borderColor: 'green.600',
                            bg: useColorModeValue('white', 'gray.800'),
                            boxShadow: '0 0 0 4px rgba(46, 125, 50, 0.15)'
                          }}
                          transition="all 0.2s"
                          {...registerField('last_name', {
                            required: intl.formatMessage({
                              id: 'auth.validation.lastName.required',
                              defaultMessage: 'Last name is required'
                            }),
                            minLength: {
                              value: 1,
                              message: intl.formatMessage({
                                id: 'auth.validation.lastName.required',
                                defaultMessage: 'Last name is required'
                              })
                            },
                            maxLength: {
                              value: PERSON_NAME_MAX_LENGTH,
                              message: intl.formatMessage({
                                id: 'auth.validation.lastName.tooLong',
                                defaultMessage: 'Last name is too long'
                              })
                            },
                            pattern: {
                              value: PERSON_NAME_PATTERN,
                              message: intl.formatMessage({
                                id: 'auth.validation.lastName.pattern',
                                defaultMessage: "Last name can't contain numbers or symbols"
                              })
                            }
                          })}
                          onFocus={() => setFocusedField('last_name')}
                          onBlur={() => setFocusedField(null)}
                        />
                        {errors.last_name && (
                          <Text fontSize="sm" color="red.500" mt={1}>
                            {errors.last_name.message}
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
                        {intl.formatMessage({
                          id: 'auth.signup.field.email.label',
                          defaultMessage: 'Business Email'
                        })}
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
                          placeholder={intl.formatMessage({
                            id: 'auth.signup.field.email.placeholder',
                            defaultMessage: 'Enter business email address'
                          })}
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
                              ? 'green.600'
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
                            borderColor: 'green.600',
                            bg: useColorModeValue('white', 'gray.800'),
                            boxShadow: '0 0 0 4px rgba(46, 125, 50, 0.15)'
                          }}
                          transition="all 0.2s"
                          {...registerField('email', {
                            required: intl.formatMessage({
                              id: 'auth.validation.email.required',
                              defaultMessage: 'Email is required'
                            }),
                            pattern: {
                              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                              message: intl.formatMessage({
                                id: 'auth.validation.email.invalid',
                                defaultMessage: 'Enter a valid email address'
                              })
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
                        {intl.formatMessage({
                          id: 'auth.signup.field.password.label',
                          defaultMessage: 'Password'
                        })}
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
                          type={showPassword ? 'text' : 'password'}
                          placeholder={intl.formatMessage({
                            id: 'auth.signup.field.password.placeholder',
                            defaultMessage: 'Create secure password (8+ characters)'
                          })}
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
                              ? 'green.600'
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
                            borderColor: 'green.600',
                            bg: useColorModeValue('white', 'gray.800'),
                            boxShadow: '0 0 0 4px rgba(46, 125, 50, 0.15)'
                          }}
                          transition="all 0.2s"
                          {...registerField('password', {
                            required: intl.formatMessage({
                              id: 'auth.validation.password.required',
                              defaultMessage: 'Password is required'
                            }),
                            minLength: {
                              value: 8,
                              message: intl.formatMessage({
                                id: 'auth.validation.password.tooShort',
                                defaultMessage: 'Password must be at least 8 characters'
                              })
                            },
                            maxLength: {
                              value: 32,
                              message: intl.formatMessage({
                                id: 'auth.validation.password.tooLong',
                                defaultMessage: 'Password must be under 32 characters'
                              })
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
                            minW="44px"
                            h="44px"
                            aria-label={intl.formatMessage(
                              showPassword
                                ? {
                                    id: 'auth.signup.field.password.hide',
                                    defaultMessage: 'Hide password'
                                  }
                                : {
                                    id: 'auth.signup.field.password.show',
                                    defaultMessage: 'Show password'
                                  }
                            )}
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
                        {intl.formatMessage({
                          id: 'auth.signup.field.confirmPassword.label',
                          defaultMessage: 'Confirm Password'
                        })}
                      </Text>
                      <InputGroup size="lg">
                        <InputLeftElement pointerEvents="none">
                          <Icon
                            as={FaLock}
                            color={focusedField === 'password2' ? 'green.500' : 'gray.400'}
                            transition="all 0.2s"
                          />
                        </InputLeftElement>
                        <Box
                          as="input"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder={intl.formatMessage({
                            id: 'auth.signup.field.confirmPassword.placeholder',
                            defaultMessage: 'Confirm your password'
                          })}
                          pl="3rem"
                          pr="3rem"
                          w="full"
                          h="44px"
                          fontSize="sm"
                          bg={useColorModeValue('gray.50', 'gray.900')}
                          border="1px solid"
                          borderColor={
                            errors.password2
                              ? 'red.300'
                              : password2 && password !== password2
                              ? 'red.300'
                              : focusedField === 'password2'
                              ? 'green.600'
                              : useColorModeValue('gray.200', 'gray.600')
                          }
                          borderRadius="xl"
                          _hover={{
                            borderColor: errors.password2
                              ? 'red.300'
                              : useColorModeValue('gray.300', 'gray.500')
                          }}
                          _focus={{
                            outline: 'none',
                            borderColor: 'green.600',
                            bg: useColorModeValue('white', 'gray.800'),
                            boxShadow: '0 0 0 4px rgba(46, 125, 50, 0.15)'
                          }}
                          transition="all 0.2s"
                          {...registerField('password2', {
                            required: intl.formatMessage({
                              id: 'auth.validation.confirmPassword.required',
                              defaultMessage: 'Please confirm your password'
                            }),
                            validate: (value: string) =>
                              value === password || 'Passwords do not match'
                          })}
                          onFocus={() => setFocusedField('password2')}
                          onBlur={() => setFocusedField(null)}
                        />
                        <InputRightElement>
                          <Button
                            variant="ghost"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            size="sm"
                            minW="44px"
                            h="44px"
                            aria-label={intl.formatMessage(
                              showConfirmPassword
                                ? {
                                    id: 'auth.signup.field.confirmPassword.hide',
                                    defaultMessage: 'Hide password'
                                  }
                                : {
                                    id: 'auth.signup.field.confirmPassword.show',
                                    defaultMessage: 'Show password'
                                  }
                            )}
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
                      {password2 && (
                        <Text
                          fontSize="xs"
                          color={password === password2 ? 'green.700' : 'red.700'}
                          mt={1}>
                          {password === password2
                            ? '✓ Passwords match'
                            : '✗ Passwords do not match'}
                        </Text>
                      )}

                      {errors.password2 && !password2 && (
                        <Text fontSize="sm" color="red.500" mt={1}>
                          {errors.password2.message}
                        </Text>
                      )}
                    </Box>

                    {/* Terms checkbox */}
                    <Box w="full">
                      <Checkbox
                        size="md"
                        colorScheme="green"
                        spacing={3}
                        {...registerField('acceptTerms', {
                          required: intl.formatMessage({
                            id: 'auth.validation.terms.required',
                            defaultMessage: 'You must accept the terms and conditions'
                          })
                        })}>
                        <Text fontSize="sm" color={useColorModeValue('gray.700', 'gray.300')}>
                          {intl.formatMessage(
                            {
                              id: 'auth.signup.terms.agree',
                              defaultMessage: 'I agree to the {tos} and {privacy}'
                            },
                            {
                              tos: (
                                <a
                                  href="https://trazo.io/terms-conditions"
                                  target="_blank"
                                  rel="noopener noreferrer">
                                  <Text
                                    as="span"
                                    color="green.700"
                                    fontWeight="medium"
                                    _hover={{ textDecoration: 'underline' }}>
                                    {intl.formatMessage({
                                      id: 'auth.signup.terms.tos',
                                      defaultMessage: 'Terms of Service'
                                    })}
                                  </Text>
                                </a>
                              ),
                              privacy: (
                                <a
                                  href="https://trazo.io/privacy-policy"
                                  target="_blank"
                                  rel="noopener noreferrer">
                                  <Text
                                    as="span"
                                    color="green.700"
                                    fontWeight="medium"
                                    _hover={{ textDecoration: 'underline' }}>
                                    {intl.formatMessage({
                                      id: 'auth.signup.terms.privacy',
                                      defaultMessage: 'Privacy Policy'
                                    })}
                                  </Text>
                                </a>
                              )
                            }
                          )}
                        </Text>
                      </Checkbox>
                      {errors.acceptTerms && (
                        <Text fontSize="sm" color="red.500" mt={1}>
                          {errors.acceptTerms.message}
                        </Text>
                      )}
                    </Box>

                    {/* Sign up button with enhanced loading states */}
                    <Button
                      type="submit"
                      w="full"
                      h="44px"
                      bg="green.700"
                      color="white"
                      fontSize="sm"
                      fontWeight="600"
                      borderRadius="xl"
                      isLoading={isLoading || isSocialLoading}
                      loadingText={isSocialLoading ? 'Authenticating...' : 'Creating account...'}
                      isDisabled={isValidatingCode || isSocialLoading}
                      _hover={{
                        bg: isLoading ? 'green.700' : 'green.800',
                        transform: isLoading ? 'none' : 'translateY(-1px)'
                      }}
                      _active={{
                        transform: isLoading ? 'none' : 'translateY(0)'
                      }}
                      _disabled={{
                        bg: 'gray.300',
                        color: 'gray.500',
                        cursor: 'not-allowed',
                        _hover: {
                          bg: 'gray.300',
                          transform: 'none'
                        }
                      }}
                      transition="all 0.2s">
                      {isValidatingCode
                        ? intl.formatMessage({
                            id: 'auth.signup.cta.validating',
                            defaultMessage: 'Validating...'
                          })
                        : joinExistingCompany
                        ? intl.formatMessage({
                            id: 'auth.signup.cta.joinCompany',
                            defaultMessage: 'Join Company'
                          })
                        : intl.formatMessage({
                            id: 'auth.signup.cta.createAccount',
                            defaultMessage: 'Create Business Account'
                          })}
                    </Button>
                  </VStack>
                </form>

                {/* Social signup section */}
                <VStack spacing={3} mt={6}>
                  <HStack w="full" spacing={4}>
                    <Divider borderColor={useColorModeValue('gray.300', 'gray.600')} />
                    <Text
                      fontSize="sm"
                      color={useColorModeValue('gray.500', 'gray.400')}
                      flexShrink={0}
                      fontWeight="medium">
                      Or sign up with
                    </Text>
                    <Divider borderColor={useColorModeValue('gray.300', 'gray.600')} />
                  </HStack>

                  <HStack spacing={2} w="full">
                    {[
                      { icon: FaGoogle, color: '#EA4335', name: 'Google' },
                      { icon: FaFacebook, color: '#1877F2', name: 'Facebook' }
                    ].map((social) => (
                      <Button
                        key={social.name}
                        flex={1}
                        // 44px minimum touch target; icon-only buttons also need an
                        // accessible name or they announce as just "button".
                        h="44px"
                        aria-label={intl.formatMessage(
                          {
                            id: 'auth.signup.social.continueWith',
                            defaultMessage: 'Continue with {provider}'
                          },
                          { provider: social.name }
                        )}
                        bg={useColorModeValue('white', 'gray.700')}
                        border="1px solid"
                        borderColor={useColorModeValue('gray.300', 'gray.600')}
                        borderRadius="lg"
                        onClick={() => handleSocialLogin(social.name)}
                        isDisabled={isLoading || isSocialLoading}
                        _hover={{
                          bg: useColorModeValue('gray.50', 'gray.600'),
                          borderColor: useColorModeValue('gray.400', 'gray.500')
                        }}
                        transition="all 0.2s">
                        <Icon as={social.icon} fontSize="18px" color={social.color} />
                      </Button>
                    ))}
                  </HStack>
                </VStack>
              </Box>

              {/*
                  The one trust line a SIGNUP page earns that a login page does not — the
                  visitor has not chosen yet. One line, not a 50% billboard.

                  It replaces "Built for specialty crop farms. 14-day free trial." Starter has
                  been FREE FOREVER since 2026-08-13 (no trial, no clock, no cancellation —
                  bounded by limits, never by time). That change swept plan data, both creation
                  paths, expiry, the trial emails and the pricing copy; THIS page was a sixth
                  surface it missed, and it is the first screen a new grower sees. It also
                  directly contradicted the COG Pro migration promise, whose whole anti-lock-in
                  answer is "Starter is free permanently, not a trial" — aimed at refugees from
                  a product that dies 2026-12-31. Wording matches the landing hero.

                  ⚠️ 2026-08-15: this line used to end "Export everything, anytime". That became
                  FALSE the moment the certifier documents moved behind Compliance
                  (`subscriptions/gating.py`) — and it was the first screen a new grower sees, so
                  it promised on signup exactly what the farm profile would later refuse. Replaced
                  with a claim that is true on Starter today: unlimited logging.

                  ⚠️ OPEN GAP, not fixed here: Trazo has NO plain data-portability export. The
                  only exports in the codebase are the three certifier artifacts, so "get your own
                  records out" is currently only possible as an audit PDF/CSV — which is now paid.
                  That is an anti-lock-in hole that predates the gate (it was equally true when
                  every export was free-but-only-certifier-shaped), and it sits directly against
                  the COG Pro migration promise. A free "download my records as CSV" belongs on
                  Starter; until it exists, do not re-add an export claim to this line.
                */}
              <Box textAlign="center" mt={6}>
                <Text fontSize="xs" color={useColorModeValue('gray.600', 'gray.400')}>
                  {intl.formatMessage({ id: 'auth.signup.trust' })}
                </Text>
              </Box>

              {/* Sign in link */}
              <Box textAlign="center" mt={3}>
                <Text fontSize="xs" color={useColorModeValue('gray.500', 'gray.400')}>
                  {intl.formatMessage({ id: 'auth.signup.haveAccount' })}{' '}
                  <Link to="/auth/signin">
                    <Text
                      as="span"
                      color="green.700"
                      fontWeight="semibold"
                      _hover={{
                        textDecoration: 'underline',
                        color: 'green.800'
                      }}
                      transition="all 0.2s">
                      {intl.formatMessage({ id: 'auth.signup.signInLink' })}
                    </Text>
                  </Link>
                </Text>
              </Box>
            </>
          ) : (
            /* 🚀 2025 UX Enhancement: Email Verification Panel */
            <MotionBox
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              w="full">
              {/* Back Button */}
              <HStack w="full" justify="flex-start" mb={6}>
                <Button
                  leftIcon={<Icon as={FaArrowLeft} />}
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToSignup}
                  color={useColorModeValue('gray.600', 'gray.400')}
                  _hover={{ color: useColorModeValue('gray.800', 'white') }}>
                  Back to signup
                </Button>
              </HStack>

              {/* Progress Indicator */}
              <HStack justify="center" spacing={4} mb={8}>
                <Box
                  w="32px"
                  h="32px"
                  bg="green.700"
                  borderRadius="50%"
                  display="flex"
                  alignItems="center"
                  justifyContent="center">
                  <Icon as={FaCheckCircle} color="white" boxSize={4} />
                </Box>
                <Box h="2px" flex={1} bg="green.700" />
                <Box
                  w="32px"
                  h="32px"
                  bg="green.100"
                  border="2px solid"
                  borderColor="green.700"
                  borderRadius="50%"
                  display="flex"
                  alignItems="center"
                  justifyContent="center">
                  <Text fontSize="xs" fontWeight="bold" color="green.700">
                    2
                  </Text>
                </Box>
                <Box h="2px" flex={1} bg={useColorModeValue('gray.300', 'gray.600')} />
                <Box
                  w="32px"
                  h="32px"
                  bg={useColorModeValue('gray.100', 'gray.700')}
                  border="2px solid"
                  borderColor={useColorModeValue('gray.300', 'gray.600')}
                  borderRadius="50%"
                  display="flex"
                  alignItems="center"
                  justifyContent="center">
                  <Text
                    fontSize="xs"
                    fontWeight="bold"
                    /* gray.500 on the gray.100 step chip is 4.37:1 — under AA at 12px. */
                    color={useColorModeValue('gray.600', 'gray.400')}>
                    3
                  </Text>
                </Box>
              </HStack>

              {/* Main Icon */}
              <Box textAlign="center" mb={6}>
                <Box
                  w="80px"
                  h="80px"
                  bg="green.50"
                  borderRadius="50%"
                  mx="auto"
                  mb={4}
                  display="flex"
                  alignItems="center"
                  justifyContent="center">
                  {/* 40px and the visual anchor of this state: green.500 on the green.50 disc is 2.70:1,
                      green.700 is 4.86. */}
                  <Icon as={FaEnvelope} color="green.700" boxSize={10} aria-hidden="true" />
                </Box>
              </Box>

              {/* Main Content */}
              <VStack spacing={4} mb={8} textAlign="center">
                <Text
                  fontSize={{ base: 'xl', md: '2xl' }}
                  fontWeight="bold"
                  color={useColorModeValue('gray.800', 'white')}>
                  Check your email
                </Text>

                <Text
                  fontSize="md"
                  color={useColorModeValue('gray.600', 'gray.300')}
                  lineHeight="1.6"
                  maxW="md">
                  {isCompanyJoin
                    ? "We've sent a verification email to help you join the company team."
                    : "We've sent a verification email to get you started."}
                </Text>

                {/* Email Display */}
                <Box
                  bg={useColorModeValue('gray.50', 'gray.800')}
                  borderRadius="lg"
                  px={4}
                  py={3}
                  border="1px solid"
                  borderColor={useColorModeValue('gray.200', 'gray.600')}>
                  <Text
                    fontSize="sm"
                    fontWeight="semibold"
                    color={useColorModeValue('gray.800', 'white')}
                    fontFamily="mono">
                    {verificationEmail}
                  </Text>
                </Box>

                {/* Next Steps */}
                <Text
                  fontSize="sm"
                  color={useColorModeValue('gray.600', 'gray.300')}
                  textAlign="center">
                  Click the link in the email to verify your account and{' '}
                  {isCompanyJoin ? 'join the company' : 'complete your registration'}.
                </Text>
              </VStack>

              {/* Action Buttons */}
              <VStack spacing={4}>
                <Button
                  leftIcon={<Icon as={FaRedo} />}
                  colorScheme="green"
                  variant="outline"
                  size="lg"
                  onClick={handleResendEmail}
                  isLoading={isResending}
                  isDisabled={resendCooldown > 0}
                  loadingText="Sending..."
                  w="full">
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend email'}
                </Button>

                <Text
                  fontSize="xs"
                  color={useColorModeValue('gray.500', 'gray.400')}
                  textAlign="center">
                  Didn't receive the email? Check your spam folder or{' '}
                  <Text as="span" color="green.700">
                    contact support
                  </Text>
                </Text>
              </VStack>
            </MotionBox>
          )}
        </MotionBox>
      </Flex>

      <AuthFooter />
    </Box>
  );
};

export default AppSignUp;
