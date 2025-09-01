import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Icon,
  useColorModeValue,
  useToast,
  Circle,
  Flex,
  Divider,
  Link
} from '@chakra-ui/react';
import {
  FaEnvelope,
  FaCheckCircle,
  FaArrowLeft,
  FaRedo
} from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import { useResendVerificationEmailMutation } from 'store/api/authApi';

interface EmailVerificationWaitingProps {}

const EmailVerificationWaiting: React.FC<EmailVerificationWaitingProps> = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [resendCooldown, setResendCooldown] = useState(0);
  const [emailSent, setEmailSent] = useState(false);
  
  // Get email from navigation state
  const userEmail = location.state?.email || 'your email';
  const isCompanyJoin = location.state?.companyJoin || false;
  const customMessage = location.state?.message;
  
  // Determine back navigation based on current subdomain
  const getBackPath = () => {
    const host = window.location.host;
    if (host.includes('consumer')) {
      return '/auth/signup'; // Consumer signup
    }
    return '/auth/signup'; // Producer signup (default)
  };
  
  const [resendEmail, { isLoading: isResending }] = useResendVerificationEmailMutation();
  
  // Trazo theme colors
  const bgGradient = useColorModeValue(
    'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
    'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)'
  );
  const cardBg = useColorModeValue('white', 'gray.700');
  const textPrimary = useColorModeValue('gray.800', 'white');
  const textSecondary = useColorModeValue('gray.600', 'gray.300');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Handle resend email
  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;
    
    try {
      await resendEmail({ email: userEmail }).unwrap();
      setEmailSent(true);
      setResendCooldown(60); // 60 second cooldown
      
      toast({
        title: 'Email sent!',
        description: 'We\'ve sent another verification email to your inbox.',
        status: 'success',
        duration: 4000,
        isClosable: true
      });
    } catch (error: any) {
      toast({
        title: 'Failed to resend email',
        description: error?.data?.message || 'Please try again later.',
        status: 'error',
        duration: 4000,
        isClosable: true
      });
    }
  };

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Auto-set initial email sent state
  useEffect(() => {
    setEmailSent(true);
  }, []);

  return (
    <Box
      minH="100vh"
      background={bgGradient}
      py={{ base: 8, md: 16 }}
      px={{ base: 4, md: 8 }}>
      
      {/* Main Container */}
      <Flex
        maxW="lg"
        mx="auto"
        direction="column"
        align="center"
        justify="center"
        minH={{ base: 'auto', md: '80vh' }}>
        
        {/* Back Button */}
        <HStack
          w="full"
          justify="flex-start"
          mb={{ base: 6, md: 8 }}>
          <Button
            leftIcon={<FaArrowLeft />}
            variant="ghost"
            size="sm"
            onClick={() => navigate(getBackPath())}
            color={textSecondary}
            _hover={{ color: textPrimary }}>
            Back to signup
          </Button>
        </HStack>

        {/* Main Card */}
        <Box
          bg={cardBg}
          borderRadius="2xl"
          boxShadow="xl"
          p={{ base: 8, md: 10 }}
          w="full"
          border="1px solid"
          borderColor={borderColor}
          textAlign="center">
          
          {/* Progress Indicator */}
          <HStack justify="center" spacing={4} mb={8}>
            <Circle size="32px" bg="green.500" color="white">
              <Icon as={FaCheckCircle} boxSize={4} />
            </Circle>
            <Divider flex={1} borderColor="green.500" />
            <Circle size="32px" bg="green.100" border="2px solid" borderColor="green.500">
              <Text fontSize="xs" fontWeight="bold" color="green.600">2</Text>
            </Circle>
            <Divider flex={1} borderColor="gray.300" />
            <Circle size="32px" bg="gray.100" border="2px solid" borderColor="gray.300">
              <Text fontSize="xs" fontWeight="bold" color="gray.500">3</Text>
            </Circle>
          </HStack>

          {/* Main Icon */}
          <Box mb={6}>
            <Circle size="80px" bg="green.50" mx="auto" mb={4}>
              <Icon as={FaEnvelope} boxSize={10} color="green.500" />
            </Circle>
          </Box>

          {/* Main Content */}
          <VStack spacing={4} mb={8}>
            <Text
              fontSize={{ base: 'xl', md: '2xl' }}
              fontWeight="bold"
              color={textPrimary}>
              Check your email
            </Text>
            
            <Text
              fontSize="md"
              color={textSecondary}
              lineHeight="1.6"
              maxW="md">
              {customMessage || (
                isCompanyJoin
                  ? `We've sent a verification email to help you join the company team.`
                  : `We've sent a verification email to get you started.`
              )}
            </Text>

            {/* Email Display */}
            <Box
              bg="gray.50"
              borderRadius="lg"
              px={4}
              py={3}
              border="1px solid"
              borderColor={borderColor}>
              <Text
                fontSize="sm"
                fontWeight="semibold"
                color={textPrimary}
                fontFamily="mono">
                {userEmail}
              </Text>
            </Box>

            {/* Next Steps */}
            <Text
              fontSize="sm"
              color={textSecondary}
              textAlign="center">
              Click the link in the email to verify your account and{' '}
              {isCompanyJoin ? 'join the company' : 'complete your registration'}.
            </Text>
          </VStack>

          {/* Action Buttons */}
          <VStack spacing={4}>
            <Button
              leftIcon={<FaRedo />}
              colorScheme="green"
              variant="outline"
              size="lg"
              onClick={handleResendEmail}
              isLoading={isResending}
              isDisabled={resendCooldown > 0}
              loadingText="Sending..."
              w="full">
              {resendCooldown > 0 
                ? `Resend in ${resendCooldown}s` 
                : emailSent 
                  ? 'Send again'
                  : 'Resend email'
              }
            </Button>

            <Text fontSize="xs" color={textSecondary} textAlign="center">
              Didn't receive the email? Check your spam folder or{' '}
              <Link color="green.500" href="mailto:support@trazo.io">
                contact support
              </Link>
            </Text>
          </VStack>
        </Box>

        {/* Footer Help */}
        <Text
          fontSize="xs"
          color={textSecondary}
          textAlign="center"
          mt={8}
          maxW="md">
          Having trouble? We're here to help at{' '}
          <Link color="green.500" href="mailto:support@trazo.io">
            support@trazo.io
          </Link>
        </Text>
      </Flex>
    </Box>
  );
};

export default EmailVerificationWaiting;