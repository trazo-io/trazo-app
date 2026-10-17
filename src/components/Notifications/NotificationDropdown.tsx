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
import { FaStar, FaLeaf, FaBell, FaCommentDots } from 'react-icons/fa';
import { MdSmartphone, MdWarning } from 'react-icons/md';
import { useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
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

type NotificationMark = Pick<Notification, 'type' | 'extra_data'>;

/**
 * A crew note is NOT an alert. It travels as `system_alert` because that is the only transport
 * the notification table offers, so the KIND inside `extra_data` decides the mark, never the
 * type: `system_alert` alone renders a warning triangle, and a message arriving from the field
 * is the ordinary case, not a fault. Backend: fieldnotes/services/arrival.py.
 *
 * FaCommentDots is the icon routes.tsx already gives the Field Notes page, so the badge and the
 * page it opens carry the same mark. A REFUSED note keeps the warning: that one IS a fault, and
 * it is the half a supervisor most needs to see.
 */
export const getNotificationIcon = (notification: NotificationMark) => {
  if (notification.extra_data?.kind === 'field_note') {
    return notification.extra_data?.status === 'refused' ? MdWarning : FaCommentDots;
  }
  switch (notification.type) {
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

/**
 * Fill for the notification's icon disc. It always carries a WHITE glyph, so every value here
 * has to clear the 3:1 non-text floor (WCAG 1.4.11) against white — MEASURED, in this order:
 * green.700 5.13, amber.900 3.79, red.700 4.98, gray.600 4.61.
 *
 * What was here failed: green.500 2.78 and green.600 4.12-as-a-glyph-ground were the usual
 * green.500-under-white mistake, gray.500 was 2.68, and `orange.*` is not a Trazo token at
 * all — the theme defines `amber`, so `orange.400` silently resolved to CHAKRA's orange
 * (#ED8936, 2.55:1), a foreign accent that is neither accessible nor ours.
 */
export const getNotificationColor = (notification: NotificationMark, priority: string) => {
  // Same split as the icon above, and for the same reason: `system_alert` would paint an
  // arriving note gray.600, the colour this file gives a low-priority system fault.
  // green.700 measures 5.13:1 under the white glyph, amber.900 3.79:1, both over the 3:1 floor.
  if (notification.extra_data?.kind === 'field_note') {
    return notification.extra_data?.status === 'refused' ? 'amber.900' : 'green.700';
  }
  switch (notification.type) {
    case 'product_scan':
      return 'green.700';
    case 'product_review':
      return 'amber.900';
    case 'carbon_verification':
      return 'green.700';
    case 'system_alert':
      switch (priority) {
        case 'urgent':
          return 'red.700';
        case 'high':
          return 'amber.900';
        default:
          return 'gray.600';
      }
    default:
      return 'green.700';
  }
};

export const getNotificationPath = (notification: Notification): string | null => {
  const farmId = notification.extra_data?.establishment_id;
  // ANSWERED BEFORE `farmId`, because the crew inbox is company-scoped and its URL carries no
  // farm at all. A field note also legitimately arrives with no establishment (the backend
  // says so in fieldnotes/services/arrival.py and sends null), so reading farmId first sent a
  // farmless note to the generic branch, which returns null, and the notification did nothing
  // when clicked. MEASURED in production 2026-10-17 on the first real crew message.
  if (notification.extra_data?.kind === 'field_note') {
    return '/admin/dashboard/field-notes';
  }
  // A finished background build ("your dossier is ready") lives on the Documents shelf, not
  // the commercial dashboard — backend: documents/services/export_jobs.py `_notify`.
  if (farmId && notification.extra_data?.kind === 'export_ready') {
    return `/admin/dashboard/farm/${farmId}/documents`;
  }
  if (farmId) {
    const params = new URLSearchParams();
    if (notification.extra_data?.parcel_id)
      params.set('parcelId', String(notification.extra_data.parcel_id));
    if (notification.extra_data?.product_id)
      params.set('productId', String(notification.extra_data.product_id));
    if (notification.extra_data?.production_id)
      params.set('productionId', String(notification.extra_data.production_id));
    const query = params.toString() ? `?${params.toString()}` : '';
    return `/admin/dashboard/farm/${farmId}/commercial${query}`;
  }
  return null;
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
  const navigate = useNavigate();

  // Color mode values
  const menuBg = useColorModeValue('white', 'gray.800');
  const menuBorder = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  /*
   * gray.600, not gray.500 — because of `unreadBg` below.
   *
   * gray.500 measures 4.61 on white, which is fine, but an UNREAD row is painted green.50 and
   * there it drops to 4.48 — under the floor on precisely the notifications the user is meant
   * to read. gray.600 clears every ground this dropdown uses (6.19 white / 6.02 green.50).
   */
  const mutedTextColor = useColorModeValue('gray.600', 'gray.400');
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

  const handleNotificationNavigate = async (notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    const path = getNotificationPath(notification);
    if (path) {
      setIsOpen(false);
      navigate(path);
    }
  };

  const handleGroupNavigate = async (group: NotificationGroup) => {
    const path = getNotificationPath(group.latestNotification);
    if (path) {
      setIsOpen(false);
      navigate(path);
    }
  };

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
        title: intl.formatMessage({ id: 'app.error' }),
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
        title: intl.formatMessage({ id: 'app.error' }),
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
        title: intl.formatMessage({ id: 'app.error' }),
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
      onClick={() => handleNotificationNavigate(notification)}
      transition="background 0.15s">
      <HStack spacing="12px" align="start" w="100%">
        {/* Icon */}
        <Box
          minW={isNested ? '32px' : '40px'}
          h={isNested ? '32px' : '40px'}
          bg={getNotificationColor(notification, notification.priority)}
          color="white"
          borderRadius="full"
          display="flex"
          alignItems="center"
          justifyContent="center">
          <Icon as={getNotificationIcon(notification)} boxSize={isNested ? 4 : 5} />
        </Box>

        {/* Content */}
        <VStack align="start" spacing="2px" flex="1" minW="0">
          <Text
            fontSize={isNested ? 'xs' : 'sm'}
            fontWeight={notification.read ? 'normal' : 'semibold'}
            color={textColor}
            lineHeight="1.3"
            noOfLines={2}>
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
            <Box w="6px" h="6px" bg="green.700" borderRadius="full" title="Unread" />
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
          transition="background 0.15s">
          <HStack spacing="12px" align="start" w="100%">
            {/* Icon with count badge */}
            <Box position="relative">
              <Box
                minW="40px"
                h="40px"
                bg={getNotificationColor(
                  group.latestNotification,
                  group.latestNotification.priority
                )}
                color="white"
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center">
                <Icon as={getNotificationIcon(group.latestNotification)} boxSize={5} />
              </Box>
              {/* No inline bg/color: inherit the `brand` variant, which is green.700 on white
                  (~6.4:1). The hardcoded green.500 here measured 2.78:1 with white — an unread
                  count is the one thing on a notification bell that has to be readable. */}
              <Badge
                position="absolute"
                top="-4px"
                right="-4px"
                borderRadius="full"
                minW="18px"
                h="18px"
                fontSize="11px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                border="2px solid"
                borderColor={menuBg}>
                {group.count}
              </Badge>
            </Box>

            {/* Content */}
            <VStack align="start" spacing="2px" flex="1" minW="0">
              <Text
                fontSize="sm"
                fontWeight={hasUnread ? 'semibold' : 'normal'}
                color={textColor}
                lineHeight="1.3">
                {intl.formatMessage(
                  { id: 'notifications.productScanned' },
                  { productName: group.productName }
                )}
              </Text>
              <Text fontSize="xs" color={mutedTextColor} lineHeight="1.3">
                {intl.formatMessage(
                  { id: 'notifications.consumersViewed' },
                  { count: group.count }
                )}
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
                    variant="subtle">
                    {intl.formatMessage(
                      { id: 'notifications.newCount' },
                      { count: group.unreadCount }
                    )}
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
            mb="4px">
            <HStack spacing="8px" ml="12px" mb="4px">
              {hasUnread && (
                <Button
                  size="xs"
                  variant="ghost"
                  colorScheme="green"
                  fontSize="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkGroupAsRead(group);
                  }}>
                  {intl.formatMessage({ id: 'notifications.markGroupRead' })}
                </Button>
              )}
              {getNotificationPath(group.latestNotification) && (
                <Button
                  size="xs"
                  variant="ghost"
                  colorScheme="green"
                  fontSize="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGroupNavigate(group);
                  }}>
                  {intl.formatMessage({
                    id: 'notifications.viewDashboard',
                    defaultMessage: 'View Dashboard'
                  })}
                </Button>
              )}
            </HStack>
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
    <Menu isOpen={isOpen} onOpen={() => setIsOpen(true)} onClose={() => setIsOpen(false)}>
      <MenuButton as={Box} position="relative" cursor="pointer">
        <BellIcon color={navbarIcon} w="18px" h="18px" />
        {/* Same as the per-group count above — inherit `brand` rather than pin green.500. */}
        {unreadCount > 0 && (
          <Badge
            position="absolute"
            top="-8px"
            right="-8px"
            borderRadius="full"
            minW="18px"
            h="18px"
            fontSize="xs"
            display="flex"
            alignItems="center"
            justifyContent="center">
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
        zIndex="1500">
        {/* Header */}
        <Flex justify="space-between" align="center" px="8px" mb="12px">
          <Text fontSize="lg" fontWeight="bold" color={textColor}>
            {intl.formatMessage({ id: 'notifications.title' })}{' '}
            {unreadCount > 0 && `(${unreadCount})`}
          </Text>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              colorScheme="green"
              fontSize="xs"
              onClick={handleMarkAllAsRead}>
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
                {intl.formatMessage(
                  { id: 'notifications.totalCount' },
                  { count: totalNotifications }
                )}
              </Text>
            </Box>
          </>
        )}
      </MenuList>
    </Menu>
  );
};
