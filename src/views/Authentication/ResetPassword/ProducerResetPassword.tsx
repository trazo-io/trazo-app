import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Box,
  VStack,
  Text,
  Icon,
  HStack,
  useColorModeValue,
  Flex,
  Button,
  InputGroup,
  InputLeftElement,
  useToast
} from '@chakra-ui/react';
import { FaLock, FaKey, FaArrowLeft, FaCheckCircle, FaShieldAlt } from 'react-icons/fa';
import { motion } from 'framer-motion';
import AuthFooter from 'components/Footer/AuthFooter';
import { useConfirmPasswordResetMutation } from '../../../store/api/authApi';

const MotionBox = motion(Box);

interface ResetPasswordFormData {
  new_password: string;
  confirm_password: string;
}

const ProducerResetPassword: React.FC = () => {
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

  /* Same tokens as AppSignIn / AppSignUp / ProducerForgotPassword. */
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'whiteAlpha.200');

  /*
   * Quiet centered card, matching the other three auth pages.
   *
   * The green panel it replaces read "Enhanced Security … Your carbon intelligence platform
   * requires the highest level of protection for your valuable environmental data." Same
   * pre-pivot positioning as the forgot-password panel, and the same reason to drop it: Trazo
   * documents recordkeeping, and a password form is not where a product re-argues what it is.
   * The live password-strength meter below is the real security affordance on this page.
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
          {resetSuccess ? (
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
                  Password Reset Complete
                </Text>
                <Text
                  color={useColorModeValue('gray.500', 'gray.400')}
                  fontSize="md"
                  maxW="md"
                  lineHeight="1.6"
                  textAlign="center">
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
                p={4}>
                <VStack spacing={3} align="start">
                  <HStack spacing={3}>
                    <Icon as={FaShieldAlt} boxSize={4} color="green.600" />
                    <Text fontSize="sm" color="green.800" fontWeight="medium">
                      Your account is now secured
                    </Text>
                  </HStack>
                  {/* Was "continue managing your carbon intelligence data" — pre-pivot
                        positioning, and the last of it on this page. */}
                  <Text fontSize="sm" color="green.700" lineHeight="1.5">
                    You can now sign in with your new password and pick your records back up where
                    you left them.
                  </Text>
                </VStack>
              </Box>

              {/* Action Buttons with Trazo styling */}
              <VStack spacing={4} w="full">
                <Link to="/auth/signin">
                  <Button
                    w="full"
                    h="52px"
                    bg="green.700"
                    color="white"
                    fontSize="md"
                    fontWeight="600"
                    borderRadius="xl"
                    _hover={{
                      bg: 'green.800',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(46, 125, 50, 0.15)'
                    }}
                    _active={{
                      transform: 'translateY(0)'
                    }}
                    transition="all 0.2s">
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
                    letterSpacing="tight">
                    Create New Password
                  </Text>
                  <Text
                    fontSize="md"
                    color={useColorModeValue('gray.500', 'gray.400')}
                    textAlign="center">
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
                    borderLeftColor="red.500">
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
                        mb={2}>
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
                              ? 'green.600'
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
                            borderColor: 'green.600',
                            bg: useColorModeValue('white', 'gray.800'),
                            boxShadow: '0 0 0 4px rgba(46, 125, 50, 0.15)'
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
                        mb={2}>
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
                              ? 'green.600'
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
                            borderColor: 'green.600',
                            bg: useColorModeValue('white', 'gray.800'),
                            boxShadow: '0 0 0 4px rgba(46, 125, 50, 0.15)'
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
                      bg="green.700"
                      color="white"
                      fontSize="md"
                      fontWeight="600"
                      borderRadius="xl"
                      isLoading={isLoading}
                      loadingText="Resetting Password..."
                      isDisabled={!newPassword || !confirmPassword}
                      _hover={{
                        bg: 'green.800',
                        transform: 'translateY(-1px)'
                      }}
                      _active={{
                        transform: 'translateY(0)'
                      }}
                      transition="all 0.2s">
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
                  Your password will be encrypted with enterprise-grade security. Make sure it's at
                  least 8 characters long and includes mixed case letters.
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

export default ProducerResetPassword;
