import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { useUserRole } from 'hooks/useUserRole';
import { Box, VStack, Icon, Text, Button } from '@chakra-ui/react';
import { FaLock } from 'react-icons/fa';

/**
 * Wraps write-action pages (edit/create forms) and redirects Viewers.
 * Shows a brief "no permission" message then navigates back.
 */
export const WriteAccessGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { canWrite } = useUserRole();
  const navigate = useNavigate();
  const intl = useIntl();

  if (!canWrite) {
    return (
      <Box minH="60vh" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4} textAlign="center" p={8}>
          <Icon as={FaLock} boxSize={12} color="gray.400" />
          <Text fontSize="xl" fontWeight="semibold" color="gray.700">
            {intl.formatMessage({ id: 'app.accessRestricted' })}
          </Text>
          <Text fontSize="md" color="gray.500" maxW="400px">
            {intl.formatMessage({ id: 'app.accessRestrictedDescription' })}
          </Text>
          <Button colorScheme="green" variant="outline" onClick={() => navigate(-1)} mt={2}>
            {intl.formatMessage({ id: 'app.goBackButton' })}
          </Button>
        </VStack>
      </Box>
    );
  }

  return <>{children}</>;
};
