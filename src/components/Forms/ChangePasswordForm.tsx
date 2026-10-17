import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
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
  Collapse
} from '@chakra-ui/react';
import { FaEye, FaEyeSlash, FaCheck, FaTimes } from 'react-icons/fa';
import { useChangePasswordMutation } from '../../store/api/authApi';
import { passwordValidator, PasswordValidationResult } from '../../utils/passwordValidation';
import {
  StandardCard,
  StandardField,
  StandardInput,
  StandardButton
} from '../Design/StandardComponents';

interface ChangePasswordFormData {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ChangePasswordFormProps {
  userType: 'producer' | 'consumer';
}

export const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({ userType }) => {
  const navigate = useNavigate();
  const intl = useIntl();
  const toast = useToast();
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidationResult | null>(
    null
  );
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError
  } = useForm<ChangePasswordFormData>();

  const newPassword = watch('newPassword');

  // Validate password as user types
  React.useEffect(() => {
    if (newPassword) {
      const validation = passwordValidator.validate(newPassword);
      setPasswordValidation(validation);
      setShowPasswordRequirements(true);
    } else {
      setPasswordValidation(null);
      setShowPasswordRequirements(false);
    }
  }, [newPassword]);

  const onSubmit = async (data: ChangePasswordFormData) => {
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

    try {
      await changePassword({
        old_password: data.oldPassword,
        new_password: data.newPassword
      }).unwrap();

      toast({
        title: intl.formatMessage({ id: 'auth.changePassword.toast.success.title' }),
        description: intl.formatMessage({ id: 'auth.changePassword.toast.success.body' }),
        status: 'success',
        duration: 5000,
        isClosable: true
      });

      // Redirect to login page
      if (userType === 'producer') {
        navigate('/auth');
      } else {
        navigate('/consumidor/auth');
      }
    } catch (error: any) {
      const errorMessage =
        error?.data?.detail ||
        error?.data?.error ||
        intl.formatMessage({ id: 'auth.changePassword.toast.failed.body' });
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

  return (
    <StandardCard
      title="Change Password"
      subtitle="Enter your current password and choose a new secure password">
      <form onSubmit={handleSubmit(onSubmit)}>
        <VStack spacing={6} align="stretch">
          {/* Current Password */}
          <StandardField label="Current Password" required error={errors.oldPassword?.message}>
            <InputGroup>
              <StandardInput
                type={showOldPassword ? 'text' : 'password'}
                placeholder="Enter current password"
                {...register('oldPassword', {
                  required: 'Current password is required'
                })}
              />
              <InputRightElement>
                <IconButton
                  aria-label={showOldPassword ? 'Hide password' : 'Show password'}
                  icon={showOldPassword ? <FaEyeSlash /> : <FaEye />}
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  variant="ghost"
                  size="sm"
                />
              </InputRightElement>
            </InputGroup>
          </StandardField>

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
            loadingText="Changing Password..."
            width="full">
            Change Password
          </StandardButton>
        </VStack>
      </form>
    </StandardCard>
  );
};
