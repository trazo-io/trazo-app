import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import {
  VStack,
  Text,
  useToast,
  InputGroup,
  InputLeftElement,
  Icon,
  Flex,
  Box,
  Button,
  Alert,
  AlertIcon,
  AlertDescription
} from '@chakra-ui/react';
import { FaEnvelope, FaArrowLeft, FaCheckCircle, FaClock } from 'react-icons/fa';
import { useRequestPasswordResetMutation } from '../../store/api/authApi';
import {
  StandardCard,
  StandardField,
  StandardInput,
  StandardButton
} from '../Design/StandardComponents';

interface ForgotPasswordFormData {
  email: string;
}

interface ForgotPasswordFormProps {
  userType: 'producer' | 'consumer';
  onBack?: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ 
  userType, 
  onBack 
}) => {
  const toast = useToast();
  const [requestPasswordReset, { isLoading }] = useRequestPasswordResetMutation();
  const [emailSent, setEmailSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<ForgotPasswordFormData>();

  const email = watch('email');

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
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
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const getBackLink = () => {
    return userType === 'producer' ? '/auth/signin' : '/consumidor/auth/signin';
  };

  if (emailSent) {
    return (
      <StandardCard>
        <VStack spacing={6} textAlign="center">
          {/* Success Icon */}
          <Box>
            <Icon 
              as={FaCheckCircle} 
              boxSize={16} 
              color={userType === 'producer' ? 'green.500' : 'blue.500'}
            />
          </Box>

          {/* Success Message */}
          <VStack spacing={3}>
            <Text fontSize="xl" fontWeight="semibold" color="gray.800">
              Check Your Email
            </Text>
            <Text color="gray.600" fontSize="sm" maxW="md" lineHeight="1.6">
              We've sent password reset instructions to{' '}
              <Text as="span" fontWeight="medium" color="gray.800">
                {submittedEmail}
              </Text>
            </Text>
          </VStack>

          {/* Instructions */}
          <Alert status="info" borderRadius="lg" bg="blue.50" borderColor="blue.200">
            <AlertIcon color="blue.600" />
            <AlertDescription fontSize="sm" color="blue.800">
              <VStack align="start" spacing={2}>
                <Flex align="center" gap={2}>
                  <Icon as={FaClock} boxSize={3} />
                  <Text>The reset link expires in 15 minutes</Text>
                </Flex>
                <Text>
                  Don't see the email? Check your spam folder or request a new link.
                </Text>
              </VStack>
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <VStack spacing={3} w="full">
            <StandardButton
              onClick={() => {
                setEmailSent(false);
                setSubmittedEmail('');
              }}
              variant="outline"
              width="full"
            >
              Send Another Email
            </StandardButton>
            
            <Link to={getBackLink()}>
              <Button
                variant="ghost"
                leftIcon={<FaArrowLeft />}
                color="gray.600"
                fontSize="sm"
              >
                Back to Sign In
              </Button>
            </Link>
          </VStack>
        </VStack>
      </StandardCard>
    );
  }

  return (
    <StandardCard>
      <VStack spacing={6} textAlign="center">
        {/* Header */}
        <VStack spacing={3}>
          <Text fontSize="xl" fontWeight="semibold" color="gray.800">
            Reset Your Password
          </Text>
          <Text color="gray.600" fontSize="sm" maxW="md" lineHeight="1.6">
            {userType === 'producer' 
              ? "Enter your email address and we'll send you a link to reset your password and get back to managing your carbon intelligence."
              : "Enter your email address and we'll send you a link to reset your password and continue your sustainable journey."
            }
          </Text>
        </VStack>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
          <VStack spacing={6} align="stretch">
            <StandardField
              label="Email Address"
              required
              error={errors.email?.message}
            >
              <InputGroup>
                <InputLeftElement>
                  <Icon as={FaEnvelope} color="gray.400" />
                </InputLeftElement>
                <StandardInput
                  type="email"
                  placeholder="Enter your email address"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Please enter a valid email address'
                    }
                  })}
                />
              </InputGroup>
            </StandardField>

            <StandardButton
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              loadingText="Sending Reset Link..."
              width="full"
              isDisabled={!email}
            >
              Send Reset Link
            </StandardButton>
          </VStack>
        </form>

        {/* Back to Sign In */}
        <Link to={getBackLink()}>
          <Button
            variant="ghost"
            leftIcon={<FaArrowLeft />}
            color="gray.600"
            fontSize="sm"
          >
            Back to Sign In
          </Button>
        </Link>

        {/* Security Note */}
        <Box mt={4} p={4} bg="gray.50" borderRadius="lg" w="full">
          <Text fontSize="xs" color="gray.600" textAlign="center">
            For your security, password reset links expire after 15 minutes.
            If you don't receive an email, check your spam folder.
          </Text>
        </Box>
      </VStack>
    </StandardCard>
  );
};