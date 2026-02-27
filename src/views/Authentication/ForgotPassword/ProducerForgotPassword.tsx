import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Box,
  Grid,
  VStack,
  Text,
  Icon,
  HStack,
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
import { FaLeaf, FaLock, FaEnvelope, FaArrowLeft, FaCheckCircle, FaClock } from 'react-icons/fa';
import { motion } from 'framer-motion';
import AuthFooter from 'components/Footer/AuthFooter';
import { useRequestPasswordResetMutation } from '../../../store/api/authApi';

const MotionBox = motion(Box);

interface ForgotPasswordFormData {
  email: string;
}

const ProducerForgotPassword: React.FC = () => {
  const navigate = useNavigate();
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

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} flex="1" minH="calc(100vh - 80px)">
        {/* Left side - Green Brand Panel */}
        <Box
          bg="green.600"
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

          {/* Subtle background floating elements */}
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

          {/* Content */}
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
                Secure Account Recovery
              </Text>
              <Text fontSize="lg" opacity={0.9} fontWeight="400" lineHeight="1.6">
                Your carbon intelligence data is protected with enterprise-grade security. Reset
                your password safely and get back to tracking your environmental impact.
              </Text>
            </VStack>

            <VStack spacing={3} pt={4}>
              {[
                '15-minute secure token expiration',
                'One-time use password reset links',
                'Enhanced password validation'
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

        {/* Right side - Reset Form */}
        <Flex
          align="center"
          justify="center"
          bg={useColorModeValue('white', 'gray.900')}
          px={8}
          pt={'112px'}
          pb={12}
        >
          <MotionBox
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            w="full"
            maxW="420px"
            my={{ base: 4, lg: 8 }}
          >
            {emailSent ? (
              // Success State - Following exact Trazo design standards
              <VStack spacing={8} textAlign="center">
                {/* Clean Success Icon */}
                <Box
                  w="64px"
                  h="64px"
                  bg="green.500"
                  borderRadius="full"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  mb={2}
                >
                  <Icon as={FaCheckCircle} boxSize={8} color="white" />
                </Box>

                {/* Success Message */}
                <VStack spacing={3}>
                  <Text
                    fontSize="2xl"
                    fontWeight="700"
                    color={useColorModeValue('gray.900', 'white')}
                    letterSpacing="tight"
                  >
                    Check Your Email
                  </Text>
                  <Text
                    color={useColorModeValue('gray.500', 'gray.400')}
                    fontSize="md"
                    maxW="md"
                    lineHeight="1.6"
                    textAlign="center"
                  >
                    We've sent password reset instructions to
                  </Text>
                  <Text
                    fontWeight="600"
                    fontSize="lg"
                    color={useColorModeValue('gray.900', 'gray.100')}
                    letterSpacing="-0.5px"
                  >
                    {submittedEmail}
                  </Text>
                </VStack>

                {/* Instructions with Trazo styling */}
                <Box
                  w="full"
                  bg={useColorModeValue('blue.50', 'blue.900')}
                  border="1px solid"
                  borderColor={useColorModeValue('blue.200', 'blue.700')}
                  borderRadius="xl"
                  p={4}
                >
                  <VStack spacing={3} align="start">
                    <HStack spacing={3}>
                      <Icon as={FaClock} boxSize={4} color="blue.600" />
                      <Text fontSize="sm" color="blue.800" fontWeight="medium">
                        The reset link expires in 15 minutes
                      </Text>
                    </HStack>
                    <Text fontSize="sm" color="blue.700" lineHeight="1.5">
                      Don't see the email? Check your spam folder or click the button below to
                      request a new link.
                    </Text>
                  </VStack>
                </Box>

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
                    color="green.500"
                    fontSize="md"
                    fontWeight="600"
                    borderRadius="xl"
                    border="2px solid"
                    borderColor="green.500"
                    _hover={{
                      bg: 'green.50',
                      borderColor: 'green.600',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(76, 175, 80, 0.15)'
                    }}
                    _active={{
                      transform: 'translateY(0)'
                    }}
                    transition="all 0.2s"
                  >
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
                        color: 'green.500',
                        bg: useColorModeValue('gray.50', 'gray.700')
                      }}
                      transition="all 0.2s"
                    >
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
                      letterSpacing="tight"
                    >
                      Reset Your Password
                    </Text>
                    <Text
                      fontSize="md"
                      color={useColorModeValue('gray.500', 'gray.400')}
                      textAlign="center"
                    >
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
                      borderLeftColor="red.500"
                    >
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
                          mb={2}
                        >
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
                                ? 'green.500'
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
                              borderColor: 'green.500',
                              bg: useColorModeValue('white', 'gray.800'),
                              boxShadow: '0 0 0 4px rgba(5, 150, 105, 0.1)'
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
                        bg="green.500"
                        color="white"
                        fontSize="md"
                        fontWeight="600"
                        borderRadius="xl"
                        isLoading={isLoading}
                        loadingText="Sending Reset Link..."
                        isDisabled={!email}
                        _hover={{
                          bg: 'green.600',
                          transform: 'translateY(-1px)'
                        }}
                        _active={{
                          transform: 'translateY(0)'
                        }}
                        transition="all 0.2s"
                      >
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
                        color: 'green.500'
                      }}
                      transition="all 0.2s"
                    >
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
                  w="full"
                >
                  <Text
                    fontSize="xs"
                    color={useColorModeValue('gray.600', 'gray.400')}
                    textAlign="center"
                  >
                    For your security, password reset links expire after 15 minutes. If you don't
                    receive an email, check your spam folder.
                  </Text>
                </Box>
              </>
            )}
          </MotionBox>
        </Flex>
      </Grid>

      <AuthFooter />
    </Box>
  );
};

export default ProducerForgotPassword;
