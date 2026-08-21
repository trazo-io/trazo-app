import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthFooter from 'components/Footer/AuthFooter';
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
  Button,
  useColorModeValue
} from '@chakra-ui/react';
import { FaGoogle, FaFacebook, FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useIntl } from 'react-intl';
import { StandardInput } from '../../../components/Design/StandardComponents';
import { useLoginMutation, useSocialAuthMutation } from '../../../store/api/authApi';
import { useClaimScansMutation } from '../../../store/api/historyApi';
import { login as loginAction } from '../../../store/features/authSlice';
import { getPendingScanTokens, clearPendingScans } from '../../../utils/pendingScanStorage';
import {
  handleGoogleSignIn,
  handleFacebookSignIn,
  handleSocialAuthError,
  checkSocialAuthConfig
} from '../../../utils/socialAuth';

// No assets needed for minimalist design

// Motion components
const MotionBox = motion(Box);

interface SignInFormData {
  email: string;
  password: string;
  remember_me: boolean;
}

const AppSignIn: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const intl = useIntl();
  const toast = useToast();
  const [login, { isLoading }] = useLoginMutation();
  const [socialAuth, { isLoading: isSocialLoading }] = useSocialAuthMutation();
  const [claimScans] = useClaimScansMutation();
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<SignInFormData>();

  // Hoisted so the focus-tracking onBlur below can call register()'s own onBlur through
  // instead of shadowing it (see the comment on the email field).
  const emailField = register('email', {
    required: 'Email is required',
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: 'Invalid email address'
    }
  });
  const passwordField = register('password', {
    required: 'Password is required',
    minLength: {
      value: 8,
      message: 'Password must be at least 8 characters'
    }
  });

  const onSubmit = async (data: SignInFormData) => {
    try {
      setError(null);
      const response = await login(data).unwrap();

      dispatch(loginAction(response));

      // Claim any anonymous scans made before signing in
      const pendingTokens = getPendingScanTokens();
      if (pendingTokens.length > 0) {
        claimScans({ claim_tokens: pendingTokens })
          .unwrap()
          .then(() => clearPendingScans())
          .catch(() => clearPendingScans());
      }

      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
        status: 'success',
        duration: 3000,
        isClosable: true
      });

      // Don't redirect immediately - let Authenticated.jsx handle establishment redirect
      // This prevents race condition where company data isn't loaded yet
      // The user will be redirected to the appropriate establishment dashboard
      // by the authentication protection logic
    } catch (err: any) {
      const errorMessage = err?.data?.detail || 'Invalid email or password';
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

      // Claim any anonymous scans made before signing in
      const pendingTokens = getPendingScanTokens();
      if (pendingTokens.length > 0) {
        claimScans({ claim_tokens: pendingTokens })
          .unwrap()
          .then(() => clearPendingScans())
          .catch(() => clearPendingScans());
      }

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
   * #FBFCFA is the LANDING's `--background` token, read straight out of
   * trazo-landing/app/globals.css. Using it here — rather than pure white — is what makes the
   * marketing site and the app feel like one ground when you cross from one to the other.
   */
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'whiteAlpha.200');

  /*
   * 2026 auth layout: a quiet centered card, not a marketing billboard.
   *
   * This was a 50/50 split with a full-bleed saturated green panel. MEASURED against the
   * landing page: that panel put GREEN ON 40.6% OF THE SCREEN, where the landing runs 4.3%.
   * Same brand colour, ~9x the coverage — which is why the two surfaces read as two different
   * products, more than the hue mismatch did. The split-with-marketing-panel pattern is
   * inherited from the Creative Tim admin template this view started life as (see its
   * SignInBasic / SignInIllustration siblings); Linear, Stripe, Vercel, Notion and Clerk all
   * moved auth to a single quiet card years ago, because a LOGIN page has no one left to
   * persuade — the visitor already chose. The six benefit bullets moved off this page for the
   * same reason. Their i18n keys are intentionally left in both locale files: the signup page
   * is where that copy belongs, and it is compliance-reviewed (see the note above them in git).
   *
   * The canvas is the LANDING's own background token (#FBFCFA) rather than pure white, so the
   * two properties share a ground. Green survives in exactly one place here: the Sign in
   * button.
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
          maxW="440px"
          bg={cardBg}
          borderWidth="1px"
          borderColor={cardBorder}
          borderRadius="2xl"
          boxShadow="0 1px 2px rgba(16, 24, 40, 0.04), 0 12px 32px -12px rgba(16, 24, 40, 0.12)"
          px={{ base: 6, sm: 8 }}
          py={{ base: 8, sm: 10 }}>
          {/* Header */}
          <VStack spacing={6} mb={10}>
            <VStack spacing={2}>
              <Text
                fontSize="2xl"
                fontWeight="700"
                color={useColorModeValue('gray.900', 'white')}
                letterSpacing="tight">
                {intl.formatMessage({ id: 'auth.signin.welcome' })}
              </Text>
              <Text
                fontSize="md"
                color={useColorModeValue('gray.500', 'gray.400')}
                textAlign="center">
                {/*
                    Was "Your verified story is waiting." — the exact phrase the
                    compliance comment at the top of this file tells us to avoid.
                    Trazo documents; it does not verify. Also i18n'd, per the
                    bilingual rule.
                  */}
                {intl.formatMessage({
                  id: 'auth.signin.welcome.subtitle',
                  defaultMessage: 'Your farm records are waiting.'
                })}
              </Text>
            </VStack>
          </VStack>

          {/* Main Form */}
          <Box w="full">
            {error && (
              <Box
                bg="red.50"
                borderRadius="xl"
                p={4}
                mb={6}
                borderLeft="4px solid"
                borderLeftColor="red.500">
                <Text color="red.700" fontSize="sm" fontWeight="500">
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
                    mb={2}>
                    {intl.formatMessage({ id: 'auth.signin.emailLabel' })}
                  </Text>
                  <StandardInput
                    type="email"
                    placeholder="Enter your business email"
                    isInvalid={!!errors.email}
                    leftElement={
                      <Icon
                        as={FaEnvelope}
                        color={focusedField === 'email' ? 'green.500' : 'gray.400'}
                        transition="all 0.2s"
                      />
                    }
                    {...emailField}
                    onFocus={() => setFocusedField('email')}
                    onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                      // register()'s own onBlur has to be called through, or react-hook-form
                      // never marks the field touched and onBlur/onTouched validation modes
                      // go dead. The previous markup overwrote it.
                      emailField.onBlur(e);
                      setFocusedField(null);
                    }}
                  />
                  {errors.email && (
                    <Text fontSize="sm" color="red.700" mt={1}>
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
                    mb={2}>
                    {intl.formatMessage({ id: 'auth.signin.passwordLabel' })}
                  </Text>
                  <StandardInput
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    isInvalid={!!errors.password}
                    leftElement={
                      <Icon
                        as={FaLock}
                        color={focusedField === 'password' ? 'green.500' : 'gray.400'}
                        transition="all 0.2s"
                      />
                    }
                    {...passwordField}
                    onFocus={() => setFocusedField('password')}
                    onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                      passwordField.onBlur(e);
                      setFocusedField(null);
                    }}
                    rightElement={
                      <Button
                        variant="ghost"
                        onClick={() => setShowPassword(!showPassword)}
                        size="sm"
                        /* Was an unlabelled icon button: a screen reader announced "button"
                           and nothing else, and its state (shown/hidden) was carried only by
                           which glyph was drawn. */
                        aria-label={intl.formatMessage({
                          id: showPassword ? 'auth.password.hide' : 'auth.password.show'
                        })}
                        aria-pressed={showPassword}
                        _hover={{ bg: 'transparent' }}>
                        <Icon
                          as={showPassword ? FaEyeSlash : FaEye}
                          aria-hidden="true"
                          color={useColorModeValue('gray.400', 'gray.500')}
                          _hover={{ color: useColorModeValue('gray.600', 'gray.300') }}
                          transition="all 0.2s"
                        />
                      </Button>
                    }
                  />
                  {errors.password && (
                    <Text fontSize="sm" color="red.700" mt={1}>
                      {errors.password.message}
                    </Text>
                  )}
                </Box>

                {/* Remember me + Forgot password */}
                <HStack justify="space-between" w="full">
                  <HStack spacing={2}>
                    <Box
                      as="input"
                      type="checkbox"
                      id="remember_me"
                      w="16px"
                      h="16px"
                      accentColor="var(--chakra-colors-green-500)"
                      cursor="pointer"
                      {...register('remember_me')}
                    />
                    <Text
                      as="label"
                      htmlFor="remember_me"
                      fontSize="sm"
                      color={useColorModeValue('gray.600', 'gray.400')}
                      cursor="pointer"
                      userSelect="none">
                      {intl.formatMessage({ id: 'auth.signin.rememberMe' })}
                    </Text>
                  </HStack>
                  <Link to="/auth/forgot-password">
                    <Text
                      fontSize="sm"
                      color="green.700"
                      fontWeight="medium"
                      _hover={{
                        textDecoration: 'underline',
                        color: 'green.800'
                      }}
                      transition="all 0.2s">
                      {intl.formatMessage({ id: 'auth.signin.forgotPassword' })}
                    </Text>
                  </Link>
                </HStack>

                {/* Sign in button */}
                <Button
                  type="submit"
                  w="full"
                  h="52px"
                  bg="green.700"
                  color="white"
                  fontSize="md"
                  fontWeight="600"
                  borderRadius="xl"
                  isLoading={isLoading || isSocialLoading}
                  loadingText={isSocialLoading ? 'Authenticating...' : 'Signing in...'}
                  _hover={{
                    bg: 'green.800',
                    transform: 'translateY(-1px)'
                  }}
                  _active={{
                    transform: 'translateY(0)'
                  }}
                  transition="all 0.2s">
                  {/* Was "Access Your Transparency Dashboard" — hardcoded English, and it named
                        a page that was DELETED on 2026-08-11 (the /transparency route has been a
                        redirect the whole time). The sign-in button should name the act, not a
                        destination that may move. */}
                  {intl.formatMessage({
                    id: 'auth.signin.submit',
                    defaultMessage: 'Sign in'
                  })}
                </Button>
              </VStack>
            </form>

            {/* Social login section */}
            <VStack spacing={4} mt={8}>
              <HStack w="full" spacing={4}>
                <Divider borderColor={useColorModeValue('gray.200', 'gray.600')} />
                <Text
                  fontSize="sm"
                  /* gray.400 (#9E9E9E) is 2.68:1 on white — a divider label is still text and
                     still owes 4.5. gray.500 is 4.61. */
                  color={useColorModeValue('gray.500', 'gray.400')}
                  flexShrink={0}
                  fontWeight="500">
                  {intl.formatMessage({ id: 'auth.signin.orContinueWith' })}
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
                    /* 44px is the project's touch-target floor; these were 40. And an
                       icon-only button with no aria-label announces as just "button" — the
                       provider name existed only as a coloured glyph. */
                    h="44px"
                    aria-label={intl.formatMessage(
                      { id: 'auth.signin.continueWithProvider' },
                      { provider: social.name }
                    )}
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

          {/* Sign up link */}
          <Box textAlign="center" mt={8}>
            <Text fontSize="xs" color={useColorModeValue('gray.500', 'gray.400')}>
              {intl.formatMessage({ id: 'auth.signin.noAccount' })}{' '}
              <Link to="/auth/signup">
                <Text
                  as="span"
                  color="green.700"
                  fontWeight="semibold"
                  _hover={{
                    textDecoration: 'underline',
                    color: 'green.800'
                  }}
                  transition="all 0.2s">
                  {intl.formatMessage({ id: 'auth.signin.signUpLink' })}
                </Text>
              </Link>
            </Text>
          </Box>
        </MotionBox>
      </Flex>

      <AuthFooter />
    </Box>
  );
};

export default AppSignIn;
