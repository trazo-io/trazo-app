/**
 * React hook for the offline photo queue.
 * Provides queue state, auto-sync on connectivity, and enqueue/cancel actions.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  offlinePhotoQueue,
  QueuedPhoto
} from '../services/offlinePhotoQueue';
import { useFileUpload } from '../services/uploadService';

export interface OfflineQueueState {
  /** All queued photos */
  queue: QueuedPhoto[];
  /** Number of photos waiting to upload */
  pendingCount: number;
  /** Whether the queue is currently being processed */
  isSyncing: boolean;
  /** Whether the device is offline */
  isOffline: boolean;
}

export function useOfflinePhotoQueue() {
  const [queue, setQueue] = useState<QueuedPhoto[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const { uploadFile } = useFileUpload();

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Subscribe to queue changes
  useEffect(() => {
    const unsubscribe = offlinePhotoQueue.onChange(setQueue);

    // Load initial state
    offlinePhotoQueue.getAll().then(setQueue).catch(() => {});

    return unsubscribe;
  }, []);

  // Auto-sync when coming online
  useEffect(() => {
    const cleanup = offlinePhotoQueue.startAutoSync(async (file: File) => {
      setIsSyncing(true);
      try {
        return await uploadFile(file);
      } finally {
        setIsSyncing(false);
      }
    });

    return cleanup;
  }, [uploadFile]);

  const enqueuePhoto = useCallback(
    async (file: File, eventContext?: QueuedPhoto['eventContext']) => {
      return offlinePhotoQueue.enqueue(file, eventContext);
    },
    []
  );

  const cancelPhoto = useCallback(async (id: number) => {
    await offlinePhotoQueue.remove(id);
  }, []);

  const manualSync = useCallback(async () => {
    if (isOffline) return { uploaded: 0, failed: 0 };
    setIsSyncing(true);
    try {
      return await offlinePhotoQueue.processQueue(uploadFile);
    } finally {
      setIsSyncing(false);
    }
  }, [isOffline, uploadFile]);

  const pendingCount = queue.filter(
    (p) => p.status === 'queued' || p.status === 'failed'
  ).length;

  return {
    queue,
    pendingCount,
    isSyncing,
    isOffline,
    enqueuePhoto,
    cancelPhoto,
    manualSync
  };
}
