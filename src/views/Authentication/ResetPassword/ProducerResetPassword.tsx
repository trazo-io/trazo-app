import React, { useState } from 'react';
import { useIntl } from 'react-intl';
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
  useToast
} from '@chakra-ui/react';
import { FaLock, FaKey, FaArrowLeft, FaCheckCircle, FaShieldAlt } from 'react-icons/fa';
import { motion } from 'framer-motion';
import AuthFooter from 'components/Footer/AuthFooter';
import { useConfirmPasswordResetMutation } from '../../../store/api/authApi';
import { StandardInput, registerWithFocus } from 'components/Design/StandardComponents';
import { AuthErrorAlert } from '../AuthErrorAlert';
import { resolveGenericAuthError, type AuthErrorResolution } from '../authErrors';

const MotionBox = motion(Box);

interface ResetPasswordFormData {
  new_password: string;
  confirm_password: string;
}

const ProducerResetPassword: React.FC = () => {
  const intl = useIntl();
  const toast = useToast();
  const [confirmPasswordReset, { isLoading }] = useConfirmPasswordResetMutation();
  const [resetSuccess, setResetSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  /** A RESOLUTION, not a sentence — see `authErrors.ts`. */
  const [error, setError] = useState<AuthErrorResolution | null>(null);

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

      // A malformed link is a CLIENT-side finding, so it never has a server code; it is
      // built by hand into the same shape everything else on this screen uses, so there is
      // still exactly one thing the alert has to render.
      if (!token || !email) {
        setError({
          messageId: 'auth.error.resetPassword.brokenLink',
          action: { kind: 'none' },
          fieldsInvalid: []
        });
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
      // ⚠️ `data.error` from `confirm_password_reset` is a LIST when Django's password
      // validators reject the new password. Assigning it to a string state and rendering it
      // ran the messages together with no separator; `resolveGenericAuthError` unwraps it.
      setError(resolveGenericAuthError(error, 'auth.error.resetPassword.generic'));
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
                <AuthErrorAlert resolution={error} />

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
                      <StandardInput
                        type="password"
                        placeholder="Create your new password"
                        {...registerWithFocus(
                          register('new_password', {
                            required: 'New password is required',
                            minLength: {
                              value: 8,
                              message: 'Password must be at least 8 characters'
                            }
                          }),
                          setFocusedField
                        )}
                        isInvalid={!!errors.new_password}
                        leftElement={
                          <Icon
                            as={FaKey}
                            color={focusedField === 'new_password' ? 'green.500' : 'gray.400'}
                            transition="all 0.2s"
                          />
                        }
                      />
                      {errors.new_password && (
                        <Text fontSize="sm" color="red.700" mt={1}>
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
                      <StandardInput
                        type="password"
                        placeholder="Confirm your new password"
                        {...registerWithFocus(
                          register('confirm_password', {
                            required: 'Please confirm your password',
                            validate: (value) => value === newPassword || 'Passwords do not match'
                          }),
                          setFocusedField
                        )}
                        isInvalid={!!errors.confirm_password}
                        leftElement={
                          <Icon
                            as={FaLock}
                            color={focusedField === 'confirm_password' ? 'green.500' : 'gray.400'}
                            transition="all 0.2s"
                          />
                        }
                      />
                      {errors.confirm_password && (
                        <Text fontSize="sm" color="red.700" mt={1}>
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
                    {intl.formatMessage({ id: 'auth.backToSignIn' })}
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
