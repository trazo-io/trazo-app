import React, { useEffect, useState, useMemo } from 'react';
import {
  Menu,
  MenuButton,
  MenuList,
  Flex,
  Text,
  Badge,
  Box,
  IconButton,
  Divider,
  Button,
  useColorModeValue,
  VStack,
  HStack,
  useToast,
  Icon,
  Collapse
} from '@chakra-ui/react';
import { BellIcon, CloseIcon, ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import { FaStar, FaLeaf, FaBell } from 'react-icons/fa';
import { MdSmartphone, MdWarning } from 'react-icons/md';
import { useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';
import { formatDistanceToNow } from 'date-fns';

import {
  Notification,
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

// --- Grouping types ---

interface NotificationGroup {
  key: string;
  type: string;
  productName: string;
  notifications: Notification[];
  latestNotification: Notification;
  unreadCount: number;
  count: number;
}

type DisplayItem =
  | { kind: 'single'; notification: Notification }
  | { kind: 'group'; group: NotificationGroup };

// --- Icon & color helpers (Trazo-aligned) ---

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'product_scan':
      return MdSmartphone;
    case 'product_review':
      return FaStar;
    case 'carbon_verification':
      return FaLeaf;
    case 'system_alert':
      return MdWarning;
    default:
      return FaBell;
  }
};

const getNotificationColor = (type: string, priority: string) => {
  switch (type) {
    case 'product_scan':
      return 'green.500';
    case 'product_review':
      return 'orange.400';
    case 'carbon_verification':
      return 'green.600';
    case 'system_alert':
      switch (priority) {
        case 'urgent':
          return 'red.500';
        case 'high':
          return 'orange.500';
        default:
          return 'gray.500';
      }
    default:
      return 'green.500';
  }
};

// --- Grouping logic ---

const getGroupKey = (notification: Notification): string | null => {
  if (notification.type === 'product_scan') {
    const productName = notification.extra_data?.product_name;
    if (productName) {
      return `product_scan:${productName}`;
    }
  }
  return null;
};

const groupNotifications = (notifications: Notification[]): DisplayItem[] => {
  const groupMap = new Map<string, Notification[]>();
  const singles: { index: number; notification: Notification }[] = [];
  const groupFirstIndex = new Map<string, number>();

  notifications.forEach((notification, index) => {
    const groupKey = getGroupKey(notification);
    if (groupKey) {
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
        groupFirstIndex.set(groupKey, index);
      }
      groupMap.get(groupKey)!.push(notification);
    } else {
      singles.push({ index, notification });
    }
  });

  const items: { index: number; item: DisplayItem }[] = [];

  groupMap.forEach((groupNotifs, key) => {
    const latestNotification = groupNotifs[0];
    const productName = latestNotification.extra_data?.product_name || 'Unknown';

    if (groupNotifs.length === 1) {
      items.push({
        index: groupFirstIndex.get(key)!,
        item: { kind: 'single', notification: groupNotifs[0] }
      });
    } else {
      items.push({
        index: groupFirstIndex.get(key)!,
        item: {
          kind: 'group',
          group: {
            key,
            type: latestNotification.type,
            productName,
            notifications: groupNotifs,
            latestNotification,
            unreadCount: groupNotifs.filter((n) => !n.read).length,
            count: groupNotifs.length
          }
        }
      });
    }
  });

  singles.forEach(({ index, notification }) => {
    items.push({ index, item: { kind: 'single', notification } });
  });

  items.sort((a, b) => a.index - b.index);
  return items.map((i) => i.item);
};

