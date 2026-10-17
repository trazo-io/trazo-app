import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import {
  Box,
  Button,
  Flex,
  Text,
  VStack,
  HStack,
  PinInput,
  PinInputField,
  useToast,
  Spinner,
  Icon,
  Link,
  Progress,
  useColorModeValue
} from '@chakra-ui/react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { FiMail, FiCheck, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { useVerifyEmailMutation, useResendVerificationEmailMutation } from 'store/api/authApi';

import { AuthErrorAlert } from '../AuthErrorAlert';
import {
  ALREADY_VERIFIED,
  resolveGenericAuthError,
  resolveVerifyEmailError
} from '../authErrors';
import type { AuthErrorResolution, RtkError } from '../authErrors';

interface VerifyEmailProps {
  userType?: 'producer' | 'consumer';
}

const ModernVerifyEmail: React.FC<VerifyEmailProps> = ({ userType = 'producer' }) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  // Colors based on user type.
  //
  // `.700`, not `.500` (2026-08-31). This one variable does five jobs on this page: the
  // page-level verifying <Spinner> (:204), a focusBorderColor and a boxShadow ring (:327,
  // :342-343) — and the "Resend code" BUTTON LABEL (:382) and the back-link hover colour
  // (:399). The last two render glyphs, so the whole variable owes 4.5:1, and the highest
  // bar wins for a shared token.
  //
  // MEASURED on white: green.500 #4CAF50 2.78 ⛔ (fails even the 3.0 non-text floor, so the
  // spinner failed too), blue.500 #2196F3 3.12 ⛔ as text. green.700 #2E7D32 5.13 ✓,
  // blue.700 #1976D2 4.60 ✓. Per .claude/rules/frontend.md: if it renders glyphs, it is
  // the .700 step — and grep the DECLARATION, because that is where this hid from the
  // call-site sweep.
  const primaryColor = userType === 'producer' ? 'green.700' : 'blue.700';
  const primaryGradient =
    userType === 'producer'
      ? 'linear(to-r, green.500, green.600)'
      : 'linear(to-r, blue.500, blue.600)';

  // State management
  const [email, setEmail] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [step, setStep] = useState<'loading' | 'enter-code' | 'success' | 'error'>('loading');
  const [autoVerified, setAutoVerified] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [redirectProgress, setRedirectProgress] = useState(0);
  /**
   * The failure, resolved once and rendered in ONE place.
   *
   * This used to be a toast carrying `error?.data?.error` — the server's English sentence,
   * on a screen whose locale may be Spanish, disappearing after four seconds, and offering
   * no way out of the failure it announced. `AuthErrorAlert` is the shared surface every
   * other auth screen already renders: translated, `role="alert"`, and carrying the resend
   * action this page already had a handler for.
   */
  const [errorResolution, setErrorResolution] = useState<AuthErrorResolution | null>(null);
  const [resendSent, setResendSent] = useState(false);

  // 🚀 2025 Best Practice: Company joining context from navigation state
  const isCompanyJoin = location.state?.companyJoin || false;
  const companyMessage = location.state?.message;

  // API hooks
  const [verifyEmail, { isLoading, isSuccess, error, isError }] = useVerifyEmailMutation();
  const [resendVerificationEmail, { isLoading: isResending }] =
    useResendVerificationEmailMutation();

  // Extract email and code from URL params
  useEffect(() => {
    const urlEmail = searchParams.get('email');
    const urlCode = searchParams.get('code');

    if (urlEmail) {
      const decodedEmail = decodeURIComponent(urlEmail);
      setEmail(decodedEmail);

      if (urlCode) {
        // Auto-verify if code is in URL
        setAutoVerified(true);
        verifyEmail({ email: decodedEmail, code: urlCode });
      } else {
        // Show manual code entry
        setStep('enter-code');
        startResendCooldown();
      }
    } else {
      // Redirect to sign up if no email
      navigate('/auth/signup');
    }
  }, [searchParams, verifyEmail, navigate]);

  // Handle verification result
  useEffect(() => {
    if (isSuccess) {
      setStep('success');

      // Start progress animation and redirect
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 5;
        setRedirectProgress(progress);
        if (progress >= 100) {
          clearInterval(progressInterval);
          const dashboardPath =
            userType === 'consumer' ? '/admin/dashboard/impact' : '/admin/dashboard';

          // 🚀 Add company join context to dashboard URL
          const dashboardUrl = isCompanyJoin
            ? `${dashboardPath}?welcome=true&source=email_verification&company_join=true`
            : dashboardPath;

          navigate(dashboardUrl);
        }
      }, 100); // Complete in 2 seconds (20 intervals * 100ms)
    } else if (isError) {
      // Read the CODE, never the sentence. This branch is the success path for someone whose
      // account is already verified, and it used to be selected by string-comparing English:
      // on a Spanish locale it never matched, so a perfectly fine account was shown
      // "Verification failed" and left there.
      const code = error?.data?.code;
      if (code === ALREADY_VERIFIED) {
        setStep('success');
        // For already verified users, also redirect to dashboard instead of sign-in
        setTimeout(() => {
          const dashboardPath =
            userType === 'consumer' ? '/admin/dashboard/impact' : '/admin/dashboard';
          navigate(dashboardPath);
        }, 1000);
      } else {
        setStep('error');
        setResendSent(false);
        setErrorResolution(resolveVerifyEmailError(error));
      }
    }
  }, [isSuccess, isError, error, navigate]);

  // Resend cooldown timer
  const startResendCooldown = () => {
    setResendCooldown(60);
    setCanResend(false);

    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handle manual code submission
  const handleCodeSubmit = () => {
    if (verificationCode.length === 6) {
      verifyEmail({ email, code: verificationCode });
    }
  };

  // Handle resend email
  const handleResendEmail = async () => {
    try {
      await resendVerificationEmail({ email }).unwrap();
      setResendSent(true);
      // A new code invalidates the old one server-side, so the screen must come back to the
      // input rather than stay on "Verification failed" with a code the user cannot use.
      setStep('enter-code');
      setVerificationCode('');
      toast({
        title: intl.formatMessage({ id: 'auth.verifyEmail.resent.title' }),
        description: intl.formatMessage({ id: 'auth.verifyEmail.resent.body' }),
        status: 'success',
        duration: 3000,
        isClosable: true
      });
      startResendCooldown();
    } catch (resendError) {
      setResendSent(false);
      // `unwrap()` rejects with `unknown`; the mapper reads only `status` and `data`, and its
      // own `first()` unwrapper tolerates anything on either.
      setErrorResolution(
        resolveGenericAuthError(resendError as RtkError, 'auth.error.verify.resendFailed')
      );
    }
  };

  // Render loading state
  if (step === 'loading' || (autoVerified && isLoading)) {
    return (
      <Flex minH="calc(100vh - 80px)" align="center" justify="center" bg="gray.50" px={4}>
        <VStack spacing={6} textAlign="center" maxW={{ base: '100%', md: '400px' }}>
          <Spinner
            thickness="4px"
            speed="0.65s"
            emptyColor="gray.200"
            color={primaryColor}
            size="xl"
          />
          <VStack spacing={2}>
            <Text fontSize="xl" fontWeight="600" color="gray.700">
              Verifying your email
            </Text>
            <Text fontSize="sm" color="gray.500">
              Please wait while we confirm your email address...
            </Text>
          </VStack>
        </VStack>
      </Flex>
    );
  }

  // Render success state
  if (step === 'success') {
    return (
      <Flex minH="calc(100vh - 80px)" align="center" justify="center" bg="gray.50" px={4}>
        <VStack spacing={6} textAlign="center" maxW={{ base: '100%', md: '400px' }}>
          <Box
            w="80px"
            h="80px"
            bg={primaryGradient}
            borderRadius="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
            animation="pulse 2s infinite"
            sx={{
              '@keyframes pulse': {
                '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(72, 187, 120, 0.7)' },
                '70%': { transform: 'scale(1.05)', boxShadow: '0 0 0 10px rgba(72, 187, 120, 0)' },
                '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(72, 187, 120, 0)' }
              }
            }}>
            <Icon as={FiCheck} color="white" boxSize={10} />
          </Box>
          <VStack spacing={4}>
            <Text fontSize="xl" fontWeight="600" color="gray.700">
              Email verified successfully!
            </Text>
            <Text fontSize="sm" color="gray.500" textAlign="center">
              Welcome to Trazo! Taking you to your dashboard...
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

  // Render manual code entry
  return (
    <Flex minH="calc(100vh - 80px)" align="center" justify="center" bg="gray.50" px={4}>
      <Box
        maxW={{ base: '100%', md: '400px' }}
        w="full"
        bg="white"
        borderRadius="xl"
        boxShadow="lg"
        p={{ base: 5, md: 8 }}>
        <VStack spacing={6} textAlign="center">
          {/* Header */}
          <Box
            w="64px"
            h="64px"
            bg={step === 'error' ? 'red.500' : primaryGradient}
            borderRadius="full"
            display="flex"
            alignItems="center"
            justifyContent="center">
            <Icon as={step === 'error' ? FiAlertCircle : FiMail} color="white" boxSize={8} />
          </Box>

          <VStack spacing={2}>
            <Text fontSize="xl" fontWeight="600" color="gray.700">
              {step === 'error'
                ? intl.formatMessage({ id: 'auth.verifyEmail.failedTitle' })
                : 'Check your email'}
            </Text>
            {/*
              On the error step this used to repeat "check your code and try again, or request
              a new verification email" — the alert below now says what actually went wrong AND
              carries the resend button, so a second, vaguer copy of it is noise pointing at a
              control it does not have.
            */}
            {step !== 'error' && (
              <Text fontSize="sm" color="gray.500" textAlign="center">
                {isCompanyJoin
                  ? `We sent a verification code to ${email}. Once verified, you'll automatically join the company team.`
                  : `We sent a verification code to ${email}. Enter the 6-character code below.`}
              </Text>
            )}
            {isCompanyJoin && step !== 'error' && (
              <Text fontSize="xs" color="green.700" textAlign="center" mt={2} px={4}>
                After verification, you'll have immediate access to your team's dashboard and
                projects.
              </Text>
            )}
          </VStack>

          {/*
            ONE error surface, rendered on BOTH steps: the failure that put the page into
            `error` and a wrong code typed on the way in are the same event to the person,
            and splitting them across a toast and a heading is how the resend action went
            missing from the case that needs it most.
          */}
          <AuthErrorAlert
            resolution={errorResolution}
            signInPath="/auth/signin"
            onResendVerification={handleResendEmail}
            isResending={isResending}
            resendSent={resendSent}
          />

          {/* Code Input */}
          {step !== 'error' && (
            <VStack spacing={4} w="full">
              <HStack spacing={3} justify="center">
                {/*
                  🔴 `type="alphanumeric"` is LOAD-BEARING, not a nicety (2026-09-07).

                  Chakra's PinInput defaults to `type="number"`, which SILENTLY DROPS any
                  character that is not a digit — and `users.signals.generate_verification_code`
                  builds the code from `ascii_letters + digits`, uppercased. MEASURED on the
                  live page: typing `ABC123` left the fields holding `1`, `2`, `3` and the
                  Verify button disabled. The odds of a code this screen can accept are
                  (10/36)^6, about one in two million.

                  It stayed invisible because the emailed LINK carries `?code=` and verifies
                  automatically, so the screen only fails on the path it exists for: someone
                  typing the code by hand, which is what the copy tells them to do and the
                  only option when the link is mangled or they are on a second device.

                  `.toUpperCase()` for the same reason: the server compares the code exactly,
                  and the code it mailed is uppercase.
                */}
                <PinInput
                  size="lg"
                  type="alphanumeric"
                  value={verificationCode}
                  onChange={(value) => setVerificationCode(value.toUpperCase())}
                  onComplete={(value) => verifyEmail({ email, code: value.toUpperCase() })}
                  placeholder="_"
                  focusBorderColor={primaryColor}
                  errorBorderColor="red.300">
                  {[...Array(6)].map((_, index) => (
                    <PinInputField
                      key={index}
                      w="48px"
                      h="48px"
                      fontSize="lg"
                      fontWeight="600"
                      textAlign="center"
                      borderRadius="lg"
                      border="2px solid"
                      borderColor="gray.200"
                      _hover={{ borderColor: 'gray.300' }}
                      _focus={{
                        borderColor: primaryColor,
                        boxShadow: `0 0 0 1px ${primaryColor}`
                      }}
                    />
                  ))}
                </PinInput>
              </HStack>

              <Button
                bg={primaryGradient}
                color="white"
                size="lg"
                borderRadius="lg"
                w="full"
                h="44px"
                fontSize="sm"
                fontWeight="600"
                isLoading={isLoading}
                loadingText="Verifying..."
                isDisabled={verificationCode.length !== 6}
                onClick={handleCodeSubmit}
                _hover={{
                  transform: 'translateY(-1px)',
                  boxShadow: 'lg'
                }}
                _active={{ transform: 'translateY(0)' }}>
                Verify Email
              </Button>
            </VStack>
          )}

          {/* Resend Section */}
          <VStack spacing={3}>
            <Text fontSize="sm" color="gray.500">
              Didn't receive the code?
            </Text>

            <Button
              variant="ghost"
              size="sm"
              color={primaryColor}
              fontWeight="600"
              isDisabled={!canResend}
              isLoading={isResending}
              loadingText="Sending..."
              onClick={handleResendEmail}
              leftIcon={<Icon as={FiRefreshCw} />}>
              {canResend ? 'Resend code' : `Resend in ${resendCooldown}s`}
            </Button>
          </VStack>

          {/* Back to Sign In */}
          <Link
            color="gray.500"
            fontSize="sm"
            fontWeight="500"
            onClick={() => navigate('/auth/signin')}
            _hover={{ color: primaryColor }}>
            {intl.formatMessage({ id: 'auth.backToSignIn' })}
          </Link>
        </VStack>
      </Box>
    </Flex>
  );
};

export default ModernVerifyEmail;
