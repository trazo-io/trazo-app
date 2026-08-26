/**
 * Request-a-password-reset form, and the "check your email" card that follows it.
 *
 * THE one implementation. Until 2026-08-24 there were two: this file (routed for the consumer)
 * and a byte-divergent copy inlined in `ProducerForgotPassword.tsx`. Same screen, two builds,
 * and they had drifted on every axis — MEASURED at 430px:
 *
 *   producer                                consumer (this file)
 *   64px green.700 circle, white check      bare 64px green.500/blue.500 check
 *   heading 2xl                             heading xl
 *   real <Alert status="info">              hand-tinted blue.200/blue.600/blue.800
 *   hand-rolled Button h="52px"             StandardButton
 *   back link 44px                          back link 40px  ⛔ under the minimum
 *
 * The producer's visuals won, since they were the ones already brought in line with the auth
 * pages. Each PAGE now owns its own chrome (the quiet card, the footer) and this component
 * renders only what goes inside it — otherwise the producer's MotionBox card and this file's
 * StandardCard would nest one card inside another.
 *
 * Four more things fixed while consolidating, all of them MEASURED on the live page:
 *
 *  1. EVERY user-facing string was hard-coded English while `trazo_locale` is `es-419`. Seven
 *     in the success card alone; the only translated string on the whole page was
 *     `auth.backToSignIn`, so a Spanish-speaking farmer got an English card with one Spanish
 *     link under it and a Spanish footer under that.
 *  2. `textAlign="center"` on the wrapper was INHERITED into the Alert, which lays its icon out
 *     on the left — so the description read ragged-centre beside a left-aligned icon. The
 *     centring now stops at the message block.
 *  3. The success toast repeated the card word for word ("Reset Link Sent / Check your email
 *     for password reset instructions" against "Check Your Email / We've sent password reset
 *     instructions to…") and covered the bottom of a 430px screen for five seconds. The card IS
 *     the confirmation; the toast is gone.
 *  4. `document.querySelectorAll('h1,h2,h3')` returned ZERO for the entire page — the title was
 *     a `<Text>`, i.e. a `<p>`. It is a heading now.
 *
 * `userType` now decides one thing only: where "back to sign in" goes. It does NOT pick an
 * accent — see the note on `ACCENT_SOLID` for why that idea was tried and dropped.
 */
