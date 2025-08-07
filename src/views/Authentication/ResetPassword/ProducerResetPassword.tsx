import React from 'react';
import {
  Box,
  Grid,
  VStack,
  Text,
  Icon,
  HStack,
  useColorModeValue
} from '@chakra-ui/react';
import { FaLeaf, FaShieldAlt, FaLock } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { ResetPasswordForm } from '../../../components/Forms/ResetPasswordForm';

const MotionBox = motion(Box);

const ProducerResetPassword: React.FC = () => {
  const bgColor = useColorModeValue('white', 'gray.800');

  return (
    <Box minH="calc(100vh - 80px)" maxH="calc(100vh - 80px)" overflow="hidden">
      <Grid 
        templateColumns={{ base: '1fr', lg: '1fr 1fr' }} 
        h="calc(100vh - 80px)"
      >
        {/* Left Panel - Form */}
        <VStack
          spacing={0}
          justify="center"
          align="center"
          p={{ base: 6, md: 12 }}
          bg={bgColor}
          position="relative"
        >
          <Box w="full" maxW="450px">
            {/* Header */}
            <VStack spacing={6} mb={8} textAlign="center">
              <HStack spacing={3} justify="center">
                <Icon as={FaShieldAlt} boxSize={6} color="green.500" />
                <Icon as={FaLeaf} boxSize={6} color="green.600" />
              </HStack>
              
              <VStack spacing={2}>
                <Text fontSize="2xl" fontWeight="700" color="gray.800">
                  Secure Reset
                </Text>
                <Text fontSize="sm" color="gray.500" maxW="sm" lineHeight="1.6">
                  Carbon Intelligence Platform
                </Text>
              </VStack>
            </VStack>

            {/* Form */}
            <ResetPasswordForm userType="producer" />

            {/* Footer */}
            <Box mt={8} textAlign="center">
              <Text fontSize="xs" color="gray.500" lineHeight="1.5">
                Your carbon tracking data remains secure throughout this process.
                <br />
                Enterprise-grade password requirements for maximum protection.
              </Text>
            </Box>
          </Box>
        </VStack>

        {/* Right Panel - Brand */}
        <MotionBox
          display={{ base: 'none', lg: 'flex' }}
          bg="linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)"
          position="relative"
          overflow="hidden"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
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
            zIndex={1}
          >
            <VStack spacing={8}>
              {/* Icon */}
              <Box
                p={6}
                bg="whiteAlpha.200"
                borderRadius="3xl"
                backdropFilter="blur(10px)"
                border="1px solid"
                borderColor="whiteAlpha.300"
              >
                <Icon as={FaLock} boxSize={12} color="white" />
              </Box>

              {/* Content */}
              <VStack spacing={4} color="white">
                <Text fontSize="3xl" fontWeight="700" lineHeight="1.2">
                  Enhanced
                  <br />
                  Security
                </Text>
                <Text fontSize="lg" opacity={0.9} maxW="md" lineHeight="1.6">
                  Create a strong password that meets our enterprise security standards. 
                  Your carbon intelligence platform requires the highest level of protection 
                  for your valuable environmental data.
                </Text>
              </VStack>

              {/* Security Features */}
              <VStack spacing={3} align="start" color="white" mt={6}>
                <HStack spacing={3}>
                  <Box w={2} h={2} bg="green.200" borderRadius="full" />
                  <Text fontSize="sm" opacity={0.9}>12+ character minimum length</Text>
                </HStack>
                <HStack spacing={3}>
                  <Box w={2} h={2} bg="green.200" borderRadius="full" />
                  <Text fontSize="sm" opacity={0.9}>Mixed case & special characters</Text>
                </HStack>
                <HStack spacing={3}>
                  <Box w={2} h={2} bg="green.200" borderRadius="full" />
                  <Text fontSize="sm" opacity={0.9}>Real-time strength validation</Text>
                </HStack>
                <HStack spacing={3}>
                  <Box w={2} h={2} bg="green.200" borderRadius="full" />
                  <Text fontSize="sm" opacity={0.9}>Pattern & dictionary checks</Text>
                </HStack>
              </VStack>
            </VStack>
          </VStack>
        </MotionBox>
      </Grid>
    </Box>
  );
};

export default ProducerResetPassword;