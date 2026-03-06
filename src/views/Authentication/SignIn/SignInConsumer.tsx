import {
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  Link,
  Switch,
  Text,
  useColorModeValue
} from '@chakra-ui/react';
import { FormProvider, useForm } from 'react-hook-form';
import React, { useEffect } from 'react';
import { object, string } from 'zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { executeAuthRedirectAction, buildAuthRedirectUrl } from '../../../utils/authRedirect';
import { StandardInput } from 'components/Design/StandardComponents';
import { login as loginAction } from 'store/features/authSlice';
import consumerSignInImage from 'assets/img/consumer-signin.png';
import { useDispatch } from 'react-redux';
import { useLoginMutation } from 'store/api/authApi';
import { zodResolver } from '@hookform/resolvers/zod';

const loginSchema = object({
  email: string().min(1, 'Email address is required').email('Email Address is invalid'),
  password: string()
    .min(1, 'Password is required')
    .min(8, 'Password must be more than 8 characters')
    .max(32, 'Password must be less than 32 characters')
});

export default function SignInConsumer() {
  const dispatch = useDispatch();
  const titleColor = useColorModeValue('green.500', 'green.400');
  const textColor = useColorModeValue('gray.400', 'white');

  const methods = useForm({
    resolver: zodResolver(loginSchema)
  });

  const [loginMutation, { data, isError, error, isLoading, isSuccess }] = useLoginMutation();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    reset,
    handleSubmit,
    formState: { errors, isSubmitSuccessful }
  } = methods;

  useEffect(() => {
    if (data && isSuccess) {
      console.log('🔐 SignInConsumer: Login successful, dispatching action');

      // First check if there's a pending auth redirect URL
      const pendingRedirectUrl = buildAuthRedirectUrl();
      if (pendingRedirectUrl) {
        console.log('🔐 SignInConsumer: Found pending redirect URL:', pendingRedirectUrl);
        // Dispatch login action with redirect URL
        dispatch(loginAction({ ...data, redirectUrl: pendingRedirectUrl }));

        // Execute the redirect immediately
        const redirectExecuted = executeAuthRedirectAction(navigate);
        if (redirectExecuted) {
          console.log('🔐 SignInConsumer: Auth redirect action executed successfully');
          return;
        }
      } else {
        // No pending action, dispatch login normally
        dispatch(loginAction(data));
      }

      // Default redirect logic for normal sign-ins
      const params = new URLSearchParams(location.search);
      const nextPath = params.get('next');
      const defaultPath = nextPath || location.state?.next || '/admin/dashboard/impact';

      console.log(
        '🔐 SignInConsumer: No pending action, redirecting to default path:',
        defaultPath
      );
      navigate(defaultPath);
    }
  }, [data, dispatch, isSuccess, location, navigate]);

  useEffect(() => {
    if (isSubmitSuccessful) {
      reset();
    }
  }, [isSubmitSuccessful]);

  const onSubmitHandler = async (values) => {
    try {
      await loginMutation({
        ...values,
        user_type: 'CONSUMER'
      }).unwrap();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Flex position="relative" mb="40px">
      <Flex
        h={{ sm: 'initial', md: '75vh', lg: '85vh' }}
        w="100%"
        maxW="1044px"
        mx="auto"
        justifyContent="space-between"
        mb="30px"
        pt={{ base: '150px', sm: '150px', md: '0px' }}
      >
        <Flex
          alignItems="center"
          justifyContent="start"
          style={{ userSelect: 'none' }}
          w={{ base: '100%', md: '50%', lg: '42%' }}
        >
          <Flex
            direction="column"
            w="100%"
            background="transparent"
            p="48px"
            mt={{ md: '150px', lg: '80px' }}
          >
            <Heading color={titleColor} fontSize="32px" mb="10px">
              Know Your Food's Climate Impact
            </Heading>
            <Text mb="24px" ms="4px" color={textColor} fontWeight="bold" fontSize="14px">
              Scan products to see documented farming practices and support climate-positive farming
            </Text>
            <Flex mb="12px" align="center" gap={2}>
              <Box w="4px" h="4px" bg="green.500" borderRadius="full" />
              <Text fontSize="xs" color="gray.600">
                Blockchain-verified transparency
              </Text>
            </Flex>
            <FormProvider {...methods}>
              <form onSubmit={handleSubmit(onSubmitHandler)}>
                <FormControl isInvalid={isError} mb={4}>
                  <FormLabel color="gray.700" fontWeight="500" mb={1}>
                    Email
                  </FormLabel>
                  <StandardInput
                    {...methods.register('email')}
                    placeholder="Your email address"
                    type="email"
                    h="44px"
                    fontSize="sm"
                  />
                  {errors.email && <FormErrorMessage>{errors.email.message}</FormErrorMessage>}
                </FormControl>

                <FormControl isInvalid={isError} mb={4}>
                  <FormLabel color="gray.700" fontWeight="500" mb={1}>
                    Password
                  </FormLabel>
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

                <FormControl isInvalid={isError}>
                  {isError && <FormErrorMessage pl="4px">{error.data.detail}</FormErrorMessage>}
                  <FormControl display="flex" alignItems="center">
                    <Switch id="remember-login" colorScheme="green" me="10px" />
                    <FormLabel htmlFor="remember-login" mb="0" ms="1" fontWeight="normal">
                      Remember me
                    </FormLabel>
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
                    mb="20px"
                    mt="20px"
                    _hover={{
                      bg: 'green.600',
                      transform: 'translateY(-1px)'
                    }}
                    _active={{
                      bg: 'green.700'
                    }}
                    isLoading={isLoading}
                  >
                    Sign In
                  </Button>
                </FormControl>
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
                Don't have an account?
                <Link
                  color={titleColor}
                  as="span"
                  ms="5px"
                  fontWeight="bold"
                  onClick={() => navigate('/auth/signup')}
                >
                  Sign Up
                </Link>
              </Text>
            </Flex>
          </Flex>
        </Flex>
        <Box
          display={{ base: 'none', md: 'block' }}
          overflowX="hidden"
          h="100%"
          w={{
            base: '60vw',
            md: '51vw',
            lg: '58vw',
            xl: '40vw'
          }}
          position="absolute"
          right="0px"
        >
          <Box
            bgImage={consumerSignInImage}
            w="100%"
            h="100%"
            bgSize="cover"
            bgPosition="center"
            position="absolute"
            borderBottomLeftRadius="20px"
          ></Box>
        </Box>
      </Flex>
    </Flex>
  );
}
