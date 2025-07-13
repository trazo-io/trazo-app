import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Box,
  VStack,
  HStack,
  Text,
  Divider,
  useToast,
  Icon,
  Flex,
  Image,
  Button,
  InputGroup,
  InputLeftElement,
  useColorModeValue,
  Checkbox,
  Grid,
  Badge
} from '@chakra-ui/react';
import { FaGoogle, FaFacebook, FaApple, FaEnvelope, FaLock, FaUser } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useSignUpMutation } from '../../../store/api/authApi';

// No assets needed for minimalist design

// Motion components
const MotionBox = motion(Box);

interface SignUpFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  subscribeNewsletter: boolean;
}

const ConsumerSignUp: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [signUp, { isLoading }] = useSignUpMutation();
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const {
    register: registerField,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<SignUpFormData>();

  const password = watch('password');

  const onSubmit = async (data: SignUpFormData) => {
    try {
      setError(null);
      await signUp({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        password: data.password,
        user_type: 'CONSUMER',
        subscribe_newsletter: data.subscribeNewsletter
      }).unwrap();

      toast({
        title: 'Welcome to Trazo!',
        description:
          'Your account has been created. Please check your email to verify your account.',
        status: 'success',
        duration: 5000,
        isClosable: true
      });

      navigate('/auth/verifyemail', { state: { email: data.email } });
    } catch (err: any) {
      const errorMessage =
        err?.data?.detail || err?.data?.email?.[0] || 'Registration failed. Please try again.';
      setError(errorMessage);
    }
  };

  const handleSocialLogin = (provider: string) => {
    toast({
      title: 'Coming Soon',
      description: `${provider} sign up will be available soon.`,
      status: 'info',
      duration: 3000,
      isClosable: true
    });
  };

  const renderInput = (
    name: keyof SignUpFormData,
    type: string,
    placeholder: string,
    icon: any,
    label: string,
    validation: any
  ) => (
    <Box w="full">
      <Text fontSize="sm" fontWeight="500" color={useColorModeValue('gray.700', 'gray.300')} mb={1}>
        {label}
      </Text>
      <InputGroup size="lg">
        <InputLeftElement pointerEvents="none">
          <Icon
            as={icon}
            color={focusedField === name ? 'green.500' : 'gray.400'}
            transition="all 0.2s"
          />
        </InputLeftElement>
        <Box
          as="input"
          type={type}
          placeholder={placeholder}
          pl="3rem"
          w="full"
          h="44px"
          fontSize="md"
          bg={useColorModeValue('gray.50', 'gray.900')}
          border="1px solid"
          borderColor={
            errors[name]
              ? 'red.300'
              : focusedField === name
              ? 'green.500'
              : useColorModeValue('gray.300', 'gray.600')
          }
          borderRadius="lg"
          _hover={{
            borderColor: errors[name] ? 'red.300' : useColorModeValue('gray.400', 'gray.500')
          }}
          _focus={{
            outline: 'none',
            borderColor: 'green.500',
            bg: useColorModeValue('white', 'gray.800'),
            boxShadow: '0 0 0 3px rgba(72, 187, 120, 0.1)'
          }}
          transition="all 0.2s"
          {...registerField(name, validation)}
          onFocus={() => setFocusedField(name)}
          onBlur={() => setFocusedField(null)}
        />
      </InputGroup>
      {errors[name] && (
        <Text fontSize="sm" color="red.500" mt={1}>
          {errors[name]?.message}
        </Text>
      )}
    </Box>
  );

  return (
    <Grid
      templateColumns={{ base: '1fr', lg: '1fr 1fr' }}
      minH="calc(100vh - 80px)"
      maxH="calc(100vh - 80px)"
      overflow="hidden"
    >
      {/* Left side - Modern Brand Section */}
      <Box
        bg="linear-gradient(135deg, #0891b2 0%, #0e7490 50%, #155e75 100%)"
        display={{ base: 'none', lg: 'flex' }}
        alignItems="center"
        justifyContent="center"
        position="relative"
        overflow="hidden"
      >
        {/* Subtle geometric patterns */}
        <Box
          position="absolute"
          top="-10%"
          right="-10%"
          w="300px"
          h="300px"
          borderRadius="50%"
          bg="whiteAlpha.100"
          filter="blur(100px)"
        />
        <Box
          position="absolute"
          bottom="-15%"
          left="-15%"
          w="400px"
          h="400px"
          borderRadius="50%"
          bg="whiteAlpha.50"
          filter="blur(120px)"
        />

        <VStack spacing={8} position="relative" textAlign="center" color="white" px={12} maxW="lg">
          <VStack spacing={4}>
            <Text fontSize="4xl" fontWeight="800" lineHeight="1.1" letterSpacing="tight">
              Join the Carbon Transparency Movement
            </Text>
            <Text fontSize="lg" opacity={0.9} fontWeight="400" lineHeight="1.6">
              Create a free account to discover carbon footprints, connect with sustainable farmers,
              and make informed choices about your food
            </Text>
          </VStack>

          <VStack spacing={4} pt={4}>
            <VStack spacing={3}>
              {['Free Forever', 'Verified Carbon Data', 'Impact Tracking'].map((feature, index) => (
                <HStack key={index} spacing={3}>
                  <Box w={2} h={2} bg="white" borderRadius="50%" />
                  <Text fontSize="sm" fontWeight="500" opacity={0.9}>
                    {feature}
                  </Text>
                </HStack>
              ))}
            </VStack>
            <Text fontSize="sm" opacity={0.8} fontWeight="500" mt={2}>
              Join thousands making sustainable food choices
            </Text>
          </VStack>
        </VStack>
      </Box>

      {/* Right side - Sign Up Form */}
      <Flex
        align="center"
        justify="center"
        bg={useColorModeValue('white', 'gray.900')}
        px={8}
        pt={24}
        pb={8}
      >
        <MotionBox
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          w="full"
          maxW="480px"
          my={{ base: 4, lg: 8 }}
        >
          {/* Header */}
          <VStack spacing={4} mb={6}>
            <VStack spacing={1}>
              <Text fontSize="xl" fontWeight="600" color={useColorModeValue('gray.900', 'white')}>
                Create Free Account
              </Text>
              <Text
                fontSize="sm"
                color={useColorModeValue('gray.500', 'gray.400')}
                textAlign="center"
              >
                Start your sustainable food journey
              </Text>
            </VStack>
          </VStack>

          {/* Main Form */}
          <Box w="full">
            {error && (
              <Box
                bg="red.50"
                border="1px solid"
                borderColor="red.200"
                borderRadius="lg"
                p={4}
                mb={6}
              >
                <Text color="red.600" fontSize="sm">
                  {error}
                </Text>
              </Box>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              <VStack spacing={4}>
                {/* Name fields */}
                <Grid templateColumns="1fr 1fr" gap={3} w="full">
                  {renderInput('firstName', 'text', 'First name', FaUser, 'First Name', {
                    required: 'First name is required',
                    pattern: {
                      value: /^[A-Za-z\s]+$/,
                      message: 'First name should only contain letters'
                    }
                  })}

                  {renderInput('lastName', 'text', 'Last name', FaUser, 'Last Name', {
                    required: 'Last name is required',
                    pattern: {
                      value: /^[A-Za-z\s]+$/,
                      message: 'Last name should only contain letters'
                    }
                  })}
                </Grid>

                {/* Email */}
                {renderInput(
                  'email',
                  'email',
                  'Enter your email address',
                  FaEnvelope,
                  'Email Address',
                  {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  }
                )}

                {/* Password */}
                {renderInput(
                  'password',
                  'password',
                  'Create password (8+ characters)',
                  FaLock,
                  'Password',
                  {
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters'
                    }
                  }
                )}

                {/* Confirm password */}
                {renderInput(
                  'confirmPassword',
                  'password',
                  'Confirm your password',
                  FaLock,
                  'Confirm Password',
                  {
                    required: 'Please confirm your password',
                    validate: (value: string) => value === password || 'Passwords do not match'
                  }
                )}

                {/* Checkboxes */}
                <VStack spacing={3} w="full" align="start">
                  <Box>
                    <Checkbox
                      size="md"
                      colorScheme="green"
                      spacing={3}
                      {...registerField('acceptTerms', {
                        required: 'You must accept the terms and conditions'
                      })}
                    >
                      <Text fontSize="sm" color={useColorModeValue('gray.700', 'gray.300')}>
                        I agree to the{' '}
                        <Link to="/terms" target="_blank">
                          <Text
                            as="span"
                            color="green.600"
                            fontWeight="medium"
                            _hover={{ textDecoration: 'underline' }}
                          >
                            Terms of Service
                          </Text>
                        </Link>{' '}
                        and{' '}
                        <Link to="/privacy" target="_blank">
                          <Text
                            as="span"
                            color="green.600"
                            fontWeight="medium"
                            _hover={{ textDecoration: 'underline' }}
                          >
                            Privacy Policy
                          </Text>
                        </Link>
                      </Text>
                    </Checkbox>
                    {errors.acceptTerms && (
                      <Text fontSize="sm" color="red.500" mt={1}>
                        {errors.acceptTerms.message}
                      </Text>
                    )}
                  </Box>

                  <Checkbox
                    size="md"
                    colorScheme="green"
                    spacing={3}
                    {...registerField('subscribeNewsletter')}
                  >
                    <Text fontSize="sm" color={useColorModeValue('gray.700', 'gray.300')}>
                      Send me updates about sustainable food choices and new features
                    </Text>
                  </Checkbox>
                </VStack>

                {/* Sign up button */}
                <Button
                  type="submit"
                  w="full"
                  h="44px"
                  bg="green.500"
                  color="white"
                  fontSize="sm"
                  fontWeight="600"
                  borderRadius="xl"
                  isLoading={isLoading}
                  loadingText="Creating account..."
                  _hover={{
                    bg: 'green.600',
                    transform: 'translateY(-1px)'
                  }}
                  _active={{
                    transform: 'translateY(0)'
                  }}
                  transition="all 0.2s"
                >
                  Create Free Account
                </Button>
              </VStack>
            </form>

            {/* Social signup section */}
            <VStack spacing={3} mt={6}>
              <HStack w="full" spacing={4}>
                <Divider borderColor={useColorModeValue('gray.300', 'gray.600')} />
                <Text
                  fontSize="sm"
                  color={useColorModeValue('gray.500', 'gray.400')}
                  flexShrink={0}
                  fontWeight="medium"
                >
                  Or sign up with
                </Text>
                <Divider borderColor={useColorModeValue('gray.300', 'gray.600')} />
              </HStack>

              <VStack spacing={2} w="full">
                {[
                  {
                    icon: FaGoogle,
                    color: '#EA4335',
                    name: 'Google',
                    text: 'Continue with Google'
                  },
                  {
                    icon: FaFacebook,
                    color: '#1877F2',
                    name: 'Facebook',
                    text: 'Continue with Facebook'
                  },
                  {
                    icon: FaApple,
                    color: useColorModeValue('black', 'white'),
                    name: 'Apple',
                    text: 'Continue with Apple'
                  }
                ].map((social) => (
                  <Button
                    key={social.name}
                    w="full"
                    h="40px"
                    bg={useColorModeValue('white', 'gray.700')}
                    border="1px solid"
                    borderColor={useColorModeValue('gray.300', 'gray.600')}
                    borderRadius="lg"
                    onClick={() => handleSocialLogin(social.name)}
                    justifyContent="center"
                    leftIcon={<Icon as={social.icon} fontSize="18px" color={social.color} />}
                    _hover={{
                      bg: useColorModeValue('gray.50', 'gray.600'),
                      borderColor: useColorModeValue('gray.400', 'gray.500')
                    }}
                    transition="all 0.2s"
                  >
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color={useColorModeValue('gray.700', 'gray.300')}
                    >
                      {social.text}
                    </Text>
                  </Button>
                ))}
              </VStack>
            </VStack>
          </Box>

          {/* Sign in section */}
          <VStack spacing={3} mt={4}>
            <Box textAlign="center">
              <Text fontSize="xs" color={useColorModeValue('gray.500', 'gray.400')}>
                Already have an account?{' '}
                <Link to="/consumer/auth/signin">
                  <Text
                    as="span"
                    color="green.600"
                    fontWeight="semibold"
                    _hover={{
                      textDecoration: 'underline',
                      color: 'green.700'
                    }}
                    transition="all 0.2s"
                  >
                    Sign in
                  </Text>
                </Link>
              </Text>
            </Box>

            <Box textAlign="center">
              <Text fontSize="sm" color={useColorModeValue('gray.500', 'gray.500')}>
                Are you a producer?{' '}
                <Link to="/auth/signup">
                  <Text
                    as="span"
                    color="green.600"
                    _hover={{
                      textDecoration: 'underline',
                      color: 'green.700'
                    }}
                    transition="all 0.2s"
                  >
                    Create business account
                  </Text>
                </Link>
              </Text>
            </Box>
          </VStack>
        </MotionBox>
      </Flex>
    </Grid>
  );
};

export default ConsumerSignUp;
