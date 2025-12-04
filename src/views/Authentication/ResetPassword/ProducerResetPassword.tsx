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
import { FaLeaf, FaLock, FaKey, FaArrowLeft, FaCheckCircle, FaShieldAlt } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useConfirmPasswordResetMutation } from '../../../store/api/authApi';

const MotionBox = motion(Box);

interface ResetPasswordFormData {
  new_password: string;
  confirm_password: string;
}

const ProducerResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [confirmPasswordReset, { isLoading }] = useConfirmPasswordResetMutation();
  const [resetSuccess, setResetSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get both token and email from URL search params (sent in reset link)
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<ResetPasswordFormData>();

  const newPassword = watch('new_password');
  const confirmPassword = watch('confirm_password');

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setError(null);

      if (!token) {
        setError('Reset token is missing from the link. Please request a new password reset.');
        return;
      }

      if (!email) {
        setError(
          'Email parameter is missing from the reset link. Please request a new password reset.'
        );
        return;
      }

      await confirmPasswordReset({
        token: token,
        email: email,
        new_password: data.new_password
      }).unwrap();

      setResetSuccess(true);

      toast({
        title: 'Password Reset Successfully',
        description: 'Your password has been updated',
        status: 'success',
        duration: 5000,
        isClosable: true
      });
    } catch (error: any) {
      const errorMessage =
        error?.data?.detail || error?.data?.error || 'Something went wrong. Please try again.';
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
                Enhanced Security
              </Text>
              <Text fontSize="lg" opacity={0.9} fontWeight="400" lineHeight="1.6">
                Create a strong password that meets our enterprise security standards. Your carbon
                intelligence platform requires the highest level of protection for your valuable
                environmental data.
              </Text>
            </VStack>

            <VStack spacing={3} pt={4}>
              {[
                '12+ character minimum length',
                'Mixed case & special characters',
                'Real-time strength validation'
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
            {resetSuccess ? (
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
                    Password Reset Complete
                  </Text>
                  <Text
                    color={useColorModeValue('gray.500', 'gray.400')}
                    fontSize="md"
                    maxW="md"
                    lineHeight="1.6"
                    textAlign="center"
                  >
                    Your password has been successfully updated with enhanced security.
                  </Text>
                </VStack>

                {/* Instructions with Trazo styling */}
                <Box
                  w="full"
                  bg={useColorModeValue('green.50', 'green.900')}
                  border="1px solid"
                  borderColor={useColorModeValue('green.200', 'green.700')}
                  borderRadius="xl"
                  p={4}
                >
                  <VStack spacing={3} align="start">
                    <HStack spacing={3}>
                      <Icon as={FaShieldAlt} boxSize={4} color="green.600" />
                      <Text fontSize="sm" color="green.800" fontWeight="medium">
                        Your account is now secured
                      </Text>
                    </HStack>
                    <Text fontSize="sm" color="green.700" lineHeight="1.5">
                      You can now sign in with your new password and continue managing your carbon
                      intelligence data.
                    </Text>
                  </VStack>
                </Box>

                {/* Action Buttons with Trazo styling */}
                <VStack spacing={4} w="full">
                  <Link to="/auth/signin">
                    <Button
                      w="full"
                      h="52px"
                      bg="green.500"
                      color="white"
                      fontSize="md"
                      fontWeight="600"
                      borderRadius="xl"
                      _hover={{
                        bg: 'green.600',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(76, 175, 80, 0.15)'
                      }}
                      _active={{
                        transform: 'translateY(0)'
                      }}
                      transition="all 0.2s"
                    >
                      Sign In to Your Account
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
                      Create New Password
                    </Text>
                    <Text
                      fontSize="md"
                      color={useColorModeValue('gray.500', 'gray.400')}
                      textAlign="center"
                    >
                      Enter a strong password that meets our security requirements
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
                      {/* New Password field */}
                      <Box w="full">
                        <Text
                          fontSize="sm"
                          fontWeight="medium"
                          color={useColorModeValue('gray.700', 'gray.300')}
                          mb={2}
                        >
                          New Password *
                        </Text>
                        <InputGroup size="lg">
                          <InputLeftElement pointerEvents="none">
                            <Icon
                              as={FaKey}
                              color={focusedField === 'new_password' ? 'green.500' : 'gray.400'}
                              transition="all 0.2s"
                            />
                          </InputLeftElement>
                          <Box
                            as="input"
                            type="password"
                            placeholder="Create your new password"
                            pl="3rem"
                            w="full"
                            h="44px"
                            fontSize="sm"
                            bg={useColorModeValue('gray.50', 'gray.900')}
                            border="1px solid"
                            borderColor={
                              errors.new_password
                                ? 'red.300'
                                : focusedField === 'new_password'
                                ? 'green.500'
                                : useColorModeValue('gray.200', 'gray.600')
                            }
                            borderRadius="xl"
                            _hover={{
                              borderColor: errors.new_password
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
                            {...register('new_password', {
                              required: 'New password is required',
                              minLength: {
                                value: 8,
                                message: 'Password must be at least 8 characters'
                              }
                            })}
                            onFocus={() => setFocusedField('new_password')}
                            onBlur={() => setFocusedField(null)}
                          />
                        </InputGroup>
                        {errors.new_password && (
                          <Text fontSize="sm" color="red.500" mt={1}>
                            {errors.new_password.message}
                          </Text>
                        )}
                      </Box>

                      {/* Confirm Password field */}
                      <Box w="full">
                        <Text
                          fontSize="sm"
                          fontWeight="medium"
                          color={useColorModeValue('gray.700', 'gray.300')}
                          mb={2}
                        >
                          Confirm Password *
                        </Text>
                        <InputGroup size="lg">
                          <InputLeftElement pointerEvents="none">
                            <Icon
                              as={FaLock}
                              color={focusedField === 'confirm_password' ? 'green.500' : 'gray.400'}
                              transition="all 0.2s"
                            />
                          </InputLeftElement>
                          <Box
                            as="input"
                            type="password"
                            placeholder="Confirm your new password"
                            pl="3rem"
                            w="full"
                            h="44px"
                            fontSize="sm"
                            bg={useColorModeValue('gray.50', 'gray.900')}
                            border="1px solid"
                            borderColor={
                              errors.confirm_password
                                ? 'red.300'
                                : focusedField === 'confirm_password'
                                ? 'green.500'
                                : useColorModeValue('gray.200', 'gray.600')
                            }
                            borderRadius="xl"
                            _hover={{
                              borderColor: errors.confirm_password
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
                            {...register('confirm_password', {
                              required: 'Please confirm your password',
                              validate: (value) => value === newPassword || 'Passwords do not match'
                            })}
                            onFocus={() => setFocusedField('confirm_password')}
                            onBlur={() => setFocusedField(null)}
                          />
                        </InputGroup>
                        {errors.confirm_password && (
                          <Text fontSize="sm" color="red.500" mt={1}>
                            {errors.confirm_password.message}
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
                        loadingText="Resetting Password..."
                        isDisabled={!newPassword || !confirmPassword}
                        _hover={{
                          bg: 'green.600',
                          transform: 'translateY(-1px)'
                        }}
                        _active={{
                          transform: 'translateY(0)'
                        }}
                        transition="all 0.2s"
                      >
                        Reset Password
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
                    Your password will be encrypted with enterprise-grade security. Make sure it's
                    at least 8 characters long and includes mixed case letters.
                  </Text>
                </Box>
              </>
            )}
          </MotionBox>
        </Flex>
      </Grid>

      {/* Professional Footer */}
      <Box
        as="footer"
        bg={useColorModeValue('gray.50', 'gray.900')}
        borderTop="1px solid"
        borderColor={useColorModeValue('gray.200', 'gray.700')}
        py={6}
        px={8}
      >
        <Flex
          maxW="7xl"
          mx="auto"
          direction={{ base: 'column', md: 'row' }}
          align="center"
          justify="space-between"
          gap={4}
        >
          <HStack spacing={6} flexWrap="wrap" justify="center">
            <Link to="/about">
              <Text
                fontSize="sm"
                color={useColorModeValue('gray.600', 'gray.400')}
                _hover={{ color: 'green.500' }}
                transition="color 0.2s"
              >
                About
              </Text>
            </Link>
            <Link to="/why-us">
              <Text
                fontSize="sm"
                color={useColorModeValue('gray.600', 'gray.400')}
                _hover={{ color: 'green.500' }}
                transition="color 0.2s"
              >
                Why Trazo?
              </Text>
            </Link>
            <Link to="/blog">
              <Text
                fontSize="sm"
                color={useColorModeValue('gray.600', 'gray.400')}
                _hover={{ color: 'green.500' }}
                transition="color 0.2s"
              >
                Blog
              </Text>
            </Link>
            <Link to="/contact">
              <Text
                fontSize="sm"
                color={useColorModeValue('gray.600', 'gray.400')}
                _hover={{ color: 'green.500' }}
                transition="color 0.2s"
              >
                Contact
              </Text>
            </Link>
          </HStack>

          <Text fontSize="xs" color={useColorModeValue('gray.500', 'gray.400')}>
            © 2025 Trazo. Professional Carbon Intelligence Platform.
          </Text>
        </Flex>
      </Box>
    </Box>
  );
};

export default ProducerResetPassword;
