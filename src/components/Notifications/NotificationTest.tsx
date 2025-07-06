import React from 'react';
import { Box, Button, VStack, HStack, Text, useToast, useColorModeValue } from '@chakra-ui/react';
import { useDispatch } from 'react-redux';
import { addNotification, setUnreadCount } from '../../store/features/notificationSlice';
import { useCreateTestNotificationMutation } from '../../store/api/notificationApi';

export const NotificationTest: React.FC = () => {
  const dispatch = useDispatch();
  const toast = useToast();

  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'gray.200');

  const [createTestNotification, { isLoading }] = useCreateTestNotificationMutation();

  const createLocalNotification = (type: string, priority: string) => {
    const mockNotification = {
      id: Date.now(),
      title: `Test ${type} Notification`,
      message: `This is a test ${type} notification with ${priority} priority`,
      type: type as any,
      priority: priority as any,
      read: false,
      created_at: new Date().toISOString(),
      actor: {
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User'
      },
      extra_data: { test: true }
    };

    dispatch(addNotification(mockNotification));
    dispatch(setUnreadCount(1));

    toast({
      title: 'Local Notification Added',
      description: 'Check the notification dropdown to see the test notification',
      status: 'success',
      duration: 3000,
      isClosable: true
    });
  };

  const createServerNotification = async () => {
    try {
      await createTestNotification().unwrap();
      toast({
        title: 'Server Notification Sent',
        description: 'A real notification was sent from the server',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (error) {
      console.error('Failed to create server notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to send server notification',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  return (
    <Box bg={cardBg} p="20px" borderRadius="16px" boxShadow="sm" maxW="400px">
      <VStack spacing="16px" align="stretch">
        <Text fontSize="lg" fontWeight="bold" color={textColor}>
          Notification Testing
        </Text>

        <Text fontSize="sm" color={textColor}>
          Test different types of notifications to see how they work
        </Text>

        <VStack spacing="8px" align="stretch">
          <Text fontSize="md" fontWeight="semibold" color={textColor}>
            Local Test Notifications
          </Text>

          <HStack spacing="8px">
            <Button
              size="sm"
              colorScheme="blue"
              onClick={() => createLocalNotification('product_scan', 'medium')}
            >
              Product Scan
            </Button>
            <Button
              size="sm"
              colorScheme="green"
              onClick={() => createLocalNotification('product_review', 'high')}
            >
              Product Review
            </Button>
          </HStack>

          <HStack spacing="8px">
            <Button
              size="sm"
              colorScheme="purple"
              onClick={() => createLocalNotification('carbon_verification', 'high')}
            >
              Carbon Verified
            </Button>
            <Button
              size="sm"
              colorScheme="orange"
              onClick={() => createLocalNotification('system_alert', 'urgent')}
            >
              System Alert
            </Button>
          </HStack>
        </VStack>

        <VStack spacing="8px" align="stretch">
          <Text fontSize="md" fontWeight="semibold" color={textColor}>
            Server Test Notification
          </Text>

          <Button
            colorScheme="red"
            onClick={createServerNotification}
            isLoading={isLoading}
            loadingText="Sending..."
          >
            Send Real Notification
          </Button>
        </VStack>
      </VStack>
    </Box>
  );
};
