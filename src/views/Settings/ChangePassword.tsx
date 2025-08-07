import React from 'react';
import { Container, Box, Icon, HStack, Text } from '@chakra-ui/react';
import { FaLock } from 'react-icons/fa';
import { StandardPage } from '../../components/Design/StandardComponents';
import { ChangePasswordForm } from '../../components/Forms/ChangePasswordForm';
import { useNavigate } from 'react-router-dom';

const ChangePassword: React.FC = () => {
  const navigate = useNavigate();

  return (
    <StandardPage
      title="Security Settings"
      description="Manage your account security and password"
      showBackButton
      onBack={() => navigate(-1)}
    >
      <Box maxW="xl" mx="auto" py={8}>
        {/* Security Header */}
        <Box mb={8} textAlign="center">
          <HStack justify="center" mb={4}>
            <Icon as={FaLock} boxSize={8} color="green.500" />
          </HStack>
          <Text fontSize="sm" color="gray.600">
            We recommend changing your password regularly to keep your account secure.
            Choose a strong password that you don't use for other accounts.
          </Text>
        </Box>

        {/* Change Password Form */}
        <ChangePasswordForm userType="producer" />

        {/* Security Tips */}
        <Box mt={8} p={6} bg="green.50" borderRadius="lg" borderWidth="1px" borderColor="green.200">
          <Text fontWeight="semibold" mb={3} color="green.700">
            Security Tips:
          </Text>
          <Box as="ul" pl={5} color="green.700" fontSize="sm" space={2}>
            <li>Never share your password with anyone</li>
            <li>Use a unique password for your Trazo account</li>
            <li>Consider using a password manager</li>
            <li>Enable two-factor authentication when available</li>
            <li>Change your password if you suspect unauthorized access</li>
          </Box>
        </Box>
      </Box>
    </StandardPage>
  );
};

export default ChangePassword;