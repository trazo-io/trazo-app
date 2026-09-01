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

      // 🚀 2025 Best Practice: Context-aware success messaging
      const successMessage = isCompanyJoin
        ? {
            title: 'Email verified! Welcome to the team!',
            description:
              "Your account is verified and you've been added to the company. Taking you to your dashboard."
          }
        : {
            title: 'Email verified successfully!',
            description: 'Welcome to Trazo! Taking you to your dashboard.'
          };

      toast({
        title: successMessage.title,
        description: successMessage.description,
        status: 'success',
        duration: 4000,
        isClosable: true
      });

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
      if (error?.data?.error === 'User is already verified') {
        setStep('success');
        // For already verified users, also redirect to dashboard instead of sign-in
        setTimeout(() => {
          const dashboardPath =
            userType === 'consumer' ? '/admin/dashboard/impact' : '/admin/dashboard';
          navigate(dashboardPath);
        }, 1000);
      } else {
        setStep('error');
        toast({
          title: 'Verification failed',
          description: error?.data?.error || 'Please try again.',
          status: 'error',
          duration: 4000,
          isClosable: true
        });
      }
    }
  }, [isSuccess, isError, error, navigate, toast]);

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
      toast({
        title: 'Verification email sent',
        description: 'Please check your inbox for a new verification code.',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
      startResendCooldown();
    } catch (error) {
      toast({
        title: 'Failed to resend email',
        description: error?.data?.error || 'Please try again later.',
        status: 'error',
        duration: 4000,
        isClosable: true
      });
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
              {step === 'error' ? 'Verification failed' : 'Check your email'}
            </Text>
            <Text fontSize="sm" color="gray.500" textAlign="center">
              {step === 'error'
                ? 'Please check your code and try again, or request a new verification email.'
                : isCompanyJoin
                ? `We sent a verification code to ${email}. Once verified, you'll automatically join the company team.`
                : `We sent a verification code to ${email}. Enter the 6-digit code below.`}
            </Text>
            {isCompanyJoin && step !== 'error' && (
              <Text fontSize="xs" color="green.700" textAlign="center" mt={2} px={4}>
                After verification, you'll have immediate access to your team's dashboard and
                projects.
              </Text>
            )}
          </VStack>

          {/* Code Input */}
          {step !== 'error' && (
            <VStack spacing={4} w="full">
              <HStack spacing={3} justify="center">
                <PinInput
                  size="lg"
                  value={verificationCode}
                  onChange={setVerificationCode}
                  onComplete={handleCodeSubmit}
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
