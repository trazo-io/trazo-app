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
  Grid
} from '@chakra-ui/react';
import {
  FaGoogle,
  FaFacebook,
  FaApple,
  FaEnvelope,
  FaLock,
  FaBuilding,
  FaUser
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useSignUpMutation } from '../../../store/api/authApi';

// No assets needed for minimalist design

// Motion components
const MotionBox = motion(Box);

interface SignUpFormData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password2: string;
  acceptTerms: boolean;
}

const AppSignUp: React.FC = () => {
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
  const password2 = watch('password2');

  const onSubmit = async (data: SignUpFormData) => {
    try {
      setError(null);
      await signUp({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        password: data.password,
        user_type: 'PRODUCER'
      }).unwrap();

      toast({
        title: 'Account created successfully!',
        description: 'Welcome to Trazo. Please check your email to verify your account.',
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
    <Box minH="100vh" display="flex" flexDirection="column">
      <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} flex="1" minH="calc(100vh - 80px)">
        {/* Left side - 2025 Premium App Design */}
        <Box
          bg="green.600"
          display={{ base: 'none', lg: 'flex' }}
          alignItems="center"
          justifyContent="center"
          position="relative"
          overflow="hidden">
          {/* Sophisticated gradient foundation */}
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            bg="linear-gradient(135deg, rgba(255,255,255,0.01) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 100%)"
          />
          
          {/* Subtle background floating element - positioned to not interfere */}
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
          
          {/* Bottom accent element */}
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
          
          {/* Tiny accent dots */}
          <Box
            position="absolute"
            top="25%"
            left="20%"
            w="2px"
            h="2px"
            bg="rgba(255,255,255,0.20)"
            borderRadius="50%"
            zIndex={0}
          />
          
          <Box
            position="absolute"
            bottom="45%"
            right="15%"
            w="3px"
            h="3px"
            bg="rgba(255,255,255,0.18)"
            borderRadius="50%"
            zIndex={0}
          />

          <VStack
            spacing={8}
            position="relative"
            textAlign="center"
            color="white"
            px={12}
            maxW="lg"
            zIndex={10}>
            <VStack spacing={4}>
              <Text fontSize="4xl" fontWeight="800" lineHeight="1.1" letterSpacing="tight">
                Scale Your Carbon Intelligence
              </Text>
              <Text fontSize="lg" opacity={0.9} fontWeight="400" lineHeight="1.6">
                Join leading agricultural enterprises using Trazo to track carbon emissions, verify
                sustainability claims, and drive consumer transparency
              </Text>
            </VStack>

            <VStack spacing={4} pt={4}>
              <Text fontSize="sm" opacity={0.9} fontWeight="500">
                Trusted by agricultural businesses worldwide
              </Text>
              <VStack spacing={3}>
                {['USDA Verified Data', 'Blockchain Secured', 'Enterprise Ready'].map(
                  (feature, index) => (
                    <HStack key={index} spacing={3}>
                      <Box w={2} h={2} bg="white" borderRadius="50%" />
                      <Text fontSize="sm" fontWeight="500" opacity={0.9}>
                        {feature}
                      </Text>
                    </HStack>
                  )
                )}
              </VStack>
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
          pb={8}>
          <MotionBox
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            w="full"
            maxW="480px"
            my={{ base: 4, lg: 8 }}>
            {/* Header */}
            <VStack spacing={4} mb={6}>
              <VStack spacing={1}>
                <Text fontSize="xl" fontWeight="600" color={useColorModeValue('gray.900', 'white')}>
                  Create Business Account
                </Text>
                <Text
                  fontSize="sm"
                  color={useColorModeValue('gray.500', 'gray.400')}
                  textAlign="center">
                  Join leading agricultural enterprises
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
                  mb={6}>
                  <Text color="red.600" fontSize="sm">
                    {error}
                  </Text>
                </Box>
              )}

              <form onSubmit={handleSubmit(onSubmit)}>
                <VStack spacing={4}>
                  {/* Name fields */}
                  <Grid templateColumns="1fr 1fr" gap={3} w="full">
                    {renderInput('first_name', 'text', 'First name', FaUser, 'First Name', {
                      required: 'First name is required',
                      minLength: { value: 1, message: 'First name is required' },
                      maxLength: { value: 100, message: 'First name too long' },
                      pattern: {
                        value: /^[A-Za-z\s]+$/,
                        message: 'First name should only contain letters'
                      }
                    })}

                    {renderInput('last_name', 'text', 'Last name', FaUser, 'Last Name', {
                      required: 'Last name is required',
                      minLength: { value: 1, message: 'Last name is required' },
                      maxLength: { value: 100, message: 'Last name too long' },
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
                    'Enter business email address',
                    FaEnvelope,
                    'Business Email',
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
                    'Create secure password (8+ characters)',
                    FaLock,
                    'Password',
                    {
                      required: 'Password is required',
                      minLength: {
                        value: 8,
                        message: 'Password must be more than 8 characters'
                      },
                      maxLength: {
                        value: 32,
                        message: 'Password must be less than 32 characters'
                      }
                    }
                  )}

                  {/* Confirm password */}
                  {renderInput(
                    'password2',
                    'password',
                    'Confirm your password',
                    FaLock,
                    'Confirm Password',
                    {
                      required: 'Please confirm your password',
                      validate: (value: string) => value === password || 'Passwords do not match'
                    }
                  )}

                  {/* Terms checkbox */}
                  <Box w="full">
                    <Checkbox
                      size="md"
                      colorScheme="green"
                      spacing={3}
                      {...registerField('acceptTerms', {
                        required: 'You must accept the terms and conditions'
                      })}>
                      <Text fontSize="sm" color={useColorModeValue('gray.700', 'gray.300')}>
                        I agree to the{' '}
                        <Link to="/terms" target="_blank">
                          <Text
                            as="span"
                            color="green.500"
                            fontWeight="medium"
                            _hover={{ textDecoration: 'underline' }}>
                            Terms of Service
                          </Text>
                        </Link>{' '}
                        and{' '}
                        <Link to="/privacy" target="_blank">
                          <Text
                            as="span"
                            color="green.500"
                            fontWeight="medium"
                            _hover={{ textDecoration: 'underline' }}>
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
                    transition="all 0.2s">
                    Create Business Account
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
                    fontWeight="medium">
                    Or sign up with
                  </Text>
                  <Divider borderColor={useColorModeValue('gray.300', 'gray.600')} />
                </HStack>

                <HStack spacing={2} w="full">
                  {[
                    { icon: FaGoogle, color: '#EA4335', name: 'Google' },
                    { icon: FaFacebook, color: '#1877F2', name: 'Facebook' },
                    { icon: FaApple, color: useColorModeValue('black', 'white'), name: 'Apple' }
                  ].map((social) => (
                    <Button
                      key={social.name}
                      flex={1}
                      h="40px"
                      bg={useColorModeValue('white', 'gray.700')}
                      border="1px solid"
                      borderColor={useColorModeValue('gray.300', 'gray.600')}
                      borderRadius="lg"
                      onClick={() => handleSocialLogin(social.name)}
                      _hover={{
                        bg: useColorModeValue('gray.50', 'gray.600'),
                        borderColor: useColorModeValue('gray.400', 'gray.500')
                      }}
                      transition="all 0.2s">
                      <Icon as={social.icon} fontSize="18px" color={social.color} />
                    </Button>
                  ))}
                </HStack>
              </VStack>
            </Box>

            {/* Sign in link */}
            <Box textAlign="center" mt={4}>
              <Text fontSize="xs" color={useColorModeValue('gray.500', 'gray.400')}>
                Already have a business account?{' '}
                <Link to="/auth/signin">
                  <Text
                    as="span"
                    color="green.600"
                    fontWeight="semibold"
                    _hover={{
                      textDecoration: 'underline',
                      color: 'green.700'
                    }}
                    transition="all 0.2s">
                    Sign in
                  </Text>
                </Link>
              </Text>
            </Box>
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
        px={8}>
        <Flex
          maxW="7xl"
          mx="auto"
          direction={{ base: 'column', md: 'row' }}
          align="center"
          justify="space-between"
          gap={4}>
          <HStack spacing={6} flexWrap="wrap" justify="center">
            <Link to="/about">
              <Text
                fontSize="sm"
                color={useColorModeValue('gray.600', 'gray.400')}
                _hover={{ color: 'green.500' }}
                transition="color 0.2s">
                About
              </Text>
            </Link>
            <Link to="/why-us">
              <Text
                fontSize="sm"
                color={useColorModeValue('gray.600', 'gray.400')}
                _hover={{ color: 'green.500' }}
                transition="color 0.2s">
                Why Trazo?
              </Text>
            </Link>
            <Link to="/blog">
              <Text
                fontSize="sm"
                color={useColorModeValue('gray.600', 'gray.400')}
                _hover={{ color: 'green.500' }}
                transition="color 0.2s">
                Blog
              </Text>
            </Link>
            <Link to="/contact">
              <Text
                fontSize="sm"
                color={useColorModeValue('gray.600', 'gray.400')}
                _hover={{ color: 'green.500' }}
                transition="color 0.2s">
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

export default AppSignUp;