// --- Component ---

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ navbarIcon }) => {
  const dispatch = useDispatch();
  const toast = useToast();
  const intl = useIntl();

  // Color mode values
  const menuBg = useColorModeValue('white', 'gray.800');
  const menuBorder = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const mutedTextColor = useColorModeValue('gray.500', 'gray.400');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const unreadBg = useColorModeValue('green.50', 'gray.700');

  // API hooks
  const { data: notificationData, refetch } = useGetNotificationsQuery(
    {},
    { refetchOnMountOrArgChange: true }
  );
  const [markAsReadMutation] = useMarkNotificationAsReadMutation();
  const [markAllAsReadMutation] = useMarkAllNotificationsAsReadMutation();
  const [deleteNotificationMutation] = useDeleteNotificationMutation();

  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Refetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      refetch();
      setExpandedGroups(new Set());
    }
  }, [isOpen, refetch]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markAsReadMutation({ notification_id: notificationId }).unwrap();
      dispatch(markAsRead(notificationId));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast({
        title: 'Error',
        description: intl.formatMessage({ id: 'notifications.error.markRead' }),
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const handleMarkGroupAsRead = async (group: NotificationGroup) => {
    const unreadIds = group.notifications.filter((n) => !n.read).map((n) => n.id);
    try {
      await Promise.all(
        unreadIds.map((id) => markAsReadMutation({ notification_id: id }).unwrap())
      );
      unreadIds.forEach((id) => dispatch(markAsRead(id)));
    } catch (error) {
      console.error('Failed to mark group as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadMutation().unwrap();
      dispatch(markAllAsRead());
      toast({
        description: intl.formatMessage({ id: 'notifications.success.allRead' }),
        status: 'success',
        duration: 2000,
        isClosable: true
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      toast({
        title: 'Error',
        description: intl.formatMessage({ id: 'notifications.error.markAllRead' }),
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
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast({
        title: 'Error',
        description: intl.formatMessage({ id: 'notifications.error.delete' }),
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const handleDeleteGroup = async (group: NotificationGroup) => {
    const ids = group.notifications.map((n) => n.id);
    try {
      await Promise.all(ids.map((id) => deleteNotificationMutation(id).unwrap()));
      ids.forEach((id) => dispatch(removeNotification(id)));
    } catch (error) {
      console.error('Failed to delete group:', error);
    }
  };

  const formatNotificationTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  // Build grouped display items
  const notifications = notificationData?.results || [];
  const unreadCount = notifications.filter((n) => !n.read).length;
  const displayItems = useMemo(() => groupNotifications(notifications), [notifications]);
  const totalNotifications = notifications.length;

  // --- Render helpers ---

  const renderSingleNotification = (notification: Notification, isNested = false) => (
    <Box
      key={notification.id}
      borderRadius="8px"
      py={isNested ? '8px' : '12px'}
      px="12px"
      bg={!notification.read ? unreadBg : 'transparent'}
      _hover={{ bg: hoverBg }}
      cursor="pointer"
      onClick={() => !notification.read && handleMarkAsRead(notification.id)}
      transition="background 0.15s"
    >
      <HStack spacing="12px" align="start" w="100%">
        {/* Icon */}
        <Box
          minW={isNested ? '32px' : '40px'}
          h={isNested ? '32px' : '40px'}
          bg={getNotificationColor(notification.type, notification.priority)}
          color="white"
          borderRadius="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Icon as={getNotificationIcon(notification.type)} boxSize={isNested ? 4 : 5} />
        </Box>

        {/* Content */}
        <VStack align="start" spacing="2px" flex="1" minW="0">
          <Text
            fontSize={isNested ? 'xs' : 'sm'}
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
          <Text fontSize="xs" color={mutedTextColor}>
            {formatNotificationTime(notification.created_at)}
          </Text>
        </VStack>

        {/* Actions */}
        <VStack spacing="4px" alignItems="center">
          {!notification.read && (
            <Box w="6px" h="6px" bg="green.500" borderRadius="full" title="Unread" />
          )}
          {!isNested && (
            <IconButton
              aria-label="Delete notification"
              icon={<CloseIcon boxSize="8px" />}
              size="xs"
              variant="ghost"
              colorScheme="gray"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteNotification(notification.id);
              }}
              opacity="0.5"
              _hover={{ opacity: 1 }}
            />
          )}
        </VStack>
      </HStack>
    </Box>
  );

  const renderGroupedNotification = (group: NotificationGroup) => {
    const isExpanded = expandedGroups.has(group.key);
    const hasUnread = group.unreadCount > 0;

    return (
      <Box key={group.key}>
        {/* Group header */}
        <Box
          borderRadius="8px"
          py="12px"
          px="12px"
          bg={hasUnread ? unreadBg : 'transparent'}
          _hover={{ bg: hoverBg }}
          cursor="pointer"
          onClick={() => toggleGroup(group.key)}
          transition="background 0.15s"
        >
          <HStack spacing="12px" align="start" w="100%">
            {/* Icon with count badge */}
            <Box position="relative">
              <Box
                minW="40px"
                h="40px"
                bg={getNotificationColor(group.type, group.latestNotification.priority)}
                color="white"
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Icon as={getNotificationIcon(group.type)} boxSize={5} />
              </Box>
              <Badge
                position="absolute"
                top="-4px"
                right="-4px"
                bg="green.500"
                color="white"
                borderRadius="full"
                minW="18px"
                h="18px"
                fontSize="11px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                border="2px solid"
                borderColor={menuBg}
              >
                {group.count}
              </Badge>
            </Box>

            {/* Content */}
            <VStack align="start" spacing="2px" flex="1" minW="0">
              <Text fontSize="sm" fontWeight={hasUnread ? 'semibold' : 'normal'} color={textColor} lineHeight="1.3">
                {intl.formatMessage({ id: 'notifications.productScanned' }, { productName: group.productName })}
              </Text>
              <Text fontSize="xs" color={mutedTextColor} lineHeight="1.3">
                {intl.formatMessage({ id: 'notifications.consumersViewed' }, { count: group.count })}
              </Text>
              <HStack spacing="6px">
                <Text fontSize="xs" color={mutedTextColor}>
                  {intl.formatMessage(
                    { id: 'notifications.lastScan' },
                    { time: formatNotificationTime(group.latestNotification.created_at) }
                  )}
                </Text>
                {hasUnread && (
                  <Badge
                    colorScheme="green"
                    fontSize="11px"
                    borderRadius="full"
                    px="6px"
                    variant="subtle"
                  >
                    {intl.formatMessage({ id: 'notifications.newCount' }, { count: group.unreadCount })}
                  </Badge>
                )}
              </HStack>
            </VStack>

            {/* Actions */}
            <VStack spacing="4px" alignItems="center">
              <Icon
                as={isExpanded ? ChevronUpIcon : ChevronDownIcon}
                color={mutedTextColor}
                boxSize={4}
              />
              <IconButton
                aria-label="Delete all in group"
                icon={<CloseIcon boxSize="8px" />}
                size="xs"
                variant="ghost"
                colorScheme="gray"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteGroup(group);
                }}
                opacity="0.5"
                _hover={{ opacity: 1 }}
              />
            </VStack>
          </HStack>
        </Box>

        {/* Expanded group items (capped at 3 most recent) */}
        <Collapse in={isExpanded} animateOpacity>
          <VStack
            spacing="1px"
            align="stretch"
            pl="24px"
            ml="20px"
            borderLeftWidth="2px"
            borderLeftColor="green.200"
            mt="2px"
            mb="4px"
          >
            {hasUnread && (
              <Button
                size="xs"
                variant="ghost"
                colorScheme="green"
                fontSize="xs"
                alignSelf="flex-start"
                ml="12px"
                mb="4px"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkGroupAsRead(group);
                }}
              >
                {intl.formatMessage({ id: 'notifications.markGroupRead' })}
              </Button>
            )}
            {group.notifications.slice(0, 3).map((n) => renderSingleNotification(n, true))}
            {group.count > 3 && (
              <Text fontSize="xs" color={mutedTextColor} pl="12px" py="6px">
                {intl.formatMessage({ id: 'notifications.andMore' }, { count: group.count - 3 })}
              </Text>
            )}
          </VStack>
        </Collapse>
      </Box>
    );
  };

  return (
    <Menu onOpen={() => setIsOpen(true)} onClose={() => setIsOpen(false)}>
      <MenuButton as={Box} position="relative" cursor="pointer">
        <BellIcon color={navbarIcon} w="18px" h="18px" />
        {unreadCount > 0 && (
          <Badge
            position="absolute"
            top="-8px"
            right="-8px"
            bg="green.500"
            color="white"
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
        w={{ base: '340px', md: '400px' }}
        maxH="500px"
        overflowY="auto"
        boxShadow="xl"
        zIndex="1500"
      >
        {/* Header */}
        <Flex justify="space-between" align="center" px="8px" mb="12px">
          <Text fontSize="lg" fontWeight="bold" color={textColor}>
            {intl.formatMessage({ id: 'notifications.title' })} {unreadCount > 0 && `(${unreadCount})`}
          </Text>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              colorScheme="green"
              fontSize="xs"
              onClick={handleMarkAllAsRead}
            >
              {intl.formatMessage({ id: 'notifications.markAllRead' })}
            </Button>
          )}
        </Flex>

        <Divider mb="8px" />

        {/* Notifications List */}
        {displayItems.length === 0 ? (
          <Box textAlign="center" py="24px">
            <Icon as={FaBell} color="gray.300" boxSize={8} mb="8px" />
            <Text color={mutedTextColor} fontSize="sm">
              {intl.formatMessage({ id: 'notifications.emptyTitle' })}
            </Text>
            <Text color={mutedTextColor} fontSize="xs" mt="4px">
              {intl.formatMessage({ id: 'notifications.emptyDescription' })}
            </Text>
          </Box>
        ) : (
          <VStack spacing="2px" align="stretch">
            {displayItems.map((item) =>
              item.kind === 'group'
                ? renderGroupedNotification(item.group)
                : renderSingleNotification(item.notification)
            )}
          </VStack>
        )}

        {/* Footer */}
        {displayItems.length > 0 && (
          <>
            <Divider mt="12px" mb="8px" />
            <Box textAlign="center" py="4px">
              <Text fontSize="xs" color={mutedTextColor}>
                {intl.formatMessage({ id: 'notifications.totalCount' }, { count: totalNotifications })}
              </Text>
            </Box>
          </>
        )}
      </MenuList>
    </Menu>
  );
};
