import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Box,
  VStack,
  Text,
  Icon,
  useColorModeValue,
  Flex,
  Button,
  InputGroup,
  InputLeftElement,
  useToast,
  Alert,
  AlertIcon,
  AlertDescription
} from '@chakra-ui/react';
import { FaEnvelope, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';
import { motion } from 'framer-motion';
import AuthFooter from 'components/Footer/AuthFooter';
import { useRequestPasswordResetMutation } from '../../../store/api/authApi';

const MotionBox = motion(Box);

interface ForgotPasswordFormData {
  email: string;
}

const ProducerForgotPassword: React.FC = () => {
  const toast = useToast();
  const [requestPasswordReset, { isLoading }] = useRequestPasswordResetMutation();
  const [emailSent, setEmailSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<ForgotPasswordFormData>();

  const email = watch('email');

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setError(null);
      await requestPasswordReset({ email: data.email.toLowerCase() }).unwrap();

      setSubmittedEmail(data.email);
      setEmailSent(true);

      toast({
        title: 'Reset Link Sent',
        description: 'Check your email for password reset instructions',
        status: 'success',
        duration: 5000,
        isClosable: true
      });
    } catch (error: any) {
      const errorMessage = error?.data?.detail || 'Something went wrong. Please try again.';
      setError(errorMessage);
    }
  };

  /* Same tokens as AppSignIn / AppSignUp: #FBFCFA is the LANDING's `--background`. */
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'whiteAlpha.200');

  /*
   * Quiet centered card — the third and fourth auth pages to get it, after sign-in and sign-up.
   * MEASURED before: 47.5% of the screen was green, against the landing's 4.3%.
   *
   * The panel this replaces also carried pre-pivot copy — "Your carbon intelligence data is
   * protected with enterprise-grade security … get back to tracking your environmental impact."
   * Trazo has not led on carbon since the transparency-first pivot, and a password-reset page is
   * the last place to re-assert a positioning the product dropped. The three security bullets
   * ("15-minute secure token expiration", "One-time use password reset links", "Enhanced
   * password validation") went with it: the page already states the 15-minute expiry in its own
   * security note, where it is useful rather than decorative.
   */
  return (
    <Box flex="1" display="flex" flexDirection="column">
      <Flex
        flex="1"
        align="center"
        justify="center"
        px={{ base: 4, sm: 6 }}
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
          {emailSent ? (
            // Success State - Following exact Trazo design standards
            <VStack spacing={8} textAlign="center">
              {/* Clean Success Icon */}
              <Box
                w="64px"
                h="64px"
                bg="green.700"
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
                mb={2}>
                <Icon as={FaCheckCircle} boxSize={8} color="white" />
              </Box>

              {/* Success Message */}
              <VStack spacing={3}>
                <Text
                  fontSize="2xl"
                  fontWeight="700"
                  color={useColorModeValue('gray.900', 'white')}
                  letterSpacing="tight">
                  Check Your Email
                </Text>
                <Text
                  color={useColorModeValue('gray.500', 'gray.400')}
                  fontSize="md"
                  maxW="md"
                  lineHeight="1.6"
                  textAlign="center">
                  We've sent password reset instructions to
                </Text>
                <Text
                  fontWeight="600"
                  fontSize="lg"
                  color={useColorModeValue('gray.900', 'gray.100')}
                  letterSpacing="-0.5px">
                  {submittedEmail}
                </Text>
              </VStack>

              {/*
                  A real Alert, not a hand-rolled blue box. The colour rule allows blue in
                  exactly ONE place — Chakra's `Alert status="info"`, the universal convention —
                  and this was five loose blue.* tokens imitating it without the semantics
                  (no role, no icon mapping). Using the component gets both.
                */}
              <Alert status="info" borderRadius="xl" alignItems="flex-start">
                <AlertIcon />
                <VStack spacing={1} align="start">
                  <Text fontSize="sm" fontWeight="medium">
                    The reset link expires in 15 minutes
                  </Text>
                  <AlertDescription fontSize="sm" lineHeight="1.5">
                    Don't see the email? Check your spam folder or click the button below to request
                    a new link.
                  </AlertDescription>
                </VStack>
              </Alert>

              {/* Action Buttons with Trazo styling */}
              <VStack spacing={4} w="full">
                <Button
                  onClick={() => {
                    setEmailSent(false);
                    setSubmittedEmail('');
                  }}
                  w="full"
                  h="52px"
                  bg="white"
                  color="green.700"
                  fontSize="md"
                  fontWeight="600"
                  borderRadius="xl"
                  border="2px solid"
                  borderColor="green.600"
                  _hover={{
                    bg: 'green.50',
                    borderColor: 'green.700',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(46, 125, 50, 0.15)'
                  }}
                  _active={{
                    transform: 'translateY(0)'
                  }}
                  transition="all 0.2s">
                  Send Another Email
                </Button>

                <Link to="/auth/signin">
                  <Button
                    variant="ghost"
                    leftIcon={<FaArrowLeft />}
                    color={useColorModeValue('gray.600', 'gray.400')}
                    fontSize="sm"
                    h="44px"
                    px={6}
                    _hover={{
                      color: 'green.700',
                      bg: useColorModeValue('gray.50', 'gray.700')
                    }}
                    transition="all 0.2s">
                    Back to Sign In
                  </Button>
                </Link>
              </VStack>
            </VStack>
          ) : (
            // Form State
            <>
              {/* Header */}
              <VStack spacing={6} mb={10}>
                <VStack spacing={2}>
                  <Text
                    fontSize="2xl"
                    fontWeight="700"
                    color={useColorModeValue('gray.900', 'white')}
                    letterSpacing="tight">
                    Reset Your Password
                  </Text>
                  <Text
                    fontSize="md"
                    color={useColorModeValue('gray.500', 'gray.400')}
                    textAlign="center">
                    Enter your email address and we'll send you a link to reset your password
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
                        Email Address *
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
                      isLoading={isLoading}
                      loadingText="Sending Reset Link..."
                      isDisabled={!email}
                      _hover={{
                        bg: 'green.800',
                        transform: 'translateY(-1px)'
                      }}
                      _active={{
                        transform: 'translateY(0)'
                      }}
                      transition="all 0.2s">
                      Send Reset Link
                    </Button>
                  </VStack>
                </form>
              </Box>

              {/* Back to Sign In */}
              <Box textAlign="center" mt={8}>
                <Link to="/auth/signin">
                  <Button
                    variant="ghost"
                    leftIcon={<FaArrowLeft />}
                    color={useColorModeValue('gray.600', 'gray.400')}
                    fontSize="sm"
                    _hover={{
                      color: 'green.700'
                    }}
                    transition="all 0.2s">
                    Back to Sign In
                  </Button>
                </Link>
              </Box>

              {/* Security Note */}
              <Box
                mt={6}
                p={4}
                bg={useColorModeValue('gray.50', 'gray.800')}
                borderRadius="xl"
                w="full">
                <Text
                  fontSize="xs"
                  color={useColorModeValue('gray.600', 'gray.400')}
                  textAlign="center">
                  For your security, password reset links expire after 15 minutes. If you don't
                  receive an email, check your spam folder.
                </Text>
              </Box>
            </>
          )}
        </MotionBox>
      </Flex>

      <AuthFooter />
    </Box>
  );
};

export default ProducerForgotPassword;
