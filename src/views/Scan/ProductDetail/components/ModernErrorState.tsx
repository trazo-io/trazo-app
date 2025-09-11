import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  useColorModeValue,
  Icon,
  Container,
  Circle,
  Divider
} from '@chakra-ui/react';
import {
  FaExclamationTriangle,
  FaQrcode,
  FaRedo,
  FaHome,
  FaShieldAlt,
  FaLeaf
} from 'react-icons/fa';

interface ModernErrorStateProps {
  type: 'qr_verification' | 'network' | 'not_found' | 'general';
  title?: string;
  message?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
}

export const ModernErrorState: React.FC<ModernErrorStateProps> = ({
  type,
  title,
  message,
  onRetry,
  onGoHome
}) => {
  // Trazo design system colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  const getErrorConfig = () => {
    const configs = {
      qr_verification: {
        icon: FaQrcode,
        title: title || 'QR Code Verification Failed',
        message:
          message ||
          'This QR code could not be verified. Please try scanning again or contact support if the problem persists.',
        iconColor: 'red.500',
        bgColor: 'red.50',
        borderColor: 'red.200',
        suggestions: [
          'Ensure good lighting when scanning',
          'Hold camera steady and at proper distance',
          'Check if QR code is damaged or obscured'
        ]
      },
      network: {
        icon: FaExclamationTriangle,
        title: title || 'Connection Problem',
        message:
          message ||
          'Unable to load product information. Please check your internet connection and try again.',
        iconColor: 'orange.500',
        bgColor: 'orange.50',
        borderColor: 'orange.200',
        suggestions: [
          'Check your internet connection',
          'Try switching between WiFi and mobile data',
          'Wait a moment and retry'
        ]
      },
      not_found: {
        icon: FaQrcode,
        title: title || 'Product Not Found',
        message:
          message ||
          'This product information is not available. It may have been removed or the QR code is invalid.',
        iconColor: 'gray.500',
        bgColor: 'gray.50',
        borderColor: 'gray.200',
        suggestions: [
          'Verify you scanned the correct QR code',
          'Check if the product is still available',
          'Contact the farm or supplier for assistance'
        ]
      },
      general: {
        icon: FaExclamationTriangle,
        title: title || 'Something went wrong',
        message:
          message ||
          'We encountered an unexpected error. Please try again or contact support if the problem continues.',
        iconColor: 'red.500',
        bgColor: 'red.50',
        borderColor: 'red.200',
        suggestions: [
          'Try refreshing the page',
          'Clear your browser cache',
          'Contact support if issue persists'
        ]
      }
    };
    return configs[type];
  };

  const config = getErrorConfig();

  return (
    <Container maxW="2xl" py={{ base: 8, md: 12 }} px={{ base: 4, md: 6 }}>
      <VStack spacing={8} textAlign="center" pt="125px">
        {/* Error Icon and Message */}
        <Box
          bg={config.bgColor}
          border="2px solid"
          borderColor={config.borderColor}
          borderRadius="xl"
          p={8}
          w="full"
          maxW="lg">
          <VStack spacing={6}>
            {/* Error Icon */}
            <Circle size="80px" bg={`${config.iconColor.split('.')[0]}.100`}>
              <Icon as={config.icon} boxSize={8} color={config.iconColor} />
            </Circle>

            {/* Error Title and Message */}
            <VStack spacing={3}>
              <Text fontSize="xl" fontWeight="bold" color={textColor}>
                {config.title}
              </Text>
              <Text fontSize="md" color={mutedColor} lineHeight="1.6" maxW="md">
                {config.message}
              </Text>
            </VStack>

            {/* Action Buttons */}
            <VStack spacing={3} w="full">
              {onRetry && (
                <Button
                  colorScheme="green"
                  size="lg"
                  w="full"
                  maxW="sm"
                  onClick={onRetry}
                  leftIcon={<FaRedo />}>
                  Try Again
                </Button>
              )}
              {onGoHome && (
                <Button
                  variant="outline"
                  colorScheme="gray"
                  size="lg"
                  w="full"
                  maxW="sm"
                  onClick={onGoHome}
                  leftIcon={<FaHome />}>
                  Go to Dashboard
                </Button>
              )}
            </VStack>
          </VStack>
        </Box>

        {/* Helpful Suggestions */}
        <Box
          bg={bgColor}
          border="1px solid"
          borderColor={useColorModeValue('gray.200', 'gray.600')}
          borderRadius="lg"
          p={6}
          w="full"
          maxW="lg">
          <VStack spacing={4} align="start">
            <Text fontSize="sm" fontWeight="semibold" color={textColor}>
              💡 Troubleshooting Tips
            </Text>
            <VStack spacing={2} align="start">
              {config.suggestions.map((suggestion, index) => (
                <HStack key={index} align="start" spacing={3}>
                  <Box w="6px" h="6px" borderRadius="full" bg="green.500" mt="6px" flexShrink={0} />
                  <Text fontSize="sm" color={mutedColor}>
                    {suggestion}
                  </Text>
                </HStack>
              ))}
            </VStack>
          </VStack>
        </Box>

        {/* Support Information */}
        <Box
          bg="blue.50"
          border="1px solid"
          borderColor="blue.200"
          borderLeft="4px solid"
          borderLeftColor="blue.500"
          borderRadius="lg"
          p={4}
          w="full"
          maxW="lg">
          <VStack spacing={3}>
            <Text fontSize="sm" color="blue.700" fontWeight="medium">
              Still having trouble? Our support team is here to help.
            </Text>
            <Text fontSize="xs" color="blue.600">
              Contact: support@trazo.app | Available 24/7 for transparency issues
            </Text>
          </VStack>
        </Box>

        {/* Trazo Branding */}
        <VStack spacing={2}>
          <HStack spacing={4} fontSize="xs" color={mutedColor} opacity={0.8}>
            <HStack spacing={1}>
              <Icon as={FaShieldAlt} />
              <Text>Secure</Text>
            </HStack>
            <HStack spacing={1}>
              <Icon as={FaLeaf} />
              <Text>Sustainable</Text>
            </HStack>
          </HStack>
          <Divider maxW="xs" />
          <Text fontSize="xs" color={mutedColor} opacity={0.6}>
            Powered by Trazo Agricultural Transparency
          </Text>
        </VStack>
      </VStack>
    </Container>
  );
};

export default ModernErrorState;
