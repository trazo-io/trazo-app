/**
 * OfflineQueueIndicator - Shows pending offline photo uploads.
 *
 * Displays a compact badge/banner when photos are waiting in the offline queue.
 * Farmers see how many photos are pending and can trigger manual sync.
 */

import React from 'react';
import {
  HStack,
  Text,
  Badge,
  IconButton,
  Tooltip,
  Spinner,
  useColorModeValue
} from '@chakra-ui/react';
import { FaCloudUploadAlt, FaWifi } from 'react-icons/fa';
import { useOfflinePhotoQueue } from '../../hooks/useOfflinePhotoQueue';

export const OfflineQueueIndicator: React.FC = () => {
  const { pendingCount, isSyncing, isOffline, manualSync } =
    useOfflinePhotoQueue();

  const bgColor = useColorModeValue('orange.50', 'orange.900');
  const borderColor = useColorModeValue('orange.200', 'orange.700');
  const textColor = useColorModeValue('orange.800', 'orange.200');

  // Don't render if no queued photos
  if (pendingCount === 0) return null;

  return (
    <HStack
      bg={bgColor}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="md"
      px={3}
      py={2}
      spacing={2}
      role="status"
      aria-live="polite"
      aria-label={`${pendingCount} photos waiting to upload`}
    >
      {isOffline ? (
        <FaWifi color="gray" aria-hidden />
      ) : isSyncing ? (
        <Spinner size="xs" color="orange.500" />
      ) : (
        <FaCloudUploadAlt color="orange" aria-hidden />
      )}

      <Text fontSize="sm" color={textColor} fontWeight="medium">
        {pendingCount} photo{pendingCount !== 1 ? 's' : ''} waiting
        {isOffline ? ' (offline)' : ''}
      </Text>

      {pendingCount > 0 && (
        <Badge colorScheme="orange" fontSize="xs">
          {pendingCount}
        </Badge>
      )}

      {!isOffline && !isSyncing && (
        <Tooltip label="Upload now" placement="top">
          <IconButton
            aria-label="Upload queued photos"
            icon={<FaCloudUploadAlt />}
            size="xs"
            variant="ghost"
            colorScheme="orange"
            onClick={() => manualSync()}
          />
        </Tooltip>
      )}
    </HStack>
  );
};
