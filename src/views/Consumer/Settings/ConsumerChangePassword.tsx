import React from 'react';
import { Container, Box, Icon, HStack, Text, VStack, Badge } from '@chakra-ui/react';
import { FaLock, FaLeaf } from 'react-icons/fa';
import { StandardPage } from '../../../components/Design/StandardComponents';
import { ChangePasswordForm } from '../../../components/Forms/ChangePasswordForm';
import { useNavigate } from 'react-router-dom';

const ConsumerChangePassword: React.FC = () => {
  const navigate = useNavigate();

  return (
    <StandardPage
      title="Account Security"
      description="Keep your Trazo account secure"
      showBackButton
      onBack={() => navigate('/admin/dashboard/settings')}
    >
      <Box maxW="xl" mx="auto" py={8}>
        {/* Consumer-focused Security Header */}
        <VStack spacing={4} mb={8} textAlign="center">
          <HStack justify="center">
            <Icon as={FaLock} boxSize={8} color="blue.600" />
          </HStack>
          <Badge
            colorScheme="blue"
            variant="subtle"
            fontSize="sm"
            px={4}
            py={2}
            borderRadius="full"
          >
            <HStack spacing={2}>
              <Icon as={FaLeaf} boxSize={4} />
              <Text>Protecting Your Transparency Journey</Text>
            </HStack>
          </Badge>
          <Text fontSize="sm" color="gray.600" maxW="md">
            Your security is important to us. A strong password helps protect your
            transparency data and farm discoveries.
          </Text>
        </VStack>

        {/* Change Password Form */}
        <ChangePasswordForm userType="consumer" />

        {/* Consumer Security Tips */}
        <Box mt={8} p={6} bg="blue.50" borderRadius="lg" borderWidth="1px" borderColor="blue.200">
          <HStack mb={3}>
            <Icon as={FaLeaf} color="blue.600" />
            <Text fontWeight="semibold" color="blue.700">
              Why Security Matters:
            </Text>
          </HStack>
          <VStack align="start" spacing={2} pl={6}>
            <Text fontSize="sm" color="blue.700">
              • Protects your transparency journey data
            </Text>
            <Text fontSize="sm" color="blue.700">
              • Secures your favorite products and farms
            </Text>
            <Text fontSize="sm" color="blue.700">
              • Keeps your scan history and preferences private
            </Text>
            <Text fontSize="sm" color="blue.700">
              • Ensures your reviews and feedback remain authentic
            </Text>
          </VStack>
        </Box>

        {/* General Security Tips */}
        <Box mt={6} p={6} bg="gray.50" borderRadius="lg" borderWidth="1px" borderColor="gray.200">
          <Text fontWeight="semibold" mb={3} color="gray.700">
            Password Best Practices:
          </Text>
          <Box as="ul" pl={5} color="gray.700" fontSize="sm" spacing={2}>
            <li>Create a unique password just for Trazo</li>
            <li>Don't use personal information in your password</li>
            <li>Consider using a trusted password manager</li>
            <li>Update your password every few months</li>
            <li>Never share your login credentials</li>
          </Box>
        </Box>
      </Box>
    </StandardPage>
  );
};

export default ConsumerChangePassword;