import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import {
  VStack,
  Text,
  Heading,
  Icon,
  Box,
  Alert,
  AlertIcon,
  AlertDescription,
  useColorModeValue
} from '@chakra-ui/react';
import { FaEnvelope, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';
import { useRequestPasswordResetMutation } from '../../store/api/authApi';
import { StandardInput, StandardButton, registerWithFocus } from '../Design/StandardComponents';
import { AuthErrorAlert } from '../../views/Authentication/AuthErrorAlert';
import {
  resolveGenericAuthError,
  type AuthErrorResolution
} from '../../views/Authentication/authErrors';

interface ForgotPasswordFormData {
  email: string;
}

interface ForgotPasswordFormProps {
  userType: 'producer' | 'consumer';
}

/**
 * ONE accent, brand green, on both apps.
 *
 * The first version of this varied it by `userType` — green for the producer, blue for the
 * consumer — to stop a green button sitting in the middle of the consumer page's blue chrome.
 * VERIFIED on the live page that this cannot work and should not: `theme/components/button.js`
 * defines `BUTTON_PALETTES = {green, gray, red}` and resolves anything else to green ON PURPOSE,
 * citing `.claude/rules/frontend.md` — "Blue survives in exactly one place: Chakra
 * `Alert status="info"`". So `colorScheme="blue"` rendered a green button anyway (measured
 * rgb(46,125,50) = green.700), and a prop that silently does nothing is worse than no prop.
 *
 * Matching the circle to the button rather than to the page keeps the CARD internally
 * consistent, which is the thing a reader actually looks at. The consumer page's blue chrome is
 * the outlier here, and it is a surface being retired (registration closed 2026-08-06 — see
 * `routes/config.ts`), so it is not worth re-accenting the design system around.
 *
 * MEASURED on white: green.700 5.13 — clears the 4.5 a white label owes, and clears it again as
 * the fill behind a white glyph. `green.500` (2.78) does not, and the success icon used to be
 * `green.500` or `blue.500` (3.12) depending on `userType`.
 */
const ACCENT_SOLID = 'green.700';

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ userType }) => {
  const intl = useIntl();
  const [requestPasswordReset, { isLoading }] = useRequestPasswordResetMutation();
  const [emailSent, setEmailSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  /** A RESOLUTION, not a sentence — see `authErrors.ts`. */
  const [error, setError] = useState<AuthErrorResolution | null>(null);

  /*
   * Hoisted out of the JSX. These used to be called INSIDE the `emailSent ? … : …` branches,
   * eleven of them, so the two states ran different numbers of them (8 against 7).
   *
   * ⚠️ That is a rules-of-hooks violation but NOT the crash it looks like: `useColorModeValue`
   * resolves to `useContext`, which takes no slot in the hook list, and toggling the state in
   * both directions on the live page produced no error. Hoisted anyway, because "this one is
   * safe because of how the hook happens to be implemented" is not a thing to leave in a file.
   */
  const headingColor = useColorModeValue('gray.900', 'white');
  const bodyColor = useColorModeValue('gray.500', 'gray.400');
  const strongColor = useColorModeValue('gray.900', 'gray.100');
  const noteBg = useColorModeValue('gray.50', 'gray.800');
  const backLinkColor = useColorModeValue('gray.600', 'gray.400');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<ForgotPasswordFormData>();

  const email = watch('email');
  const backLink = userType === 'producer' ? '/auth/signin' : '/consumidor/auth/signin';

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setError(null);
      await requestPasswordReset({ email: data.email.toLowerCase() }).unwrap();
      setSubmittedEmail(data.email);
      setEmailSent(true);
    } catch (err: any) {
      setError(resolveGenericAuthError(err, 'auth.error.forgotPassword.generic'));
    }
  };

  const backToSignIn = (
    <Link to={backLink}>
      <StandardButton
        variant="ghost"
        colorScheme="gray"
        leftIcon={<FaArrowLeft />}
        color={backLinkColor}
        fontSize="sm"
        px={6}>
        {intl.formatMessage({ id: 'auth.backToSignIn' })}
      </StandardButton>
    </Link>
  );

  if (emailSent) {
    return (
      <VStack spacing={8} w="full">
        <Box
          w="64px"
          h="64px"
          bg={ACCENT_SOLID}
          borderRadius="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
          aria-hidden="true">
          <Icon as={FaCheckCircle} boxSize={8} color="white" />
        </Box>

        {/*
          `textAlign="center"` stops HERE. On the wrapper it was inherited by the Alert below,
          whose icon sits on the left, so its description rendered ragged-centre beside it.
        */}
        <VStack spacing={3} textAlign="center">
          <Heading
            as="h1"
            fontSize="2xl"
            fontWeight="700"
            color={headingColor}
            letterSpacing="tight">
            {intl.formatMessage({ id: 'auth.forgotPassword.sent.title' })}
          </Heading>
          <Text color={bodyColor} fontSize="md" lineHeight="1.6">
            {intl.formatMessage({ id: 'auth.forgotPassword.sent.body' })}
          </Text>
          <Text fontWeight="600" fontSize="lg" color={strongColor} wordBreak="break-word">
            {submittedEmail}
          </Text>
        </VStack>

        <Alert status="info" textAlign="left">
          <AlertIcon />
          <VStack spacing={1} align="start">
            <Text fontSize="sm" fontWeight="medium">
              {intl.formatMessage({ id: 'auth.forgotPassword.sent.expiry' })}
            </Text>
            <AlertDescription fontSize="sm" lineHeight="1.5">
              {intl.formatMessage({ id: 'auth.forgotPassword.sent.spam' })}
            </AlertDescription>
          </VStack>
        </Alert>

        <VStack spacing={4} w="full">
          {/*
            The label says what the button DOES. It was "Send Another Email", which promised a
            resend — it does not resend anything, it returns to the form so a link can be
            requested again, possibly for a different address.
          */}
          <StandardButton
            variant="outline"
            width="full"
            onClick={() => {
              setEmailSent(false);
              setSubmittedEmail('');
            }}>
            {intl.formatMessage({ id: 'auth.forgotPassword.sent.requestNew' })}
          </StandardButton>
          {backToSignIn}
        </VStack>
      </VStack>
    );
  }

  return (
    <VStack spacing={8} w="full">
      <VStack spacing={2} textAlign="center">
        <Heading as="h1" fontSize="2xl" fontWeight="700" color={headingColor} letterSpacing="tight">
          {intl.formatMessage({ id: 'auth.forgotPassword.title' })}
        </Heading>
        <Text fontSize="md" color={bodyColor} lineHeight="1.6">
          {intl.formatMessage({ id: 'auth.forgotPassword.subtitle' })}
        </Text>
      </VStack>

      <Box w="full">
        <AuthErrorAlert resolution={error} />

        <form onSubmit={handleSubmit(onSubmit)}>
          <VStack spacing={5}>
            <Box w="full">
              <Text fontSize="sm" fontWeight="medium" color={strongColor} mb={2} as="label">
                {intl.formatMessage({ id: 'auth.forgotPassword.emailLabel' })}
              </Text>
              <StandardInput
                type="email"
                placeholder={intl.formatMessage({ id: 'auth.forgotPassword.emailPlaceholder' })}
                {...registerWithFocus(
                  register('email', {
                    required: intl.formatMessage({ id: 'auth.forgotPassword.emailRequired' }),
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: intl.formatMessage({ id: 'auth.forgotPassword.emailInvalid' })
                    }
                  }),
                  setFocusedField
                )}
                isInvalid={!!errors.email}
                leftElement={
                  <Icon
                    as={FaEnvelope}
                    // `green.500` is 2.78 and this is a glyph on white owing 3.0; .700 clears it.
                    color={focusedField === 'email' ? 'green.700' : 'gray.500'}
                    transition="all 0.2s"
                  />
                }
              />
              {errors.email && (
                <Text fontSize="sm" color="red.700" mt={1}>
                  {errors.email.message}
                </Text>
              )}
            </Box>

            <StandardButton
              type="submit"
              variant="primary"
              size="lg"
              width="full"
              isLoading={isLoading}
              loadingText={intl.formatMessage({ id: 'auth.forgotPassword.submitting' })}
              isDisabled={!email}>
              {intl.formatMessage({ id: 'auth.forgotPassword.submit' })}
            </StandardButton>
          </VStack>
        </form>
      </Box>

      {backToSignIn}

      <Box p={4} bg={noteBg} borderRadius="xl" w="full">
        <Text fontSize="xs" color={backLinkColor} textAlign="center">
          {intl.formatMessage({ id: 'auth.forgotPassword.securityNote' })}
        </Text>
      </Box>
    </VStack>
  );
};
