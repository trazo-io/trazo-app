import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Switch,
  FormControl,
  FormLabel,
  FormHelperText,
  Divider,
  useColorModeValue,
  useToast,
  Button
} from '@chakra-ui/react';
import { useSelector } from 'react-redux';

import { RootState } from '../../store';
import {
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
  useCreateTestNotificationMutation
} from '../../store/api/notificationApi';

export const NotificationSettings: React.FC = () => {
  const toast = useToast();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  // Color mode values
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const mutedTextColor = useColorModeValue('gray.500', 'gray.400');

  // API hooks
  const { data: preferences, isLoading } = useGetNotificationPreferencesQuery(undefined, {
    skip: !isAuthenticated
  });

  const [updatePreferences, { isLoading: isUpdating }] = useUpdateNotificationPreferencesMutation();
  const [createTestNotification, { isLoading: isCreatingTest }] =
    useCreateTestNotificationMutation();

  const handlePreferenceChange = async (key: string, value: boolean) => {
    try {
      await updatePreferences({ [key]: value }).unwrap();
      toast({
        title: 'Preferences Updated',
        description: 'Your notification preferences have been saved',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (error) {
      console.error('Failed to update preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notification preferences',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const handleTestNotification = async () => {
    try {
      await createTestNotification().unwrap();
      toast({
        title: 'Test Notification Sent',
        description: 'Check your notifications for the test message',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (error) {
      console.error('Failed to create test notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to send test notification',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  if (!preferences) {
    return (
      <Box bg={cardBg} p="20px" borderRadius="16px" boxShadow="sm">
        <Text color={textColor}>Loading notification settings...</Text>
      </Box>
    );
  }

  return (
    <Box bg={cardBg} p="20px" borderRadius="16px" boxShadow="sm">
      <VStack spacing="20px" align="stretch">
        {/* Header */}
        <Box>
          <Text fontSize="lg" fontWeight="bold" color={textColor} mb="8px">
            Notification Preferences
          </Text>
          <Text fontSize="sm" color={mutedTextColor}>
            Control which notifications you receive and how you receive them
          </Text>
        </Box>

        <Divider />

        {/* Notification Types */}
        <Box>
          <Text fontSize="md" fontWeight="semibold" color={textColor} mb="16px">
            Notification Types
          </Text>
          <VStack spacing="16px" align="stretch">
            <FormControl>
              <HStack justify="space-between">
                <Box>
                  <FormLabel mb="4px" color={textColor}>
                    Product Scans
                  </FormLabel>
                  <FormHelperText mt="0" color={mutedTextColor}>
                    Get notified when someone scans your product QR codes
                  </FormHelperText>
                </Box>
                <Switch
                  isChecked={preferences.product_scan_enabled}
                  onChange={(e) => handlePreferenceChange('product_scan_enabled', e.target.checked)}
                  colorScheme="green"
                />
              </HStack>
            </FormControl>

            <FormControl>
              <HStack justify="space-between">
                <Box>
                  <FormLabel mb="4px" color={textColor}>
                    Product Reviews
                  </FormLabel>
                  <FormHelperText mt="0" color={mutedTextColor}>
                    Get notified when someone leaves a review for your products
                  </FormHelperText>
                </Box>
                <Switch
                  isChecked={preferences.product_review_enabled}
                  onChange={(e) =>
                    handlePreferenceChange('product_review_enabled', e.target.checked)
                  }
                  colorScheme="green"
                />
              </HStack>
            </FormControl>

            <FormControl>
              <HStack justify="space-between">
                <Box>
                  <FormLabel mb="4px" color={textColor}>
                    Carbon Verification
                  </FormLabel>
                  <FormHelperText mt="0" color={mutedTextColor}>
                    Get notified about carbon verification updates and results
                  </FormHelperText>
                </Box>
                <Switch
                  isChecked={preferences.carbon_verification_enabled}
                  onChange={(e) =>
                    handlePreferenceChange('carbon_verification_enabled', e.target.checked)
                  }
                  colorScheme="green"
                />
              </HStack>
            </FormControl>

            <FormControl>
              <HStack justify="space-between">
                <Box>
                  <FormLabel mb="4px" color={textColor}>
                    System Alerts
                  </FormLabel>
                  <FormHelperText mt="0" color={mutedTextColor}>
                    Get notified about important system updates and alerts
                  </FormHelperText>
                </Box>
                <Switch
                  isChecked={preferences.system_alert_enabled}
                  onChange={(e) => handlePreferenceChange('system_alert_enabled', e.target.checked)}
                  colorScheme="green"
                />
              </HStack>
            </FormControl>
          </VStack>
        </Box>

        <Divider />

        {/* Delivery Methods */}
        <Box>
          <Text fontSize="md" fontWeight="semibold" color={textColor} mb="16px">
            Delivery Methods
          </Text>
          <VStack spacing="16px" align="stretch">
            <FormControl>
              <HStack justify="space-between">
                <Box>
                  <FormLabel mb="4px" color={textColor}>
                    Real-time Notifications
                  </FormLabel>
                  <FormHelperText mt="0" color={mutedTextColor}>
                    Instant notifications in your browser while using Trazo
                  </FormHelperText>
                </Box>
                <Switch
                  isChecked={preferences.realtime_notifications}
                  onChange={(e) =>
                    handlePreferenceChange('realtime_notifications', e.target.checked)
                  }
                  colorScheme="green"
                />
              </HStack>
            </FormControl>

            <FormControl>
              <HStack justify="space-between">
                <Box>
                  <FormLabel mb="4px" color={textColor}>
                    Email Notifications
                  </FormLabel>
                  <FormHelperText mt="0" color={mutedTextColor}>
                    Receive notifications via email
                  </FormHelperText>
                </Box>
                <Switch
                  isChecked={preferences.email_notifications}
                  onChange={(e) => handlePreferenceChange('email_notifications', e.target.checked)}
                  colorScheme="green"
                />
              </HStack>
            </FormControl>

            <FormControl>
              <HStack justify="space-between">
                <Box>
                  <FormLabel mb="4px" color={textColor}>
                    Push Notifications
                  </FormLabel>
                  <FormHelperText mt="0" color={mutedTextColor}>
                    Receive browser push notifications (coming soon)
                  </FormHelperText>
                </Box>
                <Switch
                  isChecked={preferences.push_notifications}
                  onChange={(e) => handlePreferenceChange('push_notifications', e.target.checked)}
                  colorScheme="green"
                  isDisabled
                />
              </HStack>
            </FormControl>
          </VStack>
        </Box>

        <Divider />

        {/* Test Notification */}
        <Box>
          <Text fontSize="md" fontWeight="semibold" color={textColor} mb="16px">
            Test Notifications
          </Text>
          <Text fontSize="sm" color={mutedTextColor} mb="16px">
            Send yourself a test notification to make sure everything is working properly
          </Text>
          <Button
            colorScheme="blue"
            size="sm"
            onClick={handleTestNotification}
            isLoading={isCreatingTest}
            loadingText="Sending..."
          >
            Send Test Notification
          </Button>
        </Box>
      </VStack>
    </Box>
  );
};
