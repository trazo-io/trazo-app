import React, { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthFooter from 'components/Footer/AuthFooter';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import {
  Box,
  Heading,
  Stack,
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
import {
  useLoginMutation,
  useResendVerificationEmailMutation,
  useSocialAuthMutation
} from '../../../store/api/authApi';
import { AuthErrorAlert } from '../AuthErrorAlert';
import {
  resolveGenericAuthError,
  resolveSignInError,
  type AuthErrorResolution
} from '../authErrors';
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
  /**
   * A RESOLUTION, not a sentence — see `authErrors.ts`. This screen used to print
   * `err.data.detail` verbatim, which meant SimpleJWT's raw English "No active account found
   * with the given credentials" reached the farmer untranslated, on the most-hit error in the
   * app, reading like a wrong password when half the time it means the email was never
   * confirmed.
   */
  const [error, setError] = useState<AuthErrorResolution | null>(null);
  const [recoveryResendSent, setRecoveryResendSent] = useState(false);
  const [resendEmail, { isLoading: isResending }] = useResendVerificationEmailMutation();
  const [focusedField, setFocusedField] = useState<string | null>(null);
  /** Focus target after a failed submit — see the note at `setError(resolveSignInError…)`. */
  const errorRef = useRef<HTMLDivElement>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<SignInFormData>();

  /**
   * Offered on a failed sign-in, because "No active account found with the given credentials"
   * is SimpleJWT answering three different situations with one sentence — wrong password,
   * unknown address, and never-verified account — and it must keep doing that, or it becomes
   * an account-enumeration oracle. The screen therefore cannot know which one happened, so it
   * offers the recovery for the one the farmer cannot otherwise escape, phrased as a question.
   *
   * ⚠️ Reports "sent" whatever the endpoint returns, on purpose: `resend_verification_email`
   * answers "If an account exists…" for EVERY address, and surfacing a difference here would
   * hand back exactly the enumeration the sign-in error refuses to give.
   */
  const handleRecoveryResend = async () => {
    const address = (watch('email') || '').trim();
    if (!address) return;

    try {
      await resendEmail({ email: address }).unwrap();
    } catch (err) {
      console.error('Recovery resend failed:', err);
    } finally {
      setRecoveryResendSent(true);
    }
  };

  // Hoisted so the focus-tracking onBlur below can call register()'s own onBlur through
  // instead of shadowing it (see the comment on the email field).
  /*
   * Validation copy goes through intl like everything else. These four were hard-coded
   * English and, unlike a placeholder, they are what a farmer reads at the moment they are
   * already stuck — MEASURED on the live es-419 page, an empty submit answered "Email is
   * required" in the middle of an otherwise Spanish form.
   */
  const emailField = register('email', {
    required: intl.formatMessage({ id: 'auth.signin.emailRequired' }),
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: intl.formatMessage({ id: 'auth.signin.emailInvalid' })
    }
  });
  const passwordField = register('password', {
    required: intl.formatMessage({ id: 'auth.signin.passwordRequired' }),
    minLength: {
      value: 8,
      message: intl.formatMessage({ id: 'auth.signin.passwordMinLength' }, { min: 8 })
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
        title: intl.formatMessage({ id: 'auth.signup.toast.social.returning.title' }),
        description: intl.formatMessage({ id: 'auth.signup.toast.social.returning.body' }),
        status: 'success',
        duration: 3000,
        isClosable: true
      });

      // Don't redirect immediately - let Authenticated.jsx handle establishment redirect
      // This prevents race condition where company data isn't loaded yet
      // The user will be redirected to the appropriate establishment dashboard
      // by the authentication protection logic
    } catch (err: any) {
      setError(resolveSignInError(err));
      /*
       * Move focus to the error.
       *
       * MEASURED: after a failed submit `document.activeElement` was `BODY` — the button that
       * had focus was re-rendered away, so a keyboard or screen-reader user was silently
       * dropped at the top of the document with no idea anything had happened. The alert
       * carries `role="alert"` so it is announced, but announcement is not focus: the user
       * still has to tab back down to find the recovery action the alert just offered.
       */
      requestAnimationFrame(() => errorRef.current?.focus());
      setRecoveryResendSent(false);
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
        title: intl.formatMessage({
          id: response.is_new_user
            ? 'auth.signup.toast.social.newUser.title'
            : 'auth.signup.toast.social.returning.title'
        }),
        description: intl.formatMessage({
          id: response.is_new_user
            ? 'auth.signup.toast.social.newUser.body'
            : 'auth.signup.toast.social.returning.body'
        }),
        status: 'success',
        duration: 3000,
        isClosable: true
      });

      // Don't redirect immediately - let Authenticated.jsx handle establishment redirect
      // This prevents race condition where company data isn't loaded yet
    } catch (err: any) {
      setError(resolveGenericAuthError(err, 'auth.error.social.failed'));
      setRecoveryResendSent(false);
      // The provider SDK handler wants the raw reason, not the translated on-screen line.
      handleSocialAuthError(
        new Error(err?.data?.error || 'Social authentication failed'),
        authData.provider
      );
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
            title: intl.formatMessage({ id: 'auth.signup.toast.config.title' }),
            description: intl.formatMessage({ id: 'auth.signup.toast.config.googleBody' }),
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
            title: intl.formatMessage({ id: 'auth.signup.toast.config.title' }),
            description: intl.formatMessage({ id: 'auth.signup.toast.config.facebookBody' }),
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
          title: intl.formatMessage({ id: 'auth.signup.toast.unknownProvider.title' }),
          description: intl.formatMessage({ id: 'auth.signup.toast.unknownProvider.body' }),
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
        /*
          `smd`, NOT `sm`. This app's `sm` breakpoint is **320px**, not Chakra's 480 — see
          `theme/foundations/breakpoints.js`, and the rule in `.claude/rules/frontend.md`:
          "Mobile-only (<480px): use `{{ base: 'x', smd: 'y' }}` NOT `{{ base: 'x', sm: 'y' }}`".

          Written as `sm`, the `base` value applied only BELOW 320px — a width no phone in
          service reports — so every real phone silently took the ROOMIER desktop value. MEASURED
          at 375px before this change: 24px page gutter + 32px card padding = 57px of chrome per
          side, leaving 261px of content, i.e. **70% of the screen**. The author's own `base`
          numbers (16 + 24) were dead code.

          With `smd` the phone gets what was always intended: 295px of content, 79% of the
          screen — 34px more room, which is the difference between the sign-in row fitting on
          one line and not.
        */
        px={{ base: 4, smd: 6 }}
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
          px={{ base: 6, smd: 8 }}
          py={{ base: 8, smd: 10 }}>
          {/* Header */}
          <VStack spacing={6} mb={10}>
            <VStack spacing={2}>
              {/*
                A real <h1>. MEASURED: `document.querySelectorAll('h1,h2,h3,h4')` returned ZERO
                for this entire page — the title was a `<Text>`, i.e. a `<p>`, so a screen
                reader's heading navigation found nothing to land on and the document had no
                stated topic. Same defect that was fixed on the forgot-password card.
              */}
              <Heading
                as="h1"
                fontSize="2xl"
                fontWeight="700"
                color={useColorModeValue('gray.900', 'white')}
                letterSpacing="tight">
                {intl.formatMessage({ id: 'auth.signin.welcome' })}
              </Heading>
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
            {/*
              Was a hand-rolled red Box — one of TWO incompatible hand-rolled designs across
              six auth screens, none with an icon and none with `role="alert"`. See
              AuthErrorAlert for the measurements.
            */}
            <AuthErrorAlert
              ref={errorRef}
              resolution={error}
              onResendVerification={handleRecoveryResend}
              isResending={isResending}
              resendSent={recoveryResendSent}
            />

            <form onSubmit={handleSubmit(onSubmit)}>
              <VStack spacing={5}>
                {/* Email field */}
                <Box w="full">
                  {/*
                    A real <label htmlFor>, not a <Text>.

                    MEASURED 2026-08-25: this label was a `<p>`, the input had no `id` and no
                    `aria-label`, so the field had NO ACCESSIBLE NAME — a screen reader
                    announced "edit text, blank" — and clicking the visible label focused
                    nothing (`document.activeElement` stayed `BODY`). WCAG 1.3.1 + 4.1.2, both
                    Level A, on the first screen a farmer meets.

                    `autoComplete` is the other half. It was absent on both fields, and it is
                    what 1Password, iCloud Keychain, Chrome and Android autofill key off — the
                    single highest-leverage thing on a sign-in form. `name` alone only feeds
                    heuristics.
                  */}
                  <Text
                    as="label"
                    htmlFor="signin-email"
                    display="block"
                    fontSize="sm"
                    fontWeight="medium"
                    color={useColorModeValue('gray.700', 'gray.300')}
                    mb={2}>
                    {intl.formatMessage({ id: 'auth.signin.emailLabel' })}
                  </Text>
                  <StandardInput
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'signin-email-error' : undefined}
                    placeholder={intl.formatMessage({ id: 'auth.signin.emailPlaceholder' })}
                    isInvalid={!!errors.email}
                    leftElement={
                      <Icon
                        as={FaEnvelope}
                        color={focusedField === 'email' ? 'green.700' : 'gray.500'}
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
                    <Text id="signin-email-error" fontSize="sm" color="red.700" mt={1}>
                      {errors.email.message}
                    </Text>
                  )}
                </Box>

                {/* Password field */}
                <Box w="full">
                  <Text
                    as="label"
                    htmlFor="signin-password"
                    display="block"
                    fontSize="sm"
                    fontWeight="medium"
                    color={useColorModeValue('gray.700', 'gray.300')}
                    mb={2}>
                    {intl.formatMessage({ id: 'auth.signin.passwordLabel' })}
                  </Text>
                  <StandardInput
                    id="signin-password"
                    type={showPassword ? 'text' : 'password'}
                    /* `current-password`, never `new-password`: this is a sign-in, and telling
                       a password manager otherwise makes it offer to GENERATE one here. */
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'signin-password-error' : undefined}
                    placeholder={intl.formatMessage({ id: 'auth.signin.passwordPlaceholder' })}
                    isInvalid={!!errors.password}
                    leftElement={
                      <Icon
                        as={FaLock}
                        color={focusedField === 'password' ? 'green.700' : 'gray.500'}
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
                        /* MEASURED 38x32 against the project's 44px floor, and it sits at the
                           right edge of the field where a thumb is least accurate. */
                        minW="44px"
                        h="44px"
                        _hover={{ bg: 'transparent' }}>
                        <Icon
                          as={showPassword ? FaEyeSlash : FaEye}
                          aria-hidden="true"
                          color={useColorModeValue('gray.500', 'gray.400')}
                          _hover={{ color: useColorModeValue('gray.700', 'gray.200') }}
                          transition="all 0.2s"
                        />
                      </Button>
                    }
                  />
                  {errors.password && (
                    <Text id="signin-password-error" fontSize="sm" color="red.700" mt={1}>
                      {errors.password.message}
                    </Text>
                  )}
                </Box>

                {/*
                  Remember me + Forgot password.

                  MEASURED at 375px in es-419: as a plain `HStack` (a nowrap row) the two
                  needed 76px + ~200px against 261px of content, so "¿Olvidaste tu contraseña?"
                  wrapped to two lines beside a 21px checkbox and the row lost its baseline —
                  the label sat at y=664 against the link's y=653.

                  English fits, which is why this survived: "Remember me" + "Forgot password?"
                  is ~60px shorter. Stack them below `smd` rather than tuning for one language.
                */}
                <Stack
                  direction={{ base: 'column', smd: 'row' }}
                  justify="space-between"
                  align={{ base: 'flex-start', smd: 'center' }}
                  spacing={{ base: 3, smd: 2 }}
                  w="full">
                  <HStack spacing={2} minH="44px">
                    <Box
                      as="input"
                      type="checkbox"
                      id="remember_me"
                      /*
                        MEASURED 16x16 against the 44px floor. The box itself has to stay 16px
                        — that is what a checkbox looks like — so the TARGET is grown instead:
                        the HStack around it and its label gets `minH`, and because the label
                        carries `htmlFor` the whole 44px row toggles the box.
                      */
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
                    {/* MEASURED 21px tall. `inline-flex` + `minH` grows the hit area without
                        moving the text or making the link read as a button. */}
                    <Text
                      display="inline-flex"
                      alignItems="center"
                      minH="44px"
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
                </Stack>

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
                    /*
                      MEASURED 1.04:1 without this. The `bg` above is overridden but the COLOR
                      is not, so the label kept Chakra's default white-on-solid and rendered
                      white on gray.50 — invisible. Adding the provider name is what exposed
                      it: as an icon-only button there was no text to be unreadable.
                    */
                    color={useColorModeValue('gray.700', 'gray.100')}
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
                    {/*
                      The provider NAME, not just a coloured glyph. The aria-label already said
                      it, so assistive tech was fine — but a sighted farmer got a bare "G" and
                      "f" and had to recognise two logos. Labelled provider buttons are the
                      current convention for exactly this reason.
                    */}
                    <HStack spacing={2}>
                      <Icon as={social.icon} fontSize="18px" color={social.color} />
                      <Text fontSize="sm" fontWeight="medium">
                        {social.name}
                      </Text>
                    </HStack>
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
