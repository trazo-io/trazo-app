import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { useUserRole } from 'hooks/useUserRole';
import { Box, VStack, Icon, Text, Button } from '@chakra-ui/react';
import { FaLock } from 'react-icons/fa';

/**
 * Wraps admin-only pages (subscription, settings) and blocks non-admin users.
 * Shows "restricted access" message with a back button.
 */
export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const intl = useIntl();

  if (!isAdmin) {
    return (
      <Box
        minH="60vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <VStack spacing={4} textAlign="center" p={8}>
          <Icon as={FaLock} boxSize={12} color="gray.400" />
          <Text fontSize="xl" fontWeight="semibold" color="gray.700">
            {intl.formatMessage({ id: 'app.accessRestricted' })}
          </Text>
          <Text fontSize="md" color="gray.500" maxW="400px">
            {intl.formatMessage({ id: 'app.accessRestrictedDescription' })}
          </Text>
          <Button
            colorScheme="green"
            variant="outline"
            onClick={() => navigate('/admin/dashboard')}
            mt={2}
          >
            {intl.formatMessage({ id: 'app.goBackButton' })}
          </Button>
        </VStack>
      </Box>
    );
  }

  return <>{children}</>;
};
