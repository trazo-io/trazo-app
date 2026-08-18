import React from 'react';
import { Box, Grid, VStack, Text, Icon, HStack, useColorModeValue } from '@chakra-ui/react';
import { FaLeaf, FaShieldAlt, FaLock, FaHeart } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { ResetPasswordForm } from '../../../components/Forms/ResetPasswordForm';

const MotionBox = motion(Box);

const ConsumerResetPassword: React.FC = () => {
  const bgColor = useColorModeValue('white', 'gray.800');

  return (
    <Box minH="calc(100vh - 80px)" maxH="calc(100vh - 80px)" overflow="hidden">
      <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} h="calc(100vh - 80px)">
        {/* Left Panel - Form */}
        <VStack
          spacing={0}
          justify="center"
          align="center"
          p={{ base: 6, md: 12 }}
          bg={bgColor}
          position="relative">
          <Box w="full" maxW={{ base: '100%', md: '450px' }}>
            {/* Header */}
            <VStack spacing={6} mb={8} textAlign="center">
              <HStack spacing={3} justify="center">
                <Icon as={FaShieldAlt} boxSize={6} color="blue.600" />
                <Icon as={FaLeaf} boxSize={6} color="blue.700" />
              </HStack>

              <VStack spacing={2}>
                <Text fontSize="2xl" fontWeight="700" color="gray.800">
                  Secure Reset
                </Text>
                <Text fontSize="sm" color="gray.500" maxW="sm" lineHeight="1.6">
                  Organic farm recordkeeping
                </Text>
              </VStack>
            </VStack>

            {/* Form */}
            <ResetPasswordForm userType="consumer" />

            {/* Footer */}
            <Box mt={8} textAlign="center">
              <Text fontSize="xs" color="gray.500" lineHeight="1.5">
                Your sustainable journey data is protected with every step.
                <br />
                Strong passwords help secure your environmental impact tracking.
              </Text>
            </Box>
          </Box>
        </VStack>

        {/* Right Panel - Brand */}
        <MotionBox
          display={{ base: 'none', lg: 'flex' }}
          bg="linear-gradient(135deg, #2196F3 0%, #1E88E5 100%)"
          position="relative"
          overflow="hidden"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}>
          {/* Geometric Background Elements */}
          <Box
            position="absolute"
            top="-20%"
            right="-10%"
            w="300px"
            h="300px"
            bg="whiteAlpha.100"
            borderRadius="50%"
            filter="blur(2px)"
          />
          <Box
            position="absolute"
            bottom="-15%"
            left="-5%"
            w="250px"
            h="250px"
            bg="whiteAlpha.100"
            borderRadius="50%"
            filter="blur(3px)"
          />
          <Box
            position="absolute"
            top="30%"
            left="60%"
            w="150px"
            h="150px"
            bg="whiteAlpha.50"
            borderRadius="50%"
            filter="blur(1px)"
          />

          {/* Content */}
          <VStack
            justify="center"
            align="center"
            h="full"
            p={12}
            textAlign="center"
            position="relative"
            zIndex={1}>
            <VStack spacing={8}>
              {/* Icon */}
              <Box
                p={6}
                bg="whiteAlpha.200"
                borderRadius="3xl"
                backdropFilter="blur(10px)"
                border="1px solid"
                borderColor="whiteAlpha.300">
                <Icon as={FaHeart} boxSize={12} color="white" />
              </Box>

              {/* Content */}
              <VStack spacing={4} color="white">
                <Text fontSize="3xl" fontWeight="700" lineHeight="1.2">
                  Protect Your
                  <br />
                  Impact
                </Text>
                <Text fontSize="lg" opacity={0.9} maxW="md" lineHeight="1.6">
                  Secure your transparency data and farm discoveries with a strong password. Your
                  food transparency journey deserves the best protection we can provide.
                </Text>
              </VStack>

              {/* Security Features */}
              <VStack spacing={3} align="start" color="white" mt={6}>
                <HStack spacing={3}>
                  <Box w={2} h={2} bg="blue.200" borderRadius="full" />
                  <Text fontSize="sm" opacity={0.9}>
                    Comprehensive password strength
                  </Text>
                </HStack>
                <HStack spacing={3}>
                  <Box w={2} h={2} bg="blue.200" borderRadius="full" />
                  <Text fontSize="sm" opacity={0.9}>
                    Real-time security validation
                  </Text>
                </HStack>
                <HStack spacing={3}>
                  <Box w={2} h={2} bg="blue.200" borderRadius="full" />
                  <Text fontSize="sm" opacity={0.9}>
                    Personal information protection
                  </Text>
                </HStack>
                <HStack spacing={3}>
                  <Box w={2} h={2} bg="blue.200" borderRadius="full" />
                  <Text fontSize="sm" opacity={0.9}>
                    Secure environmental data
                  </Text>
                </HStack>
              </VStack>
            </VStack>
          </VStack>
        </MotionBox>
      </Grid>
    </Box>
  );
};

export default ConsumerResetPassword;
