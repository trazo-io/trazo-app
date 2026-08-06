import {
  Box,
  Button,
  CircularProgress,
  Flex,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Link,
  Text,
  useColorModeValue
} from '@chakra-ui/react';
import { FormProvider, useForm } from 'react-hook-form';
import React, { useEffect } from 'react';
import { object, string } from 'zod';
import { useNavigate } from 'react-router-dom';
import { StandardInput } from 'components/Design/StandardComponents';
import { useSignUpMutation } from 'store/api/authApi';
import { zodResolver } from '@hookform/resolvers/zod';
import consumerSignUpImage from 'assets/img/backgroundImage.png';

const registerSchema = object({
  first_name: string().min(1, 'Full name is required').max(100),
  last_name: string().min(1, 'Full name is required').max(100),
  email: string().min(1, 'Email address is required').email('Email Address is invalid'),
  password: string()
    .min(1, 'Password is required')
    .min(8, 'Password must be more than 8 characters')
    .max(32, 'Password must be less than 32 characters'),
  password2: string().min(1, 'Please confirm your password')
}).refine((data) => data.password === data.password2, {
  path: ['password2'],
  message: 'Passwords do not match'
});

export default function SignUpConsumer() {
  const titleColor = useColorModeValue('green.500', 'green.400');
  const textColor = useColorModeValue('gray.700', 'white');
  const bgColor = useColorModeValue('white', 'gray.700');
  const navigate = useNavigate();

  const methods = useForm({
    resolver: zodResolver(registerSchema)
  });

  const {
    reset,
    handleSubmit,
    formState: { errors, isSubmitSuccessful }
  } = methods;

  const [signUp, { isLoading, isSuccess, error, isError }] = useSignUpMutation();

  useEffect(() => {
    if (isSubmitSuccessful) {
      reset();
    }
  }, [isSubmitSuccessful]);

  const onSubmitHandler = async (values) => {
    try {
      await signUp({
        ...values,
        user_type: 3
      }).unwrap();
      navigate('/auth/verifyemail');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Flex direction="column" alignSelf="center" justifySelf="center" overflow="hidden">
      <Box
        position="absolute"
        minH={{ base: '70vh', md: '50vh' }}
        w={{ md: 'calc(100vw - 50px)' }}
        borderRadius={{ md: '15px' }}
        left="0"
        right="0"
        bgRepeat="no-repeat"
        overflow="hidden"
        zIndex="-1"
        top="0"
        bgImage={consumerSignUpImage}
        marginInlineEnd={'25px'}
        _before={{
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          background: 'linear-gradient(180deg, rgba(0,128,0,0.85) 0%, rgba(0,128,0,0.6) 100%)',
          borderRadius: '15px',
          zIndex: 0
        }}
        bgSize="cover"
        mx={{ md: 'auto' }}
        mt={{ md: '14px' }}
      />
      <Flex
        direction="column"
        textAlign="center"
        justifyContent="center"
        align="center"
        pt={{ base: '155px', md: '155px' }}
        pb="0px"
      >
        <Text fontSize={{ base: '24px', md: '34px' }} color="white" mb="14px" fontWeight="bold">
          Know How Your Food Was Grown
        </Text>
        <Text
          fontSize={{ base: '16px', md: '18px' }}
          color="white"
          fontWeight="normal"
          px="20px"
          mb="84px"
          maxW="550px"
        >
          Create your account to discover carbon footprints and make informed sustainable choices
        </Text>
      </Flex>
      <Flex alignItems="center" justifyContent="center" mb="60px" mt="20px">
        <Flex
          direction="column"
          w="445px"
          background="transparent"
          borderRadius="15px"
          p="40px"
          mx={{ base: '100px' }}
          bg={bgColor}
          boxShadow="0 20px 27px 0 rgb(0 0 0 / 5%)"
        >
          <Text fontSize="xl" color={textColor} fontWeight="bold" textAlign="center" mb="22px">
            Register With
          </Text>
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmitHandler)}>
              <FormControl mb={4}>
                <FormLabel color="gray.700" fontWeight="500" mb={1}>First Name</FormLabel>
                <StandardInput
                  {...methods.register('first_name')}
                  placeholder="Your first name"
                  h="44px"
                  fontSize="sm"
                />
                {errors.first_name && (
                  <FormErrorMessage>{errors.first_name.message}</FormErrorMessage>
                )}
              </FormControl>
              
              <FormControl mb={4}>
                <FormLabel color="gray.700" fontWeight="500" mb={1}>Last Name</FormLabel>
                <StandardInput
                  {...methods.register('last_name')}
                  placeholder="Your last name"
                  h="44px"
                  fontSize="sm"
                />
                {errors.last_name && (
                  <FormErrorMessage>{errors.last_name.message}</FormErrorMessage>
                )}
              </FormControl>
              
              <FormControl mb={4}>
                <FormLabel color="gray.700" fontWeight="500" mb={1}>Email</FormLabel>
                <StandardInput
                  {...methods.register('email')}
                  placeholder="Your email address"
                  type="email"
                  h="44px"
                  fontSize="sm"
                />
                {errors.email && (
                  <FormErrorMessage>{errors.email.message}</FormErrorMessage>
                )}
              </FormControl>
              
              <FormControl mb={4}>
                <FormLabel color="gray.700" fontWeight="500" mb={1}>Password</FormLabel>
                <StandardInput
                  {...methods.register('password')}
                  placeholder="Your password"
                  type="password"
                  h="44px"
                  fontSize="sm"
                />
                {errors.password && (
                  <FormErrorMessage>{errors.password.message}</FormErrorMessage>
                )}
              </FormControl>
              
              <FormControl mb={4}>
                <FormLabel color="gray.700" fontWeight="500" mb={1}>Confirm Password</FormLabel>
                <StandardInput
                  {...methods.register('password2')}
                  placeholder="Confirm your password"
                  type="password"
                  h="44px"
                  fontSize="sm"
                />
                {errors.password2 && (
                  <FormErrorMessage>{errors.password2.message}</FormErrorMessage>
                )}
              </FormControl>
              <Button
                type="submit"
                bg="green.500"
                color="white"
                w="100%"
                h="44px"
                fontSize="sm"
                fontWeight="600"
                borderRadius="xl"
                mt="12px"
                mb="24px"
                _hover={{
                  bg: 'green.600',
                  transform: 'translateY(-1px)'
                }}
                _active={{
                  bg: 'green.700'
                }}
                isLoading={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </Button>
            </form>
          </FormProvider>
          <Flex
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            maxW="100%"
            mt="0px"
          >
            <Text color={textColor} fontWeight="medium">
              Already have an account?
              <Link
                color={titleColor}
                as="span"
                ms="5px"
                fontWeight="bold"
                onClick={() => navigate('/auth/signin')}
              >
                Sign In
              </Link>
            </Text>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
}
