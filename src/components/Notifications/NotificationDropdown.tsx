import React, { useEffect, useState } from 'react';
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Flex,
  Text,
  Badge,
  Box,
  IconButton,
  Divider,
  Button,
  useColorModeValue,
  Avatar,
  VStack,
  HStack,
  useToast
} from '@chakra-ui/react';
import { BellIcon, CloseIcon } from '@chakra-ui/icons';
import { useDispatch } from 'react-redux';
import { formatDistanceToNow } from 'date-fns';

import {
  markAsRead,
  markAllAsRead,
  removeNotification
} from '../../store/features/notificationSlice';
import {
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationMutation
} from '../../store/api/notificationApi';

interface NotificationDropdownProps {
  navbarIcon: string;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'product_scan':
      return '📱';
    case 'product_review':
      return '⭐';
    case 'carbon_verification':
      return '🌱';
    case 'system_alert':
      return '⚠️';
    default:
      return '🔔';
  }
};

const getNotificationColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'red.500';
    case 'high':
      return 'orange.500';
    case 'medium':
      return 'blue.500';
    case 'low':
      return 'gray.500';
    default:
      return 'blue.500';
  }
};

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ navbarIcon }) => {
  const dispatch = useDispatch();
  const toast = useToast();

  // No selectors needed - using API data directly

  // Color mode values
  const menuBg = useColorModeValue('white', 'gray.800');
  const menuBorder = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const mutedTextColor = useColorModeValue('gray.500', 'gray.400');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  // API hooks
  const { data: notificationData, refetch } = useGetNotificationsQuery(
    {},
    { refetchOnMountOrArgChange: true }
  );
  const [markAsReadMutation] = useMarkNotificationAsReadMutation();
  const [markAllAsReadMutation] = useMarkAllNotificationsAsReadMutation();
  const [deleteNotificationMutation] = useDeleteNotificationMutation();

  const [isOpen, setIsOpen] = useState(false);

  // No WebSocket initialization needed - using polling approach

  // Refetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, refetch]);

  // Auto-refresh notifications every 30 seconds (simulating real-time updates)
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [refetch]);

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markAsReadMutation({ notification_id: notificationId }).unwrap();
      dispatch(markAsRead(notificationId));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadMutation().unwrap();
      dispatch(markAllAsRead());

      toast({
        title: 'Success',
        description: 'All notifications marked as read',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const handleDeleteNotification = async (notificationId: number) => {
    try {
      await deleteNotificationMutation(notificationId).unwrap();
      dispatch(removeNotification(notificationId));

      toast({
        title: 'Success',
        description: 'Notification deleted',
        status: 'success',
        duration: 2000,
        isClosable: true
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete notification',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const formatNotificationTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  // Get notifications and unread count from API data
  const notifications = notificationData?.results || [];
  const unreadCount = notifications.filter((n) => !n.read).length;
  const displayNotifications = notifications.slice(0, 10); // Show max 10 notifications
  const hasMoreNotifications = notifications.length > 10;
  const totalNotifications = notifications.length;

  return (
    <Menu onOpen={() => setIsOpen(true)} onClose={() => setIsOpen(false)}>
      <MenuButton as={Box} position="relative" cursor="pointer">
        <BellIcon color={navbarIcon} w="18px" h="18px" />
        {unreadCount > 0 && (
          <Badge
            position="absolute"
            top="-8px"
            right="-8px"
            colorScheme="red"
            borderRadius="full"
            minW="18px"
            h="18px"
            fontSize="xs"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </MenuButton>

      <MenuList
        bg={menuBg}
        borderColor={menuBorder}
        borderWidth="1px"
        borderRadius="12px"
        p="16px 8px"
        w="400px"
        maxH="500px"
        overflowY="auto"
        boxShadow="xl"
        zIndex="1500"
      >
        {/* Header */}
        <Flex justify="space-between" align="center" px="8px" mb="12px">
          <Text fontSize="lg" fontWeight="bold" color={textColor}>
            Notifications {unreadCount > 0 && `(${unreadCount})`}
          </Text>
          {notifications.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              colorScheme="blue"
              fontSize="xs"
              onClick={handleMarkAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </Flex>

        <Divider mb="8px" />

        {/* Notifications List */}
        {displayNotifications.length === 0 ? (
          <Box textAlign="center" py="20px">
            <Text color={mutedTextColor} fontSize="sm">
              No notifications yet
            </Text>
            <Text color={mutedTextColor} fontSize="xs" mt="4px">
              You'll see notifications here when someone scans your products or leaves reviews
            </Text>
          </Box>
        ) : (
          <VStack spacing="2px" align="stretch">
            {displayNotifications.map((notification) => (
              <MenuItem
                key={notification.id}
                borderRadius="8px"
                py="12px"
                px="12px"
                bg={notification.read ? 'transparent' : hoverBg}
                _hover={{ bg: hoverBg }}
                _focus={{ bg: hoverBg }}
                position="relative"
                onClick={() => !notification.read && handleMarkAsRead(notification.id)}
              >
                <HStack spacing="12px" align="start" w="100%">
                  {/* Notification Icon */}
                  <Box
                    minW="40px"
                    h="40px"
                    bg={getNotificationColor(notification.priority)}
                    color="white"
                    borderRadius="full"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="lg"
                  >
                    {getNotificationIcon(notification.type)}
                  </Box>

                  {/* Content */}
                  <VStack align="start" spacing="4px" flex="1" minW="0">
                    <Text
                      fontSize="sm"
                      fontWeight={notification.read ? 'normal' : 'semibold'}
                      color={textColor}
                      lineHeight="1.3"
                      noOfLines={2}
                    >
                      {notification.title}
                    </Text>
                    <Text fontSize="xs" color={mutedTextColor} lineHeight="1.3" noOfLines={2}>
                      {notification.message}
                    </Text>
                    <HStack spacing="8px">
                      <Text fontSize="xs" color={mutedTextColor}>
                        {formatNotificationTime(notification.created_at)}
                      </Text>
                      {notification.actor && (
                        <Text fontSize="xs" color={mutedTextColor}>
                          by {notification.actor.first_name} {notification.actor.last_name}
                        </Text>
                      )}
                    </HStack>
                  </VStack>

                  {/* Actions */}
                  <VStack spacing="4px">
                    {!notification.read && (
                      <Box w="6px" h="6px" bg="blue.500" borderRadius="full" title="Unread" />
                    )}
                    <IconButton
                      aria-label="Delete notification"
                      icon={<CloseIcon />}
                      size="xs"
                      variant="ghost"
                      colorScheme="gray"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotification(notification.id);
                      }}
                      opacity="0.6"
                      _hover={{ opacity: 1 }}
                    />
                  </VStack>
                </HStack>
              </MenuItem>
            ))}
          </VStack>
        )}

        {/* Footer */}
        {/* Enhanced footer with better UX for many notifications */}
        {hasMoreNotifications ? (
          <>
            <Divider mt="12px" mb="8px" />
            <Box px="8px">
              <VStack spacing="8px">
                <Text fontSize="xs" color={mutedTextColor} textAlign="center">
                  Showing 10 of {totalNotifications} notifications
                  {unreadCount > 10 && ` • ${unreadCount} unread`}
                </Text>
                <Button
                  size="sm"
                  variant="ghost"
                  colorScheme="blue"
                  width="100%"
                  fontSize="sm"
                  onClick={() => {
                    // TODO: Navigate to full notifications page
                    console.log('Navigate to full notifications page');
                    // Could navigate to /admin/dashboard/notifications or open modal
                  }}
                >
                  View All Notifications
                </Button>
              </VStack>
            </Box>
          </>
        ) : (
          displayNotifications.length > 0 && (
            <Box textAlign="center" py="8px" mt="8px">
              <Text fontSize="xs" color={mutedTextColor}>
                {totalNotifications === 1 ? '1 notification' : `All ${totalNotifications} notifications shown`}
              </Text>
            </Box>
          )
        )}

        {/* Auto-refresh info */}
        <Box mt="8px" px="8px" textAlign="center">
          <Text fontSize="xs" color={mutedTextColor}>
            Updates every 30 seconds
          </Text>
        </Box>
      </MenuList>
    </Menu>
  );
};
