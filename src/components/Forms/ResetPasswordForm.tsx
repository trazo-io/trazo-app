import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  VStack,
  Text,
  useToast,
  InputGroup,
  InputRightElement,
  IconButton,
  Progress,
  Box,
  List,
  ListItem,
  ListIcon,
  Collapse,
  Button,
  Alert,
  AlertIcon,
  Icon
} from '@chakra-ui/react';
import { FaEye, FaEyeSlash, FaCheck, FaTimes, FaLock, FaCheckCircle } from 'react-icons/fa';
import { useConfirmPasswordResetMutation } from '../../store/api/authApi';
import { passwordValidator, PasswordValidationResult } from '../../utils/passwordValidation';
import {
  StandardCard,
  StandardField,
  StandardInput,
  StandardButton
} from '../Design/StandardComponents';

interface ResetPasswordFormData {
  newPassword: string;
  confirmPassword: string;
}

interface ResetPasswordFormProps {
  userType: 'producer' | 'consumer';
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ userType }) => {
  const navigate = useNavigate();
  const intl = useIntl();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [confirmPasswordReset, { isLoading }] = useConfirmPasswordResetMutation();

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidationResult | null>(
    null
  );
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Get token and email from URL parameters
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError
  } = useForm<ResetPasswordFormData>();

  const newPassword = watch('newPassword');

  // Validate password as user types
  useEffect(() => {
    if (newPassword) {
      const validation = passwordValidator.validate(newPassword);
      setPasswordValidation(validation);
      setShowPasswordRequirements(true);
    } else {
      setPasswordValidation(null);
      setShowPasswordRequirements(false);
    }
  }, [newPassword]);

  // Check if token and email are present
  useEffect(() => {
    if (!token || !email) {
      toast({
        title: intl.formatMessage({ id: 'auth.resetPassword.toast.invalidLink.title' }),
        description: intl.formatMessage({ id: 'auth.resetPassword.toast.invalidLink.body' }),
        status: 'error',
        duration: 5000,
        isClosable: true
      });
      navigate(userType === 'producer' ? '/auth/signin' : '/consumidor/auth/signin');
    }
  }, [token, email, navigate, userType, toast]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    // Validate passwords match
    if (data.newPassword !== data.confirmPassword) {
      setError('confirmPassword', {
        type: 'manual',
        message: 'Passwords do not match'
      });
      return;
    }

    // Validate password strength
    const validation = passwordValidator.validate(data.newPassword);
    if (!validation.isValid) {
      toast({
        title: intl.formatMessage({ id: 'auth.password.toast.requirementsNotMet' }),
        description: validation.errors[0],
        status: 'error',
        duration: 5000,
        isClosable: true
      });
      return;
    }

    if (!token || !email) {
      toast({
        title: intl.formatMessage({ id: 'app.error' }),
        description: intl.formatMessage({ id: 'auth.resetPassword.toast.invalidToken.body' }),
        status: 'error',
        duration: 5000,
        isClosable: true
      });
      return;
    }

    try {
      await confirmPasswordReset({
        token,
        email: decodeURIComponent(email),
        new_password: data.newPassword
      }).unwrap();

      setResetSuccess(true);

      toast({
        title: intl.formatMessage({ id: 'auth.resetPassword.toast.success.title' }),
        description: intl.formatMessage({ id: 'auth.resetPassword.toast.success.body' }),
        status: 'success',
        duration: 5000,
        isClosable: true
      });

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate(userType === 'producer' ? '/auth/signin' : '/consumidor/auth/signin');
      }, 3000);
    } catch (error: any) {
      const errorMessage =
        error?.data?.detail ||
        error?.data?.error ||
        intl.formatMessage({ id: 'auth.resetPassword.toast.failed.body' });
      toast({
        title: intl.formatMessage({ id: 'app.error' }),
        description: Array.isArray(errorMessage) ? errorMessage[0] : errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const getPasswordStrengthColor = () => {
    if (!passwordValidation) return 'gray.300';
    return passwordValidator.getStrengthColor(passwordValidation.score);
  };

  const getPasswordStrengthLabel = () => {
    if (!passwordValidation) return '';
    return passwordValidator.getStrengthLabel(passwordValidation.score);
  };

  const getSignInLink = () => {
    return userType === 'producer' ? '/auth/signin' : '/consumidor/auth/signin';
  };

  if (resetSuccess) {
    return (
      <StandardCard>
        <VStack spacing={6} textAlign="center">
          <Box>
            <Icon
              as={FaCheckCircle}
              boxSize={16}
              color={userType === 'producer' ? 'green.500' : 'blue.500'}
            />
          </Box>

          <VStack spacing={3}>
            <Text fontSize="xl" fontWeight="semibold" color="gray.800">
              Password Reset Successfully
            </Text>
            <Text color="gray.600" fontSize="sm" maxW="md" lineHeight="1.6">
              Your password has been updated successfully. You can now sign in with your new
              password.
            </Text>
          </VStack>

          <Alert status="success" borderColor="green.200">
            <AlertIcon color="green.600" />
            <Text fontSize="sm" color="green.800">
              Redirecting you to sign in page in 3 seconds...
            </Text>
          </Alert>

          <Button
            onClick={() => navigate(getSignInLink())}
            colorScheme={userType === 'producer' ? 'green' : 'blue'}
            size="lg"
            width="full">
            Go to Sign In
          </Button>
        </VStack>
      </StandardCard>
    );
  }

  return (
    <StandardCard>
      <VStack spacing={6} textAlign="center">
        {/* Header */}
        <VStack spacing={3}>
          <Icon
            as={FaLock}
            boxSize={8}
            color={userType === 'producer' ? 'green.500' : 'blue.500'}
          />
          <Text fontSize="xl" fontWeight="semibold" color="gray.800">
            Create New Password
          </Text>
          <Text color="gray.600" fontSize="sm" maxW="md" lineHeight="1.6">
            Your new password must be different from your previous password and meet our security
            requirements.
          </Text>
        </VStack>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
          <VStack spacing={6} align="stretch">
            {/* New Password */}
            <StandardField
              label="New Password"
              required
              error={errors.newPassword?.message}
              helpText="Choose a strong password that meets all requirements">
              <InputGroup>
                <StandardInput
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  {...register('newPassword', {
                    required: 'New password is required',
                    minLength: {
                      value: 12,
                      message: 'Password must be at least 12 characters'
                    }
                  })}
                  onFocus={() => setShowPasswordRequirements(true)}
                />
                <InputRightElement>
                  <IconButton
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    icon={showNewPassword ? <FaEyeSlash /> : <FaEye />}
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    variant="ghost"
                    size="sm"
                  />
                </InputRightElement>
              </InputGroup>
            </StandardField>

            {/* Password Strength Indicator */}
            {passwordValidation && (
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  Password Strength: {getPasswordStrengthLabel()}
                </Text>
                <Progress
                  value={passwordValidation.score}
                  colorScheme={getPasswordStrengthColor().split('.')[0]}
                  size="sm"
                  borderRadius="md"
                />
              </Box>
            )}

            {/* Password Requirements */}
            <Collapse in={showPasswordRequirements} animateOpacity>
              <Box bg="gray.50" p={4} borderRadius="lg" borderWidth="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="semibold" mb={2}>
                  Password Requirements:
                </Text>
                <List spacing={1} fontSize="sm">
                  <ListItem>
                    <ListIcon
                      as={newPassword?.length >= 12 ? FaCheck : FaTimes}
                      color={newPassword?.length >= 12 ? 'green.500' : 'gray.400'}
                    />
                    At least 12 characters long
                  </ListItem>
                  <ListItem>
                    <ListIcon
                      as={/[A-Z]/.test(newPassword || '') ? FaCheck : FaTimes}
                      color={/[A-Z]/.test(newPassword || '') ? 'green.500' : 'gray.400'}
                    />
                    One uppercase letter (A-Z)
                  </ListItem>
                  <ListItem>
                    <ListIcon
                      as={/[a-z]/.test(newPassword || '') ? FaCheck : FaTimes}
                      color={/[a-z]/.test(newPassword || '') ? 'green.500' : 'gray.400'}
                    />
                    One lowercase letter (a-z)
                  </ListItem>
                  <ListItem>
                    <ListIcon
                      as={/\d/.test(newPassword || '') ? FaCheck : FaTimes}
                      color={/\d/.test(newPassword || '') ? 'green.500' : 'gray.400'}
                    />
                    One number (0-9)
                  </ListItem>
                  <ListItem>
                    <ListIcon
                      as={/[!@#$%^&*(),.?":{}|<>]/.test(newPassword || '') ? FaCheck : FaTimes}
                      color={
                        /[!@#$%^&*(),.?":{}|<>]/.test(newPassword || '') ? 'green.500' : 'gray.400'
                      }
                    />
                    One special character (!@#$%^&*(),.?":{}|&lt;&gt;)
                  </ListItem>
                </List>
                {passwordValidation && passwordValidation.warnings.length > 0 && (
                  <Box mt={3}>
                    <Text fontSize="sm" color="orange.600" fontWeight="medium">
                      Warnings:
                    </Text>
                    {passwordValidation.warnings.map((warning, index) => (
                      <Text key={index} fontSize="sm" color="orange.600">
                        • {warning}
                      </Text>
                    ))}
                  </Box>
                )}
              </Box>
            </Collapse>

            {/* Confirm Password */}
            <StandardField
              label="Confirm New Password"
              required
              error={errors.confirmPassword?.message}>
              <InputGroup>
                <StandardInput
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) => value === newPassword || 'Passwords do not match'
                  })}
                />
                <InputRightElement>
                  <IconButton
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    icon={showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    variant="ghost"
                    size="sm"
                  />
                </InputRightElement>
              </InputGroup>
            </StandardField>

            {/* Submit Button */}
            <StandardButton
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              loadingText="Resetting Password..."
              width="full">
              Reset Password
            </StandardButton>
          </VStack>
        </form>
      </VStack>
    </StandardCard>
  );
};
